# Marketing Phase C — Resend integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Marketing-view actually send personalised newsletters via Resend, capture open/click/bounce events per recipient, and surface campaign history both in the Campaigns tab and on each contact's BD detail.

**Architecture:** Two new Supabase tables (`campaigns`, `campaign_sends`) hold campaign definitions and per-recipient tracking rows. Two new Vercel API endpoints (`marketing-send`, `marketing-webhook`) talk to Resend's HTTP API and receive its event webhooks. The existing Marketing Campaigns tab gains a composer + history list + per-campaign detail. A Campaigns section is added to the existing inline contact-detail view in BD.

**Tech stack:** React 19, Supabase JS, Resend HTTP API (no SDK — plain `fetch` for transparency and minimal deps).

**Reference spec:** [docs/superpowers/specs/2026-05-06-marketing-tags-campaigns-design.md](../specs/2026-05-06-marketing-tags-campaigns-design.md) §3 (data model), §4.2 (Campaigns tab), §4.3 (composer), §4.4 (Edit audience), §4.6 (per-contact campaign history), §5 (send flow + tracking + error handling), §6 (personalisation), §7 Phase C.

**Note on testing:** No React unit-test setup; verification via `npm run build` per task plus a final production smoke-test. API endpoints can be tested via `curl` after deploy.

---

## File structure

| Action | Path | Purpose |
|---|---|---|
| Run | Supabase SQL editor | C.1 migration for campaigns + campaign_sends + RLS |
| Manual | Resend dashboard + DNS + Vercel | C.2 setup of Resend account, DNS, env vars |
| Create | `api/marketing-send.js` | Sends a campaign batch via Resend; writes campaign + campaign_sends rows |
| Create | `api/marketing-webhook.js` | Receives Resend events; updates campaign_sends rows |
| Create | `src/lib/template-vars.js` | Tiny pure helper that substitutes `{{first_name}}` etc. |
| Modify | `src/bd/marketing-contacts.jsx` | "Send campaign to N" button hands selected ids to MarketingView |
| Modify | `src/bd/marketing-view.jsx` | New composer mode + state shared with Contacts tab + Campaigns tab |
| Create | `src/bd/marketing-composer.jsx` | Compose form + live HTML preview iframe + Test/Send buttons |
| Modify | `src/bd/marketing-campaigns.jsx` | Replace placeholder with campaigns list |
| Create | `src/bd/marketing-campaign-detail.jsx` | Per-campaign detail with aggregate stats + recipient table |
| Modify | `src/bd/inline-details.jsx` | Add "Campaigns" section to InlineContactDetail |

Total: 4 new code files, 4 modified, 1 SQL migration, 1 manual setup task.

---

### Task C.1 — Database migration for campaigns + campaign_sends

**Files:**
- Run in Supabase SQL editor (no repo file)

- [ ] **Step 1: Open the Supabase SQL editor**

[supabase.com](https://supabase.com) → project → **SQL Editor** → **+ New query**.

- [ ] **Step 2: Paste and run the migration**

```sql
-- 3. campaigns — one row per "send" event
CREATE TABLE campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  subject         text NOT NULL,
  preheader       text,
  html_body       text NOT NULL,
  from_name       text NOT NULL,
  from_email      text NOT NULL,
  reply_to        text,
  audience_filter jsonb,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','sent','failed')),
  recipient_count int NOT NULL DEFAULT 0,
  sent_at         timestamptz,
  sent_by         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_sent_at ON campaigns(sent_at DESC NULLS LAST);

-- 4. campaign_sends — one row per (campaign × recipient)
CREATE TABLE campaign_sends (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id        uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id         uuid REFERENCES contacts(id) ON DELETE SET NULL,
  recipient_email    text NOT NULL,
  resend_message_id  text UNIQUE,
  status             text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','bounced','failed')),
  sent_at            timestamptz,
  delivered_at       timestamptz,
  bounced_at         timestamptz,
  bounce_reason      text,
  first_opened_at    timestamptz,
  last_opened_at     timestamptz,
  open_count         int NOT NULL DEFAULT 0,
  first_clicked_at   timestamptz,
  last_clicked_at    timestamptz,
  click_count        int NOT NULL DEFAULT 0,
  complained_at      timestamptz,
  unsubscribed_at    timestamptz,
  error_message      text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_sends_campaign_id ON campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_contact_id ON campaign_sends(contact_id);
CREATE INDEX idx_campaign_sends_message_id ON campaign_sends(resend_message_id);

-- RLS policies (mirroring tags/contact_tags pattern from Phase A)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users full access on campaigns" ON campaigns
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth users full access on campaign_sends" ON campaign_sends
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

- [ ] **Step 3: Verify**

Run:
```sql
SELECT count(*) FROM campaigns;
SELECT count(*) FROM campaign_sends;
```
Expected: 0 each (no campaigns yet).

---

### Task C.2 — External setup: Resend account + DNS + Vercel env

**Files:**
- Resend dashboard, eclectik.co DNS zone, Vercel project settings — all manual.

- [ ] **Step 1: Create a Resend account**

Go to [resend.com](https://resend.com) → sign up with the eclectik.co domain owner account. Free tier (3,000 emails/month, 100/day) is sufficient for v1.

- [ ] **Step 2: Add and verify the eclectik.co domain**

In Resend → **Domains** → **Add Domain** → `eclectik.co`. Resend shows a list of DNS records you must add (typically 1× MX, 2–3× TXT for SPF + DKIM, 1× CNAME or TXT for return-path).

- [ ] **Step 3: Add DNS records at the domain registrar**

At the eclectik.co DNS provider (likely TransIP or Strato), add the records Resend listed.

⚠️ **Critical: SPF merge.** If a `v=spf1` TXT record already exists for Microsoft 365 (`include:spf.protection.outlook.com`), do NOT add a second SPF record. Edit the existing one to include both:

```
v=spf1 include:_spf.resend.com include:spf.protection.outlook.com -all
```

A second standalone `v=spf1` record will break Microsoft mail because RFC 7208 forbids multiple SPF records on one host.

- [ ] **Step 4: Wait for verification**

DNS propagation can take 5 minutes to several hours. Resend's Domains page shows a green "Verified" badge once all records resolve correctly.

- [ ] **Step 5: Generate an API key**

Resend → **API Keys** → **Create API key** → name `eclectik-crm-prod` → permission `Sending access`. Copy the key (shown once).

- [ ] **Step 6: Set up the webhook**

Resend → **Webhooks** → **Add Endpoint** → URL `https://crm.eclectik-insights.co/api/marketing-webhook` → enable events: `email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`. Resend shows a **Signing Secret** — copy it (shown once).

- [ ] **Step 7: Add env vars to Vercel**

Vercel dashboard → eclectik-crm project → **Settings → Environment Variables** → add:

| Key | Value | Scope |
|---|---|---|
| `RESEND_API_KEY` | the key from Step 5 | Production |
| `RESEND_WEBHOOK_SECRET` | the signing secret from Step 6 | Production |
| `MARKETING_FROM_EMAIL` | `marketing@eclectik.co` | Production |
| `MARKETING_FROM_NAME` | `Marketing` | Production |

Mark all four as "Sensitive".

- [ ] **Step 8: Redeploy**

Vercel → Deployments → latest → ⋯ → **Redeploy** so the new env vars are picked up.

- [ ] **Step 9: Smoke-test the API key**

Once redeployed, run from the local terminal:
```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer <RESEND_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"from":"marketing@eclectik.co","to":"<your-test-email>","subject":"Resend test","html":"<p>Hello</p>"}'
```
Expected: a JSON response with an `id` field, and the email arriving in the inbox of your test address.

If this fails, do not proceed — the rest of Phase C will not work until the key + DNS + verification are correct. Report `BLOCKED` with the exact error.

---

### Task C.3 — Template variable substitution helper

**Files:**
- Create: `src/lib/template-vars.js`

- [ ] **Step 1: Write the helper**

```js
// Substitutes {{first_name}}-style placeholders in an HTML or text body
// using values from a contact record. Unknown placeholders are replaced with
// an empty string; the user is responsible for choosing variables that exist.
//
// Supported variables (v1):
//   first_name, last_name, full_name, company_name, role
//
// Usage:
//   renderTemplate('Hi {{first_name}},', { first_name: 'Marco' }) === 'Hi Marco,'
const KNOWN = ['first_name', 'last_name', 'full_name', 'company_name', 'role'];

export function renderTemplate(body, vars) {
  if (!body) return '';
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    if (!KNOWN.includes(key)) return ''; // strip unknown vars silently
    const v = vars && vars[key];
    return v == null ? '' : String(v);
  });
}

// Pulls the variables for one contact from a DB row (or adapted row).
export function varsForContact(contact) {
  if (!contact) return {};
  const fullName = contact.full_name || contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
  return {
    first_name: contact.first_name || (fullName ? fullName.split(' ')[0] : ''),
    last_name: contact.last_name || (fullName ? fullName.split(' ').slice(1).join(' ') : ''),
    full_name: fullName,
    company_name: contact.company_name || contact.account || '',
    role: contact.role || contact.title || '',
  };
}

export const KNOWN_VARS = KNOWN;
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -3
```
Expected: built without errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/template-vars.js
git commit -m "Add template-var substitution helper"
```

---

### Task C.4 — `marketing-send` API endpoint

**Files:**
- Create: `api/marketing-send.js`

- [ ] **Step 1: Write the endpoint**

```js
// POST /api/marketing-send
// Body: { campaign_id?, name, subject, preheader, html_body, from_name?, from_email?, reply_to?, audience_filter, recipients: [{contact_id, email, vars}] }
// On success: returns { campaign_id, sent: N, failed: M, status: 'sent' | 'failed' }
//
// Sends per-recipient via Resend's POST /emails endpoint with HTML pre-rendered
// from the template (variable substitution happens client-side and the final
// HTML is passed in directly). Per-recipient send is sequential with a small
// gap to avoid burst-pattern detection.
//
// Error handling matches §5 of the spec:
//   - Per-recipient 4xx → mark that send 'failed', continue
//   - 2 consecutive server (5xx) errors → abort, mark campaign 'failed'
//   - 401/403 → abort immediately
import { createClient } from '@supabase/supabase-js';

const RESEND_API = 'https://api.resend.com/emails';
const PER_SEND_DELAY_MS = 250;
const MAX_CONSECUTIVE_SERVER_ERRORS = 2;

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function resendSend({ from, to, subject, html, headers }) {
  const resp = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, headers }),
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  const {
    campaign_id, name, subject, preheader, html_body,
    from_name, from_email, reply_to, audience_filter, recipients,
    sent_by,
  } = req.body || {};

  if (!subject || !html_body || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: 'subject, html_body and recipients[] are required' });
  }

  const fromName = from_name || process.env.MARKETING_FROM_NAME || 'Marketing';
  const fromEmail = from_email || process.env.MARKETING_FROM_EMAIL;
  if (!fromEmail) return res.status(500).json({ error: 'MARKETING_FROM_EMAIL not configured' });
  const fromHeader = `${fromName} <${fromEmail}>`;

  // Upsert the campaign row first so campaign_sends has a parent
  let cid = campaign_id;
  if (!cid) {
    const { data, error } = await supabase.from('campaigns').insert({
      name: name || subject,
      subject, preheader, html_body,
      from_name: fromName, from_email: fromEmail, reply_to: reply_to || null,
      audience_filter: audience_filter || null,
      status: 'sending',
      recipient_count: recipients.length,
      sent_by: sent_by || null,
    }).select('id').single();
    if (error) return res.status(500).json({ error: 'campaign insert: ' + error.message });
    cid = data.id;
  } else {
    await supabase.from('campaigns').update({ status: 'sending', recipient_count: recipients.length }).eq('id', cid);
  }

  let consecutiveServerErrors = 0;
  let succeeded = 0;
  let failed = 0;
  let aborted = false;
  let abortReason = null;

  for (const r of recipients) {
    const recipientHtml = r.html || html_body;
    const headers = reply_to ? { 'Reply-To': reply_to } : undefined;
    const result = await resendSend({
      from: fromHeader, to: r.email, subject, html: recipientHtml, headers,
    });

    if (result.ok) {
      consecutiveServerErrors = 0;
      succeeded++;
      const messageId = result.data?.id || null;
      await supabase.from('campaign_sends').insert({
        campaign_id: cid,
        contact_id: r.contact_id || null,
        recipient_email: r.email,
        resend_message_id: messageId,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    } else if (result.status === 401 || result.status === 403) {
      aborted = true;
      abortReason = 'auth';
      failed++;
      await supabase.from('campaign_sends').insert({
        campaign_id: cid, contact_id: r.contact_id || null, recipient_email: r.email,
        status: 'failed', error_message: `auth ${result.status}: ${JSON.stringify(result.data).slice(0, 200)}`,
      });
      break;
    } else if (result.status >= 500) {
      consecutiveServerErrors++;
      failed++;
      await supabase.from('campaign_sends').insert({
        campaign_id: cid, contact_id: r.contact_id || null, recipient_email: r.email,
        status: 'failed', error_message: `server ${result.status}: ${JSON.stringify(result.data).slice(0, 200)}`,
      });
      if (consecutiveServerErrors >= MAX_CONSECUTIVE_SERVER_ERRORS) {
        aborted = true;
        abortReason = 'resend-down';
        break;
      }
      await sleep(2000);
    } else {
      // 4xx per-recipient — log and continue
      failed++;
      await supabase.from('campaign_sends').insert({
        campaign_id: cid, contact_id: r.contact_id || null, recipient_email: r.email,
        status: 'failed', error_message: `${result.status}: ${(result.data?.message || JSON.stringify(result.data)).slice(0, 200)}`,
      });
    }

    await sleep(PER_SEND_DELAY_MS);
  }

  const finalStatus = aborted ? 'failed' : 'sent';
  await supabase.from('campaigns').update({
    status: finalStatus,
    sent_at: new Date().toISOString(),
  }).eq('id', cid);

  return res.status(200).json({
    campaign_id: cid,
    sent: succeeded,
    failed,
    aborted,
    abortReason,
    status: finalStatus,
  });
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -3
```
Expected: built without errors. (API endpoints are not bundled into the JS but Vite still validates imports.)

- [ ] **Step 3: Commit**

```bash
git add api/marketing-send.js
git commit -m "Add marketing-send API endpoint"
```

---

### Task C.5 — `marketing-webhook` API endpoint

**Files:**
- Create: `api/marketing-webhook.js`

- [ ] **Step 1: Write the endpoint**

```js
// POST /api/marketing-webhook
// Receives Resend events and updates campaign_sends rows.
//
// Resend signs each request with HMAC-SHA256 over the raw body, sent in the
// 'svix-signature' header (Resend uses Svix for webhook delivery). We must
// verify before trusting the payload.
//
// Events handled (per spec §5):
//   email.sent      → set status='sent', sent_at
//   email.delivered → set status='delivered', delivered_at
//   email.opened    → bump open_count, set first_opened_at + last_opened_at
//   email.clicked   → bump click_count, set first_clicked_at + last_clicked_at
//   email.bounced   → set status='bounced', bounced_at, bounce_reason
//   email.complained → set complained_at
//
// Unknown messageId → log and 200 (Resend retries on non-2xx — we don't want
// loops for messages that aren't ours).
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

// Vercel parses JSON bodies by default; we need the raw body for signature
// verification. Disable the parser via the route config.
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// Svix signature header looks like 'v1,abc123 v1,def456'. We compute v1 for
// our secret and check at least one matches.
function verifySvixSignature(rawBody, headers, secret) {
  if (!secret) return false;
  const svixId = headers['svix-id'];
  const svixTimestamp = headers['svix-timestamp'];
  const svixSignature = headers['svix-signature'];
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  // Resend secrets are prefixed 'whsec_'; the actual key is base64 after the prefix.
  const keyB64 = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let key;
  try { key = Buffer.from(keyB64, 'base64'); } catch { return false; }

  const expected = crypto.createHmac('sha256', key).update(signedPayload).digest('base64');
  const sigList = String(svixSignature).split(' ').map(s => s.split(',')[1]).filter(Boolean);
  return sigList.some(sig => {
    try { return crypto.timingSafeEqual(Buffer.from(sig, 'base64'), Buffer.from(expected, 'base64')); }
    catch { return false; }
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  let rawBody;
  try { rawBody = await readRawBody(req); }
  catch (e) { return res.status(400).json({ error: 'cannot read body: ' + e.message }); }

  const ok = verifySvixSignature(rawBody, req.headers, process.env.RESEND_WEBHOOK_SECRET);
  if (!ok) return res.status(401).json({ error: 'invalid signature' });

  let event;
  try { event = JSON.parse(rawBody); }
  catch { return res.status(400).json({ error: 'invalid json' }); }

  const type = event?.type;
  const messageId = event?.data?.email_id || event?.data?.id;
  if (!messageId) return res.status(200).json({ ignored: 'no message id' });

  const { data: row } = await supabase
    .from('campaign_sends')
    .select('id, open_count, click_count')
    .eq('resend_message_id', messageId)
    .maybeSingle();
  if (!row) return res.status(200).json({ ignored: 'unknown message id' });

  const nowIso = new Date().toISOString();
  const updates = {};
  switch (type) {
    case 'email.sent':       updates.status = 'sent';      updates.sent_at = nowIso; break;
    case 'email.delivered':  updates.status = 'delivered'; updates.delivered_at = nowIso; break;
    case 'email.opened': {
      updates.open_count = (row.open_count || 0) + 1;
      updates.last_opened_at = nowIso;
      // first_opened_at only on the first event
      const { data: cur } = await supabase.from('campaign_sends').select('first_opened_at').eq('id', row.id).single();
      if (!cur?.first_opened_at) updates.first_opened_at = nowIso;
      break;
    }
    case 'email.clicked': {
      updates.click_count = (row.click_count || 0) + 1;
      updates.last_clicked_at = nowIso;
      const { data: cur } = await supabase.from('campaign_sends').select('first_clicked_at').eq('id', row.id).single();
      if (!cur?.first_clicked_at) updates.first_clicked_at = nowIso;
      break;
    }
    case 'email.bounced':
      updates.status = 'bounced'; updates.bounced_at = nowIso;
      updates.bounce_reason = (event?.data?.bounce?.message || event?.data?.reason || '').slice(0, 500);
      break;
    case 'email.complained':
      updates.complained_at = nowIso;
      break;
    default:
      return res.status(200).json({ ignored: 'unhandled event type: ' + type });
  }

  const { error } = await supabase.from('campaign_sends').update(updates).eq('id', row.id);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -3
```

- [ ] **Step 3: Commit**

```bash
git add api/marketing-webhook.js
git commit -m "Add marketing-webhook endpoint with Svix signature verification"
```

---

### Task C.6 — Marketing composer component

**Files:**
- Create: `src/bd/marketing-composer.jsx`

- [ ] **Step 1: Write the composer**

```jsx
import { useState, useMemo } from 'react';
import { useAuth } from '../lib/auth';
import { renderTemplate, varsForContact, KNOWN_VARS } from '../lib/template-vars';

// Composer for a Marketing campaign.
// Props:
//   recipients: array of contact objects (already filtered/selected)
//   onCancel: () => void
//   onSent: (campaign) => void
//   defaultFromName, defaultFromEmail (read-only display; configured via env)
export default function MarketingComposer({ recipients, onCancel, onSent, defaultFromName = 'Marketing', defaultFromEmail = 'marketing@eclectik.co' }) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const { session } = useAuth();
  const sentBy = session?.user?.email || '';

  // Live preview — render with the first recipient's vars (or empty)
  const previewVars = useMemo(() => varsForContact(recipients?.[0] || {}), [recipients]);
  const previewHtml = useMemo(() => renderTemplate(htmlBody, previewVars), [htmlBody, previewVars]);

  const send = async (testOnly) => {
    if (!subject.trim() || !htmlBody.trim()) return;
    setBusy(true);
    setResult(null);

    const payloadRecipients = testOnly
      ? [{ contact_id: null, email: sentBy, html: renderTemplate(htmlBody, previewVars) }]
      : recipients.filter(r => r.email).map(r => {
          const v = varsForContact(r);
          return { contact_id: r.id, email: r.email, html: renderTemplate(htmlBody, v) };
        });

    if (payloadRecipients.length === 0) {
      setResult({ ok: false, error: 'No recipients with an email address' });
      setBusy(false);
      return;
    }

    try {
      const resp = await fetch('/api/marketing-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || subject,
          subject,
          preheader,
          html_body: htmlBody,
          reply_to: replyTo || null,
          audience_filter: testOnly ? { test: true } : null,
          recipients: payloadRecipients,
          sent_by: sentBy,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      setResult({ ok: true, sent: data.sent, failed: data.failed, testOnly });
      if (!testOnly && onSent) onSent(data);
    } catch (e) {
      setResult({ ok: false, error: e.message });
    }
    setBusy(false);
  };

  const recipientsWithEmail = recipients.filter(r => r.email).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Campaign name</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Glint newsletter mei 2026"
            style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Audience</div>
          <div style={{ padding: '7px 10px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--fill-1)', fontSize: 12, color: 'var(--text-2)' }}>
            {recipients.length} contact{recipients.length !== 1 ? 's' : ''} ({recipientsWithEmail} with email)
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>From</div>
          <div style={{ padding: '7px 10px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--fill-1)', fontSize: 12, color: 'var(--text-2)' }}>
            {defaultFromName} &lt;{defaultFromEmail}&gt;
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Reply-to (optional)</div>
          <input value={replyTo} onChange={e => setReplyTo(e.target.value)} placeholder={sentBy} style={inputStyle} />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Subject</div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Viva Glint &amp; Pulse — May update" style={inputStyle} />
      </div>

      <div>
        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Preheader</div>
        <input value={preheader} onChange={e => setPreheader(e.target.value)} placeholder="Copilot highlights, admin change…" style={inputStyle} />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>HTML body</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
            Variables: {KNOWN_VARS.map(v => `{{${v}}}`).join(', ')}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, height: 380 }}>
          <textarea value={htmlBody} onChange={e => setHtmlBody(e.target.value)}
            placeholder="<html>...</html>"
            spellCheck={false}
            style={{ ...inputStyle, fontFamily: 'var(--font-mono)', resize: 'none', height: '100%', padding: 10, fontSize: 11 }} />
          <iframe title="preview" srcDoc={previewHtml}
            sandbox=""
            style={{ width: '100%', height: '100%', border: '0.5px solid var(--sep)', borderRadius: 6, background: '#fff' }} />
        </div>
      </div>

      {result && (
        <div style={{ fontSize: 12, color: result.ok ? 'var(--good)' : 'var(--danger)' }}>
          {result.ok
            ? `✓ ${result.testOnly ? 'Test sent to ' + sentBy : `Sent ${result.sent} email${result.sent !== 1 ? 's' : ''}, ${result.failed} failed`}`
            : `✗ ${result.error}`}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn-ghost tiny" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn-ghost tiny" onClick={() => send(true)} disabled={busy || !subject.trim() || !htmlBody.trim()}>
          {busy ? 'Sending…' : 'Test send → me'}
        </button>
        <button className="btn-primary tiny" onClick={() => {
          if (!confirm(`Send "${subject}" to ${recipientsWithEmail} recipients?`)) return;
          send(false);
        }} disabled={busy || recipientsWithEmail === 0 || !subject.trim() || !htmlBody.trim()}>
          {busy ? 'Sending…' : `Send to ${recipientsWithEmail} recipient${recipientsWithEmail !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '7px 10px', borderRadius: 6,
  border: '0.5px solid var(--sep)', background: 'var(--bg-1)',
  fontSize: 12, fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
};
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -3
```

- [ ] **Step 3: Commit**

```bash
git add src/bd/marketing-composer.jsx
git commit -m "Add Marketing composer with HTML paste + live preview"
```

---

### Task C.7 — Wire composer into MarketingView (audience hand-off)

**Files:**
- Modify: `src/bd/marketing-contacts.jsx`
- Modify: `src/bd/marketing-view.jsx`

**Step 1: Lift the composer-mode state to MarketingView and replace the BulkTagModal in Contacts with a "Send campaign to N" button when a different mode is requested.**

Actually, the cleanest pattern:
- `MarketingView` owns a `composer` state: `null` or `{ recipients: [...] }`
- When set, the Contacts/Campaigns tabs are replaced with the composer UI
- The Contacts tab gets a new prop `onComposeCampaign(recipients)` that flips the state

- [ ] **Step 1a: Add composer state to MarketingView**

In `src/bd/marketing-view.jsx`, add to the state block at the top of the function:

```js
const [composer, setComposer] = useState(null); // null | { recipients: [...] }
```

Add `MarketingComposer` to the imports:
```js
import MarketingComposer from './marketing-composer';
```

- [ ] **Step 1b: Render composer instead of tabs when active**

Replace the body inside the `<div style={{ padding: '16px 24px' ...`:

```jsx
return (
  <div style={{ padding: '16px 24px', maxWidth: 1400, margin: '0 auto' }}>
    {composer ? (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn-ghost tiny" onClick={() => setComposer(null)}>← Back</button>
          <span style={{ fontSize: 14, fontWeight: 500 }}>New campaign</span>
        </div>
        <MarketingComposer
          recipients={composer.recipients}
          onCancel={() => setComposer(null)}
          onSent={() => { setComposer(null); if (refetch) refetch(); }}
        />
      </>
    ) : (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, borderBottom: '0.5px solid var(--sep)', paddingBottom: 8 }}>
          <button
            className={tab === 'contacts' ? 'btn-primary tiny' : 'btn-ghost tiny'}
            onClick={() => setTab('contacts')}>
            Contacts
          </button>
          <button
            className={tab === 'campaigns' ? 'btn-primary tiny' : 'btn-ghost tiny'}
            onClick={() => setTab('campaigns')}>
            Campaigns
          </button>
          <button
            className="btn-ghost tiny"
            style={{ marginLeft: 'auto' }}
            onClick={() => setShowTagManager(true)}>
            Manage tags
          </button>
        </div>

        {tab === 'contacts' && (
          <MarketingContacts
            contacts={contacts}
            accounts={accounts}
            deals={deals}
            allTags={allTags}
            refetch={refetch}
            onComposeCampaign={(recipients) => setComposer({ recipients })}
          />
        )}
        {tab === 'campaigns' && <MarketingCampaigns />}

        {showTagManager && (
          <TagManager
            allTags={allTags}
            onClose={() => setShowTagManager(false)}
            onChange={refetch}
          />
        )}
      </>
    )}
  </div>
);
```

**Step 2: Add "Send campaign to N" button in MarketingContacts.**

- [ ] **Step 2a: Add `onComposeCampaign` prop**

In `src/bd/marketing-contacts.jsx`, change the function signature:
```js
export default function MarketingContacts({ contacts, accounts, deals, allTags, refetch, onComposeCampaign }) {
```

- [ ] **Step 2b: Add the Send button to the bulk-action bar**

Find the `selected.size > 0 && ( ...bulk action bar... )` block. After the `Tag selected` button and before `Clear`, add:

```jsx
<button className="btn-primary tiny" disabled={!onComposeCampaign}
  onClick={() => onComposeCampaign && onComposeCampaign(filtered.filter(c => selected.has(c.id)))}>
  Send campaign to {selected.size}
</button>
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -3
```

- [ ] **Step 4: Commit**

```bash
git add src/bd/marketing-view.jsx src/bd/marketing-contacts.jsx
git commit -m "Wire MarketingComposer into MarketingView with audience hand-off"
```

---

### Task C.8 — Campaigns tab list view

**Files:**
- Modify: `src/bd/marketing-campaigns.jsx`

- [ ] **Step 1: Replace the placeholder with a campaign list**

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import CampaignDetail from './marketing-campaign-detail';

export default function MarketingCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [statsByCampaign, setStatsByCampaign] = useState(new Map());

  const reload = async () => {
    setLoading(true);
    const { data: camps } = await supabase
      .from('campaigns')
      .select('id, name, subject, sent_at, status, recipient_count, created_at')
      .order('sent_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200);
    setCampaigns(camps || []);

    // For each campaign, count opens and clicks (anyone with first_opened_at / first_clicked_at)
    if (camps && camps.length > 0) {
      const ids = camps.map(c => c.id);
      const { data: sends } = await supabase
        .from('campaign_sends')
        .select('campaign_id, first_opened_at, first_clicked_at, status')
        .in('campaign_id', ids);
      const map = new Map();
      for (const id of ids) map.set(id, { sent: 0, opened: 0, clicked: 0, bounced: 0 });
      for (const s of (sends || [])) {
        const m = map.get(s.campaign_id);
        if (!m) continue;
        if (s.status === 'sent' || s.status === 'delivered') m.sent++;
        if (s.status === 'bounced') m.bounced++;
        if (s.first_opened_at) m.opened++;
        if (s.first_clicked_at) m.clicked++;
      }
      setStatsByCampaign(map);
    }
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  if (openId) {
    return <CampaignDetail campaignId={openId} onBack={() => { setOpenId(null); reload(); }} />;
  }

  if (loading) return <div style={{ padding: 24, color: 'var(--text-3)' }}>Loading…</div>;

  if (campaigns.length === 0) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
        <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.5 }}>✉</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>No campaigns yet</div>
        <div style={{ fontSize: 12, maxWidth: 380, margin: '0 auto', lineHeight: 1.5 }}>
          Pick contacts in the Contacts tab and click "Send campaign" to compose your first newsletter.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {campaigns.map(c => {
        const s = statsByCampaign.get(c.id) || { sent: 0, opened: 0, clicked: 0, bounced: 0 };
        const openRate = s.sent > 0 ? Math.round(100 * s.opened / s.sent) : 0;
        const clickRate = s.sent > 0 ? Math.round(100 * s.clicked / s.sent) : 0;
        return (
          <div key={c.id} onClick={() => setOpenId(c.id)}
            style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8, padding: '12px 16px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name || c.subject}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  {c.subject}
                  {c.sent_at && ` · sent ${new Date(c.sent_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  {!c.sent_at && c.status === 'draft' && ' · draft'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-2)' }}>
                <span>{c.recipient_count} recipients</span>
                <span>{openRate}% opened</span>
                <span>{clickRate}% clicked</span>
                {s.bounced > 0 && <span style={{ color: 'var(--danger)' }}>{s.bounced} bounced</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -3
```
Expected: build error about missing `marketing-campaign-detail` — that's fine; created in next task.

- [ ] **Step 3: Combine commit with C.9 (the detail view).** Skip this commit step.

---

### Task C.9 — Campaign detail view

**Files:**
- Create: `src/bd/marketing-campaign-detail.jsx`

- [ ] **Step 1: Write the detail view**

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function CampaignDetail({ campaignId, onBack }) {
  const [campaign, setCampaign] = useState(null);
  const [sends, setSends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from('campaigns').select('*').eq('id', campaignId).single(),
        supabase.from('campaign_sends').select('*, contacts(full_name, name, first_name, last_name, email)').eq('campaign_id', campaignId).order('sent_at', { ascending: false, nullsFirst: false }),
      ]);
      if (cancelled) return;
      setCampaign(c || null);
      setSends(s || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [campaignId]);

  if (loading) return <div style={{ padding: 24, color: 'var(--text-3)' }}>Loading…</div>;
  if (!campaign) return <div style={{ padding: 24, color: 'var(--danger)' }}>Campaign not found.</div>;

  const total = sends.length;
  const opened = sends.filter(s => s.first_opened_at).length;
  const clicked = sends.filter(s => s.first_clicked_at).length;
  const bounced = sends.filter(s => s.status === 'bounced').length;
  const failed = sends.filter(s => s.status === 'failed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-ghost tiny" onClick={onBack}>← Back</button>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{campaign.name || campaign.subject}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {campaign.subject} · {campaign.sent_at ? `sent ${new Date(campaign.sent_at).toLocaleString()}` : 'not sent yet'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, padding: 12, background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8 }}>
        <Stat label="Recipients" value={total} />
        <Stat label="Opened" value={`${opened} (${total ? Math.round(100 * opened / total) : 0}%)`} />
        <Stat label="Clicked" value={`${clicked} (${total ? Math.round(100 * clicked / total) : 0}%)`} />
        {bounced > 0 && <Stat label="Bounced" value={bounced} color="var(--danger)" />}
        {failed > 0 && <Stat label="Failed" value={failed} color="var(--danger)" />}
      </div>

      <div style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr', padding: '8px 12px', borderBottom: '0.5px solid var(--sep)', fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <div>Recipient</div><div>Email</div><div>Status</div><div>Opened</div><div>Clicked</div><div>Sent</div>
        </div>
        {sends.map(s => {
          const c = s.contacts || {};
          const name = c.full_name || c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || s.recipient_email;
          return (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr', padding: '8px 12px', borderBottom: '0.5px solid var(--sep)', fontSize: 12, alignItems: 'center' }}>
              <div style={{ fontWeight: 500 }}>{name}</div>
              <div style={{ color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.recipient_email}</div>
              <div><StatusPill status={s.status} bounceReason={s.bounce_reason} /></div>
              <div style={{ color: s.open_count ? 'var(--good)' : 'var(--text-3)' }}>{s.open_count ? `${s.open_count}×` : '—'}</div>
              <div style={{ color: s.click_count ? 'var(--good)' : 'var(--text-3)' }}>{s.click_count ? `${s.click_count}×` : '—'}</div>
              <div style={{ color: 'var(--text-3)', fontSize: 11 }}>{s.sent_at ? new Date(s.sent_at).toLocaleDateString() : '—'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 500, color: color || 'var(--text-1)' }}>{value}</div>
    </div>
  );
}

function StatusPill({ status, bounceReason }) {
  const map = {
    queued:    { bg: 'var(--fill-2)', fg: 'var(--text-3)', label: 'queued' },
    sent:      { bg: 'var(--accent-tint)', fg: 'var(--accent)', label: 'sent' },
    delivered: { bg: 'var(--good-tint)', fg: 'var(--good)', label: 'delivered' },
    bounced:   { bg: 'var(--danger-tint)', fg: 'var(--danger)', label: 'bounced' },
    failed:    { bg: 'var(--danger-tint)', fg: 'var(--danger)', label: 'failed' },
  };
  const s = map[status] || map.queued;
  return (
    <span title={bounceReason || ''}
      style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, background: s.bg, color: s.fg, fontSize: 10, fontWeight: 500 }}>
      {s.label}
    </span>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -3
```
Expected: built without errors.

- [ ] **Step 3: Commit (combined with C.8)**

```bash
git add src/bd/marketing-campaigns.jsx src/bd/marketing-campaign-detail.jsx
git commit -m "Marketing Campaigns tab: list + per-campaign detail view"
```

---

### Task C.10 — Per-contact campaign-history section in BD inline-details

**Files:**
- Modify: `src/bd/inline-details.jsx`

- [ ] **Step 1: Add the new section to InlineContactDetail**

Find `InlineContactDetail` in `src/bd/inline-details.jsx`. Add this near the other `useEffect` blocks (after the contact-tags fetch from Phase A):

```js
const [campaignHistory, setCampaignHistory] = useState([]);

useEffect(() => {
  if (!contactId) return;
  supabase.from('campaign_sends')
    .select('id, status, sent_at, first_opened_at, open_count, first_clicked_at, click_count, bounce_reason, campaigns(id, name, subject, sent_at)')
    .eq('contact_id', contactId)
    .order('sent_at', { ascending: false, nullsFirst: false })
    .then(({ data }) => setCampaignHistory(data || []));
}, [contactId]);
```

- [ ] **Step 2: Render the section in the JSX**

Find where the Tags section was added (Phase A — search for `'Tags'` in the JSX). Add this block AFTER the Tags section:

```jsx
{campaignHistory.length > 0 && (
  <div style={{ marginTop: 12 }}>
    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
      Campaigns · {campaignHistory.length}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {campaignHistory.map(s => {
        const c = s.campaigns || {};
        const opened = s.open_count > 0;
        const clicked = s.click_count > 0;
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 11 }}>
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || c.subject}</div>
            <span style={{ color: 'var(--text-3)', fontSize: 10 }}>
              {s.sent_at ? new Date(s.sent_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
            </span>
            <span style={{ color: opened ? 'var(--good)' : 'var(--text-3)', fontSize: 10 }} title={`${s.open_count} opens`}>
              {opened ? `●Opened${s.open_count > 1 ? ` (${s.open_count}×)` : ''}` : '—'}
            </span>
            <span style={{ color: clicked ? 'var(--good)' : 'var(--text-3)', fontSize: 10 }} title={`${s.click_count} clicks`}>
              {clicked ? `●Clicked${s.click_count > 1 ? ` (${s.click_count}×)` : ''}` : '—'}
            </span>
            {s.status === 'bounced' && <span style={{ color: 'var(--danger)', fontSize: 10 }} title={s.bounce_reason}>bounced</span>}
          </div>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -3
```

- [ ] **Step 4: Commit**

```bash
git add src/bd/inline-details.jsx
git commit -m "BD contact-detail: campaign-history section"
```

---

### Task C.11 — Smoke-test on production

**Files:**
- None (verification only)

- [ ] **Step 1: Push the phase**

```bash
git push origin main
```

- [ ] **Step 2: Wait for the new bundle**

```bash
CURRENT=$(curl -s https://crm.eclectik-insights.co/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1)
until NEW=$(curl -s https://crm.eclectik-insights.co/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1); [ -n "$NEW" ] && [ "$NEW" != "$CURRENT" ]; do sleep 5; done
echo "deploy live"
```

- [ ] **Step 3: Manual browser smoke-test**

Hard refresh on `https://crm.eclectik-insights.co/`. Then:

1. Click **Marketing** → Contacts tab. Tick 2-3 contacts → bulk bar shows "Send campaign to N" button.
2. Click **Send campaign to N** → composer opens with audience preset.
3. Fill in campaign name, subject, preheader. Paste a small HTML body, e.g. `<html><body><p>Hi {{first_name}}, this is a test.</p></body></html>`.
4. Live preview iframe (right) shows rendered HTML with the first recipient's first_name substituted.
5. Click **Test send → me** → should land in your own inbox (`olivier@eclectik.co`).
6. Click **Send to N recipients** → confirm dialog → click OK → result text "✓ Sent N emails, 0 failed".
7. Switch to **Campaigns** tab → the just-sent campaign appears with "0% opened, 0% clicked" (events haven't arrived yet).
8. Open the campaign → detail view shows recipient table. All rows status=`sent`.
9. Open one of the test emails (in your inbox). Within ~30s the campaign-detail row for that recipient flips to `delivered`. After clicking through, the row should show open count + clicked status.
10. Open the BD contact-detail of one tagged recipient → "Campaigns · 1" section visible with the campaign name + open/click status.

- [ ] **Step 4: Verify DB state**

```sql
SELECT count(*) FROM campaigns;       -- 1+
SELECT count(*) FROM campaign_sends;  -- N (your test recipients)
SELECT status, count(*) FROM campaign_sends GROUP BY status;
```

- [ ] **Step 5: Done**

If all 10 smoke-test steps pass and the DB shows the expected rows, Phase C is complete. Phase D is small (retry-failed action + edit-audience round-trip + richer per-contact engagement timeline) and can be planned separately when needed.

---

## Out of scope for this plan

- Custom (free-form) tags — v2.
- Live (re-evaluating) audiences — v2.
- A/B testing, drip sequences — out of v1.
- Template library inside the CRM — Claude chat is the template designer.
- Retry failed recipients action — Phase D.
- Edit-audience round-trip from composer back to Contacts tab — Phase D.
- Richer event-by-event engagement timeline on contact-detail — Phase D (current implementation already shows aggregate counts per send).

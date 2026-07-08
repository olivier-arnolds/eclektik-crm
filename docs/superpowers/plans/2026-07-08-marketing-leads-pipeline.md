# Marketing Leads Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Website signups (waitlist now, scorecards later) flow into a standalone marketing-leads administration in the CRM, visible in a new Marketing → Leads tab with manual promote-to-sales-lead.

**Architecture:** Two new standalone Supabase tables (`marketing_leads` + `marketing_lead_activity`, no FKs to existing tables). A new serverless endpoint `api/website-signal.js` (secret-checked via the existing `requireWebhookSecret` guard) does find-or-create by email and appends an activity row per event. A new self-fetching `MarketingLeads` component renders as a third tab in `src/bd/marketing-view.jsx`. Spec: `docs/superpowers/specs/2026-07-08-marketing-leads-pipeline-design.md`.

**Tech Stack:** Vercel serverless (plain JS, no zod), Supabase (Postgres + RLS "auth users full access" house pattern, service key in API), React 19, vitest for the pure-logic lib.

**Repo conventions that apply (from CLAUDE.md):**
- Commit each task separately. **Never `git push` without asking Olivier.**
- Version bump (`VERSION` + `package.json` + `src/bd/changelog.js` entry) in the final code task; tag `v1.52.0`.
- Build check: `npx vite build --outDir dist_check` then `rm -rf dist_check` (sandbox can't wipe `dist/`).
- DB changes via Supabase MCP `apply_migration` on project `jdzaypckluncdwsoxurs`; save the SQL in `sql/`.
- The working dir is `~/Desktop/eclektik-crm`.

---

### Task 1: Database migration — marketing_leads + marketing_lead_activity

**Files:**
- Create: `sql/schema_marketing_leads.sql`

- [ ] **Step 1: Write the migration SQL to `sql/schema_marketing_leads.sql`**

```sql
-- Marketing leads: website-aanmeldingen (waitlist, straks scorecards) die
-- BUITEN de sales-funnel leven tot iemand ze bewust promoveert.
-- Spec: docs/superpowers/specs/2026-07-08-marketing-leads-pipeline-design.md
-- Bewust GEEN foreign keys naar bestaande tabellen; converted_lead_id is een
-- soft reference naar leads.id.

create table public.marketing_leads (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  full_name          text,
  company            text,
  role               text,
  sector             text,
  first_src          text,
  status             text not null default 'active'
                     check (status in ('active','converted','archived')),
  converted_lead_id  uuid,
  consent_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  last_activity_at   timestamptz
);
comment on table public.marketing_leads is
  'Website-aanmeldingen (marketing leads). Losstaand van de sales-funnel; promoveren is een handmatige actie in Marketing → Leads.';

create table public.marketing_lead_activity (
  id                 uuid primary key default gen_random_uuid(),
  marketing_lead_id  uuid not null references public.marketing_leads(id) on delete cascade,
  event              text not null,
  payload            jsonb,
  src                text,
  occurred_at        timestamptz not null default now()
);
comment on table public.marketing_lead_activity is
  'Eén rij per website-interactie (waitlist_joined, scorecard_*, ...). Payload = vrije JSON zodat nieuwe formuliervragen geen schemawijziging vragen.';
create index idx_mla_lead on public.marketing_lead_activity(marketing_lead_id);

-- RLS volgens huis-stijl (RLS zelf wordt auto-enabled door de
-- rls_auto_enable trigger; expliciet enablen is harmless en zeker).
alter table public.marketing_leads enable row level security;
alter table public.marketing_lead_activity enable row level security;

create policy "auth users full access on marketing_leads"
  on public.marketing_leads for all to authenticated
  using (true) with check (true);

create policy "auth users full access on marketing_lead_activity"
  on public.marketing_lead_activity for all to authenticated
  using (true) with check (true);
```

- [ ] **Step 2: Apply via Supabase MCP**

Use MCP tool `apply_migration` on project `jdzaypckluncdwsoxurs` with name `marketing_leads_pipeline` and the exact SQL above. (New tables — no backup step needed per protocol.)

- [ ] **Step 3: Verify**

Run via MCP `execute_sql`:

```sql
select table_name from information_schema.tables
where table_schema='public' and table_name like 'marketing_lead%';
```

Expected: both `marketing_leads` and `marketing_lead_activity`.

```sql
insert into public.marketing_leads (email, full_name) values ('rollback-test@example.com','Test');
delete from public.marketing_leads where email='rollback-test@example.com';
```

Expected: both succeed (insert works, unique + defaults OK).

- [ ] **Step 4: Commit**

```bash
git add sql/schema_marketing_leads.sql
git commit -m "feat(db): marketing_leads + marketing_lead_activity tabellen"
```

---

### Task 2: Pure helpers for the endpoint (TDD)

**Files:**
- Create: `api/_lib/website-signal-lib.js`
- Test: `api/_lib/website-signal-lib.test.js`

- [ ] **Step 1: Write the failing tests**

Create `api/_lib/website-signal-lib.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { validateSignal, activityPayload, profilePatch } from './website-signal-lib.js';

describe('validateSignal', () => {
  it('accepts a valid waitlist payload and normalises the email', () => {
    const { error, value } = validateSignal({
      source: 'website', event: 'waitlist_joined',
      email: '  Jane@Example.COM ', name: 'Jane Doe',
    });
    expect(error).toBeUndefined();
    expect(value.email).toBe('jane@example.com');
    expect(value.event).toBe('waitlist_joined');
  });

  it('rejects a missing body', () => {
    expect(validateSignal(undefined).error).toBeTruthy();
  });

  it('rejects an invalid email', () => {
    expect(validateSignal({ event: 'x', email: 'not-an-email' }).error).toBeTruthy();
  });

  it('rejects a missing event', () => {
    expect(validateSignal({ email: 'a@b.co' }).error).toBeTruthy();
  });
});

describe('activityPayload', () => {
  it('keeps profile + extra fields, drops meta and empty values', () => {
    const out = activityPayload({
      source: 'website', event: 'waitlist_joined', email: 'a@b.co',
      src: 'li-1', name: 'Jane', company: '', sector: 'Tech',
      extra_question: 'answer',
    });
    // email/event/source/src zijn kolommen — niet dubbel in payload
    expect(out).toEqual({ name: 'Jane', sector: 'Tech', extra_question: 'answer' });
  });
});

describe('profilePatch', () => {
  it('fills only fields that are currently empty', () => {
    const existing = { full_name: 'Jane Doe', company: null, role: '', sector: 'Tech' };
    const patch = profilePatch(existing, {
      name: 'J. Doe', company: 'Acme', role: 'CHRO', sector: 'Finance',
    });
    // full_name bestaat al, sector bestaat al → niet overschrijven
    expect(patch).toEqual({ company: 'Acme', role: 'CHRO' });
  });

  it('returns an empty patch when nothing new is provided', () => {
    expect(profilePatch({ full_name: 'X', company: 'Y', role: 'Z', sector: 'S' }, {})).toEqual({});
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx vitest run api/_lib/website-signal-lib.test.js`
Expected: FAIL — cannot resolve `./website-signal-lib.js`.

- [ ] **Step 3: Implement `api/_lib/website-signal-lib.js`**

```js
// Pure helpers voor api/website-signal.js — apart bestand zodat vitest ze
// zonder Supabase-verbinding kan testen. (Bestanden onder api/_lib worden
// niet als endpoint gedeployed.)

// Velden die als kolom worden opgeslagen en dus niet dubbel in de
// activity-payload hoeven. Profielvelden (name/company/role/sector) blijven
// WEL in de payload: als een bestaande lead met een ander bedrijf opnieuw
// binnenkomt, overschrijven we het profiel niet maar raakt de nieuwe waarde
// zo toch niet kwijt.
const META_FIELDS = new Set(['email', 'event', 'source', 'src']);

export function validateSignal(body) {
  if (!body || typeof body !== 'object') return { error: 'Missing body' };
  const email = String(body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Invalid email' };
  const event = String(body.event || '').trim();
  if (!event) return { error: 'Missing event' };
  return { value: { ...body, email, event } };
}

export function activityPayload(body) {
  const out = {};
  for (const [k, v] of Object.entries(body)) {
    if (META_FIELDS.has(k)) continue;
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  return out;
}

// Patch voor een bestaande marketing lead: alleen lege profielvelden
// aanvullen, nooit bestaande waarden overschrijven.
export function profilePatch(existing, body) {
  const map = {
    full_name: body.name,
    company: body.company,
    role: body.role,
    sector: body.sector,
  };
  const patch = {};
  for (const [col, val] of Object.entries(map)) {
    if (val && !existing[col]) patch[col] = val;
  }
  return patch;
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run api/_lib/website-signal-lib.test.js`
Expected: all 7 tests PASS. Also run the whole suite once (`npx vitest run`) to confirm nothing else broke.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/website-signal-lib.js api/_lib/website-signal-lib.test.js
git commit -m "feat(api): pure helpers voor website-signal intake (TDD)"
```

---

### Task 3: Intake endpoint `api/website-signal.js`

**Files:**
- Create: `api/website-signal.js`

- [ ] **Step 1: Implement the endpoint**

```js
// POST /api/website-signal — intake van website-aanmeldingen (waitlist nu,
// scorecard-events straks). De website (eclectik-website-h2) stuurt:
//   { source:'website', event:'waitlist_joined', email, name, company,
//     role, sector, src? }
// met header x-webhook-secret. Zie docs/superpowers/specs/
// 2026-07-08-marketing-leads-pipeline-design.md.
//
// Schrijft naar marketing_leads (find-or-create op e-mail, lege
// profielvelden aanvullen) + altijd één marketing_lead_activity-rij.
// Raakt bewust géén contacts/leads — promoveren gebeurt handmatig in
// Marketing → Leads.
import { createClient } from '@supabase/supabase-js';
import { requireWebhookSecret } from './_lib/guard.js';
import { validateSignal, activityPayload, profilePatch } from './_lib/website-signal-lib.js';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

async function findByEmail(email) {
  const { data, error } = await supabase
    .from('marketing_leads')
    .select('id, full_name, company, role, sector')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireWebhookSecret(req, res, 'WEBSITE_WEBHOOK_SECRET')) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const { error: valError, value: body } = validateSignal(req.body);
  if (valError) return res.status(400).json({ error: valError });

  try {
    const now = new Date().toISOString();
    let lead = await findByEmail(body.email);

    if (!lead) {
      const { data: created, error: insErr } = await supabase
        .from('marketing_leads')
        .insert({
          email: body.email,
          full_name: body.name || null,
          company: body.company || null,
          role: body.role || null,
          sector: body.sector || null,
          first_src: body.src || null,
          consent_at: now,
          last_activity_at: now,
        })
        .select('id')
        .single();
      if (insErr && insErr.code === '23505') {
        // Race: tweede gelijktijdige aanmelding won de insert — pak die rij.
        lead = await findByEmail(body.email);
      } else if (insErr) {
        throw insErr;
      } else {
        lead = created;
      }
    } else {
      const patch = {
        ...profilePatch(lead, body),
        last_activity_at: now,
        updated_at: now,
      };
      const { error: updErr } = await supabase
        .from('marketing_leads').update(patch).eq('id', lead.id);
      if (updErr) throw updErr;
    }

    const { error: actErr } = await supabase.from('marketing_lead_activity').insert({
      marketing_lead_id: lead.id,
      event: body.event,
      payload: activityPayload(body),
      src: body.src || null,
    });
    if (actErr) throw actErr;

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[website-signal] failed:', e?.message || e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
```

- [ ] **Step 2: Sanity-check locally**

Run: `node --input-type=module -e "import('./api/website-signal.js').then(m => console.log(typeof m.default))"` from the repo root.
Expected: prints `function` (module parses, imports resolve). Full request-level testing happens against the deployed preview in Task 6 — this repo has no local serverless runner.

- [ ] **Step 3: Commit**

```bash
git add api/website-signal.js
git commit -m "feat(api): website-signal endpoint — marketing lead intake vanaf de website"
```

---

### Task 4: Marketing → Leads tab (UI)

**Files:**
- Create: `src/bd/marketing-leads.jsx`
- Modify: `src/bd/marketing-view.jsx` (add third tab; current tabs sit at lines 28–46, render at 48–59)

- [ ] **Step 1: Create `src/bd/marketing-leads.jsx`**

```jsx
// Marketing → Leads: website-aanmeldingen (marketing_leads tabel).
// Losstaand van de sales-funnel; "Promoveer" maakt pas een leads-rij aan.
// Data wordt hier zelf opgehaald (zoals MarketingCampaigns) — geen props
// vanuit BDApp nodig.
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { fmtRelative } from './atoms';

const STATUS_FILTERS = ['active', 'converted', 'archived', 'all'];

// auth-e-mail → OWNERS-id voor de owner op de gepromoveerde sales lead.
function ownerFromEmail(email) {
  const map = { olivier: 'OA', marco: 'MVG', yarmilla: 'YK' };
  return map[String(email || '').split('@')[0].toLowerCase()] || null;
}

function PayloadLines({ payload }) {
  const entries = Object.entries(payload || {});
  if (!entries.length) return <span style={{ color: 'var(--text-dim, #888)' }}>—</span>;
  return (
    <span>
      {entries.map(([k, v]) => (
        <span key={k} style={{ marginRight: 10 }}>
          <b>{k}</b>: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
        </span>
      ))}
    </span>
  );
}

export default function MarketingLeads() {
  const [rows, setRows] = useState([]);
  const [activity, setActivity] = useState({}); // leadId -> activity rows
  const [expanded, setExpanded] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('marketing_leads').select('*')
      .order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data, error } = await q;
    if (error) alert('Laden mislukt: ' + error.message);
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [statusFilter]);

  const toggleExpand = async (lead) => {
    if (expanded === lead.id) { setExpanded(null); return; }
    setExpanded(lead.id);
    if (!activity[lead.id]) {
      const { data } = await supabase.from('marketing_lead_activity')
        .select('*').eq('marketing_lead_id', lead.id)
        .order('occurred_at', { ascending: false });
      setActivity(a => ({ ...a, [lead.id]: data || [] }));
    }
  };

  const promote = async (lead) => {
    const ok = window.confirm(
      `${lead.full_name || lead.email} promoveren naar sales lead?\n` +
      'Er wordt een rij in de sales-funnel aangemaakt en deze marketing lead krijgt status "converted".'
    );
    if (!ok) return;
    setBusyId(lead.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const acts = activity[lead.id] || [];
      const notes = [
        lead.sector ? `Sector: ${lead.sector}` : null,
        lead.first_src ? `Campagnebron: ${lead.first_src}` : null,
        `Website-activiteit: ${acts.length || 'zie Marketing → Leads'} event(s), eerste aanmelding ${new Date(lead.created_at).toLocaleDateString('nl-NL')}`,
      ].filter(Boolean).join('\n');

      const { data: created, error: insErr } = await supabase.from('leads').insert({
        full_name: lead.full_name || lead.email,
        email: lead.email,
        company_name: lead.company || null,
        title: lead.role || null,
        source: 'Website — marketing lead',
        status: 'New',
        owner: ownerFromEmail(auth?.user?.email),
        notes,
      }).select('id').single();
      if (insErr) throw insErr;

      const { error: updErr } = await supabase.from('marketing_leads')
        .update({ status: 'converted', converted_lead_id: created.id, updated_at: new Date().toISOString() })
        .eq('id', lead.id);
      if (updErr) throw updErr;
      await load();
    } catch (e) {
      alert('Promoveren mislukt: ' + (e?.message || e));
    } finally {
      setBusyId(null);
    }
  };

  const archive = async (lead) => {
    setBusyId(lead.id);
    const { error } = await supabase.from('marketing_leads')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', lead.id);
    if (error) alert('Archiveren mislukt: ' + error.message);
    await load();
    setBusyId(null);
  };

  const th = { textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-dim, #888)', padding: '6px 10px', borderBottom: '0.5px solid var(--sep)' };
  const td = { fontSize: 13, padding: '8px 10px', borderBottom: '0.5px solid var(--sep)', verticalAlign: 'top' };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {STATUS_FILTERS.map(s => (
          <button key={s}
            className={statusFilter === s ? 'btn-primary tiny' : 'btn-ghost tiny'}
            onClick={() => setStatusFilter(s)}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim, #888)' }}>Laden…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-dim, #888)' }}>
          Geen marketing leads{statusFilter !== 'all' ? ` met status "${statusFilter}"` : ''}.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Naam</th><th style={th}>E-mail</th><th style={th}>Bedrijf</th>
              <th style={th}>Rol</th><th style={th}>Sector</th><th style={th}>Bron</th>
              <th style={th}>Laatste activiteit</th><th style={th}>Status</th><th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(lead => (
              <FragmentRow key={lead.id} lead={lead}
                expanded={expanded === lead.id}
                activityRows={activity[lead.id]}
                busy={busyId === lead.id}
                onToggle={() => toggleExpand(lead)}
                onPromote={() => promote(lead)}
                onArchive={() => archive(lead)}
                td={td}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function FragmentRow({ lead, expanded, activityRows, busy, onToggle, onPromote, onArchive, td }) {
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer' }}>
        <td style={td}>{lead.full_name || '—'}</td>
        <td style={td}>{lead.email}</td>
        <td style={td}>{lead.company || '—'}</td>
        <td style={td}>{lead.role || '—'}</td>
        <td style={td}>{lead.sector || '—'}</td>
        <td style={td}>{lead.first_src || '—'}</td>
        <td style={td}>{lead.last_activity_at ? fmtRelative(lead.last_activity_at) : '—'}</td>
        <td style={td}><span className="chip" style={{ fontSize: 11 }}>{lead.status}</span></td>
        <td style={{ ...td, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
          {lead.status === 'active' && (
            <>
              <button className="btn-primary tiny" disabled={busy} onClick={onPromote}>
                Promoveer
              </button>{' '}
              <button className="btn-ghost tiny" disabled={busy} onClick={onArchive}>
                Archiveer
              </button>
            </>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td style={{ ...td, background: 'var(--bg-subtle, rgba(0,0,0,0.03))' }} colSpan={9}>
            {!activityRows ? 'Laden…' : activityRows.length === 0 ? 'Geen activiteit.' : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {activityRows.map(a => (
                  <div key={a.id} style={{ fontSize: 12 }}>
                    <b>{a.event}</b>
                    {' · '}{new Date(a.occurred_at).toLocaleString('nl-NL')}
                    {a.src ? <> {' · bron: '}{a.src}</> : null}
                    {' · '}<PayloadLines payload={a.payload} />
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
```

- [ ] **Step 2: Add the tab to `src/bd/marketing-view.jsx`**

Add the import below the existing ones (after line 5, `import MarketingComposer …`):

```jsx
import MarketingLeads from './marketing-leads';
```

Add a third tab button directly after the Campaigns `<button>` (after current line 39):

```jsx
            <button
              className={tab === 'leads' ? 'btn-primary tiny' : 'btn-ghost tiny'}
              onClick={() => setTab('leads')}>
              Leads
            </button>
```

Add the render branch directly after `{tab === 'campaigns' && <MarketingCampaigns />}` (current line 59):

```jsx
          {tab === 'leads' && <MarketingLeads />}
```

- [ ] **Step 3: Build check + browser verification**

```bash
npx vite build --outDir dist_check && rm -rf dist_check
```

Expected: `✓ built`. Then `npm run dev`, open the app, log in, go to Marketing → Leads:
- Tab renders; with no data shows "Geen marketing leads met status \"active\"."
- Insert a test row via Supabase MCP:
  ```sql
  insert into public.marketing_leads (email, full_name, company, role, sector, first_src, consent_at, last_activity_at)
  values ('uitest@example.com','UI Test','Acme','CHRO','Technology','li-uitest', now(), now());
  insert into public.marketing_lead_activity (marketing_lead_id, event, payload, src)
  select id, 'waitlist_joined', '{"name":"UI Test","company":"Acme"}'::jsonb, 'li-uitest'
  from public.marketing_leads where email='uitest@example.com';
  ```
- Reload tab: row visible; expanding shows the activity line; "Archiveer" flips status (check via the archived filter); re-activate for the promote test by setting status back:
  ```sql
  update public.marketing_leads set status='active' where email='uitest@example.com';
  ```
- "Promoveer" (confirm dialog) → row appears in `leads` (`select full_name, email, source, status, owner, notes from leads where email='uitest@example.com';`), marketing lead shows under the converted filter with `converted_lead_id` set.
- Clean up: delete the test rows:
  ```sql
  delete from public.leads where email='uitest@example.com';
  delete from public.marketing_leads where email='uitest@example.com';
  ```

- [ ] **Step 4: Commit**

```bash
git add src/bd/marketing-leads.jsx src/bd/marketing-view.jsx
git commit -m "feat(ui): Marketing → Leads tab met historie, promoveer en archiveer"
```

---

### Task 5: Version bump + changelog + tag

**Files:**
- Modify: `src/bd/changelog.js` (new entry at the TOP of the `CHANGELOG` array, and bump `CURRENT_VERSION`)
- Modify: `VERSION` (currently `1.51.6` → `1.52.0`)
- Modify: `package.json` (`"version"` → `1.52.0`)

- [ ] **Step 1: Update the three version markers**

`VERSION`: replace content with `1.52.0`. `package.json`: set `"version": "1.52.0"`. `src/bd/changelog.js`: set `CURRENT_VERSION = '1.52.0'`.

- [ ] **Step 2: Add the changelog entry**

At the top of the `CHANGELOG` array (get the real timestamp with `date -u +%Y-%m-%dT%H:%M:%SZ`):

```js
  {
    version: '1.52.0',
    date: '<output van date -u +%Y-%m-%dT%H:%M:%SZ>',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feat',
    title: 'Marketing leads - website-aanmeldingen in een eigen administratie',
    summary:
      'Aanmeldingen op de nieuwe website (benchmark-waitlist, straks ook de ' +
      'scorecards) komen nu binnen in een eigen marketing-leads-administratie, ' +
      'los van de sales-funnel. Nieuwe tab Marketing → Leads toont ze met hun ' +
      'volledige historie; promoveren naar een sales lead is een bewuste ' +
      'handmatige actie.',
    changes: [
      'Nieuwe tabellen marketing_leads en marketing_lead_activity (losstaand, geen koppeling met de funnel).',
      'Nieuw endpoint /api/website-signal: beveiligde intake vanaf de website; dedupliceert op e-mail en bewaart elke interactie apart.',
      'Marketing → Leads tab: filteren op status, historie uitklappen, "Promoveer" (maakt sales lead aan) en "Archiveer".',
      'Toekomstige formulieren (extra waitlist-vragen, scorecards) passen in het datamodel zonder schemawijziging.',
    ],
    files: [
      'api/website-signal.js',
      'api/_lib/website-signal-lib.js',
      'src/bd/marketing-leads.jsx',
      'src/bd/marketing-view.jsx',
      'sql/schema_marketing_leads.sql',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.52.0',
  },
```

- [ ] **Step 3: Build check**

```bash
npx vite build --outDir dist_check && rm -rf dist_check
```

Expected: `✓ built`.

- [ ] **Step 4: Commit + tag**

```bash
git add src/bd/changelog.js VERSION package.json
git commit -m "chore: v1.52.0 — marketing leads pipeline"
git tag v1.52.0
```

---

### Task 6: Configuration, deploy & end-to-end verification (needs Olivier for the push)

**Files:** none (configuration + verification only)

- [ ] **Step 1: Generate the shared secret**

```bash
openssl rand -hex 32
```

Keep the output in hand for steps 2–3. Never print it in summaries or commit it anywhere.

- [ ] **Step 2: Set `WEBSITE_WEBHOOK_SECRET` on the CRM Vercel project**

Find the CRM project ref: `cat ~/Desktop/eclektik-crm/.vercel/project.json` (fields `projectId`/`orgId`). Then with the Vercel CLI (already authenticated on this machine):

```bash
cd ~/Desktop/eclektik-crm && printf '%s' '<SECRET>' | vercel env add WEBSITE_WEBHOOK_SECRET production
```

(If `.vercel/project.json` is missing, run `vercel link` first, or add the variable via the Vercel dashboard → CRM project → Settings → Environment Variables.)

- [ ] **Step 3: Set `CRM_BASE_URL` + `CRM_WEBHOOK_SECRET` on the website project**

Website project: `prj_COcKH5HzO7eSqyQl3oA7J9dCHQKg`, team `team_yK54dV9UILeHLpJBNyuJNXgT`. Via the Vercel REST API (token from `~/Library/Application Support/com.vercel.cli/auth.json`), `POST /v10/projects/prj_COcKH5HzO7eSqyQl3oA7J9dCHQKg/env?teamId=team_yK54dV9UILeHLpJBNyuJNXgT&upsert=true` with body:

```json
[
  { "key": "CRM_BASE_URL", "value": "https://crm.eclectik-insights.co", "type": "encrypted", "target": ["production", "preview"] },
  { "key": "CRM_WEBHOOK_SECRET", "value": "<SECRET>", "type": "sensitive", "target": ["production", "preview"] }
]
```

- [ ] **Step 4: ASK OLIVIER, then push + deploy both projects**

Per house rules: ask before pushing. On approval:

```bash
cd ~/Desktop/eclektik-crm && git push origin main --tags
```

CRM auto-deploys from `origin/main`. Redeploy the website project (so it picks up the new env vars):

```bash
cd ~/Desktop/eclectik-website-H22026 && git commit --allow-empty -m "chore: redeploy voor CRM-koppeling env vars" && git push origin h2-2026-redesign
```

Wait for both deployments to be READY (Vercel API `GET /v6/deployments?projectId=...&limit=1` → `state: "READY"`).

- [ ] **Step 5: Verify the CRM endpoint directly**

```bash
curl -s -X POST https://crm.eclectik-insights.co/api/website-signal \
  -H 'content-type: application/json' -H "x-webhook-secret: $SECRET" \
  -d '{"source":"website","event":"waitlist_joined","email":"e2e-direct@example.com","name":"E2E Direct","company":"Testco","role":"CHRO","sector":"Technology","src":"li-e2e"}'
```

Expected: `{"ok":true}`. Repeat the same call: again `{"ok":true}`, and via MCP confirm 1 lead + 2 activity rows:

```sql
select (select count(*) from marketing_leads where email='e2e-direct@example.com') as leads,
       (select count(*) from marketing_lead_activity a join marketing_leads l on l.id=a.marketing_lead_id
        where l.email='e2e-direct@example.com') as activities;
```

Expected: `leads=1, activities=2`. Wrong secret check:

```bash
curl -s -o /dev/null -w '%{http_code}' -X POST https://crm.eclectik-insights.co/api/website-signal \
  -H 'content-type: application/json' -H 'x-webhook-secret: wrong' -d '{}'
```

Expected: `401`.

- [ ] **Step 6: End-to-end from the review site**

Open `https://eclectik-website-h2.vercel.app/benchmark?src=li-e2e-crm#waitlist`, submit the waitlist form with a test address (e.g. `e2e-site@example.com`). Expected: success toast on the site; via MCP a `marketing_leads` row for `e2e-site@example.com` with `first_src='li-e2e-crm'` and one `waitlist_joined` activity. Check in the CRM UI: both test leads visible under Marketing → Leads (active).

NOTE: if the website's `RESEND_API_KEY` is still empty/missing, `/api/waitlist` returns 500 **before** it calls the CRM (Resend notification failure is the request's fallback record). In that case the direct `curl` test in step 5 is the proof for this plan, and the form e2e completes once Olivier supplies the Resend key.

- [ ] **Step 7: Clean up test data**

```sql
delete from public.marketing_leads where email in ('e2e-direct@example.com','e2e-site@example.com');
```

(Activity rows cascade.) Report results to Olivier.

---

## Self-review notes

- Spec coverage: tables+RLS (Task 1), endpoint incl. race handling (Tasks 2–3), UI tab with filter/history/promote/archive (Task 4), versioning house rules (Task 5), secret + env + e2e (Task 6). The spec's "5 extra questions" and scorecard events are explicitly out of scope; the payload JSONB path is tested in Task 2.
- Promote `owner`: spec says logged-in user → implemented via `ownerFromEmail` mapping to the `OWNERS` ids used across the app (`OA`/`MVG`/`YK`); falls back to `null` (consistent with the existing new-deal flow) for unknown emails.
- `status: 'New'` on promoted leads matches the value used by `src/bd/new-deal-modal.jsx`.

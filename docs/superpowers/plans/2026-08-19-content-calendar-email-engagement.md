# Content Calendar E-mail Engagement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toon per content-e-mailitem opens/kliks in de rapportage-popup, door de bestaande Resend-webhook + `campaign_sends`-engagement te hergebruiken en content-mails hard aan hun campagne te koppelen.

**Architecture:** Een nieuwe kolom `campaigns.content_item_id` legt de harde link; `sendBroadcast` stempelt hem bij verzending; de Resend-webhook krijgt een broadcast-fallback die opens/kliks toeschrijft; een RPC `content_item_engagement()` aggregeert; de popup toont de cijfers.

**Tech Stack:** Vercel serverless (Node), Supabase (Postgres + RPC), React 19, Vite. DB-wijzigingen via Supabase MCP met backup-protocol (CLAUDE.md §2).

**Belangrijk:** Alle code-edits in de worktree `/Users/olivierarnolds/Desktop/eclektik-crm/.claude/worktrees/wizardly-diffie-11e7e1` op branch `feat/content-engagement`. De webhook `api/marketing-webhook.js` bedient óók de marketing-mails — de wijziging is strikt additief (fallback alleen als de huidige match faalt).

---

## Bestandsstructuur

- `sql/schema_campaigns_content_item_2026-08-19.sql` — kolom + index + RPC (nieuw).
- `sql/data_backfill_campaigns_content_item_2026-08-19.sql` — backup + backfill (nieuw).
- `api/_lib/send-broadcast.js` — `contentItemId`-param + insert-veld.
- `api/content-calendar-execute.js` — `contentItemId: item.id` in beide `sendBroadcast`-aanroepen.
- `api/marketing-webhook.js` — broadcast-fallback in de event-matching.
- `src/bd/content-calendar-view.jsx` — Engagement-blok in `ContentReportModal` + RPC-call.
- `VERSION`, `package.json`, `src/bd/changelog.js` — versie-discipline.

---

## Task 1: DB — kolom, index en RPC

**Files:**
- Create: `sql/schema_campaigns_content_item_2026-08-19.sql`

Additief en non-destructief. Toepassen via Supabase MCP `apply_migration` (project ref `jdzaypckluncdwsoxurs`).

- [ ] **Step 1: Schrijf het SQL-bestand**

Maak `sql/schema_campaigns_content_item_2026-08-19.sql`:

```sql
-- Harde koppeling content-item -> campagne(s), zodat opens/kliks per contentstuk
-- te aggregeren zijn (ook bij drip = meerdere campagnes per item).
alter table campaigns
  add column if not exists content_item_id uuid
  references content_calendar_items(id) on delete set null;

create index if not exists idx_campaigns_content_item
  on campaigns(content_item_id);

-- Aggregatie van engagement over alle campagnes van één content-item.
-- opened/clicked = unieke ontvangers met >=1 open/klik.
create or replace function content_item_engagement(p_item_id uuid)
returns table(recipients int, opened int, clicked int)
language sql stable as $$
  select
    count(*)::int,
    count(*) filter (where cs.open_count > 0)::int,
    count(*) filter (where cs.click_count > 0)::int
  from campaigns c
  join campaign_sends cs on cs.campaign_id = c.id
  where c.content_item_id = p_item_id;
$$;
```

- [ ] **Step 2: Pas de migratie toe via Supabase MCP**

Gebruik `apply_migration` met project_id `jdzaypckluncdwsoxurs`, naam `campaigns_content_item_2026_08_19`, en de query uit Step 1.
Expected: succes, geen foutmelding.

- [ ] **Step 3: Verifieer kolom + RPC**

Run via MCP `execute_sql`:
```sql
select column_name from information_schema.columns
where table_name='campaigns' and column_name='content_item_id';
select proname from pg_proc where proname='content_item_engagement';
```
Expected: beide geven één rij terug.

Verifieer dat de RPC draait (moet 0,0,0 geven voor een willekeurig/onbestaand id):
```sql
select * from content_item_engagement('00000000-0000-0000-0000-000000000000');
```
Expected: één rij `recipients=0, opened=0, clicked=0`.

- [ ] **Step 4: Commit het SQL-bestand**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm/.claude/worktrees/wizardly-diffie-11e7e1
git add sql/schema_campaigns_content_item_2026-08-19.sql
git commit -m "feat(content-calendar): campaigns.content_item_id kolom + engagement-RPC"
```

---

## Task 2: `sendBroadcast` stempelt `content_item_id`

**Files:**
- Modify: `api/_lib/send-broadcast.js`

- [ ] **Step 1: Voeg de parameter toe**

Vind (regel 60):
```js
export async function sendBroadcast({ subject, html_body, from_name, from_email, reply_to, recipients, campaign_name, sent_by, ignoreCooldown = false }) {
```
Vervang door:
```js
export async function sendBroadcast({ subject, html_body, from_name, from_email, reply_to, recipients, campaign_name, sent_by, ignoreCooldown = false, contentItemId = null }) {
```

- [ ] **Step 2: Schrijf het veld in de campaigns-insert**

Vind (regel 188-194):
```js
  const { data: camp, error: campErr } = await supabase.from('campaigns').insert({
    name: campaign_name || subject, subject, html_body,
    from_name: fromName, from_email: fromEmail, reply_to: reply_to || null,
    status: 'sent', recipient_count: inSeg, sent_by: sent_by || null,
    channel: 'broadcast', resend_broadcast_id: bc.data.id, resend_audience_id: segmentId,
    sent_at: sentAt,
  }).select('id').single();
```
Vervang door (voeg de `content_item_id`-regel toe):
```js
  const { data: camp, error: campErr } = await supabase.from('campaigns').insert({
    name: campaign_name || subject, subject, html_body,
    from_name: fromName, from_email: fromEmail, reply_to: reply_to || null,
    status: 'sent', recipient_count: inSeg, sent_by: sent_by || null,
    channel: 'broadcast', resend_broadcast_id: bc.data.id, resend_audience_id: segmentId,
    content_item_id: contentItemId || null,
    sent_at: sentAt,
  }).select('id').single();
```

- [ ] **Step 3: Commit**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm/.claude/worktrees/wizardly-diffie-11e7e1
git add api/_lib/send-broadcast.js
git commit -m "feat(content-calendar): sendBroadcast stempelt content_item_id op de campagne"
```

---

## Task 3: content-cron geeft `contentItemId` mee

**Files:**
- Modify: `api/content-calendar-execute.js`

- [ ] **Step 1: Drip-pad**

Vind (regel 103-106):
```js
    const send = await sendBroadcast({
      subject: item.subject, html_body, recipients: batch, from_email, from_name,
      campaign_name: `[${channel}] ${item.subject} (drip)`,
    });
```
Vervang door:
```js
    const send = await sendBroadcast({
      subject: item.subject, html_body, recipients: batch, from_email, from_name,
      campaign_name: `[${channel}] ${item.subject} (drip)`,
      contentItemId: item.id,
    });
```

- [ ] **Step 2: Normaal pad**

Vind (regel 120-123):
```js
  const send = await sendBroadcast({
    subject: item.subject, html_body, recipients, from_email, from_name,
    campaign_name: `[${channel}] ${item.subject}`,
  });
```
Vervang door:
```js
  const send = await sendBroadcast({
    subject: item.subject, html_body, recipients, from_email, from_name,
    campaign_name: `[${channel}] ${item.subject}`,
    contentItemId: item.id,
  });
```

- [ ] **Step 3: Commit**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm/.claude/worktrees/wizardly-diffie-11e7e1
git add api/content-calendar-execute.js
git commit -m "feat(content-calendar): cron koppelt verzending aan content-item"
```

---

## Task 4: Webhook broadcast-fallback

**Files:**
- Modify: `api/marketing-webhook.js`

Doel: als de directe match op `resend_message_id` faalt maar het event een
`broadcast_id` + ontvanger heeft, resolve dan de campagne via `resend_broadcast_id`
en de send-rij via `(campaign_id, recipient_email)`, en stempel meteen
`resend_message_id` zodat vervolg-events direct matchen. Strikt additief.

- [ ] **Step 1: Vervang het match-blok**

Vind (regel 76-86):
```js
  const type = event?.type;

  const messageId = event?.data?.email_id || event?.data?.id;
  if (!messageId) return res.status(200).json({ ignored: 'no message id' });

  const { data: row } = await supabase
    .from('campaign_sends')
    .select('id, open_count, click_count')
    .eq('resend_message_id', messageId)
    .maybeSingle();
  if (!row) return res.status(200).json({ ignored: 'unknown message id' });
```
Vervang door:
```js
  const type = event?.type;

  const messageId = event?.data?.email_id || event?.data?.id;
  if (!messageId) return res.status(200).json({ ignored: 'no message id' });

  // 1) Directe match op de per-mail-id (transactionele mails + reeds-gestempelde broadcasts).
  let { data: row } = await supabase
    .from('campaign_sends')
    .select('id, open_count, click_count')
    .eq('resend_message_id', messageId)
    .maybeSingle();

  // 2) Broadcast-fallback: geen directe match, maar het event hoort bij een broadcast.
  //    Resolve de campagne via resend_broadcast_id en de send-rij via ontvanger-e-mail,
  //    en stempel resend_message_id zodat vervolg-events direct matchen.
  let stampMessageId = false;
  if (!row) {
    const broadcastId = event?.data?.broadcast_id;
    const to = event?.data?.to;
    const recipientEmail = Array.isArray(to) ? to[0] : to;
    if (broadcastId && recipientEmail) {
      const { data: camp } = await supabase
        .from('campaigns')
        .select('id')
        .eq('resend_broadcast_id', broadcastId)
        .maybeSingle();
      if (camp) {
        const { data: sendRow } = await supabase
          .from('campaign_sends')
          .select('id, open_count, click_count')
          .eq('campaign_id', camp.id)
          .eq('recipient_email', recipientEmail)
          .maybeSingle();
        if (sendRow) { row = sendRow; stampMessageId = true; }
      }
    }
  }
  if (!row) return res.status(200).json({ ignored: 'unknown message id' });
```

- [ ] **Step 2: Stempel de message-id mee in de update**

Vind (regel 88-89, ná de vervanging staat dit iets verderop):
```js
  const nowIso = new Date().toISOString();
  const updates = {};
```
Vervang door:
```js
  const nowIso = new Date().toISOString();
  const updates = {};
  if (stampMessageId) updates.resend_message_id = messageId;
```

- [ ] **Step 3: Commit**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm/.claude/worktrees/wizardly-diffie-11e7e1
git add api/marketing-webhook.js
git commit -m "feat(content-calendar): webhook telt broadcast-opens/kliks via broadcast_id-fallback"
```

---

## Task 5: Engagement-blok in de rapportage-popup

**Files:**
- Modify: `src/bd/content-calendar-view.jsx`

De `ContentReportModal` haalt bij openen (voor e-mail-items) de engagement op via
de RPC en toont een blok. `supabase` is al geïmporteerd in dit bestand (gebruikt in
o.a. `runModeration`-tijdperk / elders); controleer de import en gebruik `useEffect`
(al door React beschikbaar in dit bestand).

- [ ] **Step 1: Controleer de supabase-import**

Run: `cd /Users/olivierarnolds/Desktop/eclektik-crm/.claude/worktrees/wizardly-diffie-11e7e1 && grep -n "import .*supabase\|useEffect" src/bd/content-calendar-view.jsx | head`
Expected: er is een `supabase`-import (bv. `import { supabase } from '../lib/...'`) en `useEffect` is beschikbaar. Zo niet, voeg `useEffect` toe aan de bestaande React-import en gebruik de bestaande supabase-client-import uit dit bestand.

- [ ] **Step 2: Voeg engagement-state + fetch toe in ContentReportModal**

Vind in `ContentReportModal` de bestaande AI-state (rond de top van de functie):
```jsx
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState(null);
```
Voeg er direct ná toe:
```jsx
  const [eng, setEng] = useState(null);        // { recipients, opened, clicked } | null
  const [engLoading, setEngLoading] = useState(false);

  useEffect(() => {
    if (item.type !== 'email') return;
    let cancelled = false;
    setEngLoading(true);
    supabase.rpc('content_item_engagement', { p_item_id: item.id })
      .then(({ data }) => { if (!cancelled) setEng(Array.isArray(data) ? (data[0] || null) : (data || null)); })
      .finally(() => { if (!cancelled) setEngLoading(false); });
    return () => { cancelled = true; };
  }, [item.id, item.type]);
```

- [ ] **Step 3: Render het Engagement-blok**

Vind het einde van blok 2 (Verzendresultaat) — het blok dat begint met
`{rep.send && (` en eindigt met `</div>\n          )}`. Voeg DIRECT ná dat
`{rep.send && ( ... )}`-blok toe:
```jsx
          {/* Blok 2b: Engagement (alleen e-mail, alleen als er verstuurd is) */}
          {item.type === 'email' && rep.send && (
            <div style={box}>
              <span style={label}>Engagement</span>
              {engLoading && <div style={{ color: 'var(--text-3)' }}>Engagement laden…</div>}
              {!engLoading && eng && eng.recipients > 0 && (
                <>
                  <div style={{ color: 'var(--text-1)' }}>
                    Geopend: {eng.opened}/{eng.recipients} ({Math.round((eng.opened / eng.recipients) * 100)}%)
                  </div>
                  <div style={{ color: 'var(--text-1)' }}>
                    Geklikt: {eng.clicked}/{eng.recipients} ({Math.round((eng.clicked / eng.recipients) * 100)}%)
                  </div>
                </>
              )}
              {!engLoading && (!eng || eng.recipients === 0) && (
                <div style={{ color: 'var(--text-3)' }}>Nog geen opens/kliks geregistreerd.</div>
              )}
            </div>
          )}
```

- [ ] **Step 4: Build-check**

Run: `cd /Users/olivierarnolds/Desktop/eclektik-crm/.claude/worktrees/wizardly-diffie-11e7e1 && D="dist_v$(date +%s)"; npx vite build --outDir "$D" 2>&1 | grep -E "built|error|Error"; rm -rf dist_v*`
Expected: `✓ built`, geen errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm/.claude/worktrees/wizardly-diffie-11e7e1
git add src/bd/content-calendar-view.jsx
git commit -m "feat(content-calendar): engagement-blok (opens/kliks) in de rapportage-popup"
```

---

## Task 6: Eenmalige backfill

**Files:**
- Create: `sql/data_backfill_campaigns_content_item_2026-08-19.sql`

Volgt het DB-protocol: backup-tabel eerst, verifieer counts voor/na.

- [ ] **Step 1: Schrijf het SQL-bestand**

Maak `sql/data_backfill_campaigns_content_item_2026-08-19.sql`:

```sql
-- Backup vóór de update (protocol).
create table if not exists _dq_backup_campaigns_20260819 as select * from campaigns;

-- Koppel bestaande content-e-mailitems aan hun campagne via het opgeslagen
-- broadcast-id. Werkt voor het normale broadcast-pad; drip-items krijgen alleen
-- hun laatste batch (het item bewaart maar één broadcast-id).
update campaigns c
set content_item_id = ci.id
from content_calendar_items ci
where ci.type = 'email'
  and ci.external_message_id is not null
  and c.resend_broadcast_id = ci.external_message_id
  and c.content_item_id is null;
```

- [ ] **Step 2: Meet vooraf (via MCP execute_sql)**

```sql
select count(*) as te_koppelen
from campaigns c
join content_calendar_items ci
  on ci.type='email' and ci.external_message_id is not null
 and c.resend_broadcast_id = ci.external_message_id
where c.content_item_id is null;
```
Noteer het getal.

- [ ] **Step 3: Voer backup + update uit (via MCP apply_migration of execute_sql)**

Voer de twee statements uit Step 1 uit. Expected: de update raakt exact het aantal rijen uit Step 2.

- [ ] **Step 4: Verifieer achteraf**

```sql
select count(*) as gekoppeld from campaigns where content_item_id is not null;
```
Expected: >= het getal uit Step 2 (plus eventueel al-gekoppelde nieuwe verzendingen).

- [ ] **Step 5: Commit**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm/.claude/worktrees/wizardly-diffie-11e7e1
git add sql/data_backfill_campaigns_content_item_2026-08-19.sql
git commit -m "chore(content-calendar): eenmalige backfill campaigns.content_item_id"
```

---

## Task 7: Versie-discipline & verificatie

**Files:**
- Modify: `VERSION`, `package.json`, `src/bd/changelog.js`

- [ ] **Step 1: Draai de testsuite (regressie-check)**

Run: `cd /Users/olivierarnolds/Desktop/eclektik-crm/.claude/worktrees/wizardly-diffie-11e7e1 && npx vitest run`
Expected: geen NIEUWE failures t.o.v. de baseline. Let op: er zijn 4 PRE-EXISTING failures in `src/lib/broadcast-recipients.test.js` die losstaan van deze feature — die mogen (nog) rood zijn.

- [ ] **Step 2: Bepaal de nieuwe versie**

Run: `cd /Users/olivierarnolds/Desktop/eclektik-crm/.claude/worktrees/wizardly-diffie-11e7e1 && cat VERSION`
Bump de minor met één (nieuwe feature). Noteer als `<NEW>` (bv. 1.82.0), oud als `<OLD>`.

- [ ] **Step 3: Bump VERSION en package.json**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm/.claude/worktrees/wizardly-diffie-11e7e1
printf '<NEW>\n' > VERSION
sed -i '' 's/"version": "<OLD>"/"version": "<NEW>"/' package.json
```

- [ ] **Step 4: Changelog-entry**

Zet `CURRENT_VERSION` in `src/bd/changelog.js` op `<NEW>` en voeg bovenaan de `CHANGELOG`-array toe (timestamp via `date -u +%Y-%m-%dT%H:%M:%SZ`):

```js
  {
    version: '<NEW>',
    date: '<UTC-TIMESTAMP>',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feature',
    title: 'Content Calendar: e-mail engagement (opens/kliks) in de rapportage',
    summary: 'De rapportage-popup toont per e-mailitem hoeveel ontvangers openden en klikten. Hergebruikt de Resend-webhook + campaign_sends; broadcast-opens/kliks worden nu voor het eerst geteld.',
    changes: [
      'DB: campaigns.content_item_id (harde koppeling) + RPC content_item_engagement(), via Supabase MCP.',
      'send-broadcast.js + content-calendar-execute.js: elke content-verzending wordt aan zijn content-item gekoppeld.',
      'marketing-webhook.js: broadcast-fallback telt opens/kliks van broadcasts (voorheen genegeerd).',
      'content-calendar-view.jsx: engagement-blok (geopend/geklikt %) in de rapportage-popup.',
      'Eenmalige backfill voor bestaande content-items.',
    ],
    files: [
      'sql/schema_campaigns_content_item_2026-08-19.sql',
      'sql/data_backfill_campaigns_content_item_2026-08-19.sql',
      'api/_lib/send-broadcast.js',
      'api/content-calendar-execute.js',
      'api/marketing-webhook.js',
      'src/bd/content-calendar-view.jsx',
    ],
    gitTag: 'v<NEW>',
  },
```

- [ ] **Step 5: Build-check**

Run: `cd /Users/olivierarnolds/Desktop/eclektik-crm/.claude/worktrees/wizardly-diffie-11e7e1 && D="dist_v$(date +%s)"; npx vite build --outDir "$D" 2>&1 | grep -E "built|error|Error"; rm -rf dist_v*`
Expected: `✓ built`.

- [ ] **Step 6: Commit + tag**

```bash
cd /Users/olivierarnolds/Desktop/eclektik-crm/.claude/worktrees/wizardly-diffie-11e7e1
git add VERSION package.json src/bd/changelog.js
git commit -m "chore(content-calendar): versie <NEW> — e-mail engagement"
git tag v<NEW>
```

- [ ] **Step 7: Handmatige verificatie (na deploy, met de gebruiker)**

- Open de rapportage-popup van een verstuurd e-mailitem: het Engagement-blok
  toont "Geopend: x/y (z%)" en "Geklikt: ...". Vlak na verzenden mag dit nog
  "Nog geen opens/kliks geregistreerd." zijn tot de eerste open binnenkomt.
- Controleer dat de marketing-composer (gewone broadcast, zonder content-item)
  ongewijzigd werkt en dat marketing-campagne-engagement blijft kloppen.
- Optioneel: trigger een Resend `email.opened`-testevent en bevestig in
  `campaign_sends` dat open_count ophoogt voor de broadcast-ontvanger.

---

## Self-review notities

- **Spec-dekking:** §1 kolom (Task 1), §2 verzendkant (Task 2+3), §3 webhook-fallback (Task 4), §4 RPC (Task 1), §5 weergave (Task 5), §6 backfill (Task 6), DB-protocol (Task 1+6), versie-discipline (Task 7). Alles gedekt.
- **Additief/veilig:** de webhook-wijziging raakt alleen het pad waar de huidige match faalt; bestaande transactionele/marketing-tracking blijft identiek.
- **Type-consistentie:** RPC retourneert `(recipients, opened, clicked)` als ints; de popup leest `eng.recipients/opened/clicked` — consistent. `content_item_id` overal dezelfde naam.
- **Drip-beperking:** bewust; nieuwe verzendingen koppelen elke batch (Task 2), backfill pakt alleen de laatste batch van historische drip-items (in de spec vastgelegd).

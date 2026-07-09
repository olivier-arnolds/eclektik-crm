# Scorecard Intake (CRM side) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A secret-gated `api/scorecard-intake.js` endpoint that recomputes scorecard scores server-side, stores raw answers in a new locked-down `form_responses` table, creates/updates a marketing lead with a `scorecard_completed` activity (summary only), and emails Marco on hot routes.

**Architecture:** Website POSTs `{source, form_type:'scorecard', email, consent, door, answers, src?}` with `x-webhook-secret`. The endpoint validates against a local question bank, recomputes all scores from raw answers (client scores are never trusted), splits storage: raw answers → `form_responses` (RLS, no policies → service-key only, invisible in CRM UI), summary → marketing lead activity via a shared upsert helper extracted from `api/website-signal.js`.

**Tech Stack:** Vercel serverless (plain JS ESM), Supabase (`jdzaypckluncdwsoxurs`), vitest, Resend via raw fetch (pattern from `api/marketing-send.js`).

**Spec:** `~/Desktop/eclectik-website-H22026/docs/superpowers/specs/2026-07-09-scorecard-fase1-design.md`; question bank + rules: `.../2026-07-07-scorecard-build-spec-marco-v1.md` §2–§4.

**House rules:** work in `/Users/olivierarnolds/Desktop/eclektik-crm` on `main`; commit per task; NEVER push; migrations via Supabase MCP `apply_migration` + SQL saved in `sql/`; build check `npx vite build --outDir dist_check && rm -rf dist_check`; version bump comes as the final task (v1.53.0).

**Payload contract (source of truth for both repos):**

```json
{
  "source": "website",
  "form_type": "scorecard",
  "email": "a@b.co",
  "consent": false,
  "door": "value",
  "answers": {"V1":2, "V2":0, "...": 0, "R4":3, "P1":1, "P2":2, "P3":0},
  "src": "li-test-1"
}
```

`answers` values are 0-based option indexes (NOT scores). All 20 scored ids (V1–V8, C1–C8, R1–R4) and P1–P3 are required.

---

### Task 1: Migration — form_responses + stats views

**Files:**
- Create: `sql/schema_form_responses.sql`

- [ ] **Step 1: Write `sql/schema_form_responses.sql`**

```sql
-- Generieke opslag van ruwe formulier-invoer (scorecard nu; latere formulieren
-- zijn een nieuwe form_type). BEWUST afgeschermd: RLS aan, GEEN policies —
-- alleen de service key (API-endpoints) kan lezen/schrijven. Ruwe antwoorden
-- horen niet zichtbaar te zijn in de CRM-UI (privacyregel scorecard-spec §9).
-- Spec: eclectik-website docs/superpowers/specs/2026-07-09-scorecard-fase1-design.md

create table public.form_responses (
  id           uuid primary key default gen_random_uuid(),
  form_type    text not null,
  email        text,          -- scorecard vult dit altijd; nullable voor toekomstige form_types
  consent      boolean not null default false,
  entry_meta   jsonb,         -- {door, src}
  answers      jsonb not null,
  computed     jsonb,         -- server-side: {scores, bands, quadrant, route}
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.form_responses is
  'Ruwe formulier-invoer (afgeschermd; alleen service key). Samenvattingen leven als marketing_lead_activity.';
create index idx_form_responses_type_created on public.form_responses(form_type, created_at desc);

alter table public.form_responses enable row level security;
-- geen policies: authenticated heeft geen toegang (bewust)

-- Weekstatistiek voor content/mailing (raadpleging via SQL/service; publicatie extern pas bij n >= 30)
create view public.scorecard_weekly_stats as
select
  date_trunc('week', created_at)::date as week,
  count(*) as n,
  round(avg((computed->'scores'->>'value')::numeric))     as avg_value,
  round(avg((computed->'scores'->>'change')::numeric))    as avg_change,
  round(avg((computed->'scores'->>'readiness')::numeric)) as avg_readiness,
  round(avg((computed->'scores'->>'index')::numeric))     as avg_index,
  round(100.0 * avg(((computed->'bands'->>'value') = 'blind_spot')::int))     as pct_blind_value,
  round(100.0 * avg(((computed->'bands'->>'change') = 'blind_spot')::int))    as pct_blind_change,
  round(100.0 * avg(((computed->'bands'->>'readiness') = 'blind_spot')::int)) as pct_blind_readiness,
  count(*) filter (where computed->>'quadrant' = 'flying_blind')             as q_flying_blind,
  count(*) filter (where computed->>'quadrant' = 'spreadsheet_confident')    as q_spreadsheet_confident,
  count(*) filter (where computed->>'quadrant' = 'people_aware_value_blind') as q_people_aware,
  count(*) filter (where computed->>'quadrant' = 'audit_ready')              as q_audit_ready
from public.form_responses
where form_type = 'scorecard'
group by 1 order by 1 desc;

-- Split per rol (P1) — zelfde bron, andere as
create view public.scorecard_stats_by_role as
select
  computed->>'role_label' as role,
  count(*) as n,
  round(avg((computed->'scores'->>'index')::numeric)) as avg_index,
  count(*) filter (where computed->>'route' = 'assessment') as route_assessment
from public.form_responses
where form_type = 'scorecard'
group by 1 order by n desc;
```

- [ ] **Step 2: Apply via Supabase MCP** — `apply_migration` on project `jdzaypckluncdwsoxurs`, name `form_responses_and_scorecard_stats`, exact SQL above. New objects, no backup needed.

- [ ] **Step 3: Verify via `execute_sql`**

```sql
select relrowsecurity from pg_class where relname='form_responses';                       -- true
select count(*) from pg_policies where tablename='form_responses';                        -- 0
insert into public.form_responses (form_type, answers) values ('migration-test','{}'::jsonb);
select count(*) from public.scorecard_weekly_stats;                                       -- runs (0 rows: filter is scorecard)
delete from public.form_responses where form_type='migration-test';
```

- [ ] **Step 4: Commit**

```bash
git add sql/schema_form_responses.sql
git commit -m "feat(db): form_responses (afgeschermd) + scorecard statistiek-views"
```

---

### Task 2: Scorecard scoring lib (TDD)

**Files:**
- Create: `api/_lib/scorecard-lib.js`
- Test: `api/_lib/scorecard-lib.test.js`

The lib holds the question bank (ids + option counts + range score maps + profile option labels — NOT the full question texts; texts live on the website) and the §3/§4 rules. It must stay in sync with the website's `shared/scorecard.ts` (bank version `1.0` — note in both files).

- [ ] **Step 1: Write the failing tests** — `api/_lib/scorecard-lib.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { validateScorecardAnswers, computeScorecard } from './scorecard-lib.js';

// helper: alle 20 vragen op optie-index i, profiel P1..P3
const allAnswers = (i, p = { P1: 0, P2: 0, P3: 0 }) => {
  const ids = ['V1','V2','V3','V4','V5','V6','V7','V8','C1','C2','C3','C4','C5','C6','C7','C8','R1','R2','R3','R4'];
  const a = {}; ids.forEach(id => { a[id] = i; }); return { ...a, ...p };
};

describe('validateScorecardAnswers', () => {
  it('accepts a complete valid set', () => {
    expect(validateScorecardAnswers(allAnswers(1)).error).toBeUndefined();
  });
  it('rejects a missing question id', () => {
    const a = allAnswers(1); delete a.V5;
    expect(validateScorecardAnswers(a).error).toMatch(/V5/);
  });
  it('rejects an out-of-range option index', () => {
    const a = allAnswers(1); a.V3 = 5;            // maturity heeft 5 opties (0..4)
    expect(validateScorecardAnswers(a).error).toMatch(/V3/);
  });
  it('accepts index 5 on range questions (6 opties)', () => {
    const a = allAnswers(1); a.V1 = 5;
    expect(validateScorecardAnswers(a).error).toBeUndefined();
  });
  it('rejects non-integer answers', () => {
    const a = allAnswers(1); a.C2 = 'hoog';
    expect(validateScorecardAnswers(a).error).toMatch(/C2/);
  });
});

describe('computeScorecard', () => {
  it('scores all-zero answers as flying_blind with workshop route', () => {
    const r = computeScorecard(allAnswers(0, { P1: 4, P2: 0, P3: 3 })); // Other, <1000, >24m
    expect(r.scores).toEqual({ value: 0, change: 0, readiness: 0, index: 0 });
    expect(r.bands).toEqual({ value: 'blind_spot', change: 'blind_spot', readiness: 'blind_spot' });
    expect(r.quadrant).toBe('flying_blind');
    expect(r.route).toBe('workshop');
    expect(r.readiness_overlay).toBe(true);
  });
  it('scores all-max answers as audit_ready / benchmark', () => {
    // maturity max = index 4 (score 4); range max = index 5 (score 4)
    const a = allAnswers(4, { P1: 4, P2: 3, P3: 3 });
    ['V1','V2','C3'].forEach(id => { a[id] = 5; });   // de 3 range-vragen
    const r = computeScorecard(a);
    expect(r.scores).toEqual({ value: 100, change: 100, readiness: 100, index: 100 });
    expect(r.quadrant).toBe('audit_ready');
    expect(r.route).toBe('benchmark');                 // index>=70, geen eerdere regel
    expect(r.readiness_overlay).toBe(false);
  });
  it('range scoring maps option index via [0,0,1,2,3,4]', () => {
    const a = allAnswers(0, { P1: 4, P2: 0, P3: 3 });
    a.V1 = 1;                                          // '<10%' → score 0
    expect(computeScorecard(a).scores.value).toBe(0);
    a.V1 = 2;                                          // '10–25%' → score 1
    expect(computeScorecard(a).scores.value).toBe(Math.round((1 / 8) * 25)); // mean(V)*25 = 3
  });
  it('routes renewal <6 months to assessment regardless of scores', () => {
    const r = computeScorecard(allAnswers(4, { P1: 4, P2: 0, P3: 0 }));    // P3=0 → '<6 months'
    expect(r.route).toBe('assessment');
  });
  it('routes V8<=1 + CFO to assessment', () => {
    const a = allAnswers(3, { P1: 0, P2: 0, P3: 3 });  // CFO, renewal >24m
    a.V8 = 1;                                          // score 1
    expect(computeScorecard(a).route).toBe('assessment');
  });
  it('routes change<40 + CHRO to insight_review', () => {
    const a = allAnswers(0, { P1: 2, P2: 0, P3: 3 });  // CHRO, renewal >24m
    ['V1','V2'].forEach(id => { a[id] = 5; });         // wat value, change blijft 0
    const r = computeScorecard(a);
    expect(r.scores.change).toBeLessThan(40);
    expect(r.route).toBe('insight_review');
  });
  it('exposes profile labels', () => {
    const r = computeScorecard(allAnswers(2, { P1: 1, P2: 2, P3: 1 }));
    expect(r.profile).toEqual({
      role: 'CIO / IT / Digital', org_size: '5,000–20,000', renewal_window: '6–12 months',
    });
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `npx vitest run api/_lib/scorecard-lib.test.js` → cannot find module.

- [ ] **Step 3: Implement `api/_lib/scorecard-lib.js`**

```js
// Scorecard-regels (bank v1.0) — MOET in sync blijven met shared/scorecard.ts
// in het eclectik-website-repo. Bron: Marco's build-spec §2–§4
// (website-repo docs/superpowers/specs/2026-07-07-scorecard-build-spec-marco-v1.md).
// Antwoorden zijn 0-based OPTIE-INDEXEN; scoring mapt per vraagtype.

const RANGE_SCORES = [0, 0, 1, 2, 3, 4];                 // 6 opties
const V = ['V1','V2','V3','V4','V5','V6','V7','V8'];
const C = ['C1','C2','C3','C4','C5','C6','C7','C8'];
const R = ['R1','R2','R3','R4'];
const RANGE_IDS = new Set(['V1','V2','C3']);             // de 3 range-vragen
export const SCORED_IDS = [...V, ...C, ...R];

const P1_OPTIONS = ['CFO / Finance','CIO / IT / Digital','CHRO / HR','Transformation / Strategy','Other'];
const P2_OPTIONS = ['<1,000','1,000–5,000','5,000–20,000','>20,000'];
const P3_OPTIONS = ['<6 months','6–12 months','12–24 months','>24 months',"Don't know"];

function optionCount(id) {
  if (id === 'P1') return P1_OPTIONS.length;
  if (id === 'P2') return P2_OPTIONS.length;
  if (id === 'P3') return P3_OPTIONS.length;
  return RANGE_IDS.has(id) ? 6 : 5;
}

export function validateScorecardAnswers(answers) {
  if (!answers || typeof answers !== 'object') return { error: 'Missing answers' };
  for (const id of [...SCORED_IDS, 'P1', 'P2', 'P3']) {
    const v = answers[id];
    if (!Number.isInteger(v) || v < 0 || v >= optionCount(id)) {
      return { error: `Invalid or missing answer for ${id}` };
    }
  }
  return {};
}

function answerScore(id, optionIndex) {
  return RANGE_IDS.has(id) ? RANGE_SCORES[optionIndex] : optionIndex;
}

const mean = (ids, answers) => ids.reduce((s, id) => s + answerScore(id, answers[id]), 0) / ids.length;
const band = (x) => (x < 40 ? 'blind_spot' : x < 70 ? 'partial_view' : 'evidence_led');

// Rekent alles uit vanuit ruwe antwoorden. Retourneert ook profile-labels,
// zodat de intake ze in de lead-activiteit en stats kan opnemen.
export function computeScorecard(answers) {
  const value = mean(V, answers) * 25;
  const change = mean(C, answers) * 25;
  const readiness = mean(R, answers) * 25;
  const index = 0.4 * value + 0.4 * change + 0.2 * readiness;

  const quadrant =
    value < 60 && change < 60 ? 'flying_blind'
    : value >= 60 && change < 60 ? 'spreadsheet_confident'
    : value < 60 ? 'people_aware_value_blind'
    : 'audit_ready';

  const role = P1_OPTIONS[answers.P1];
  const renewal = P3_OPTIONS[answers.P3];

  // §4: top-down, eerste match wint
  let route = 'workshop';
  if (['<6 months', '6–12 months'].includes(renewal)
      || (answerScore('V8', answers.V8) <= 1 && ['CFO / Finance', 'CIO / IT / Digital'].includes(role))) {
    route = 'assessment';
  } else if (change < 40 && role === 'CHRO / HR') {
    route = 'insight_review';
  } else if (index >= 70) {
    route = 'benchmark';
  }

  return {
    scores: {
      value: Math.round(value), change: Math.round(change),
      readiness: Math.round(readiness), index: Math.round(index),
    },
    bands: { value: band(value), change: band(change), readiness: band(readiness) },
    quadrant,
    route,
    readiness_overlay: readiness < 40,
    profile: { role, org_size: P2_OPTIONS[answers.P2], renewal_window: renewal },
  };
}
```

- [ ] **Step 4: Run, verify PASS** — targeted file all green, then `npx vitest run` (was 74; now 74 + new = all green).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/scorecard-lib.js api/_lib/scorecard-lib.test.js
git commit -m "feat(api): scorecard scoring/routing lib (TDD, bank v1.0)"
```

---

### Task 3: Extract shared marketing-lead upsert

**Files:**
- Create: `api/_lib/marketing-lead-store.js`
- Modify: `api/website-signal.js` (replace inline find/insert/update/activity logic with the helper — behavior identical)

- [ ] **Step 1: Create `api/_lib/marketing-lead-store.js`** — extract the logic that `api/website-signal.js` currently does inline (read that file first; keep its exact semantics: ilike lookup with wildcard escaping, insert with trimmed/capped fields, 23505 race re-fetch + explicit throw, fill-empty-only patch, activity insert):

```js
// Gedeelde upsert voor marketing leads + activiteit. Gebruikt door
// api/website-signal.js (waitlist) en api/scorecard-intake.js (scorecard).
// Semantiek: vind-of-maak op e-mail (case-insensitief), lege profielvelden
// aanvullen (nooit overschrijven), altijd één activity-rij per aanroep.
import { profilePatch } from './website-signal-lib.js';

const cap = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) || null : null);

async function findByEmail(supabase, email) {
  // ilike zodat een case-variant (bv. handmatige invoer) gevonden wordt;
  // \ % _ escapen zodat ze letterlijk matchen (LIKE-wildcards).
  const pattern = email.replace(/[\\%_]/g, '\\$&');
  const { data, error } = await supabase
    .from('marketing_leads')
    .select('id, full_name, company, role, sector')
    .ilike('email', pattern)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// fields: { email (verplicht, lowercase), name?, company?, role?, sector?, src? }
// activity: { event, payload, src? }
export async function upsertMarketingLead(supabase, fields, activity) {
  const now = new Date().toISOString();
  let lead = await findByEmail(supabase, fields.email);

  if (!lead) {
    const { data: created, error: insErr } = await supabase
      .from('marketing_leads')
      .insert({
        email: fields.email,
        full_name: cap(fields.name, 200),
        company: cap(fields.company, 200),
        role: cap(fields.role, 200),
        sector: cap(fields.sector, 200),
        first_src: typeof fields.src === 'string' ? fields.src.slice(0, 100) : null,
        consent_at: now,
        last_activity_at: now,
      })
      .select('id')
      .single();
    if (insErr && insErr.code === '23505') {
      lead = await findByEmail(supabase, fields.email);
      if (!lead) throw new Error('marketing lead not found after unique-violation retry');
    } else if (insErr) {
      throw insErr;
    } else {
      lead = created;
    }
  } else {
    const patch = {
      ...profilePatch(lead, fields),
      last_activity_at: now,
      updated_at: now,
    };
    const { error: updErr } = await supabase
      .from('marketing_leads').update(patch).eq('id', lead.id);
    if (updErr) throw updErr;
  }

  const { error: actErr } = await supabase.from('marketing_lead_activity').insert({
    marketing_lead_id: lead.id,
    event: activity.event,
    payload: activity.payload,
    src: typeof activity.src === 'string' ? activity.src.slice(0, 100) : null,
  });
  if (actErr) throw actErr;

  return lead.id;
}
```

- [ ] **Step 2: Refactor `api/website-signal.js`** to use it — the handler keeps: method check, guard, supabase-null check, `validateSignal`, then:

```js
    await upsertMarketingLead(supabase, {
      email: body.email, name: body.name, company: body.company,
      role: body.role, sector: body.sector, src: body.src,
    }, {
      event: body.event, payload: activityPayload(body), src: body.src,
    });
    return res.status(200).json({ ok: true });
```

Remove the now-unused inline `findByEmail`/insert/update/activity code and the local `src` const. Imports become `validateSignal, activityPayload` from website-signal-lib plus `upsertMarketingLead` from marketing-lead-store. NOTE: `profilePatch` moves out of the endpoint's imports (the store imports it itself).

- [ ] **Step 3: Verify** — `npx vitest run` all green; `node --input-type=module -e "import('./api/website-signal.js').then(m=>console.log(typeof m.default))"` → `function`. Then re-run the LIVE regression once deployed (Task 5) — for now also run a local logic smoke via the existing tests only.

- [ ] **Step 4: Commit**

```bash
git add api/_lib/marketing-lead-store.js api/website-signal.js
git commit -m "refactor(api): marketing-lead upsert gedeeld (voorbereiding scorecard-intake)"
```

---

### Task 4: `api/scorecard-intake.js`

**Files:**
- Create: `api/scorecard-intake.js`

- [ ] **Step 1: Implement**

```js
// POST /api/scorecard-intake — intake van afgeronde scorecards vanaf de website.
// Payload: { source:'website', form_type:'scorecard', email, consent, door,
//            answers: {V1..R4, P1..P3 als optie-indexen}, src? }
// met header x-webhook-secret (zelfde secret als website-signal).
//
// Splitst volgens de privacyregel (scorecard-spec §9):
//   ruwe antwoorden → form_responses (RLS zonder policies, service-only)
//   samenvatting (scores/banden/kwadrant/route) → marketing lead activiteit
// Scores worden hier HERBEREKEND uit de ruwe antwoorden; client-scores worden
// nooit vertrouwd. Notificatie naar Marco bij route=assessment of index>=70.
import { createClient } from '@supabase/supabase-js';
import { requireWebhookSecret } from './_lib/guard.js';
import { validateScorecardAnswers, computeScorecard } from './_lib/scorecard-lib.js';
import { upsertMarketingLead } from './_lib/marketing-lead-store.js';

const supabase = (process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function notifyHotLead({ email, computed, door, src }) {
  const to = process.env.SCORECARD_NOTIFY_TO;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.SCORECARD_NOTIFY_FROM || 'Eclectik CRM <marketing@eclektik.co>';
  if (!to || !key) { console.warn('[scorecard-intake] notify overgeslagen (env ontbreekt)'); return; }
  const s = computed.scores;
  const lines = [
    `Scorecard ingevuld: ${email}`,
    `Route: ${computed.route} · Kwadrant: ${computed.quadrant}`,
    `Scores — value ${s.value}, change ${s.change}, readiness ${s.readiness}, index ${s.index}`,
    `Profiel: ${computed.profile.role} · ${computed.profile.org_size} · renewal ${computed.profile.renewal_window}`,
    `Deur: ${door}${src ? ` · bron: ${src}` : ''}`,
    '', 'Zie Marketing → Leads in de CRM.',
  ];
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to,
        subject: `Scorecard: ${email} — ${computed.route} (index ${s.index})`,
        text: lines.join('\n'),
      }),
    });
    if (!resp.ok) console.error('[scorecard-intake] notify mislukt:', resp.status, await resp.text().catch(() => ''));
  } catch (e) {
    console.error('[scorecard-intake] notify error:', e?.message || e);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireWebhookSecret(req, res, 'WEBSITE_WEBHOOK_SECRET')) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email' });
  if (body.form_type !== 'scorecard') return res.status(400).json({ error: 'Unsupported form_type' });
  const door = body.door === 'change' ? 'change' : 'value';
  const { error: ansErr } = validateScorecardAnswers(body.answers);
  if (ansErr) return res.status(400).json({ error: ansErr });
  const consent = body.consent === true;
  const src = typeof body.src === 'string' ? body.src.slice(0, 100) : null;

  try {
    const computed = computeScorecard(body.answers);

    const { error: insErr } = await supabase.from('form_responses').insert({
      form_type: 'scorecard',
      email,
      consent,
      entry_meta: { door, src },
      answers: body.answers,
      computed: {
        scores: computed.scores, bands: computed.bands,
        quadrant: computed.quadrant, route: computed.route,
        readiness_overlay: computed.readiness_overlay,
        role_label: computed.profile.role,           // voor scorecard_stats_by_role
        org_size: computed.profile.org_size,
        renewal_window: computed.profile.renewal_window,
        bank_version: '1.0',
      },
    });
    if (insErr) throw insErr;

    await upsertMarketingLead(supabase, {
      email, role: computed.profile.role, src,
    }, {
      event: 'scorecard_completed',
      payload: {                                     // GEEN ruwe antwoorden (privacyregel)
        scores: computed.scores, bands: computed.bands,
        quadrant: computed.quadrant, route: computed.route,
        door, org_size: computed.profile.org_size,
        renewal_window: computed.profile.renewal_window,
      },
      src,
    });

    if (computed.route === 'assessment' || computed.scores.index >= 70) {
      await notifyHotLead({ email, computed, door, src });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[scorecard-intake] failed:', e?.message || e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
```

- [ ] **Step 2: Sanity** — module import prints `function`; `npx vitest run` all green. No production-DB writes from local.

- [ ] **Step 3: Commit**

```bash
git add api/scorecard-intake.js
git commit -m "feat(api): scorecard-intake — herberekent scores, form_responses + marketing lead + notify"
```

---

### Task 5: Version bump v1.53.0 + changelog + tag

**Files:**
- Modify: `VERSION` (`1.52.0` → `1.53.0`), `package.json` version, `src/bd/changelog.js` (CURRENT_VERSION + entry at top)

- [ ] **Step 1: Bump the three markers to `1.53.0`**

- [ ] **Step 2: Changelog entry** (real timestamp via `date -u +%Y-%m-%dT%H:%M:%SZ`):

```js
  {
    version: '1.53.0',
    date: '<REAL TIMESTAMP>',
    author: 'Olivier Arnolds (via Claude)',
    type: 'feat',
    title: 'Scorecard-intake - antwoorden afgeschermd, samenvatting bij de lead',
    summary:
      'De AI Transformation Scorecard op de nieuwe website levert nu leads op. ' +
      'Ruwe antwoorden gaan naar een afgeschermde form_responses-tabel (niet ' +
      'zichtbaar in de CRM); de marketing lead krijgt alleen scores, kwadrant ' +
      'en route in de historie. Marco krijgt direct mail bij een assessment-' +
      'route of een index van 70 of hoger.',
    changes: [
      'Nieuwe afgeschermde tabel form_responses (generiek: toekomstige formulieren zijn een nieuwe form_type).',
      'Nieuw endpoint /api/scorecard-intake: herberekent scores server-side, slaat ruwe antwoorden afgeschermd op.',
      'Marketing lead + scorecard_completed-activiteit met alleen de samenvatting (privacyregel uit de scorecard-spec).',
      'Notificatiemail bij hete leads; statistiek-views scorecard_weekly_stats en scorecard_stats_by_role.',
    ],
    files: [
      'api/scorecard-intake.js',
      'api/_lib/scorecard-lib.js',
      'api/_lib/marketing-lead-store.js',
      'api/website-signal.js',
      'sql/schema_form_responses.sql',
      'src/bd/changelog.js', 'VERSION', 'package.json',
    ],
    gitTag: 'v1.53.0',
  },
```

- [ ] **Step 3: Verify** — build check ✓ built; `npx vitest run` green; VERSION/package.json/CURRENT_VERSION all `1.53.0`.

- [ ] **Step 4: Commit + tag**

```bash
git add src/bd/changelog.js VERSION package.json
git commit -m "chore: v1.53.0 — scorecard-intake"
git tag v1.53.0
```

---

### Task 6: Deploy + live verification (controller/Olivier — do not delegate the push)

- [ ] Ask Olivier to confirm `SCORECARD_NOTIFY_TO` (Marco's address) and set it + optional `SCORECARD_NOTIFY_FROM` on the CRM Vercel project (`prj_4f1tMU9x2GWm0DsyEr752zxK3suW`, team `team_yK54dV9UILeHLpJBNyuJNXgT`).
- [ ] ASK OLIVIER before `git push origin main --tags`. CRM auto-deploys.
- [ ] Live checks (after website side also ships): valid POST → `{ok:true}`; `form_responses` row with computed scores matching the lib tests; marketing lead activity without raw answers; wrong secret → 401; regression: waitlist POST via website-signal still works (Task 3 refactor); notify mail received on an assessment-route test; cleanup of all test rows.

## Self-review notes

- Spec coverage: table+views (T1), recompute rules §3/§4 (T2), storage split + privacy (T4), shared upsert avoids duplicated reviewed logic (T3), house versioning (T5), env + push gate + live e2e (T6).
- The website plan (`eclectik-website-H22026/docs/superpowers/plans/2026-07-09-scorecard-website.md`) consumes the payload contract at the top of this file — keep them in sync if a reviewer changes it.
- `notifyHotLead` default FROM uses the Resend-verified `eclektik.co` domain (see `src/bd/marketing-composer.jsx` sender list); override via `SCORECARD_NOTIFY_FROM` if needed.

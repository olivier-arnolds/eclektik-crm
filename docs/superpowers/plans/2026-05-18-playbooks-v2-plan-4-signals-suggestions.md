# Playbooks v2 — Plan 4: Signals + Suggestions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Bouw het automatische suggestie-systeem dat playbooks zichtbaar maakt op het juiste moment: stage-transitions (instant via DB-trigger) en signaal-gebaseerde events (LinkedIn-posts gedetecteerd door dagelijkse cron, gescoord door Claude). Suggesties verschijnen in topbar-badge + card-pill + Suggesties-hub-tab. Eindstand: een sleeping-deal genereert auto-suggestie binnen 60s, een interessante LinkedIn-post genereert suggestie binnen 24u.

**Architecture:** Twee suggestie-bronnen die beide eindigen in dezelfde `playbook_suggestions` tabel. Bron A = Supabase DB-trigger (PL/pgSQL) op `opportunities.stage` updates → instant. Bron B = daily cron polls Unipile per `signal_subject`, dedupes via `signals.source_id`, scoort via Claude Haiku, drempel > 0.6 → suggestie. UI: drie surface-points (topbar badge, deal-card pill, hub-tab) lezen dezelfde tabel via Supabase Realtime voor live updates. "Warm Outreach" playbook geseed voor signal-triggers.

**Tech Stack:** PL/pgSQL voor DB-trigger, Anthropic SDK (claude-haiku-4-5) voor scoring, Unipile API voor LinkedIn-posts, Supabase Realtime voor live badge-updates, React 19, bestaande Vercel cron-infrastructuur.

---

## File Structure

**Nieuwe SQL-files (2)**:
- `schema_playbooks_v2_stage_trigger.sql` — DB-trigger + helper functie voor stage-change suggesties
- `schema_playbooks_v2_signal_subjects_backfill.sql` — initiële populatie van signal_subjects
- `schema_playbooks_v2_warm_outreach_seed.sql` — Warm Outreach playbook + nodes/edges seed

**Nieuwe code-files (7)**:
- `api/signals-poll.js` — daily cron, LinkedIn posts → signals → scoring → suggestions
- `api/suggestions-expire.js` — daily cleanup, pending > 14 dagen → expired
- `src/components/playbooks/lib/signalScoring.js` — Claude API wrapper voor scoring
- `src/components/playbooks/lib/signalSuggestionRules.js` — rules engine (score > 0.6 → suggest, dedupe)
- `src/components/playbooks/tabs/SuggestionsTab.jsx` — suggesties-feed in hub
- `src/bd/topbar-suggestions.jsx` — badge + dropdown
- `src/bd/signal-follow-toggle.jsx` — bell-icon component voor contact/company signal-following

**Aangepaste files (5)**:
- `src/components/playbooks/PlaybooksHub.jsx` — wire SuggestionsTab + remove placeholder
- `src/bd/lane-funnel.jsx` — pink card-pill voor deals met pending suggestions
- `src/bd/BDApp.jsx` — render TopbarSuggestions in alle topbar-instanties
- `src/bd/inline-details.jsx` — voeg SignalFollowToggle toe aan contact/account panels
- `vercel.json` — twee nieuwe cron-entries (signals-poll + suggestions-expire)

**Out-of-scope voor Plan 4**:
- Sleeping Reactivation playbook geseed → Plan 5 (samen met andere seed-playbooks)
- Email-reply detection (Graph subscriptions) — V5 of later
- Bulk prospect-list-import + fit-scoring — V2 feature
- Branch field_compare condities — V2
- Manual signal-creation UI (handmatig signaal aanmaken voor testen) — niet nodig met test-run

---

## Important context

**Cron schedule** (vercel.json):
- `signals-poll` om `0 7 * * 1-5` (7u NL werkdagen, 1u voor playbook-execute zodat suggesties klaar staan)
- `suggestions-expire` om `0 6 * * 1` (6u maandag, weekly cleanup)

**Unipile post-endpoint**: `GET /api/v1/users/{identifier}/posts?limit=10&account_id=X` waar `identifier` = LinkedIn URN (`urn:li:fsd_profile:...`) of (`urn:li:fsd_company:...`). Voor company-posts ook `is_company=true`. Bestaande `api/unipile.js` heeft al `unipileRequest` helper — hergebruiken.

**Claude scoring prompt**: structured output via JSON. Model: `claude-haiku-4-5` (cost ~$0.001/signal). Fallback: `claude-3-5-haiku-20241022`.

**Suggestion dedupe rule**: voor zelfde contact + zelfde playbook + status='pending' → géén nieuwe suggestie. Voorkomt dat 5 LinkedIn-posts in 1 week → 5 suggesties.

**Realtime badge**: Supabase Realtime subscription op `playbook_suggestions` met `INSERT` events filtered op `status='pending'`. Frontend luistert, badge increments live. Fallback voor offline: poll elke 60s.

**Per-contact/company auto-follow rules**:
- Contacten gelinkt aan opportunities met stage in (`qualify`, `develop`, `proposal`, `active`, `sleeping`) → auto-added als `signal_subject` met `auto_added=true`
- Companies van diezelfde opportunities → auto-added voor company-posts
- Handmatig toggle override mogelijk via bell-icon

**Anthropic system-prompt voor scoring** is anders dan voor content-generation (CLAUDE.md §2b regels gelden NIET voor scoring — die regels zijn voor client-facing tekst, scoring is interne JSON-output).

---

## Task 1: SQL — Stage-change DB trigger

**Files:**
- Create: `schema_playbooks_v2_stage_trigger.sql` (repo root)

- [ ] **Step 1: Maak file met dit content:**

```sql
-- ============================================================
-- Eclectik CRM — Playbooks v2 Plan 4: Stage-change DB trigger
-- Datum: 2026-05-18
-- ============================================================
-- Detecteert UPDATEs op opportunities.stage / leads.sub_status en creëert
-- playbook_suggestions voor matching playbooks met trigger_type='stage_change'.
-- ============================================================

-- =====================
-- STAP 1: Helper-functie
-- =====================

create or replace function public.create_stage_change_suggestions()
returns trigger
language plpgsql
security definer
as $$
declare
  pb record;
begin
  -- Skip if stage didn't actually change
  if NEW.stage is null or (OLD.stage is not distinct from NEW.stage) then
    return NEW;
  end if;

  -- Find playbooks with trigger_type='stage_change' matching the new stage
  for pb in
    select id from public.playbooks
     where status = 'active'
       and trigger_type = 'stage_change'
       and (trigger_config->>'to_stage') = NEW.stage
  loop
    -- Dedupe: skip if pending suggestion already exists for this deal+playbook
    if not exists (
      select 1 from public.playbook_suggestions
       where playbook_id = pb.id
         and deal_id = NEW.id
         and status = 'pending'
    ) then
      insert into public.playbook_suggestions
        (playbook_id, deal_id, source, source_context, status)
      values (
        pb.id,
        NEW.id,
        'stage_change',
        jsonb_build_object(
          'from_stage', OLD.stage,
          'to_stage', NEW.stage,
          'opportunity_name', NEW.name,
          'opportunity_value', NEW.value
        ),
        'pending'
      );
    end if;
  end loop;

  return NEW;
end $$;

comment on function public.create_stage_change_suggestions is
  'Trigger: creëert playbook_suggestions bij stage-changes op opportunities. Dedupes per deal+playbook.';

-- =====================
-- STAP 2: Trigger op opportunities
-- =====================

drop trigger if exists trg_opportunities_stage_suggestions on public.opportunities;

create trigger trg_opportunities_stage_suggestions
after update on public.opportunities
for each row
when (NEW.stage is distinct from OLD.stage)
execute function public.create_stage_change_suggestions();

-- =====================
-- STAP 3: Verify
-- =====================

select
  exists (select 1 from pg_proc where proname = 'create_stage_change_suggestions') as fn_exists,
  exists (select 1 from pg_trigger where tgname = 'trg_opportunities_stage_suggestions') as trg_exists;
-- Expected: beide true
```

- [ ] **Step 2: Commit**

```bash
git add schema_playbooks_v2_stage_trigger.sql && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): SQL — stage-change DB-trigger voor suggestions

PL/pgSQL trigger op opportunities-update detecteert stage-transitions.
Voor elke matching playbook (trigger_type='stage_change', juiste to_stage):
insert in playbook_suggestions met source_context (from/to stage, opp-naam, value).
Dedupes: skip als pending suggestion al bestaat voor zelfde deal+playbook.

Plan 4, Task 1. Run in Supabase SQL Editor.
EOF
)"
```

---

## Task 2: SQL — Signal_subjects backfill

**Files:**
- Create: `schema_playbooks_v2_signal_subjects_backfill.sql` (repo root)

- [ ] **Step 1: Maak file met dit content:**

```sql
-- ============================================================
-- Eclectik CRM — Playbooks v2 Plan 4: signal_subjects backfill
-- ============================================================
-- Vult signal_subjects met auto_added=true entries voor:
--   - Companies van active/sleeping opportunities (linkedin_company_post tracking)
--   - Contacten gelinkt aan diezelfde opportunities (linkedin_user_post tracking)
--
-- Veilig herhaal-baar: ON CONFLICT DO NOTHING.
-- ============================================================

-- =====================
-- STAP 1: Track companies van active/sleeping deals
-- =====================

insert into public.signal_subjects (company_id, source_type, enabled, auto_added)
select distinct o.company_id, 'linkedin_company_post', true, true
from public.opportunities o
where o.company_id is not null
  and (
    o.stage in ('active', 'onboarding', 'qualify', 'develop', 'proposal')
    or (o.stage = 'past' and o.status = 'Won')  -- sleeping
  )
on conflict do nothing;

-- =====================
-- STAP 2: Track contacten van diezelfde deals
-- =====================
-- Contacten relateren aan opportunities via... 
-- (Aanpassen aan jullie data-model: contact-opportunity join-tabel of contact.opportunity_id)
-- 
-- Aanname: contacts hebben company_id, en alle contacten van een tracked company tellen mee.
-- Als jullie een aparte contact_opportunities junction-tabel hebben, gebruik die i.p.v.

insert into public.signal_subjects (contact_id, source_type, enabled, auto_added)
select distinct c.id, 'linkedin_user_post', true, true
from public.contacts c
where c.company_id in (
  select distinct o.company_id
  from public.opportunities o
  where o.company_id is not null
    and (
      o.stage in ('active', 'onboarding', 'qualify', 'develop', 'proposal')
      or (o.stage = 'past' and o.status = 'Won')
    )
)
on conflict do nothing;

-- =====================
-- STAP 3: Verify
-- =====================

select
  source_type,
  count(*) as cnt,
  count(*) filter (where enabled = true) as enabled_cnt
from public.signal_subjects
group by source_type;
-- Expected: 2 rijen (linkedin_company_post + linkedin_user_post), beide met enabled count > 0
```

- [ ] **Step 2: Commit**

```bash
git add schema_playbooks_v2_signal_subjects_backfill.sql && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): SQL — signal_subjects initial backfill

Auto-track alle companies van active/sleeping/in-progress deals voor
linkedin_company_post signaal-bron. Idem voor alle contacten van
diezelfde companies (linkedin_user_post). ON CONFLICT DO NOTHING
zodat re-run safe is.

Plan 4, Task 2. Run in Supabase SQL Editor NA Task 1.
EOF
)"
```

---

## Task 3: Signal scoring library

**Files:**
- Create: `src/components/playbooks/lib/signalScoring.js`

- [ ] **Step 1: Maak file met dit content:**

```js
// Score een LinkedIn-post voor relevantie voor Eclectik's outreach-doelen.
// Gebruikt door api/signals-poll.js. Server-side only (key zit in env).

const SCORING_SYSTEM_PROMPT = `Je beoordeelt LinkedIn-posts voor outreach-relevantie voor Eclectik Insights, een Nederlands advisory-bureau gespecialiseerd in strategie, transformatie en executive coaching voor C-level en seniorenmanagement.

Geef een score 0.0-1.0:
- 0.0-0.3: niet relevant (vakantie-foto, generieke inspiratie-quote, dagelijkse routine)
- 0.3-0.6: matig relevant (algemene industrie-update, persoonlijke mening zonder hook)
- 0.6-0.8: relevant (nieuwe rol, project-launch, strategische verandering, fundraise, M&A)
- 0.8-1.0: zeer relevant (acute business-vraag, openbare uitdaging, vraag om advies, leiderschapsovergang)

Output strict JSON: {"score": 0.0-1.0, "reason": "1-zin uitleg", "topics": ["tag1","tag2"]}.
Geen markdown, geen \`\`\`json\`\`\` fences, alleen pure JSON.`;

export async function scoreLinkedInPost({ anthropic, post, contact, company }) {
  if (!anthropic) {
    throw new Error('Anthropic client not configured');
  }

  const contextLine = contact
    ? `Post-auteur: ${contact.full_name || contact.first_name} (${contact.title || 'rol onbekend'}) bij ${company?.name || contact.company_name || 'bedrijf onbekend'}.`
    : `Company post van: ${company?.name || 'onbekend'} (${company?.industry || 'sector onbekend'}).`;

  const userPrompt = `${contextLine}

Post-tekst:
"""
${(post.text || '').slice(0, 2000)}
"""

Geef je score-JSON.`;

  let raw;
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system: SCORING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    raw = msg.content[0]?.text || '';
  } catch (err) {
    const msg = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 200,
      system: SCORING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    raw = msg.content[0]?.text || '';
  }

  // Try parsing JSON. Strip ```json fences if Claude added them anyway.
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(json)?\n?/, '').replace(/```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      score: Math.max(0, Math.min(1, Number(parsed.score) || 0)),
      reason: String(parsed.reason || '').slice(0, 200),
      topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 5).map(String) : [],
    };
  } catch (err) {
    // Parse-failure: log + return safe default
    console.warn('[signalScoring] JSON parse failed:', raw.slice(0, 300));
    return { score: 0, reason: 'parse-error', topics: [] };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/playbooks/lib/signalScoring.js && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): signalScoring — Claude-based relevance scoring

scoreLinkedInPost() roept claude-haiku-4-5 aan met scoring-system-prompt
die context geeft over Eclectik (advisory firm, C-level focus). Output:
{score 0-1, reason, topics[]}. JSON-parse defensief met fence-stripping.
Fallback model bij API-failure. Safe-default (score=0) bij parse-error.

Plan 4, Task 3.
EOF
)"
```

---

## Task 4: Suggestion-rules library

**Files:**
- Create: `src/components/playbooks/lib/signalSuggestionRules.js`

- [ ] **Step 1: Maak file met dit content:**

```js
// Rules-engine: gegeven een gescoorde signal, beslis of er een suggestion gemaakt moet worden.
// Geen DB-access — pure functies. DB-write gebeurt in api/signals-poll.js.

export const RELEVANCE_THRESHOLD = 0.6;

// Bepaal of dit signal een suggestion moet worden.
export function shouldCreateSuggestion(signal) {
  if (!signal.relevance_score) return false;
  return signal.relevance_score >= RELEVANCE_THRESHOLD;
}

// Bepaal welke playbook getriggerd moet worden door dit signal.
// Voor V1: hard-coded mapping. Latere uitbreidingen: matching op trigger_config.
export function findPlaybookForSignal(signal, activePlaybooks) {
  const triggerType = signal.source === 'linkedin_user_post'
    ? 'trigger_linkedin_user_post'
    : signal.source === 'linkedin_company_post'
    ? 'trigger_linkedin_company_post'
    : null;
  if (!triggerType) return null;

  // Find first active playbook with this trigger_type
  return activePlaybooks.find(pb => pb.trigger_type === triggerType) || null;
}

// Build source_context payload voor suggestion (merge-field source).
export function buildSourceContext(signal) {
  return {
    signal_id: signal.id,
    signal_content: signal.content,
    signal_topics: signal.topics || signal.topic_tags || [],
    signal_score: signal.relevance_score,
    signal_reason: signal.scoring_reason,
    post_url: signal.post_url,
    posted_at: signal.posted_at,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/playbooks/lib/signalSuggestionRules.js && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): signalSuggestionRules — pure rules engine

shouldCreateSuggestion (drempel 0.6), findPlaybookForSignal
(source → trigger_type mapping), buildSourceContext (suggestion-payload
met signal_content als merge-field voor AI-prompts).

Plan 4, Task 4.
EOF
)"
```

---

## Task 5: signals-poll cron

**Files:**
- Create: `api/signals-poll.js`

- [ ] **Step 1: Maak file met dit content:**

```js
// Daily cron — pollt Unipile voor LinkedIn-posts per signal_subject,
// dedupes via source_id, scoort via Claude, creëert suggestions bij score > 0.6.
//
// Trigger: vercel.json cron entry, 0 7 * * 1-5 (7u NL werkdagen).
// Force-trigger handmatig via ?force=true voor testing.

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { scoreLinkedInPost } from '../src/components/playbooks/lib/signalScoring.js';
import { shouldCreateSuggestion, findPlaybookForSignal, buildSourceContext } from '../src/components/playbooks/lib/signalSuggestionRules.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const UNIPILE_DSN = process.env.UNIPILE_BASE_URL || process.env.UNIPILE_DSN;
const UNIPILE_TOKEN = process.env.UNIPILE_API_KEY || process.env.UNIPILE_TOKEN;

// Map onze owner-emails naar Unipile account IDs (uit CLAUDE.md §5)
const UNIPILE_ACCOUNTS = {
  'olivier@eclectik.co': 'tC2o50tiTBiRCt9xAnio3w',
  'marco@eclectik.co':   'KYq2oN8JSPiAQSrcIfT5Ew',
  'yarmilla@eclectik.co':'j9-n2jeNTtGUxemfjlBsZA',
};

async function unipileGet(path) {
  if (!UNIPILE_DSN || !UNIPILE_TOKEN) throw new Error('Unipile not configured');
  const url = `https://${UNIPILE_DSN}/api/v1${path}`;
  const resp = await fetch(url, {
    headers: { 'X-API-KEY': UNIPILE_TOKEN, 'accept': 'application/json' },
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.message || `Unipile ${resp.status}`);
  return data;
}

export default async function handler(req, res) {
  const force = req.query?.force === 'true';
  const limit = Number(req.query?.limit) || 50; // safety cap per run

  const stats = {
    subjects_polled: 0,
    posts_seen: 0,
    new_signals: 0,
    signals_scored: 0,
    suggestions_created: 0,
    errors: [],
  };

  try {
    // Get the default Unipile account_id (any one works for LinkedIn search)
    const accountId = UNIPILE_ACCOUNTS['olivier@eclectik.co'];

    // Get enabled signal_subjects, prioritize oldest last_polled_at
    const { data: subjects, error } = await supabase
      .from('signal_subjects')
      .select('*, contacts(*), companies(*)')
      .eq('enabled', true)
      .order('last_polled_at', { ascending: true, nullsFirst: true })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch subjects: ${error.message}`);

    // Get active playbooks for suggestion-matching
    const { data: activePlaybooks } = await supabase
      .from('playbooks')
      .select('id, trigger_type, trigger_config, version, name')
      .eq('status', 'active');

    for (const subject of subjects || []) {
      try {
        await processSubject(subject, accountId, activePlaybooks || [], stats);
        stats.subjects_polled++;
      } catch (err) {
        stats.errors.push({ subject_id: subject.id, error: err.message });
      }
    }

    res.status(200).json({ status: 'ok', stats });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
}

async function processSubject(subject, accountId, activePlaybooks, stats) {
  // Resolve identifier (LinkedIn URN) from contact or company
  let identifier, isCompany;
  if (subject.contact_id) {
    const contact = subject.contacts;
    if (!contact?.linkedin_url) return; // skip — no LinkedIn URL
    identifier = contact.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '');
    isCompany = false;
  } else if (subject.company_id) {
    const company = subject.companies;
    if (!company?.linkedin_url) return;
    identifier = company.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\/company\//, '').replace(/\/$/, '');
    isCompany = true;
  } else {
    return;
  }

  // Poll Unipile
  const isCompanyParam = isCompany ? '&is_company=true' : '';
  const data = await unipileGet(`/users/${encodeURIComponent(identifier)}/posts?limit=10&account_id=${accountId}${isCompanyParam}`);
  const posts = data.items || data.data || [];
  stats.posts_seen += posts.length;

  for (const post of posts) {
    // Unipile post-fields kunnen variëren; we proberen meerdere namen
    const sourceId = post.id || post.urn || post.post_urn;
    if (!sourceId) continue;

    // Dedupe
    const { data: existing } = await supabase
      .from('signals')
      .select('id')
      .eq('source', subject.source_type)
      .eq('source_id', sourceId)
      .limit(1);
    if (existing?.length) continue;

    // Insert raw signal (without score yet)
    const postText = post.text || post.body || post.content || '';
    const postUrl = post.url || post.permalink || null;
    const postedAt = post.posted_at || post.date || post.created_at || new Date().toISOString();

    const insertPayload = {
      source: subject.source_type,
      source_id: sourceId,
      content: postText.slice(0, 4000),
      post_url: postUrl,
      posted_at: postedAt,
      contact_id: subject.contact_id,
      company_id: subject.company_id,
    };

    const { data: newSignalRows, error: insertErr } = await supabase
      .from('signals')
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr) {
      stats.errors.push({ source_id: sourceId, error: insertErr.message });
      continue;
    }

    stats.new_signals++;

    // Score it
    if (anthropic) {
      try {
        const scoreResult = await scoreLinkedInPost({
          anthropic,
          post: { text: postText },
          contact: subject.contacts,
          company: subject.companies,
        });

        await supabase.from('signals')
          .update({
            relevance_score: scoreResult.score,
            scoring_reason: scoreResult.reason,
            topic_tags: scoreResult.topics,
          })
          .eq('id', newSignalRows.id);

        stats.signals_scored++;

        // Check if suggestion should be created
        const enrichedSignal = { ...newSignalRows, ...scoreResult, relevance_score: scoreResult.score };
        if (shouldCreateSuggestion(enrichedSignal)) {
          const playbook = findPlaybookForSignal(enrichedSignal, activePlaybooks);
          if (playbook) {
            // Dedupe: skip if pending suggestion exists for this contact+playbook
            const { data: existingSuggestion } = await supabase
              .from('playbook_suggestions')
              .select('id')
              .eq('playbook_id', playbook.id)
              .eq('contact_id', subject.contact_id)
              .eq('status', 'pending')
              .limit(1);

            if (!existingSuggestion?.length) {
              await supabase.from('playbook_suggestions').insert({
                playbook_id: playbook.id,
                contact_id: subject.contact_id,
                source: subject.source_type,
                source_context: buildSourceContext(enrichedSignal),
                status: 'pending',
              });
              stats.suggestions_created++;

              await supabase.from('signals')
                .update({ resolved_at: new Date().toISOString() })
                .eq('id', newSignalRows.id);
            }
          }
        }
      } catch (err) {
        stats.errors.push({ signal_id: newSignalRows.id, scoring_error: err.message });
      }
    }
  }

  // Update last_polled_at
  await supabase.from('signal_subjects')
    .update({ last_polled_at: new Date().toISOString() })
    .eq('id', subject.id);
}
```

- [ ] **Step 2: Build + Commit**

```bash
npm run build
git add api/signals-poll.js && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): signals-poll cron

Daily 7u NL — pollt Unipile per signal_subject, dedupes via source_id,
scoort nieuwe posts via Claude, creëert suggestions bij score > 0.6.
Stats: subjects_polled / posts_seen / new_signals / signals_scored /
suggestions_created / errors.

Safety: limit=50 subjects per run (overflow voor volgende dag).
Manual trigger: ?force=true voor testing.

Plan 4, Task 5. Vereist cron-entry in vercel.json (Task 12).
EOF
)"
```

---

## Task 6: suggestions-expire cron

**Files:**
- Create: `api/suggestions-expire.js`

- [ ] **Step 1: Maak file met dit content:**

```js
// Weekly cron — markeert oude pending suggestions als 'expired'.
// Trigger: vercel.json cron, 0 6 * * 1 (6u maandag).

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const EXPIRY_DAYS = 14;

export default async function handler(req, res) {
  try {
    const cutoff = new Date(Date.now() - EXPIRY_DAYS * 86400 * 1000).toISOString();

    const { data, error } = await supabase
      .from('playbook_suggestions')
      .update({ status: 'expired', resolved_at: new Date().toISOString() })
      .eq('status', 'pending')
      .lt('created_at', cutoff)
      .select('id');

    if (error) throw new Error(error.message);

    res.status(200).json({ status: 'ok', expired_count: data?.length || 0 });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add api/suggestions-expire.js && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): suggestions-expire weekly cron

Markeert pending suggestions ouder dan 14 dagen als expired.
Schedule: 0 6 * * 1 (6u maandag).

Plan 4, Task 6.
EOF
)"
```

---

## Task 7: Update vercel.json — twee nieuwe cron-entries

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Lees current vercel.json**

```bash
cat vercel.json
```

Het heeft een `crons` array. Voeg twee entries toe.

- [ ] **Step 2: Modify de `crons` array**

Voeg toe na de bestaande playbook-execute entry:

```json
    {
      "path": "/api/signals-poll",
      "schedule": "0 7 * * 1-5"
    },
    {
      "path": "/api/suggestions-expire",
      "schedule": "0 6 * * 1"
    }
```

Final crons array zou er ongeveer zo uit moeten zien:

```json
  "crons": [
    {
      "path": "/api/playbook-execute",
      "schedule": "0 8 * * 1-5"
    },
    {
      "path": "/api/admin-weekly-export?cron=1",
      "schedule": "0 6 * * 1"
    },
    {
      "path": "/api/signals-poll",
      "schedule": "0 7 * * 1-5"
    },
    {
      "path": "/api/suggestions-expire",
      "schedule": "0 6 * * 1"
    }
  ]
```

- [ ] **Step 3: Verify JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('vercel.json'))" && echo "JSON valid"
```

- [ ] **Step 4: Commit**

```bash
git add vercel.json && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): vercel.json — signals-poll + suggestions-expire crons

signals-poll: dagelijks 7u werkdagen (1u voor playbook-execute zodat
suggesties klaar staan voor enrollments).
suggestions-expire: maandag 6u, weekly cleanup pending > 14 dagen.

Plan 4, Task 7.
EOF
)"
```

---

## Task 8: SuggestionsTab UI

**Files:**
- Create: `src/components/playbooks/tabs/SuggestionsTab.jsx`

- [ ] **Step 1: Maak file met dit content:**

```jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';

export default function SuggestionsTab() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    // Realtime subscription for live updates
    const channel = supabase
      .channel('playbook_suggestions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playbook_suggestions' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filter]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('playbook_suggestions')
      .select(`
        *,
        playbooks(name),
        contacts(full_name, first_name, last_name, company_name),
        opportunities(name, stage)
      `)
      .eq('status', filter)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) { console.error(error); setLoading(false); return; }
    setSuggestions(data || []);
    setLoading(false);
  }

  async function handleStart(suggestion) {
    // Insert enrollment + mark suggestion as 'started'
    const { data: pb } = await supabase
      .from('playbooks')
      .select('version')
      .eq('id', suggestion.playbook_id)
      .single();

    const { data: triggerNode } = await supabase
      .from('playbook_nodes')
      .select('id')
      .eq('playbook_id', suggestion.playbook_id)
      .like('node_type', 'trigger_%')
      .limit(1)
      .single();

    if (!triggerNode) {
      alert('Geen trigger-node gevonden in playbook — kan niet starten.');
      return;
    }

    const { data: enrollment, error } = await supabase
      .from('playbook_enrollments')
      .insert({
        playbook_id: suggestion.playbook_id,
        contact_id: suggestion.contact_id,
        current_node_id: triggerNode.id,
        version_at_start: pb.version,
        status: 'active',
        next_action_at: new Date().toISOString(),
        source_context: suggestion.source_context,
      })
      .select()
      .single();

    if (error) { alert('Enrollment-creatie faalde: ' + error.message); return; }

    await supabase.from('playbook_suggestions')
      .update({
        status: 'started',
        enrollment_id: enrollment.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', suggestion.id);

    load();
  }

  async function handleDismiss(suggestion) {
    await supabase.from('playbook_suggestions')
      .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
      .eq('id', suggestion.id);
    load();
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#888780' }}>Loading...</div>;

  return (
    <div style={{ padding:20, maxWidth:900, margin:'0 auto' }}>
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {['pending','started','dismissed','expired'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'6px 12px', fontSize:11, fontFamily:'inherit',
            background: filter===f ? '#14b8a6' : '#fff', color: filter===f ? '#fff' : '#374151',
            border:'0.5px solid #D3D1C7', borderRadius:4, cursor:'pointer', textTransform:'capitalize',
          }}>{f}</button>
        ))}
      </div>

      {suggestions.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'#888780', fontSize:12 }}>
          Geen suggesties in deze status.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {suggestions.map(s => (
            <div key={s.id} style={{ background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:6, padding:14 }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600 }}>
                    {s.playbooks?.name || 'Onbekende playbook'}
                  </div>
                  <div style={{ fontSize:11, color:'#374151', marginTop:4 }}>
                    {s.contacts ? `${s.contacts.full_name || s.contacts.first_name} (${s.contacts.company_name || '?'})` :
                     s.opportunities ? `Deal: ${s.opportunities.name}` : 'Onbekend doelwit'}
                  </div>
                  <div style={{ fontSize:10, color:'#888780', marginTop:6 }}>
                    Bron: {s.source}
                    {s.source_context?.signal_reason && ` · ${s.source_context.signal_reason}`}
                    {s.source_context?.from_stage && ` · ${s.source_context.from_stage} → ${s.source_context.to_stage}`}
                    {' · '}{new Date(s.created_at).toLocaleString('nl-NL')}
                  </div>
                  {s.source_context?.signal_content && (
                    <div style={{ background:'#f8fafc', padding:8, borderRadius:4, marginTop:8, fontSize:11, color:'#475569', fontStyle:'italic' }}>
                      "{s.source_context.signal_content.slice(0, 200)}{s.source_context.signal_content.length > 200 ? '...' : ''}"
                    </div>
                  )}
                </div>
                {s.status === 'pending' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <button onClick={() => handleStart(s)} style={{ padding:'4px 12px', fontSize:11, background:'#14b8a6', color:'#fff', border:'none', borderRadius:4, cursor:'pointer', fontWeight:600 }}>▶ Start</button>
                    <button onClick={() => handleDismiss(s)} style={{ padding:'4px 12px', fontSize:11, background:'#fff', color:'#888780', border:'0.5px solid #D3D1C7', borderRadius:4, cursor:'pointer' }}>Niet nu</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/playbooks/tabs/SuggestionsTab.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): SuggestionsTab — pending/started/dismissed/expired views

Filter-tabs voor status, suggestion-cards met playbook-naam + target
(contact/deal) + bron + reason + signal-preview (1-zin). Start-knop
creëert enrollment (op trigger-node, met source_context als merge-context).
Dismiss markeert als 'dismissed'.

Supabase Realtime subscription op playbook_suggestions voor live updates.

Plan 4, Task 8.
EOF
)"
```

---

## Task 9: Wire SuggestionsTab in PlaybooksHub + remove placeholder

**Files:**
- Modify: `src/components/playbooks/PlaybooksHub.jsx`

- [ ] **Step 1: Update PlaybooksHub.jsx**

Voeg import toe (na de andere tab imports):
```jsx
import SuggestionsTab from './tabs/SuggestionsTab';
```

Update de TABS array — zet suggestions placeholder op false:
```jsx
const TABS = [
  { key: 'suggestions', label: 'Suggesties', placeholder: false },
  { key: 'drafts',      label: 'Drafts',     placeholder: false },
  { key: 'running',     label: 'Lopend',     placeholder: false },
  { key: 'completed',   label: 'Completed',  placeholder: false },
  { key: 'builder',     label: 'Builder',    placeholder: false },
];
```

In de content-render block, vervang de huidige suggestions-placeholder:
```jsx
{activeTab === 'suggestions' && <SuggestionsTab />}
```

(verwijder het oude blok met "Suggesties-tab komt in Plan 4 (signal-system)" text)

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/playbooks/PlaybooksHub.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): wire SuggestionsTab in PlaybooksHub

Vervangt placeholder met functioneel SuggestionsTab component.
Alle 5 tabs nu functioneel.

Plan 4, Task 9.
EOF
)"
```

---

## Task 10: Topbar suggestion-badge

**Files:**
- Create: `src/bd/topbar-suggestions.jsx`
- Modify: `src/bd/BDApp.jsx`

- [ ] **Step 1: Maak topbar-suggestions.jsx**

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

export default function TopbarSuggestions({ onOpenHub }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadCount();
    const channel = supabase
      .channel('topbar_suggestions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playbook_suggestions' }, () => loadCount())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (open) loadList();
  }, [open]);

  useEffect(() => {
    function clickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, [open]);

  async function loadCount() {
    const { count: c } = await supabase
      .from('playbook_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setCount(c || 0);
  }

  async function loadList() {
    const { data } = await supabase
      .from('playbook_suggestions')
      .select('*, playbooks(name), contacts(full_name, first_name, company_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);
    setSuggestions(data || []);
  }

  if (count === 0) return null;

  return (
    <div ref={dropdownRef} style={{ position:'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background:'transparent', border:'none', cursor:'pointer', position:'relative', padding:'4px 8px', fontSize:14 }}>
        ▶
        <span style={{
          position:'absolute', top:-2, right:-2,
          background:'#ec4899', color:'#fff', borderRadius:999,
          padding:'1px 5px', fontSize:9, fontWeight:600, minWidth:14, textAlign:'center',
        }}>{count}</span>
      </button>

      {open && (
        <div style={{
          position:'absolute', top:32, right:0, zIndex:50,
          background:'#fff', border:'0.5px solid #D3D1C7', borderRadius:6,
          boxShadow:'0 8px 24px rgba(0,0,0,0.12)', padding:8,
          width:280,
        }}>
          <div style={{ fontSize:11, fontWeight:600, color:'#374151', paddingBottom:6, borderBottom:'0.5px solid #f1f5f9', marginBottom:6 }}>
            Playbook-suggesties ({count})
          </div>
          {suggestions.map(s => (
            <div key={s.id} style={{ padding:6, borderRadius:4, marginBottom:2 }}>
              <div style={{ fontSize:11, fontWeight:500 }}>▶ {s.playbooks?.name}</div>
              <div style={{ fontSize:10, color:'#6b7280', marginTop:2 }}>
                {s.contacts?.full_name || s.contacts?.first_name || '?'} {s.contacts?.company_name && `· ${s.contacts.company_name}`}
              </div>
            </div>
          ))}
          <button
            onClick={() => { setOpen(false); onOpenHub?.(); }}
            style={{ width:'100%', padding:'6px', marginTop:6, background:'#f8fafc', border:'0.5px solid #D3D1C7', borderRadius:4, fontSize:11, cursor:'pointer' }}>
            Alle suggesties bekijken
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Modify BDApp.jsx — Topbar component**

Find the Topbar component definition (or where Topbar's right side renders icons like Feedback). Add `<TopbarSuggestions onOpenHub={() => setView('playbooks')} />` next to other topbar-right-icons.

Run `grep -n "Topbar\|💡\|Feedback" src/bd/BDApp.jsx | head -10` to find the right location.

Voeg de import toe bovenaan:
```jsx
import TopbarSuggestions from './topbar-suggestions';
```

Render TopbarSuggestions in een geschikte plek (de exacte plek hangt af van Topbar-component-structuur — geef 'm een prop `view-switcher` als die geneste callbacks nodig heeft).

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/bd/topbar-suggestions.jsx src/bd/BDApp.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): TopbarSuggestions — badge + dropdown

Pink badge naast Feedback-icon met count van pending suggestions.
Klik opent dropdown met top-5 suggesties + "Alle suggesties bekijken"-link
naar Playbooks-hub. Supabase Realtime voor live count-updates.
Hide als count=0 (geen visuele ruis).

Plan 4, Task 10.
EOF
)"
```

---

## Task 11: Card-pill op funnel-cards voor deals met pending suggestions

**Files:**
- Modify: `src/bd/lane-funnel.jsx`

- [ ] **Step 1: Read lane-funnel.jsx**

Inspect hoe deal-cards momenteel renderen. Vermoedelijk een `DealCard` component of inline JSX in een loop.

```bash
grep -n "deal\." src/bd/lane-funnel.jsx | head -20
```

- [ ] **Step 2: Voeg suggesties-state toe**

In het lane-funnel component (functional component): voeg useState + useEffect voor pending suggestions per deal:

```jsx
const [pendingByDealId, setPendingByDealId] = useState({});

useEffect(() => {
  supabase.from('playbook_suggestions')
    .select('deal_id, playbook_id, playbooks(name)')
    .eq('status', 'pending')
    .not('deal_id', 'is', null)
    .then(({ data }) => {
      const map = {};
      (data || []).forEach(s => {
        if (!map[s.deal_id]) map[s.deal_id] = [];
        map[s.deal_id].push(s);
      });
      setPendingByDealId(map);
    });

  const channel = supabase
    .channel('lane_funnel_suggestions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'playbook_suggestions' }, () => {
      // re-fetch on any change
      supabase.from('playbook_suggestions')
        .select('deal_id, playbook_id, playbooks(name)')
        .eq('status', 'pending')
        .not('deal_id', 'is', null)
        .then(({ data }) => {
          const map = {};
          (data || []).forEach(s => {
            if (!map[s.deal_id]) map[s.deal_id] = [];
            map[s.deal_id].push(s);
          });
          setPendingByDealId(map);
        });
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

- [ ] **Step 3: Render pink pill op deal-card**

Vind waar elke deal-card wordt gerenderd (`{deals.map(deal => ...)`). Direct binnen die card-div, voeg toe:

```jsx
{pendingByDealId[deal.id]?.length > 0 && (
  <div style={{
    background:'#fdf2f8',
    color:'#be185d',
    fontSize:9,
    padding:'2px 6px',
    borderRadius:3,
    marginTop:4,
    fontWeight:600,
    display:'inline-flex',
    alignItems:'center',
    gap:4,
  }}>
    ▶ {pendingByDealId[deal.id][0].playbooks?.name || 'Playbook'}
    {pendingByDealId[deal.id].length > 1 && ` (+${pendingByDealId[deal.id].length - 1})`}
  </div>
)}
```

Mogelijk ook een outer-border-color update op de card als er suggesties zijn (zie design):
```jsx
style={{
  // existing styles
  border: pendingByDealId[deal.id]?.length > 0 ? '1px solid #ec4899' : '0.5px solid #D3D1C7',
  boxShadow: pendingByDealId[deal.id]?.length > 0 ? '0 0 0 2px rgba(236,72,153,0.15)' : 'none',
}}
```

- [ ] **Step 4: Build + smoke-test**

`npm run build`

Open `?view=workspace` in dev. Verwacht: geen pills nog (geen suggesties bestaan), maar layout broken. Pas later test je end-to-end.

- [ ] **Step 5: Commit**

```bash
git add src/bd/lane-funnel.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): card-pill op funnel-deal-cards voor pending suggestions

Pink pill onderaan card met playbook-naam. Pink border + glow op de card.
Realtime-update via Supabase subscription op playbook_suggestions.
Component-overlap met TopbarSuggestions: beide tonen dezelfde data,
verschillende surface (in-context vs globaal).

Plan 4, Task 11.
EOF
)"
```

---

## Task 12: Signal-follow toggle op contact/account panels

**Files:**
- Create: `src/bd/signal-follow-toggle.jsx`
- Modify: `src/bd/inline-details.jsx`

- [ ] **Step 1: Maak signal-follow-toggle.jsx:**

```jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function SignalFollowToggle({ contactId, companyId }) {
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);

  const sourceType = contactId ? 'linkedin_user_post' : 'linkedin_company_post';
  const idField = contactId ? 'contact_id' : 'company_id';
  const idValue = contactId || companyId;

  useEffect(() => {
    if (!idValue) return;
    supabase.from('signal_subjects')
      .select('*')
      .eq(idField, idValue)
      .eq('source_type', sourceType)
      .maybeSingle()
      .then(({ data }) => { setSubject(data); setLoading(false); });
  }, [idValue]);

  async function toggle() {
    setLoading(true);
    if (subject) {
      const newEnabled = !subject.enabled;
      await supabase.from('signal_subjects')
        .update({ enabled: newEnabled })
        .eq('id', subject.id);
      setSubject({ ...subject, enabled: newEnabled });
    } else {
      const { data } = await supabase.from('signal_subjects')
        .insert({ [idField]: idValue, source_type: sourceType, enabled: true, auto_added: false })
        .select()
        .single();
      setSubject(data);
    }
    setLoading(false);
  }

  if (!idValue) return null;
  const isFollowing = subject?.enabled === true;
  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isFollowing ? 'LinkedIn-activiteit volgen — klik om uit te zetten' : 'LinkedIn-activiteit niet gevolgd — klik om aan te zetten'}
      style={{
        background:'transparent',
        border:'none',
        cursor:'pointer',
        fontSize:14,
        padding:'4px 6px',
        color: isFollowing ? '#ec4899' : '#888780',
        opacity: loading ? 0.5 : 1,
      }}>
      {isFollowing ? '🔔' : '🔕'}
    </button>
  );
}
```

- [ ] **Step 2: Modify inline-details.jsx**

Voeg import toe bovenaan:
```jsx
import SignalFollowToggle from './signal-follow-toggle';
```

In `InlineContactDetail`: voeg `<SignalFollowToggle contactId={contact.id} />` toe in de header-row naast andere icons (de star / send-arrow).

Doe hetzelfde voor account-detail als die er is. Run `grep -n "InlineAccountDetails\|export function" src/bd/inline-details.jsx | head -10` om de componenten te vinden.

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/bd/signal-follow-toggle.jsx src/bd/inline-details.jsx && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): SignalFollowToggle — bell-icon op contact/account panels

🔔 = following, 🔕 = niet following. Klik toggled enabled-status van
signal_subjects row. Auto-creëert subject als nog niet bestaat
(auto_added=false, dus user-initiated).

Plan 4, Task 12.
EOF
)"
```

---

## Task 13: SQL — Warm Outreach playbook seed

**Files:**
- Create: `schema_playbooks_v2_warm_outreach_seed.sql` (repo root)

- [ ] **Step 1: Maak file met dit content:**

```sql
-- ============================================================
-- Eclectik CRM — Playbooks v2 Plan 4: Warm Outreach playbook seed
-- ============================================================
-- Maakt een minimal playbook aan dat getriggerd wordt door
-- LinkedIn-user-post signaal. Drie nodes: trigger → LinkedIn-draft (AI) → End.
--
-- Safe to re-run: skip if "Warm Outreach" playbook al bestaat.
-- ============================================================

do $$
declare
  pb_id uuid;
  trigger_id uuid;
  draft_id uuid;
  end_id uuid;
begin
  -- Skip if already exists
  if exists (select 1 from public.playbooks where name = 'Warm Outreach') then
    raise notice 'Warm Outreach playbook already exists — skipping seed.';
    return;
  end if;

  -- Create playbook
  pb_id := gen_random_uuid();
  insert into public.playbooks (id, name, status, version, trigger_type, trigger_config)
  values (
    pb_id,
    'Warm Outreach',
    'active',
    1,
    'linkedin_user_post',
    '{}'::jsonb
  );

  -- Trigger node
  trigger_id := gen_random_uuid();
  insert into public.playbook_nodes (id, playbook_id, node_type, config, pos_x, pos_y)
  values (trigger_id, pb_id, 'trigger_linkedin_user_post',
          jsonb_build_object('min_relevance', 0.6),
          0, 0);

  -- LinkedIn-draft (AI mode)
  draft_id := gen_random_uuid();
  insert into public.playbook_nodes (id, playbook_id, node_type, config, pos_x, pos_y)
  values (draft_id, pb_id, 'action_linkedin_draft',
          jsonb_build_object(
            'use_ai', 'ai',
            'ai_prompt', E'Schrijf een korte (2-3 zinnen) warme LinkedIn-reactie op deze post van {{first_name}} ({{role}} bij {{company}}).\n\nPost-inhoud:\n"{{signal_context}}"\n\nToon: oprecht geïnteresseerd, niet salesy. Begin met een specifieke observatie uit de post. Eindig met een open vraag. NIET vermelden: Eclectik, advisory, of welke dienst dan ook.'
          ),
          0, 120);

  -- End node
  end_id := gen_random_uuid();
  insert into public.playbook_nodes (id, playbook_id, node_type, config, pos_x, pos_y)
  values (end_id, pb_id, 'logic_end', '{}'::jsonb, 0, 240);

  -- Edges
  insert into public.playbook_edges (playbook_id, source_node_id, target_node_id)
  values
    (pb_id, trigger_id, draft_id),
    (pb_id, draft_id, end_id);

  -- Initial published version snapshot
  insert into public.playbook_versions (playbook_id, version, graph_snapshot, published_by)
  values (
    pb_id,
    1,
    jsonb_build_object(
      'version', 1,
      'nodes', jsonb_build_array(
        jsonb_build_object('id', trigger_id::text, 'node_type', 'trigger_linkedin_user_post', 'config', jsonb_build_object('min_relevance', 0.6), 'pos_x', 0, 'pos_y', 0),
        jsonb_build_object('id', draft_id::text, 'node_type', 'action_linkedin_draft', 'config', jsonb_build_object('use_ai', 'ai', 'ai_prompt', E'Schrijf een korte (2-3 zinnen) warme LinkedIn-reactie op deze post van {{first_name}}...'), 'pos_x', 0, 'pos_y', 120),
        jsonb_build_object('id', end_id::text, 'node_type', 'logic_end', 'config', '{}'::jsonb, 'pos_x', 0, 'pos_y', 240)
      ),
      'edges', jsonb_build_array(
        jsonb_build_object('source', trigger_id::text, 'target', draft_id::text),
        jsonb_build_object('source', draft_id::text, 'target', end_id::text)
      )
    ),
    'system-seed'
  );

  raise notice 'Warm Outreach playbook seeded: %', pb_id;
end $$;

-- Verify
select id, name, status, trigger_type
from public.playbooks
where name = 'Warm Outreach';
-- Expected: 1 row, active, linkedin_user_post
```

- [ ] **Step 2: Commit**

```bash
git add schema_playbooks_v2_warm_outreach_seed.sql && git commit -m "$(cat <<'EOF'
feat(playbooks-v2): SQL — Warm Outreach playbook seed

3-node playbook: trigger_linkedin_user_post (min_relevance 0.6) → 
action_linkedin_draft (AI-mode met merge-fields prompt) → logic_end.
Inclusief initial v1 version snapshot zodat cron-engine 'm direct kan
runnen. Safe re-run: skip als naam al bestaat.

Plan 4, Task 13. Run in Supabase SQL Editor NA Task 1+2.
EOF
)"
```

---

## Task 14: End-to-end smoke-test

Operationele test — door Olivier in browser + Supabase, NA Vercel-deploy.

- [ ] **Step 1: Run alle 3 SQL files in Supabase SQL Editor**

In volgorde:
1. `schema_playbooks_v2_stage_trigger.sql`
2. `schema_playbooks_v2_signal_subjects_backfill.sql`
3. `schema_playbooks_v2_warm_outreach_seed.sql`

Verifieer per file dat de slot-query (laatste SELECT) de verwachte output toont.

- [ ] **Step 2: Push naar main + wacht op Vercel deploy**

- [ ] **Step 3: Test stage-change suggestion**

Open een test-opportunity in productie. Sleep 'm naar **Sleeping** stage (of zet handmatig in SQL).

Verwacht: er is GEEN playbook met trigger_type='stage_change' + to_stage='sleeping' geseed in Plan 4 (Sleeping Reactivation komt Plan 5), dus géén suggestie. Niets gebeurt. **Dat is correct gedrag.**

Maak desnoods een test-playbook in de builder met `trigger_stage_change` + `to_stage: sleeping` → publish v1 → daarna stage-update → suggestie verschijnt.

- [ ] **Step 4: Test signal-poll handmatig**

```bash
curl "https://crm.eclectik-insights.co/api/signals-poll?force=true&limit=5"
```

Expected JSON:
```json
{
  "status": "ok",
  "stats": {
    "subjects_polled": 5,
    "posts_seen": <0-50>,
    "new_signals": <0-50>,
    "signals_scored": <signals.score_count>,
    "suggestions_created": <0-N>,
    "errors": []
  }
}
```

Als `errors` items bevat met `"Unipile..."`-melding: check UNIPILE_DSN / UNIPILE_API_KEY in Vercel.
Als `posts_seen=0`: tracked contacts hebben geen LinkedIn-URL, of Unipile heeft geen posts voor ze.

- [ ] **Step 5: Check Playbooks Hub → Suggesties tab**

Browser → Playbooks → Suggesties. Verwacht: pending suggestions verschijnen (als score > 0.6 gehit). Klik een 'Start'-knop → enrollment wordt gemaakt → cron pakt 'm op bij volgende run.

- [ ] **Step 6: Check Topbar-badge + Funnel card-pills**

- Open Funnel (workspace) view. Als een deal een pending suggestion heeft: pink border + pill onderaan card
- Check topbar rechtsboven: pink badge naast Feedback-icon met count

- [ ] **Step 7: Documenteer outcome**

Voeg een kort note toe ergens (Supabase, sticky note, etc.):
- Datum poll-run
- Stats (signals_scored, suggestions_created)
- Eventuele errors / opmerkingen

- [ ] **Step 8: Plan 4 klaar**

---

## Plan 4 — Eindstand

Bij voltooiing van alle 14 tasks:

✅ Stage-change DB-trigger detecteert opportunity-stage updates
✅ signal_subjects gevuld voor active/sleeping deal-contacten en companies
✅ Daily signals-poll cron haalt LinkedIn-posts op via Unipile
✅ Claude Haiku scoort posts op relevance (0-1) met reason + topics
✅ Suggestions auto-gecreëerd bij score > 0.6 + dedupe
✅ Weekly cron expired oude pending suggestions na 14d
✅ Suggesties hub-tab: filter (pending/started/dismissed/expired) + Start + Niet nu actions
✅ Topbar-badge met count + dropdown van top-5 + realtime updates
✅ Card-pill op funnel-deal-cards met pending suggestions
✅ Bell-icon toggle op contact/account panels voor signal-following
✅ Warm Outreach playbook geseed: trigger_linkedin_user_post → AI-draft → end

**Volgende plan**: Plan 5 — Sleeping Reactivation playbook (15-node graph met 90/180/365-dagen cadence, branches op reply, internal-tasks voor account-eigenaar) + ondersteuning voor branch-condities op deal-fields (field_compare) zodat de cadence kan brancheren op deal_value.

---

## Risico's & mitigaties

| Risico | Mitigatie |
|---|---|
| **Unipile rate-limiting** (5000 calls/dag tier) | Plan: max 50 subjects per cron-run (geconfigureerd). Bij 50 contacts + 50 companies = 100 calls/dag. Ruim binnen quota. |
| **Claude scoring kost** | Haiku ~$0.001/scoring. 50 nieuwe posts/dag = $0.05 = €1.50/mnd. Verwaarloosbaar. |
| **JSON parse failure bij Claude-scoring** | Defensive parsing met fence-stripping + safe default (score=0). Logged voor latere debug. |
| **Realtime subscription overhead** | Supabase Realtime is gratis tot 100 concurrent connections. 3-personen team = geen probleem. |
| **DB-trigger oneindige loop** | `when (NEW.stage is distinct from OLD.stage)` guard voorkomt no-op fires. Geen recursie risico (insert in andere tabel). |
| **LinkedIn URL formaat** | Identifier-resolutie strip 'https://...' en trailing-slash. Unipile accepteert verschillende formats — kan extra robust gemaakt worden in implementatie. |
| **Per-tier verschillen Unipile API** | Plan-doc gaat uit van standaard `/users/{id}/posts` endpoint. Bij API-changes: snel detecteerbaar in stats (`posts_seen=0` of `errors`). |
| **Suggestion-overload** (te veel suggesties tegelijk) | Dedupe op (playbook_id, contact_id, status='pending'). Plus expiry na 14d. Bij toch overload: voeg user-instelling "max 5 suggesties/dag/user" toe als V5. |

## Self-review notes

**Spec coverage** (uit design doc):
- ✅ Stage-change DB-trigger — Task 1
- ✅ signals-poll daily cron — Task 5
- ✅ Claude relevance scoring — Task 3
- ✅ Suggestion-creatie via rules engine — Task 4 + 5
- ✅ Suggesties hub-tab — Task 8 + 9
- ✅ Topbar-badge — Task 10
- ✅ Card-pill funnel — Task 11
- ✅ Signal-follow toggle per contact/company — Task 12
- ✅ Warm Outreach seed — Task 13
- ✅ Expiry cron — Task 6
- ⏳ Sleeping Reactivation seed (15-node cadence) — Plan 5
- ⏳ External news API integratie — verworpen (LinkedIn-company-posts is voldoende voor V1)

**Placeholder scan**: geen TBD/TODO in concrete code-blokken. Aanname over contact-opportunity relatie in Task 2 SQL is gemarkeerd als "aanpassen aan jullie data-model".

**Type consistency**:
- Source-types: `linkedin_user_post` / `linkedin_company_post` / `stage_change` consistent
- Status-enum: `pending` / `started` / `dismissed` / `expired` consistent
- Suggestion source_context payload: `signal_content`, `signal_topics`, `signal_score`, `signal_reason`, `post_url`, `posted_at` voor signal-suggesties; `from_stage`, `to_stage`, `opportunity_name`, `opportunity_value` voor stage-change

**Out-of-scope verified**: geen Sleeping Reactivation playbook (Plan 5), geen email-reply detection, geen bulk-import voor prospect-lists. Alleen het signaal + suggesties + Warm Outreach minimum-pakket.

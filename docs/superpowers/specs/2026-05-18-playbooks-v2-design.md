# Playbooks v2 — Design Document

| Field | Value |
|---|---|
| Date | 2026-05-18 |
| Status | Design — approved, awaiting implementation plan |
| Author | Olivier (eigenaar) + Claude (brainstorm-facilitator) |
| Implementation start | TBD — na implementation-plan |
| Estimated effort | ~5 weken (4 weken focus + 1 week buffer) |
| Branch | `claude/wizardly-diffie-11e7e1` (worktree) |

---

## 1. Context & motivatie

De huidige Playbook-feature in Eclectik CRM (4 weken oud, twee commits, niet actief
gebruikt) is gebouwd als een **outreach-cadence-engine** — lineaire LinkedIn-
en email-sequences via Unipile. In de praktijk is dit niet de vorm die Olivier
voor ogen had toen het idee ontstond.

**Wat we werkelijk willen** is een visueel configureerbaar workflow-systeem dat
contacten begeleidt door specifieke business-scenarios — niet alleen outreach,
maar bredere "wat te doen wanneer X gebeurt"-flows. Met if/then/else-branches,
gemengde automatische en review-gedreven acties, en triggers vanuit business-
events (stage-overgangen) en signalen (LinkedIn-posts, company-news).

### Onderzoeksinzichten die het ontwerp sturen

- **In-context of dood**: playbooks worden genegeerd als ze als wiki-page leven.
  Suggesties moeten verschijnen waar gebruikers toch al kijken (deal-cards,
  topbar). Onderzoek (HubSpot, Bain HBR, Gong) is hier eenduidig over.
- **Signal-based outreach is empirisch véél effectiever** dan koud aanspreken.
  Apollo, Lusha, Clearbit verdienen miljarden aan dit patroon. Voor een 3-persoons
  advisory-team is dit de hoogste-waarde feature in de roadmap.
- **CHAMP > BANT** voor advisory/consulting: pijn-eerst, budget komt laat. Past
  bij Eclectik's lange sales-cycles en complexe stakeholders.
- **Sleeping-stage is uniek waardevol**: het 7e funnel-stadium dat Eclectik
  hanteert is een natuurlijke trigger voor systematische reactivation-flows.
  Concurrenten doen dit zelden gestructureerd.

## 2. Goals & non-goals

### V1 in-scope

- Visuele drag-drop builder (React Flow, verticale layout)
- Conditionele branching (if/then/else, wait-or-event, multiple paths)
- 14 node-types verdeeld over Triggers (4), Actions (6) en Logic (4)
- Twee suggestie-bronnen:
  - Stage-change events (instant via DB-trigger)
  - Signal-based: LinkedIn user posts + LinkedIn company posts (daily poll)
- AI-relevance-scoring per signal via Claude API (Haiku)
- Drafts-hub voor email/LinkedIn/WhatsApp/Instagram review en verzending
- Per-contact enrollment met handmatige selectie bij start
- Eén geseed playbook: **Sleeping Reactivation** (~15 nodes, 2 branches, 3 cadence-touches op 90/180/365 dagen)
- Eén geseed playbook: **Warm Outreach** (kort, voor signal-suggesties)
- Migratie van bestaande playbook-tabellen naar het nieuwe graph-model
- Versionering: gepubliceerde playbooks krijgen versie-nummers; lopende
  enrollments blijven op hun version

### V2 expliciet uitgesteld

| Onderdeel | Reden uitstel |
|---|---|
| Outbound prospecting (CSV-import + fit-scoring + bulk-enroll) | Andere flow dan reactivation — eerst V1 valideren |
| Externe news-API integratie | LinkedIn-company-posts dekt ~80% van company-news in V1 |
| `wait_for_human` node | Geen concrete use-case in V1 |
| `email_auto_send` action (zonder review) | Risicovol; vereist extra approval-UI |
| `teams_channel_create` action | Onboarding-playbook is V2; vereist MS Graph protected-API-uitbreiding |
| RLS per playbook (alleen eigenaar kan editen) | Klein team, vertrouwen onderling = OK voor V1 |
| Analytics-dashboard (response rates, drop-off per node) | Data eerst verzamelen via V1 |

### Niet-doelen (V1 en V2)

- Geen vervanging van het Tasks-systeem; playbook-tasks blijven gewone tasks
- Geen workflow-engine die externe systemen orchestreert (geen Zapier-replacement);
  scope blijft binnen de CRM
- Geen multi-tenancy / multi-organisatie support

## 3. Architectuur-overzicht

### Component-map

```
Frontend (src/)
├── components/playbooks/
│   ├── PlaybooksHub.jsx          NIEUW · tabs: Suggesties | Drafts | Lopend | Completed | Builder
│   ├── PlaybookFlowBuilder.jsx   NIEUW · React Flow canvas + palette + property panel
│   ├── DraftReviewModal.jsx      NIEUW · email/LI/WA/IG preview + verzend
│   ├── SuggestionsList.jsx       NIEUW · suggesties-feed in hub
│   └── NodeConfigPanels/         NIEUW · per node-type een config-component
├── bd/
│   ├── topbar-suggestions.jsx    NIEUW · badge + dropdown
│   ├── lane-funnel.jsx           AANGEPAST · suggestion-pill op deal-card
│   ├── playbook-enroll-modal.jsx AANGEPAST · multi-contact selectie
│   └── BDApp.jsx                 AANGEPAST · suggestion-state + routing naar hub

Backend (api/)
├── playbook-execute.js           HERSCHREVEN · graph-traversal i.p.v. step-iteratie
├── signals-poll.js               NIEUW · daily Unipile poll → signals write → AI-score
├── suggestions-generate.js       NIEUW · combineert signals + stage-events → suggestions
├── suggestions-expire.js         NIEUW · daily cleanup van expired suggesties
└── playbook-render-draft.js      NIEUW · merge-field substitutie

Libraries (src/lib/)
├── playbook-graph-traversal.js   NIEUW · pure executie-logica (testbaar)
├── unipile-posts.js              NIEUW · helpers voor LinkedIn-posts-poll
└── claude-relevance-score.js     NIEUW · wrapper rond Claude API voor scoring

Database (Supabase)
└── nieuwe tabellen + uitbreidingen op bestaande — zie sectie 5
```

### Data flow — voorbeeld: signal → suggestie → enrollment → draft → verzend

1. **08:00 NL-tijd** — Vercel cron triggert `signals-poll.js`
2. Voor elke rij in `signal_subjects` met `enabled=true`: Unipile-call
   `GET /api/v1/users/{identifier}/posts?limit=10`
3. Per gevonden post: dedupe via `signals.source_id` (post URN). Niet eerder gezien?
   Insert in `signals` zonder score.
4. Claude API call per nieuwe signal — Haiku, ~$0.001/call. Output: `{score, reason, topics}`.
5. Score > 0.6 → maak rij in `playbook_suggestions` (playbook_id = "Warm Outreach",
   contact_id, source = 'linkedin_user_post', source_context = post-tekst).
6. Frontend topbar-badge increments (realtime via Supabase Realtime subscription).
7. Olivier klikt badge → dropdown → "Series B funding van Gamma BV — start Warm Outreach?"
8. Klikt [Start] → handmatig contact-selectie → rij in `playbook_enrollments`
   gemaakt met `current_node_id` = de trigger-node.
9. Direct vervolg: `playbook-execute.js` (of same-request execution) leest de
   graph, vindt eerste action-node = "Email-draft", rendert template met merge-fields
   (post-context als `{{signal_context}}`), insert in `playbook_drafts` met status
   `pending`.
10. Olivier ziet draft verschijnen in Hub → Drafts-tab.
11. Klikt [Verzend] → MS Graph send-as account-eigenaar → `playbook_drafts.status='sent'`.
12. Enrollment beweegt naar volgende node (Wait-or 5d).
13. MS Graph webhook detecteert eventuele reply, mark `replied_at` op enrollment,
    triggert branch-evaluatie bij volgende cron-tick.

## 4. Datamodel

### Nieuwe tabellen

#### `playbook_nodes`
Graph-nodes, vervangt de bestaande `playbook_steps`.

| Kolom | Type | Doel |
|---|---|---|
| `id` | uuid PK | |
| `playbook_id` | uuid FK | → `playbooks.id` |
| `node_type` | text | Een van: `trigger_stage_change`, `trigger_manual`, `trigger_linkedin_user_post`, `trigger_linkedin_company_post`, `action_email_draft`, `action_linkedin_draft`, `action_whatsapp_draft`, `action_instagram_draft`, `action_internal_task`, `action_stage_update`, `logic_wait`, `logic_wait_until_or`, `logic_branch`, `logic_end` |
| `config` | jsonb | Per type: template-tekst, wait-duur, branch-condities, etc. |
| `pos_x` | numeric | Canvas-coördinaat voor builder |
| `pos_y` | numeric | Canvas-coördinaat voor builder |
| `created_at` | timestamptz | |

#### `playbook_edges`
Verbindingen tussen nodes. Eén node kan meerdere uitgaande edges hebben (branch).

| Kolom | Type | Doel |
|---|---|---|
| `id` | uuid PK | |
| `playbook_id` | uuid FK | denormalized voor query-snelheid |
| `source_node_id` | uuid FK | → `playbook_nodes.id` |
| `target_node_id` | uuid FK | → `playbook_nodes.id` |
| `condition_label` | text | Voor branches: "ja" / "nee" / "deal > 50k" / "default" |
| `condition_expr` | jsonb | Machine-readable conditie: `{op: "gt", left: "deal.value", right: 50000}` |
| `created_at` | timestamptz | |

#### `playbook_versions`
Snapshot van de complete graph bij elke publish. Lopende enrollments lezen vanaf hier.

| Kolom | Type | Doel |
|---|---|---|
| `id` | uuid PK | |
| `playbook_id` | uuid FK | → `playbooks.id` |
| `version` | int | Matched `playbooks.version` ten tijde van publish |
| `graph_snapshot` | jsonb | Volledige nodes + edges + configs als snapshot voor immutable replay |
| `published_at` | timestamptz | |
| `published_by` | text | Naam van user die published |

Bij `publish` in builder: increment `playbooks.version` → snapshot huidige `playbook_nodes` + `playbook_edges` → insert hier. Lopende enrollments houden hun `version_at_start` → lezen vanaf deze snapshot in `playbook_versions`, niet vanuit de live `playbook_nodes` (die hoort bij draft / latest version).

#### `signals`
Gedetecteerde events uit externe bronnen (LinkedIn-posts in V1).

| Kolom | Type | Doel |
|---|---|---|
| `id` | uuid PK | |
| `source` | text | `linkedin_user_post` of `linkedin_company_post` |
| `source_id` | text | Externe ID (LinkedIn post URN) — dedupe-sleutel |
| `contact_id` | uuid FK nullable | → `contacts.id` als user-post |
| `company_id` | uuid FK nullable | → `companies.id` als company-post |
| `content` | text | Post-tekst (geknipt op ~500 char) |
| `post_url` | text | Permalink naar de post |
| `relevance_score` | numeric | 0.0–1.0 van Claude AI |
| `scoring_reason` | text | 1-zin uitleg waarom relevant |
| `topic_tags` | text[] | bv ["funding", "hiring", "product_launch"] |
| `posted_at` | timestamptz | Originele post-datum |
| `detected_at` | timestamptz | Wanneer wij 'm zagen |
| `resolved_at` | timestamptz nullable | Wanneer er een suggestie uit voortkwam |

Unique constraint: `(source, source_id)`.

#### `signal_subjects`
Welke contacten/companies we pollen.

| Kolom | Type | Doel |
|---|---|---|
| `id` | uuid PK | |
| `contact_id` | uuid FK nullable | Mutually exclusive met company_id |
| `company_id` | uuid FK nullable | |
| `source_type` | text | `linkedin_user_post` of `linkedin_company_post` |
| `enabled` | boolean default true | |
| `last_polled_at` | timestamptz nullable | |
| `created_at` | timestamptz | |
| `auto_added` | boolean default false | True = automatisch toegevoegd door systeem (alle deal-contacten); false = handmatig |

Check constraint: exact één van `contact_id` of `company_id` is gevuld.

#### `playbook_suggestions`
Pending suggesties wachtend op user-confirm.

| Kolom | Type | Doel |
|---|---|---|
| `id` | uuid PK | |
| `playbook_id` | uuid FK | |
| `contact_id` | uuid FK nullable | Bij contact-suggestie |
| `deal_id` | uuid FK nullable | Bij stage-change suggestie (opportunity) |
| `source` | text | `stage_change` / `linkedin_user_post` / `linkedin_company_post` / `manual` |
| `source_context` | jsonb | Stage-info, signal-content, etc. — beschikbaar als merge-fields |
| `status` | text default 'pending' | `pending` / `started` / `dismissed` / `expired` |
| `created_at` | timestamptz | |
| `resolved_at` | timestamptz nullable | |
| `resolved_by` | text nullable | Naam van user die actie nam |
| `enrollment_id` | uuid FK nullable | Als status='started' |

#### `playbook_drafts`
Klaar-voor-review berichten per enrollment per action-node.

| Kolom | Type | Doel |
|---|---|---|
| `id` | uuid PK | |
| `enrollment_id` | uuid FK | → `playbook_enrollments.id` |
| `node_id` | uuid FK | → `playbook_nodes.id` |
| `channel` | text | `email` / `linkedin` / `whatsapp` / `instagram` |
| `to_contact_id` | uuid FK | |
| `subject` | text nullable | Alleen email |
| `body` | text | Bewerkt door user vóór verzending |
| `body_original` | text | Originele gegenereerde versie (voor analyse) |
| `status` | text default 'pending' | `pending` / `sent` / `skipped` / `expired` |
| `generated_at` | timestamptz | |
| `edited_at` | timestamptz nullable | |
| `resolved_at` | timestamptz nullable | |
| `external_message_id` | text nullable | Bij sent: Graph-message-id of Unipile-message-id voor reply-matching |

### Aangepaste bestaande tabellen

#### `playbooks` — kolommen erbij
- `trigger_type` text — `stage_change` / `manual` / `linkedin_user_post` / `linkedin_company_post`
- `trigger_config` jsonb — type-specifieke config; bv stage_change → `{to_stage: 'sleeping'}`
- `version` int default 1 — incrementeert bij elke publish

#### `playbook_enrollments` — kolom erbij + naam-wijziging
- `current_node_id` uuid FK → `playbook_nodes.id` (vervangt `current_step` na migratie)
- `version_at_start` int — welke versie van de playbook was actief toen enrollment begon
- `replied_at` timestamptz nullable — gevuld door webhook-handlers bij detectie
- `next_action_at` timestamptz nullable — wanneer cron deze enrollment weer moet bekijken

#### `playbook_executions` — onveranderd qua structuur
- Bestaande `step_id` kolom hernoemen naar `node_id`

### Verwijderd na migratie

- `playbook_steps` — gedropt na 24u stabiel draaien op nieuwe structuur

## 5. Visuele builder UX

### Layout (drie kolommen)

| Kolom | Breedte | Inhoud |
|---|---|---|
| Links — Palette | 180px | 14 node-types in 3 categorieën (Triggers/Actions/Logic), drag-source |
| Midden — Canvas | flex | React Flow canvas met dotted-grid achtergrond, zoom/pan, mini-map rechtsonder |
| Rechts — Property Panel | 240px | Velden specifiek voor geselecteerde node-type |

### Top toolbar

- Playbook-naam (editable inline)
- Version badge: `v3 · draft` (huidige edit-versie) en daarnaast info over actieve enrollments op vorige versies
- Buttons: Undo / Redo / Fit-view / Test run / Save draft / Publish v3

### Werkstroom

1. **Add node**: drag uit palette naar canvas, of klik-en-plaats
2. **Configure**: klik op node → property-panel toont fields → vul in → auto-save naar local draft state
3. **Connect**: klik en sleep van node-bottom-handle naar volgende node-top-handle
4. **Branch labels**: klik op een edge → inline editable label ("ja" / "nee" / "deal > 50k" / vrij)
5. **Save Draft**: persisteert huidige edit-state zonder version-bump (overschrijft eerdere draft)
6. **Test run**: opent modal voor test-contact-keuze, dry-runs de hele graph, toont log
7. **Publish**: maakt nieuwe version aan, lopende enrollments blijven op oude version

### Validatie (real-time, blokkeert Publish)

- Lege required config-velden per node-type
- Orphan nodes (geen inkomende edge, behalve trigger-nodes)
- Unreachable nodes (vanaf trigger niet bereikbaar)
- Branches zonder default-pad
- Cycle detection (geen loops zonder wait-node)
- Triggers met `trigger_type` die niet overeenkomt met playbook-niveau `trigger_type`

Waarschuwingen verschijnen als overlay-banner op canvas + rode hint op betreffende node.

### React Flow library

- `@xyflow/react` — MIT-licentie, ~50KB gzipped
- Gebruikt door n8n, Stripe Workflows, Linear, ClickUp
- Custom node-types definieerbaar per type
- Built-in: drag-drop, zoom, pan, mini-map, fit-view, selection
- Edges met labels en custom edge-types

### Versionering

- Save Draft = intermediate state, geen new version
- Publish = insert in nieuwe `playbook_versions` tabel met volledige graph-snapshot (jsonb). `playbooks.version` int wordt geïncrementeerd. Rationale: snapshot in plaats van incrementele migratie geeft schone rollback en eenvoudige "welke graph draaide deze enrollment?"-query
- Lopende enrollments hebben `version_at_start` → cron-engine leest graph van die specifieke version
- Oude versions blijven in DB voor traceability en rollback

## 6. Trigger & suggestion system

### Bron A: stage-change events

- **Implementatie**: Supabase database-trigger (PL/pgSQL) op `opportunities` en `leads`
- Bij UPDATE: detecteer overgang van `stage` (en `sub_status` voor leads)
- Zoek matching playbooks: `WHERE trigger_type='stage_change' AND trigger_config->>'to_stage' = NEW.stage`
- Per match: insert in `playbook_suggestions` met `source='stage_change'` en `source_context = old_state + new_state`
- **Latency**: instant, in dezelfde transactie als de update
- **Dedupe**: check op `playbook_suggestions WHERE playbook_id=X AND deal_id=Y AND status='pending'` → skip insert

### Bron B: signal-based (LinkedIn-posts)

- **Implementatie**: Vercel cron daily 08:00 NL-tijd → `api/signals-poll.js`
- Voor elke rij in `signal_subjects WHERE enabled=true`:
  - Unipile call: `GET /api/v1/users/{identifier}/posts?limit=10`
  - Voor company: `?is_company=true`
  - Per gevonden post: check dedupe `signals(source, source_id)`
  - Nieuw → insert in `signals` zonder score
- **Scoring fase** (in same cron, na poll):
  - Voor elke `signals WHERE relevance_score IS NULL LIMIT 50`
  - Claude API call (Haiku model) met prompt:
    ```
    LinkedIn post by {{name}}, {{role}} at {{company}}.
    Eclectik Insights is an advisory firm specializing in strategy and transformation.
    Rate outreach-relevance for them (0.0-1.0). Output JSON: {score, reason, topics}.

    Post content:
    {{post_content}}
    ```
  - Update `signals.relevance_score`, `scoring_reason`, `topic_tags`
- **Suggestie-creatie fase**:
  - Voor elke `signals WHERE relevance_score > 0.6 AND resolved_at IS NULL`
  - Insert in `playbook_suggestions` met `playbook_id = "Warm Outreach"`, source = signal-source
  - Update `signals.resolved_at = now()`

### Tracked subjects management

- **Default automatisch toegevoegd**:
  - Alle contacten gelinkt aan opportunities met stage in `(qualify, develop, proposal, active, sleeping)`
  - Alle companies van diezelfde opportunities
  - Markeer `auto_added=true`
- **Per-contact toggle**: 🔔-icoon op contact-detail-paneel → toggle `signal_subjects.enabled`
- **Bulk-management**: Playbooks Hub → Signals tab → Settings → list met checkboxes

### Suggestion lifecycle

```
pending ──[user clicks Start]──→ started (enrollment created)
   │
   ├──[user clicks Niet nu]──→ dismissed
   │
   └──[14 dagen geen actie]──→ expired (auto, cron)
```

- `dismissed` en `expired` blijven zichtbaar in archive-view voor traceability
- Bij `dismissed`: dezelfde signaal-bron triggert binnen 30 dagen géén nieuwe suggestie

### Quota & rate-limits

- **Unipile**: ~520 calls/dag verwacht (~130 companies + ~390 contacts) — ruim binnen 5000/dag standaard tier
- **Claude API**: ~20-50 nieuwe posts/dag × Haiku ≈ €0.05/dag = €1.50/mnd
- **Vercel cron**: 1 daily invocation, binnen Pro-tier
- **Supabase**: nieuwe tabellen verwacht <100MB/jaar bij huidige volumes

### Failure modes

| Scenario | Gedrag |
|---|---|
| Unipile 429 rate-limit | Poll pauzeert, retry volgende dag; geen retry-storm |
| Claude API down | Signal opgeslagen zonder score; volgende dag opnieuw scoren (cron picks up unscored) |
| Supabase write fail | Log naar Vercel + email naar Olivier; klein team merkt 't snel |
| Unipile auth expired | Specifieke account uit `signal_subjects` skippen, log warning, doorgaan met rest |

## 7. Drafts review flow

### Wanneer ontstaat een draft

- Wanneer execution-engine een `action_*_draft` node bereikt voor een enrollment
- Engine pauzeert op die node (`playbook_enrollments.status='awaiting_review'`)
- Insert in `playbook_drafts` met status `pending`

### De Drafts-tab in Playbooks Hub

**Layout**: twee panelen naast elkaar.

**Links — lijst**:
- Compacte rijen: kanaal-icon · contact-naam · playbook + step · "4u geleden"
- Sorteer op leeftijd
- Filter op kanaal/playbook/contact
- Stale-warning (oranje) als > 5 dagen oud (context kan verlopen)

**Rechts — preview**:
- Volledige inhoud (subject + body voor email, body voor LI/WA/IG)
- Inline editable (subject én body) — auto-save naar `playbook_drafts.body` na 1s typing-pause
- Action-buttons: **[▶ Verzend]** · **[Skip step]** · **[Snooze 24u]** · **[Delete enrollment]**

### Per-kanaal verzending bij [Verzend]

| Channel | Send via | Tracking |
|---|---|---|
| Email | MS Graph `POST /me/sendMail` als account-eigenaar (via send-as) | Graph webhook detecteert replies via `conversationId` + `internetMessageId` |
| LinkedIn | Unipile `POST /chats` of `POST /chats/{id}/messages` | Bestaande Unipile-webhook in `api/unipile-webhook.js` uitgebreid |
| WhatsApp | Unipile (zelfde patroon als LinkedIn) | Unipile-webhook |
| Instagram | Unipile (zelfde patroon) | Unipile-webhook |

### Edit-before-send

- `playbook_drafts.body` wordt overschreven bij elke auto-save
- `playbook_drafts.body_original` blijft bewaard
- `playbook_drafts.edited_at` getrackt
- Bij analyse: vergelijken hoe vaak templates handmatig worden aangepast → signaal om template te verbeteren

### Skip step

- `playbook_drafts.status = 'skipped'`
- Enrollment marcheert naar volgende node alsof draft "verstuurd" is
- Voor Branch-node "did contact reply?" telt skip als "geen antwoord"
- Use-case: draft is niet passend voor déze contact, maar playbook moet door

### Reply-detection (voor Branch-condities)

- MS Graph webhook on inbound mail (nieuwe `api/graph-webhook.js`)
  - Match inbound message naar `playbook_drafts WHERE external_message_id = <In-Reply-To header>`
  - Update `playbook_enrollments.replied_at = now()`
- Unipile-webhook uitgebreid voor LinkedIn/WA/IG inbound
  - Match contact_id naar enrollment, update `replied_at`
- Bij volgende cron-tick verlaten `Wait-until/or` en `Branch`-nodes deze enrollment naar het ja-pad

### Notificatie

- V1: hub-tab badge counter (`▶ 3` in topbar)
- Geen email/system-notifications

### Cleanup-policy

- Sent drafts: 90 dagen in Completed-tab, daarna archive (verplaatst, niet gedeletet)
- Skipped/expired drafts: 30 dagen
- Bulk-actions: select-all + [Skip all] (handig na vakantie)

## 8. Sleeping Reactivation playbook (geseed)

### Trigger

`stage_change → sleeping` (opportunity wordt `status='Won' + stage='past'`)

### Graph-structuur (~15 nodes: 1 trigger + 4 waits + 2 wait-ors + 2 emails + 1 linkedin + 2 tasks + 2 branches + 1 shared end-node)

```
[Stage → sleeping]
        ↓
   [Wait 90d]
        ↓
[Email-draft: 3m check-in]
        ↓
[Internal task: volg op binnen 5d]    ← assigned to account-eigenaar
        ↓
[Wait-or: 5d OR reply received]
        ↓
[Branch: had reply?]
   ├── ja → [End: mark complete]
   └── nee ↓
   [Wait 85d]                            (totaal 180d)
        ↓
[Email-draft: 6m sector-update]
        ↓
[Wait-or: 5d OR reply]
        ↓
[Branch: had reply?]
   ├── ja → [End]
   └── nee ↓
   [Wait 185d]                           (totaal 365d)
        ↓
[LinkedIn-draft: 12m personal touch]
        ↓
[Wait 5d]
        ↓
[Internal task: beslis archive of revive]
        ↓
[End]
```

### Templates (merge-fields tussen `{{}}`)

#### Step 2 — 3-maands check-in (email)

```
Subject: {{first_name}}, hoe staat het nu bij {{company}}?

Hi {{first_name}},

Het is alweer drie maanden sinds we het {{project_name}}-traject afrondden.
Hoe staat het bij {{company}} sindsdien — is het in de praktijk gevallen
zoals we het verwachtten?

We zijn de afgelopen periode bij een paar vergelijkbare bedrijven aan tafel
geweest en zien interessante patronen ontstaan rond {{sector_topic}}. Als
je nieuwsgierig bent deel ik graag wat we daar leerden.

Geen haast, gewoon benieuwd hoe het loopt.

Groet,
{{sender_first_name}}
```

#### Step 7 — 6-maands sector-update (email)

```
Subject: Wat we zien gebeuren rond {{sector_topic}}

Hi {{first_name}},

Een halfjaar terug rondden we het {{project_name}} af. Sindsdien hebben we
bij 3-4 andere bedrijven gewerkt aan vergelijkbare vragen, en er tekenen
zich een paar interessante patronen af:

- [insight 1 — handmatig in te vullen door eigenaar bij review]
- [insight 2]
- [insight 3]

Mocht je daar over willen sparren — ik ben benieuwd hoe jullie er nu naar
kijken. 30 minuten koffie?

Groet,
{{sender_first_name}}
```

*Bewuste keuze: placeholders `[insight 1-3]` zodat account-eigenaar zelf de
meest actuele insights invult. Voorkomt generieke "value emails" die niemand
opent.*

#### Step 10 — 12-maands LinkedIn-touch

```
Hi {{first_name}}, je was vorig jaar één van de mensen die ik
het leukst vond om mee te werken aan {{project_name}}.
Zomaar even hallo zeggen. Hoop dat het goed gaat.
```

*Kort, persoonlijk, geen pitch. LinkedIn-stijl.*

### Beschikbare merge-fields

| Field | Bron |
|---|---|
| `{{first_name}}` | `contacts.first_name` |
| `{{company}}` | `companies.name` via deal-link |
| `{{project_name}}` | `opportunities.name` |
| `{{sector_topic}}` | `companies.industry`, of vrij invulbaar per playbook-instance |
| `{{sender_first_name}}` | account-eigenaar (MVG/OA/YK) |
| `{{deal_value}}` | `opportunities.value` (voor branch-condities, niet email-body) |
| `{{months_since_sleeping}}` | berekend |
| `{{signal_context}}` | bij signal-getriggerde playbook: post-tekst |

### Edge cases

- **Dedupe**: als contact al een `active` enrollment in deze playbook heeft, blokkeert nieuwe suggestie. Voorkomt dubbele 3-maands-mails bij 3 sleeping projecten met dezelfde Sandra K als contact.
- **Account-eigenaar-bepaling**: `opportunities.owner_name` → `ownerIdFromName` (bestaande logic in `adapters.js`) → MVG/OA/YK
- **Fallback bij missing owner**: → Olivier (admin), met log-entry "fallback-owner used"

## 9. Migratie & coexistentie met bestaande code

### Bestaand systeem (uitkomst eerdere research)

- 4 tabellen, 3 frontend files, 1 backend file
- 4 weken oud, twee commits, niet actief gebruikt → laag risico voor live data
- Bestaande Unipile-integratie blijft hergebruikt (LinkedIn-send, en nu ook posts-poll)

### Schema-migratie (alleen pseudo — runnable script komt in implementation-plan)

```
1. CREATE TABLE playbook_nodes (...);
2. CREATE TABLE playbook_edges (...);
3. CREATE TABLE signals (...);
4. CREATE TABLE signal_subjects (...);
5. CREATE TABLE playbook_suggestions (...);
6. CREATE TABLE playbook_drafts (...);

7. ALTER TABLE playbooks
     ADD COLUMN trigger_type text,
     ADD COLUMN trigger_config jsonb DEFAULT '{}',
     ADD COLUMN version int DEFAULT 1;

8. ALTER TABLE playbook_enrollments
     ADD COLUMN current_node_id uuid REFERENCES playbook_nodes(id),
     ADD COLUMN version_at_start int,
     ADD COLUMN replied_at timestamptz,
     ADD COLUMN next_action_at timestamptz;

9. ALTER TABLE playbook_executions RENAME COLUMN step_id TO node_id;

10. -- DO-block: converteer bestaande playbook_steps → playbook_nodes + linear edges
    -- (DO-block dat voor elke playbook playbook_steps → playbook_nodes + lineaire playbook_edges converteert; alleen runnable NA stap 1-9)

11. -- (24u na stable run) DROP TABLE playbook_steps;
    -- ALTER TABLE playbook_enrollments DROP COLUMN current_step;
```

**Belangrijk**: dit pseudo-script is illustratief. De runnable, idempotente,
volledig getypeerde migratie wordt opgesteld in het implementation-plan.

### Frontend-migratie

| Bestaand bestand | Aanpak |
|---|---|
| `PlaybooksList.jsx` | Wordt `PlaybooksHub.jsx` (nieuwe naam, tabs erbij) |
| `PlaybookDetail.jsx` | Wordt `PlaybookFlowBuilder.jsx` — volledige rewrite |
| `playbook-enroll-modal.jsx` | Aangepast: multi-contact-select, filter playbooks op `trigger_type='manual'` |
| `ContactDetail.jsx` "Enroll in playbook"-knop | Blijft, gebruikt herontworpen modal |
| `BDApp.jsx` `view === 'playbooks'` routing | Blijft, route naar `PlaybooksHub` |

### Backend-migratie

| Bestaand bestand | Aanpak |
|---|---|
| `api/playbook-execute.js` | Volledig herschreven: graph-traversal i.p.v. step-iteratie |
| `lib/unipile.js` (helpers) | Hergebruikt + uitgebreid met `listUserPosts` en `listCompanyPosts` |

### Deploy-volgorde

1. **Backup**: handmatig in Supabase (Settings → Database → Backups → create now)
2. **Branch-deploy naar Vercel preview-URL** voor smoke-test
3. **SQL migratie draaien** in Supabase SQL Editor (Olivier handmatig)
4. **Merge naar main** → productie-deploy
5. **Hard refresh + smoke-test** (open Playbooks Hub, klik door tabs)
6. **24u stabiel?** → drop `playbook_steps`, drop `playbook_enrollments.current_step`

### Rollback-plan

- **Vercel**: 1-klik revert naar vorige deployment
- **Supabase**: nieuwe tabellen droppen, nieuwe kolommen droppen (data is additief, intact)
- **Worst case**: restore vanuit Supabase backup

### Test-omgeving

Er is geen aparte staging-Supabase. Twee opties tijdens implementatie:
1. Vercel branch-build met tijdelijke `v2_` prefix in tabelnamen → end-to-end test → merge daarna
2. Productie-risico accepteren (klein team, late-avond deploy, makkelijk rollback)

Voorkeur: optie 1 voor de migratie-fase, optie 2 voor incrementele wijzigingen daarna.

## 10. Test-strategie

Geen automated test-suite in de codebase — werkstijl is "verifieer in browser na elke stap".

### Manuele verificatie per ontwikkelfase

- **Builder UX**: nieuwe playbook aanmaken → 5 verschillende node-types droppen → connecten → property-panels invullen → save → reopen → check of structuur exact terug-laadt
- **Validatie**: bewust orphan node achterlaten → save → check of error verschijnt en publish geblokkeerd is
- **Versioning**: publish v1 → enrol test-contact → edit playbook → publish v2 → check dat v1-enrollment door blijft draaien op oude structuur

### Test-run mode (in builder)

- Knop in toolbar genereert fake enrollment voor gekozen test-contact
- Voert hele graph door zonder echt te verzenden
- Output: log per node ("step 3: zou email-draft genereren met subject X")
- Onmisbaar voor valideren van conditionele branches

### Migratie-verificatie

```sql
-- count check vóór en na
SELECT COUNT(*) AS old_steps FROM playbook_steps;
SELECT COUNT(*) AS new_nodes FROM playbook_nodes;

-- enrollment check
SELECT id, current_step, current_node_id
  FROM playbook_enrollments WHERE status='active';
-- elke active enrollment moet current_node_id gevuld hebben
```

### Cron-handmatige trigger

- Vercel cron-endpoint krijgt `?force=true` query param (auth-protected via service-key)
- Snel valideren of Unipile-calls werken zonder 24u te wachten

### End-to-end smoke-test (na deploy)

1. Maak test-opportunity, owner = Olivier
2. Zet stage `active` → `sleeping`
3. Check: verschijnt suggestie in topbar-badge binnen 1 minuut?
4. Klik start → kies test-contact (jezelf, andere email-adres)
5. Manueel cron triggeren (overbruggen 90d-wait via DB-edit op `next_action_at`)
6. Check: verschijnt draft in Hub → Drafts-tab?
7. Klik verzend → check: email landt echt in inbox?

### Optionele automated test

- Eén Vitest-spec voor `lib/playbook-graph-traversal.js` (pure executie-logica, geen DB)
- Input: graph + enrollment-state. Output: next-node-id + side-effects-array
- Eenmalig schrijven, vangt regressies bij toekomstige uitbreidingen
- Enige plek waar bug-druk hoog genoeg is voor test-investering

## 11. Werk-breakdown

| Week | Focus | Deliverable end of week |
|---|---|---|
| 1 | Datamodel + migratie + builder skeleton | Nieuwe tabellen draaien in dev. React Flow canvas rendert. Drag-from-palette werkt. |
| 2 | Node configuratie + property-panel + validatie + versioning | Volledige playbook te bouwen, valideren, publishen. Test-run mode werkt. |
| 3 | Execution engine + drafts UI + per-channel send-flows | Enrollments lopen door graph. Drafts verschijnen. Send via Graph + Unipile werkt. |
| 4 | Signals (Unipile poll + Claude scoring) + suggesties + topbar/card-pill + sleeping-reactivation seed | Stage → sleeping resulteert in suggestie binnen 60s. Signaal-cron levert relevant signal → suggestie. Sleeping Reactivation geseed in productie. |
| 5 | Buffer | Edge-case fixes, polish, real-world testing |

## 12. Open vragen & risico's

| Vraag/Risico | Impact | Mitigatie |
|---|---|---|
| **Unipile LinkedIn-posts ondersteuning op huidige tier** | Hoog — als ontbreekt, valt halve signal-feature weg | Verifiëren in week 1 vóór signal-werk begint. Als ontbreekt: V1 alleen company-posts via news-API alternative (NewsAPI free tier) |
| **MS Graph webhook setup vereist Azure-config** | Medium — reply-detection per email is afhankelijk hiervan | Pre-werk in week 3 starten, fallback: poll-based reply-detection (elke 4u inbox checken) |
| **React Flow leercurve voor builder** | Medium — verwachte ramp-up 2-3 dagen | Library is goed gedocumenteerd; bestaande projecten als referentie |
| **AI-scoring kost-controle** | Laag — verwacht <€2/mnd | Hard quota inbouwen (max 100 scoring-calls/dag); rate-limit-fail = stop, niet retry-storm |
| **Branching-complexiteit voor end-users** | Medium — Olivier/Marco/Yarmilla moeten leren denken in graphs | Documenteren via voorbeelden, video-walkthrough, Sleeping Reactivation als blueprint |
| **5 weken realistisch?** | Hoog — schatting voor 1 persoon, gedeeltelijk full-time | Bij overschrijding > 1 week → scope-cut: signal-system naar V1.5, eerst alleen stage-change-trigger in V1 |
| **Bestaande playbook-data conversie** | Laag — niet actief gebruikt | Backup vóór migratie; conversie-script idempotent maken |

## 13. Beslissingen-log (uit brainstorm)

Voor toekomstige referentie — welke trade-offs zijn gemaakt en waarom:

| Onderwerp | Keuze | Alternatieven overwogen |
|---|---|---|
| Type playbook | Procesgids per scenario (workflow met branching) | Stage-checklists; Discovery-toolkit; Outreach-cadence only |
| Trigger-model | Auto-suggest + handmatige confirm | Volledig automatisch; volledig handmatig |
| Step-acties | Hybrid: externe drafts, interne automatisch | Pure guidance; volledig automatisch; volledig drafts |
| Eerste scenario | Sleeping Reactivation | Won → Onboarding; Nieuwe lead intake |
| Enrollment-niveau | Per contact (handmatige selectie) | Per deal; per account; alle contacts auto |
| Builder | Visueel + branching (React Flow) | Geen builder (hard-coded); linear-only builder |
| Aanpak | V1 alles tegelijk (framework + reactivation + signals) | Gefaseerd; alleen reactivation in V1 |
| Layout builder | Verticaal (n8n / Zapier-stijl) | Horizontaal (HubSpot / Salesforce); freeform |
| Suggestion-surface | Combo D: card-pill + topbar-badge | Card-only; topbar-only; workspace-widget |
| Drafts-surface | Eigen tab in Playbooks-hub | In Comms-inbox; in Tasks-view; op contact-detail |
| Node-catalogus | 14 nodes (4T+6A+4L) + 5 V2 | 12 nodes (kleiner V1); 17+ nodes (alles in V1) |
| Externe news-API | Geschrapt uit V1 — LinkedIn company-posts dekt | NewsAPI in V1; GDELT; Bing News |

## 14. Bronnen & referenties

- **Onderzoek**: HubSpot Playbooks docs, Salesforce Sales Plays, Bain HBR "B2B sales playbook", Gong Sales Cadence, Outreach.io best practices, Recapped / Nektar / Prospeo blogs on adoption failure-patterns
- **Qualification framework**: CHAMP (Challenges-Authority-Money-Prioritization) voor advisory; MEDDIC voor deals >€50k met >3 stakeholders
- **Tech**: [React Flow / xyflow](https://reactflow.dev) — MIT, gebruikt door n8n/Linear/ClickUp
- **Unipile API**: [LinkedIn posts endpoint](https://developer.unipile.com/llms.txt) — `GET /api/v1/users/{identifier}/posts`
- **Bestaande code**: `src/components/playbooks/`, `api/playbook-execute.js` (4 weken oud, twee commits, niet actief gebruikt)

---

## Volgende stap

Dit design-document is de basis voor het **implementation-plan** dat in de
volgende sessie wordt opgesteld via de `writing-plans`-skill. Het plan
detailleert per week welke files worden aangemaakt/aangepast, welke
SQL-migratie volgordelijk wordt uitgevoerd, en welke verification-stappen
na elke deelmijlpaal.

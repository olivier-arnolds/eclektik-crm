// ─────────────────────────────────────────────────────────────────────────
// Changelog — single source of truth for the in-app "Log" tab.
//
// HOW THIS WORKS
//   • Every meaningful change to the app gets ONE entry here, newest first.
//   • Each entry maps 1:1 to a git tag (`gitTag`), which is how you roll back.
//   • The Log tab (src/bd/log-view.jsx) renders this array.
//
// HOW TO ADD AN ENTRY (do this with each change before committing)
//   1. Bump `version` using semver: patch = fix, minor = feature, major = big.
//   2. Set `date` to the real ISO timestamp (UTC) — run `date -u +%Y-%m-%dT%H:%M:%SZ`.
//   3. Fill `title`, `summary`, the `changes[]` detail, and `files[]` touched.
//   4. Keep `gitTag` = `v<version>`; create that tag on the commit (see README/Log).
//   5. Also bump "version" in package.json and the VERSION file to match.
//
// HOW TO ROLL BACK (shown in the Log tab too)
//   • Inspect a version:     git checkout v1.1.0
//   • Undo a version safely:  git revert <commit-of-that-version>
//   • Return to latest:       git checkout main
// ─────────────────────────────────────────────────────────────────────────

export const CURRENT_VERSION = '1.10.1';

export const CHANGELOG = [
  {
    version: '1.10.1',
    date: '2026-06-05T15:45:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'War room: delivery-focused grid with split people + details',
    summary:
      'Reworked the War room to focus on running Glint delivery. Removed the ' +
      'commercial-pipeline section and the Service and Health columns. People are ' +
      'now split into their own columns — CS · PS · Support (Eclectik owners + ' +
      'hours from the sheet) — and the operational detail (survey-live dates, ' +
      'dependencies) shows in a Details column. Columns: Client · project · CS · ' +
      'PS · Support · Milestone · Details · Status. Rows still order by urgency ' +
      '(Not started first, then soonest milestone).',
    changes: [
      'Removed the Commercial pipeline table (and deals dependency) from lane-warroom.jsx.',
      'Split "Who\'s on it" into CS / PS / Support columns; removed Service and Health columns.',
      'Added a Details column showing the project notes (e.g. survey-live / close dates).',
      'Kept urgency ordering: Not started pinned, then soonest next-milestone date.',
    ],
    files: ['src/bd/lane-warroom.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json'],
    gitTag: 'v1.10.1',
  },
  {
    version: '1.10.0',
    date: '2026-06-05T15:20:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'War room — pipeline + running Glint projects on one screen',
    summary:
      'New "War room" tab: the commercial pipeline (from the CRM) and the running ' +
      'Glint delivery projects on one grid. Delivery rows are synced from ' +
      'Yarmilla\'s Master Project Overview into glint_delivery (CS/PS owner + hours, ' +
      'status, priority, milestone dates, notes, follow-up). Health is auto-derived ' +
      '(status + priority + milestone proximity + follow-up/blocked signals) and ' +
      'rows sort by urgency. Header shows the source file, when the sheet was last ' +
      'edited, when we last synced, and an Update button. Delivery rows link to the ' +
      'Account 360 by company match.',
    changes: [
      'New War-room tab (src/bd/lane-warroom.jsx) wired into BDApp NAV_VIEWS + Topbar; reads glint_delivery + open pipeline deals.',
      'New table public.glint_delivery (schema_glint_delivery.sql) + one-time seed of current rows (seed_glint_delivery.sql). RUN BOTH in Supabase.',
      'New /api/glint-sync.js: reads the Master Project Overview workbook via Microsoft Graph (app-only) and upserts rows; the Update button triggers it. GATED on Graph Files.Read.All consent + GRAPH_TENANT_ID/CLIENT_ID/CLIENT_SECRET env — returns 503 until configured, seeded data shows meanwhile.',
      'Auto-health + soonest-of-three milestone (survey / insight-review / delivery-end) logic.',
    ],
    files: [
      'src/bd/lane-warroom.jsx', 'src/bd/BDApp.jsx', 'src/bd/topbar.jsx',
      'api/glint-sync.js', 'schema_glint_delivery.sql', 'seed_glint_delivery.sql',
      'src/bd/changelog.js', 'VERSION', 'package.json',
    ],
    gitTag: 'v1.10.0',
  },
  {
    version: '1.9.0',
    date: '2026-06-05T14:45:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Funnel: moving a deal to active/onboarding records it as Won',
    summary:
      'Dragging a deal to active or onboarding (an existing-customer / new-project ' +
      'win) now also marks it status=Won with a close (won) date of today, instead ' +
      'of leaving status empty. This makes new-project wins appear in the quarterly ' +
      'Won + new/recurring reporting — previously they fell into an "unstatused-' +
      'active" bucket excluded from the quarter breakdown, so a win like Alex Lee\'s ' +
      'July 2026 project never scored. The deal still sits in the active/onboarding ' +
      'funnel column (the funnel keys off stage, not status); the close date is ' +
      'editable afterwards if the win belongs in a different quarter.',
    changes: [
      'stageUpdates() in adapters.js: for active/onboarding, set status=Won + close_date/actual_close_date=today (opportunities only) instead of clearing status.',
      'No funnel change — display column still derives from stage, so won-active deals stay in the active column (matches existing active+Won deals).',
      'Data: existing Alex Lee 2026 deal patched separately via SQL (db_revert_alexlee_active_won_2026-06-05.sql for rollback).',
    ],
    files: [
      'src/bd/adapters.js',
      'src/bd/changelog.js', 'VERSION', 'package.json',
    ],
    gitTag: 'v1.9.0',
  },
  {
    version: '1.8.1',
    date: '2026-06-04T18:07:19Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Tasks: make "With" editable in the inline task panel too',
    summary:
      'v1.8.0 added the "With" field to the task modal, but the inline task panel ' +
      '(opened when you click a task in the all-tasks list or calendar) had no ' +
      '"With" selector. Added an editable single-select "With" there as well, next ' +
      'to "For", so the field can be set wherever a task opens.',
    changes: [
      'inline-details.jsx (InlineTaskDetail): added the eclectik_team roster fetch and an editable "With" single-select next to "For"; widened the field grid to 5 columns.',
    ],
    files: [
      'src/bd/inline-details.jsx',
      'src/bd/changelog.js', 'VERSION', 'package.json',
    ],
    gitTag: 'v1.8.1',
  },
  {
    version: '1.8.0',
    date: '2026-06-04T18:07:19Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Tasks: "With" field — an Eclectik member on the task',
    summary:
      'Tasks now have a "With" field: a single Eclectik team member who joins or ' +
      'collaborates on the task, separate from the owner (the "For" person). The ' +
      'picker lists contacts tagged as Eclectik team (account_links link_type=' +
      'eclectik_team). In the all-tasks list the "With" column sits next to "For" ' +
      'and is sortable. Stored as a contact reference so names stay consistent.',
    changes: [
      'Added with_contact_id column to tasks (FK to contacts) — see schema_tasks_with_member.sql (run in Supabase).',
      'task-detail-modal.jsx: new single-select "With (Eclectik)" dropdown, roster = distinct eclectik_team contacts; writes with_contact_id.',
      'tasks-view.jsx: new sortable "With" column placed right after "For" (owner), resolving with_contact_id to the contact name.',
      'Threaded withContactId through both task adapters (usePipelineData + adapters.js) for app-wide use.',
    ],
    files: [
      'schema_tasks_with_member.sql',
      'src/bd/task-detail-modal.jsx',
      'src/bd/tasks-view.jsx',
      'src/hooks/usePipelineData.js',
      'src/bd/adapters.js',
      'src/bd/changelog.js', 'VERSION', 'package.json',
    ],
    gitTag: 'v1.8.0',
  },
  {
    version: '1.7.0',
    date: '2026-06-04T18:07:19Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Account 360 — AI Summary brief + internal Teams channel stream',
    summary:
      'New "Summary" section at the top of every Account 360, above Meetings: ' +
      'stat pills (last touch, interaction count, team-channel-linked, items ' +
      'needing attention), an AI-written brief of what has happened across every ' +
      'channel, and a "Needs attention" list. Merges meetings, email, LinkedIn, ' +
      'notes, tasks and deal-stage changes, plus — per client — a linked internal ' +
      'Teams channel (IMC Trading seeded). Generated on demand via the new ' +
      '/api/account-summary endpoint (Claude Sonnet), optional caching to account_briefs.',
    changes: [
      'Collapsible "Summary" Section above Meetings in AccountDetail with the AccountBrief component (stat pills, brief paragraphs, Needs-attention list, Generate/Refresh).',
      'New /api/account-summary.js endpoint: assembles the normalized interaction list and returns a structured JSON brief via Claude Sonnet; best-effort persistence to an optional account_briefs table (ephemeral fallback).',
      'Per-client internal Teams channel via ACCOUNT_TEAMS_CHANNELS (seeded with IMC Trading) using getChannelMessages(); guarded — silently skipped until Graph channel scopes are admin-consented, so login is unaffected.',
      'Added schema_account_briefs.sql (optional caching table).',
    ],
    files: [
      'api/account-summary.js', 'schema_account_briefs.sql',
      'src/bd/lane-accounts.jsx', 'src/bd/changelog.js', 'VERSION', 'package.json',
    ],
    gitTag: 'v1.7.0',
  },
  {
    version: '1.6.2',
    date: '2026-06-03T18:00:00Z',
    author: 'Olivier Arnolds (via Claude / Cowork)',
    type: 'feature',
    title: 'Marketing-tab UX: sticky panels, opt-out toggle, + tag/status',
    summary:
      'Marketing-tab krijgt meerdere kwaliteits-aanpassingen voor lange ' +
      'contact-lijsten en beter segmenteren. Sticky linker filter-panel + ' +
      'sticky top-toolbar blijven in beeld bij scrollen. Per contact een ' +
      'klik-toggle "wel mailen / niet mailen" (groen envelope / rood circled-' +
      'slash), persistent in DB. Plus + knoppen om direct nieuwe tags of ' +
      'account-statussen toe te voegen vanuit de filter-sidebar.',
    changes: [
      'Sticky filter-sidebar (TAGS / DEALS / ACCOUNT STATUS / STATUS) blijft in beeld tijdens scroll. maxHeight 100vh-80px met eigen overflow-y voor lange filter-lijsten.',
      'Sticky top-toolbar (search-input + select-all + bulk-acties) blijft bovenaan tijdens scrollen door contact-lijst.',
      'Per-contact opt-out toggle: groen envelope (✉) = wel mailen, rood circled-slash (⊘) = niet mailen. Tekst-Unicode i.p.v. emoji zodat CSS-color werkt. Optimistic local-state voor directe visuele feedback; async DB-write met rollback bij error.',
      'Visuele indicator: email-tekst strikethrough + opacity 0.5 wanneer opt-out actief.',
      'Send-campaign filtert do_not_email=true contacten automatisch uit recipients. Confirm-dialog ("X contacten op opt-out — door met overige Y?") als er geskipped worden.',
      '+ knop naast TAGS-header: inline input voor nieuwe tag-naam, persist in tags-tabel met random pastel-kleur.',
      '+ knop naast ACCOUNT STATUS-header: inline input voor nieuwe status, lokaal opgeslagen in localStorage (marketing_extra_statuses) zodat filter-optie zichtbaar wordt. Persistent in DB pas wanneer toegewezen aan een account via account-detail.',
      'Vereist eenmalige SQL: ALTER TABLE contacts ADD COLUMN do_not_email boolean NOT NULL DEFAULT false (door Olivier handmatig).',
    ],
    files: [
      'src/bd/marketing-contacts.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.6.2',
  },
  {
    version: '1.6.1',
    date: '2026-06-03T16:00:00Z',
    author: 'Olivier Arnolds (via Claude / Cowork)',
    type: 'fix',
    title: 'Playbooks v2 — last-mile fixes voor signals + suggesties + cron',
    summary:
      'Zes opvolg-fixes na productie-deploy van 1.6.0. Volledige eind-tot-eind ' +
      'loop bewezen: signaal-poll detecteert LinkedIn-posts, Claude scoort, ' +
      'auto-suggesties verschijnen, gebruiker start, cron genereert tasks. ' +
      'Plus seed van een Warm Company Outreach playbook (internal task ' +
      'voor account-eigenaar bij score >= 0.6 op company-posts).',
    changes: [
      'Unipile 422 fix: signals-poll resolvet eerst de LinkedIn-slug naar internal provider_id (persons) of numeric company-id (via /linkedin/company/{slug}) voordat /users/{id}/posts wordt aangeroepen. Volgt zelfde patroon als api/unipile.js get-posts.',
      'Relative timestamp parsing: Unipile levert posted_at als "5h"/"1d"/"1w"/"1mo" strings. parsePostedAt converteert naar absolute ISO-strings (anders weigert Postgres timestamptz).',
      'Trigger-type prefix mismatch: signalSuggestionRules matchte signal.source naar "trigger_<source>" maar playbooks.trigger_type is unprefixed. Convention nu expliciet: playbook_nodes.node_type prefixed, playbooks.trigger_type unprefixed.',
      'Cron FK-join fix: playbook-execute.js JOIN op opportunities faalde omdat playbook_enrollments geen opportunity_id heeft. Vervangen door contacts(*, companies(*)) join + best-effort deal-lookup via company_id.',
      'SuggestionsTab FK-join fix: PostgREST kon opportunities-relatie niet auto-inferren via deal_id-kolom. Join verwijderd. Fallback-tekst toont nu signal_topics i.p.v. "Onbekend doelwit".',
      'playbook_enrollments.source_context kolom toegevoegd (was vergeten in Plan 1 schema) zodat suggestion-Start enrollment-creatie niet meer silently faalt.',
      'Warm Company Outreach playbook geseed: trigger_linkedin_company_post -> action_internal_task -> end. Genereert task "Reageer op company-nieuws: {{signal_context}}" voor account-eigenaar met due-date +3d.',
    ],
    files: [
      'api/signals-poll.js',
      'api/playbook-execute.js',
      'src/components/playbooks/lib/signalSuggestionRules.js',
      'src/components/playbooks/tabs/SuggestionsTab.jsx',
      'schema_playbooks_v2_warm_company_outreach_seed.sql (ad-hoc, niet in repo)',
      'ALTER playbook_enrollments ADD COLUMN source_context jsonb (ad-hoc, niet in repo)',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.6.1',
  },
  {
    version: '1.6.0',
    date: '2026-06-03T10:00:00Z',
    author: 'Olivier Arnolds (via Claude / Cowork)',
    type: 'feature',
    title: 'Playbooks v2 — visual workflow builder + execution engine + AI + signals',
    summary:
      'Compleet nieuwe Playbooks-feature: graph-gebaseerd ontwerp met drag-drop ' +
      'visuele builder (React Flow), conditional branching, AI-gegenereerde drafts ' +
      'via Claude Haiku, en automatische suggesties op basis van stage-changes en ' +
      'LinkedIn-post signalen. Oude lineaire playbook-systeem volledig vervangen. ' +
      'Nu beschikbaar via Playbooks-tab in topbar.',
    changes: [
      'Datamodel: 7 nieuwe tabellen (playbook_versions/nodes/edges, signals, signal_subjects, playbook_suggestions, playbook_drafts) + RLS-policies. Oude playbook_steps tabel gemigreerd naar nieuwe graph-structuur en gedropt na 24u stable.',
      'Visual builder (PlaybookFlowBuilder): React Flow canvas met drag-drop palette van 14 node-types (4 triggers, 6 actions, 4 logic), dynamic property panel per node-type, edge-creation + branch-labels, real-time validatie (6 regels), save-draft + publish-met-versionering (snapshots in playbook_versions).',
      'Execution engine (api/playbook-execute.js): graph-traversal cron die enrollments door playbook-graph laat lopen. Genereert drafts (email/LinkedIn/WhatsApp/Instagram), creëert internal tasks, update stages. Per draft-action: manual body OR AI-gegenereerde tekst via Claude Haiku met merge-fields ({{first_name}}, {{signal_context}}, etc.). System-prompt voorkomt em-dashes en andere AI-tells.',
      'Drafts hub (Playbooks → Drafts): two-pane preview + inline-edit + verzend via MS Graph (email) of Unipile (LinkedIn/WA/IG). Reply-detection voor LI/WA/IG via Unipile-webhook (markeert enrollment.replied_at).',
      'Test-run mode in builder: simulate playbook met test-contact, toont AI-output via /api/anthropic-generate endpoint.',
      'Signals (api/signals-poll.js): dagelijkse cron pollt Unipile voor LinkedIn-posts per signal_subject (auto-tracked: contacten + companies van active/sleeping deals). Two-step ID-resolution (slug → provider_id → posts). Claude Haiku scoort relevance 0-1 met JSON-output. Score > 0.6 → automatische suggestion.',
      'Suggesties UI: SuggestionsTab (filter pending/started/dismissed/expired + Start/Niet-nu acties), TopbarSuggestions badge met dropdown van top-5 (Supabase Realtime), pink card-pills op funnel-deal-cards, bell-icon (🔔) signal-follow toggle op contact panels.',
      'Stage-change suggesties: PL/pgSQL DB-trigger op opportunities.stage UPDATE → automatic playbook_suggestions insert voor matching playbooks. Instant (zelfde transactie).',
      'Warm Outreach seed-playbook: 3-node graph (trigger_linkedin_user_post → AI LinkedIn-draft → end) geseed via SQL, klaar voor signal-driven outreach.',
      'Content rules (CLAUDE.md §2b + system-prompt in cron): geen em-dashes, geen markdown-headers, geen bullet lists, geen filler-openingen in client-facing AI-gegenereerde tekst.',
      'Twee nieuwe Vercel cron-entries: signals-poll dagelijks 7u werkdagen, suggestions-expire weekly maandag 6u.',
    ],
    files: [
      'schema_playbooks_v2.sql',
      'schema_playbooks_v2_verify.sql',
      'schema_playbooks_v2_cleanup.sql',
      'schema_playbooks_v2_rollback.sql',
      'schema_playbooks_v2_stage_trigger.sql',
      'schema_playbooks_v2_signal_subjects_backfill.sql',
      'schema_playbooks_v2_warm_outreach_seed.sql',
      'api/playbook-execute.js',
      'api/signals-poll.js',
      'api/suggestions-expire.js',
      'api/anthropic-generate.js',
      'api/unipile-webhook.js',
      'src/components/playbooks/PlaybooksHub.jsx',
      'src/components/playbooks/PlaybookFlowBuilder.jsx',
      'src/components/playbooks/nodes/NodeTypes.js',
      'src/components/playbooks/nodes/NodeCard.jsx',
      'src/components/playbooks/panels/NodePalette.jsx',
      'src/components/playbooks/panels/PropertyPanel.jsx',
      'src/components/playbooks/panels/BuilderToolbar.jsx',
      'src/components/playbooks/builder/TestRunModal.jsx',
      'src/components/playbooks/tabs/DraftsTab.jsx',
      'src/components/playbooks/tabs/RunningTab.jsx',
      'src/components/playbooks/tabs/CompletedTab.jsx',
      'src/components/playbooks/tabs/SuggestionsTab.jsx',
      'src/components/playbooks/lib/playbookGraphIO.js',
      'src/components/playbooks/lib/playbookValidation.js',
      'src/components/playbooks/lib/playbookVersioning.js',
      'src/components/playbooks/lib/playbookGraphTraversal.js',
      'src/components/playbooks/lib/draftGeneration.js',
      'src/components/playbooks/lib/sendChannels.js',
      'src/components/playbooks/lib/signalScoring.js',
      'src/components/playbooks/lib/signalSuggestionRules.js',
      'src/bd/topbar-suggestions.jsx',
      'src/bd/signal-follow-toggle.jsx',
      'src/bd/topbar.jsx',
      'src/bd/lane-funnel.jsx',
      'src/bd/inline-details.jsx',
      'src/bd/BDApp.jsx',
      'src/bd/changelog.js',
      'CLAUDE.md',
      'vercel.json',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.6.0',
  },
  {
    version: '1.5.4',
    date: '2026-06-01T21:20:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Coverage matrix — Kate Feeney mapped to PSC',
    summary:
      'Kate Feeney (no role in the CRM, was showing under leadership/other) is a ' +
      'people scientist, grouped under PSC in the coverage matrix.',
    changes: [
      'Added "kate feeney": "PSC" to ROLE_OVERRIDE in src/bd/lane-reporting.jsx.',
    ],
    files: [
      'src/bd/lane-reporting.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.5.4',
  },
  {
    version: '1.5.3',
    date: '2026-06-01T21:05:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Reporting: only flag won deals with no revenue at all',
    summary:
      'The "won with no/zero actual revenue" data warning was misleading — it fired ' +
      'for deals that are won on an estimate (real revenue), e.g. Breitling and ' +
      'BioMarin. It now fires only when a won deal has no revenue at all (no actual ' +
      'AND no estimate), so estimate-based wins no longer raise a flag.',
    changes: [
      'Changed the warning rule in src/bd/lane-reporting.jsx from "actual_revenue is null/0" to "revenue (COALESCE actual, est, 0) = 0".',
      'Reworded the warning to "won deal(s) with no revenue at all (no actual or estimate)".',
      'Effect: Breitling (€14,700 est) and BioMarin (€33,250 est) no longer appear in the warnings panel.',
    ],
    files: [
      'src/bd/lane-reporting.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.5.3',
  },
  {
    version: '1.5.2',
    date: '2026-06-01T20:55:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'fix',
    title: 'Coverage matrix — authoritative team role mapping',
    summary:
      'The Reporting coverage matrix now uses an explicit role map for the Eclectik ' +
      'team instead of inferring purely from account_links. Eric Quintane and Manish ' +
      'Goel are now ROI (were "leadership/other"); everyone else is unchanged. The ROI ' +
      'group now appears in the column order (CSM → PSC → ROI → rest) and the legend.',
    changes: [
      'Added ROLE_OVERRIDE map (by name) in src/bd/lane-reporting.jsx; falls back to account_links.role for anyone not listed.',
      'Eric Quintane → ROI, Manish Goel → ROI. Angela/Ezra/Heidi/Ivan/Steph = CSM; Avneeta/Kirsty/Pablo/Paul = PSC; Simon/Yarmilla = leadership/other.',
      'ROI added to the matrix legend.',
    ],
    files: [
      'src/bd/lane-reporting.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.5.2',
  },
  {
    version: '1.5.1',
    date: '2026-06-01T20:40:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'data',
    title: 'CRM data-quality corrections surfaced by the Reporting tab',
    summary:
      'Cleaned up the data-quality flags the new Reporting tab exposed. Two ' +
      'in-delivery deals that were never marked Won are now Won; two prospects ' +
      'that had actually bought are now Customers; and a customer with no country ' +
      'was placed in the US. Applied live to the database (with a snapshot + revert ' +
      'script); no code logic changed.',
    changes: [
      'Breitling: active deal marked Won (€14,700 estimate).',
      'BioMarin Pharmaceutical Inc: active deal marked Won; the €0 actual was cleared so the €33,250 estimate counts; account reclassified Prospect → Customer.',
      'European Training Foundation (ETF) and PIMCO Prime Real Estate: reclassified Prospect → Customer (they carry won revenue). Microsoft Corp intentionally left as Partner.',
      'BMC Software: country set to US (was blank, previously defaulting to EMEA).',
      'Effect: won revenue €1,113,770 → €1,161,720, won deals 44 → 46, customers (excl. Adecco) 32 → 35. Breitling & BioMarin now appear under the (informational) "won on estimate, no actual booked" flag — actuals were deliberately not faked.',
      'Snapshots: public._dq_backup_opps_20260601 and public._dq_backup_companies_20260601.',
    ],
    files: [
      'db_revert_dataquality_2026-06-01.sql (new)',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    rollback: 'Data: run db_revert_dataquality_2026-06-01.sql in the Supabase SQL Editor (restores from the _dq_backup_*_20260601 snapshots). This was a DB-only change — git checkout does not undo it.',
    gitTag: 'v1.5.1',
  },
  {
    version: '1.5.0',
    date: '2026-06-01T20:10:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Reporting tab — BD revenue & pipeline dashboard',
    summary:
      'New Reporting tab (after Comms) that reads live from Supabase and derives ' +
      'every figure from queries at load time — no hardcoded numbers. Won revenue ' +
      'by quarter with target + linear trend, new vs recurring by line, win/loss by ' +
      'line, and an all-clients US/EMEA matrix. Clicking a client name opens that ' +
      "account's 360 in the right pane. Follows the app's light/dark theme.",
    changes: [
      'Added the "Reporting" view to NAV_VIEWS (after Comms) + a topbar nav button; registered in SCROLL_VIEWS.',
      'New src/bd/lane-reporting.jsx: fetches opportunities + companies via the existing supabase client and computes all metrics in one place (revenue = COALESCE(actual, est, 0); quarter = quarter of actual/expected close; Won/Lost/Open; weighted = Σ(est × probability); Customer excl. Adecco; region US vs EMEA; new vs recurring by close-date rank).',
      'KPI row (won revenue, win rate, open + weighted pipeline, active/dormant clients), data-quality warnings panel, and a methodology footer.',
      'Charts are hand-rolled inline SVG (no new dependency) and theme via CSS variables; trend line shows R² and the illustrative target-crossing quarter.',
      'All-clients table groups US/EMEA with per-quarter columns, subtotals and a grand total that reconciles to total won; client-name click calls the existing pickAccount() so the persistent right pane shows the Account 360.',
      'Client-coverage matrix: clients (rows) × Eclectik team members (columns, grouped CSM → PSC → ROI → leadership/other from account_links), a colored dot marks each covered client; client name opens the 360.',
      'Config toggles: count unstatused-active deals as won (off by default) and new-vs-recurring at relationship vs product-line level.',
      'Read-only feature — no database change, so no snapshot/revert required.',
    ],
    files: [
      'src/bd/lane-reporting.jsx (new)',
      'src/bd/BDApp.jsx',
      'src/bd/topbar.jsx',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.5.0',
  },
  {
    version: '1.4.1',
    date: '2026-06-01T20:05:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'chore',
    title: 'Add change & release procedure (PROCEDURE.md)',
    summary:
      'Documented the full workflow for this project: how to version a change, ' +
      'write a changelog entry, run the GitHub push, handle database changes safely, ' +
      'and roll back. Includes a reusable prompt for Cowork/Claude sessions.',
    changes: [
      'Added PROCEDURE.md at the repo root covering: the working model, semver rules (keep VERSION + package.json + changelog.js + git tag in sync), the changelog entry shape, a pre-push checklist, database-change rules (snapshot → apply → verify → revert script), the exact push command, git/macOS gotchas, and rollback.',
      'Included a copy-paste prompt to drive future change sessions.',
    ],
    files: [
      'PROCEDURE.md (new)',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    gitTag: 'v1.4.1',
  },
  {
    version: '1.4.0',
    date: '2026-06-01T17:40:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'Stage-driven win probability on the funnel',
    summary:
      'Each funnel stage now carries a fixed win probability. The app sets it ' +
      'automatically whenever a deal moves stage (including lead→opportunity ' +
      'promotion), and existing deals were backfilled to match. Percentages are ' +
      'configurable in one place (STAGE_PROBABILITY in src/bd/adapters.js).',
    changes: [
      'Probabilities: qualify 20% · develop 40% · proposal 60% · close 0% · onboarding 80% · active 100% · sleeping 100%.',
      'Added STAGE_PROBABILITY map (src/bd/adapters.js) as the single source of truth.',
      'Wired it into stageUpdates so every stage move (and the lead→opp promote path) writes the right probability automatically.',
      'Backfilled probability on all 52 leads and 122 opportunities to match their current stage (DATABASE change, already applied live).',
      'Snapshot taken first (public._probability_backup_20260601) for reversibility.',
    ],
    files: [
      'src/bd/adapters.js',
      'db_revert_probability_2026-06-01.sql (new)',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    rollback: 'Data: run db_revert_probability_2026-06-01.sql in the Supabase SQL Editor (restores from the _probability_backup_20260601 snapshot). Code: git checkout v1.4.0 (or revert) to stop auto-setting probability on stage moves.',
    gitTag: 'v1.4.0',
  },
  {
    version: '1.3.0',
    date: '2026-06-01T17:20:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'data',
    title: 'Owner field normalized to canonical full names (data migration)',
    summary:
      'Cleaned up the free-text `owner` field, which stored the same person under ' +
      'several spellings. Every owner in companies, contacts, leads, opportunities ' +
      'and tasks is now one of three canonical full names. This was a DATABASE change ' +
      '(already applied live) — to undo it, run the revert SQL, not git.',
    changes: [
      'Normalized owner to: Marco van Gelder / Olivier Arnolds / Yarmilla Koenders across companies, contacts, leads, opportunities, tasks.',
      'Collapsed spelling variants: "MVG"/"Marco" → Marco van Gelder; "Olivier" → Olivier Arnolds; "Yarmilla" → Yarmilla Koenders.',
      'Reassigned legacy Dynamics owners (Jonathan Khongwir — 54 opps + 63 contacts, Desiree Cisneros) to Marco van Gelder.',
      'Filled empty owners (3 companies, 10 contacts, 3 leads, 5 opps, 9 tasks) with Marco van Gelder.',
      'Left comms.owner untouched — it stores the external counterparty name, not a team owner.',
      'Took a full snapshot first (public._owner_backup_20260601) for reversibility.',
    ],
    files: [
      'db_revert_owner_normalization_2026-06-01.sql (new)',
      'src/bd/changelog.js',
      'VERSION',
      'package.json',
    ],
    rollback: 'Run db_revert_owner_normalization_2026-06-01.sql in the Supabase SQL Editor (restores from the _owner_backup_20260601 snapshot). git checkout will NOT undo a database change.',
    gitTag: 'v1.3.0',
  },
  {
    version: '1.2.0',
    date: '2026-06-01T16:56:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'refactor',
    title: 'New layout: persistent Account 360 on the right, single view-switcher on the left',
    summary:
      'Reworked the app shell into a consistent two-pane model. The Account 360 ' +
      '"database" pane now stays on the right in every view, and the left pane ' +
      'switches between Funnel, Meetings, Tasks, Comms, Marketing, Playbooks and Admin. ' +
      'Also removed the "BabyDee 1.0" badge from the top-left. No Supabase data touched.',
    changes: [
      'Removed the "BabyDee 1.0" badge next to the Eclectik BD wordmark (top-left).',
      'Top nav is now a single flat view-switcher: Funnel · Meetings · Tasks · Comms · Marketing · Playbooks · Admin (+ Log). Replaced the old Workspace/Funnel split that toggled the left lane.',
      'Account 360 is now rendered as a persistent right-hand pane across ALL views (previously Marketing, Playbooks and Admin took the full width and hid it).',
      'Each view now occupies the left pane: Funnel (pipeline), Meetings (calendar/agenda), Tasks, Comms (email/Teams/LinkedIn), Marketing, Playbooks, Admin, Log.',
      'Collapsed the duplicated per-view render blocks in BDApp.jsx into one unified shell (single Topbar / Statusbar / modal set).',
      'Repurposed the lane "expand" toggle: expanding the left pane now hides the 360 for full-width focus (Funnel, Meetings, Tasks).',
      'Added migration for the old persisted "workspace" view so existing users land on Meetings (or Funnel) instead of a blank screen.',
    ],
    files: [
      'src/bd/BDApp.jsx',
      'src/bd/topbar.jsx',
      'VERSION',
      'package.json',
      'src/bd/changelog.js',
    ],
    gitTag: 'v1.2.0',
  },
  {
    version: '1.1.0',
    date: '2026-06-01T16:43:00Z',
    author: 'Marco van Gelder (via Claude / Cowork)',
    type: 'feature',
    title: 'In-app Log / version-history tab + project metadata cleanup',
    summary:
      'Added a Log tab so the team can see, in the app, exactly what changed and when — ' +
      'with date-time stamps, per-version detail, and git-based rollback instructions. ' +
      'Also corrected stale project metadata. No Supabase data was touched.',
    changes: [
      'New "Log" tab in the top navigation (between Marketing and Admin).',
      'Added src/bd/changelog.js as the single source of truth for version history.',
      'Added src/bd/log-view.jsx — renders the changelog as a timeline (newest first) with version badge, UTC + local date-time stamp, author, detailed change list, files touched, and the exact rollback command per version.',
      'Added a "history" icon to the shared icon set (src/bd/atoms.jsx).',
      'Wired the Log view into BDApp.jsx (view === "log") and the Topbar nav button.',
      'package.json: removed "type": "commonjs" (this is an ESM Vite app) and the stray "main": "index.js"; bumped version 1.0.0 → 1.1.0 to match this entry.',
      'Added a VERSION file (1.1.0) so the deployed build can report its version.',
    ],
    files: [
      'VERSION (new)',
      'src/bd/changelog.js (new)',
      'src/bd/log-view.jsx (new)',
      'src/bd/atoms.jsx',
      'src/bd/topbar.jsx',
      'src/bd/BDApp.jsx',
      'package.json',
    ],
    gitTag: 'v1.1.0',
  },
];

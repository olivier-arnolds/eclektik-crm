-- ============================================================================
-- People Science (yvhiowhiertndhyahvgh) — seed the patterns table
-- Date: 2026-06-09 · companion to docs/people-science/pattern-taxonomy-draft-2026-06-09.md
-- DRAFT — edit the taxonomy doc first, then keep this in sync.
-- Frequencies/applies_to are ESTIMATES from analysis excerpts; verify before relying on counts.
-- Convention: new diagnostic layer = methodology change = VERSION BUMP (v0.11.0).
-- ============================================================================

insert into patterns (slug, name, framework, description, frequency, applies_to) values
('action-taking-trust-gap','Action-Taking credibility deficit','BOTH','"You said / we did" belief is the lowest-vs-BM item or named keystone risk. Predicts next-cycle response rate; gating condition for all other interventions.','~10/14 deeply-analysed','["alex-lee","imc-trading","liberty","saatchi","serco","sage-gtm","sage-overall","warburtons","pepkor","breitling"]'::jsonb),
('saks-job-vs-org-split','Job vs organisational engagement split (Saks 2006)','JDR','Manager trust and work pride strong; org-layer trust weak. Cleanest at Liberty (Camaraderie 93 / Collaboration 63).','~8/14','["alex-lee","liberty","redsox","saatchi","sage-overall","sage-gtm","sage-product","westfalen"]'::jsonb),
('strategic-clarity-vacuum','Strategic-clarity vacuum','BOTH','Resources to do the work intact; resources to make sense of direction absent (Strategy/Prospects/Optimism below BM).','~8/14','["dentsu","liberty","draper","westfalen","sage-overall","serco","sage-gtm","breitling"]'::jsonb),
('fragile-high-performer','Fragile high performer','ACM','High headline engagement masks declining elite or small cohorts.','~5/14','["alex-lee","redsox","imc-trading","pepkor","breitling"]'::jsonb),
('manager-squeeze','Middle-manager translation-layer squeeze','BOTH','L3-L4 / first-line manager layer overloaded as the translation point of all change.','~6/14','["sage-overall","sage-gtm","sage-product","warburtons","liberty","imc-trading","dentsu"]'::jsonb),
('framework-cascade-ceiling','Framework cascade ceiling','BOTH','Corporate framework/values cascade moves the items it touches but dies at the manager layer; underlying engagement unmoved.','~4/14','["sage-overall","sage-gtm","sage-product","warburtons","dentsu"]'::jsonb),
('response-rate-leading-indicator','Response-rate erosion as leading indicator','JDR','RR decline reads as JD-R availability/withdrawal signal preceding score decline.','~4/14','["draper","imc-trading","saatchi","pepkor"]'::jsonb),
('loss-spiral-progression','Staged resource-loss spiral','JDR','Hobfoll/COR loss spiral progressing in stages across cycles (IMC Stage-1→Stage-2 the reference case).','~4/14','["imc-trading","saatchi","alex-lee","liberty"]'::jsonb),
('ai-narrative-vacuum','AI narrative vacuum','BOTH','AI rollout anxiety without a guardrails/benevolence narrative; comment volume high, governance story absent.','~5/14','["sage-overall","sage-gtm","sage-product","imc-trading","alex-lee","liberty"]'::jsonb),
('sts-tech-social-misalignment','STS technical-social misalignment','JDR','Technical subsystem rollout (Logile, Darwin, Copilot) mis-jointed with the social subsystem; joint optimisation absent.','~4/14','["alex-lee","warburtons","sage-product","westfalen"]'::jsonb),
('layoff-survivor-syndrome','Layoff survivor syndrome','BOTH','Post-RIF survivor workload + trust scarring shaping the next cycle.','~4/14','["dentsu","liberty","breitling","sage-overall"]'::jsonb),
('leadership-transition-window','Leadership-transition listening window','ACM','CEO/exec transition as a 100-day listening opportunity; mis-handled it compounds, handled it resets POS.','~5/14','["breitling","dentsu","imc-trading","sage-overall","westfalen"]'::jsonb),
('procedural-justice-keystone','Procedural-justice keystone deficit','JDR','Opacity of decision/pay rationale is the load-bearing organisational weakness.','~4/14','["imc-trading","serco","liberty","breitling"]'::jsonb),
('mid-tenure-trough','Mid-tenure trough','BOTH','2-6 year tenure cohort decline / missing tenure bounce.','~5/14','["redsox","imc-trading","serco","westfalen","warburtons"]'::jsonb),
('small-cohort-collapse','Small-cohort collapse','ACM','Smallest, most specialised units crater first (merge candidate with fragile-high-performer).','~3/14','["pepkor","redsox","alex-lee"]'::jsonb),
('team-as-shock-absorber','Team as shock absorber','JDR','Team layer absorbing organisational shock; camaraderie spend-down risk (merge candidate with saks-job-vs-org-split).','~2/14','["liberty","westfalen"]'::jsonb),
('intersectional-cohort-risk','Intersectional cohort risk','ACM','A named intersectional cohort (e.g. 40-44 female managers) at specific attrition risk.','~3/14','["saatchi","westfalen","imc-trading"]'::jsonb),
('benchmark-demotivation','Elite-benchmark demotivation','ACM','Top-10% benchmark framing demoralises rather than motivates.','~2/14','["breitling","imc-trading"]'::jsonb),
('instrument-provenance-gap','Instrument / provenance gap','BOTH','Reconstructed or lost decks, instrument switches breaking comparability. Methodological pattern, not organisational.','~3/14','["alex-lee","liberty","sage-product"]'::jsonb),
('scores-relationship-decoupling','Scores-relationship decoupling','BOTH','Engagement improves yet the client relationship closes. Eclectik-commercial pattern; track for our own funnel.','~2/14','["westfalen","redsox"]'::jsonb);

-- Optional but recommended: queryable tagging join table
-- create table analysis_patterns (
--   analysis_id uuid references analyses(id) on delete cascade,
--   pattern_slug text references patterns(slug),
--   note text,
--   primary key (analysis_id, pattern_slug)
-- );
-- (RLS auto-enables via the rls_auto_enable event trigger; add the standard
--  authenticated-full-access policy.)

-- Version + audit log (methodology change → version bump)
insert into version_log (version, entry_type, occurred_at, title, body_md, product)
values ('v0.11.0','version', now(),
 'Pattern taxonomy seeded — cross-portfolio pattern layer operationalised',
 '20 recurring patterns derived from all 58 v0.10.0 analyses seeded into `patterns` (3 tiers by frequency). Frequencies are initial estimates pending per-analysis verification tagging. Taxonomy doc: eclektik-crm `docs/people-science/pattern-taxonomy-draft-2026-06-09.md`.',
 'peoplescience');

insert into change_log (table_name, action, note, actor_email)
values ('patterns','INSERT','v0.11.0 — seeded 20-pattern taxonomy from 58 analyses (draft frequencies).','marco@eclektik.co');

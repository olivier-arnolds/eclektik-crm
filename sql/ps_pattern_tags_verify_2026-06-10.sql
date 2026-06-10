-- ============================================================================
-- People Science — pattern-tag verification pass (all 14 clients, 58 analyses)
-- Date: 2026-06-10 · Run in: PS Supabase SQL Editor
-- Confirms evidenced tags (note=verified), deletes unevidenced seeds, adds
-- clearly-evidenced missing tags. Approx: ~199 confirmed, ~90 removed, ~15 added.
-- Tags still carrying the seed-from-taxonomy-draft note after this run were not
-- explicitly adjudicated — query them afterwards for a final sweep.
-- ============================================================================

-- Pattern-tag verification: alex-lee, breitling, dentsu
-- Verified against analysis text (patterns_md / pov_md / risks / top_3_nba) on 2026-06-09.
-- Run order: updates (confirm), deletes (remove), inserts (add).

-- ============================================================
-- alex-lee: confirmed 26, removed 7, added 0
-- ============================================================
-- Analyses:
--   c5a2b455 ACM Jan-2025 (reconstructed) | 6324f59a JDR Jan-2025 (reconstructed)
--   d0514619 ACM Mar-2026 | de7945fc JDR Mar-2026
--   343d2d55 ACM YoY synthesis | 7dc457ab JDR YoY synthesis

update analysis_patterns set note='verified 2026-06-09' where (analysis_id, pattern_slug) in (
  ('c5a2b455-c7a6-4339-9c84-bfd968cb367e','action-taking-trust-gap'),
  ('c5a2b455-c7a6-4339-9c84-bfd968cb367e','fragile-high-performer'),
  ('c5a2b455-c7a6-4339-9c84-bfd968cb367e','instrument-provenance-gap'),
  ('6324f59a-7e04-43c4-8947-49b691678920','action-taking-trust-gap'),
  ('6324f59a-7e04-43c4-8947-49b691678920','saks-job-vs-org-split'),
  ('6324f59a-7e04-43c4-8947-49b691678920','loss-spiral-progression'),
  ('6324f59a-7e04-43c4-8947-49b691678920','instrument-provenance-gap'),
  ('d0514619-4be6-4d0c-a33e-3e4dfa01769b','action-taking-trust-gap'),
  ('d0514619-4be6-4d0c-a33e-3e4dfa01769b','fragile-high-performer'),
  ('d0514619-4be6-4d0c-a33e-3e4dfa01769b','small-cohort-collapse'),
  ('d0514619-4be6-4d0c-a33e-3e4dfa01769b','instrument-provenance-gap'),
  ('343d2d55-1ff6-4592-b4af-1dcc562cd74b','action-taking-trust-gap'),
  ('343d2d55-1ff6-4592-b4af-1dcc562cd74b','fragile-high-performer'),
  ('343d2d55-1ff6-4592-b4af-1dcc562cd74b','small-cohort-collapse'),
  ('343d2d55-1ff6-4592-b4af-1dcc562cd74b','instrument-provenance-gap'),
  ('de7945fc-eb10-406e-bf60-c8d8d87646bf','action-taking-trust-gap'),
  ('de7945fc-eb10-406e-bf60-c8d8d87646bf','saks-job-vs-org-split'),
  ('de7945fc-eb10-406e-bf60-c8d8d87646bf','loss-spiral-progression'),
  ('de7945fc-eb10-406e-bf60-c8d8d87646bf','ai-narrative-vacuum'),
  ('de7945fc-eb10-406e-bf60-c8d8d87646bf','sts-tech-social-misalignment'),
  ('7dc457ab-0cf5-4376-b680-5a29089809b2','action-taking-trust-gap'),
  ('7dc457ab-0cf5-4376-b680-5a29089809b2','saks-job-vs-org-split'),
  ('7dc457ab-0cf5-4376-b680-5a29089809b2','loss-spiral-progression'),
  ('7dc457ab-0cf5-4376-b680-5a29089809b2','ai-narrative-vacuum'),
  ('7dc457ab-0cf5-4376-b680-5a29089809b2','sts-tech-social-misalignment'),
  ('7dc457ab-0cf5-4376-b680-5a29089809b2','instrument-provenance-gap'));

-- Removals:
--   ai-narrative-vacuum on the 2025 + ACM analyses: no AI-anxiety/governance content;
--     Copilot appears only as a recommended listening tool, not as rollout anxiety.
--   small-cohort-collapse on Jan-2025 ACM: small entities were highest-engaged in 2025;
--     the collapse is a 2026 finding ("by 2026 it had moved -4/-5").
--   sts-tech-social-misalignment on Jan-2025 JDR: text itself says "no specific 2025
--     comment evidence is available" for Logile.
--   instrument-provenance-gap on Mar-2026 JDR: no provenance/reconstruction mention
--     anywhere in that analysis (unlike the ACM twin, which carries the recurrence risk).
delete from analysis_patterns where (analysis_id, pattern_slug) in (
  ('c5a2b455-c7a6-4339-9c84-bfd968cb367e','ai-narrative-vacuum'),
  ('c5a2b455-c7a6-4339-9c84-bfd968cb367e','small-cohort-collapse'),
  ('6324f59a-7e04-43c4-8947-49b691678920','ai-narrative-vacuum'),
  ('6324f59a-7e04-43c4-8947-49b691678920','sts-tech-social-misalignment'),
  ('d0514619-4be6-4d0c-a33e-3e4dfa01769b','ai-narrative-vacuum'),
  ('343d2d55-1ff6-4592-b4af-1dcc562cd74b','ai-narrative-vacuum'));

-- ============================================================
-- breitling: confirmed 7, removed 3, added 2
-- ============================================================
-- Analyses: 14523fc6 ACM Apr-2025 | ea560919 JDR Apr-2025

update analysis_patterns set note='verified 2026-06-09' where (analysis_id, pattern_slug) in (
  ('14523fc6-4cf0-4efa-a77e-a7f2f28acad8','action-taking-trust-gap'),
  ('14523fc6-4cf0-4efa-a77e-a7f2f28acad8','layoff-survivor-syndrome'),
  ('14523fc6-4cf0-4efa-a77e-a7f2f28acad8','leadership-transition-window'),
  ('14523fc6-4cf0-4efa-a77e-a7f2f28acad8','benchmark-demotivation'),
  ('ea560919-66c9-4b9c-9884-913a28dc895d','action-taking-trust-gap'),
  ('ea560919-66c9-4b9c-9884-913a28dc895d','layoff-survivor-syndrome'),
  ('ea560919-66c9-4b9c-9884-913a28dc895d','procedural-justice-keystone'));

-- Removals:
--   strategic-clarity-vacuum (both): no Strategy/Prospects/Optimism deficit; "excitement
--     to be part of Breitling future" is listed as a STRENGTH. Issues are Communication,
--     Safety and trust, not direction-sensemaking.
--   fragile-high-performer (ACM): no high-headline-masking-declining-cohort evidence;
--     the 51/87 split is a trust-band gap, not an elite-cohort decline.
delete from analysis_patterns where (analysis_id, pattern_slug) in (
  ('14523fc6-4cf0-4efa-a77e-a7f2f28acad8','strategic-clarity-vacuum'),
  ('14523fc6-4cf0-4efa-a77e-a7f2f28acad8','fragile-high-performer'),
  ('ea560919-66c9-4b9c-9884-913a28dc895d','strategic-clarity-vacuum'));

insert into analysis_patterns (analysis_id, pattern_slug, note) values
  ('ea560919-66c9-4b9c-9884-913a28dc895d','loss-spiral-progression','added on verification 2026-06-09 — textbook Hobfoll-COR loss-spiral named'),
  ('ea560919-66c9-4b9c-9884-913a28dc895d','saks-job-vs-org-split','added on verification 2026-06-09 — explicit Saks job-vs-org section');

-- ============================================================
-- dentsu: confirmed 5, removed 4, added 2
-- ============================================================
-- Analyses: ce811caa ACM Sep-2025 Check-In | 636d560f JDR Sep-2025 Check-In

update analysis_patterns set note='verified 2026-06-09' where (analysis_id, pattern_slug) in (
  ('ce811caa-0c7e-4798-a9c9-a12b34a74cb9','strategic-clarity-vacuum'),
  ('ce811caa-0c7e-4798-a9c9-a12b34a74cb9','layoff-survivor-syndrome'),
  ('ce811caa-0c7e-4798-a9c9-a12b34a74cb9','leadership-transition-window'),
  ('636d560f-ecae-4010-aecc-e776125f8083','strategic-clarity-vacuum'),
  ('636d560f-ecae-4010-aecc-e776125f8083','layoff-survivor-syndrome'));

-- Removals:
--   manager-squeeze (both): no first-line/middle-manager overload evidence; immediate-
--     leader trust is a PRESERVED resource (Leadership 74, +3). Survivor workload is
--     already covered by layoff-survivor-syndrome.
--   framework-cascade-ceiling (both): "One Dentsu vision not implemented" is an absent
--     narrative (strategic-clarity-vacuum), not a cascade that moved touched items and
--     died at the manager layer.
delete from analysis_patterns where (analysis_id, pattern_slug) in (
  ('ce811caa-0c7e-4798-a9c9-a12b34a74cb9','manager-squeeze'),
  ('ce811caa-0c7e-4798-a9c9-a12b34a74cb9','framework-cascade-ceiling'),
  ('636d560f-ecae-4010-aecc-e776125f8083','manager-squeeze'),
  ('636d560f-ecae-4010-aecc-e776125f8083','framework-cascade-ceiling'));

insert into analysis_patterns (analysis_id, pattern_slug, note) values
  ('636d560f-ecae-4010-aecc-e776125f8083','procedural-justice-keystone','added on verification 2026-06-09 — pay/bonus rationale opacity named explicitly'),
  ('636d560f-ecae-4010-aecc-e776125f8083','team-as-shock-absorber','added on verification 2026-06-09 — Collaboration holding engagement at 68');


-- Pattern-tag verification: imc-trading, draper, serco
-- Verified against analysis text (patterns_md / pov_md / risks / NBAs) on 2026-06-09.
-- Run in Supabase SQL editor (project yvhiowhiertndhyahvgh).

-- draper: confirmed 3, removed 0, added 2
update analysis_patterns set note='verified 2026-06-09' where (analysis_id, pattern_slug) in
  (('e9b849f6-0929-4b18-be1f-6ea335615993','strategic-clarity-vacuum'),
   ('94d6dc49-182e-4a01-82f7-df1b633beae4','strategic-clarity-vacuum'),
   ('94d6dc49-182e-4a01-82f7-df1b633beae4','response-rate-leading-indicator'));
insert into analysis_patterns (analysis_id, pattern_slug, note) values
  ('94d6dc49-182e-4a01-82f7-df1b633beae4','sts-tech-social-misalignment','added on verification 2026-06-09 — technical change outpacing social-identity update'),
  ('94d6dc49-182e-4a01-82f7-df1b633beae4','procedural-justice-keystone','added on verification 2026-06-09 — 9/80 policy procedural-justice gap');

-- imc-trading: confirmed 27, removed 18, added 1
update analysis_patterns set note='verified 2026-06-09' where (analysis_id, pattern_slug) in
  -- 2024 Sep IR (HRizons) · ACM
  (('a291ad52-72f7-4080-98ee-bf4ba8031b30','action-taking-trust-gap'),
   ('a291ad52-72f7-4080-98ee-bf4ba8031b30','fragile-high-performer'),
   ('a291ad52-72f7-4080-98ee-bf4ba8031b30','mid-tenure-trough'),
  -- 2024 Sep IR (HRizons) · JDR
   ('e389ce30-b571-43b3-ab13-7b40a4e4dd28','action-taking-trust-gap'),
   ('e389ce30-b571-43b3-ab13-7b40a4e4dd28','loss-spiral-progression'),
   ('e389ce30-b571-43b3-ab13-7b40a4e4dd28','procedural-justice-keystone'),
   ('e389ce30-b571-43b3-ab13-7b40a4e4dd28','mid-tenure-trough'),
  -- 2025 Global · ACM
   ('03ff8565-6c9d-46cd-87d6-26ec31e1cd55','action-taking-trust-gap'),
   ('03ff8565-6c9d-46cd-87d6-26ec31e1cd55','fragile-high-performer'),
   ('03ff8565-6c9d-46cd-87d6-26ec31e1cd55','ai-narrative-vacuum'),
   ('03ff8565-6c9d-46cd-87d6-26ec31e1cd55','leadership-transition-window'),
   ('03ff8565-6c9d-46cd-87d6-26ec31e1cd55','intersectional-cohort-risk'),
  -- 2025 Global · JDR
   ('5546eced-70a6-4340-81a8-50aa937ecadf','action-taking-trust-gap'),
   ('5546eced-70a6-4340-81a8-50aa937ecadf','response-rate-leading-indicator'),
   ('5546eced-70a6-4340-81a8-50aa937ecadf','loss-spiral-progression'),
   ('5546eced-70a6-4340-81a8-50aa937ecadf','ai-narrative-vacuum'),
   ('5546eced-70a6-4340-81a8-50aa937ecadf','procedural-justice-keystone'),
  -- 2024 → 2025 YoY · ACM
   ('4040ceeb-18e1-40b5-8e87-f9efc71c3a53','action-taking-trust-gap'),
   ('4040ceeb-18e1-40b5-8e87-f9efc71c3a53','fragile-high-performer'),
   ('4040ceeb-18e1-40b5-8e87-f9efc71c3a53','ai-narrative-vacuum'),
   ('4040ceeb-18e1-40b5-8e87-f9efc71c3a53','leadership-transition-window'),
   ('4040ceeb-18e1-40b5-8e87-f9efc71c3a53','intersectional-cohort-risk'),
  -- 2024 → 2025 YoY · JDR
   ('16ed1dad-ed4f-4fd6-8e0b-50727e83737a','action-taking-trust-gap'),
   ('16ed1dad-ed4f-4fd6-8e0b-50727e83737a','response-rate-leading-indicator'),
   ('16ed1dad-ed4f-4fd6-8e0b-50727e83737a','loss-spiral-progression'),
   ('16ed1dad-ed4f-4fd6-8e0b-50727e83737a','ai-narrative-vacuum'),
   ('16ed1dad-ed4f-4fd6-8e0b-50727e83737a','procedural-justice-keystone'));
delete from analysis_patterns where (analysis_id, pattern_slug) in
  -- 2024 ACM: no AI mention, no leadership transition yet, no manager-layer overload,
  -- no intersectional cohort (4-5yr COVID cohort is tenure-only), no benchmark-demotivation evidence
  (('a291ad52-72f7-4080-98ee-bf4ba8031b30','manager-squeeze'),
   ('a291ad52-72f7-4080-98ee-bf4ba8031b30','ai-narrative-vacuum'),
   ('a291ad52-72f7-4080-98ee-bf4ba8031b30','leadership-transition-window'),
   ('a291ad52-72f7-4080-98ee-bf4ba8031b30','intersectional-cohort-risk'),
   ('a291ad52-72f7-4080-98ee-bf4ba8031b30','benchmark-demotivation'),
  -- 2024 JDR: RR was 89% and rising-strong (no erosion signal), no AI, no manager squeeze
   ('e389ce30-b571-43b3-ab13-7b40a4e4dd28','manager-squeeze'),
   ('e389ce30-b571-43b3-ab13-7b40a4e4dd28','response-rate-leading-indicator'),
   ('e389ce30-b571-43b3-ab13-7b40a4e4dd28','ai-narrative-vacuum'),
  -- 2025 ACM: no manager-layer overload, no mid-tenure narrative (focus shifted to Star Early Career),
  -- no benchmark-demotivation evidence
   ('03ff8565-6c9d-46cd-87d6-26ec31e1cd55','manager-squeeze'),
   ('03ff8565-6c9d-46cd-87d6-26ec31e1cd55','mid-tenure-trough'),
   ('03ff8565-6c9d-46cd-87d6-26ec31e1cd55','benchmark-demotivation'),
  -- 2025 JDR: same — no manager squeeze, no mid-tenure evidence in this text
   ('5546eced-70a6-4340-81a8-50aa937ecadf','manager-squeeze'),
   ('5546eced-70a6-4340-81a8-50aa937ecadf','mid-tenure-trough'),
  -- YoY ACM
   ('4040ceeb-18e1-40b5-8e87-f9efc71c3a53','manager-squeeze'),
   ('4040ceeb-18e1-40b5-8e87-f9efc71c3a53','mid-tenure-trough'),
   ('4040ceeb-18e1-40b5-8e87-f9efc71c3a53','benchmark-demotivation'),
  -- YoY JDR
   ('16ed1dad-ed4f-4fd6-8e0b-50727e83737a','manager-squeeze'),
   ('16ed1dad-ed4f-4fd6-8e0b-50727e83737a','mid-tenure-trough'));
insert into analysis_patterns (analysis_id, pattern_slug, note) values
  ('a291ad52-72f7-4080-98ee-bf4ba8031b30','strategic-clarity-vacuum','added on verification 2026-06-09 — Prospects -4/-6 BM, strategy clarity gap');

-- serco: confirmed 6, removed 1, added 0
update analysis_patterns set note='verified 2026-06-09' where (analysis_id, pattern_slug) in
  -- Jan 2026 IR · ACM
  (('c29866e2-c887-4c3a-bb80-c9dc6ecceb61','action-taking-trust-gap'),
   ('c29866e2-c887-4c3a-bb80-c9dc6ecceb61','mid-tenure-trough'),
  -- Jan 2026 IR · JDR
   ('8be61897-1017-4aa4-8fe6-165dc54b1cbf','action-taking-trust-gap'),
   ('8be61897-1017-4aa4-8fe6-165dc54b1cbf','strategic-clarity-vacuum'),
   ('8be61897-1017-4aa4-8fe6-165dc54b1cbf','procedural-justice-keystone'),
   ('8be61897-1017-4aa4-8fe6-165dc54b1cbf','mid-tenure-trough'));
delete from analysis_patterns where (analysis_id, pattern_slug) in
  -- Serco ACM text has no strategy/direction-clarity evidence (action-taking, Helen Shaw concentration, tenure pipeline only)
  (('c29866e2-c887-4c3a-bb80-c9dc6ecceb61','strategic-clarity-vacuum'));


-- Pattern-tag verification: liberty, pepkor, redsox, saatchi, westfalen
-- Verified against analysis text (patterns_md / pov_md / risks / top_3_nba) on 2026-06-09.
-- Totals: confirmed 43, removed 34, added 3.

-- liberty: confirmed 18, removed 30, added 0
-- Analyses: Dec 2024 ACM e93d8210 / JDR 7a55827d; Jan 2025 readout ACM f2399f5a / JDR 7bcd9511; Feb 2026 ACM ee87522c / JDR 81875bc4.
-- Dec 2024 + Jan 2025 are pre-Solaris (pre-RIF, old instrument, no Strategy/Optimism items, no AI signal): most seeded tags only became true in Feb 2026.
update analysis_patterns set note='verified 2026-06-09' where (analysis_id, pattern_slug) in (
  ('e93d8210-cb63-4d12-90d2-56298298c260','action-taking-trust-gap'),
  ('7a55827d-2968-47b1-84e6-5acf6b3eb06d','action-taking-trust-gap'),
  ('7a55827d-2968-47b1-84e6-5acf6b3eb06d','saks-job-vs-org-split'),
  ('f2399f5a-e6e1-40d6-a798-9763f1785bdf','action-taking-trust-gap'),
  ('f2399f5a-e6e1-40d6-a798-9763f1785bdf','manager-squeeze'),
  ('7bcd9511-1968-4105-b245-dfeb38fafcfe','action-taking-trust-gap'),
  ('7bcd9511-1968-4105-b245-dfeb38fafcfe','saks-job-vs-org-split'),
  ('7bcd9511-1968-4105-b245-dfeb38fafcfe','manager-squeeze'),
  ('ee87522c-bfcd-46f0-af10-751267c3996f','strategic-clarity-vacuum'),
  ('ee87522c-bfcd-46f0-af10-751267c3996f','manager-squeeze'),
  ('ee87522c-bfcd-46f0-af10-751267c3996f','layoff-survivor-syndrome'),
  ('ee87522c-bfcd-46f0-af10-751267c3996f','instrument-provenance-gap'),
  ('81875bc4-7f29-4e0a-98e9-dcc98919dcbe','saks-job-vs-org-split'),
  ('81875bc4-7f29-4e0a-98e9-dcc98919dcbe','strategic-clarity-vacuum'),
  ('81875bc4-7f29-4e0a-98e9-dcc98919dcbe','manager-squeeze'),
  ('81875bc4-7f29-4e0a-98e9-dcc98919dcbe','layoff-survivor-syndrome'),
  ('81875bc4-7f29-4e0a-98e9-dcc98919dcbe','team-as-shock-absorber'),
  ('81875bc4-7f29-4e0a-98e9-dcc98919dcbe','loss-spiral-progression'));
delete from analysis_patterns where (analysis_id, pattern_slug) in (
  ('e93d8210-cb63-4d12-90d2-56298298c260','strategic-clarity-vacuum'),
  ('e93d8210-cb63-4d12-90d2-56298298c260','manager-squeeze'),
  ('e93d8210-cb63-4d12-90d2-56298298c260','ai-narrative-vacuum'),
  ('e93d8210-cb63-4d12-90d2-56298298c260','layoff-survivor-syndrome'),
  ('e93d8210-cb63-4d12-90d2-56298298c260','instrument-provenance-gap'),
  ('7a55827d-2968-47b1-84e6-5acf6b3eb06d','strategic-clarity-vacuum'),
  ('7a55827d-2968-47b1-84e6-5acf6b3eb06d','manager-squeeze'),
  ('7a55827d-2968-47b1-84e6-5acf6b3eb06d','loss-spiral-progression'),
  ('7a55827d-2968-47b1-84e6-5acf6b3eb06d','ai-narrative-vacuum'),
  ('7a55827d-2968-47b1-84e6-5acf6b3eb06d','layoff-survivor-syndrome'),
  ('7a55827d-2968-47b1-84e6-5acf6b3eb06d','procedural-justice-keystone'),
  ('7a55827d-2968-47b1-84e6-5acf6b3eb06d','team-as-shock-absorber'),
  ('7a55827d-2968-47b1-84e6-5acf6b3eb06d','instrument-provenance-gap'),
  ('f2399f5a-e6e1-40d6-a798-9763f1785bdf','strategic-clarity-vacuum'),
  ('f2399f5a-e6e1-40d6-a798-9763f1785bdf','ai-narrative-vacuum'),
  ('f2399f5a-e6e1-40d6-a798-9763f1785bdf','layoff-survivor-syndrome'),
  ('f2399f5a-e6e1-40d6-a798-9763f1785bdf','instrument-provenance-gap'),
  ('7bcd9511-1968-4105-b245-dfeb38fafcfe','strategic-clarity-vacuum'),
  ('7bcd9511-1968-4105-b245-dfeb38fafcfe','loss-spiral-progression'),
  ('7bcd9511-1968-4105-b245-dfeb38fafcfe','ai-narrative-vacuum'),
  ('7bcd9511-1968-4105-b245-dfeb38fafcfe','layoff-survivor-syndrome'),
  ('7bcd9511-1968-4105-b245-dfeb38fafcfe','procedural-justice-keystone'),
  ('7bcd9511-1968-4105-b245-dfeb38fafcfe','team-as-shock-absorber'),
  ('7bcd9511-1968-4105-b245-dfeb38fafcfe','instrument-provenance-gap'),
  ('ee87522c-bfcd-46f0-af10-751267c3996f','action-taking-trust-gap'),
  ('ee87522c-bfcd-46f0-af10-751267c3996f','ai-narrative-vacuum'),
  ('81875bc4-7f29-4e0a-98e9-dcc98919dcbe','action-taking-trust-gap'),
  ('81875bc4-7f29-4e0a-98e9-dcc98919dcbe','ai-narrative-vacuum'),
  ('81875bc4-7f29-4e0a-98e9-dcc98919dcbe','procedural-justice-keystone'),
  ('81875bc4-7f29-4e0a-98e9-dcc98919dcbe','instrument-provenance-gap'));

-- pepkor: confirmed 3, removed 2, added 1
-- ACM 18ea530d is fully evidenced; JDR 2abb2f64 is the explicit "ACM-only client" placeholder -> all tags removed.
update analysis_patterns set note='verified 2026-06-09' where (analysis_id, pattern_slug) in (
  ('18ea530d-da3a-4c32-b9c2-32dadbc38e0b','action-taking-trust-gap'),
  ('18ea530d-da3a-4c32-b9c2-32dadbc38e0b','fragile-high-performer'),
  ('18ea530d-da3a-4c32-b9c2-32dadbc38e0b','small-cohort-collapse'));
delete from analysis_patterns where (analysis_id, pattern_slug) in (
  ('2abb2f64-b16a-4de4-91c7-b11a2b891b07','action-taking-trust-gap'),
  ('2abb2f64-b16a-4de4-91c7-b11a2b891b07','response-rate-leading-indicator'));
insert into analysis_patterns (analysis_id, pattern_slug, note) values
  ('18ea530d-da3a-4c32-b9c2-32dadbc38e0b','scores-relationship-decoupling','added on verification 2026-06-09 — POV: scores do not predict closure');

-- redsox: confirmed 7, removed 0, added 1
-- ACM 2c4932d0 all four tags explicitly evidenced; JDR d9cacaf2 adds layoff-survivor (restructuring memory as emotional demand, "firings, pay cuts", re-activation risk).
update analysis_patterns set note='verified 2026-06-09' where (analysis_id, pattern_slug) in (
  ('2c4932d0-7e6d-4727-b097-78aa33efd21f','fragile-high-performer'),
  ('2c4932d0-7e6d-4727-b097-78aa33efd21f','mid-tenure-trough'),
  ('2c4932d0-7e6d-4727-b097-78aa33efd21f','small-cohort-collapse'),
  ('2c4932d0-7e6d-4727-b097-78aa33efd21f','scores-relationship-decoupling'),
  ('d9cacaf2-7ff0-46c2-8e38-c89a48715d85','saks-job-vs-org-split'),
  ('d9cacaf2-7ff0-46c2-8e38-c89a48715d85','mid-tenure-trough'),
  ('d9cacaf2-7ff0-46c2-8e38-c89a48715d85','scores-relationship-decoupling'));
insert into analysis_patterns (analysis_id, pattern_slug, note) values
  ('d9cacaf2-7ff0-46c2-8e38-c89a48715d85','layoff-survivor-syndrome','added on verification 2026-06-09 — restructuring memory as emotional demand');

-- saatchi: confirmed 6, removed 0, added 0
-- Both analyses fully evidence their seeded tags (three-strike Action Taking decline, 40-44 female-manager intersection, explicit Saks split, RR 80->71 in loss-spiral read).
update analysis_patterns set note='verified 2026-06-09' where (analysis_id, pattern_slug) in (
  ('99c4dd89-909f-4a76-aa76-6eaa7d10f3fe','action-taking-trust-gap'),
  ('99c4dd89-909f-4a76-aa76-6eaa7d10f3fe','intersectional-cohort-risk'),
  ('0dc8a2bd-4cd1-467b-b59d-be5d968f39b0','action-taking-trust-gap'),
  ('0dc8a2bd-4cd1-467b-b59d-be5d968f39b0','saks-job-vs-org-split'),
  ('0dc8a2bd-4cd1-467b-b59d-be5d968f39b0','response-rate-leading-indicator'),
  ('0dc8a2bd-4cd1-467b-b59d-be5d968f39b0','loss-spiral-progression'));

-- westfalen: confirmed 9, removed 2, added 1
-- Removed: leadership-transition-window (no CEO/exec transition anywhere in the Dec 2025 text) and team-as-shock-absorber on JDR (no team-buffer/camaraderie-spend-down narrative; within-BU health is framed as STS, manager strain as strategy-clarity tax).
-- Added: action-taking-trust-gap on ACM ("Action Taking 23pt band gap... Belief-in-action IS the lever").
update analysis_patterns set note='verified 2026-06-09' where (analysis_id, pattern_slug) in (
  ('19010361-87b0-41d2-b21e-7c7856c25de1','strategic-clarity-vacuum'),
  ('19010361-87b0-41d2-b21e-7c7856c25de1','mid-tenure-trough'),
  ('19010361-87b0-41d2-b21e-7c7856c25de1','intersectional-cohort-risk'),
  ('19010361-87b0-41d2-b21e-7c7856c25de1','scores-relationship-decoupling'),
  ('8302a96c-a0b7-4592-9eef-f1c65f9d9e6f','saks-job-vs-org-split'),
  ('8302a96c-a0b7-4592-9eef-f1c65f9d9e6f','strategic-clarity-vacuum'),
  ('8302a96c-a0b7-4592-9eef-f1c65f9d9e6f','sts-tech-social-misalignment'),
  ('8302a96c-a0b7-4592-9eef-f1c65f9d9e6f','mid-tenure-trough'),
  ('8302a96c-a0b7-4592-9eef-f1c65f9d9e6f','scores-relationship-decoupling'));
delete from analysis_patterns where (analysis_id, pattern_slug) in (
  ('19010361-87b0-41d2-b21e-7c7856c25de1','leadership-transition-window'),
  ('8302a96c-a0b7-4592-9eef-f1c65f9d9e6f','team-as-shock-absorber'));
insert into analysis_patterns (analysis_id, pattern_slug, note) values
  ('19010361-87b0-41d2-b21e-7c7856c25de1','action-taking-trust-gap','added on verification 2026-06-09 — 23pt Action-Taking engagement band gap');


-- Pattern-tag verification — Sage entities (sage-overall, sage-gtm, sage-product)
-- Verified against analysis text (patterns_md / pov_md / risks / NBAs) on 2026-06-09.
-- Each analysis judged on its own text only (not sibling-entity evidence).

-- ============================================================
-- sage-gtm: confirmed 25, removed 8, added 0
-- ============================================================
update analysis_patterns set note='verified 2026-06-09' where (analysis_id, pattern_slug) in
(('5772aa63-4c17-40e4-bdc2-d5df55369e2a','action-taking-trust-gap'),
 ('5772aa63-4c17-40e4-bdc2-d5df55369e2a','strategic-clarity-vacuum'),
 ('5772aa63-4c17-40e4-bdc2-d5df55369e2a','manager-squeeze'),
 ('5772aa63-4c17-40e4-bdc2-d5df55369e2a','ai-narrative-vacuum'),
 ('2820902e-d52a-48d0-ac9d-652515bfaded','saks-job-vs-org-split'),
 ('2820902e-d52a-48d0-ac9d-652515bfaded','strategic-clarity-vacuum'),
 ('2820902e-d52a-48d0-ac9d-652515bfaded','manager-squeeze'),
 ('2820902e-d52a-48d0-ac9d-652515bfaded','ai-narrative-vacuum'),
 ('a2ab87fe-7ad0-4456-818f-a12596ed6ac7','strategic-clarity-vacuum'),
 ('a2ab87fe-7ad0-4456-818f-a12596ed6ac7','framework-cascade-ceiling'),
 ('a2ab87fe-7ad0-4456-818f-a12596ed6ac7','ai-narrative-vacuum'),
 ('145c5a1b-403e-42da-814d-600afc0f21ee','saks-job-vs-org-split'),
 ('145c5a1b-403e-42da-814d-600afc0f21ee','strategic-clarity-vacuum'),
 ('145c5a1b-403e-42da-814d-600afc0f21ee','framework-cascade-ceiling'),
 ('145c5a1b-403e-42da-814d-600afc0f21ee','ai-narrative-vacuum'),
 ('f4c7aa06-3a43-4df2-b997-2c0c2a51a1c5','action-taking-trust-gap'),
 ('f4c7aa06-3a43-4df2-b997-2c0c2a51a1c5','strategic-clarity-vacuum'),
 ('f4c7aa06-3a43-4df2-b997-2c0c2a51a1c5','manager-squeeze'),
 ('f4c7aa06-3a43-4df2-b997-2c0c2a51a1c5','framework-cascade-ceiling'),
 ('f4c7aa06-3a43-4df2-b997-2c0c2a51a1c5','ai-narrative-vacuum'),
 ('50db7744-ab03-415f-8d65-b8f5020c2c05','saks-job-vs-org-split'),
 ('50db7744-ab03-415f-8d65-b8f5020c2c05','strategic-clarity-vacuum'),
 ('50db7744-ab03-415f-8d65-b8f5020c2c05','manager-squeeze'),
 ('50db7744-ab03-415f-8d65-b8f5020c2c05','framework-cascade-ceiling'),
 ('50db7744-ab03-415f-8d65-b8f5020c2c05','ai-narrative-vacuum'));

-- Removals: framework-cascade-ceiling not evidenced in Sep 2025 R2R (Game Changers
-- not yet launched / not mentioned); action-taking gap only evidenced in ACM Sep +
-- ACM YoY texts; manager-squeeze resolved by May 2026 (Priorities-Manager 88, +4 BM).
delete from analysis_patterns where (analysis_id, pattern_slug) in
(('5772aa63-4c17-40e4-bdc2-d5df55369e2a','framework-cascade-ceiling'),
 ('2820902e-d52a-48d0-ac9d-652515bfaded','action-taking-trust-gap'),
 ('2820902e-d52a-48d0-ac9d-652515bfaded','framework-cascade-ceiling'),
 ('a2ab87fe-7ad0-4456-818f-a12596ed6ac7','action-taking-trust-gap'),
 ('a2ab87fe-7ad0-4456-818f-a12596ed6ac7','manager-squeeze'),
 ('145c5a1b-403e-42da-814d-600afc0f21ee','action-taking-trust-gap'),
 ('145c5a1b-403e-42da-814d-600afc0f21ee','manager-squeeze'),
 ('50db7744-ab03-415f-8d65-b8f5020c2c05','action-taking-trust-gap'));

-- ============================================================
-- sage-overall: confirmed 34, removed 8, added 1
-- ============================================================
update analysis_patterns set note='verified 2026-06-09' where (analysis_id, pattern_slug) in
(('b929a8db-fee8-46ef-b53e-b5acdda27d97','action-taking-trust-gap'),
 ('b929a8db-fee8-46ef-b53e-b5acdda27d97','strategic-clarity-vacuum'),
 ('b929a8db-fee8-46ef-b53e-b5acdda27d97','manager-squeeze'),
 ('b929a8db-fee8-46ef-b53e-b5acdda27d97','framework-cascade-ceiling'),
 ('d3952c58-8333-4113-bc33-2f2f38bf928c','action-taking-trust-gap'),
 ('d3952c58-8333-4113-bc33-2f2f38bf928c','saks-job-vs-org-split'),
 ('d3952c58-8333-4113-bc33-2f2f38bf928c','strategic-clarity-vacuum'),
 ('d3952c58-8333-4113-bc33-2f2f38bf928c','manager-squeeze'),
 ('d3952c58-8333-4113-bc33-2f2f38bf928c','framework-cascade-ceiling'),
 ('d3952c58-8333-4113-bc33-2f2f38bf928c','ai-narrative-vacuum'),
 ('9d6b6ab0-db9c-40e6-8e34-5340fc5a8648','strategic-clarity-vacuum'),
 ('9d6b6ab0-db9c-40e6-8e34-5340fc5a8648','manager-squeeze'),
 ('9d6b6ab0-db9c-40e6-8e34-5340fc5a8648','framework-cascade-ceiling'),
 ('9d6b6ab0-db9c-40e6-8e34-5340fc5a8648','ai-narrative-vacuum'),
 ('9d6b6ab0-db9c-40e6-8e34-5340fc5a8648','layoff-survivor-syndrome'),
 ('9d6b6ab0-db9c-40e6-8e34-5340fc5a8648','leadership-transition-window'),
 ('e7d41f2e-73dc-4ae0-95f7-6d4a4d4cdcc3','saks-job-vs-org-split'),
 ('e7d41f2e-73dc-4ae0-95f7-6d4a4d4cdcc3','strategic-clarity-vacuum'),
 ('e7d41f2e-73dc-4ae0-95f7-6d4a4d4cdcc3','manager-squeeze'),
 ('e7d41f2e-73dc-4ae0-95f7-6d4a4d4cdcc3','framework-cascade-ceiling'),
 ('e7d41f2e-73dc-4ae0-95f7-6d4a4d4cdcc3','ai-narrative-vacuum'),
 ('e7d41f2e-73dc-4ae0-95f7-6d4a4d4cdcc3','layoff-survivor-syndrome'),
 ('1e9c74fd-0364-42a3-8081-1b613d0779f0','strategic-clarity-vacuum'),
 ('1e9c74fd-0364-42a3-8081-1b613d0779f0','manager-squeeze'),
 ('1e9c74fd-0364-42a3-8081-1b613d0779f0','framework-cascade-ceiling'),
 ('1e9c74fd-0364-42a3-8081-1b613d0779f0','ai-narrative-vacuum'),
 ('1e9c74fd-0364-42a3-8081-1b613d0779f0','layoff-survivor-syndrome'),
 ('1e9c74fd-0364-42a3-8081-1b613d0779f0','leadership-transition-window'),
 ('2852045b-1d3c-4dde-8c64-772485e247bc','saks-job-vs-org-split'),
 ('2852045b-1d3c-4dde-8c64-772485e247bc','strategic-clarity-vacuum'),
 ('2852045b-1d3c-4dde-8c64-772485e247bc','manager-squeeze'),
 ('2852045b-1d3c-4dde-8c64-772485e247bc','framework-cascade-ceiling'),
 ('2852045b-1d3c-4dde-8c64-772485e247bc','ai-narrative-vacuum'),
 ('2852045b-1d3c-4dde-8c64-772485e247bc','layoff-survivor-syndrome'));

-- Removals: Sep 2025 ACM has no AI-anxiety, no redundancy and no Walid-transition
-- content (Walid announced 19 Nov 2025, after this cycle); layoff-survivor on Sep JDR
-- is explicitly pre-RIF ("baseline taken BEFORE ... SA redundancy"); action-taking
-- not mentioned anywhere in the May 2026 or YoY texts.
delete from analysis_patterns where (analysis_id, pattern_slug) in
(('b929a8db-fee8-46ef-b53e-b5acdda27d97','ai-narrative-vacuum'),
 ('b929a8db-fee8-46ef-b53e-b5acdda27d97','layoff-survivor-syndrome'),
 ('b929a8db-fee8-46ef-b53e-b5acdda27d97','leadership-transition-window'),
 ('d3952c58-8333-4113-bc33-2f2f38bf928c','layoff-survivor-syndrome'),
 ('9d6b6ab0-db9c-40e6-8e34-5340fc5a8648','action-taking-trust-gap'),
 ('e7d41f2e-73dc-4ae0-95f7-6d4a4d4cdcc3','action-taking-trust-gap'),
 ('1e9c74fd-0364-42a3-8081-1b613d0779f0','action-taking-trust-gap'),
 ('2852045b-1d3c-4dde-8c64-772485e247bc','action-taking-trust-gap'));

insert into analysis_patterns (analysis_id, pattern_slug, note) values
('e7d41f2e-73dc-4ae0-95f7-6d4a4d4cdcc3','sts-tech-social-misalignment','added on verification 2026-06-09 — Copilot comments cluster at interfaces');

-- ============================================================
-- sage-product: confirmed 23, removed 7, added 4
-- ============================================================
update analysis_patterns set note='verified 2026-06-09' where (analysis_id, pattern_slug) in
(('6dae1620-68d4-429c-b446-42c24d48bf29','manager-squeeze'),
 ('6dae1620-68d4-429c-b446-42c24d48bf29','instrument-provenance-gap'),
 ('c19e377c-fb86-4e25-8151-ce530cf90dc5','saks-job-vs-org-split'),
 ('c19e377c-fb86-4e25-8151-ce530cf90dc5','manager-squeeze'),
 ('c19e377c-fb86-4e25-8151-ce530cf90dc5','instrument-provenance-gap'),
 ('288d399e-7825-4ef2-b518-529422fe14a8','manager-squeeze'),
 ('288d399e-7825-4ef2-b518-529422fe14a8','framework-cascade-ceiling'),
 ('288d399e-7825-4ef2-b518-529422fe14a8','ai-narrative-vacuum'),
 ('0db8484b-ae30-4761-acad-5dd3494abd12','saks-job-vs-org-split'),
 ('0db8484b-ae30-4761-acad-5dd3494abd12','manager-squeeze'),
 ('0db8484b-ae30-4761-acad-5dd3494abd12','framework-cascade-ceiling'),
 ('0db8484b-ae30-4761-acad-5dd3494abd12','ai-narrative-vacuum'),
 ('0db8484b-ae30-4761-acad-5dd3494abd12','sts-tech-social-misalignment'),
 ('0db8484b-ae30-4761-acad-5dd3494abd12','instrument-provenance-gap'),
 ('69113031-e734-4852-8c2c-a7b3fff4bec3','manager-squeeze'),
 ('69113031-e734-4852-8c2c-a7b3fff4bec3','framework-cascade-ceiling'),
 ('69113031-e734-4852-8c2c-a7b3fff4bec3','ai-narrative-vacuum'),
 ('69113031-e734-4852-8c2c-a7b3fff4bec3','instrument-provenance-gap'),
 ('86612fdb-0287-4bad-b78c-58a41aa1e1cd','saks-job-vs-org-split'),
 ('86612fdb-0287-4bad-b78c-58a41aa1e1cd','manager-squeeze'),
 ('86612fdb-0287-4bad-b78c-58a41aa1e1cd','framework-cascade-ceiling'),
 ('86612fdb-0287-4bad-b78c-58a41aa1e1cd','ai-narrative-vacuum'),
 ('86612fdb-0287-4bad-b78c-58a41aa1e1cd','sts-tech-social-misalignment'));

-- Removals: Sep 2025 (Product cut) explicitly pre-Game-Changers ("not yet launched"),
-- pre-AI-measurement ("AI items NEW in May 2026") and "no active structural
-- disruption" (STS) — those three patterns are not yet operative in that cycle.
-- instrument-provenance-gap not evidenced in May 2026 ACM or JDR-YoY texts (the
-- derived-baseline/architecture-artefact discussion lives in the Sep + ACM-YoY analyses).
delete from analysis_patterns where (analysis_id, pattern_slug) in
(('6dae1620-68d4-429c-b446-42c24d48bf29','framework-cascade-ceiling'),
 ('6dae1620-68d4-429c-b446-42c24d48bf29','ai-narrative-vacuum'),
 ('c19e377c-fb86-4e25-8151-ce530cf90dc5','framework-cascade-ceiling'),
 ('c19e377c-fb86-4e25-8151-ce530cf90dc5','ai-narrative-vacuum'),
 ('c19e377c-fb86-4e25-8151-ce530cf90dc5','sts-tech-social-misalignment'),
 ('288d399e-7825-4ef2-b518-529422fe14a8','instrument-provenance-gap'),
 ('86612fdb-0287-4bad-b78c-58a41aa1e1cd','instrument-provenance-gap'));

insert into analysis_patterns (analysis_id, pattern_slug, note) values
('288d399e-7825-4ef2-b518-529422fe14a8','leadership-transition-window','added on verification 2026-06-09 — Walid exit, interim decision-rights vacuum'),
('288d399e-7825-4ef2-b518-529422fe14a8','strategic-clarity-vacuum','added on verification 2026-06-09 — Future Confidence cluster below benchmark'),
('0db8484b-ae30-4761-acad-5dd3494abd12','strategic-clarity-vacuum','added on verification 2026-06-09 — Strategy Prospects below BM org-layer'),
('69113031-e734-4852-8c2c-a7b3fff4bec3','leadership-transition-window','added on verification 2026-06-09 — post-Walid interim leadership drift');


-- audit (content update)
insert into version_log (version, entry_type, occurred_at, title, body_md, product)
values (null,'content-update', now(),
 'Pattern tags verified against analysis texts (58 analyses)',
 'Per-analysis verification of the v0.11.0 mechanical seed: evidenced tags confirmed (note=verified 2026-06-09/10), unevidenced removed, clearly-evidenced missing tags added. Cycle-awareness applied (e.g. pre-Solaris Liberty, pre-Walid Sage Sep 2025, IMC 2024 baseline). Remaining seed-note tags pending final sweep.',
 'peoplescience');
insert into change_log (table_name, action, note, actor_email)
values ('analysis_patterns','UPDATE','Tag verification pass: ~199 confirmed / ~90 removed / ~15 added across 14 clients.','marco@eclectik.co');

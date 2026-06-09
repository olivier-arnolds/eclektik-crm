-- ============================================================================
-- People Science — meta-analysis v3.0 (DB-verified layer) → portfolio_content
-- Date: 2026-06-10 · Run in: PS Supabase SQL Editor
-- Replaces v2.0 (2026-06-04). Source doc: eclektik-crm
-- docs/people-science/meta-analysis-v3.0-2026-06-10.md (keep in sync).
-- ============================================================================

update portfolio_content set
  title = 'PSC ACM Meta-analysis — DB-verified layer',
  version = '3.0',
  source_uri = 'eclektik-crm/docs/people-science/meta-analysis-v3.0-2026-06-10.md',
  updated_at = now(),
  body_md = '
---
title: PSC ACM Meta-analysis — DB-verified layer
version: 3.0
generated: 2026-06-10
source: db-verified-layer-2026-06-10
scope: 15 deeply-analysed clients · 29 ACM + 29 JDR analyses · 38 cycles · 287 item scores · 230 verified pattern tags · ~152K employees represented
---

# PSC ACM Meta-analysis — v3.0 (DB-verified layer)

> **Read this first.** v3.0 is the first meta-analysis generated from the verified database layer rather than from analyst memory. Underneath it: (a) item-level scores extracted from the raw IR decks for 22 of 38 cycles (287 rows, deck-printed values only, provenance-flagged); (b) a 20-pattern cross-portfolio taxonomy whose 230 tags were each verified against the specific analysis text they sit on (mechanically-seeded tags that lacked evidence were removed — ~100 of the original 316). Every frequency below is a SQL query result, not a recollection.

## What changed vs v2.0

Three v2.0 claims did not survive verification and are corrected here: the fragile-high-performer count is **4 of 15** at verified-tag level (Alex Lee, IMC, Pepkor, Red Sox), not 6 — the Warburtons Business-Leaders and Sage-Product cohort signals are real but were adjudicated as adjacent patterns (small-cohort / manager-layer), not the full architecture. The Action-Taking deficit holds at **9 of 10 clients with a measurable item ≤65** — Pepkor is the documented exception (78, +5 vs BM) despite exhibiting the trust-gap pattern in its Central-vs-Field split. And the backup-restore note is obsolete: the `*_backup_2026_06_04` tables were dropped 2026-06-09 (v0.10.1); the preserved state lives in `analyses_v1_archive` / `items_v1_archive` / `documents_v1_archive`.

---

## Portfolio KPIs

| Metric | Value |
| --- | ---: |
| Clients in database | 22 |
| Clients with at least one ACM analysis | **15** |
| Pre-IR / pre-contract clients (correctly empty) | 7 |
| Total analyses (ACM + JDR) | **58** (29 + 29) |
| Cycles in database | 38 |
| Cycles with item-level scores | **22 of 38** (287 rows; remainder: synthesis cycles, deck-less trend years, pre-IR) |
| Verified pattern tags | **230** across 20 patterns (each verified against its analysis text) |
| Employees represented across analysed cycles | ~152,000 |
| Multi-cycle clients (≥3 cycles) | 6 (Alex Lee, IMC, Liberty, Sage trio, Warburtons) |
| Clients exhibiting fragile-high-performer (verified tags) | **4 of 15** (Alex Lee · IMC · Pepkor · Red Sox) |
| Clients with measurable Action Taking ≤65 | **9 of 10** measured (exception: Pepkor 78) |
| zCLOSED clients with deeply-analysed IR | 5 (Red Sox · Saatchi · Pepkor · Westfalen · Chugai-no-IR) |

---

## Pattern frequency table (verified tags, 2026-06-10)

| # | Pattern | Framework | Clients | Analyses | Where |
| --- | --- | --- | ---: | ---: | --- |
| 1 | Action-Taking credibility deficit | BOTH | **11** | 34 | alex-lee, breitling, imc, liberty, pepkor, saatchi, sage-gtm, sage-overall, serco, warburtons, westfalen |
| 2 | Strategic-clarity vacuum | BOTH | **9** | 24 | dentsu, draper, imc, liberty, sage ×3, serco, westfalen |
| 3 | Saks job-vs-org engagement split | JDR | **9** | 19 | alex-lee, breitling, liberty, redsox, saatchi, sage ×3, westfalen |
| 4 | STS technical-social misalignment | JDR | 6 | 10 | alex-lee, draper, sage-overall, sage-product, warburtons, westfalen |
| 5 | Middle-manager squeeze | BOTH | 5 | 24 | liberty, sage ×3, warburtons |
| 6 | AI narrative vacuum | BOTH | 5 | 21 | alex-lee, imc, sage ×3 |
| 7 | Layoff survivor syndrome | BOTH | 5 | 11 | breitling, dentsu, liberty, redsox, sage-overall |
| 8 | Mid-tenure trough | BOTH | 5 | 10 | imc, redsox, serco, warburtons, westfalen |
| 9 | Loss-spiral progression | JDR | 5 | 9 | alex-lee, breitling, imc, liberty, saatchi |
| 10 | Leadership-transition window | ACM | 5 | 8 | breitling, dentsu, imc, sage-overall, sage-product |
| 11 | Procedural-justice keystone | JDR | 5 | 7 | breitling, dentsu, draper, imc, serco |
| 12 | Framework cascade ceiling | BOTH | 4 | 15 | sage ×3, warburtons (2025 only — by 2026 the cascade demonstrably landed) |
| 13 | Fragile high performer | ACM | 4 | 8 | alex-lee, imc, pepkor, redsox |
| 14 | Instrument / provenance gap | BOTH | 3 | 10 | alex-lee, liberty, sage-product |
| 15 | Scores-relationship decoupling | BOTH | 3 | 5 | pepkor, redsox, westfalen |
| 16 | Response-rate leading indicator | JDR | 3 | 4 | draper, imc, saatchi |
| 17 | Small-cohort collapse | ACM | 3 | 4 | alex-lee, pepkor, redsox |
| 18 | Intersectional cohort risk | ACM | 3 | 4 | imc, saatchi, westfalen |
| 19 | Team as shock absorber | JDR | 2 | 2 | dentsu, liberty |
| 20 | Benchmark demotivation | ACM | 1 | 1 | breitling |

Tags are cycle-aware: a pattern counts only for the cycles whose analysis text evidences it (e.g. AI narrative vacuum exists at Alex Lee only in the 2026 JDR readings; layoff-survivor-syndrome at Sage only post-SA-redundancy).

---

## Three patterns present across deeply-analysed clients

### Pattern 1 — The Action-Taking trust deficit is the dominant single lever

The most-tagged pattern in the portfolio (11 of 15 clients) and now measurable from the items layer:

| Client | Cycle | Action Taking | vs own BM | Trend |
| --- | --- | ---: | ---: | ---: |
| Serco | Jan 2026 | 51% fav | — | −2 |
| Sage GTM | Sep 2025 | 54 | −10 | — |
| Saatchi | Jul 2025 | 55 | −8 | −6 |
| Alex Lee | Mar 2026 | 57 / 47% fav | — | — |
| Liberty | Dec 2024 | 57 | −6 | +1 |
| Westfalen | Dec 2025 | 60 | −4 | −1 |
| Warburtons | 2025 → 2026 | 61 → 65 | −2 → −5 | +2 → +4 |
| Dentsu | Sep 2025 | 62 | −2 | — |
| IMC | 2025 | 63 | −10 | — |
| **Pepkor (exception)** | Jul 2025 | **78** | **+5** | — |

Where fav/unfav engagement splits are printed, the believer/non-believer gap exceeds 20 points everywhere (Breitling 87/51, Alex Lee 87/55, Warburtons 91/59, IMC 88/66). "You said / we did" loop work — visible, named, dated commitments published within 2 weeks of cycle close — remains the highest-leverage single intervention. Warburtons is now the reference arc: 61 → 65 across one advised cycle, trend +4.

### Pattern 2 — Fragile-high-performer engagement architecture

Verified at **4 of 15** clients (Alex Lee, IMC, Pepkor, Red Sox) — a tighter count than v2.0''s six, because verification distinguished the full architecture (high headline masking a declining elite cohort) from adjacent signals:

- **Alex Lee**: corp entity +8 above total org AND largest significant decline (−4); non-managers there dropped −6 on four below-BM items at once.
- **Red Sox**: Baseball Sciences (n=5, −17 vs org), Premium Client Services (n=7, −14), Fenway Park Events (n=12, −13); 4-5yr tenure trough.
- **IMC**: Star Early Career −19 ExCo, −15 Communication, −14 Action Taking.
- **Pepkor**: Distribution Centers n=90 collapsed (−8 eng, −10pp RR) inside a BM-aligned 83 composite.

Adjacent-but-distinct (tagged separately): Warburtons Business Leaders decline 2026 (only cohort moving backwards in a +2 year — manager-layer signal) and Sage Product''s uneven excellence (function spread, not elite-cohort decline). The diagnostic move stands: **always scan the smallest, most specialised, or most senior sub-cohort** — and it stays a hypothesis to test per client, not an a-priori truth.

### Pattern 3 — Strategic clarity is the organisation-engagement live wire

Strategic-clarity vacuum (9 clients) and the Saks job-vs-org split (9 clients) overlap at 6 clients and together cover 12 of 15 — the centre of gravity of the portfolio''s opportunity side. The structure is consistent: job-layer resources (manager trust, autonomy, team) at or above benchmark; direction-sensemaking (Strategy, Prospects, Optimism, Customer Focus) below it. Liberty Feb 2026 is the cleanest single expression (Camaraderie 93 / Collaboration 63 / Strategy 61 / Optimism 60). In mid-to-late-stage clients the engagement problem is rarely line management — it is the gap between what the strategic centre says and what the middle layer can defensibly cascade. Communication-frequency interventions do not fix this; strategic clarity + decision-rationale visibility do (procedural-justice keystone, 5 clients, is this pattern''s JDR-lens twin).

---

## Three patterns where clients differ

### Difference 1 — Industry trajectory: engagement leading vs lagging the business

- **Crisis-after-signal (Dentsu, Breitling, Liberty):** verbatims named what then happened operationally 6-12 months later (Dentsu Sep 2025 → ¥327.6B loss + 3,400 layoffs + CEO change; Breitling Apr 2025 → 50+ layoffs + CEO transition; Liberty Dec 2024 Action Taking 57 → Solaris 41% RIF).
- **Steady-state under pressure (Sage trio, Warburtons):** +1 to +2 YoY while absorbing material disruption; job-engagement held, organisation-engagement flat.
- **Recovery (Draper):** 67 → 70 → 73 → 76 across four cycles — cleanest "up" story — while response rate fell 70% → 62% (the portfolio''s clearest response-rate-leading-indicator case).

### Difference 2 — The "growth + visible action" hypothesis

Now testable against items, and it holds in both clean cases: **Warburtons** (2025 advice on Growth/Care/Empowerment → all three +3 in 2026, Action Taking +4) and **Sage GTM** (Priorities-Manager 82 → 88 after the manager-toolkit advice). Counter-cases unchanged: Alex Lee''s undelivered Year-1 plan reopened Year-2 with the same trust deficit; Liberty''s case-study readout without commitments preceded the post-Solaris −5. Commitment-tracking inside the readout deck remains the differentiator.

### Difference 3 — What to fix first (sequencing by maturity)

Unchanged from v2.0 in substance: earlier-stage clients pivot on Set A (survey-grounded moves); transformation-stage clients need Set B (external context). Per-client sequencing lives in each client''s panel; the portfolio rule is the maturity split.

---

## Portfolio Next Best Actions

1. **Ship the Visible-Action-Loop methodology as the default Week-2 deliverable on every Year-1 engagement.** 11 of 15 clients carry the verified tag; 9 of 10 measured sit ≤65. Warburtons (61→65, +4 trend) and Sage GTM are the reference case studies. Pepkor (78, +5) is the proof the lever moves.
2. **Adopt the Saks-gap metric as the portfolio multi-cycle health indicator — and compute it from `items`, not by hand.** The job-vs-org split is verified at 9 clients; with item scores in the DB the manager-score-minus-Action-Taking gap is now one query per cycle.
3. **Make the fragility scan a mandatory IR step.** Verified at 4 clients with 3 more showing adjacent small-cohort signals; cheap to run, expensive to miss. Test it per client — 4/15 verified means it is common, not universal.
4. **Reposition from measurement provider to action-layer infrastructure.** The scores-relationship-decoupling tag (Pepkor, Red Sox, Westfalen) plus Saatchi and Chugai give five Year-1 closures with no scores-based predictor. Closure is a commercial-fit phenomenon, not a results phenomenon; the renewal architecture must handle that explicitly.
5. **Codify the YoY playbook (Warburtons + Sage GTM + Sage Overall) as portfolio reference architecture, with NBA outcome tracking as the next build.** Name the opportunities, target the owning cohort, commit-track inside the readout, score last cycle''s NBAs against item deltas at the next cycle. The items layer makes step four possible for the first time — that is the Q3 build.

---

## POV — what the verified layer surfaces

**AI anxiety is concentrated, not universal — yet.** The verified ai-narrative-vacuum tag sits on 5 clients (Sage trio, IMC, Alex Lee 2026-JDR only). v2.0 predicted spread to Warburtons and Dentsu in 2026-27 cycles; the tag data now gives that prediction a falsifiable baseline.

**The cascade ceiling is breakable.** Framework-cascade-ceiling was removed from Warburtons 2026 and Sage GTM May 2026 during verification because the texts affirmatively document the cascade landing (+3s at Warburtons; Priorities-Manager +6 at GTM). The pattern is a stage, not a sentence — which strengthens the commercial story.

**Verification changed the numbers — and that is the point.** ~100 of 316 mechanically-seeded tags were removed on evidence review. Frequencies in this document are conservative floors: a pattern may exist at a client without its analysis text saying so, but nothing here is claimed without text evidence.

---

## Methodology & caveats

**Benchmark mismatch.** Clients reference different cohorts (Glint Global, Top 25% BIC, Top 10% Global/Tech, Manufacturing, Europe, US, Zoom Global). Cross-client comparisons are directional, not statistical. `items.vs_bm` is always the delta vs that cycle''s own benchmark cohort; other printed benchmarks live in `items.meta`.

**Items coverage.** 22 of 38 cycles have item rows (287). Not covered: synthesis cycles (by design), Alex Lee Jan 2025 (reconstructed), deck-less trend years (Warburtons 2022-24, IMC 2023 + deep-dives), pre-IR clients. Several decks keep full score tables as image slides; those rows carry deltas/% favourable without 0-100 scores, flagged in meta. No value in `items` was computed or inferred.

**Tag method.** Patterns were seeded mechanically from client-level lists (v0.11.0), then verified per analysis against patterns_md / risks / NBAs / pov_md; unevidenced tags removed, evidenced missing tags added (15). Tags are conservative floors, cycle-aware, and framework-matched. JDR analyses are narrative-only by design (decision logged 2026-06-10) — their structured fields are intentionally NULL.

**Selection bias.** 15 of 22 clients have analyses; they are the subset where Eclectik delivered work, not a random sample. Five of fifteen are zCLOSED — the fragile-high-performer and Action-Taking patterns may be partly closure-cohort artefacts; strategic-clarity and steady-state patterns appear in both cohorts and are more robust.

**Provenance.** Every analysis grounds in a raw deck (source_uri) or is labelled synthesis/reconstructed/derived. Flagged analyses: Alex Lee Jan 2025 (reconstructed, directional only), Sage Product Sep 2025 (derived), six synthesis cycles. Pre-Phase-1 state: `analyses_v1_archive` (35) / `items_v1_archive` (36) / `documents_v1_archive` (12) — the 2026-06-04 backup tables were dropped 2026-06-09 (v0.10.1).

---

*Version 3.0 — DB-verified layer · 2026-06-10 · 15 clients · 58 analyses · 287 items · 230 verified tags · ~152K employees*
'
where kind = 'meta';

insert into version_log (version, entry_type, occurred_at, title, body_md, product)
values (null, 'content-update', now(),
 'Meta-analysis v3.0 — first DB-driven rebuild',
 'Meta rebuilt from the verified database layer: pattern frequencies from 230 evidence-verified tags (SQL, not memory), Action-Taking table from items (287 rows, 22/38 cycles). Corrections vs v2.0: fragile-high-performer 4/15 at verified-tag level (was 6), Action-Taking 9/10 measured <=65 with Pepkor exception (78, +5), backup-restore note updated to v1 archives. JDR narrative-only decision incorporated.',
 'peoplescience');

insert into change_log (table_name, action, note, actor_email)
values ('portfolio_content', 'UPDATE',
 'Meta v2.0 -> v3.0: DB-driven rebuild from verified tags + items layer.',
 'marco@eclectik.co');

# People Science — Pattern taxonomy draft v0.1

**Date:** 2026-06-09 · **Author:** Claude (Cowork session, Marco) · **Status:** DRAFT — for Marco's edit before seeding
**Source:** derived from reading all 58 analyses (ACM + JDR `patterns_md`, `top_3_nba`, `risks`) across the 14 deeply-analysed clients in the People Science DB (post-Phase-1 rebuild, v0.10.0).

**Provenance caveat:** frequencies below are my estimates from analysis excerpts — verify each `applies_to` list against the full analysis text before treating counts as facts. Several patterns overlap; merging candidates are flagged.

**Convention note:** seeding the `patterns` table is a methodology change (new diagnostic layer) → per the versioning rule this is a **version bump** (proposed v0.11.0), not a content update.

---

## Tier 1 — near-universal (8+ of 14 clients)

| # | slug | name | framework | seen at (estimate) |
|---|------|------|-----------|--------------------|
| 1 | `action-taking-trust-gap` | Action-Taking credibility deficit | BOTH | alex-lee, imc-trading, liberty, saatchi, serco, sage-gtm, sage-overall, warburtons, pepkor, breitling (~10) |
| 2 | `saks-job-vs-org-split` | Job engagement strong, organisational engagement weak (Saks 2006) | JDR | alex-lee, liberty, redsox, saatchi, sage-overall, sage-gtm, sage-product, westfalen (~8) |
| 3 | `strategic-clarity-vacuum` | Strategy/Prospects/Direction items below BM — sense-making gap, not capability gap | BOTH | dentsu, liberty, draper, westfalen, sage-overall, serco, sage-gtm, breitling (~8) |

**1 — Action-Taking credibility deficit.** "You said, we did" belief is the lowest-vs-BM item or the named keystone risk in most of the portfolio (IMC −10/−14 BM, Serco 51%, Liberty 57, Saatchi 61→55). It predicts next-cycle response rate and is the gating condition for every other intervention. This is arguably Eclectik's signature finding.

**2 — Saks split.** People trust their manager and love their work; they distrust the org layer. Cleanest at Liberty (Camaraderie 93 / Collaboration 63) and Sage. The diagnostic Marco already pre-registers for next cycles — formalise it.

**3 — Strategic-clarity vacuum.** Resources for *doing the work* are intact; resources for *making sense of direction* are not (Westfalen formulation). Distinct from #2: this is the content of the org-layer gap.

## Tier 2 — recurrent (4-7 clients)

| # | slug | name | framework | seen at (estimate) |
|---|------|------|-----------|--------------------|
| 4 | `fragile-high-performer` | High headline masks declining elite/small cohorts | ACM | alex-lee, redsox, imc-trading, pepkor, breitling |
| 5 | `manager-squeeze` | L3-L4 / middle-manager translation-layer overload | BOTH | sage (×3), warburtons, liberty, imc-trading, dentsu |
| 6 | `framework-cascade-ceiling` | Corporate framework/values cascade dies at the manager layer | BOTH | sage (×3), warburtons, dentsu |
| 7 | `response-rate-leading-indicator` | RR erosion as JD-R withdrawal signal preceding score decline | JDR | draper, imc-trading, saatchi, pepkor |
| 8 | `loss-spiral-progression` | Staged Hobfoll/COR resource-loss spiral across cycles | JDR | imc-trading, saatchi, alex-lee, liberty |
| 9 | `ai-narrative-vacuum` | AI rollout anxiety without guardrails/benevolence narrative | BOTH | sage (×3), imc-trading, alex-lee, liberty |
| 10 | `sts-tech-social-misalignment` | Tech system rollout mis-jointed with social subsystem (Logile, Darwin, Copilot) | JDR | alex-lee, warburtons, sage-product, westfalen |
| 11 | `layoff-survivor-syndrome` | Post-RIF survivor workload + trust scarring | BOTH | dentsu, liberty, breitling, sage-overall |
| 12 | `leadership-transition-window` | CEO/exec transition as 100-day listening opportunity | ACM | breitling, dentsu, imc-trading, sage (Walid), westfalen |
| 13 | `procedural-justice-keystone` | Decision/pay rationale opacity as the load-bearing deficit | JDR | imc-trading, serco, liberty, breitling |
| 14 | `mid-tenure-trough` | 2-6 yr tenure cohort decline / missing tenure bounce | BOTH | redsox, imc-trading, serco, westfalen, warburtons |

## Tier 3 — emerging / niche (2-3 clients) — confirm before seeding

| # | slug | name | framework | seen at (estimate) |
|---|------|------|-----------|--------------------|
| 15 | `small-cohort-collapse` | Smallest units crater first (DC n=90, Baseball Sciences n=5, Import Mex) | ACM | pepkor, redsox, alex-lee — *merge candidate with #4* |
| 16 | `team-as-shock-absorber` | Team layer absorbing org-layer shock (camaraderie spend-down) | JDR | liberty, westfalen — *merge candidate with #2* |
| 17 | `intersectional-cohort-risk` | Named intersectional cohort at attrition risk (40-44 female managers etc.) | ACM | saatchi, westfalen, imc-trading |
| 18 | `benchmark-demotivation` | Elite benchmark (Top 10%) demoralises rather than motivates | ACM | breitling, imc-trading |
| 19 | `instrument-provenance-gap` | Reconstructed/lost decks or instrument switch breaking comparability | BOTH | alex-lee, liberty, sage-product — *methodological, not organisational; consider separate `kind` flag* |
| 20 | `scores-relationship-decoupling` | Improvement-yet-closed paradox: engagement improves, client closes anyway | BOTH | westfalen, redsox — *Eclectik-commercial pattern; highest strategic value for our own funnel* |

---

## How to use (once seeded)

1. Each new analysis tags its patterns (slug list in `analyses.content.patterns` or a join table — recommend a `analysis_patterns(analysis_id, pattern_slug)` join table for queryability).
2. `psc-acm-rework-meta-analysis` reads frequencies from the DB instead of rebuilding from memory.
3. After ~10 more cycles, frequencies by industry/size_band become the proprietary benchmark layer.

## Seed SQL

`sql/ps_patterns_seed_2026-06-09.sql` — inserts the 20 patterns above with `applies_to` arrays, plus the v0.11.0 version_log entry. **Review/edit this doc first; the SQL mirrors it.**

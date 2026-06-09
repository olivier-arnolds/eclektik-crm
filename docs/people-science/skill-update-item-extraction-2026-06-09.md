# Skill update spec — psc-acm-analyse-client: mandatory item extraction + DB write conventions

**Date:** 2026-06-09 · **Status:** draft for Marco to install via Settings > Capabilities (skill files are read-only in Cowork sessions).
**Applies to:** `psc-acm-analyse-client` (and mirrored, where relevant, in `psc-jdr-analyse-client`).

## Why

Only 4 of 38 cycles have item-level scores in the People Science DB (122 rows; Liberty, Sage Product, Westfalen, Saatchi). The skill produces md + dashboard panel but never writes `items` — so every quantitative cross-portfolio capability (driver patterns, benchmark distributions, trend math, NBA outcome tracking) is blocked. The fix: make item extraction a mandatory workflow step with the same status as the Top 3 NBA box.

## Paste-in addition — new section after "### 4. Produce the analysis using the established structure"

---

### 4b. Extract item-level scores into the database — MANDATORY

Every deep analysis MUST deposit the IR deck's driver-item scores into the People Science `items` table (project `yvhiowhiertndhyahvgh`), one row per driver item per cycle. This is not optional and has the same status as the Top 3 NBA box: an analysis without item rows is incomplete.

For every driver item visible in the IR deck, capture:

- `name` — the Glint item name exactly as the deck spells it (e.g. "Action Taking", "Prospects"). Do not normalise or translate.
- `score` — the 0-100 item score.
- `vs_bm` — delta vs the cycle's benchmark cohort (`cycles.benchmark_cohort_slug`). Null if the deck shows no benchmark for that item.
- `yoy` — delta vs prior cycle as printed in the deck. Null for first cycles.
- `impact` — the deck's impact-on-engagement rating mapped to a number (Very High = 4, High = 3, Medium = 2, Low = 1). Null if not shown.
- `favourable` — % favourable if printed.
- `category` — 'strength' | 'opportunity' | null, per the deck's own classification only.
- `meta` — JSONB for anything else the deck prints (trend arrows, n per item, significance flags).

Rules:

1. **Deck values only.** Never compute or infer a score the deck doesn't print. If a value is derived (e.g. reversed from YoY arrows), record it but set `meta.derivation` accordingly — mirroring the `reconstructed-from-...` convention on `analyses.source_uri`.
2. **Completeness over curation.** Extract ALL items the deck scores, not just the strengths/opportunities narrative picks. Target: a typical Glint IR yields 15-40 item rows.
3. **Provenance.** The cycle's `analyses.source_uri` must point at the SharePoint URI of the deck the items came from (v0.10.0 convention).
4. **Verify counts.** After insert, `select count(*) from items where cycle_id = ...` and state the count in the session summary.

### 4c. Pattern tagging — once `patterns` is seeded

After writing the analysis, tag which portfolio patterns this client/cycle exhibits (slugs from the `patterns` table; see taxonomy doc). Record in `analysis_patterns` (or `analyses.content.patterns` until the join table exists). Only tag patterns the analysis text actually evidences — no courtesy tagging.

### 4d. Version + audit log — every DB write

Per the dashboard versioning rule, adding a client or cycle is a **content update** (dated `version_log` entry, `entry_type='content-update'`, no version bump; `product='peoplescience'`). Methodology changes are version bumps. Every multi-row write also gets a `change_log` note. Backfills of historical cycles count as content updates and must name the source deck in the body.

---

## Backfill plan (one-off, after skill is updated)

~34 cycles lack items. Sources in priority order:

1. **Raw IR decks on SharePoint** — re-extract per section 4b. The Phase 1 rebuild (v0.10.0) already grounded all 58 analyses in deck URIs (`analyses.source_uri`), so the deck list is already in the DB.
2. **`items_v1_archive`** (36 pre-rebuild rows, preserved by the 2026-06-09 cleanup) — map to current cycle IDs where the cycle survived; mark `meta.provenance='v1-archive'`.
3. Cycles whose decks were lost (e.g. Alex Lee Jan 2025): derive per the deck's YoY annotations only if the 2026 deck prints them, with `meta.derivation='reversed-from-yoy'` — else leave empty. Reconstructed ≠ measured.

Each backfilled client = one content-update `version_log` entry.

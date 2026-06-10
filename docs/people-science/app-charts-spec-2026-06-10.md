# PeopleScience app — charts & portfolio-explorer implementation spec

**Date:** 2026-06-10 · **For:** a session on the machine with the `peoplescience` git clone (the OneDrive copy on this machine is non-hydrated placeholders).
**Context:** /benchmarks "Charts" tab is an intentional placeholder ("recharts is not yet installed"). Meanwhile the DB now has 287 item scores (22/38 cycles) and 230 verified pattern tags — far richer than the benchmarks PDFs. A working interactive version of everything below exists as the Cowork artifact `ps-portfolio-explorer`; use it as the functional reference.

## 0. Data bug first (independent of charts)

Overview tab shows **Industry: 0 cohorts loaded** (Global 2, Region 2, Country 8). The benchmarks page derives coverage from `benchmark_cohorts`/page data — either industry cohorts are missing from the loaded set or the categoriser misses their naming. Check `select * from benchmark_cohorts where slug ilike '%manu%' or name ilike '%industr%'` — the DB has 83 cohorts, so this is almost certainly a filter/classification bug or an ingest gap, not absent data. Fix before building charts on top.

## 1. Install

`npm i recharts` (the placeholder text already assumes recharts; the app is Next.js App Router — charts must live in `"use client"` components).

## 2. Benchmarks page — the six promised charts

Per the placeholder: regional eSat, regional Recommend, top/bottom 10 countries, industry comparison, SD spread — all as Dec-2025 vs May-2026 paired bars from the two collateral summaries already in the page's data source. Plain `<BarChart>` ×5 + one `<ScatterChart>` (mean vs SD). Low effort, low value relative to §3 — do it for completeness, but §3 is the prize.

## 3. New page: /portfolio (Portfolio Explorer) — the actual slice-and-dice

Four views, all driven by three queries (see the artifact source for working SQL + client-side shaping):

**3.1 Item heatmap.** Latest non-synthesis cycle with items per client (rows) × item names appearing for ≥2 clients (columns, by frequency, cap ~16). Cell = `vs_bm` (default) with toggles for `score` and `yoy`. Green-to-red diverging scale clamped at ±12. Grey cells with `%` = favourable-only rows (score never printed in deck). Tooltip: score / vs BM / trend / favourable. Click a row header to isolate the client. **Mandatory caveat under the table:** vs_bm is each cycle's *own* benchmark cohort — directional, not statistical.

**3.2 Action Taking league.** Horizontal bars, latest `name ~ '^Action Taking'` row per client; value = score, fallback favourable (label "% fav"); bar colour by vs_bm bands (≥0 green, −1..−5 amber, <−5 red, null grey). This is the portfolio's headline finding as one picture.

**3.3 Pattern × client matrix.** From `analysis_patterns` joined out to client (verified tags only). Rows = 20 patterns sorted by client count, columns = clients, dot coloured by framework (ACM amber / JDR teal / BOTH indigo), dot tooltip = tagged-analyses count. Framework filter (All/ACM/JDR/BOTH). This is the "who else has this?" sales view.

**3.4 Trajectories.** Small-multiple line charts (one per client) of `cycles.engagement` by `survey_date`, latest value + vs BM as subtitle. Caveat: instrument switches (Liberty Zoom→Glint) not adjusted.

Shared: client filter chips applying across all four views (persist in localStorage), and a "data as of" stamp from `max(change_log.created_at)`.

## 4. Later (after NBA outcomes table exists, Q3)

Add view 5: **Advice → outcome** — per client, last cycle's Top-3 NBAs with the targeted item's next-cycle delta. This is the commercial money-chart; schema lands with roadmap W5.

## 5. Conventions

New page + recharts install = **methodology/feature change → version bump** (v0.12.0) in `version_log` + Log tab, per the versioning rule. The benchmarks-chart fill-in alone would be content-level; ship both together under the bump.

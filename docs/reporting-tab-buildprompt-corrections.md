# Reporting tab — build-prompt corrections (verified against live DB, 2026-06-01)

Checked the build prompt against Supabase project `jdzaypckluncdwsoxurs` (live) and against the
app's actual theme system. Verdict: the **data definitions are almost entirely correct** — a few
caveats are now stale. The **Design section is wrong for this app** and must be re-pointed at the
app's CSS-variable theme so the tab follows dark mode like every other lane.

---

## 1. Field-name check — all referenced columns exist ✓

Every column the prompt uses is present on `opportunities` and `companies`:
`id, company_id, company_name, status, stage, product_line, est_revenue, actual_revenue,
probability, close_date, actual_close_date, start_date, end_date` and `companies.id/name/type/country`.
No renames. The recent v1.4.0 change did **not** rename these.

### Distinct values (live counts)

| Field | Values (count) | Notes |
|---|---|---|
| `opportunities.stage` | `past` 84 · `active` 22 · `opportunity` 14 · `onboarding` 2 | Matches prompt exactly. The new stage names in the v1.4.0 changelog (qualify/develop/proposal/close/sleeping) are the **leads/funnel** stages, **not** `opportunities.stage`. No change needed. |
| `opportunities.status` | `Won` 44 · `Lost` 62 · `Open` 2 · NULL 14 | Matches prompt. |
| `product_line` | `Glint` 97 · `ROI` 13 · NULL 5 · `Other` 4 · `Glint Consultancy Services` 2 · `Glint Onboarding Services; Glint Consultancy Services` 1 | Bucket rule holds: `LIKE 'Glint%'` correctly catches the two "Glint …" variants. A literal `'Other'` value exists — still maps to Other. ✓ |
| `companies.type` | `Prospect` 103 · `Partner` 49 · `Customer` 33 · `Relation` 1 · `Company` 1 | **33 Customers ✓.** But two extra types exist — `Relation` and `Company`. The region/status logic only branches on Customer/Partner/Prospect, so these two rows will fall through. Treat any non-Customer as the "Partner-Prospect" pill. |

### Date fields — one thing to know
`close_date` is populated on 112/122 rows, `actual_close_date` on 100, and there is **also an
`est_close_date`** column (108) that the prompt does not use. The prompt's
`COALESCE(actual_close_date, close_date)` is the right choice — **every Won deal resolves to a
quarter** (0 Won deals with no date). Leave `est_close_date` out.

### Adecco / LHH
`Adecco Group` exists as a Customer (1 row) — exclude as specified. `LHH` exists as a separate
Customer row ✓.

---

## 2. Data-quality caveats — refresh the numbers (some are now stale)

| # | Prompt's caveat | Live reality (2026-06-01) | Action |
|---|---|---|---|
| 1 | Won deals with `actual_revenue = 0/NULL` | **0 such rows right now** | Keep the defensive `COALESCE`, but the warning will be empty today. Don't hardcode it as "present". |
| 2 | Active/onboarding deals with NULL status | **2 rows: `Breitling`, `BioMarin Pharmaceutical Inc`** (both `active`) | Real — show as warning + the Won-toggle. |
| 3 | Won revenue on non-Customer accounts | **3 rows, exactly as the prompt guessed:** `Microsoft Corp` (Partner, ROI), `European Training Foundation (ETF)` (Prospect, Glint), `PIMCO Prime Real Estate` (Prospect, Glint) | Real — include + tag. |
| 4 | `probability` poorly maintained → show win-rate cross-check | **No longer true.** As of v1.4.0 probability is **stage-driven** and 100% populated on open deals (values 20/40/60 only). | Reword: weighted pipeline is now effectively a *stage weighting*, not independent sales judgement. Still worth showing win-rate alongside, but explain that probability ≈ stage. |
| 5 | `created_on` is the migration date | Confirmed — both `created_on` and `created_at` exist; neither is a true start. | Don't use for timelines ✓. |
| — | Missing country → "e.g. BMC Software" | **Confirmed: exactly 1 — `BMC Software`.** | Default EMEA + flag ✓. |

### Sanity-check totals (live, for reconciliation)
- Won revenue: **€1,113,770** across **44** deals — already above the €1M target.
- Win rate: 44 / (44+62) = **41.5%**.
- Open pipeline (gross): **€591,228** (14 deals). Weighted: **€340,303**.

Do not hardcode these — they're here only so you can confirm the live queries reconcile.

---

## 3. Design — replace the "Light theme" section entirely

The build prompt specifies a **light-only** palette with hardcoded hex and **Geist** fonts. The app
does **not** work that way. It themes via a CSS-variable system toggled on `document.body`
(`theme-light` / `theme-dark`, persisted in `localStorage` key `bd_theme`; see `BDApp.jsx`). Geist
is not loaded anywhere — the app uses Apple SF Pro. **For the tab to match dark mode, it must use
the tokens below, never hardcoded light hex.**

### Surface / text / structure — use tokens (auto dark + light)

| Prompt said (light hex) | Use instead (token) | Dark value it resolves to |
|---|---|---|
| bg `#f7f8f6` | `var(--bg-0)` | `#000000` |
| surface `#ffffff` | `var(--bg-1)` | `#1c1c1e` |
| (raised/inset) | `var(--bg-2)` / `var(--bg-3)` | `#161618` / `#232326` |
| border `#e7e8e2` | `var(--sep)` / `var(--sep-strong)` | rgba(255,255,255,.08 / .14) |
| KPI green tint `#eef5f0` | `var(--good-tint)` | rgba(50,213,131,.?) |
| text | `var(--text-1/2/3/4)` | `#f5f5f7` → faded |
| corner radius `12px` | `var(--radius-card)` | `10px` (app standard) |
| shadows | `var(--shadow-1/2)` | dark-tuned |
| Geist (UI) | `var(--font-display)` / `var(--font)` | SF Pro |
| Geist Mono (numbers) | `var(--font-mono)` | SF Mono — **keep all numbers mono + right-aligned** |

### Chart series — define per-theme, don't ship light-only hex
The prompt's chart colors are tuned for a white background and look muddy on the near-black dark
surface. Define each series with a dark variant (or reuse app tokens):

| Series | Light | Dark (suggested) | App token to consider |
|---|---|---|---|
| Glint | `#1d9e75` | `#2ecf94` | `--good` `#32d583` |
| ROI | `#3a82c4` | `#4da6ff` | `--accent` `#409cff` (dark) |
| Target line | navy `#1f2a3a` | light line `#8a93a3` | `var(--text-3)` |
| Trend line | `#8a6fb5` | `#b89be0` | — |
| Dormant / shortfall | coral `#cf6240` | `#ff6b6b` | `var(--danger)` |
| Recurring tones | lighter Glint/ROI | lighter dark variants | — |

Recharts specifics for dark: axis ticks & legend `fill: var(--text-3)`, grid lines
`stroke: var(--sep)`, tooltip `background: var(--bg-1); border: 1px solid var(--sep)`. Read the
current theme from `document.body.classList.contains('theme-dark')` (or pass the `theme` prop down
from `BDApp`) and pick the series set accordingly.

"Client name in green when it has a live project" → `var(--good)`. Status pills → `--good-tint` /
`--warn-tint` / `--danger-tint`.

---

## 4. Integration (so it's a tab, not a standalone Vite app)
- Add `'reporting'` to `NAV_VIEWS` in `src/bd/BDApp.jsx` **right after `'comms'`** (line ~28).
- Create `src/bd/lane-reporting.jsx`, import it in `BDApp.jsx`, render it in the `activeView` switch.
- Reuse the existing `useBDData()` data layer if it already exposes deals/accounts, or add the
  reporting views (`v_won_by_quarter`, etc.) and query them through the existing `supabase` client
  in `src/supabase.js`. No second app, no second `.env`.
- Wrap panels in the app's existing card markup conventions and tokens so light/dark "just works".

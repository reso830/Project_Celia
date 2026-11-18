# Feature Specification: F05 — Forecaster

**Feature Branch**: `v3-005-forecaster`  
**Created**: 2026-11-18 (revised 2026-11-18)  
**Status**: Draft  
**Input**: `docs/features/v3-005-forecaster.md`  
**Design reference**: `handoff/celia_v3_001.zip` (hi-fi prototype: Forecaster screen `Money Tracker Hi-Fi.dc.html#L396-L491`, `L650-L678`, and `L1182-L1247`; `product-decisions.md`; `data/seed.json`)

---

## Clarifications

### Session 2026-11-18

- Q: What should serve as the authoritative baseline data source for projections? → A: Active Budget Model: Project future months using the active F03 budget model (planned income, planned expenses, planned savings allocations), with the current active savings buffer as starting cash reserves.
- Q: What forecast horizon options should the Forecaster support? → A: Fixed 24-Month Horizon: Align strictly with the prototype's 24-month horizon card, 24-bar outlook chart, and comparison matrix.
- Q: How should projections begin when the current month is already partially complete? → A: Current Calendar Month (Clean Baseline): Forecast month 0 is the current calendar month projected using the full baseline monthly figures, starting from the current savings buffer balance.
- Q: How should scenario adjustments and future financial events be structured? → A: Prototype Model: Support one-time buffer draw, monthly event additions (e.g. financed purchase, recurring, seasonal), and per-category budget nudges (±₱500 steps showing freed/funded funds).
- Q: Should standard demo scenarios (A · Loan now, B · Wait 6 mo, C · Cash) be seeded? → A: Seed Prototype Scenarios: Pre-seed Baseline plus Scenarios A, B, and C from the prototype for demo exploration, while allowing full user CRUD (create, edit, duplicate, delete).

### Session 2026-11-18 (Req-Review)

- Q: What is the authoritative baseline source, given that F03 has no "active model" flag on `budget_models`? → A: (Supersedes Session 2026-11-18 Q1) The baseline is the current calendar month's applied budget plan (`monthly_budget_plans` row for that month and its `monthly_budget_allocations`). Plans are immutable point-in-time snapshots, so edited or deleted models do not alter baseline history, and mid-month revisions (`is_revised`) are automatically included. If the current month has no applied plan, the screen renders an empty state: `No budget applied for {Month YYYY}.` with a link to `/models`. It does not fall back to an older plan. The baseline label derives dynamically from the plan's `model_name` rather than a hard-coded string.
- Q: How do savings-bucket nudges, expense nudges, and future events interact with Monthly Expense and Runway? → A: (Refines Session 2026-11-18 Q4) Per Constitution Principle IV ("Savings are not expenses"):
  - `Monthly expense = Σ expense-category allocations + Σ events − Σ freed on expense-category nudges`.
  - Savings-bucket nudges affect **only Unallocated** cash flow, never Monthly expense or Runway.
  - `Unallocated = income − expense allocations − savings allocations − Σ events + Σ freed (all nudges)`.
  - `Runway = buffer after ÷ monthly expense`.
  - Events are strictly cost additions (`monthly_amount > 0`), displayed as `−₱X/mo`. Income adjustments and income events are non-goals.
  - Nudges apply exclusively to expense categories and savings buckets, never to income categories.
- Q: How are event types, event timing, and scenario offsets structured? → A: (Refines Session 2026-11-18 Q4)
  - Event types are strictly: `financed purchase`, `recurring`, and `seasonal`. (The `one-time` type is removed; capital lump sums are modeled by the scenario's buffer `draw_amount`).
  - Every event is a flat monthly cost. A `seasonal` event represents the flat monthly equivalent of an annual or irregular cost (e.g. ₱9,600/year = ₱800/month); helper text in the event modal clarifies this rule.
  - Events have no start month. Events take effect when the scenario starts. An optional, nullable `description` is supported.
  - Scenario `start_month` is an integer index from `0` to `23`. (The baseline's sentinel value `24` is removed; baseline stores `0` and the value is ignored).
  - Cards and the comparison table display the steady-state post-startMonth outlook (with draw and ongoing adjustments applied). The 24-month chart displays the step transition from baseline to steady-state at `start_month`.
- Q: How are budget nudges persisted, merged, and validated? → A: (Refines Session 2026-11-18 Q4)
  - Nudges store a single signed `delta_amount` in integer centavos (`INTEGER NOT NULL`). A negative delta represents a budget reduction, which frees funds (`+₱X freed`).
  - Read-time derivations: `adjusted = max(0, base + delta)` and `freed = base − adjusted`. `adjusted_amount` and `freed_amount` are removed from the database schema and mutation APIs.
  - Nudges use plain foreign keys with no `ON DELETE` action (`REFERENCES categories(id)`, `REFERENCES savings_buckets(id)`).
  - Category merge integration: `categories-service.ts` calls `mergeCategoryNudges(database, sourceId, targetId, now)` within its merge transaction. If the target already has a nudge, their deltas are summed.
  - Post-merge base budget derivation: when a nudge is attached to a surviving category, its base budget is calculated as the effective budget of the surviving category including all categories merged into it (transitive merge closure).
  - Archived target protection: attempting to apply a nudge to an archived category or bucket via `PUT /api/scenarios/[id]/nudges` returns `409 Conflict` with code `archived`. Existing nudges on archived targets are retained, displayed with an `(archived)` badge and disabled stepper controls.
  - Save concurrency & interim failure continuity: saves for the same nudge row are processed sequentially (one-at-a-time per row) to prevent out-of-order responses. If an older save fails while a newer edit is queued behind it, the newer edit remains visible in the UI and is dispatched next, with an error toast alerting the user of the interim sync failure. Only if the final queued edit fails (with no subsequent edit queued) does the row roll back to the confirmed server delta. Switching scenarios flushes pending writes immediately.
  - Seed deltas & keys:
    - Scenario A: Groceries −₱2,000 (`-200000`), Dining out −₱2,000 (`-200000`, using category name key `"dining out"`), Transport −₱4,500 (`-450000`), Car down payment +₱5,000 (`+500000`, adjusted ₱15,000, referring to bucket `car` with `nameKey: 'car down payment'`).
    - Scenario B: Dining out −₱1,000 (`-100000`, using category name key `"dining out"`).
    - Scenario C: Dining out −₱2,000 (`-200000`, using category name key `"dining out"`).
- Q: How does seeding interact with the baseline scenario and database? → A: Seeding requires an otherwise empty database (wiped via `npm run clear -- --yes`). `seedDemoData` in `src/server/demo.ts` skips creating the baseline row (since Migration 4 creates it), and seeds scenarios A, B, and C with category name key `"dining out"` and bucket `id: 'car'`. `scripts/seed.json`'s scenario entries are rewritten to match the `data-model.md §3` schema. `getClearSummary` counts `WHERE is_baseline = 0`.
- Q: How is the base budget calculated after a category merge? → A: Using a recursive CTE, the read model traverses transitive merges (`merged_into_category_id`) so the surviving category's base budget includes allocations from all categories transitively merged into it.
- Q: How are brief items not delivered in F05 tracked and accounted for? → A: Explicitly listed as Non-goals citing brief sections (D5): selectable horizon (§3.2, AC3), income adjustments/events (§3.4, AC6), temporary vs ongoing toggles, per-month detail breakdown table (§3.2, AC4), contextual observations / AI nudges (§3.8, AC11–12), and historical-actuals overlay (AC2). AC2 is satisfied because every value is projected and explicitly labeled. AC11 is satisfied because projected deficits render in bold red unallocated text and the polyline/bars dip below the zero axis.
- Q: What are the exact baseline invariants, runway edge cases, chart scales, palette keys, and API error formats? → A:
  - Baseline row is inserted by Migration 4 using ISO-8601 timestamp (`new Date().toISOString()`), and preserved by `clearAllData` (`src/server/demo.ts`). `getClearSummary` counts non-baseline scenarios only (`WHERE is_baseline = 0`) so `seedDemoData` succeeds on clean installs. All baseline write attempts (rename, draw, events, nudges, duplicate, delete) return `409 Conflict` with error code `invalid_state`.
  - Runway edge cases & rounding:
    - Runway is rounded to 0.1 decimal place (`Math.round(raw * 10) / 10`) matching `calculateSavingsKpis`.
    - **Overdrawn buffer wins**: When `bufferAfter <= 0` (zero or negative buffer), runway is strictly `0.0 mo` and verdict is `Risky buffer`, regardless of monthly expenses.
    - When `bufferAfter > 0` and `monthlyExpense === 0`: runway displays `—`, and the verdict derives from cash flow alone: `Comfortable` if unallocated $\ge 0$, otherwise `Risky buffer`.
  - Chart bars and lines:
    - Baseline bars are flat across 24 months (removes the `1 + i * 0.004` mock growth trend). When baseline is negative ($U_0 < 0$), bars hang downwards from the zero rule line.
    - Positive bars are sized relative to the zero-rule container as `heightRatioInContainer = heightRatio / zeroRuleRatio = U_0 / domainHi`, ensuring their tops meet the baseline polyline at $U_0$ exactly.
    - When Baseline is selected, the chart renders all alternative scenario polylines over the baseline bars. When an alternative scenario is selected, its polyline renders at full opacity (1.0), and other alternative scenario lines render dimmed (`opacity: 0.35`).
    - Scaling handles negative baseline, all-negative scenarios, and all-zero data cleanly.
  - Palette tokens & domain separation:
    - Scenarios store only `palette_key` from 5 options: `teal`, `purple`, `gold`, `blue`, `slate`. Columns `color`, `tint`, `ink`, and `dash` are removed from the database schema; colors and dashes are mapped exclusively in the UI presentation layer using the prototype's scenario colors (`teal #2f7d78`, `purple #7c6f9a`, `gold #a17c3f`) alongside newly added options grounded in Celia's tokens (`blue #2563eb`, `slate #7d8ba8`).
    - The baseline scenario receives its own fixed styling (`#3a4145`, tint `#e8eaea`, ink `#14181a`, solid line).
    - Domain layer returns pure verdict tiers (`ForecastVerdictTier`), status tones (`ForecastStatusTone`), and chart points normalized to $0..1$. Zero hex colors and zero SVG coordinates in domain code.
    - Funded text uses accessible amber `#8a6516` everywhere.
  - View model & contract alignment:
    - `contracts/api.md §3` delegates to `data-model.md §1` (`ForecasterViewData`) as the sole source of truth; no formatted strings exist in domain records.
  - Scenario IDs & API errors:
    - Route accepts stable demo IDs (`baseline`, `a`, `b`, `c`) as well as standard UUIDs.
    - API errors use the standard Celia format `{ error: { code, message, field? } }` from `src/server/http.ts:72-99`.

---

## Problem Statement

Users need a way to look forward and test hypothetical financial decisions without risking or altering their actual financial records. In Celia, F01–F04 provide historical tracking, transaction management, monthly budget planning, and historical dashboard reporting. However, users cannot easily evaluate forward-looking questions such as:
- *"Can we afford a car loan of ₱18,430/month starting in 5 months?"*
- *"What happens to our savings runway if we pay cash (₱518,500) from our buffer instead?"*
- *"How much budget do we need to trim across groceries and dining out to keep our runway above 6 months?"*

F05 delivers the **Forecaster** screen (`/forecaster`), allowing users to project their financial trajectory over a 24-month outlook, create hypothetical scenarios with one-time buffer draws, recurring financial events, and budget category nudges, and compare alternative scenarios side-by-side against a baseline derived from the current month's applied budget plan.

---

## Scope

### In Scope

- **Forecaster Screen (`/forecaster`)**:
  - **Scenario Selector Bar**:
    - Chips for all active scenarios: Baseline (styled with fixed dark neutral style `#3a4145`), Scenario A (`teal`), Scenario B (`purple`), Scenario C (`gold`), and custom user scenarios selected from fixed palettes (`teal`, `purple`, `gold`, `blue`, `slate`).
    - Active scenario chip visually highlighted with tinted background, colored border, and contrasting text.
    - `+ scenario` dashed button to launch scenario creation modal.
  - **Left Column — Scenario Inputs (`minmax(260px, 320px)`)**:
    - **"What changes" Card**:
      - Header with event count badge (`N events`).
      - Explanatory subtitle (`"click an event to edit it"`).
      - Event list showing name, type (`financed purchase`, `recurring`, `seasonal`), and monthly impact formatted as `−₱X/mo`.
      - Click on an event opens Edit Event modal.
      - Empty state for scenarios with no events: `"No events — this is the baseline."`.
      - `+ add event` dashed button opening Add Event modal (hidden on Baseline).
      - Net monthly impact summary line: `"Net monthly impact"` with bold mono total (e.g. `−₱26,430`).
    - **"Nudge the budget" Card**:
      - Subtitle: `"drag to rebalance — 'freed' is money released"`.
      - Grouped list of all active and archived expense categories and savings buckets that have a base allocation in the applied plan or an existing nudge delta.
      - Category nudge row displaying category/bucket name, group (`EXPENSES` or `SAVINGS`), current value, and status text:
        - `+₱X freed` (green `#2c6647`) when spending is decreased (`delta < 0`).
        - `−₱X funded` (accessible amber `#8a6516`) when spending or savings allocation is increased (`delta > 0`).
      - Stepper controls `−` and `+` stepping allocations in ±₱500 increments (50,000 centavos):
        - `+` increases the allocation (more spending/savings, less freed funds).
        - `−` decreases the allocation (less spending/savings, more freed funds).
      - Steppers on archived targets are disabled, marked with an `(archived)` badge.
      - Visual slider track with colored fill ratio (`#2f7d78` for freed, `#d3a13f` for funded) and non-draggable visual knob. Fallback fill for base = 0 is 50%.
      - Optimistic UI updates with sequential per-row queue, last-write-wins API persistence, and error rollback.
  - **Right Column — Outlook & Comparison**:
    - **Scenario Header**: Displays the active scenario name/label.
    - **Hero KPI Grid (3 Cards — Steady State Post-Change)**:
      - **VERDICT Card**: Tinted card background with 3-tier status chip:
        - `Comfortable` (green `#2c6647`, background `#f1f7f3`, border `#bcd7c8`): Runway $\ge 6.0$ months with non-negative net cash flow ($U_S \ge 0$), or zero expenses with $U_S \ge 0$ and positive buffer.
        - `Tight but doable` (accessible amber `#8a6516`, background `#fdf9f0`, border `#e6d4a8`): Runway $\ge 6.0$ months with negative cash flow ($U_S < 0$), or runway 3.0–5.9 months with positive cash flow ($U_S \ge 0$).
        - `Risky buffer` (red `#8a3b28`, background `#fdf6f3`, border `#e3c1b7`): Overdrawn buffer ($B_S \le 0$, runway `0.0 mo`), or runway $< 3.0$ months, or runway $< 6.0$ months with negative cash flow ($U_S < 0$), or zero expenses with negative cash flow.
        - Subtitle: `"24-month horizon"`.
      - **RUNWAY Card**: Large mono display of projected runway in months (`N.N mo`, rounded to 0.1, clamped at minimum `0.0 mo` for overdrawn buffers, or `—` when zero expenses and positive buffer). Subtitle comparing to baseline runway (`"from N.N mo"`).
      - **MONTHLY UNALLOCATED Card**: Large mono display of steady-state monthly unallocated funds (signed `+₱X` green or `−₱X` red). Subtitle showing buffer draw status (`"₱X drawn from the buffer"` or `"buffer untouched"`).
    - **24-Month Outlook Chart**:
      - 24 flat vertical bars representing baseline monthly unallocated funds across 24 calendar months ($M_0$ through $M_{23}$), anchored to the current month. When baseline unallocated is negative, bars hang downwards below the zero line.
      - 1px solid horizontal zero rule line.
      - Overlaid multi-scenario polylines: each scenario plots baseline unallocated for months prior to `start_month`, transitioning to steady-state unallocated at `start_month`.
      - When Baseline is selected, draws all alternative scenario lines. When an alternative scenario is selected, its polyline renders at full opacity (1.0), and other alternative lines render dimmed (`opacity: 0.35`).
      - 4 timeline milestone labels: Month 0 (e.g. `Oct 2026`), Month 6 (`Apr 2027`), Month 12 (`Oct 2027`), and Month 23 (`Sep 2028`).
      - Accessible text summary table / visually hidden description for screen readers.
      - Color-coded legend with baseline unallocated key and scenario colors.
    - **Scenarios Side by Side Comparison Table**:
      - Subtitle: `"runway = buffer ÷ monthly expense"`.
      - Horizontally scrollable container with the label column pinned (`sticky left-0 bg-white`).
      - Columns: Metric label column followed by Baseline and each alternative scenario.
      - Steady-state rows:
        1. `Monthly expense`: `Base Expense + Σ Events − Σ Freed (Expense Nudges)`.
        2. `Unallocated`: `Base Unallocated − Σ Events + Σ Freed (All Nudges)`.
        3. `Drawn from buffer`: One-time capital draw (`₱X` or `"—"` if 0).
        4. `Buffer after`: Starting active buffer balance minus drawn capital.
        5. `Runway`: Calculated rounded runway (`Buffer after ÷ Monthly expense`, min `0.0 mo` or `—`).
        6. `Verdict`: Formatted status badge for each scenario.
- **Scenario Management & CRUD**:
  - Create Scenario Modal: Name, short label (uppercase badge text), start month offset (`0..23`), initial lump-sum buffer draw amount (₱, $\ge 0$), fixed palette selection (`teal`, `purple`, `gold`, `blue`, `slate`).
  - Edit Scenario Modal: Edit existing scenario properties, or delete scenario (Baseline write attempts return 409 `invalid_state`).
  - Duplicate Scenario Action: Creates a full copy of an existing non-baseline scenario including all its events and nudges.
- **Event Management Modal**:
  - Modal to create or edit an event: Name, type (`financed purchase`, `recurring`, `seasonal`), monthly amount (₱, integer $> 0$), optional description. Helper text explains that seasonal events represent the flat monthly equivalent of an annual cost.
- **Persistence & Seeding**:
  - SQLite tables: `scenarios`, `scenario_events`, and `scenario_nudges` with strict foreign keys and integer checks via Migration 4.
  - Migration 4 automatically inserts the Baseline row with ISO-8601 timestamp. `clearAllData` preserves the Baseline row.
  - Seed dataset contains Baseline 2026 and prototype demo scenarios (A · Loan now, B · Wait 6 mo, C · Cash) using signed centavo deltas and stable IDs.

### Non-Goals

The following items from the feature brief are explicitly excluded from F05:
1. **Selectable forecast horizon** (brief §3.2, AC3): Celia v3 Forecaster uses a fixed 24-month horizon matching the prototype.
2. **Income adjustments and income events** (brief §3.4, §3.5, AC6): Nudges apply exclusively to expense categories and savings buckets; events are costs only (`amount > 0`).
3. **Temporary vs. ongoing change toggles**: All scenario adjustments represent steady-state shifts from `start_month` onward.
4. **Per-month detail breakdown table** (brief §3.2, AC4): Monthly values are presented via the 24-month visual outlook chart and the side-by-side steady-state comparison table.
5. **Contextual observations / AI financial advice** (brief §3.8, AC11–12): Celia v3 relies on deterministic 3-tier verdicts and visual deficit indicators; automated text advice is out of scope.
6. **Historical-actuals chart overlay** (brief AC2): Historical actuals belong to the Dashboard (F04); Forecaster projects forward from the current month's applied budget plan.
7. **Debt amortization engines and compounding interest**: Monthly payments are treated as fixed cash flow impacts.
8. **Automated bank synchronization, multi-currency forex, and tax forecasting**.

---

## User Scenarios & Acceptance Criteria

### User Story 1 — Baseline Financial Outlook (Priority: P1)

As a household administrator, I want to view our household's 24-month baseline financial trajectory derived from our current month's applied budget plan and savings buffer so I can understand our financial trajectory if our current habits continue unchanged.

**Independent Test**: Ensure the database is seeded (`npm run seed`), navigate to `http://127.0.0.1:3000/forecaster`. Verify the Baseline scenario is selected by default, displaying 24 flat outlook bars, calculated runway matching `Starting Buffer ÷ Planned Monthly Expenses` (₱466,000 ÷ ₱79,000 = `5.9 mo`), verdict badge `Tight but doable`, and a comparison table populated with baseline values.

**Acceptance Criteria**:
1. Forecaster page loads at `/forecaster` within the shell layout.
2. Baseline projection uses the current calendar month's row in `monthly_budget_plans` and its `monthly_budget_allocations`. The baseline scenario name displays the plan's `model_name` (e.g. `"Baseline 2026"`).
3. If no budget plan is applied for the current calendar month, the screen renders an empty state: `No budget applied for {Month YYYY}.` with an actionable link to `/models`.
4. Starting cash reserves equal the total balance of currently active savings buckets that have `countsTowardBuffer = 1` (₱466,000 in seed data).
5. The 24-month outlook displays 24 flat bars representing monthly baseline unallocated funds ($M_0$ through $M_{23}$), starting cleanly with the current calendar month. When baseline is negative, bars render hanging below the zero line.
6. When Baseline is selected, the chart renders all alternative scenario polylines over the baseline bars.
7. Timeline renders 4 milestone labels corresponding to $M_0$, $M_6$, $M_{12}$, and $M_{23}$ formatted as `MMM YYYY`.
8. Baseline runway displays `Starting Buffer ÷ Baseline Monthly Expenses` rounded to 0.1 decimal place formatted as `"N.N mo"` (5.9 mo). If baseline expenses are 0 and buffer is positive, runway displays `"—"`.
9. Baseline verdict card evaluates rounded runway and monthly flow: for ₱79,000 expense, +₱20,500 unallocated, and 5.9 mo runway, verdict displays `Tight but doable` (accessible amber `#8a6516`).
10. "What changes" card displays: `"No events — this is the baseline."` with the `+ add event` button hidden.

---

### User Story 2 — Scenario Switching & Side-by-Side Comparison (Priority: P1)

As a user, I want to switch between different financial scenarios and compare their runway, monthly unallocated cash flow, and buffer impact side-by-side against the baseline.

**Independent Test**: Navigate to `/forecaster`, click the chip for "A · Buy now, 5-yr loan", then "C · Pay cash". Verify the active scenario details update immediately, the hero cards reflect that scenario's steady-state metrics, the outlook chart highlights the selected scenario polyline at full opacity while dimming others, and the "Scenarios side by side" table displays all scenarios aligned with confirmed figures.

**Acceptance Criteria**:
1. Scenario selector displays chips for all saved scenarios (Baseline, A, B, C, and custom).
2. Clicking a scenario chip activates that scenario and visually highlights its chip using the scenario's designated palette color, tint, and border.
3. The comparison table lists Baseline and all active alternative scenarios side-by-side with columns:
   - `Monthly expense`: `Base Expenses + Σ Events − Σ Freed (Expense Nudges)`.
   - `Unallocated`: `Base Unallocated − Σ Events + Σ Freed (All Nudges)`.
   - `Drawn from buffer`: One-time buffer draw formatted as `₱X` or `"—"` when zero.
   - `Buffer after`: `Starting Buffer − Drawn from buffer`.
   - `Runway`: Calculated runway (`Buffer after ÷ Monthly expense`), rounded to 0.1, clamped at minimum `0.0 mo` for overdrawn buffers.
   - `Verdict`: 3-tier badge with corresponding background, text, and border styling.
4. Exact seeded figures match:
   - **Baseline**: Expense ₱79,000, Unallocated +₱20,500, Buffer after ₱466,000, Runway `5.9 mo`, Verdict `Tight but doable`.
   - **Scenario A**: Expense ₱96,930, Unallocated −₱2,430, Buffer after ₱367,500, Runway `3.8 mo`, Verdict `Risky buffer`.
   - **Scenario B**: Expense ₱100,400, Unallocated −₱900, Buffer after ₱466,000, Runway `4.6 mo`, Verdict `Risky buffer`.
   - **Scenario C**: Expense ₱84,200, Unallocated +₱15,300, Buffer after −₱52,500, Runway `0.0 mo`, Verdict `Risky buffer`.
5. The 3-tier verdict logic evaluates rounded runway:
   - Overdrawn buffer ($B_S \le 0$): verdict is always `"Risky buffer"`.
   - Zero expenses with positive buffer: verdict is `"Comfortable"` if $U_S \ge 0$, `"Risky buffer"` if $U_S < 0$.
   - If `Monthly Unallocated < 0`:
     - Runway $\ge 6.0$ mo $\rightarrow$ `"Tight but doable"` (accessible amber `#8a6516`)
     - Runway $< 6.0$ mo $\rightarrow$ `"Risky buffer"` (red `#8a3b28`)
   - If `Monthly Unallocated \ge 0`:
     - Runway $\ge 6.0$ mo $\rightarrow$ `"Comfortable"` (green `#2c6647`)
     - Runway $3.0 \le \text{Runway} < 6.0$ mo $\rightarrow$ `"Tight but doable"` (accessible amber `#8a6516`)
     - Runway $< 3.0$ mo $\rightarrow$ `"Risky buffer"` (red `#8a3b28`)
6. The 24-month outlook chart renders a polyline for each scenario transitioning from baseline unallocated to steady-state unallocated at `start_month`. The selected scenario's line renders at full opacity (1.0), while non-selected scenario lines render dimmed (`opacity: 0.35`).

---

### User Story 3 — Budget Nudges & Rebalancing (Priority: P2)

As a user, I want to adjust category and bucket budgets using quick step controls to see how much money is freed or required to support a scenario.

**Independent Test**: Under Scenario A, locate the Groceries row under "Nudge the budget". Click `+` to raise the allocation by ₱500. Confirm the value updates from ₱18,000 to ₱18,500, freed funds decrease from ₱2,000 to ₱1,500, and Monthly Expense, Monthly Unallocated, and Runway recalculate in real-time.

**Acceptance Criteria**:
1. "Nudge the budget" card lists all active and archived expense categories and savings buckets with a base allocation or an existing nudge delta.
2. Each nudge row displays category name, group label (`EXPENSES` or `SAVINGS`), current allocation value, and status chip:
   - When freed amount $> 0$ (`delta < 0`): Displays `+₱X freed` with green styling (`#2c6647`).
   - When freed amount $< 0$ (`delta > 0`): Displays `−₱X funded` with accessible amber styling (`#8a6516`).
   - When freed amount $= 0$ (`delta = 0`): Displays `₱0 freed`.
3. Steppers `−` and `+` adjust the category allocation by ₱500 (50,000 centavos):
   - `+` increases allocation (higher spend/savings, less freed funds).
   - `−` decreases allocation (lower spend/savings, more freed funds).
4. The adjusted allocation cannot fall below ₱0.
5. Savings-bucket nudges adjust ONLY Unallocated cash flow; they never modify Monthly expense or Runway.
6. Archived categories and buckets display with an `(archived)` badge and disabled stepper controls. Attempting to nudge an archived target via the API returns `409 Conflict` with code `archived`.
7. On category merge, nudges re-point to the surviving category and sum their deltas. Effective base budget includes allocations from categories merged into it.
8. Nudge adjustments persist via `PUT /api/scenarios/[id]/nudges` storing signed `delta_amount`. Saves for the same row run sequentially. On network failure, client rolls back to server value and shows an error toast. Pending writes flush before switching scenarios.

---

### User Story 4 — Future Financial Events (Priority: P2)

As a user, I want to add, edit, and remove hypothetical financial cost events (such as a vehicle payment, maintenance, or seasonal insurance) within a scenario.

**Independent Test**: Select Scenario A, click `+ add event`. Enter name "Annual Insurance", type "seasonal", amount ₱1,200/mo, and save. Confirm "Annual Insurance" appears in the "What changes" list, event count updates, net monthly impact updates, and runway updates. Click "Annual Insurance" to edit or delete it.

**Acceptance Criteria**:
1. "What changes" card displays all events associated with the selected scenario.
2. Event types are strictly: `financed purchase`, `recurring`, and `seasonal`.
3. Each event row displays event name, event type badge, and monthly impact formatted as `−₱X/mo`.
4. Seasonal events represent the flat monthly equivalent of an annual or irregular cost (e.g. ₱9,600/yr = ₱800/mo), with helper text stating this in the event modal.
5. Clicking `+ add event` opens the Add Event modal with fields:
   - `name`: Text (required, non-empty, max 50 chars).
   - `type`: Dropdown (`financed purchase`, `recurring`, `seasonal`).
   - `monthlyAmount`: Positive integer centavos (> 0).
   - `description`: Optional text.
6. Clicking an event row opens the Edit Event modal with option to update or delete the event.
7. Baseline scenario hides `+ add event` and displays: `"No events — this is the baseline."`.

---

### User Story 5 — Scenario Management & CRUD (Priority: P2)

As a user, I want to create new scenarios from a fixed palette, duplicate existing ones to explore subtle variations, and delete scenarios I no longer need.

**Independent Test**: Click `+ scenario`, enter name "D · Secondhand car", short label "D · SECONDHAND", start month 6, lump-sum buffer draw ₱50,000, pick color palette key `purple`. Save and confirm new scenario chip appears. Duplicate Scenario A, verify a clone with identical events and nudges is created. Delete the cloned scenario.

**Acceptance Criteria**:
1. Clicking `+ scenario` opens the Create Scenario modal.
2. Modal fields include:
   - `name`: Full scenario title (required).
   - `shortLabel`: Uppercase badge label (required).
   - `startMonth`: Integer month offset (`0..23`).
   - `drawAmount`: Initial lump-sum capital drawn from savings buffer (default ₱0, $\ge 0$).
   - `paletteKey`: Fixed scenario palette selection (`teal`, `purple`, `gold`, `blue`, `slate`).
3. Users can duplicate any non-baseline scenario. Duplicating creates a new scenario with `(Copy)` appended, cloning all child events and nudges.
4. Users can delete custom scenarios.
5. Baseline row is protected: cannot be renamed, given a draw or events, nudged, duplicated, or deleted. Any write attempt returns 409 `invalid_state`.
6. All scenarios, events, and nudges persist across browser reloads. Route accepts stable IDs (`baseline`, `a`, `b`, `c`) and UUIDs.

---

### User Story 6 — Empty, Validation, and Zero-Data States (Priority: P3)

As a user, I want clear feedback when underlying data is missing or calculations encounter edge cases.

**Independent Test**: Clear database with `npm run clear -- --yes`. Navigate to `/forecaster`. Verify a clean empty state prompt informs the user that no budget is applied for the current month.

**Acceptance Criteria**:
1. When no budget plan is applied for the current calendar month in `monthly_budget_plans`:
   - Renders empty state prompt: `No budget applied for {Month YYYY}.` with a link to `/models`.
2. When starting savings buffer balance is ₱0:
   - Buffer displays `₱0`.
   - If expenses $> 0$, runway displays `0.0 mo` and verdict displays `Risky buffer`.
3. When monthly expenses evaluate to ₱0:
   - If buffer is positive: runway displays `—`, verdict evaluates from cash flow alone (`Comfortable` if $U_S \ge 0$, otherwise `Risky buffer`).
   - If buffer is zero or negative: runway displays `0.0 mo` and verdict displays `Risky buffer`.
4. When a scenario's buffer draw exceeds starting savings buffer ($B_S \le 0$):
   - Buffer after displays negative balance formatted with critical red tone (e.g. `−₱52,500`).
   - Runway clamps at `0.0 mo` (never negative).
   - Verdict evaluates to `Risky buffer`.
5. Modals validate non-empty strings, positive integer centavos for events, and valid ranges before submission.

---

## Edge Cases

1. **Zero Active Savings Buffer**:
   - If the household has no active savings buckets or all buckets have balance ₱0, starting buffer is ₱0. Runway is `0.0 mo` and verdict is `Risky buffer`.
2. **Buffer Draw Exceeds Total Buffer**:
   - In Scenario C (Pay cash), capital purchase draws more than available reserves (`buffer - draw < 0`). "Buffer after" displays negative amount (`−₱52,500`), runway is clamped at `0.0 mo`, and verdict is `Risky buffer`.
3. **Zero Expenses in Scenario**:
   - If expenses are 0 and buffer is positive: runway displays `—`, verdict evaluates cash flow alone (`Comfortable` if $U_S \ge 0$, `Risky buffer` if $U_S < 0$).
   - If expenses are 0 and buffer is zero or negative: overdrawn buffer rule wins, runway is `0.0 mo`, and verdict is `Risky buffer`.
4. **Category Renamed, Merged, or Archived**:
   - If a category is merged, nudges re-point to the surviving category and sum deltas. Base budget includes allocations of categories merged into it.
   - If a category or bucket is archived, it retains its nudge with an `(archived)` badge, non-steppable controls, and contributes to calculations. Nudging an archived category returns 409 `archived`.
5. **Negative Baseline Unallocated (Deficit)**:
   - When baseline has a deficit ($U_0 < 0$), chart vertical scaling handles negative domain gracefully without clipping; bars hang downwards from the zero line; zero rule line aligns dynamically.
6. **All-Zero or All-Negative Chart Values**:
   - Guarded scaling ensures `span` is never 0 and bars/polylines plot below the zero line without throwing errors.

---

## Data Considerations

### Database Schema (Migration 4)

Add three tables to the SQLite database via Migration 4 in `src/server/db/migrations.ts`:

```sql
CREATE TABLE scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) > 0),
  short_label TEXT NOT NULL CHECK (length(short_label) > 0),
  palette_key TEXT CHECK (
    (is_baseline = 1 AND palette_key IS NULL) OR
    (is_baseline = 0 AND palette_key IS NOT NULL AND palette_key IN ('teal', 'purple', 'gold', 'blue', 'slate'))
  ),
  start_month INTEGER NOT NULL DEFAULT 0 CHECK (
    start_month >= 0 AND start_month <= 23 AND typeof(start_month) = 'integer'
  ),
  draw_amount INTEGER NOT NULL DEFAULT 0 CHECK (
    draw_amount >= 0 AND typeof(draw_amount) = 'integer'
  ),
  is_baseline INTEGER NOT NULL DEFAULT 0 CHECK (is_baseline IN (0, 1) AND typeof(is_baseline) = 'integer'),
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (typeof(display_order) = 'integer'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX scenarios_baseline_unique
  ON scenarios (is_baseline)
  WHERE is_baseline = 1;

CREATE TABLE scenario_events (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) > 0),
  type TEXT NOT NULL CHECK (type IN ('financed purchase', 'recurring', 'seasonal')),
  monthly_amount INTEGER NOT NULL CHECK (
    monthly_amount > 0 AND typeof(monthly_amount) = 'integer'
  ),
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX scenario_events_scenario_id_idx ON scenario_events (scenario_id);

CREATE TABLE scenario_nudges (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('category', 'bucket')),
  category_id TEXT REFERENCES categories(id),
  bucket_id TEXT REFERENCES savings_buckets(id),
  delta_amount INTEGER NOT NULL CHECK (typeof(delta_amount) = 'integer'),
  updated_at TEXT NOT NULL,
  CHECK (
    (target_type = 'category' AND category_id IS NOT NULL AND bucket_id IS NULL) OR
    (target_type = 'bucket' AND bucket_id IS NOT NULL AND category_id IS NULL)
  )
);

CREATE UNIQUE INDEX scenario_nudges_category_unique
  ON scenario_nudges (scenario_id, category_id)
  WHERE category_id IS NOT NULL;

CREATE UNIQUE INDEX scenario_nudges_bucket_unique
  ON scenario_nudges (scenario_id, bucket_id)
  WHERE bucket_id IS NOT NULL;
```

Migration 4 automatically inserts the baseline row using an ISO-8601 string:
```typescript
const now = new Date().toISOString();
database.prepare(`
  INSERT INTO scenarios (
    id, name, short_label, palette_key, start_month, draw_amount, is_baseline, display_order, created_at, updated_at
  ) VALUES (
    'baseline', 'Baseline', 'BASELINE', NULL, 0, 0, 1, 0, ?, ?
  )
`).run(now, now);
```

### Seed Data Specification

Seed data (`scripts/seed.json` and seed runner `src/server/demo.ts:103`) maps scenarios to signed integer centavo deltas:
1. **Baseline**:
   - Auto-created by Migration 4. `seedDemoData` skips creating the baseline row. Its display name dynamically reflects the current month's applied budget plan `model_name` (e.g. `"Baseline 2026"`).
2. **Scenario A · Buy now, 5-yr loan**:
   - `id: 'a'`, `name: 'A · Buy now, 5-yr loan'`, `short_label: 'A · LOAN NOW'`, `palette_key: 'teal'`, `start_month: 5`, `draw_amount: 9850000` (₱98,500).
   - Events:
     - `Car` (`financed purchase`, ₱18,430/mo $\rightarrow$ 1,843,000 centavos)
     - `Running costs` (`recurring`, ₱7,200/mo $\rightarrow$ 720,000 centavos)
     - `Registration` (`seasonal`, ₱800/mo $\rightarrow$ 80,000 centavos)
   - Nudges:
     - `Groceries`: `delta_amount: -200000` (−₱2,000, frees ₱2,000)
     - `Dining out`: `delta_amount: -200000` (−₱2,000, frees ₱2,000)
     - `Transport`: `delta_amount: -450000` (−₱4,500, frees ₱4,500)
     - `Car down payment`: `delta_amount: 500000` (+₱5,000, funded −₱5,000; resolves to bucket id `car` with `nameKey: 'car down payment'`)
3. **Scenario B · Wait 6 months**:
   - `id: 'b'`, `name: 'B · Wait 6 months'`, `short_label: 'B · WAIT'`, `palette_key: 'purple'`, `start_month: 11`, `draw_amount: 0`.
   - Events:
     - `Car` (`financed purchase`, ₱15,200/mo $\rightarrow$ 1,520,000 centavos)
     - `Running costs` (`recurring`, ₱7,200/mo $\rightarrow$ 720,000 centavos)
   - Nudges:
     - `Dining out`: `delta_amount: -100000` (−₱1,000, frees ₱1,000)
4. **Scenario C · Pay cash**:
   - `id: 'c'`, `name: 'C · Pay cash'`, `short_label: 'C · CASH'`, `palette_key: 'gold'`, `start_month: 5`, `draw_amount: 51850000` (₱518,500).
   - Events:
     - `Running costs` (`recurring`, ₱7,200/mo $\rightarrow$ 720,000 centavos)
   - Nudges:
     - `Dining out`: `delta_amount: -200000` (−₱2,000, frees ₱2,000)

### Domain Calculation Functions

Pure functions in `src/domain/forecaster-calculations.ts`:
- `calculateScenarioMetrics(baseline, scenario)`: Computes `monthlyExpense`, `monthlyUnallocated`, `bufferAfter`, `runway`, and `verdict`. Overdrawn buffer always wins ($B_S \le 0 \implies 0.0\text{ mo}$, `Risky buffer`).
- `calculateVerdict(runway, monthlyUnallocated)`: Implements the 3-tier verdict matrix returning pure `{ tier: ForecastVerdictTier, statusTone: ForecastStatusTone }`.
- `calculate24MonthOutlook(baselineUnallocated, scenarios, startMonthKey)`: Generates flat bars (with signed direction/hanging for negative baseline) and normalized polyline coordinates $(x, y) \in [0, 1] \times [0, 1]$.
- `deriveNudgeAmounts(baseAllocation, deltaAmount)`: Computes `adjusted = max(0, base + delta)` and `freed = base - adjusted`.

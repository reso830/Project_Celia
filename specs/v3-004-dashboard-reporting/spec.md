# Feature Specification: F04 — Dashboard & Reporting

**Feature Branch**: `v3-004-dashboard-reporting`
**Created**: 2026-11-09
**Status**: Approved
**Input**: `docs/features/v3-004-dashboard-reporting.md`
**Design reference**: `handoff/celia_v3_001.zip` (hi-fi prototype: Dashboard screen; `README.md`; `product-decisions.md`; `data/seed.json`)

## Clarifications

### Session 2026-11-09

- Q: How should Burn Rate and Runway be calculated on the Dashboard? → A: Align with the prototype and F03: the "Burn rate" gauge displays the selected month's Budget Utilization % (`Math.round((monthlyExpenses / monthlyExpenseBudget) * 100)%`, with outer status bands `<85%` green `#3f7d5c`, `85–115%` amber `#d3a13f`, `>115%` red `#b0533c`), and Runway on the hero card displays `Savings Buffer ÷ selected month's actual expenses` formatted as `"N.N months runway"` (or `"—"` when selected month's expenses are 0).
- Q: What should populate the "Upcoming commitments" card on the Dashboard given F04 introduces no separate commitments entity? → A: Active Sinking Funds and Goal buckets that have a `targetMonth` set in F03, displaying bucket name, target month (`targetMonth`), and remaining target amount; if no target-dated buckets exist, display a clean empty state.
- Q: How should the Dashboard behave when filtered by an individual member (e.g. Ana or Miguel) given brief §3.2/§3.8 prohibits arbitrary budget distribution? → A: The member filter scopes actual transactions only (Income, Expenses, and Category spending table actuals). Household-level budget and savings components (Savings Buffer hero, Burn Rate gauge against household budget, and Budget vs Actual budget line) show household totals accompanied by a clear indicator that budgets and buffers are household-wide.
- Q: How should moving an item between categories affect historical Dashboard reporting (Roadmap F04 follow-up)? → A: Preserve F01 behavior: moving an item reclassifies its transactions to the new category across all past and future dates, so historical actuals follow the current category structure, while historical monthly budget plan allocations (`MonthlyBudgetPlan`) remain unchanged.
- Q: How should the Categories table rollover column (`↺`) behave given F03 has no automated multi-month rollover? → A: Display the current-period unspent allocation (`budget − spent`) when positive, or `—` when zero/overspent, purely as an informational remaining amount without rolling balances over into future months.

### Session 2026-11-10

- Q: What are the owner filter scopes and how do drill-down totals match between the Dashboard and `/entries`? → A: Three distinct owner scopes exist: `"all"` (All members / Everyone), `"household"` (Household-owned only, where `owner_member_id IS NULL`), and `<memberId>` (Individual member).
  - In "Expense per member", clicking an active member row **filters the dashboard in-place** to that member (`?member=<id>`), and clicking it again clears the filter back to `"all"` (matching `HF#L974`). Clicking the Household row filters in-place to Household-owned transactions (`?member=household`). It does **not** navigate away to `/entries`.
  - In the Categories table, clicking an active category row navigates to `/entries?month=YYYY-MM&category=<id>`.
  - **Drill-Down Figure Matching Rules**:
    - Under **All members** (`member=all` or unset): Link is `/entries?month=YYYY-MM&category=<id>`. The entries table sum and Expense summary chip match the Categories table row's `spentCentavos` exactly.
    - Under **Individual member** (`member=<memberId>`): Link is `/entries?month=YYYY-MM&category=<id>&owner=<memberId>`. Per F02's approved rule, `/entries` displays member entries plus shared Household entries, with Household rows marked and summary chips displaying `own · shared`. The summary chip's **"own" figure (`ownExpenseCentavos`)** matches the member's spending in that category on the dashboard.
    - Under **Household** (`member=household`): Link is `/entries?month=YYYY-MM&category=<id>&owner=household`. Operates as a link-only Household view on `/entries`: renders `"Household only ▾"` in the header owner chip (distinct from F02's `"Household ▾"` = everyone), suppresses the `"0 own · ₱X shared"` breakdown in SummaryChips to display simply the total shared amount, and filters entries to `owner_member_id IS NULL`. The entries table sum and the summary chip match the Household spending in that category on the dashboard. Selecting another option in the owner dropdown seamlessly transitions back to F02's standard filter modes.
- Q: How are Secondary KPI deltas calculated and when do they appear? → A:
  - Deltas compare actuals against the selected month's applied budget plan (`MonthlyBudgetPlan`):
    - `Income Δ = Actual Income − Planned Income` (favourable when $\ge 0$).
    - `Expense Δ = Planned Expenses − Actual Expenses` (favourable-positive: $> 0$ unspent green, $< 0$ overspent red).
    - `Savings Δ = Actual Savings − Planned Savings` (favourable when $\ge 0$ green, $< 0$ amber `#8a6516` short).
    - `Unallocated Δ = Actual Unallocated − Planned Unallocated` (where `Planned Unallocated = Planned Income − Planned Expenses − Planned Savings`).
  - When no monthly plan is applied (`hasMonthlyPlan === false`), all deltas are `null` (subtitles render `"No plan applied"` or are omitted).
  - Under an individual member or Household filter, household budget deltas do not apply (per D2); deltas are `null`. Under a category filter, `Expense Δ = Category Budget − Category Actual`, while Income, Savings, and Unallocated deltas are `null`.
  - **Combined Filter Delta Rule**: When an owner filter (Member or Household) and a category filter are active simultaneously, the **Owner filter wins** and all deltas are `null` (since household category budgets cannot be divided or compared against an owner's partial spend).
- Q: How should archived members and archived categories be handled on the Dashboard? → A:
  - In "Expense per member", archived members with spending in the month are displayed with an `(archived)` badge so rows sum to total household `EXPENSES`, but their rows are strictly **non-clickable** (display-only).
  - In the Categories table, archived categories with spending in the month are displayed with an `(archived)` badge, but their rows are strictly **non-clickable**, preventing users from navigating to `/entries` with an archived category ID that does not exist in the `/entries` filter dropdown.
- Q: Which savings buckets count toward the Dashboard's `SAVINGS BUFFER`, `SAVINGS` KPI, and historical sparklines? → A: **Active buckets only** (`archivedAt === null`), strictly matching F03 `/savings` (`calculateSavingsKpis`) and `/models`. When a bucket is archived, its balance and contributions leave the active buffer and active monthly savings. Past sparklines plot the active buffer balance over time.
- Q: How is the Savings Buffer sparkline calculated across months with no activity, backdated activity, and newly created buckets? → A: The buffer is a cumulative running balance. A bucket's `openingBalance` contributes to the buffer **only for months on or after that bucket's creation month** (`substr(bucket.createdAt, 1, 7) <= monthKey`). For each month $M$ in the 12-month rolling window:
  $$\text{balance}(M) = \sum_{\substack{b \in \text{active buffer buckets} \\ \text{substr}(b.\text{createdAt}, 1, 7) \le M}} b.\text{openingBalance} + \sum_{\substack{a \in \text{contribs} \\ a.\text{date} < \text{nextMonthStart}(M)}} a.\text{amount} - \sum_{\substack{a \in \text{withdrawals} \\ a.\text{date} < \text{nextMonthStart}(M)}} a.\text{amount}$$
  A month with no savings activity carries forward the previous month's balance. Backdated activity is included based on its effective financial date.
- Q: Which buckets qualify as Upcoming Commitments, and what happens when they have no target amount or are fully funded? → A: Only active buckets with a future or current target month (`targetMonth >= selectedMonthKey`) **and a defined target amount** (`targetAmount !== null && targetAmount > 0`) qualify. Buckets without a target amount are excluded. Fully funded buckets (`currentBalance >= targetAmount`) remain in the list until `targetMonth` passes, displaying `"₱0 left"` with a favourable status indicator.
- Q: How does selecting an Income category in the header filter affect the Dashboard? → A: Income categories do not have an expense budget. Under an income category filter:
  - Burn rate gauge: displays `"—"` with subtitle `"Income category selected"`, neutral tone (`#636f73`), and 0% arc.
  - Trend chart: displays empty state `"Expense trend not applicable to income categories"`.
  - Categories table: displays empty state `"No expense categories match filter"`.
  - Expense per member card: displays empty state `"Expense distribution not applicable to income categories"`.
  - Secondary KPIs: `INCOME` displays actual income for that category; `EXPENSES`, `SAVINGS`, and `UNALLOCATED` display `—`.
- Q: What does the Burn Rate gauge display when a month has zero budget or no plan? → A:
  - When no plan is applied (`hasMonthlyPlan === false`): center shows `"—"`, subtitle `"No plan applied"`, neutral tone (`#636f73`), 0% arc.
  - When a plan is applied with zero budget and zero spend (`budget === 0 && actual === 0`): center shows `"—"`, subtitle `"Zero budget · ₱0 spent"`, neutral tone, 0% arc.
  - When a plan is applied with zero budget but actual spending occurred (`budget === 0 && actual > 0`): center shows `"Overspent"`, subtitle `"No budget allocated"`, critical red tone (`#b0533c`), full 270° arc (1.0).

---

## Problem Statement

Users need an authoritative landing screen that answers three core questions at a glance:
1. *Where does our household stand financially right now?* (Savings buffer, cash runway, unallocated funds).
2. *How is our spending tracking against our plans this month?* (Budget utilization burn rate, income/expense/savings actuals vs. model allocations, overspent categories).
3. *Where did our money go?* (Spending distribution across categories and members, upcoming financial commitments).

F04 delivers the primary **Dashboard & Reporting** screen (`/`) as Celia's default view, providing full visibility across F01 (household configuration), F02 (transactions), and F03 (budget models & savings buckets).

---

## Scope

### In Scope
- **Primary Dashboard Screen (`/`)**:
  - **Row 1**:
    - Hero Card: `SAVINGS BUFFER` lifetime balance, historical 12-month buffer sparkline (normalized `0..1` ratios converted to SVG coordinates), and cash runway (`"N.N months runway"`).
    - Secondary KPI Grid: `INCOME`, `EXPENSES`, `SAVINGS`, and `UNALLOCATED` (with plan-variance deltas when applicable, and `—` formatting).
  - **Row 2**:
    - `Burn rate` gauge: 270° SVG arc visualization of selected month's Budget Utilization % with `<85%` green, `85–115%` amber, `>115%` red bands, and explicit unbudgeted / zero-budget / income-category handling.
    - `Actual vs budget` trend chart: 6-month or 12-month bar chart comparing actual monthly expenses against each month's applied budget plan, with selected month's dashed budget line and overspent bar highlighting.
  - **Row 3**:
    - `Categories` table: breakdown of spending by category, comparison against monthly budget, progress bars, favourable-positive delta `Δ` (`budget − spent`), remaining allocation `↺`, and 1-click drill-down to `/entries` for active categories.
    - `Expense per member` distribution card: stacked horizontal bar chart showing spending proportions per member and household, with in-place member filter toggle on click and non-clickable display-only rows for archived members.
  - **Row 4**:
    - `Goal progress` highlight card: progress ring, current balance vs. target, and dynamic monthly funding pace note.
    - `Upcoming commitments` card: sorted list of target-dated Sinking Fund and Goal buckets due in or after the selected month (`targetAmount > 0`).
- **Header Controls**:
  - `MonthPicker`: calendar month navigation with quick previous/next buttons.
  - `OwnerFilter`: dropdown with `"All members"`, `"Household"`, and active members.
  - `CategoryFilter`: dropdown with `"All categories"` and active expense/income categories.
  - `+ Add entry` CTA: opens existing `EntryModal`, saves entry, displays toast, and refreshes dashboard.
- **Bounded `/entries` Drill-Down**:
  - Updates `/entries` to accept `month`, `category`, and `owner` URL query parameters without breaking F02's approved member filter logic, summary chips, or row marking.
- **Isolated Shell Boundaries**:
  - Route group `src/app/(shell)/(dashboard)/` containing `page.tsx`, `loading.tsx`, and `error.tsx` (with `retry()`), isolating dashboard loading/error states from sibling shell pages.

### Non-Goals
- Standalone net cash flow KPI card (net cash flow is captured via the `UNALLOCATED` KPI).
- Percentage of total expenses column in the categories table.
- Dedicated member-level income, expense, and net financial panels (deferred to F05 or dedicated household reporting).
- Drill-down navigation links to `/savings` and `/models` from dashboard cards (drill-down is bounded strictly to `/entries`).
- Multi-month automated budget rollover (the `↺` column displays current-period unspent amount without balance carryover).
- Direct budget allocation editing on the dashboard (editing remains in `/models`).
- Automated bank synchronization or CSV imports.

---

## User Scenarios & Acceptance Criteria

### User Story 1 — Financial Position & Runway Overview (Priority: P1)
As a household administrator, I want to see our lifetime savings buffer, historical trajectory, and cash runway at a glance so I know how financially resilient our household is.

**Independent Test**: Seed 12 months of data (`npm run seed`), open `http://127.0.0.1:3000/`. Confirm `SAVINGS BUFFER` displays lifetime balance of active buffer buckets (₱470,000), runway reads `"N.N months runway"` matching `/savings`, and the sparkline displays a smooth 12-month trajectory.

**Acceptance Criteria**:
1. `SAVINGS BUFFER` displays lifetime balance across active buckets with `countsTowardBuffer = true`.
2. Runway displays `Savings Buffer ÷ selected month's actual expenses` formatted as `"N.N months runway"`. If monthly expenses are zero, displays `"Runway —"`.
3. Sparkline plots the 12-month running balance of active buffer buckets ending with the selected month using normalized ratios `0..1` rendered in SVG coordinate space. A bucket's opening balance contributes only on or after its creation month. Months without activity carry forward the previous balance. Single-value and flat-value series render without errors.
4. `INCOME`, `EXPENSES`, and `SAVINGS` display selected month's actual totals (gross contributions for active savings buckets). Plan deltas display variance against applied budget plan when present.
5. `UNALLOCATED` displays `Actual Income − Actual Expenses − Actual Gross Savings`.

### User Story 2 — Budget Utilization & Historical Spending Trends (Priority: P1)
As a user, I want to see our monthly burn rate and compare recent months against their budgets so I can detect overspending early.

**Independent Test**: Navigate between budgeted months, an unbudgeted month, and switch the trend range between `6 mo` and `12 mo`.

**Acceptance Criteria**:
1. Burn rate gauge displays Budget Utilization % (`expenses / budget * 100%`) with 270° SVG arc.
2. Status coloring: green (`<85%`), amber (`85–115%`), red (`>115%`).
3. If no budget plan is applied, gauge displays `"—"` with `"No plan applied"`.
4. If budget is 0 and expenses > 0, gauge displays `"Overspent"` with a full red arc.
5. If an income category is filtered, gauge displays `"—"` with `"Income category selected"`, and trend chart shows not-applicable empty state.
6. Trend chart displays 6 or 12 historical months. Each bar is judged against that month's own applied budget plan.
7. Selected month's budget is rendered as a dashed horizontal line.

### User Story 3 — Category Spending & Drill-Down (Priority: P1)
As a user, I want to see spending by category, variance against plan, and drill down to matching transactions.

**Independent Test**: Click an active category row in the Categories table. Confirm browser navigates to `/entries?month=YYYY-MM&category=<id>` and `/entries` opens with that category pre-filtered.

**Acceptance Criteria**:
1. Categories table lists active and archived categories that have actual spending or budget allocations.
2. Folded merge rows are excluded from totals to avoid double-counting.
3. Delta `Δ` is favourable-positive (`budget − spent`).
4. Rollover `↺` shows current-month unspent allocation (`budget − spent` when positive, or `—`).
5. Clicking an active category row navigates to `/entries` with `month` and `category` query parameters (omitting `owner` when viewing all members).
6. Under all members, the displayed `/entries` sum matches the dashboard category spend exactly. Under a member filter, `/entries` displays that member's view where the "own" summary chip matches the dashboard spend.
7. Archived category rows are display-only and non-clickable.

### User Story 4 — Household & Member Spending Distribution (Priority: P2)
As a user, I want to see spending proportions across household members and household-shared expenses.

**Independent Test**: In "Expense per member", click Ana's row. Confirm the dashboard filters in-place to Ana, highlighting her row. Click Ana's row again. Confirm the filter clears back to all members.

**Acceptance Criteria**:
1. Stacked bar chart shows spending per member and `Household` (`owner_member_id IS NULL`).
2. Archived members with transactions in the month are shown with `(archived)` badge; their rows are non-clickable.
3. Clicking an active member row toggles the dashboard filter in-place (`?member=<id>`, then `?member=all`); the selected row is highlighted.
4. Clicking the Household row filters the dashboard in-place to Household-owned transactions (`?member=household`).
5. If an income category is filtered, the card displays an empty state: `"Expense distribution not applicable to income categories"`.

### User Story 5 — Savings Goals & Upcoming Commitments (Priority: P2)
As a user, I want to monitor our primary savings goal and see upcoming commitments due in future months.

**Independent Test**: View Goal card and Upcoming Commitments card. Confirm goal projection and commitments sorting.

**Acceptance Criteria**:
1. Goal progress highlights the first active goal bucket sorted by creation date, reusing `calculateBucketMetrics.progressPercent`.
2. Funding pace note displays `"At ₱X/mo → N months to target"` or `"No contributions this month · ₱X left"`.
3. Commitments list active buckets with `targetMonth >= selectedMonthKey` and a defined target amount (`targetAmount > 0`), sorted ascending by `targetMonth`.
4. Fully funded commitments display `"₱0 left"` with a favourable green indicator.

### User Story 6 — Direct Transaction Entry from Dashboard (Priority: P2)
As a user, I want to quickly record an expense from the dashboard without navigating away.

**Independent Test**: Click `+ Add entry`, enter an expense, and save. Confirm toast appears, modal closes, and dashboard updates.

**Acceptance Criteria**:
1. `+ Add entry` opens `EntryModal` populated with full category and member records.
2. On successful save, triggers toast, closes modal, and refreshes dashboard data.

### User Story 7 — Empty, Loading, and Error States (Priority: P3)
As a user, I want clean handling of empty data, network errors, and loading states.

**Independent Test**: Wipe data with `npm run clear -- --yes`, open `/`. Confirm zeroed KPIs and unbudgeted empty states.

**Acceptance Criteria**:
1. Zero-data install renders `₱0` for all KPIs, flat sparkline, and unbudgeted state.
2. `loading.tsx` renders skeleton matching dashboard grid.
3. `error.tsx` renders error card with `retry()` button without breaking navigation shell.

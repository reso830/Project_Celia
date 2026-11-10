# Implementation Plan: F04 — Dashboard & Reporting

**Branch**: `v3-004-dashboard-reporting` | **Date**: 2026-11-09 (revised 2026-11-10) | **Spec**: [spec.md](spec.md)  
**Input**: `specs/v3-004-dashboard-reporting/spec.md`, `docs/features/v3-004-dashboard-reporting.md`, `handoff/celia_v3_001.zip`

---

## Summary

F04 implements Celia's primary **Dashboard & Reporting** screen (`/`), transforming recorded transactions (F02), savings buckets and contributions (F03), and monthly budget models (F03) into a cohesive visual overview of household finances:

1. **Pure Domain Core & Reuse of Authoritative Math**:
   - Reuses F03's domain calculation engines directly from `@/domain/savings-calculations` (`calculateSavingsKpis`, `calculateBucketMetrics`) and `@/domain/budget-calculations` (`calculateBudgetComparisonRows`), guaranteeing that top-level KPIs, runway, goal progress, and category comparisons match `/savings` and `/models` exactly.
   - Implements `src/domain/dashboard.ts` and `src/domain/dashboard-calculations.ts` for dashboard-specific visual mathematics:
     - Normalized coordinate ratios (`0..1`) for sparklines (with $N=1$ singleton mapping to `{ x: 0.5, y: val > 0 ? 0.5 : 0 }`, flat zero series $y=0$, and flat positive series $y=0.5$), 270° gauge arc geometry, and stacked member distribution segments.
     - Burn rate budget utilization percentage, state enum (`BurnRateDisplayState`), and threshold status tones (`favourable` <85%, `warning` 85–115%, `critical` >115%, `neutral` unbudgeted/zero-budget/income-category).
     - Full arc (1.0) critical display for zero-budget months with actual spending.
     - Budget trend bar scaling relative to peak (with peak guarded at `Math.max(1, ...)` to eliminate `0/0` on empty data), with each historical bar judged against that month's own applied plan.
     - Exclusion of folded merge rows from category table totals to prevent double-counting.
   - Enforces strict domain/presentation separation (Constitution Principle VIII): domain functions return pure numbers, ratios, and semantic state enums; text formatting (`"SEP 2026"`, `"₱X"`, `"N months to target"`, `"Zero budget · ₱0 spent"`) lives strictly in UI components.
   - Enforces clean code layering: domain types have **zero imports from server-only modules**, and `modalCategories.items` is declared as a mutable array for full compatibility with `EntryModal`.
2. **Optimized Server Read Model**: Implements `src/server/dashboard-read.ts`, assembling `DashboardViewData` in a single synchronous pass over SQLite:
   - Executes real schema joins on `items`, `categories`, and `members`.
   - Uses half-open date interval indexing (`WHERE e.date >= :startDate AND e.date < :nextMonthStart`) to leverage `entries_date_idx`.
   - Adheres to the single authoritative savings rule: active buckets only across current metrics and historical buffer running balances.
   - Gates bucket opening balances so they contribute to the running buffer only on or after each bucket's creation month (`substr(createdAt, 1, 7) <= monthKey`).
   - Carries forward buffer balances across gap months without activity, and respects effective dates of backdated contributions/withdrawals.
   - Enforces the Card-by-Card Filter Scope Matrix for `member`, `household`, expense categories, income categories, and combined owner & category filters.
   - Computes KPI deltas against `MonthlyBudgetPlan` for the selected month under `"all"`. Under any owner filter (individual member or household, whether alone or combined with a category filter), the Owner filter wins and all KPI deltas are `null` (D2).
   - Supplies full `modalCategories` and `modalMembers` records to power `EntryModal`.
3. **Preservation of F02 Filter Contract & Bounded Drill-Down**:
   - In "Expense per member", clicking an active member row **filters the dashboard in-place** (`?member=<id>`), and clicking it again clears the filter back to `"all"` (matching `HF#L974`). Clicking the Household row filters in-place to Household-owned transactions (`?member=household`). It does not navigate away to `/entries`.
   - In the Categories table, clicking an active category row navigates to `/entries` with bounded query parameters:
     - Under **All members** (`member=all` or unset): Link is `/entries?month=YYYY-MM&category=<id>`. On `/entries`, the entries table sum and Expense total chip match the dashboard category spend exactly.
     - Under **Individual member** (`member=<id>`): Link is `/entries?month=YYYY-MM&category=<id>&owner=<id>`. Per F02's approved rule, `/entries` displays member entries plus shared Household entries, with summary chips showing `own · shared`. The summary chip's **"own" figure (`ownExpenseCentavos`)** matches the member's spending in that category on the dashboard.
     - Under **Household** (`member=household`): Link is `/entries?month=YYYY-MM&category=<id>&owner=household`. Operates as a **link-only Household view** on `/entries`: renders `"Household only ▾"` in the header owner chip (distinct from F02's `"Household ▾"` = everyone), suppresses the `"0 own · ₱X shared"` breakdown in SummaryChips, and filters entries to `owner_member_id IS NULL`. The summary chip and table sum match the dashboard Household category spend. Selecting any option from the dropdown transitions back to F02's standard filter modes.
   - F02's approved member filter rule remains **100% intact**: on `/entries`, choosing a member displays that member's entries plus Household-owned entries, with Household rows marked with a badge and summary chips displaying `own · shared` (`₱X own · ₱Y shared`). Existing F02 unit and component tests remain untouched and green.
   - Archived member rows in "Expense per member" and archived category rows in the Categories table are strictly non-clickable (display-only).
4. **Shell Route Group Isolation**: Isolates the dashboard page, loading skeleton, and error boundary inside `src/app/(shell)/(dashboard)/` so sibling pages (`/categories`, `/household`, `/forecaster`) are unaffected.
5. **Pixel-Perfect Hi-Fi Visual Delivery**: Implements desktop components matching `Money Tracker Hi-Fi.dc.html` with responsive support across 1100px, 1280px, and 1440px desktop breakpoints, zero drop shadows, and full WCAG AA contrast.

---

## User Stories & Phased Architecture

| Phase | Focus | User Stories Covered | Verification Gate |
|---|---|---|---|
| **Phase 01** | Pure Domain Core & Dashboard Calculations | US1, US2, US3, US4, US5 | `npm run test` (node environment, pure math tests) |
| **Phase 02** | Server Read Model, Aggregations, & `/entries` Drill-Down | US1–US7 | `npm run test` (node environment, real SQLite tests) |
| **Phase 03** | Hi-Fi Row 1 & Row 2 UI Components | US1, US2, US6, US7 | Visual review against prototype lines 50–205 & 830–985 |
| **Phase 04** | Hi-Fi Row 3 & Row 4 UI Components | US3, US4, US5, US7 | Visual review against prototype lines 985–1360 |
| **Phase 05** | Screen Assembly, Route Group, Boundaries, & Component Tests | US1–US7 | RTL component tests + full verification gate |
| **Phase 06** | Release Prep | — | Roadmap, Changelog, Version Bump, Docs sanity |
| **Phase 07** | Browser Smoke Test & Visual Review | US1–US7 | Manual browser walkthrough on fresh and seeded data |

---

## Detailed Implementation Phases

### Phase 01 — Pure Domain Core & Dashboard Calculations
- Implement `src/domain/dashboard.ts` defining view model interfaces with pure primitives, enums, and zero server imports. Modal categories define `items: { id: string; name: string }[]` as mutable array for `EntryModal` compatibility.
- Implement `src/domain/dashboard-calculations.ts`:
  - `generateSparklineRatios(values: readonly number[]): readonly { x: number; y: number }[]`.
  - `calculateBurnRateGauge(actualExpenses: Centavos, expenseBudget: Centavos, hasMonthlyPlan: boolean, isIncomeCategory = false): BurnRateData` (returns pure enums `BurnRateDisplayState` and `statusTone`, no formatted strings).
  - `calculateBudgetTrend(expenses: readonly { monthKey: string; actualExpensesCentavos: Centavos }[], plans: ReadonlyMap<string, Centavos>, selectedMonthKey: string, range: 6 | 12, isIncomeCategory = false): BudgetTrendData`.
  - `calculateMemberDistribution(members: readonly Member[], entries: readonly Entry[], categories: readonly Category[]): MemberDistributionData` (sets `isClickable: false` for archived members).
  - Reuse `calculateSavingsKpis` and `calculateBucketMetrics` (including `progressPercent`) from `@/domain/savings-calculations`.
  - Reuse `calculateBudgetComparisonRows` from `@/domain/budget-calculations`, excluding folded merge rows from totals, and setting `isClickable: false` for archived categories.

### Phase 02 — Server Read Model, Aggregations, & `/entries` Drill-Down
- **Bounded `/entries` URL Query Parameter Support**:
  - In `src/app/(shell)/entries/page.tsx`: accept `searchParams: Promise<{ month?: string; category?: string; owner?: string; member?: string }>`. Pass `initialCategoryId={category}` and `initialOwnerId={owner || member}` to `<EntriesScreen ... />`.
  - In `src/components/entries/entries-screen.tsx`: accept `initialCategoryId?: string` and `initialOwnerId?: string`, initializing state to these values.
  - In `src/components/entries/entries-header.tsx`: when `ownerId === "household"`, chip button displays `"Household only ▾"` (Deviation D8). Dropdown options remain F02's standard options; selecting an option transitions back to standard filters.
  - In `src/components/entries/summary-chips.tsx`: when `ownerId === "household"`, suppress `"0 own · ₱X shared"` breakdown and display the total shared amount cleanly.
  - Preserve F02 filter behavior: `filterEntries` matches `ownerMemberId === null` for `"household"` without code modifications; existing F02 tests remain 100% untouched.
  - Add `tests/components/entries/entries-screen.test.tsx` verifying initial query parameter pre-selection, `"Household only ▾"` chip label, summary chips suppression, and dropdown option transition.
- **Implement Server Read Model `getDashboardView`** in `src/server/dashboard-read.ts`:
  - Validates `month`, `memberFilter` (`all` | `household` | active member UUID), `categoryId` (`all` | active category UUID), and `range` (`6 | 12`).
  - Executes real schema joins with half-open date interval `WHERE e.date >= :startDate AND e.date < :nextMonthStart`.
  - Computes historical buffer balance for active buffer buckets across 12 rolling months, gating opening balances by creation month (`substr(b.createdAt, 1, 7) <= monthKey`), and carrying forward balances across gap months.
  - Provides modal records `modalCategories` and `modalMembers`.
  - Enforces Scope Matrix for income categories and combined owner & category filters, asserting KPI deltas are `null` whenever an owner filter is active.
- **Comprehensive Integration Tests**:
  - `tests/server/dashboard-read.test.ts` (SQLite integration test covering all scope combinations including combined owner & category filters, buffer/runway matching `/savings`, gap months, creation-month opening balance gating, backdated activity, item moves, bucket archiving, and in-place member filter toggle).

### Phase 03 — Hi-Fi Row 1 & Row 2 UI Components
- `src/components/dashboard/dashboard-header.tsx`: PageHeader, MonthPicker, OwnerFilter, CategoryFilter, and `+ Add entry` CTA.
- `src/components/dashboard/savings-buffer-hero.tsx`: Dark hero card, runway subtitle, 12-month SVG sparkline.
- `src/components/dashboard/secondary-kpi-grid.tsx`: 4 KPI cards (`INCOME`, `EXPENSES`, `SAVINGS`, `UNALLOCATED`) with delta styling, rendering `—` for non-applicable categories.
- `src/components/dashboard/burn-rate-gauge.tsx`: 270° SVG arc, formatting center text and subtitle based on domain `state` and `statusTone`.
- `src/components/dashboard/budget-trend-chart.tsx`: 6/12 mo toggle, bar heights scaled to peak, overspent red highlighting against each month's plan, dashed selected-month budget line, and empty state for income categories.

### Phase 04 — Hi-Fi Row 3 & Row 4 UI Components
- `src/components/dashboard/categories-breakdown-table.tsx`: Spending breakdown table, budget comparisons, progress bars, favourable-positive delta, rollover `↺`, non-clickable rows for archived categories, and 1-click drill-down to `/entries` for active categories.
- `src/components/dashboard/member-expense-distribution.tsx`: Horizontal stacked distribution bars, in-place member filter toggle on click, and non-clickable display-only rows for archived members.
- `src/components/dashboard/goal-highlight-card.tsx`: Goal card with progress ring, formatting funding pace note from domain `status` and `monthsToTarget`.
- `src/components/dashboard/upcoming-commitments-card.tsx`: List of target-dated sinking funds/goals (`targetAmount > 0`), due month formatted in UI, remaining amount, and `"₱0 left · Funded"` state.

### Phase 05 — Screen Assembly, Route Group, Boundaries, & Component Tests
- `src/components/dashboard/dashboard-screen.tsx`: Responsive 4-row layout matching prototype CSS.
- Route Group Migration: Move `src/app/(shell)/page.tsx` to `src/app/(shell)/(dashboard)/page.tsx`.
- Create `src/app/(shell)/(dashboard)/loading.tsx` and `src/app/(shell)/(dashboard)/error.tsx` (with `retry()`).
- Create `tests/components/dashboard/dashboard-screen.test.tsx` verifying full screen rendering, empty states, unbudgeted states, member filtering, interactive range toggle, drill-down links, `EntryModal` direct entry save and refresh flow, loading skeleton, and error boundary retry.

### Phase 06 — Release Prep
- Update `package.json` and `package-lock.json` version.
- Update `CHANGELOG.md`, `docs/feature_roadmap.md`, `README.md`, and `docs/REPO_MAP.md`.
- Run `tests/release-docs.test.ts`.

### Phase 07 — Browser Smoke Test & Visual Review
- Execute manual smoke tests 1–7 from `quickstart.md §4`.
- Desktop visual verification at 1100px, 1280px, and 1440px against prototype.

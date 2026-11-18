# Tasks: F04 — Dashboard & Reporting

**Inputs**: [spec.md](spec.md) · [plan.md](plan.md) · [data-model.md](data-model.md) · [contracts/api.md](contracts/api.md) · [research.md](research.md) · [quickstart.md](quickstart.md) · [deviations.md](deviations.md) · [checklists/plan-review.md](checklists/plan-review.md)

## Conventions

- **Status**: `[x]` done · `[ ]` pending · `[~]` skipped
- **`[P]`**: can run in parallel with other `[P]` tasks in the same phase (different files, no shared edits).
- **`[USn]`**: the spec user story a task serves (`US1`–`US7`).
- **Phase dependencies**: `01 → 02 → 03 → 04 → 05 → 06 → 07`.
- **Commands**: `npm run test` (equivalent to `npm run test:run`) and `npm run lint`.
- **Phase gate**: Every phase ends with `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build` green. Nothing is left broken at a phase boundary.
- **Server tests** start with the docblock `// @vitest-environment node`. The global default is `jsdom`.
- **Constitution test areas mapped to Celia F04**:
  - *Status transitions*: unbudgeted vs. budgeted months (`hasMonthlyPlan`); zero actual expenses vs. positive expenses; member filter transitions (household vs. individual); active vs. archived category and member rendering in historical reporting (`(archived)` marker, non-clickable).
  - *Required fields*: view models with complete non-nullable/nullable field contracts; exact centavo integrity; query parameter fallbacks (`month` fallback to `currentMonthKey()`, `member`/`category` fallback to `'all'`, `range` fallback to `6`).
  - *URL validation*: `month` format check (`YYYY-MM` via `isValidMonthKey`), `member` (`'all'`, `'household'`, or active member UUID), `category` (`'all'` or active category UUID), `range` (`6 | 12`).
  - *Date handling*: calendar month boundaries (`YYYY-MM`), half-open date bounds (`WHERE e.date >= :startDate AND e.date < :nextMonthStart`), and month label formatting (`"SEP 2026"`).

### Design reference aliases

The handoff zip is `handoff/celia_v3_001.zip`, root folder `design_handoff_money_tracker/`:
- `HF`: `reference/Money Tracker Hi-Fi.dc.html` (Dashboard lines 50–205 and 830–1360).
- `PD`: `reference/product-decisions.md`.
- `SEED`: `data/seed.json`.

---

## Phase Summary Table

| Phase | Focus | Tasks | User Stories |
|---|---|---|---|
| **01** | Pure Domain Core & Dashboard Calculations | `T001–T007` | US1, US2, US3, US4, US5 |
| **02** | Server Read Model, Aggregations, & `/entries` Drill-Down | `T008–T011` | US1–US7 |
| **03** | Hi-Fi Row 1 & Row 2 UI Components | `T012–T016` | US1, US2, US6, US7 |
| **04** | Hi-Fi Row 3 & Row 4 UI Components | `T017–T020` | US3, US4, US5, US7 |
| **05** | Screen Assembly, Route Group, Boundaries, & Component Tests | `T021–T024` | US1–US7 |
| **06** | Release Prep | `T025–T029` | — |
| **07** | Browser Smoke Test & Visual Review | `T030–T037` | US1–US7 |

---

## Phase 01 — Pure Domain Core & Dashboard Calculations

Order: View Model Types → Pure Calculation Helpers → Comprehensive Unit Test Suite.

- [x] **T001 [P] [US1–US5] Create dashboard view model domain types**
  - Files: `src/domain/dashboard.ts` (new).
  - Expected behavior:
    - Declare TypeScript interfaces per `data-model.md §3`: `DashboardMemberFilter`, `DashboardFilterState`, `SavingsBufferHeroData`, `DashboardKpisData` (including `unallocatedScope: "all" | "household" | "member"` and delta centavos fields `incomeDeltaCentavos`, `expensesDeltaCentavos`, `savingsDeltaCentavos`, `unallocatedDeltaCentavos`), `BurnRateDisplayState`, `BurnRateData`, `BudgetTrendBar`, `BudgetTrendData`, `CategorySpendingRowData`, `CategoriesTableData`, `MemberDistributionSegment`, `MemberDistributionRow`, `MemberDistributionData`, `GoalFundingStatus`, `GoalHighlightData`, `UpcomingCommitmentItem`, `UpcomingCommitmentsData`, `DashboardModalCategory`, `DashboardModalMember`, and `DashboardViewData`.
    - `DashboardModalCategory.items` declared as mutable `{ id: string; name: string }[]` for direct `EntryModal` compatibility.
    - Zero formatted text strings (`monthLabel`, `targetMonthLabel`, `centerText`, `subtitle`, `unallocatedSubtitle` removed from domain types).
    - Zero imports from server-only modules (`@/server/*`). All imports strictly from `@/domain/*`.
  - Constraints: pure TypeScript interfaces/types; exact centavo type adherence; strict nullability.
  - Validation: `npm run typecheck`.

- [x] **T002 [P] [US1] Implement sparkline coordinate normalization helper**
  - Files: `src/domain/dashboard-calculations.ts` (new).
  - Expected behavior:
    - Implement `generateSparklineRatios(values: readonly number[]): readonly { x: number; y: number }[]`:
      - Handles empty array: returns `[]`.
      - Handles single value ($N = 1$): returns `[{ x: 0.5, y: values[0] > 0 ? 0.5 : 0 }]`.
      - Handles multiple values ($N > 1$):
        - Spreads $x$ evenly across normalized unit interval: $x_i = i / (N - 1)$.
        - If $\max(\text{values}) === 0$: returns $y_i = 0$ (baseline).
        - If $\max(\text{values}) === \min(\text{values}) > 0$: returns $y_i = 0.5$ (centered horizontal line).
        - Otherwise, scales $y$ relative to $\max$: $y_i = \text{values}[i] / \max(\text{values})$.
    - Presentational conversion in UI (`savings-buffer-hero.tsx`): converts normalized ratios into SVG pixel coordinates (`svgX = point.x * 120`, `svgY = 44 - point.y * 36`).
  - Constraints: pure normalized $(x, y) \in [0, 1] \times [0, 1]$ output; zero DOM dependencies; zero division by zero on $N = 1$ or flat data.
  - Validation: `tests/domain/dashboard-calculations.test.ts`.

- [x] **T003 [P] [US2] Implement 270° Burn rate gauge mathematical calculation**
  - Files: `src/domain/dashboard-calculations.ts`.
  - Expected behavior:
    - Implement `calculateBurnRateGauge(actualExpenses: Centavos, expenseBudget: Centavos, hasMonthlyPlan: boolean, isIncomeCategory = false): BurnRateData`:
      - When `isIncomeCategory === true`: returns `utilizationPercent: null, arcRatio: 0, statusTone: "neutral", state: "income_category", hasMonthlyPlan`.
      - When `hasMonthlyPlan === false`: returns `utilizationPercent: null, arcRatio: 0, statusTone: "neutral", state: "no_plan", hasMonthlyPlan: false`.
      - When `hasMonthlyPlan === true && expenseBudget === 0 && actualExpenses === 0`: returns `utilizationPercent: null, arcRatio: 0, statusTone: "neutral", state: "zero_budget_zero_spend", hasMonthlyPlan: true`.
      - When `hasMonthlyPlan === true && expenseBudget === 0 && actualExpenses > 0`: returns `utilizationPercent: null, arcRatio: 1.0, statusTone: "critical", state: "zero_budget_overspent", hasMonthlyPlan: true`.
      - When `hasMonthlyPlan === true && expenseBudget > 0`:
        - Computes `utilizationPercent = Math.round((actualExpenses * 100) / expenseBudget)`.
        - Computes `arcRatio = Math.min(1.0, actualExpenses / (expenseBudget * 1.5))`.
        - Computes `statusTone` and `state`:
          - `< 85%`: `"favourable"`, `"under_pace"`.
          - `85–115%`: `"warning"`, `"on_pace"`.
          - `> 115%`: `"critical"`, `"over_pace"`.
  - Constraints: pure numerical/enum output; zero formatted text strings inside domain; matches 270° arc geometry (`research.md §1.2`).
  - Validation: `tests/domain/dashboard-calculations.test.ts`.

- [x] **T004 [P] [US1, US2] Implement Budget trend bar scaling and reuse F03 runway**
  - Files: `src/domain/dashboard-calculations.ts`.
  - Expected behavior:
    - Reuses `calculateSavingsKpis` from `@/domain/savings-calculations` for runway: returns `null` if monthly expenses are 0, else formatted to 1 decimal place.
    - Implement `calculateBudgetTrend(monthlyExpenses: readonly { monthKey: string; actualExpensesCentavos: Centavos }[], monthlyPlans: ReadonlyMap<string, Centavos>, selectedMonthKey: string, range: 6 | 12, isIncomeCategory = false): BudgetTrendData`:
      - If `isIncomeCategory === true`: returns `isApplicable: false, bars: [], budgetLineRatio: 0, budgetCentavos: 0, range`.
      - Slices the most recent `range` months ending with `selectedMonthKey`.
      - Computes `peak = Math.max(1, Math.max(selectedBudget, ...expenses) * 1.12)` to eliminate `0/0` on empty data.
      - For each month $m$, judges `isOverspent` against **that month's own applied plan** (`actual > monthlyPlans.get(m)`). Unbudgeted months are never flagged as overspent.
      - Scales bar height ratios `actualExpenses / peak` and selected month's budget line ratio `selectedBudget / peak`.
      - `BudgetTrendBar` carries `monthKey` string without pre-formatted labels.
  - Constraints: pure domain logic; matches prototype chart math (`HF#L914–L935`) while evaluating each bar against its own plan.
  - Validation: `tests/domain/dashboard-calculations.test.ts`.

- [x] **T005 [P] [US3, US4] Implement Category spending and Member distribution helpers**
  - Files: `src/domain/dashboard-calculations.ts`.
  - Expected behavior:
    - Implement `calculateCategorySpendingRows(categories, actualsByCategory, budgetAllocations, mergedCategoryClosure, isIncomeCategory = false)`:
      - If `isIncomeCategory === true`: returns `isApplicable: false, rows: [], totalSpentCentavos: 0, totalBudgetCentavos: 0, totalDeltaCentavos: 0`.
      - Uses F03's `calculateBudgetComparisonRows` with `foldMergedCategories: true`.
      - Excludes folded merge rows (`isFoldedIntoMergeTarget === true`) from table totals so planned budgets and actuals are not double-counted.
      - Sets `isClickable: false` for archived categories, `true` for active categories.
      - Computes spent, budget, progress bar ratio (capped at 1.0), status tone, delta `Δ` (favourable-positive `budget − spent`), and rollover `↺` (`budget − spent` when positive, or `null` when overspent/zero).
    - Implement `calculateMemberDistribution(members, entries, categories, isIncomeCategory = false)`:
      - If `isIncomeCategory === true`: returns `isApplicable: false, rows: [], maxSpendCentavos: 0, legendSwatches: []`.
      - Computes total expenses for `Household` (`owner_member_id IS NULL`), each active member, and any archived members who have transactions in the month.
      - Member rows always render all members and Household for context, summing to total household expenses (the card highlights the selected member rather than hiding other members).
      - Sets `isClickable: false` for archived members, `true` for active members and Household.
      - Finds `maxMemberSpend = Math.max(1, ...memberSpends)`.
      - For each member, splits spending into category segments with width ratio `categorySpend / maxMemberSpend`.
      - Collects unique category swatches for the horizontal legend.
  - Constraints: exact centavo sums; member rows sum to total household `EXPENSES`; preserve F01 category colors.
  - Validation: `tests/domain/dashboard-calculations.test.ts`.

- [x] **T006 [P] [US5] Implement Goal progress and Upcoming Commitments sorting**
  - Files: `src/domain/dashboard-calculations.ts`.
  - Expected behavior:
    - Reuses `calculateBucketMetrics` from `@/domain/savings-calculations`.
    - Implement `calculateGoalHighlight(goalBucket, currentMonthFundedCentavos)`:
      - Reuses `calculateBucketMetrics(goalBucket, activities, selectedMonthKey, planned).progressPercent` directly to obtain progress percentage.
      - Computes progress ratio: `Math.min(1.0, progressPercent / 100)`.
      - Returns `monthsToTarget: number | null` (`currentMonthFundedCentavos > 0 ? Math.ceil(remaining / currentMonthFundedCentavos) : null`).
      - Returns pure `status: GoalFundingStatus` enum (`"funded"` | `"on_track"` | `"no_contributions"` | `"no_goal"`). Zero formatted text strings.
      - Returns `hasGoal: false` when no targeted goal bucket exists.
    - Implement `calculateUpcomingCommitments(buckets, selectedMonthKey)`:
      - Filters active sinking funds and goals where `targetMonth >= selectedMonthKey` **and `targetAmount !== null && targetAmount > 0`**. Open-ended buckets are excluded.
      - Sorts ascending by `targetMonth ASC, name ASC`.
      - Computes `remainingCentavos = Math.max(0, targetAmount − currentBalance)`.
      - Sets `isFunded: true` when `currentBalance >= targetAmount`. Fully funded commitments remain in the list until `targetMonth` passes.
      - Carries `targetMonth` string without formatted label.
  - Constraints: pure domain math; zero formatted text strings inside domain; clean empty state handling.
  - Validation: `tests/domain/dashboard-calculations.test.ts`.

- [x] **T007 [US1–US5] Export dashboard domain symbols and add comprehensive unit test suite**
  - Files: `src/domain/index.ts`, `tests/domain/dashboard-calculations.test.ts` (new).
  - Expected behavior:
    - Re-export all dashboard types and calculation functions in `src/domain/index.ts`.
    - Add comprehensive unit tests in `tests/domain/dashboard-calculations.test.ts` verifying:
      - Sparkline ratios for empty series (`[]`), single-value series (expected finite output `[{ x: 0.5, y: 0.5 }]` for positive value, or `{ x: 0.5, y: 0 }` for zero), flat zero series ($y = 0$), flat positive series ($y = 0.5$), ascending series, and descending series.
      - 270° gauge arc geometry, path start/end coordinates, status thresholds (<85%, 85–115%, >115%), zero-budget plan (both 0 spent and positive spent), unbudgeted months, and income category filter state.
      - Runway calculation with normal expenses and division-by-zero (`null`).
      - Actual vs budget bar chart peak scaling (verifying non-zero peak on empty data), per-month budget evaluation, dashed line ratio, and income category empty state.
      - Category breakdown deltas, rollover `↺` amounts, non-clickable archived categories, and exclusion of folded merge rows from totals.
      - Member distribution segment width math, including `Household` (`owner_member_id IS NULL`), non-clickable archived members, and income category empty state.
      - Goal progress ratio, zero-funding pace handling, and upcoming commitments qualification (`targetAmount > 0`) and sorting (`targetMonth >= selectedMonthKey`).
  - Constraints: node test environment (`// @vitest-environment node`); 100% passing.
  - Validation: `npm run test` (node environment).

---

## Phase 02 — Server Read Model, Aggregations, & `/entries` Drill-Down

Order: `/entries` initial search parameter support → Server read helper implementation → Read model and component integration tests.

- [x] **T008 [P] [US3] Add bounded URL search parameter support to `/entries` while preserving F02 filter contract**
  - Files: `src/app/(shell)/entries/page.tsx`, `src/components/entries/entries-screen.tsx`, `src/components/entries/entries-header.tsx`, `src/components/entries/summary-chips.tsx`, `tests/components/entries/entries-screen.test.tsx` (new).
  - Expected behavior:
    - In `src/app/(shell)/entries/page.tsx`:
      - Accept `searchParams: Promise<{ month?: string; category?: string; owner?: string; member?: string }>`.
      - Validates `owner || member`: if not `"household"` or an active member UUID, falls back to `"all"`.
      - Pass `initialCategoryId={category}` and `initialOwnerId={validatedOwner}` to `<EntriesScreen ... />`.
    - In `src/components/entries/entries-screen.tsx`:
      - Accept `initialCategoryId?: string` and `initialOwnerId?: string`.
      - Initialize `categoryId` state to `initialCategoryId ?? "all"` and `ownerId` state to `initialOwnerId ?? "all"`.
    - In `src/components/entries/entries-header.tsx` (Link-only "Household only" view, Deviation D8):
      - When `ownerId === "household"`, the chip button displays `"Household only ▾"` (clearly distinct from F02's standard `"Household ▾"` which means all members / everyone).
      - The dropdown menu options continue to display F02's standard list: `"Household"` (`id: "all"`) and active members.
      - If the user selects any option from the dropdown, `onOwnerChange` updates `ownerId` to `"all"` or `<memberId>`, cleanly transitioning out of the link-only view back to F02 standard filters.
    - In `src/components/entries/summary-chips.tsx`:
      - When `ownerId === "household"`, suppress the `"0 own · ₱X shared"` subtitle in `MoneyChip`, displaying simply the shared total (`Expense ₱X`) matching the dashboard category spend.
    - **Preserve F02 filter contract 100% untouched**:
      - `filterEntries` in `src/domain/entry-calculations.ts` is NOT changed; selecting a member continues to show member entries plus Household-owned entries.
      - When `ownerId === "household"`, `filterEntries` cleanly matches entries where `ownerMemberId === null`.
      - `summary-chips.tsx` continues to show `own · shared` breakdown when an individual member is filtered.
      - `entries-table.tsx` continues to mark Household rows with badge when a member is filtered.
      - All existing F02 unit and component tests remain untouched and passing.
    - Add `tests/components/entries/entries-screen.test.tsx`:
      - RTL test verifying that passing `initialCategoryId` pre-selects the category filter and renders matching entries.
      - RTL test verifying that passing `initialOwnerId=<memberId>` pre-selects the member filter and renders matching entries with `own · shared` summary chips.
      - RTL test verifying that passing `initialOwnerId="household"` renders `"Household only ▾"` in the header chip, suppresses the `"own · shared"` breakdown in summary chips, and renders only Household-owned entries (`owner_member_id === null`).
      - RTL test verifying that selecting `"Household"` from the dropdown when in `"household"` view transitions `ownerId` to `"all"` and updates the chip label to `"Household ▾"`.
      - RTL test verifying drill-down figure matching under each filter:
        - Under All members (`category` set, `owner` unset): table sum and Expense total chip match dashboard category spend.
        - Under Member (`category` set, `owner=<memberId>`): "own" chip (`ownExpenseCentavos`) matches dashboard member category spend.
        - Under Household (`category` set, `owner="household"`): summary chip and table sum match dashboard household category spend.
      - RTL test verifying unknown owner fallback: passing unknown owner UUID defaults filter to `"all"`.
  - Constraints: bounded strictly to reading initial filter query parameters; preserves F02 rules.
  - Validation: `npm run test`.

- [x] **T009 [US1–US7] Implement `getDashboardView` server read model**
  - Files: `src/server/dashboard-read.ts` (new).
  - Expected behavior:
    - Implement `getDashboardView({ month, memberFilter, categoryId, range }): Promise<DashboardViewData>`:
      - Validates `month` with `isValidMonthKey` (fallback: `currentMonthKey()`).
      - Validates `memberFilter`: allows `'all'`, `'household'`, or active member UUID (fallback: `'all'`).
      - Validates `categoryId`: allows `'all'` or active category UUID (fallback: `'all'`).
      - Validates `range` as `6` or `12` (fallback: `6`).
      - Queries SQLite using real schema joins and half-open date interval `WHERE e.date >= :startDate AND e.date < :nextMonthStart`:
        ```sql
        SELECT substr(e.date, 1, 7) AS month_key, c.umbrella_id AS type, e.owner_member_id, c.id AS category_id, c.name AS category_name, c.color AS category_color, SUM(e.amount) AS total_centavos
        FROM entries e
        JOIN items i ON i.id = e.item_id
        JOIN categories c ON c.id = i.category_id
        WHERE e.date >= :startDate AND e.date < :nextMonthStart
        GROUP BY substr(e.date, 1, 7), c.umbrella_id, e.owner_member_id, c.id;
        ```
      - Queries historical savings across active buffer buckets only (`b.archived_at IS NULL AND a.date < :nextMonthStart`):
        - Gates bucket opening balances so they contribute only for months on or after each bucket's creation month (`substr(b.created_at, 1, 7) <= monthKey`).
        - Carries forward buffer balances across gap months without activity.
        - Honors backdated activities based on effective date.
      - Queries applied budget plan allocations for the selected month and historical range months.
      - Computes active Sinking Fund and Goal commitments due $\ge$ selected month (`targetAmount > 0`).
      - Calculates KPI plan deltas:
        - When `hasMonthlyPlan === true` and under `"all"`:
          - `incomeDeltaCentavos = actualIncome - plannedIncome` (favourable when $\ge 0$).
          - `expensesDeltaCentavos = plannedExpenses - actualExpenses` (favourable-positive: $>0$ unspent, $<0$ overspent).
          - `savingsDeltaCentavos = actualSavings - plannedSavings` (favourable when $\ge 0$, $<0$ amber `#8a6516`).
          - `unallocatedDeltaCentavos = actualUnallocated - plannedUnallocated`.
        - When `hasMonthlyPlan === false` or under any owner filter (`memberFilter !== 'all'`, including individual members and household), all KPI deltas are **`null`** (Owner filter wins over category filter, per D2).
        - Under category filter alone (`memberFilter === 'all' && categoryId !== 'all'`), `expensesDeltaCentavos = categoryBudget - categoryActual`, others `null`.
      - Enforces the Card-by-Card Scope Matrix & Combined Filter Rules:
        - When filtering by expense category, sets `incomeCentavos = null` (`—`).
        - When filtering by income category, sets `state = "income_category"`, `isApplicable = false` for trend, categories table, and member distribution.
        - When filtering by member, keeps hero buffer and burn rate labeled as household-wide.
        - Under combined owner & category filters, enforces the combined matrix in `data-model.md §2`.
      - Assembles full `modalCategories` and `modalMembers` records.
  - Constraints: single synchronous SQLite pass; server-only; zero mutation.
  - Validation: `tests/server/dashboard-read.test.ts`.

- [x] **T010 [US1–US7] Add integration test suite for `getDashboardView` (Part 1: Core Scopes & Savings Consistency)**
  - Files: `tests/server/dashboard-read.test.ts` (new).
  - Expected behavior:
    - Server integration tests running against in-memory SQLite schema verifying:
      - Seeded 12-month data returns expected figures for `SAVINGS BUFFER`, `INCOME`, `EXPENSES`, `SAVINGS`, and `UNALLOCATED`.
      - **Savings & Runway consistency with `/savings`**: `hero.bufferCentavos` and `hero.runwayMonths` match `calculateSavingsKpis`.
      - **Category totals equal `EXPENSES`**: sum of `categoriesTable.rows.spentCentavos` (excluding folded merge rows) equals `kpis.expensesCentavos`.
      - **Opening balance creation-month gating**: test that a bucket created in October with an opening balance does NOT contribute to January–September sparkline points.
      - **Historical buffer carry-forward**: test that a month with zero savings activity carries forward the previous month's balance (does not drop to zero).
      - **Backdated activity**: adding an activity dated 2 months prior correctly updates that historical month and subsequent months.
      - **Bucket archiving**: test that archiving a bucket with a balance excludes it from active buffer and monthly savings.
  - Constraints: node test environment (`// @vitest-environment node`); in-memory SQLite migrations.
  - Validation: `npm run test tests/server/dashboard-read.test.ts`.

- [x] **T011 [US1–US7] Add integration test suite for `getDashboardView` (Part 2: Filter Matrix, Moves & Edge Cases)**
  - Files: `tests/server/dashboard-read.test.ts`.
  - Expected behavior:
    - Integration tests verifying:
      - **Scope Matrix combinations & Combined Filters**:
        - `memberFilter='household'`: isolates `owner_member_id IS NULL`, sets `unallocatedScope: "household"`, leaves buffer and burn rate as household-wide, asserts KPI deltas are `null`.
        - `memberFilter=<anaId>`: isolates Ana's spend, sets `unallocatedScope: "member"`, asserts KPI deltas are `null`.
        - `categoryId=<expenseId>`: returns `incomeCentavos: null` (`—`), isolates expenses to that category, computes `expensesDeltaCentavos = categoryBudget - categoryActual`.
        - `categoryId=<incomeId>`: returns `expensesCentavos: null`, `state = "income_category"`, `isApplicable: false` for trend, table, and distribution.
        - `memberFilter=<id> & categoryId=<expenseId>`: scopes to member's spend in that category, asserts all KPI deltas are `null` (Owner filter wins), burn rate shows household burn rate, categories table filters to that row.
        - `memberFilter='household' & categoryId=<expenseId>`: scopes to Household-owned spend in that category, asserts all KPI deltas are `null`, burn rate shows household burn rate.
        - `memberFilter=<id | 'household'> & categoryId=<incomeId>`: returns actual income for that owner in that category, expenses `—`, all deltas `null`, `state = "income_category"`, `isApplicable: false` for trend, table, and distribution.
      - **Item moves**: moving an item in F01 reclassifies historical transactions to the new category, correctly updating dashboard category totals.
      - **Archived members & categories**: archived members with spending are included in Member Distribution rows with `(archived)` badge and `isClickable: false`; archived categories in table have `isClickable: false`.
      - **Zero-budget & unbudgeted months**: verifies exact display states per `data-model.md §5`.
      - **Invalid URL parameter fallbacks**: invalid month keys fallback to current month; invalid member/category UUIDs fallback to `'all'`; invalid range fallbacks to `6`.
  - Constraints: node test environment (`// @vitest-environment node`).
  - Validation: `npm run test tests/server/dashboard-read.test.ts`.

---

## Phase 03 — Hi-Fi Row 1 & Row 2 UI Components

- [x] **T012 🎨 [US1, US6] Implement DashboardHeader component**
  - Files: `src/components/dashboard/dashboard-header.tsx` (new).
  - Target: `HF#L52–L80`.
  - Behavior: renders title `"Dashboard"`, `MonthPicker`, `OwnerFilter` dropdown, `CategoryFilter` dropdown, and `+ Add entry` CTA.
  - Breakpoints: 1100px, 1280px, 1440px.

- [x] **T013 🎨 [US1] Implement SavingsBufferHero component**
  - Files: `src/components/dashboard/savings-buffer-hero.tsx` (new).
  - Target: `HF#L50–L75, L830–L845`.
  - Behavior: dark hero card (`#3a4145`), `SAVINGS BUFFER`, JetBrains Mono 38px figure, `"N.N months runway"` subtitle, and 12-month SVG sparkline.

- [x] **T014 🎨 [US1] Implement SecondaryKpiGrid component**
  - Files: `src/components/dashboard/secondary-kpi-grid.tsx` (new).
  - Target: `HF#L85–L135, L845–L880`.
  - Behavior: 4 KPI cards (`INCOME`, `EXPENSES`, `SAVINGS`, `UNALLOCATED`), formatting `null` as `—`. Renders delta variance subtitles comparing actuals to plan allocations:
    - Income delta: `+₱X vs plan` (green when $\ge 0$, red when $< 0$).
    - Expense delta: `₱X unspent` (favourable green when $> 0$, `₱X overspent` critical red when $< 0$).
    - Savings delta: `+₱X vs plan` (green when $\ge 0$, `-₱X vs plan` warning text `#8a6516` when $< 0$).
    - Unallocated delta: `+₱X vs plan` (green when $\ge 0$, red when $< 0$).
    - Unallocated card subtitle reflects `unallocatedScope`: `"Unallocated"` (`"all"`), `"Household net"` (`"household"`), or `"Member net"` (`"member"`).
    - When unbudgeted (`hasMonthlyPlan === false`) or under an individual member filter (D2), deltas render `"No plan applied"` or are omitted.

- [x] **T015 🎨 [US2] Implement BurnRateGauge component**
  - Files: `src/components/dashboard/burn-rate-gauge.tsx` (new).
  - Target: `HF#L140–L170, L885–L910`.
  - Behavior: 270° SVG arc, formatting center text and subtitle based on domain `state` and `statusTone` (green <85%, amber 85–115%, red >115%, unbudgeted empty state `—`, zero-budget critical full arc, and income category neutral state).

- [x] **T016 🎨 [US2] Implement BudgetTrendChart component**
  - Files: `src/components/dashboard/budget-trend-chart.tsx` (new).
  - Target: `HF#L175–L205, L915–L945`.
  - Behavior: 6/12 mo pill toggle, bar heights scaled to peak, overspent red highlighting against each month's plan, dashed selected-month budget line, and empty state when `isApplicable === false`. Formats month labels via `formatMonthLabel(bar.monthKey)`.

---

## Phase 04 — Hi-Fi Row 3 & Row 4 UI Components

- [x] **T017 🎨 [US3] Implement CategoriesBreakdownTable component**
  - Files: `src/components/dashboard/categories-breakdown-table.tsx` (new).
  - Target: `HF#L985–L1060`.
  - Behavior: spending breakdown table with category swatches, progress bars, favourable-positive delta `Δ`, rollover `↺`, non-clickable rows for archived categories (`isClickable: false`), and 1-click drill-down to `/entries` for active categories. Displays empty state when `isApplicable === false`.

- [x] **T018 🎨 [US4] Implement MemberExpenseDistribution component**
  - Files: `src/components/dashboard/member-expense-distribution.tsx` (new).
  - Target: `HF#L1065–L1140`.
  - Behavior: stacked horizontal distribution bars. Clicking an active member row toggles the dashboard filter in-place (`?member=<id>`, then `?member=all`). Clicking Household filters in-place to `?member=household`. Renders archived members as display-only non-clickable rows (`isClickable: false`).

- [x] **T019 🎨 [US5] Implement GoalHighlightCard component**
  - Files: `src/components/dashboard/goal-highlight-card.tsx` (new).
  - Target: `HF#L1145–L1220`.
  - Behavior: goal card with SVG progress ring, current balance vs. target, and formatting funding pace note from domain `status` and `monthsToTarget` (`"At ₱X/mo → N months to target"`, `"No contributions this month · ₱X left"`, or `"Funded — ready to draw"`).

- [x] **T020 🎨 [US5] Implement UpcomingCommitmentsCard component**
  - Files: `src/components/dashboard/upcoming-commitments-card.tsx` (new).
  - Target: `HF#L1225–L1360`.
  - Behavior: target-dated commitments list (`targetAmount > 0`), due month formatted in UI via `formatMonthLabel`, remaining amount, and favourable `"₱0 left · Funded"` state.

---

## Phase 05 — Screen Assembly, Route Group, Boundaries, & Component Tests

- [x] **T021 [US1–US7] Implement DashboardScreen assembly**
  - Files: `src/components/dashboard/dashboard-screen.tsx` (new).
  - Target: `HF#L50–L205, L830–L1360`.
  - Behavior: integrates Header, Row 1, Row 2, Row 3, Row 4, and `EntryModal` with `router.refresh()`.

- [x] **T022 [US1–US7] Migrate root dashboard route to isolated route group**
  - Files: `src/app/(shell)/(dashboard)/page.tsx` (new), `src/app/(shell)/page.tsx` (remove).
  - Behavior: Server Component at `/(shell)/(dashboard)/page.tsx` resolving searchParams and rendering `DashboardScreen`. Remove old placeholder `src/app/(shell)/page.tsx`.

- [x] **T023 🎨 [US7] Implement isolated Dashboard loading skeleton and error boundary**
  - Files: `src/app/(shell)/(dashboard)/loading.tsx` (new), `src/app/(shell)/(dashboard)/error.tsx` (new).
  - Behavior: `loading.tsx` matches 4-row dashboard skeleton; `error.tsx` renders error card with `retry()` callback without affecting sibling shell pages.

- [x] **T024 [US1–US7] Add comprehensive Dashboard React Testing Library test suite**
  - Files: `tests/components/dashboard/dashboard-screen.test.tsx` (new).
  - Behavior: tests rendering of full dashboard with mock data, empty state, unbudgeted state, member filtering, interactive range toggle, drill-down links to `/entries`, non-clickable archived rows, `loading.tsx` skeleton, `error.tsx` retry button, and **direct entry save via `EntryModal`** (submitting entry form, asserting mock `fetch` called with `POST /api/entries` and payload `{ type, amount, date, itemId, ownerMemberId, note }`, toast notification displayed, modal closed, and `router.refresh()` called).
  - Validation: `npm run test tests/components/dashboard/dashboard-screen.test.tsx`.

---

## Phase 06 — Release Prep

- [x] **T025 Bump package version**
  - Files: `package.json`, `package-lock.json`.
  - Bump version to `3.3.0`.

- [x] **T026 Update CHANGELOG.md**
  - Files: `CHANGELOG.md`.
  - Document Feature 004 capabilities under `[3.3.0]`.

- [x] **T027 Update feature roadmap**
  - Files: `docs/feature_roadmap.md`.
  - Mark `F04 — Dashboard & Reporting` as `✓ Complete`.

- [x] **T028 Update README.md and REPO_MAP.md**
  - Files: `README.md`, `docs/REPO_MAP.md`.
  - Document Dashboard components and read model.

- [x] **T029 Run release documentation tests**
  - Command: `npm run test tests/release-docs.test.ts`.

---

## Phase 07 — Browser Smoke Test & Visual Review

- [x] **T030 [US7] Test 1 — Fresh Install & Empty States** (`quickstart.md §4`)
- [x] **T031 [US1] Test 2 — Seeded Overview & Runway Consistency** (`quickstart.md §4`)
- [x] **T032 [US2] Test 3 — Budget Utilization & Trend Range** (`quickstart.md §4`)
- [x] **T033 [US3] Test 4 — Category Spending & Drill-Down Matching** (`quickstart.md §4`)
- [x] **T034 [US4] Test 5 — Member Filter, In-Place Filter Toggle, & Non-Clickable Archived Rows** (`quickstart.md §4`)
- [x] **T035 [US5] Test 6 — Goal Progress & Fully Funded Commitments** (`quickstart.md §4`)
- [x] **T036 [US6] Test 7 — Direct Entry EntryModal Save & Refresh** (`quickstart.md §4`)
- [x] **T037 🎨 Visual review at 1100px, 1280px, and 1440px desktop breakpoints**

## Phase 01 implementation record — 2026-11-10

T001–T007 implemented; Phases 02–07 remain pending. Changes are limited to dashboard domain types, pure calculation helpers, barrel exports, and their unit tests. No source UI, server query, storage, navigation, release, or dependency changes.

Implementation choices within the documented contracts:
- Category comparisons accept exact-centavo records plus the full category merge closure, reuse F03 comparison rows, and exclude folded source rows from totals.
- Member distribution consumes already period/category-scoped entry details; owner highlighting is left to the later read model. Segment widths use the maximum member spend, as T005 specifies.
- Goal highlights accept a selected goal bucket and gross monthly funding, with required authoritative activities, selected month, and planned monthly amount, reusing calculateBucketMetrics. Commitments consume F03 BucketDerivedMetrics so current balances are never reconstructed independently.
- Runway remains the existing calculateSavingsKpis implementation, already exported through the domain barrel; no duplicate runway formula was introduced. SVG path construction and formatting remain out of scope for this pure-domain phase.

Validation:
- New domain test suite: 30 tests passing. Initial test-first run failed because dashboard-calculations did not exist; after implementation all new cases passed.
- npm run typecheck: passed.
- npm run lint: passed.
- npm run format:check: passed before this record; changed files checked again afterward.
- npm run test -- --maxWorkers=2: 403 tests passed across 48 files.
- git diff --check: passed.
- npm run build -- --webpack: passed, including production compilation, TypeScript, page generation, and trace collection.
- Default npm run build (Turbopack): attempted but blocked by a child-process startup failure in the existing globals.css/PostCSS pipeline (favicon route output). The sandboxed attempt also could not fetch the existing Google Fonts; a network-enabled retry got past fonts but reproduced the Turbopack worker failure. Build configuration was not changed. This was an implementer-environment failure, not a project-wide build blocker: the user subsequently independently verified that the default npm run build passes on this machine. The supported Webpack build also passed during implementation.

Environment notes: the first unrestricted-worker full-suite run had one existing migration-test timeout (402 passed); the lower-worker retry passed all tests. Test temporary files use an ignored workspace-local directory under node_modules/.cache to avoid sandbox rename errors and Next.js build cleanup. No user database was seeded or cleared. The planning worksheet's pending independent re-review notes concern Phase 02 owner/filter behavior; this implementation does not change or close those notes.
### Phase 01 review fixes — 2026-11-10

- MINOR 1: Category status tones now map directly from F03 comparison-row tone (green → favourable, red → critical, amber → warning, muted → neutral). Burn-rate thresholds remain confined to the burn-rate gauge. Added regressions at 90%, 100%, and 110% category utilization; all three failed before the fix and pass afterward.
- MINOR 2: Removed defaults for goal activities, selected month, and planned amount. Every caller must supply all five arguments; a compile-time regression assertion protects that required-parameter contract. Existing withdrawal/funding tests continue to verify the authoritative balance.
- INFO: Corrected the source widthRatio comment to refer to the largest member total. Phase 02 must still supply all historical member/category metadata, verify segment totals, and set isSelected; no Phase 02 implementation is included. SVG path tests remain with the Phase 03 gauge component. The current scripts use npm run test; the nonexistent test:run alias mentioned in older prose was not added. Negative historical sparkline inputs remain a documented follow-up to resolve against the approved normalization rules.
- The user's independent review confirmed the default Turbopack build passes. The earlier failed build is retained above as historical environment evidence, not a current project blocker.
Review-fix validation: 34 Dashboard tests and 407 total tests across 48 files passed; lint, typecheck, full formatting check, git diff check, and the default Turbopack production build all passed. No later phase was started.

## Phase 02 implementation record — 2026-11-10

T008–T011 implemented and validated. Phase 01 changes remain intact; Phases 03–07 are not started.

- Added src/server/dashboard-read.ts: server-only request-time assembly after await connection(), one grouped 12-month entries query with half-open date bounds, existing store reads for configuration/plans, active savings metrics and historical buffer points, domain-helper reuse, KPI plan deltas, all approved owner/category combinations, complete modal data, archived reporting metadata, and owner highlighting.
- Entries accepts initial category/owner/member query parameters, validates active owner/category selections, and supports the link-only Household-only label and summary behavior. Existing F02 member-plus-shared filtering, dropdown options, row marking, mutations, and existing tests are preserved.
- Added 17 migrated in-memory SQLite integration cases and appended 5 drill-down component/route cases to the existing Entries screen test file. Although T008 labeled that test file new, it already contained 23 tests; all existing test bodies are retained. The resulting Entries screen suite has 28 tests.
- Resolved the Phase 01 INFO handoffs relevant to this phase: archived member/category metadata is passed to distribution calculations and segment totals are tested; isSelected is derived from the validated owner filter. Historical negative buffer amounts are clamped only as sparkline inputs to preserve normalized plotting bounds; authoritative savings/current balances remain unchanged. Tests cover pre-opening backdated withdrawals and future movement exclusion from historical points.

Implementation choices: initial Entries filter props initialize the workspace; standard subsequent dropdown interactions retain their F02 behavior. Monthly budget plans remain household-wide. An owner filter always suppresses KPI plan deltas, including when combined with a category filter. Historical opening balances use bucket creation month, while movements use effective financial dates. No cache, schema, dependency, route migration, Dashboard component, or release changes were introduced.

Validation:
- Test-first runs verified missing read model and absent Entries parameter initialization; new cases passed after implementation. The negative historical-point regression also failed before the plotting clamp and passed afterward.
- Targeted Phase 02 tests: 22 passing; existing Entries screen suite plus new cases: 28 passing.
- npm run typecheck, npm run lint, npm run format:check, and git diff --check: passed.
- npm run test -- --maxWorkers=2: 429 tests passed across 49 files, preserving all earlier test cases.
- npm run build (default Turbopack): passed with production compilation, TypeScript checks, and page generation.
- Tests use temporary migrated in-memory databases; no user database was seeded or cleared. No browser smoke walk or Dashboard visual acceptance was run, as those remain in Phase 07 and the Dashboard route/components are not yet wired.
### Phase 02 review correction — URL validation coverage (2026-11-10)

Resolved the MINOR coverage finding without changing production behavior. Extended the drill-down fixture with explicit archived member/category records, parameterized owner fallback tests for unknown and archived IDs, and added category fallback tests for unknown and archived IDs. Category cases assert All categories, the complete unfiltered entry set, and the exact Expense total. The Entries screen suite now has 31 passing tests (all 23 original F02 cases retained).

Verified the archived owner/category regressions by temporarily allowing archived records in the route validator: both archived cases failed as expected, while the unknown cases still passed. Restored the original route source byte-for-byte before final validation; only the existing test file and this record were changed for this correction.

Validation: 432 tests passed across 49 files using npm run test -- --maxWorkers=2; lint, typecheck, formatting, git diff check, and the default Turbopack production build passed. No Phase 03 work, production refactoring, dependency/script changes, or database changes were included. The review's INFO observations remain considerations for later authorized work.
## Phase 03 implementation record — 2026-11-10

T012–T016 implemented and validated. Added the five targeted components in src/components/dashboard and focused tests in tests/components/dashboard/phase-three.test.tsx. Prior phase changes are preserved. No screen assembly, route migration, server/domain changes, Rows 3–4, release work, or dependencies were added.

- DashboardHeader reuses PageHeader and MonthPicker, provides keyboard-accessible native owner/category selectors, and emits filter patches and Add entry callbacks for the later screen orchestrator.
- SavingsBufferHero renders exact money, one-decimal/null runway, household labels, and presentation-only normalized-to-SVG sparkline conversion, including empty/single-point display.
- SecondaryKpiGrid renders the four authoritative amounts, signed unallocated deficits, approved plan delta wording, scope subtitles, and unavailable values. Small savings-shortfall text uses the existing accessible warning token.
- BurnRateGauge renders all domain display states and a capped clockwise 270-degree value path. The canonical hi-fi uses a 200×182 SVG and radius 76 with static outer status bands; that visual source takes precedence over research section 1.2's conflicting 200×200/radius-75 description. Geometry stays in the UI; tests verify empty, midpoint, full, and clamped paths.
- BudgetTrendChart provides keyboard-accessible month buttons and range toggles, selected/overspent/neutral bars, month labels, selected-plan dashed reference (omitted when unbudgeted), optional plan-name and household labels, and applicable empty states.

Validation:
- Test-first component run failed on the missing components; all 13 focused component tests pass after implementation.
- npm run test -- --maxWorkers=2: 445 tests passed across 50 files.
- npm run lint, npm run format:check, npm run typecheck, git diff --check, and default npm run build (Turbopack): passed.
- Screenshot inspection of an isolated static-render preview using actual production CSS and bundled fonts at 1100, 1280, and 1440px: document scrollWidth equals viewport width at every size; no section/header internal overflow. Captures are in the ignored node_modules/.cache/phase03-preview directory (phase03-1100.png, phase03-1280.png, phase03-1440.png). The fixture supplies only Header/Rows 1–2 in the prototype grid; it is not a production screen or Phase 05 integration. Native select menus prioritize keyboard behavior; interactions are verified by RTL rather than this non-hydrated visual fixture.
- Browser setup required the cached Playwright CLI and an installed Chromium executable; registry access was unavailable, so no package was installed. Browser and preview server had to run outside the Windows sandbox to share loopback access.

No automated check was skipped. Full Dashboard route interaction, Row 3/4 visuals, loading/error integration, and the end-to-end smoke walk remain in their scheduled later phases.

### Phase 03 review remediation — 2026-11-10

All three MINOR findings addressed. The user explicitly chose “Restore trend lines” rather than accepting a deviation. This authorizes the narrow extension into the KPI domain type, read model, their tests, and the spec/data-model/plan; later phases remain untouched. The initial native-selector implementation and preview record above are superseded by this remediation.

- Header now follows the Entries chip-and-dropdown pattern, including keyboard activation, Escape, focus restoration, outside-click and focus-leave dismissal. Controls appear owner, category, month, Add entry; Add entry uses the teal accent and hover state. Owner options retain Dashboard semantics (All members, Household, individual members); duplicate category names retain umbrella disambiguation.
- BurnRateGauge accepts optional `scopeLabel` for `<Category> budget utilization`, while preserving the household label fallback. Added a category scope regression test.
- Restored all four prototype 88×30 trend lines beside KPI figures, retaining plan deltas. `kpis.history` supplies 12 oldest-first monthly samples ending with the selected month, independently of the expense chart range. Each sample follows current owner/category applicability; quiet months are zero. Savings use authoritative gross contributions to currently active buckets; owner-filtered net excludes household savings. Raw signed unallocated amounts are preserved; min/max plotting handles negative values. Inapplicable cards omit their trend; empty/flat history renders safely.
- Updated spec.md, data-model.md and plan.md with the history contract and filter semantics. Corrected research.md to the actual prototype’s 200×182 gauge, radius 76, outer bands and endpoint arc geometry.

Validation:
- New regressions failed first for absent chip controls, category scope, monthly history and trend SVGs; all 34 focused component/read-model tests now pass.
- Added history coverage for quiet months, negative net, selected-month reconciliation, gross contributions versus withdrawals, archived buckets, future activity exclusion, owner/Household and combined category scope.
- `npm run test -- --maxWorkers=2`: 449 tests passed across 50 files. `npm run lint`, `npm run typecheck`, `npm run format:check`, `git diff --check`, and default `npm run build` (Turbopack): passed.
- Inspected isolated component preview screenshots at 1100/1280/1440px using current production CSS/fonts. All three have document width equal to viewport width and no section/header internal overflow. Updated captures: ignored `node_modules/.cache/phase03-preview/phase03-review-{1100,1280,1440}.png`. Interactions verified by RTL; this static preview does not claim Phase 05 route integration or Phase 07 acceptance. Preview browser/server closed.

No checks skipped. The remaining INFO suggestions (colour token consolidation, shared month formatter, future test-file naming and the pre-existing test script alias) were not expanded into this three-finding fix. No commit or later phase performed.


## Phase 04 implementation record — 2026-11-10

T017–T020 implemented and validated. Added only the four targeted detail-card components and `tests/components/dashboard/dashboard-details.test.tsx`, plus this record. Prior phase changes are preserved. No domain/server changes, screen assembly, routes, release work or dependencies were added.

- CategoriesBreakdownTable uses a semantic table, authoritative money/delta/remaining values, category swatches, capped progress and textual budget status. Active category links cover the row, preserve month/category/owner context, and retain native keyboard navigation. Archived rows show `(archived)` and have no link. Missing plans omit fabricated budget comparisons; income-category/empty tables have explicit empty text. D2 household budget labeling and D3 current-month remaining copy are applied. Table column proportions leave space for readable amounts at 1100px, consistent with the approved responsive requirement.
- MemberExpenseDistribution renders domain-scaled category segments, exact member totals, category labels/legend and segment text alternatives. Native buttons emit in-place member/Household filter changes and toggle selected rows back to all; selected state uses `aria-pressed`. Archived members are display-only. Empty and income-category states are explicit.
- GoalHighlightCard renders the prototype's 104px ring with a 74px inner opening using SVG, exact balance/target amounts, domain-provided funding pace, funded/no-contribution/no-goal states, and optional Household scope. No financial projections are recalculated in the UI. Warning text uses the approved accessible warning token (D5).
- UpcomingCommitmentsCard displays the already filtered/sorted domain commitments, formats due months in UTC via a local `formatMonthLabel`, shows exact remaining amounts and an explicit green `₱0 left · Funded` state, and supports empty and Household scope labels. D1 replaces the prototype's fabricated recurring commitments.

Validation:
- Test-first run failed because the four components did not exist. All 10 focused tests now pass, covering all/member/Household drill-down URLs, archived/non-clickable rows, missing plans, applicability and empty states, keyboard member toggling, selected state, segment proportions/colours, ring geometry, pace and funded states, due-month/year formatting, and exact centavos.
- `npm run test -- --maxWorkers=2`: 459 tests passed across 51 files. Focused tests rerun after final layout adjustment: 10 passed.
- `npm run lint`, `npm run format:check`, `npm run typecheck`, `git diff --check`, and default `npm run build` (Turbopack): passed. Typecheck initially caught unbranded colour literals in the test fixture; corrected using `parseHexColor`, then typecheck and build passed.
- Inspected an isolated static-render preview with actual production CSS/fonts at 1100, 1280 and 1440px. Document width equals viewport width, sections/tables have no internal overflow, and remaining amounts do not wrap at these sizes. Captures: ignored `node_modules/.cache/phase03-preview/phase04-{1100,1280,1440}.png`. A narrow-width remaining-column wrap found during inspection was corrected before final captures.
- Real browser pointer clicks on an active row's amount cell followed its row-wide category link; an archived row's amount cell stayed on the preview. RTL verifies member button callbacks and keyboard interaction. The preview uses fixture data and does not claim production route assembly or Phase 07 acceptance. Preview browser/server closed.

No automated gate skipped. Screen assembly, route integration, loading/error boundaries and end-to-end acceptance remain in their scheduled later phases. No commit or subsequent phase performed.

### Phase 04 review fixes

Category progress bars use a separate utilization tone calculated from the 85% and 115% thresholds. Signed deltas still use variance colours. Positive remaining amounts are green, and warning category bars and the goal ring use the prototype amber token.

The Categories card distinguishes an empty month from an inapplicable income filter. The goal empty state uses the plural form. Quickstart Test 1 reflects the displayed copy, including the member card's no-spending state.

Verification passed for all 464 tests across 51 files, lint, typecheck, formatting, diff check and the production build. Component tests verify the colour tokens and empty-state text.


## Phase 05 implementation record

T021–T024 are complete. DashboardScreen assembles the four rows and preserves validated reporting filters in URL navigation. The reused EntryModal refreshes through its mutation hook and DashboardScreen shows its feedback with the shared Toast. The root dashboard, loading skeleton, and retry boundary live in the dashboard route group.

The page accepts single query values and lets the read model validate month, member, and category. Repeated values use defaults. Entry defaults follow the existing modal's current date and Household owner. The shell test dropped its obsolete Dashboard placeholder assertion and retains the Forecaster placeholder check.

Eight focused tests cover rendering, empty and unbudgeted states, query forwarding, member and chart navigation, category links, archived rows, loading, retry, and the real modal with a mocked POST. The full suite passed with 471 tests across 52 files. Lint, formatting, typecheck, diff check, and the production build passed.

Browser verification used the built app with isolated seeded SQLite data. The dashboard fit at 1100, 1280, and 1440px without horizontal overflow. The 12-month toggle updated the URL and selected state. A real entry POST returned 201, closed the modal, showed the success toast, and increased Expenses by ₱12.34. This check did not cover Phase 07 acceptance.


## Phase 06 implementation record

T025–T029 are complete. Package and lockfile metadata are at 3.3.0. The changelog uses the release-prep date, 2026-11-14, and the roadmap marks F04 complete. The README and repository map now reflect Dashboard reporting. The roadmap records the spec's decision that item moves reclassify historical actuals while applied budget allocations stay unchanged.

Release documentation tests now check F04 metadata, mapped source paths, and quickstart links. All five release documentation tests and all 472 tests across 52 files passed. Lint, formatting, typecheck, diff check, and the production build passed. Browser acceptance is tracked in Phase 07.


## Phase 07 implementation record

T030–T037 are complete. The quickstart walks ran in Chromium against the production build on port 3100, using an isolated database (`CELIA_DB_PATH=./data/f04-smoke.db`). The default `./data/celia.db` was not touched. Each walk compared the page with figures computed directly from the database and with `/savings`. Tests 2–7 were re-run from a freshly seeded database after the first run, because Test 2 archives a bucket and Test 7 adds an entry.

- Test 1 (T030): all empty states, the flat sparkline, `+₱0` in teal, and the no-plan gauge matched (18 of 18 checks).
- Tests 2–7 (T031–T036): 64 of 65 checks passed with no console or page errors. Buffer, runway and KPIs matched the database and `/savings`. Archiving Emergency fund lowered the buffer, Savings and the sparkline together. The gauge showed 98% "On pace" in the warning colour. The 12-month toggle and bar navigation kept the other filters. Drill-down totals matched under All members (Expense chip), Ana ("own" chip) and Household ("Household only ▾" plain total). Member rows filtered in place and toggled back. Goal and commitments sorted correctly, with Insurance shown as funded. A saved entry returned 201, closed the modal, showed the toast, and moved Expenses, Unallocated, Groceries and the gauge by ₱1,250.
- The one failed check is documentation: Test 2 step 2 expects `₱470,000`, but the seed produces ₱466,000 (₱250,000 Cash buffer + ₱120,000 Emergency fund opening + 12 × ₱8,000). The dashboard matches the database and `/savings`. The quickstart and the spec's US1 independent test still say ₱470,000; they were not changed in this phase.
- Steps that depend on archived categories or members (Test 4 step 2, Test 5 step 7) had no such records in the seed. Archived rows remain covered by component and server tests.
- Visual review (T037): no horizontal page scroll or card overflow at 1100, 1280 and 1440px, unfiltered and with Ana and Groceries selected, with no console errors.

Residual observations, not changed in this phase:

- The seed creates every bucket at seeding time but backdates 12 months of contributions. Because opening balances count only from a bucket's creation month, the hero sparkline stays low for 11 months and jumps in the current month.
- "Member net" and "Household savings" labels remain under KPIs that show `—` for a category filter.
- The trend legend omits the applied model name shown in the prototype.

## Phase 07 follow-up

- Corrected the seeded buffer total to ₱466,000 in quickstart Test 2 and the US1 independent test.
- Added the Entries URL parameters and link-only Household only view to the 3.3.0 changelog.
- Hid scope subtitles for unavailable KPIs and changed the Income, Expenses, and Savings trend strokes to the muted token. Unallocated retains its accent.
- Added the selected plan name to the dashboard read model and trend legend. Months without a plan return null.
- Set demo bucket creation dates in the first seed month, preserving their order and recording the actual seed time as the update timestamp. The read-model regression checks all 12 buffer points and the ending balance. Existing databases are unaffected.

Verification passed for all 475 tests across 52 files, lint, typecheck, formatting, diff check, and the production build.

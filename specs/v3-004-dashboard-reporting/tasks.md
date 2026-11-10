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

- [ ] **T001 [P] [US1–US5] Create dashboard view model domain types**
  - Files: `src/domain/dashboard.ts` (new).
  - Expected behavior:
    - Declare TypeScript interfaces per `data-model.md §3`: `DashboardMemberFilter`, `DashboardFilterState`, `SavingsBufferHeroData`, `DashboardKpisData` (including `unallocatedScope: "all" | "household" | "member"` and delta centavos fields `incomeDeltaCentavos`, `expensesDeltaCentavos`, `savingsDeltaCentavos`, `unallocatedDeltaCentavos`), `BurnRateDisplayState`, `BurnRateData`, `BudgetTrendBar`, `BudgetTrendData`, `CategorySpendingRowData`, `CategoriesTableData`, `MemberDistributionSegment`, `MemberDistributionRow`, `MemberDistributionData`, `GoalFundingStatus`, `GoalHighlightData`, `UpcomingCommitmentItem`, `UpcomingCommitmentsData`, `DashboardModalCategory`, `DashboardModalMember`, and `DashboardViewData`.
    - `DashboardModalCategory.items` declared as mutable `{ id: string; name: string }[]` for direct `EntryModal` compatibility.
    - Zero formatted text strings (`monthLabel`, `targetMonthLabel`, `centerText`, `subtitle`, `unallocatedSubtitle` removed from domain types).
    - Zero imports from server-only modules (`@/server/*`). All imports strictly from `@/domain/*`.
  - Constraints: pure TypeScript interfaces/types; exact centavo type adherence; strict nullability.
  - Validation: `npm run typecheck`.

- [ ] **T002 [P] [US1] Implement sparkline coordinate normalization helper**
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

- [ ] **T003 [P] [US2] Implement 270° Burn rate gauge mathematical calculation**
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

- [ ] **T004 [P] [US1, US2] Implement Budget trend bar scaling and reuse F03 runway**
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

- [ ] **T005 [P] [US3, US4] Implement Category spending and Member distribution helpers**
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

- [ ] **T006 [P] [US5] Implement Goal progress and Upcoming Commitments sorting**
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

- [ ] **T007 [US1–US5] Export dashboard domain symbols and add comprehensive unit test suite**
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

- [ ] **T008 [P] [US3] Add bounded URL search parameter support to `/entries` while preserving F02 filter contract**
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

- [ ] **T009 [US1–US7] Implement `getDashboardView` server read model**
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

- [ ] **T010 [US1–US7] Add integration test suite for `getDashboardView` (Part 1: Core Scopes & Savings Consistency)**
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

- [ ] **T011 [US1–US7] Add integration test suite for `getDashboardView` (Part 2: Filter Matrix, Moves & Edge Cases)**
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

- [ ] **T012 🎨 [US1, US6] Implement DashboardHeader component**
  - Files: `src/components/dashboard/dashboard-header.tsx` (new).
  - Target: `HF#L52–L80`.
  - Behavior: renders title `"Dashboard"`, `MonthPicker`, `OwnerFilter` dropdown, `CategoryFilter` dropdown, and `+ Add entry` CTA.
  - Breakpoints: 1100px, 1280px, 1440px.

- [ ] **T013 🎨 [US1] Implement SavingsBufferHero component**
  - Files: `src/components/dashboard/savings-buffer-hero.tsx` (new).
  - Target: `HF#L50–L75, L830–L845`.
  - Behavior: dark hero card (`#3a4145`), `SAVINGS BUFFER`, JetBrains Mono 38px figure, `"N.N months runway"` subtitle, and 12-month SVG sparkline.

- [ ] **T014 🎨 [US1] Implement SecondaryKpiGrid component**
  - Files: `src/components/dashboard/secondary-kpi-grid.tsx` (new).
  - Target: `HF#L85–L135, L845–L880`.
  - Behavior: 4 KPI cards (`INCOME`, `EXPENSES`, `SAVINGS`, `UNALLOCATED`), formatting `null` as `—`. Renders delta variance subtitles comparing actuals to plan allocations:
    - Income delta: `+₱X vs plan` (green when $\ge 0$, red when $< 0$).
    - Expense delta: `₱X unspent` (favourable green when $> 0$, `₱X overspent` critical red when $< 0$).
    - Savings delta: `+₱X vs plan` (green when $\ge 0$, `-₱X vs plan` warning text `#8a6516` when $< 0$).
    - Unallocated delta: `+₱X vs plan` (green when $\ge 0$, red when $< 0$).
    - Unallocated card subtitle reflects `unallocatedScope`: `"Unallocated"` (`"all"`), `"Household net"` (`"household"`), or `"Member net"` (`"member"`).
    - When unbudgeted (`hasMonthlyPlan === false`) or under an individual member filter (D2), deltas render `"No plan applied"` or are omitted.

- [ ] **T015 🎨 [US2] Implement BurnRateGauge component**
  - Files: `src/components/dashboard/burn-rate-gauge.tsx` (new).
  - Target: `HF#L140–L170, L885–L910`.
  - Behavior: 270° SVG arc, formatting center text and subtitle based on domain `state` and `statusTone` (green <85%, amber 85–115%, red >115%, unbudgeted empty state `—`, zero-budget critical full arc, and income category neutral state).

- [ ] **T016 🎨 [US2] Implement BudgetTrendChart component**
  - Files: `src/components/dashboard/budget-trend-chart.tsx` (new).
  - Target: `HF#L175–L205, L915–L945`.
  - Behavior: 6/12 mo pill toggle, bar heights scaled to peak, overspent red highlighting against each month's plan, dashed selected-month budget line, and empty state when `isApplicable === false`. Formats month labels via `formatMonthLabel(bar.monthKey)`.

---

## Phase 04 — Hi-Fi Row 3 & Row 4 UI Components

- [ ] **T017 🎨 [US3] Implement CategoriesBreakdownTable component**
  - Files: `src/components/dashboard/categories-breakdown-table.tsx` (new).
  - Target: `HF#L985–L1060`.
  - Behavior: spending breakdown table with category swatches, progress bars, favourable-positive delta `Δ`, rollover `↺`, non-clickable rows for archived categories (`isClickable: false`), and 1-click drill-down to `/entries` for active categories. Displays empty state when `isApplicable === false`.

- [ ] **T018 🎨 [US4] Implement MemberExpenseDistribution component**
  - Files: `src/components/dashboard/member-expense-distribution.tsx` (new).
  - Target: `HF#L1065–L1140`.
  - Behavior: stacked horizontal distribution bars. Clicking an active member row toggles the dashboard filter in-place (`?member=<id>`, then `?member=all`). Clicking Household filters in-place to `?member=household`. Renders archived members as display-only non-clickable rows (`isClickable: false`).

- [ ] **T019 🎨 [US5] Implement GoalHighlightCard component**
  - Files: `src/components/dashboard/goal-highlight-card.tsx` (new).
  - Target: `HF#L1145–L1220`.
  - Behavior: goal card with SVG progress ring, current balance vs. target, and formatting funding pace note from domain `status` and `monthsToTarget` (`"At ₱X/mo → N months to target"`, `"No contributions this month · ₱X left"`, or `"Funded — ready to draw"`).

- [ ] **T020 🎨 [US5] Implement UpcomingCommitmentsCard component**
  - Files: `src/components/dashboard/upcoming-commitments-card.tsx` (new).
  - Target: `HF#L1225–L1360`.
  - Behavior: target-dated commitments list (`targetAmount > 0`), due month formatted in UI via `formatMonthLabel`, remaining amount, and favourable `"₱0 left · Funded"` state.

---

## Phase 05 — Screen Assembly, Route Group, Boundaries, & Component Tests

- [ ] **T021 [US1–US7] Implement DashboardScreen assembly**
  - Files: `src/components/dashboard/dashboard-screen.tsx` (new).
  - Target: `HF#L50–L205, L830–L1360`.
  - Behavior: integrates Header, Row 1, Row 2, Row 3, Row 4, and `EntryModal` with `router.refresh()`.

- [ ] **T022 [US1–US7] Migrate root dashboard route to isolated route group**
  - Files: `src/app/(shell)/(dashboard)/page.tsx` (new), `src/app/(shell)/page.tsx` (remove).
  - Behavior: Server Component at `/(shell)/(dashboard)/page.tsx` resolving searchParams and rendering `DashboardScreen`. Remove old placeholder `src/app/(shell)/page.tsx`.

- [ ] **T023 🎨 [US7] Implement isolated Dashboard loading skeleton and error boundary**
  - Files: `src/app/(shell)/(dashboard)/loading.tsx` (new), `src/app/(shell)/(dashboard)/error.tsx` (new).
  - Behavior: `loading.tsx` matches 4-row dashboard skeleton; `error.tsx` renders error card with `retry()` callback without affecting sibling shell pages.

- [ ] **T024 [US1–US7] Add comprehensive Dashboard React Testing Library test suite**
  - Files: `tests/components/dashboard/dashboard-screen.test.tsx` (new).
  - Behavior: tests rendering of full dashboard with mock data, empty state, unbudgeted state, member filtering, interactive range toggle, drill-down links to `/entries`, non-clickable archived rows, `loading.tsx` skeleton, `error.tsx` retry button, and **direct entry save via `EntryModal`** (submitting entry form, asserting mock `fetch` called with `POST /api/entries` and payload `{ type, amount, date, itemId, ownerMemberId, note }`, toast notification displayed, modal closed, and `router.refresh()` called).
  - Validation: `npm run test tests/components/dashboard/dashboard-screen.test.tsx`.

---

## Phase 06 — Release Prep

- [ ] **T025 Bump package version**
  - Files: `package.json`, `package-lock.json`.
  - Bump version to `3.3.0`.

- [ ] **T026 Update CHANGELOG.md**
  - Files: `CHANGELOG.md`.
  - Document Feature 004 capabilities under `[3.3.0]`.

- [ ] **T027 Update feature roadmap**
  - Files: `docs/feature_roadmap.md`.
  - Mark `F04 — Dashboard & Reporting` as `✓ Complete`.

- [ ] **T028 Update README.md and REPO_MAP.md**
  - Files: `README.md`, `docs/REPO_MAP.md`.
  - Document Dashboard components and read model.

- [ ] **T029 Run release documentation tests**
  - Command: `npm run test tests/release-docs.test.ts`.

---

## Phase 07 — Browser Smoke Test & Visual Review

- [ ] **T030 [US7] Test 1 — Fresh Install & Empty States** (`quickstart.md §4`)
- [ ] **T031 [US1] Test 2 — Seeded Overview & Runway Consistency** (`quickstart.md §4`)
- [ ] **T032 [US2] Test 3 — Budget Utilization & Trend Range** (`quickstart.md §4`)
- [ ] **T033 [US3] Test 4 — Category Spending & Drill-Down Matching** (`quickstart.md §4`)
- [ ] **T034 [US4] Test 5 — Member Filter, In-Place Filter Toggle, & Non-Clickable Archived Rows** (`quickstart.md §4`)
- [ ] **T035 [US5] Test 6 — Goal Progress & Fully Funded Commitments** (`quickstart.md §4`)
- [ ] **T036 [US6] Test 7 — Direct Entry EntryModal Save & Refresh** (`quickstart.md §4`)
- [ ] **T037 🎨 Visual review at 1100px, 1280px, and 1440px desktop breakpoints**

# Research: F03 — Budget & Savings

**Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)

This document records the architectural and technical decisions for F03: Budget & Savings, evaluating options, documenting trade-offs, and detailing chosen approaches.

---

## R1. Non-Negative Exact Centavo Arithmetic, Optional Target Parsing, & Shared Month Helpers

**Decision**:
1. Extend `src/domain/amount.ts` with `parseAndValidateNonNegativeAmount(raw: string, field?: string)` and `parseOptionalPositiveAmount(raw: string, field?: string)` while retaining `parseAndValidateAmount` for strictly positive monetary amounts (`> 0`). All monetary quantities remain integer centavos (`1 PHP = 100 centavos`) in SQLite and domain models, formatted only at presentation boundaries via `formatCentavos`.
2. Centralize month-key helpers (`isValidMonthKey(value: string | undefined): value is string` and `currentMonthKey(now?: Date): string`) in `src/domain/month.ts` (re-exported from `src/domain/index.ts`), and update `src/server/entries-read.ts`, `src/server/savings-read.ts`, `src/server/models-read.ts`, `src/domain/savings.ts`, and `src/domain/budget.ts` to share them rather than duplicating regex validators across modules.

**Rationale**:
- Satisfies Constitution Principle X (Financial Precision) and Principle VIII (Clear Boundaries).
- Savings activity (`contribution` / `withdrawal`) requires strictly positive amounts (`> 0`), which reuses `parseAndValidateAmount`.
- Bucket `openingBalance` and budget allocation cells (`BUDGET / MO`) permit `₱0` (`>= 0` centavos), requiring a shared non-negative validator (`0 <= centavos <= MAX_AMOUNT_CENTAVOS`).
- Bucket `targetAmount` is optional (`null` when blank/omitted, or strictly `> 0` when provided).
- Extracting `isValidMonthKey` and `currentMonthKey` into `src/domain/month.ts` eliminates duplication with `src/server/entries-read.ts`.

**Alternatives rejected**:
- Allowing `0` in `parseAndValidateAmount`: Rejected because F02 entries and F03 savings activities must remain strictly positive (`> 0`).
- Defining separate `isValidMonthKey` helpers in `savings.ts`, `budget.ts`, and `entries-read.ts`: Rejected in favor of a single shared domain module `src/domain/month.ts`.

---

## R2. Lifetime Savings Bucket Balances, Gross Monthly Funding, & Default Cash Buffer Invariants

**Decision**:
1. **Lifetime Current Balances**: A savings bucket's balance (`currentBalanceCentavos`), target progress (`progressPercent`, `remainingToTargetCentavos`), `HELD IN BUCKETS`, and `SAVINGS BUFFER` are **lifetime current totals** across all recorded activity for that bucket, regardless of the month selected in the `/savings` month picker:
   $$\text{currentBalanceCentavos} = \text{openingBalance} + \sum_{\text{all}} \text{contributions} - \sum_{\text{all}} \text{withdrawals}$$
   The `/savings` month picker scopes only the month-specific metrics: each bucket card's `"Funded <Mon>"`, the `FUNDED <MONTH>` KPI, the month's planned savings allocations, and the `RUNWAY` expense denominator (`selected month's actual household expenses`).
2. **No Automatic Unallocated Sweep**: No automatic monthly unallocated income sweep is added to any bucket balance.
3. **No Future-Dated Activity & Non-Negative Balance Invariant**:
   - Savings activity dates must be valid calendar dates (`YYYY-MM-DD`) satisfying `date <= today` (`"Activity date cannot be in the future."`).
   - `currentBalanceCentavos >= 0` is enforced before committing any new withdrawal, editing or deleting an existing savings activity, or lowering a bucket's `openingBalance`.
   - Archived buckets (`archivedAt !== null`) are strictly read-only: creating, editing, or deleting an activity on an archived bucket is rejected with `409 archived`.
4. **Gross Contributions for Monthly Funding & Active-Only Per-Bucket KPI Shortfall**:
   - Monthly funding uses **gross contributions** (`sum(contributions)` in `monthKey`) across all three surfaces: bucket card `"Funded <Mon>"`, `/savings` `FUNDED <MONTH>` KPI, and `/models` Savings `ACTUAL`.
   - All `/savings` KPI cards (`HELD IN BUCKETS`, `SAVINGS BUFFER`, `RUNWAY`, and `FUNDED <MONTH>`) scope strictly to **active buckets only** (`archivedAt === null`). In `SavingsKpiSummary`, `monthlyFundedCentavos`, `monthlyPlannedSavingsCentavos`, and `monthlyShortfallCentavos` (**sum of per-bucket shortfalls** `sum(max(0, planned_b − grossContributed_b))` across active buckets) exclude archived buckets, so over-funding one active bucket never masks another active bucket's shortfall and `/savings` KPIs reflect only active buckets (whereas `/models` historical monthly plans continue to display and sum stored non-zero archived bucket rows in the historical table).
   - When no `MonthlyBudgetPlan` exists for `monthKey`, the `FUNDED <MONTH>` KPI subtitle displays `"no plan for <Mon>"` in muted text (and `"no savings planned"` when a plan exists with `₱0` planned savings across active buckets) rather than `"on plan"`.
5. **Default Cash Buffer Rules**:
   - At most one bucket may have `isDefault = true` (restricted to active buckets of `type = 'cash_buffer'`, with `countsTowardBuffer` locked to `true`).
   - Setting `isDefault = true` on another active `cash_buffer` bucket atomically clears `isDefault` on the previous default bucket within the same SQLite transaction.
   - Once a bucket has `isDefault = true`, clearing `isDefault` directly (`PATCH isDefault: "false"`), changing its `type` away from `"cash_buffer"`, setting `countsTowardBuffer: "false"`, or archiving the bucket is rejected with `409 invalid_state` (`"Designate another Cash Buffer bucket as default first."`).

**Rationale**:
- Lifetime balances reflect the real-world money currently held in each bucket and avoid back-dated withdrawal anomalies across month views.
- Gross contributions match Brief §3.7 ("For savings buckets, it should display: Planned savings allocation, Actual contributions, Remaining planned contribution").
- Enforcing all default-bucket invariants in `savings-service.ts` prevents hitting raw SQLite `CHECK` constraints with unhandled `500` errors.

**Alternatives rejected**:
- Cumulative balance cutoff at the end of `monthKey`: Rejected per user decision (C4) in favor of lifetime current balances with `date <= today`.
- Allowing `PATCH isDefault: "false"` on the current default bucket: Rejected to keep a single consistent rule across edit and archive (`Designate another Cash Buffer bucket as default first`).

---

## R3. Unified Allocation Tables with Discriminated Foreign Keys (Migration 3)

**Decision**: Introduce 6 tables in Migration 3 (`PRAGMA user_version = 3`):
- `savings_buckets`
- `savings_activities`
- `budget_models`
- `budget_model_allocations`
- `monthly_budget_plans`
- `monthly_budget_allocations`

In `budget_model_allocations` and `monthly_budget_allocations`, each row stores a `target_type` (`'category'` or `'bucket'`), nullable `category_id REFERENCES categories(id)`, and nullable `bucket_id REFERENCES savings_buckets(id)`, guarded by a `CHECK` constraint ensuring exactly one of `category_id` or `bucket_id` is non-null, plus partial unique indexes on `(model_id, category_id)` / `(model_id, bucket_id)` and `(plan_id, category_id)` / `(plan_id, bucket_id)`.

Date and month columns (`date`, `target_month`, `month_key`) use `length(...)` and `GLOB '[0-9]...'` shape constraints in SQLite (matching Migration 2's `entries` table), while calendar validity (`01..12` months, valid day-of-month, leap years, and `date <= today`) is enforced in the domain and service layers.

**Rationale**:
- Matches the exact 6 table names specified in `spec.md` US8 AC3 and Data Considerations.
- Preserves SQLite foreign-key enforcement to both `categories(id)` and `savings_buckets(id)`.
- Keeps SQLite schema checks and migration tests aligned with F02 conventions.

**Alternatives rejected**:
- Untyped `target_id TEXT` without foreign keys: Rejected because it sacrifices SQLite `FOREIGN KEY` enforcement.
- Attempting full leap-year calendar validation inside SQLite `CHECK` expressions: Unnecessary complexity in DDL when domain/service validators already enforce exact calendar rules.

---

## R4. Two-Mode `/models` Workspace: Selectable Month's Plan Card vs. Reusable Model Cards

**Decision**:
1. **Left Rail (`model-list.tsx`)**:
   - **Top card — Selected Month's Applied Plan**: When `appliedPlan !== null` for `monthKey`, renders a selectable **Month's Plan card** (`"<Mon YYYY> plan"`, subtitle `"from <modelName>"` or `"<modelName> · revised"`, `ACTIVE` pill badge, `₱X exp · ₱Y sav`, `unallocated ₱Z/mo`). When `appliedPlan === null`, renders a muted non-selectable card (`"No plan applied for <Mon YYYY>"`).
   - **Below — Reusable Models list**: Lists all reusable `BudgetModel` cards (`name`, badge `ACTIVE` when `appliedPlan?.sourceModelId === model.id && !appliedPlan.isRevised && !appliedPlan.hasTemplateDiverged` or `REVISED` / `DIVERGED` when applicable, `₱X exp · ₱Y sav`, `unallocated ₱Z/mo`) and `+ New model`.
   - **Default selection**: Defaults to the **Month's Plan card** (`selectedView = { kind: "plan" }`) whenever `appliedPlan !== null` for `monthKey`; otherwise defaults to the first reusable `BudgetModel` card (`selectedView = { kind: "model", modelId: models[0].id }`).
2. **Right Detail Pane Modes (`models-screen.tsx`, `models-table.tsx`)**:
   - **Month's Plan Mode (`selectedView.kind === "plan"`)**:
     - Editing `BUDGET / MO` cells revises the month's snapshot (`PATCH /api/monthly-plans/:monthKey`, setting `is_revised = 1`).
     - Past months (`monthKey < currentMonthKey()`) lock `BUDGET / MO` inputs by default until the user clicks `"Unlock to revise past plan"` and confirms in a `ConfirmDialog`.
     - If `appliedPlan.sourceModelId` still exists and `(appliedPlan.isRevised || appliedPlan.hasTemplateDiverged)`, header shows a **`Re-apply template`** button (requiring confirmation via `ConfirmDialog`); otherwise shows disabled **`Active`**.
     - `ACTUAL`, `Δ`, charts, and `Unallocated` footer compare the **month's applied plan** against `monthKey`'s actuals.
   - **Reusable Model Mode (`selectedView.kind === "model"`)**:
     - Editing `BUDGET / MO` cells updates the reusable model template (`PATCH /api/models/:id`), never mutating `monthly_budget_plans`.
     - Header shows **`Edit`** (opens `ModelModal` for name/description), **`Duplicate`**, **`Make active`** / **`Re-apply`** / disabled **`Active`**, and **`Delete`** (with `ConfirmDialog`).
     - Button state:
       - If `appliedPlan === null`: **`Make active`** (applies immediately if `monthKey >= currentMonthKey()`, or after `ConfirmDialog` if `monthKey < currentMonthKey()`).
       - If `appliedPlan.sourceModelId === model.id`: disabled **`Active`** when `!isRevised && !hasTemplateDiverged`, or enabled **`Re-apply`** (with `ConfirmDialog`) when `isRevised || hasTemplateDiverged`.
       - If `appliedPlan !== null && appliedPlan.sourceModelId !== model.id`: enabled **`Make active`** (with `ConfirmDialog` before replacing the existing plan).
     - `ACTUAL`, `Δ`, charts, and `Unallocated` footer live-preview the **selected reusable model's allocations** against `monthKey`'s actuals.
3. **Applying a Model (`applyBudgetModelToMonth`)**:
   - Copies only **active** categories (`archivedAt === null && mergedIntoCategoryId === null`) and **active** buckets (`archivedAt === null`) from the reusable model into `monthly_budget_allocations`. Any non-zero archived line remaining in a reusable model is skipped so new monthly plans never inherit un-fundable archived buckets or categories.
   - Each `monthKey` maintains a single active snapshot row in `monthly_budget_plans` (updated in place on revision or re-application).

**Rationale**:
- Resolves all ambiguity between template editing (US4), monthly snapshot management (US5), and Budget-vs-Actual inspection (US6) per user decisions C2a, C2b, and C10.

**Alternatives rejected**:
- Implicitly routing table edits to either the model or the monthly plan without a separate Month's Plan card: Rejected because users cannot tell whether they are mutating the reusable template or the monthly snapshot.

---

## R5. Budget-vs-Actual Calculations, Deterministic Rounding, & Favourable-Positive Variance (`Δ`)

**Decision**:
- Centralize all budget and savings math in `src/domain/savings-calculations.ts` and `src/domain/budget-calculations.ts`:
  - **Selected-month actuals**:
    - Income & Expense categories: sum of F02 `entries.amount` dated within `monthKey` (`YYYY-MM`) grouped by `categoryId`.
    - Savings buckets: sum of F03 `savings_activities.amount` where `kind = 'contribution'` dated within `monthKey` grouped by `bucketId` (gross contributions).
  - **Favourable-positive `Δ`** (per `product-decisions.md` line 18 and Spec US6 AC3; note `product-decisions.md` line 23 has a conflicting parenthetical mentioning red for savings shortfalls, which is superseded by line 18 and `HF#L1064, L1078, L1102, L1113`):
    - **Expenses**: `deltaCentavos = plannedCentavos − actualCentavos` (`+` green, `−` red).
    - **Income**: `deltaCentavos = actualCentavos − plannedCentavos` (`+` green, `−` red).
    - **Savings**: `deltaCentavos = actualContributionsCentavos − plannedCentavos` (`+` green, `−` **amber `#b9822c`, never red**).
  - **Unallocated Footer (`planned`, `actual`, `Δ`)**:
    - `plannedUnallocatedCentavos = expectedIncomeCentavos − plannedExpensesCentavos − plannedSavingsCentavos`
    - `actualUnallocatedCentavos = actualIncomeCentavos − actualExpensesCentavos − actualSavingsCentavos`
    - `unallocatedDeltaCentavos = actualUnallocatedCentavos − plannedUnallocatedCentavos` (`+` green when `> 0`, `−` red when `< 0`, `0` muted).
  - **Deterministic Rounding (Constitution Principle X)**:
    - **Bucket target progress (`progressPercent`)**: `Math.floor((currentBalanceCentavos * 100) / targetAmount)` so `99.6%` displays `"99%"` in amber and `100%` appears only when `currentBalanceCentavos >= targetAmount` (e.g. `"100%"`, `"105%"`).
    - **Runway (`runwayMonths`)**: `Math.round((savingsBufferCentavos * 10) / monthlyExpensesCentavos) / 10` (1 decimal place, or `null` → `"—"` when `monthlyExpensesCentavos === 0`). Using the selected month's actual expenses is documented as the accepted design.
    - **Expense utilization (`utilizationPercent`)**: `Math.round((actualCentavos * 100) / plannedCentavos)` when `plannedCentavos > 0`, or `null` when `plannedCentavos === 0` (displaying `"—"` when `actual = 0`, or `"Overspent"` when `actual > 0`).
  - **Client Edit Ergonomics (`BUDGET / MO`)**:
    - Typing a valid non-negative number in a `BUDGET / MO` input recalculates all totals, charts, and `Δ` values locally in `<10ms`.
    - Server persistence (`PATCH`) fires on `blur` or `Enter` (when changed); `Escape` reverts the cell to its last persisted value.

**Rationale**:
- Ensures deterministic integer/tenths rounding across all financial displays and eliminates floating-point drift or premature `100%` target completion.

---

## R6. Historical Integrity & Post-Merge Budget-vs-Actual Resolution

**Decision**:
1. **Category Merge (`mergeCategory` in `src/server/categories-service.ts`)**:
   - Inside `mergeCategory(sourceCategoryId, targetCategoryId)`'s transaction, call `mergeCategoryAllocationsInModels(database, sourceCategoryId, targetCategoryId, timestamp())` in `src/server/models-store.ts` to sum `sourceCategoryId`'s allocation into `targetCategoryId` across all reusable `budget_models` and delete `sourceCategoryId`'s row.
   - Leave `monthly_budget_allocations` untouched so historical snapshots retain their stored rows.
2. **Post-Merge Historical B-vs-A Comparison, Transitive Closure Loading, & Target Editing (Resolving C1, N1, N2)**:
   - Because `mergeCategory` moves `S`'s items to `D` (or re-points `S`'s entries to `D`'s items), F02 entries recorded before the merge report under their current category (`D`, or terminal category `T` after chained merges `S → D → T` via `mergedIntoCategoryId`).
   - **Transitive Merge-Target Closure in `getModelsView` (Resolving N2)**:
     - When `getModelsView` filters categories to include active categories and inactive (archived/merged) categories with non-zero allocations or actuals, it also retains **every category reachable by following `mergedIntoCategoryId` links (`S → D → T`)** from any kept category — including intermediate merged categories (`D`) with `₱0` allocation/actuals and terminal targets (`T`) that were subsequently archived with `₱0` own allocation and `₱0` actuals.
   - **Folded Comparison & Own-Amount Input on Merge Target `T` (Resolving C1 & N1)**:
     - In `calculateBudgetComparisonRows` (when rendering a historical `MonthlyBudgetPlan`):
       - Resolve every category's terminal merge target `T` by following `mergedIntoCategoryId` links (with a visited-set cycle guard).
       - Fold any stored snapshot allocation `rawPlanned_S > 0` on a merged category `S` into its terminal target `T`'s `plannedCentavos = rawPlanned_T + sum(rawPlanned_S)` (while preserving `T`'s own stored allocation in `T.rawPlannedCentavos = rawPlanned_T` and recording `mergedSources: { categoryId, categoryName, amountCentavos }[]` on `T`'s row).
       - In the `BUDGET / MO` cell for `T`, the `<input>` displays and edits **`T`'s own stored amount (`rawPlannedCentavos`, e.g. `20,000`)**, while a subtitle beneath the input shows the combined effective budget: `"₱25,000 effective (+₱5,000 from Dining out)"`.
       - Saving an edit on `T` sends `T`'s own stored amount (`rawPlanned_T >= 0`) to `PATCH /api/monthly-plans/:monthKey`, updating `T`'s row in `monthly_budget_allocations` and leaving `S`'s stored snapshot row untouched (so entering `21,000` stores `₱21,000` on `T` and reloads as input `21,000` with subtitle `"₱26,000 effective (+₱5,000 from Dining out)"`). If `T` is itself archived, `T`'s input is read-only when `rawPlanned_T === 0`, or allows only zeroing out `T`'s own stored amount (`amount = "0"`) when `rawPlanned_T > 0` (`amount > 0` on archived `T` returns `409 archived`).
       - Compute `T`'s `deltaCentavos`, `remainingCentavos`, `overspentCentavos`, `utilizationPercent`, and diverging chart bar using `T`'s combined effective `plannedCentavos` vs `T`'s `actualCentavos`.
       - Also emit a read-only historical reference row for `S` (`name: S.name`, `merged: true`, `mergedIntoCategoryId: T.id`, `mergedIntoCategoryName: T.name`, `plannedCentavos: rawPlanned_S`, `rawPlannedCentavos: rawPlanned_S`, `isFoldedIntoMergeTarget: true`), which displays `rawPlanned_S` in `BUDGET / MO` (with an optional `"Zero out"` action if the user explicitly wants to clear `S`'s historical snapshot row) and `"→ <T.name>"` in `ACTUAL` / `Δ`, and is **excluded** from group and summary sums so neither planned amounts nor actuals are ever double-counted.

**Rationale**:
- Preserves the stored historical snapshot row for `S` while preventing the false surplus on `S` and false deficit on `T` that would occur if `S`'s planned budget were not compared alongside `S`'s migrated entries under `T` (Feature Brief AC15 & Spec US7).

**Alternatives rejected**:
- Comparing `S`'s stored snapshot row against `actual_S = 0`: Rejected because `mergeCategory` moved `S`'s entries into `T`, causing a false `+planned_S` surplus on `S` and a false `-actual_S` deficit on `T`.
- Mutating `monthly_budget_allocations` during `mergeCategory`: Rejected because it destroys the record that `S` had a separate planned allocation when that historical month's plan was originally applied.

---

## R7. Deterministic Demo Seed & Guarded Clear Extension (`src/server/demo.ts`)

**Decision**:
- Extend `seedDemoData`, `getClearSummary`, and `clearAllData` in `src/server/demo.ts`:
  - `getClearSummary` returns counts for all 10 user tables (`monthlyBudgetAllocationsCount`, `monthlyBudgetPlansCount`, `budgetModelAllocationsCount`, `budgetModelsCount`, `savingsActivitiesCount`, `savingsBucketsCount`, `entriesCount`, `itemsCount`, `categoriesCount`, `membersCount`).
  - `clearAllData` deletes rows from all 10 user tables inside a single transaction in foreign-key-safe order.
  - `seedDemoData` refuses to run if any of the 10 user tables is non-empty.
  - Uses the exact same 12 rolling calendar `months` array ending with `now` (`options.currentDate ?? new Date()`) that `seedDemoData` already uses for F02 entries.
  - Seeds the 4 buckets (`Cash buffer`, `Emergency fund`, `Car down payment`, `Insurance`), inserts deterministic monthly `contribution` records dated `${month}-01` (always `<= currentDate`) across the 12 rolling months for buckets with `funded > 0` (`emergency = ₱8,000`, `car = ₱5,000`, `insurance = ₱2,000`), seeds the 3 reusable models (`Baseline 2026`, `Lean months`, `Car purchase 2027`), and applies `Baseline 2026` as the `MonthlyBudgetPlan` snapshot for each of the 12 rolling months.

**Rationale**:
- Using the 12 rolling calendar months ending with the current month (and `${month}-01` contribution dates) guarantees that opening `/savings` or `/models` immediately after `npm run seed` lands on a seeded month with active plan and funded savings data, and never creates future-dated activities.

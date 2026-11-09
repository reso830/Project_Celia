# Data Model: F03 — Budget & Savings

**Date**: 2026-11-08 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Storage is a single local SQLite file (`CELIA_DB_PATH`, default `./data/celia.db`), opened with `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL`. The schema version is tracked via `PRAGMA user_version`. F03 introduces migration **3** without altering or resetting existing F01 or F02 data.

---

## 1. Domain Types (`src/domain`)

### Shared Month Helpers (`src/domain/month.ts`)

```ts
export function isValidMonthKey(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
```

### Savings Bucket & Activity Types (`src/domain/savings.ts`)

```ts
import type { Centavos } from "./amount";

export type BucketType =
  | "cash_buffer"
  | "emergency_fund"
  | "goal"
  | "sinking_fund";

export type SavingsActivityKind = "contribution" | "withdrawal";

export type SavingsBucket = {
  id: string;
  name: string;
  nameKey: string;
  type: BucketType;
  openingBalance: Centavos;        // Non-negative integer centavos (>= 0)
  targetAmount: Centavos | null;   // Positive integer centavos (> 0) or null
  targetMonth: string | null;      // "YYYY-MM" or null
  description: string | null;
  countsTowardBuffer: boolean;     // Always true when isDefault is true
  isDefault: boolean;              // At most one active cash_buffer bucket
  archivedAt: string | null;       // ISO-8601 timestamp or null
  createdAt: string;               // ISO-8601 timestamp
  updatedAt: string;               // ISO-8601 timestamp
};

export type SavingsActivity = {
  id: string;
  bucketId: string;
  kind: SavingsActivityKind;
  amount: Centavos;                // Strictly positive integer centavos (> 0)
  date: string;                    // ISO calendar date "YYYY-MM-DD" (<= today)
  note: string | null;
  createdAt: string;               // ISO-8601 timestamp
  updatedAt: string;               // ISO-8601 timestamp
};
```

### Savings Calculation Types (`src/domain/savings-calculations.ts`)

```ts
import type { Centavos } from "./amount";
import type { SavingsBucket } from "./savings";

export type BucketDerivedMetrics = {
  bucket: SavingsBucket;
  currentBalanceCentavos: Centavos;           // Lifetime: openingBalance + sum(all contributions) - sum(all withdrawals)
  totalContributionsCentavos: Centavos;       // Lifetime gross contributions
  totalWithdrawalsCentavos: Centavos;         // Lifetime gross withdrawals
  remainingToTargetCentavos: Centavos | null; // max(0, targetAmount - currentBalance) when targetAmount !== null
  progressPercent: number | null;             // Math.floor((currentBalance * 100) / targetAmount) when targetAmount !== null (100% only when currentBalance >= targetAmount)
  progressBarPercent: number;                 // Clamped 0..100 for bar width (100 when open-ended)
  monthlyContributionsCentavos: Centavos;     // Gross contributions in selected monthKey
  monthlyWithdrawalsCentavos: Centavos;       // Gross withdrawals in selected monthKey
  plannedMonthlyCentavos: Centavos;           // From active MonthlyBudgetPlan for monthKey (0 if none)
  monthlyShortfallCentavos: Centavos;         // max(0, plannedMonthly - monthlyContributions)
};

export type FundedKpiStatus =
  | "short"               // hasMonthlyPlan && monthlyPlannedSavingsCentavos > 0 && monthlyShortfallCentavos > 0
  | "on_plan"             // hasMonthlyPlan && monthlyPlannedSavingsCentavos > 0 && monthlyShortfallCentavos === 0
  | "no_savings_planned"  // hasMonthlyPlan && monthlyPlannedSavingsCentavos === 0
  | "no_plan";            // !hasMonthlyPlan

export type SavingsKpiSummary = {
  activeBucketCount: number;
  heldInBucketsCentavos: Centavos;            // Sum of lifetime currentBalance across active buckets
  savingsBufferCentavos: Centavos;            // Sum of lifetime currentBalance across active buckets where countsTowardBuffer = true
  monthlyExpensesCentavos: Centavos;          // Selected month's total actual household expenses (from F02 entries)
  runwayMonths: number | null;                // Math.round((savingsBufferCentavos * 10) / monthlyExpensesCentavos) / 10, or null when monthlyExpenses === 0
  monthlyFundedCentavos: Centavos;            // Sum of monthlyContributionsCentavos (gross) across active buckets only
  monthlyPlannedSavingsCentavos: Centavos;    // Sum of planned bucket allocations in selected month's active plan across active buckets only
  monthlyShortfallCentavos: Centavos;         // Sum of per-bucket shortfalls across active buckets only: sum(max(0, planned_b - grossContributed_b))
  hasMonthlyPlan: boolean;                    // True when a MonthlyBudgetPlan exists for monthKey
  fundedStatus: FundedKpiStatus;
};
```

### Budget Model & Monthly Plan Types (`src/domain/budget.ts`)

```ts
import type { Centavos } from "./amount";

export type AllocationTargetType = "category" | "bucket";

export type BudgetAllocationLine = {
  id: string;
  targetType: AllocationTargetType;
  categoryId: string | null;
  bucketId: string | null;
  amount: Centavos;                // Non-negative integer centavos (>= 0)
  updatedAt: string;
};

export type BudgetModel = {
  id: string;
  name: string;
  nameKey: string;
  description: string | null;
  displayOrder: number;
  allocations: BudgetAllocationLine[];
  createdAt: string;
  updatedAt: string;
};

export type MonthlyBudgetPlan = {
  id: string;
  monthKey: string;                // "YYYY-MM" (unique per calendar month; updated in place on revision/re-apply)
  sourceModelId: string | null;    // Nullable FK to budget_models(id)
  modelName: string;               // Snapshot of model name at application time
  isRevised: boolean;              // True if edited directly after applying a model
  allocations: BudgetAllocationLine[];
  appliedAt: string;
  updatedAt: string;
};
```

### Budget & Variance Calculation Types (`src/domain/budget-calculations.ts`)

```ts
import type { Centavos } from "./amount";
import type { HexColor } from "./color";

export type VarianceTone = "green" | "amber" | "red" | "muted";

export type IncomeAllocationSegment = {
  key: "expenses" | "savings" | "unallocated";
  label: "Expenses" | "Savings" | "Unallocated";
  amountCentavos: Centavos;
  widthPercent: number;            // Exact (amount / allocTotal) * 100 for CSS width
  displayPercent: number;          // Math.round((amount * 100) / allocTotal) for label
  color: string;                   // #8c8378 | #2f7d78 | #c3cac9
};

export type BudgetSummaryTotals = {
  expectedIncomeCentavos: Centavos;
  plannedExpensesCentavos: Centavos;
  plannedSavingsCentavos: Centavos;
  unallocatedCentavos: number;          // expectedIncome - plannedExpenses - plannedSavings (signed)
  actualIncomeCentavos: Centavos;
  actualExpensesCentavos: Centavos;
  actualSavingsCentavos: Centavos;      // Gross contributions in monthKey
  actualUnallocatedCentavos: number;    // actualIncome - actualExpenses - actualSavings (signed)
  unallocatedDeltaCentavos: number;     // actualUnallocated - unallocatedCentavos (favourable-positive)
  unallocatedDeltaTone: VarianceTone;   // green (> 0), red (< 0), muted (=== 0)
  isFullyAllocated: boolean;            // unallocatedCentavos === 0 && expectedIncomeCentavos > 0
  isOverallocated: boolean;             // unallocatedCentavos < 0
  segments: IncomeAllocationSegment[];
};

export type MergedAllocationSource = {
  categoryId: string;
  categoryName: string;
  amountCentavos: Centavos;
};

export type BudgetComparisonRow = {
  targetType: "category" | "bucket";
  umbrella: "income" | "expense" | "savings";
  targetId: string;
  name: string;
  color: HexColor | null;               // Category colour swatch or null for savings buckets
  archived: boolean;
  merged: boolean;
  mergedIntoCategoryId: string | null;
  mergedIntoCategoryName: string | null;
  isFoldedIntoMergeTarget: boolean;     // True for historical snapshot rows of a merged source category S (read-only reference row, excluded from group/summary sums)
  mergedSources: MergedAllocationSource[]; // On merge target T in a historical plan: lists merged source categories folded into T
  plannedCentavos: Centavos;            // Effective planned allocation used for B-vs-A comparison & totals (= rawPlanned_T + sum(rawPlanned_S) on merge target T; displayed in subtitle "₱X effective (+₱Y from S)")
  rawPlannedCentavos: Centavos;         // Unfolded stored allocation for this row (displayed & edited in the BUDGET / MO <input> on T and persisted via PATCH /api/monthly-plans/:monthKey)
  actualCentavos: Centavos;             // Selected-month F02 entries (income/expense) or F03 gross contributions (savings)
  deltaCentavos: number;                // Favourable-positive: (planned - actual) for expense; (actual - planned) for income & savings
  remainingCentavos: Centavos;          // max(0, planned - actual) for expense and savings
  overspentCentavos: Centavos;          // For expense: max(0, actual - planned); 0 otherwise
  utilizationPercent: number | null;    // Math.round((actual * 100) / planned) when planned > 0, else null
  isOverspentZeroBudget: boolean;       // planned === 0 && actual > 0 (for expenses)
  tone: VarianceTone;                   // green (delta > 0), red (income/expense delta < 0), amber (savings delta < 0), muted (delta === 0)
};
```

---

## 2. SQLite Schema (Migration 3)

Note: Date and month-key columns (`target_month`, `date`, `month_key`) enforce length and digit-pattern shape (`GLOB`) at the SQLite schema level (matching Migration 2's `entries` table), while calendar validity (`01..12` month bounds, valid calendar days, leap years, and `date <= today`) is enforced in the domain and service layers.

```sql
-- Migration 3: F03 Budget & Savings
CREATE TABLE savings_buckets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) > 0),
  name_key TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('cash_buffer', 'emergency_fund', 'goal', 'sinking_fund')),
  opening_balance INTEGER NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
  target_amount INTEGER CHECK (target_amount IS NULL OR target_amount > 0),
  target_month TEXT CHECK (
    target_month IS NULL OR (
      length(target_month) = 7 AND
      target_month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'
    )
  ),
  description TEXT,
  counts_toward_buffer INTEGER NOT NULL CHECK (counts_toward_buffer IN (0, 1)),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (is_default = 0 OR (type = 'cash_buffer' AND counts_toward_buffer = 1 AND archived_at IS NULL))
);

CREATE UNIQUE INDEX savings_buckets_default_unique
  ON savings_buckets (is_default)
  WHERE is_default = 1;

CREATE TABLE savings_activities (
  id TEXT PRIMARY KEY,
  bucket_id TEXT NOT NULL REFERENCES savings_buckets(id),
  kind TEXT NOT NULL CHECK (kind IN ('contribution', 'withdrawal')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  date TEXT NOT NULL CHECK (
    length(date) = 10 AND
    date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  ),
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX savings_activities_bucket_date_idx
  ON savings_activities (bucket_id, date DESC, created_at DESC, id ASC);

CREATE INDEX savings_activities_date_idx
  ON savings_activities (date);

CREATE TABLE budget_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) > 0),
  name_key TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE budget_model_allocations (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES budget_models(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('category', 'bucket')),
  category_id TEXT REFERENCES categories(id),
  bucket_id TEXT REFERENCES savings_buckets(id),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  updated_at TEXT NOT NULL,
  CHECK (
    (target_type = 'category' AND category_id IS NOT NULL AND bucket_id IS NULL) OR
    (target_type = 'bucket' AND bucket_id IS NOT NULL AND category_id IS NULL)
  )
);

CREATE UNIQUE INDEX budget_model_allocations_category_unique
  ON budget_model_allocations (model_id, category_id)
  WHERE category_id IS NOT NULL;

CREATE UNIQUE INDEX budget_model_allocations_bucket_unique
  ON budget_model_allocations (model_id, bucket_id)
  WHERE bucket_id IS NOT NULL;

CREATE TABLE monthly_budget_plans (
  id TEXT PRIMARY KEY,
  month_key TEXT NOT NULL UNIQUE CHECK (
    length(month_key) = 7 AND
    month_key GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'
  ),
  source_model_id TEXT REFERENCES budget_models(id) ON DELETE SET NULL,
  model_name TEXT NOT NULL CHECK (length(model_name) > 0),
  is_revised INTEGER NOT NULL DEFAULT 0 CHECK (is_revised IN (0, 1)),
  applied_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE monthly_budget_allocations (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES monthly_budget_plans(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('category', 'bucket')),
  category_id TEXT REFERENCES categories(id),
  bucket_id TEXT REFERENCES savings_buckets(id),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  updated_at TEXT NOT NULL,
  CHECK (
    (target_type = 'category' AND category_id IS NOT NULL AND bucket_id IS NULL) OR
    (target_type = 'bucket' AND bucket_id IS NOT NULL AND category_id IS NULL)
  )
);

CREATE UNIQUE INDEX monthly_budget_allocations_category_unique
  ON monthly_budget_allocations (plan_id, category_id)
  WHERE category_id IS NOT NULL;

CREATE UNIQUE INDEX monthly_budget_allocations_bucket_unique
  ON monthly_budget_allocations (plan_id, bucket_id)
  WHERE bucket_id IS NOT NULL;
```

---

## 3. Centralized Validation Rules (`src/domain`)

All validation rules live in `src/domain` and are reused across client modals/forms and server services.

### Non-Negative & Optional Positive Amount Parsing (`src/domain/amount.ts`)

```ts
export function parseAndValidateNonNegativeAmount(
  raw: string,
  field = "amount",
):
  | { ok: true; centavos: Centavos }
  | { ok: false; error: string; field: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, centavos: 0 };
  }
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(trimmed)) {
    return {
      ok: false,
      error: "Amount must be a non-negative number with at most two decimal places.",
      field,
    };
  }
  const value = trimmed.replace(/,/g, "");
  const [pesos, cents = ""] = value.split(".");
  const centavos =
    Number.parseInt(pesos, 10) * 100 +
    Number.parseInt(cents.padEnd(2, "0"), 10);
  if (centavos > MAX_AMOUNT_CENTAVOS) {
    return {
      ok: false,
      error: "Amount exceeds maximum allowed limit (₱999,999,999.99).",
      field,
    };
  }
  return { ok: true, centavos };
}

export function parseOptionalPositiveAmount(
  raw: string | undefined | null,
  field = "targetAmount",
):
  | { ok: true; centavos: Centavos | null }
  | { ok: false; error: string; field: string } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return { ok: true, centavos: null };
  }
  const parsed = parseAndValidateAmount(trimmed);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, field };
  }
  return { ok: true, centavos: parsed.centavos };
}
```

### Bucket, Activity Date, & Month Key Validation (`src/domain/month.ts`, `src/domain/savings.ts`, `src/domain/budget.ts`)

- `isValidMonthKey(value: string | undefined): value is string` (`src/domain/month.ts`): Validates `^\d{4}-(0[1-9]|1[0-2])$`.
- `currentMonthKey(now?: Date): string` (`src/domain/month.ts`): Returns `"YYYY-MM"`.
- `isValidBucketType(value: string): value is BucketType` (`src/domain/savings.ts`): Checks `'cash_buffer' | 'emergency_fund' | 'goal' | 'sinking_fund'`.
- `validateActivityDate(dateStr: string, todayIso?: string): { ok: true } | { ok: false; error: string }` (`src/domain/savings.ts`): Reuses `validateEntryDate` calendar validation (`YYYY-MM-DD`) and verifies `dateStr <= todayIso` (defaulting `todayIso` to local `YYYY-MM-DD`), returning `"Activity date cannot be in the future."` when `dateStr > todayIso`.
- `validateNonNegativeBucketBalance(openingBalance: Centavos, activities: readonly Pick<SavingsActivity, "kind" | "amount">[]): boolean`: Returns `true` iff `openingBalance + sum(contributions) - sum(withdrawals) >= 0`.

---

## 4. Historical Integrity, Category Merge, & Archived Entity Rules

### Category Merge (`mergeCategory` in `src/server/categories-service.ts`)

When Category `S` is merged into Category `D`:
1. Existing F01 item moves/combinations and F02 entry re-pointing run in the transaction.
2. **F03 Reusable Model Allocation Merge**:
   - For each `BudgetModel` that has a `budget_model_allocations` row for `S` (`amount_S`):
     - If the model already has a row for `D` (`amount_D`), update `D`'s row to `amount_D + amount_S` and `updated_at = now`.
     - Otherwise, update `S`'s row to point to `category_id = D.id` and `updated_at = now`.
     - Delete any remaining `S` row for that model.
3. **F03 Historical Monthly Plans Preserved, Transitive Closure Loaded, & Folded Comparison**:
   - `monthly_budget_allocations` rows are **never** modified when categories are merged.
   - `getModelsView` loads all categories via `listCategories(db, { includeMerged: true })` and retains: (a) all active categories, (b) any archived or merged category with a non-zero allocation in any model or `appliedPlan` or non-zero actuals in `monthKey`, and (c) **every category in the transitive `mergedIntoCategoryId` closure (`S → D → T`) reachable from any retained category** (including intermediate merged categories `D` with `₱0` allocation/actuals and archived terminal targets `T` with `₱0` own allocation and `₱0` actuals).
   - When computing `BudgetComparisonRow`s for a historical `MonthlyBudgetPlan` snapshot, `resolveMergedCategoryTarget(categoryId, categoriesById)` follows `mergedIntoCategoryId` chains (e.g. `S → D → T`, guarded by a visited set) to find the terminal active/archived target `T`:
     - `T`'s `rawPlannedCentavos` is `T`'s own stored allocation (`rawPlanned_T`), which is the value displayed and edited in `T`'s `BUDGET / MO` `<input>` and sent to `PATCH /api/monthly-plans/:monthKey` (leaving `S`'s stored snapshot row untouched).
     - `T`'s `plannedCentavos` (effective planned amount for B-vs-A and group/summary totals) equals `rawPlanned_T + sum(rawPlanned_S for all S resolving to T)`, `T.mergedSources` lists each folded `(S.id, S.name, rawPlanned_S)`, and the cell renders a subtitle beneath the input: `"₱<plannedCentavos> effective (+₱<rawPlanned_S> from <S.name>)"`.
     - If `T` is itself archived (`T.archived === true`), `T`'s `BUDGET / MO` input is read-only when `rawPlanned_T === 0` or allows only zeroing out `T`'s own stored row (`amount = "0"`) when `rawPlanned_T > 0` (`amount > 0` on archived `T` returns `409 archived`).
     - `T`'s `actualCentavos` (which already contains `S`'s moved/repointed F02 entries), `deltaCentavos`, `remainingCentavos`, `overspentCentavos`, `utilizationPercent`, and diverging bar are calculated from `T`'s folded `plannedCentavos`.
     - `S` is still emitted as a read-only reference row (`isFoldedIntoMergeTarget = true`, `merged = true`, `mergedIntoCategoryName = T.name`, `plannedCentavos = rawPlanned_S`, `rawPlannedCentavos = rawPlanned_S`) displaying `"<S.name> (merged → <T.name>)"`, `BUDGET / MO = ₱<rawPlanned_S>` (with an optional `"Zero out"` action sending `amount = "0"` if the user explicitly wants to clear `S`'s historical snapshot row), and `"→ <T.name>"` in `ACTUAL` and `Δ`, and is excluded from group and summary sums so neither planned budget nor actual spending is ever double-counted.

### Archiving Categories or Savings Buckets

- Archiving a category or a savings bucket never deletes `savings_activities`, `budget_model_allocations`, or `monthly_budget_allocations`.
- Archived buckets are strictly read-only: creating, editing, or deleting a `SavingsActivity` on an archived bucket, or editing an archived bucket's fields, is rejected with `409 archived`.
- In a **reusable budget model (`BudgetModel`)**:
  - Archived categories and archived buckets with `amount > 0` remain visible with an `(archived)` badge and **count** toward `Expected Income`, `Planned Expenses`, `Planned Savings`, and `Unallocated` until the user sets their allocation to `0` (`"0"`), which removes/hides the row.
  - Archived or merged categories/buckets cannot be assigned a new or modified non-zero allocation (`409 archived`); only setting `amount = "0"` is permitted.
- When **applying a model to a month (`POST /api/models/:id/apply`)**:
  - Only **active** categories (`archivedAt === null && mergedIntoCategoryId === null`) and **active** buckets (`archivedAt === null`) are copied into `monthly_budget_allocations`. Any non-zero archived lines in the template are skipped.
- In an **applied monthly plan (`MonthlyBudgetPlan`)**:
  - All currently active categories and active buckets are included (showing `₱0` planned if created after the snapshot was taken, and editable via `PATCH /api/monthly-plans/:monthKey`).
  - Archived categories and archived buckets that have `amount > 0` in that month's `monthly_budget_allocations` snapshot (or `actualCentavos > 0` in `monthKey`) remain visible with an `(archived)` badge and count toward that month's totals.

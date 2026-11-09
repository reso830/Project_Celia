# API Contract: F03 — Budget & Savings

**Date**: 2026-11-08 | **Data model**: [../data-model.md](../data-model.md) | **Spec**: [../spec.md](../spec.md)

- JSON Route Handlers under `/api`, consumed by Celia's client components on `/savings` and `/models`.
- The server binds strictly to `127.0.0.1`, with no remote network exposure.
- Server Components call server-only read functions (`src/server/savings-read.ts`, `src/server/models-read.ts`) after `await connection()`.

---

## 1. Conventions & Error Mapping

- Request and response bodies are JSON.
- **Body validation** runs in route handlers via `readBody` in `src/server/http.ts` before invoking domain services:
  - Body must be a valid JSON object.
  - Unknown fields are rejected with `400 validation` and `field` set.
  - Monetary amounts (`openingBalance`, `targetAmount`, `amount`) are transported as strings (e.g. `"250000"`, `"5000.50"`) to avoid floating-point issues and validated via `src/domain/amount.ts`.
  - Boolean flags (`countsTowardBuffer`, `isDefault`) are passed as `"true"` / `"false"` strings (matching `readBody`'s string field contract).
  - **`PATCH` optional/nullable field semantics**: Across all `PATCH` endpoints, an **omitted field (`undefined`)** leaves the stored value unchanged, whereas passing an **empty string `""`** on a nullable field (`targetAmount`, `targetMonth`, `description`, `note`) clears that field to `null`.
- **Domain errors** map to HTTP status codes via `errorResponse` in `src/server/http.ts`:
  - Error shape: `{ "error": { "code": string, "message": string, "field"?: string } }`.

| Status | `code` | When |
|---|---|---|
| 400 | `validation` | Malformed/negative amount; resulting bucket balance `< 0`; invalid calendar date or `date > today`; invalid `YYYY-MM`; missing required fields; unknown fields |
| 404 | `not_found` | Unknown bucket id, activity id, model id, category id, or monthly plan for `monthKey` |
| 409 | `duplicate_name` | Bucket name or budget model name collides case-insensitively (`nameKey`) with an existing record |
| 409 | `archived` | Creating, editing, or deleting activity on an archived bucket; editing an archived bucket; or assigning a non-zero allocation to an archived/merged category or bucket |
| 409 | `invalid_state` | Archiving the default Cash Buffer bucket, clearing `isDefault` (`isDefault: "false"`), changing `type` away from `"cash_buffer"`, or setting `countsTowardBuffer: "false"` on the default bucket without designating another Cash Buffer bucket as default first; or setting `isDefault: "true"` on a non-`cash_buffer` bucket |
| 500 | `internal` | Unexpected database error; transaction automatically rolled back |

---

## 2. Savings Buckets & Activity Endpoints

### `POST /api/savings/buckets`

Creates a new savings bucket.

- **Request Body**:
  ```json
  {
    "name": "Car down payment",
    "type": "goal",
    "openingBalance": "85000",
    "targetAmount": "180000",
    "targetMonth": "2027-02",
    "description": "20% down payment",
    "countsTowardBuffer": "false",
    "isDefault": "false"
  }
  ```
  - Required fields: `name`, `type`.
  - Optional fields: `openingBalance` (defaults to `"0"`), `targetAmount` (`""` or omitted for `null`), `targetMonth` (`"YYYY-MM"` or `""` for `null`), `description` (`""` or omitted for `null`), `countsTowardBuffer` (`"true"` / `"false"`), `isDefault` (`"true"` / `"false"`).
- **Success**: `201 Created` → `{ "bucket": SavingsBucket }`
- **Errors**: `validation`, `duplicate_name`, `invalid_state`, `internal`.

---

### `PATCH /api/savings/buckets/:id`

Updates an existing active savings bucket's metadata, opening balance, target, default status, or buffer inclusion toggle.

- **Request Body** (at least one field; omitted fields remain unchanged; `""` on `targetAmount`, `targetMonth`, or `description` clears to `null`):
  ```json
  {
    "name": "Car down payment",
    "type": "goal",
    "openingBalance": "85000",
    "targetAmount": "180000",
    "targetMonth": "2027-02",
    "description": "Updated description",
    "countsTowardBuffer": "true",
    "isDefault": "false"
  }
  ```
- **Validation**:
  - Bucket must exist (`404 not_found`) and be active (`409 archived` if `archivedAt !== null`).
  - If `openingBalance` is reduced such that `openingBalance + sum(all contributions) - sum(all withdrawals) < 0`, returns `400 validation` (`"Bucket balance cannot be negative."`, `field: "openingBalance"`).
  - If `isDefault` is `"true"` on a bucket whose effective `type` is not `"cash_buffer"`, returns `409 invalid_state`.
  - If the bucket is currently the default bucket (`bucket.isDefault === true`):
    - Passing `isDefault: "false"` returns `409 invalid_state` (`"Designate another Cash Buffer bucket as default to replace this bucket."`).
    - Passing `type` other than `"cash_buffer"` returns `409 invalid_state` (`"The default Cash Buffer bucket must keep the Cash Buffer type. Designate another Cash Buffer bucket as default first."`).
    - Passing `countsTowardBuffer: "false"` returns `409 invalid_state` (`"The default Cash Buffer bucket always counts toward the savings buffer."`).
- **Success**: `200 OK` → `{ "bucket": SavingsBucket }`
- **Errors**: `validation`, `not_found`, `duplicate_name`, `archived`, `invalid_state`, `internal`.

---

### `POST /api/savings/buckets/:id/archive`

Archives an active savings bucket.

- **Request Body**: `{}` or empty.
- **Validation**: Rejects with `409 invalid_state` if `bucket.isDefault === true` (`"Designate another Cash Buffer bucket as default before archiving this bucket."`) or if already archived.
- **Success**: `200 OK` → `{ "bucket": SavingsBucket }`
- **Errors**: `not_found`, `invalid_state`, `internal`.

---

### `POST /api/savings/buckets/:id/restore`

Restores an archived savings bucket to active status.

- **Request Body**: `{}` or empty.
- **Success**: `200 OK` → `{ "bucket": SavingsBucket }`
- **Errors**: `not_found`, `invalid_state`, `internal`.

---

### `POST /api/savings/activities`

Records a contribution or withdrawal for an active savings bucket.

- **Request Body**:
  ```json
  {
    "bucketId": "bucket-uuid",
    "kind": "contribution",
    "amount": "5000.00",
    "date": "2026-09-15",
    "note": "September transfer"
  }
  ```
  - Required fields: `bucketId`, `kind` (`"contribution"` | `"withdrawal"`), `amount`, `date`.
  - Optional fields: `note` (`""` or omitted for `null`).
- **Validation**:
  - Bucket must exist (`404 not_found`) and be active (`409 archived` if `archivedAt !== null`).
  - `date` must be a valid calendar date `YYYY-MM-DD` and `<= today` (`400 validation`: `"Activity date cannot be in the future."`, `field: "date"`).
  - If `kind === "withdrawal"` and `amount > currentBalanceCentavos`, rejects with `400 validation` (`"Bucket balance cannot be negative."`, `field: "amount"`).
- **Success**: `201 Created` → `{ "activity": SavingsActivity, "currentBalance": 9000000 }`
- **Errors**: `validation`, `not_found`, `archived`, `internal`.

---

### `PATCH /api/savings/activities/:id`

Edits an existing savings contribution or withdrawal on an active bucket.

- **Request Body** (at least one field; omitted fields remain unchanged; `note: ""` clears note to `null`):
  ```json
  {
    "kind": "contribution",
    "amount": "10000.00",
    "date": "2026-09-15",
    "note": "Adjusted transfer"
  }
  ```
- **Validation**:
  - Activity must exist (`404 not_found`) and its parent bucket must be active (`409 archived` if `bucket.archivedAt !== null`).
  - `date` (if provided) must be a valid calendar date `<= today` (`400 validation`).
  - Recomputes bucket lifetime balance with the updated activity; if `resultingBalance < 0`, rejects with `400 validation` (`"Bucket balance cannot be negative."`, `field: "amount"`).
- **Success**: `200 OK` → `{ "activity": SavingsActivity, "currentBalance": 9500000 }`
- **Errors**: `validation`, `not_found`, `archived`, `internal`.

---

### `DELETE /api/savings/activities/:id`

Deletes a recorded savings contribution or withdrawal on an active bucket after user confirmation.

- **Validation**:
  - Activity must exist (`404 not_found`) and its parent bucket must be active (`409 archived` if `bucket.archivedAt !== null`: `"Archived buckets are read-only."`).
  - Recomputes bucket lifetime balance without the activity; if deleting a contribution would cause `resultingBalance < 0`, rejects with `400 validation` (`"Bucket balance cannot be negative."`).
- **Success**: `200 OK` → `{ "id": "activity-uuid", "currentBalance": 8500000 }`
- **Errors**: `validation`, `not_found`, `archived`, `internal`.

---

## 3. Budget Models & Monthly Budget Plan Endpoints

### `POST /api/models`

Creates a new reusable budget model (with allocations initialized to `0`).

- **Request Body**:
  ```json
  {
    "name": "Baseline 2026",
    "description": "Standard monthly plan"
  }
  ```
  - Required fields: `name`.
  - Optional fields: `description` (`""` or omitted for `null`).
- **Success**: `201 Created` → `{ "model": BudgetModel }`
- **Errors**: `validation`, `duplicate_name`, `internal`.

---

### `PATCH /api/models/:id`

Updates a reusable budget model's name, description, and/or a single allocation line.

- **Request Body** (at least one metadata field or allocation target; omitted fields remain unchanged; `description: ""` clears description to `null`):
  ```json
  {
    "name": "Baseline 2026",
    "description": "Updated description",
    "targetType": "category",
    "targetId": "groceries-category-uuid",
    "amount": "22000"
  }
  ```
  - Optional fields: `name`, `description`, `targetType` (`"category"` | `"bucket"`), `targetId`, `amount` (non-negative PHP string).
- **Validation**:
  - Model must exist (`404 not_found`).
  - When `targetType` or `targetId` is supplied, `targetType`, `targetId`, and `amount` are all required, `targetId` must reference an existing category or bucket (`404 not_found`), and `amount` is validated via `parseAndValidateNonNegativeAmount`.
  - If the target category is archived/merged or the target bucket is archived, setting `amount > 0` is rejected with `409 archived` (`"Archived categories and buckets cannot receive new budget allocations; set the amount to 0 to remove it."`); setting `amount = "0"` is permitted and deletes the archived allocation row from the reusable model.
- **Success**: `200 OK` → `{ "model": BudgetModel }`
- **Errors**: `validation`, `not_found`, `duplicate_name`, `archived`, `internal`.

---

### `POST /api/models/:id/duplicate`

Duplicates an existing reusable budget model and all of its category and bucket allocations.

- **Request Body**:
  ```json
  {
    "name": "Baseline 2026 (Copy)",
    "description": "Optional description"
  }
  ```
  - Optional fields: `name` (if omitted or blank, generates the next available `"<Model Name> (Copy)"` / `"<Model Name> (Copy 2)"`), `description` (defaults to source model's description if omitted; `""` clears to `null`).
- **Success**: `201 Created` → `{ "model": BudgetModel }`
- **Errors**: `validation`, `not_found`, `duplicate_name`, `internal`.

---

### `DELETE /api/models/:id`

Deletes a reusable budget model after user confirmation. Leaves all previously applied `monthly_budget_plans` snapshots intact (`source_model_id` becomes `NULL`).

- **Success**: `200 OK` → `{ "id": "model-uuid" }`
- **Errors**: `not_found`, `internal`.

---

### `POST /api/models/:id/apply`

Applies the selected reusable budget model as the active snapshot (`MonthlyBudgetPlan`) for a calendar month, copying only active categories and active savings buckets.

- **Request Body**:
  ```json
  {
    "monthKey": "2026-09"
  }
  ```
  - Required fields: `monthKey` (`"YYYY-MM"` validated via `isValidMonthKey`).
- **Success**: `200 OK` → `{ "plan": MonthlyBudgetPlan }`
- **Errors**: `validation`, `not_found`, `internal`.

---

### `PATCH /api/monthly-plans/:monthKey`

Explicitly revises an allocation line in the selected month's applied `MonthlyBudgetPlan` snapshot (`isRevised = true`) without altering any reusable `BudgetModel`.

- **Request Body**:
  ```json
  {
    "targetType": "category",
    "targetId": "groceries-category-uuid",
    "amount": "19500"
  }
  ```
  - Required fields: `targetType` (`"category"` | `"bucket"`), `targetId`, `amount`.
- **Validation**:
  - `monthKey` must be valid (`400 validation` if invalid `YYYY-MM`).
  - A `MonthlyBudgetPlan` must exist for `monthKey` (`404 not_found` if no plan is applied for `monthKey`).
  - `targetId` must reference an existing category or savings bucket (`404 not_found` if unknown).
  - If the target category is archived/merged or the target bucket is archived, setting `amount > 0` is rejected with `409 archived` (setting `amount = "0"` is permitted to zero out an archived/merged snapshot row). Active categories or buckets created after the snapshot was taken are valid targets and upsert a row in `monthly_budget_allocations`.
  - When editing a merge target category `T` that has folded source allocations (`S → T`), `amount` represents and updates **`T`'s own stored allocation (`rawPlannedCentavos`, `>= 0`)** in `monthly_budget_allocations`, leaving any folded source category `S`'s snapshot row untouched. (On reload, `T`'s effective `plannedCentavos` is recomputed as `rawPlanned_T + sum(rawPlanned_S)`.)
- **Success**: `200 OK` → `{ "plan": MonthlyBudgetPlan }`
- **Errors**: `validation`, `not_found`, `archived`, `internal`.

---

## 4. Server-Only Read Functions (`src/server`)

Called directly by Next.js Server Components after `await connection()`. Both functions validate `monthKey` via `isValidMonthKey(monthKey)` from `src/domain/month.ts`, falling back to `currentMonthKey()` when omitted or invalid.

### `getSavingsView(monthKey?: string)` (`src/server/savings-read.ts`)

Used by `src/app/(shell)/savings/page.tsx`. Planned monthly savings come strictly from `findMonthlyBudgetPlan(db, month)` (`0` when no plan is applied to `month`).

```ts
export type SavingsViewData = {
  month: string;                                // "YYYY-MM"
  today: string;                                // "YYYY-MM-DD" (for date <= today validation in ActivityModal)
  kpis: SavingsKpiSummary;
  activeBuckets: (BucketDerivedMetrics & {
    activities: SavingsActivity[];              // Newest first (date DESC, created_at DESC, id ASC)
  })[];
  archivedBuckets: (BucketDerivedMetrics & {
    activities: SavingsActivity[];
  })[];
};
```

### `getModelsView(monthKey?: string)` (`src/server/models-read.ts`)

Used by `src/app/(shell)/models/page.tsx`.

```ts
export type ModelsViewData = {
  month: string;                                // "YYYY-MM"
  currentMonth: string;                         // "YYYY-MM" (used to detect past months month < currentMonth for C10 confirmation)
  models: {
    id: string;
    name: string;
    description: string | null;
    summary: BudgetSummaryTotals;
    badge: "ACTIVE" | "REVISED" | "DIVERGED" | null;
    allocationsByCategory: Record<string, Centavos>;
    allocationsByBucket: Record<string, Centavos>;
  }[];
  appliedPlan: {
    id: string;
    monthKey: string;
    sourceModelId: string | null;
    modelName: string;
    isRevised: boolean;
    hasTemplateDiverged: boolean;               // True if sourceModel exists and its active allocations differ from snapshot
    summary: BudgetSummaryTotals;
    allocationsByCategory: Record<string, Centavos>;
    allocationsByBucket: Record<string, Centavos>;
  } | null;
  categories: {                                 // Includes all active categories, any archived/merged category with non-zero allocations or actuals, AND every category in their transitive mergedIntoCategoryId closure (S -> D -> T, including archived zero-allocation/zero-actual targets)
    id: string;
    umbrella: "income" | "expense";
    name: string;
    color: HexColor;
    archived: boolean;
    merged: boolean;
    mergedIntoCategoryId: string | null;
    actualCentavos: Centavos;                   // Sum of F02 entries in monthKey for this category
  }[];
  buckets: {
    id: string;
    name: string;
    type: BucketType;
    archived: boolean;
    actualCentavos: Centavos;                   // Sum of F03 gross contributions in monthKey for this bucket
  }[];
};
```

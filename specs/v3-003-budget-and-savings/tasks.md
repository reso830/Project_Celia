# Tasks: F03 — Budget & Savings

**Inputs**: [spec.md](spec.md) · [plan.md](plan.md) · [data-model.md](data-model.md) · [contracts/api.md](contracts/api.md) · [research.md](research.md) · [quickstart.md](quickstart.md) · [deviations.md](deviations.md)

## Conventions

- **Status**: `[x]` done · `[ ]` pending · `[~]` skipped
- **`[P]`**: can run in parallel with other `[P]` tasks in the same phase (different files, no shared edits).
- **`[USn]`**: the spec user story a task serves (`US1`–`US8`).
- **Phase dependencies**: `01 → 02 → 03 → 04 → 05 → 06 → 07 → 08`.
- **Commands**: `npm run test` (equivalent to `npm run test:run`; this repo defines `"test": "vitest run"`) and `npm run lint`.
- **Phase gate**: Every phase ends with `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build` green. Nothing is left broken at a phase boundary.
- **Server tests** start with the docblock `// @vitest-environment node`. The global default is `jsdom`.
- **Constitution test areas mapped to Celia F03**:
  - *Status transitions*: active vs. archived savings buckets (`archived_at`); transferring `isDefault` between `cash_buffer` buckets; blocking clearing `isDefault`, changing `type`, disabling `countsTowardBuffer`, or archiving on the default Cash Buffer bucket; blocking activity creation/edit/deletion on archived buckets (`409 archived`); applying a reusable `BudgetModel` to create/replace a month's `MonthlyBudgetPlan` (`is_revised = 0`, skipping archived entities) and revising a month's snapshot (`is_revised = 1`); preserving archived/merged categories and buckets on historical monthly plans with folded post-merge comparison.
  - *Required fields*: bucket `name` and `type`; activity `bucketId`, `kind` (`contribution` | `withdrawal`), `amount` (`> 0`), and `date` (`YYYY-MM-DD`, `<= today`); model `name`; monthly plan `monthKey` (`YYYY-MM`); non-negative lifetime bucket balance enforcement (`openingBalance + sum(all contributions) − sum(all withdrawals) >= 0`).
  - *URL validation*: not applicable. Monetary string parsing (`parseAndValidateAmount`, `parseAndValidateNonNegativeAmount`, `parseOptionalPositiveAmount`) and shared `YYYY-MM` / `YYYY-MM-DD` format checks (`src/domain/month.ts`) take its place.
  - *Date handling*: activity calendar dates (`YYYY-MM-DD`, `date <= today`), reporting/target month keys (`YYYY-MM`), activity ordering (`date DESC, created_at DESC, id ASC`), and UTC timestamps (`created_at`, `updated_at`, `applied_at`).

### Design reference aliases

The handoff zip is `handoff/celia_v3_001.zip`, root folder `design_handoff_money_tracker/`:
- **HF**: `reference/Money Tracker Hi-Fi.dc.html` (visual source of truth)
- **WF**: `reference/Money Tracker Wireframes.dc.html` (dialog structures)
- **HR**: the handoff `README.md` ("Screens: 5. Savings buckets", "6. Budget models")
- **PD**: `reference/product-decisions.md`

### Visual-fidelity task pattern (applies to every task tagged 🎨)

Tier 1 visual regression harness is omitted per user decision (same as F01 and F02): there is no `test:visual` script and no new tooling.

- **One component per task.**
- **Match**: the cited `HF#Lnn–Lnn` or `HR` / `WF` section is the visual specification. Do not paraphrase its pixels or colors into prose.
- **Breakpoints**: 1100, 1280, and 1440px wide.
- **Translation note**:
  - Lift prototype styles into token-backed Tailwind classes (using tokens defined in `src/app/globals.css`).
  - Replicate the DOM element-for-element where represented in the prototype.
  - Do not restructure.
- **Provenance**: tag each style block in a code comment, either `lifted from prototype CSS` or `recreated manually: <reason>`.
- **Done when**: Tier 2 frozen-state screenshots at all three breakpoints (1100, 1280, 1440px) have been reviewed side by side against the prototype and match. The review is recorded in Phase 08, T071.

---

## Phase Summary

| Phase | Focus | Tasks | User stories |
|---|---|---|---|
| **01** | Persistence (Migration 3) and pure domain core for savings and budgets | T001–T008 | US1, US2, US4, US5, US6, US7 |
| **02** | Savings store, service use cases, read helper, and `/api/savings/**` endpoints | T009–T016 | US1, US2, US3 |
| **03** | Budget models store, service, category-merge integration, read helper, and `/api/models/**` + `/api/monthly-plans/**` endpoints | T017–T025 | US4, US5, US6, US7 |
| **04** | Hi-fi Savings Buckets screen (`/savings`), KPI row, bucket cards, modals, and archived section | T026–T036 | US1, US2, US3 |
| **05** | Hi-fi Budget Models screen (`/models`), two-mode left rail, charts, collapsible umbrella table, and modals | T037–T047 | US4, US5, US6, US7 |
| **06** | Deterministic demo seed and guarded clear extension for F03 tables | T048–T051 | US8 |
| **07** | Release Prep | T052–T058 | — |
| **08** | Browser Smoke Test & Visual Review | T059–T071 | US1–US8 |

---

## Phase 01 — Persistence (Migration 3) & Pure Domain Core

Order: Non-negative/optional amount parsers → Shared month helpers & Savings domain types → Savings calculations → Budget domain types → Budget calculations → Barrel exports → SQLite Migration 3.

- [ ] **T001 [P] [US1, US2, US4] Extend monetary domain parser for non-negative and optional positive amounts**
  - Files: `src/domain/amount.ts`, `tests/domain/amount.test.ts`.
  - Expected behavior:
    - Implement `parseAndValidateNonNegativeAmount(raw: string, field = "amount")` accepting `"0"`, `"0.00"`, empty string `""` (resolving to `0` centavos), positive integers, comma-grouped numbers, and up to 2 decimal places up to `MAX_AMOUNT_CENTAVOS` (`99_999_999_999`), rejecting negative or malformed inputs with descriptive errors and `field`.
    - Implement `parseOptionalPositiveAmount(raw: string | undefined | null, field = "targetAmount")` returning `{ ok: true, centavos: null }` when empty/blank, or delegating to `parseAndValidateAmount` (`> 0`) when non-empty.
    - Add unit tests in `tests/domain/amount.test.ts` covering `"0"`, `""`, `"250,000"`, `"180000.50"`, negatives, `> 2` decimals, and `> MAX_AMOUNT_CENTAVOS`.
  - Constraints: pure TypeScript, zero external libraries; preserve existing `parseAndValidateAmount` and `formatCentavos` behavior.
  - Validation: `tests/domain/amount.test.ts` (node environment).
  - Out of scope: UI components and database queries.
- [ ] **T002 [P] [US1, US2, US3] Shared month-key helpers (`month.ts`) and savings bucket/activity domain types (`savings.ts`)**
  - Files: `src/domain/month.ts` (new), `src/domain/savings.ts` (new), `src/server/entries-read.ts`.
  - Expected behavior:
    - Create `src/domain/month.ts` exporting `isValidMonthKey(value: string | undefined): value is string` (`^\d{4}-(0[1-9]|1[0-2])$`) and `currentMonthKey(now?: Date): string`, and update `src/server/entries-read.ts` to import and use them instead of local `validMonth`/`currentMonth`.
    - In `src/domain/savings.ts`, define `BucketType` (`"cash_buffer" | "emergency_fund" | "goal" | "sinking_fund"`), `SavingsActivityKind` (`"contribution" | "withdrawal"`), `SavingsBucket`, and `SavingsActivity`.
    - Implement `isValidBucketType(value: string): value is BucketType`, `isValidSavingsActivityKind(value: string): value is SavingsActivityKind`, `validateActivityDate(dateStr: string, todayIso?: string)` (delegating calendar validation to `validateEntryDate` and rejecting `dateStr > todayIso` with `"Activity date cannot be in the future."`), and `validateNonNegativeBucketBalance(openingBalance, activities)`.
    - Provide helpers `defaultCountsTowardBuffer(type: BucketType): boolean` (`true` for `cash_buffer` and `emergency_fund`, `false` for `goal` and `sinking_fund`) and `formatBucketTypeSubtitle(bucket)` (e.g. `"Open-ended · default"`, `"Open-ended"`, `"Goal · Feb 2027"`, `"Sinking · Mar 2027"`).
  - Constraints: pure domain modules (`month.ts`, `savings.ts`) have no React or server imports.
  - Validation: `tests/domain/savings-calculations.test.ts`.
- [ ] **T003 [P] [US1, US2] Pure savings bucket metrics and KPI calculation helpers + unit tests**
  - Files: `src/domain/savings-calculations.ts` (new), `tests/domain/savings-calculations.test.ts` (new).
  - Expected behavior:
    - Implement `calculateBucketMetrics(bucket, activities, monthKey, plannedMonthlyCentavos)` computing:
      - Lifetime `currentBalanceCentavos` (`openingBalance + sum(all contributions) − sum(all withdrawals)` across all dates, independent of `monthKey`), `totalContributionsCentavos`, and `totalWithdrawalsCentavos`.
      - `remainingToTargetCentavos` (`max(0, targetAmount − currentBalance)` or `null`).
      - Deterministic integer floor `progressPercent` (`Math.floor((currentBalance * 100) / targetAmount)` or `null`, so `99.6%` displays `99%` and `100%` appears only when `currentBalance >= targetAmount`) and `progressBarPercent` (`Math.min(100, progressPercent)` or `100` when open-ended).
      - Selected-month `monthlyContributionsCentavos` (gross contributions in `monthKey`), `monthlyWithdrawalsCentavos`, `plannedMonthlyCentavos`, and `monthlyShortfallCentavos` (`Math.max(0, plannedMonthly − monthlyContributions)`).
    - Implement `calculateSavingsKpis({ activeBucketMetrics, monthlyExpensesCentavos, hasMonthlyPlan })` computing `activeBucketCount`, `heldInBucketsCentavos`, `savingsBufferCentavos` (active buckets where `countsTowardBuffer === true`), `monthlyExpensesCentavos`, `runwayMonths` (`Math.round((savingsBufferCentavos * 10) / monthlyExpensesCentavos) / 10`, or `null` when `monthlyExpensesCentavos === 0`), `monthlyFundedCentavos` (sum of gross `monthlyContributionsCentavos` across active buckets only), `monthlyPlannedSavingsCentavos` (sum of `plannedMonthlyCentavos` across **active buckets only**), `monthlyShortfallCentavos` (**sum of per-bucket `monthlyShortfallCentavos` across active buckets only**, so over-funding one active bucket never hides another active bucket's shortfall and archived buckets are excluded from `/savings` KPIs), `hasMonthlyPlan`, and `fundedStatus` (`"short" | "on_plan" | "no_savings_planned" | "no_plan"`).
    - Add unit tests in `tests/domain/savings-calculations.test.ts` covering:
      - Open-ended vs. targeted buckets, `99.6%` flooring to `99%` (never `100%` while `remaining > 0`), and target exceeded (`105%` with bar clamped at `100%`).
      - Same-month contribution (`₱5,000`) and withdrawal (`₱3,000`) against a `₱5,000` plan: `currentBalance` changes by `+₱2,000` while `monthlyContributionsCentavos` and `monthlyFundedCentavos` are `₱5,000` (`0` shortfall, `"on_plan"`).
      - Two-bucket shortfall test: Bucket A funded `₱10,000` of `₱5,000` planned and Bucket B funded `₱0` of `₱3,000` planned produces `monthlyShortfallCentavos = 300000` (`"short"`).
      - No-plan month (`hasMonthlyPlan = false` → `fundedStatus = "no_plan"`) vs. zero-savings plan (`hasMonthlyPlan = true, monthlyPlannedSavingsCentavos = 0` → `fundedStatus = "no_savings_planned"`).
      - Two-month activity test (`2026-08` and `2026-09`): switching `monthKey` changes `monthlyContributionsCentavos` while `currentBalanceCentavos`, `heldInBucketsCentavos`, and `savingsBufferCentavos` remain lifetime totals; future-dated activity (`date > todayIso`) is rejected by `validateActivityDate`.
      - Non-negative balance validation on withdrawals, edits, deletes, and opening-balance reductions.
  - Constraints: exact integer centavo arithmetic; no automatic monthly unallocated sweep into bucket balances.
  - Validation: `tests/domain/savings-calculations.test.ts` (node environment).
- [ ] **T004 [P] [US4, US5] Budget model and monthly plan domain types**
  - Files: `src/domain/budget.ts` (new).
  - Expected behavior:
    - Define `AllocationTargetType` (`"category" | "bucket"`), `BudgetAllocationLine`, `BudgetModel`, and `MonthlyBudgetPlan`.
    - Implement `hasTemplateDivergedFromPlan(model, plan, activeCategoryIds, activeBucketIds): boolean` comparing a reusable model's active category and active bucket allocations against an applied `MonthlyBudgetPlan`'s allocations.
  - Constraints: pure domain module; no React or server imports.
  - Validation: `tests/domain/budget-calculations.test.ts`.
- [ ] **T005 [P] [US4, US6, US7] Pure budget allocation, chart, post-merge folding, and favourable-positive Δ calculation helpers + unit tests**
  - Files: `src/domain/budget-calculations.ts` (new), `tests/domain/budget-calculations.test.ts` (new).
  - Expected behavior:
    - Implement `calculateBudgetSummary({ incomeAllocations, expenseAllocations, savingsAllocations, actualIncomeCentavos, actualExpensesCentavos, actualSavingsCentavos })` returning `expectedIncomeCentavos`, `plannedExpensesCentavos`, `plannedSavingsCentavos`, `unallocatedCentavos` (`expectedIncome − plannedExpenses − plannedSavings`), `actualIncomeCentavos`, `actualExpensesCentavos`, `actualSavingsCentavos`, `actualUnallocatedCentavos` (`actualIncome − actualExpenses − actualSavings`), `unallocatedDeltaCentavos` (`actualUnallocated − unallocated`), `unallocatedDeltaTone` (`green` `> 0`, `red` `< 0`, `muted` `=== 0`), `isFullyAllocated` (`unallocated === 0 && expectedIncome > 0`), `isOverallocated` (`unallocated < 0`), and `"Where the income goes"` `segments` (`Expenses` `#8c8378`, `Savings` `#2f7d78`, `Unallocated` `#c3cac9` when `> 0`, with `widthPercent` and `displayPercent = Math.round(...)`) without dividing by zero when `expectedIncomeCentavos === 0`.
    - Implement `calculateExpenseMixStops(expenseRows)` producing conic-gradient percentage stops by category color (and empty indicator when total planned expenses are `0`).
    - Implement `resolveMergedCategoryTarget(categoryId, categoriesById)` following `mergedIntoCategoryId` chains (`S → D → T`, with a visited-set cycle guard) to resolve any merged category to its terminal target `T`.
    - Implement `calculateBudgetComparisonRows({ categories, buckets, plannedByCategory, plannedByBucket, foldMergedCategories })`:
      - When `foldMergedCategories` is `true` (historical `MonthlyBudgetPlan` view), folds any stored snapshot allocation `rawPlanned_S > 0` on a merged category `S` into its terminal target `T`'s `plannedCentavos` (`rawPlanned_T + sum(rawPlanned_S)`) while keeping `T.rawPlannedCentavos = rawPlanned_T` (the editable input value on `T`) and `mergedSources` populated on `T`, and emits a read-only reference row for `S` (`isFoldedIntoMergeTarget = true`, `mergedIntoCategoryName = T.name`, `plannedCentavos = rawPlanned_S`, `rawPlannedCentavos = rawPlanned_S`) that is excluded from group/summary sums so planned budget and actuals are never double-counted.
      - Computes per-row `plannedCentavos`, `actualCentavos`, favourable-positive `deltaCentavos` (`planned − actual` for expenses; `actual − planned` for income and savings), `remainingCentavos`, `overspentCentavos`, `utilizationPercent` (`Math.round((actual * 100) / planned)` when `planned > 0`, else `null`), `isOverspentZeroBudget`, and status `tone` (`green` when `delta > 0`, `red` when income/expense `delta < 0`, **`amber` when savings `delta < 0` — never red**, `muted` when `delta === 0`).
    - Implement `calculateDivergingBars(expenseComparisonRows)` (filtering out `isFoldedIntoMergeTarget` reference rows) scaling each expense category's surplus (`upBar`) or deficit (`downBar`) bar height (`3..60px`) relative to `max(|delta|)` and extracting the 4-character label (`name.slice(0, 4)`).
    - Add unit tests in `tests/domain/budget-calculations.test.ts` covering balanced (`isFullyAllocated`), unallocated surplus, overallocated, zero-income, zero-budget-with-actual-spend (`isOverspentZeroBudget`), `Unallocated` footer `actual` and `Δ`, favourable-positive `Δ` signs, amber savings shortfall tone, post-merge historical comparison with non-zero actuals (including a chained merge `Dining out → Food → Groceries`, verifying no false surplus on `Dining out`, accurate folded `Δ` on `Groceries`, and no double-counting in group totals), donut stops, and diverging bar geometry.
  - Constraints: pure domain functions; UI copy/helpers must never emit `"over budget"` or `"under budget"`.
  - Validation: `tests/domain/budget-calculations.test.ts` (node environment).
- [ ] **T006 Export F03 domain modules from barrel**
  - Files: `src/domain/index.ts`.
  - Expected behavior: re-export `amount.ts`, `month.ts`, `savings.ts`, `savings-calculations.ts`, `budget.ts`, and `budget-calculations.ts`.
  - Validation: `npm run typecheck`.
- [ ] **T007 [US1, US2, US4, US5] Database Schema Migration 3 and migration tests**
  - Files: `src/server/db/migrations.ts`, `tests/server/migrations.test.ts`.
  - Expected behavior:
    - Add `migrationThree` (`version: 3`) in `src/server/db/migrations.ts` creating `savings_buckets`, `savings_activities`, `budget_models`, `budget_model_allocations`, `monthly_budget_plans`, and `monthly_budget_allocations` with all `CHECK` constraints, foreign keys, and partial unique indexes (`savings_buckets_default_unique`, `budget_model_allocations_category_unique`, `budget_model_allocations_bucket_unique`, `monthly_budget_allocations_category_unique`, `monthly_budget_allocations_bucket_unique`, `savings_activities_bucket_date_idx`, `savings_activities_date_idx`) per `data-model.md`.
    - Update `tests/server/migrations.test.ts` to verify `PRAGMA user_version` advances to `3`, existing F01+F02 data survives intact, at most one default Cash Buffer bucket is allowed, negative amounts and malformed date/month-key shapes (e.g. `"2026-9"`, `"abcd-ef"`, `"2026/09/15"`, matching SQLite `length` and `GLOB` shape checks) are rejected, and `ON DELETE CASCADE` / `ON DELETE SET NULL` behave as specified. (Full calendar validity such as `"2026-13"` or `"2026-02-31"` is tested in domain, service, and API tests.)
  - Constraints: do not alter or drop existing F01 or F02 tables.
  - Validation: `tests/server/migrations.test.ts` (node environment).
- [ ] **T008 Phase 01 Gate Check**
  - Run: `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build`.
  - Confirm all pass.

---

## Phase 02 — Savings Store, Service, Read Helper, & API Endpoints

Order: Savings SQLite store → Savings domain service → Service tests → Server read helper → API route handlers → API tests.

- [ ] **T009 [US1, US2, US3] Savings SQLite store module**
  - Files: `src/server/savings-store.ts` (new).
  - Expected behavior: prepared statements with `import "server-only"`:
    - `listSavingsBuckets(db, options?: { includeArchived?: boolean })`
    - `findSavingsBucketById(db, id)`
    - `insertSavingsBucket(db, bucket)`
    - `updateSavingsBucket(db, bucket)`
    - `clearDefaultSavingsBucket(db, now)`
    - `listSavingsActivities(db, options?: { bucketId?: string; monthKey?: string })` (ordered deterministically by `ORDER BY date DESC, created_at DESC, id ASC`)
    - `findSavingsActivityById(db, id)`
    - `insertSavingsActivity(db, activity)`
    - `updateSavingsActivity(db, activity)`
    - `deleteSavingsActivity(db, id)`
  - Constraints: raw SQL isolated in store module; maps integer `0`/`1` columns (`counts_toward_buffer`, `is_default`) to booleans.
  - Validation: `tests/server/savings-service.test.ts`.
- [ ] **T010 [US1, US2, US3] Savings domain service**
  - Files: `src/server/savings-service.ts` (new).
  - Expected behavior: transactional use-case functions wrapped in `database.transaction()`:
    - `createSavingsBucket(draft, db)`: validates `name` (`validateName`, case-insensitive uniqueness across buckets via `nameKey`), `type` (`isValidBucketType`), `openingBalance` (`>= 0`), optional `targetAmount` (`> 0` or `null`), optional `targetMonth` (`isValidMonthKey` or `null`), `countsTowardBuffer`, and `isDefault` (allowed only when `type === "cash_buffer"`, locking `countsTowardBuffer = true` and clearing any prior default bucket).
    - `updateSavingsBucket(id, patch, db)`: validates bucket exists (`404 not_found`) and is active (`409 archived`); checks name uniqueness; supports omitted fields (unchanged) vs `""` on `targetAmount`, `targetMonth`, or `description` (clears to `null`); enforces default Cash Buffer rules (`409 invalid_state` if attempting to set `isDefault = false`, change `type` away from `"cash_buffer"`, or set `countsTowardBuffer = false` on the current default bucket, or set `isDefault = true` on a non-`cash_buffer` bucket); recomputes lifetime bucket balance with new `openingBalance` and rejects with `DomainError("validation", "Bucket balance cannot be negative.", "openingBalance")` if `< 0`.
    - `archiveSavingsBucket(id, db)`: rejects with `DomainError("invalid_state", ...)` if `bucket.isDefault === true` or already archived; sets `archivedAt = timestamp()`.
    - `restoreSavingsBucket(id, db)`: rejects if already active; sets `archivedAt = null`.
    - `createSavingsActivity(draft, db)`: validates bucket exists and is active (`409 archived` if archived), validates `kind`, positive `amount`, and `date` (`validateActivityDate`, rejecting future dates `date > today` with `400 validation`); if `kind === "withdrawal"`, verifies lifetime `currentBalance - amount >= 0` or throws `DomainError("validation", "Bucket balance cannot be negative.", "amount")`.
    - `updateSavingsActivity(id, patch, db)`: validates activity exists and its parent bucket is active (`409 archived`); validates `date <= today`; verifies resulting lifetime bucket balance `>= 0` before writing.
    - `deleteSavingsActivity(id, db)`: validates activity exists (`404 not_found`) and its parent bucket is active (`409 archived` if `bucket.archivedAt !== null`: `"Archived buckets are read-only."`); verifies removing the activity does not leave lifetime bucket balance `< 0` before deleting.
  - Constraints: never creates or modifies F02 `entries`.
  - Validation: `tests/server/savings-service.test.ts`.
- [ ] **T011 [US1, US2, US3] Savings store & service integration tests**
  - Files: `tests/server/savings-service.test.ts` (new).
  - Expected behavior: test bucket creation, case-insensitive duplicate name rejection, default Cash Buffer transfer, rejecting `isDefault = false` / `type != "cash_buffer"` / `countsTowardBuffer = false` / archive on the default bucket (`409 invalid_state`), clearing nullable fields with `""`, archive and restore preserving activity history, rejecting activity create/edit/**delete** on an archived bucket (`409 archived`, verifying the activity row remains unchanged in SQLite), rejecting future-dated activity (`date > today`), and blocking negative lifetime balances on withdrawal, contribution edit, contribution delete, and opening-balance reduction.
  - Constraints: covers constitution status transitions, required fields, and date handling.
  - Validation: `npm run test`.
- [ ] **T012 [US1, US2, US3] Server-only `getSavingsView` read helper**
  - Files: `src/server/savings-read.ts` (new).
  - Expected behavior:
    - Calls `await connection()`.
    - Resolves `monthKey` via `isValidMonthKey(monthKey) ? monthKey : currentMonthKey()`.
    - Loads active and archived buckets, all bucket activities, the selected month's actual household expenses from `entries-store.ts`, and `hasMonthlyPlan: false` / `0` planned allocations (wired to `findMonthlyBudgetPlan(db, month)` in `T021`).
    - Computes `BucketDerivedMetrics` and `SavingsKpiSummary` via `src/domain/savings-calculations.ts`.
  - Validation: `tests/server/savings-service.test.ts` (including invalid `monthKey` fallback test).
- [ ] **T013 [P] [US1, US3] Savings bucket API route handlers**
  - Files:
    - `src/app/api/savings/buckets/route.ts` (new: `POST`)
    - `src/app/api/savings/buckets/[id]/route.ts` (new: `PATCH`)
    - `src/app/api/savings/buckets/[id]/archive/route.ts` (new: `POST`)
    - `src/app/api/savings/buckets/[id]/restore/route.ts` (new: `POST`)
  - Expected behavior: validate request JSON via `readBody`, invoke `savings-service.ts`, return `201` / `200` JSON responses per `contracts/api.md`, and map `DomainError` via `errorResponse`.
  - Validation: `tests/api/savings.test.ts`.
- [ ] **T014 [P] [US2] Savings activity API route handlers**
  - Files:
    - `src/app/api/savings/activities/route.ts` (new: `POST`)
    - `src/app/api/savings/activities/[id]/route.ts` (new: `PATCH`, `DELETE`)
  - Expected behavior: validate request JSON via `readBody`, invoke `createSavingsActivity`, `updateSavingsActivity`, and `deleteSavingsActivity`, return `{ activity, currentBalance }` or `{ id, currentBalance }`, and map `DomainError` via `errorResponse`.
  - Validation: `tests/api/savings.test.ts`.
- [ ] **T015 [US1, US2, US3] Savings API route handler tests**
  - Files: `tests/api/savings.test.ts` (new).
  - Expected behavior: test `POST /api/savings/buckets`, `PATCH /api/savings/buckets/:id` (including `""` field clearing and `409 invalid_state` when changing type or clearing default on the default bucket), `POST /api/savings/buckets/:id/archive`, `POST /api/savings/buckets/:id/restore`, `POST /api/savings/activities` (including future-date `400` and archived-bucket `409`), `PATCH /api/savings/activities/:id`, and `DELETE /api/savings/activities/:id` (including `409 archived` when bucket is archived, verifying record stays in DB) across success (`201`/`200`) and error (`400`, `404`, `409`) cases.
  - Validation: `npm run test`.
- [ ] **T016 Phase 02 Gate Check**
  - Run: `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build`.
  - Confirm all pass.

---

## Phase 03 — Budget Models Store, Service, Category Merge Integration, & API Endpoints

Order: Models SQLite store → Models domain service → Category merge integration → Service tests → Server read helper → API route handlers → API tests.

- [ ] **T017 [US4, US5, US7] Budget models & monthly plans SQLite store module**
  - Files: `src/server/models-store.ts` (new).
  - Expected behavior: prepared statements with `import "server-only"`:
    - `listBudgetModels(db)` and `findBudgetModelById(db, id)` (with `allocations` from `budget_model_allocations`)
    - `insertBudgetModel(db, model)` and `updateBudgetModelMetadata(db, model)`
    - `upsertBudgetModelAllocation(db, line)`, `deleteBudgetModelAllocation(db, modelId, targetType, targetId)`, and `deleteBudgetModel(db, id)`
    - `findMonthlyBudgetPlan(db, monthKey)` (with `allocations` from `monthly_budget_allocations`)
    - `upsertMonthlyBudgetPlan(db, plan)` and `replaceMonthlyBudgetAllocations(db, planId, lines)`
    - `upsertMonthlyBudgetAllocation(db, line)` and `deleteMonthlyBudgetAllocation(db, planId, targetType, targetId)`
    - `mergeCategoryAllocationsInModels(db, sourceCategoryId, targetCategoryId, now)`: for every reusable model in `budget_models`, adds `sourceCategoryId`'s `budget_model_allocations.amount` into `targetCategoryId`'s allocation and deletes `sourceCategoryId`'s row, without touching `monthly_budget_allocations`.
  - Constraints: raw SQL isolated in store module.
  - Validation: `tests/server/models-service.test.ts`.
- [ ] **T018 [US4, US5, US7] Budget models & monthly plans domain service**
  - Files: `src/server/models-service.ts` (new).
  - Expected behavior: transactional use cases wrapped in `database.transaction()`:
    - `createBudgetModel(draft, db)`: validates `name` (`validateName`, case-insensitive uniqueness via `nameKey`) and optional `description`; inserts model.
    - `updateBudgetModel(id, patch, db)`: updates `name`/`description` (omitted = unchanged, `description: ""` = `null`) and/or upserts a category or bucket allocation (`parseAndValidateNonNegativeAmount`). Verifies `targetId` exists (`404 not_found`). If the target category is archived/merged or the target bucket is archived, rejects `amount > 0` with `DomainError("archived", ...)` (`409 archived`), while allowing `amount === 0` (which deletes the archived allocation row).
    - `duplicateBudgetModel(id, draft, db)`: generates unique copy name (e.g. `"<Name> (Copy)"` if `name` omitted) and copies all `budget_model_allocations` rows.
    - `deleteBudgetModel(id, db)`: deletes the reusable model from `budget_models` while leaving all `monthly_budget_plans` snapshots intact (`source_model_id` becomes `NULL`).
    - `applyBudgetModelToMonth(modelId, monthKey, db)`: validates `isValidMonthKey(monthKey)`, copies the reusable model's name and **only active** category (`archivedAt === null && mergedIntoCategoryId === null`) and **active** bucket (`archivedAt === null`) allocations into `monthly_budget_plans` + `monthly_budget_allocations` for `monthKey` (`isRevised = false`, `sourceModelId = model.id`), skipping any archived entities.
    - `reviseMonthlyBudgetPlan(monthKey, patch, db)`: validates `isValidMonthKey(monthKey)`, verifies a `MonthlyBudgetPlan` exists for `monthKey` (`404 not_found`) and `targetId` exists (`404 not_found`), rejects `amount > 0` on archived/merged entities (`409 archived`, while allowing `amount === 0` to zero out an archived snapshot row), upserts the allocation line in `monthly_budget_allocations`, and sets `is_revised = 1` without modifying any reusable `BudgetModel`.
  - Validation: `tests/server/models-service.test.ts`.
- [ ] **T019 [US7] Integrate atomic reusable-model category allocation merge into `mergeCategory`**
  - Files: `src/server/categories-service.ts`.
  - Expected behavior: inside `mergeCategory(sourceCategoryId, targetCategoryId, database)`'s existing transaction, call `mergeCategoryAllocationsInModels(database, source.id, target.id, timestamp())` from `src/server/models-store.ts` so source category planned amounts in reusable models are atomically combined into the target category while historical `monthly_budget_allocations` remain untouched.
  - Constraints: atomic within the existing `mergeCategory` transaction.
  - Validation: `tests/server/models-service.test.ts`.
- [ ] **T020 [US4, US5, US6, US7] Models service & historical integrity integration tests**
  - Files: `tests/server/models-service.test.ts` (new).
  - Expected behavior: test model CRUD, duplicate, delete preserving monthly snapshots, applying a model to multiple months (verifying archived categories/buckets in the template are skipped when creating the monthly snapshot), editing a reusable model without altering previously applied monthly snapshots, verifying `hasTemplateDivergedFromPlan` returns `true` (`DIVERGED` badge) when an entity with a non-zero allocation in an applied monthly plan is subsequently archived, revising a monthly snapshot directly (`isRevised = true`, including revising a newly created active category/bucket on an existing snapshot), category merge with non-zero F02 entries recorded before the merge (verifying reusable model allocations combine while historical `monthly_budget_allocations` preserve the source row and `getModelsView` / `calculateBudgetComparisonRows` fold the merged source allocation into the merge target without false surpluses or double-counting), **edit → save → reload on a merge target `T` in a historical monthly plan** (editing `Groceries`'s own `rawPlannedCentavos` from `₱20,000` to `₱21,000` via `reviseMonthlyBudgetPlan`, reloading via `getModelsView`, and verifying `rawPlannedCentavos = ₱21,000`, `Dining out` snapshot remains `₱5,000`, and `Groceries` effective `plannedCentavos = ₱26,000`), **transitive merge-target closure loading through `getModelsView`** covering **Case A** (`S = ₱5,000`, `D = ₱0`, no actuals, `S` merged into `D`, then `D` archived — verifying `D` is still loaded by `getModelsView` with `rawPlannedCentavos = 0`, `plannedCentavos = ₱5,000`, and `archived = true`) and **Case B** (chained merge `S → D → T` where intermediate `D` has `₱0` allocation and `₱0` actuals — verifying `getModelsView` loads `D` in the closure so `S` resolves and folds into `T`), and archived category/bucket zeroing (`amount = 0` allowed, `amount > 0` rejected with `409 archived`).
  - Validation: `npm run test`.
- [ ] **T021 [US4, US5, US6, US7] Server-only `getModelsView` read helper and `getSavingsView` plan integration**
  - Files: `src/server/models-read.ts` (new), `src/server/savings-read.ts`.
  - Expected behavior:
    - `getModelsView(monthKey?)` calls `await connection()`, resolves `month = isValidMonthKey(monthKey) ? monthKey : currentMonthKey()`, and queries:
      - All reusable `budget_models` with their `BudgetSummaryTotals` and badge (`"ACTIVE"` when `appliedPlan?.sourceModelId === id && !appliedPlan.isRevised && !appliedPlan.hasTemplateDiverged`, `"REVISED"` when `appliedPlan?.sourceModelId === id && appliedPlan.isRevised`, `"DIVERGED"` when `appliedPlan?.sourceModelId === id && !appliedPlan.isRevised && appliedPlan.hasTemplateDiverged`, else `null`).
      - The selected month's `appliedPlan` (if any, including `hasTemplateDiverged` and `BudgetSummaryTotals`).
      - Categories via `listCategories(db, { includeMerged: true })`, retaining: (1) all active categories (`!archived && !merged`), (2) any archived/merged category with a non-zero allocation in any model or `appliedPlan` or non-zero actuals in `month`, AND (3) **every category in the transitive `mergedIntoCategoryId` closure (`S → D → T`) reachable from any retained category** (including intermediate merged categories `D` with `₱0` allocation/actuals and terminal targets `T` even if `T` is archived with `₱0` own allocation and `₱0` actuals).
      - All active buckets, plus any archived buckets that have a non-zero allocation in any model or `appliedPlan` or have non-zero actuals in `month`.
      - Selected-month category actuals from F02 `entries` and selected-month bucket gross contribution actuals from F03 `savings_activities`.
    - Updates `getSavingsView` in `src/server/savings-read.ts` to read the selected month's planned savings allocations strictly from `findMonthlyBudgetPlan(db, month)` (`hasMonthlyPlan = plan !== null`, `0` when no plan is applied to `month`; no global active-model fallback), scoping `monthlyPlannedSavingsCentavos` and `monthlyShortfallCentavos` in `calculateSavingsKpis` strictly to **active buckets**.
  - Validation: `tests/server/models-service.test.ts` (including invalid `monthKey` fallback test).
- [ ] **T022 [P] [US4, US5] Budget models API route handlers**
  - Files:
    - `src/app/api/models/route.ts` (new: `POST`)
    - `src/app/api/models/[id]/route.ts` (new: `PATCH`, `DELETE`)
    - `src/app/api/models/[id]/duplicate/route.ts` (new: `POST`)
    - `src/app/api/models/[id]/apply/route.ts` (new: `POST`)
  - Expected behavior: validate request JSON via `readBody`, invoke `models-service.ts`, return `201` / `200` JSON responses per `contracts/api.md`, and map `DomainError` via `errorResponse`.
  - Validation: `tests/api/models.test.ts`.
- [ ] **T023 [P] [US5] Monthly budget plan revision API route handler**
  - Files: `src/app/api/monthly-plans/[monthKey]/route.ts` (new: `PATCH`).
  - Expected behavior: validate request JSON via `readBody`, invoke `reviseMonthlyBudgetPlan(monthKey, patch)`, return `200 { plan }`, and map `DomainError` via `errorResponse`.
  - Validation: `tests/api/models.test.ts`.
- [ ] **T024 [US4, US5] Models & monthly plans API route handler tests**
  - Files: `tests/api/models.test.ts` (new).
  - Expected behavior: test `POST /api/models`, `PATCH /api/models/:id` (including `description: ""` clearing, `409 archived` on non-zero archived target, and `200` on zeroing an archived target), `DELETE /api/models/:id`, `POST /api/models/:id/duplicate`, `POST /api/models/:id/apply`, and `PATCH /api/monthly-plans/:monthKey` (including `404` when no plan exists for `monthKey` or unknown `targetId`, and `409 archived` on non-zero archived target) across valid and invalid inputs (`400`, `404`, `409`).
  - Validation: `npm run test`.
- [ ] **T025 Phase 03 Gate Check**
  - Run: `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build`.
  - Confirm all pass.

---

## Phase 04 — Hi-Fi Savings Buckets Screen (`/savings`) & Modals

Order: Route loading/error boundaries → Header → KPI row → Bucket card → Bucket modal → Activity modal → History modal → Archived section → Screen & RSC page → Component tests.

- [ ] **T026 [US1] Route-level loading and error boundaries for `/savings`**
  - Files: `src/app/(shell)/savings/loading.tsx` (new), `src/app/(shell)/savings/error.tsx` (new).
  - Expected behavior:
    - `loading.tsx`: skeleton matching the `/savings` header, 4-card KPI row, and bucket cards grid.
    - `error.tsx`: client error boundary accepting `{ error: Error; retry: () => void }` with `"Try again"` button calling `retry()`.
  - Validation: `tests/components/savings/savings-screen.test.tsx`.
- [ ] **T027 🎨 [US1] Savings Buckets header component**
  - Files: `src/components/savings/savings-header.tsx` (new).
  - **Match**: `HF#L23–L48` (page title `"Savings buckets"`, `MonthPicker` navigating to `/savings?month=YYYY-MM`, and `+ New bucket` primary CTA button on `#2f7d78` teal surface, radius 9, white text; Deviation `D1`).
  - Breakpoints: 1100, 1280, and 1440px wide.
  - Provenance: `lifted from prototype CSS` (HF L23–L48; `+ New bucket` and `MonthPicker` added on `/savings` per spec Clarification #4 / Deviation D1).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [ ] **T028 🎨 [US1, US2] Savings KPI row component**
  - Files: `src/components/savings/savings-kpi-row.tsx` (new).
  - **Match**: `HF#L286–L294`, styles `HF#L855–L860, L1070–L1079`.
  - Expected behavior: 4-card auto-fit grid (`repeat(auto-fit, minmax(200px, 1fr))`, gap 14px, margin-bottom 16px):
    - `HELD IN BUCKETS`: total lifetime active bucket balance in Mono 22px/700 + `"N buckets"` (`"1 bucket"` singular).
    - `SAVINGS BUFFER`: total lifetime counted bucket balance + `"counted buckets only"`.
    - `RUNWAY`: `"N.N mo"` (or `"—"` when monthly expenses are `0`) + `"buffer ÷ monthly expenses"`.
    - `FUNDED <MON>`: selected month's gross contributions (`monthlyFundedCentavos`) + subtitle based on `fundedStatus`: `"₱X short"` in amber (`#b9822c`) when `"short"`, `"on plan"` in status green (`#3f7d5c`) when `"on_plan"`, `"no savings planned"` in muted `#5c6467` when `"no_savings_planned"`, or `"no plan for <Mon>"` in muted `#5c6467` when `"no_plan"` (Deviation `D4`).
  - Breakpoints: 1100, 1280, and 1440px wide.
  - Provenance: `lifted from prototype CSS` (HF L286–L294, L1070–L1079).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [ ] **T029 🎨 [US1, US2, US3] Savings bucket card component**
  - Files: `src/components/savings/bucket-card.tsx` (new).
  - **Match**: `HF#L295–L313`, styles `HF#L1048–L1069`.
  - Expected behavior: white card (`border-radius: 14px`, padding 18px, border `#b9cfcd` when `countsTowardBuffer` is true else `#d5d8d8`):
    - Top row: bucket name (15.5px/600), pill badge (`DEFAULT` on default bucket, `COUNTED` on other counted buckets, `#e4efee` bg / `#26686a` text), type & target/due month subtitle (`12.5px #5c6467`) and optional description, and lifetime current balance (`JetBrains Mono 19px/700`).
    - Progress bar (`9px` height, radius `5px`, track `#e2e4e4`; fill in status green `#3f7d5c` when `currentBalance >= targetAmount`, status amber `#c9992f` when `< targetAmount` for targeted buckets, or teal `#2f7d78` for open-ended buckets).
    - Progress labels: `"₱balance of ₱target · ₱remaining left"` and `"N%"` (`Math.floor` percentage) when target is set (Deviation `D4`), or `"no target"` and `"open-ended"` when no target is set.
    - Footer row (`border-top: 1px solid #e2e4e4`, padding-top 12px): `"Funded <Mon> ₱actual"` (or `"₱actual of ₱planned"` when `planned > 0`, in amber `#b9822c` when `actual < planned`), interactive `buffer` toggle switch (`34×19px`, locked on default bucket), and action buttons (`Contribute`, `Withdraw`, `History`, `Edit`, `Archive`; Deviation `D3`).
  - Breakpoints: 1100, 1280, and 1440px wide.
  - Provenance: `lifted from prototype CSS` (HF L295–L313, L1048–L1069) and `recreated manually: card action buttons per spec Clarification #4 (Deviation D3)`.
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [ ] **T030 🎨 [US1] Create / Edit Bucket modal component**
  - Files: `src/components/savings/bucket-modal.tsx` (new).
  - **Match**: Modal shell and control tokens from `HF#L550–L602` (`520px` content width, radius 16px, 42px controls, 11.5px caps labels, error border `#b0533c` on `#fdf6f3`, disabled button `#5c6467` on `#f4f5f5`).
  - Expected behavior: supports creating and editing a bucket with fields: `NAME`, `TYPE` (`Cash Buffer`, `Emergency Fund`, `Goal`, `Sinking Fund`), `OPENING BALANCE (PHP)` (defaults to `0`), `TARGET AMOUNT (PHP)` (optional), `TARGET / DUE MONTH` (`YYYY-MM`, shown for `Goal` and `Sinking Fund`), `DESCRIPTION` (optional), `COUNTS TOWARD BUFFER` toggle, and `DEFAULT CASH BUFFER` checkbox (shown when type is `Cash Buffer`). When editing the current default bucket (`bucket.isDefault === true`), `TYPE`, `DEFAULT CASH BUFFER`, and `COUNTS TOWARD BUFFER` are locked/disabled with helper text `"Designate another Cash Buffer bucket as default first."`. Disables Save while in-flight (double-submit guard) and preserves draft on server error.
  - Breakpoints: 1100, 1280, and 1440px wide.
  - Provenance: `recreated manually: bucket CRUD modal required by spec Clarification #4 using HF#L550–L602 modal tokens (Deviation D3)`.
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [ ] **T031 🎨 [US2] Contribute / Withdraw Savings Activity modal component**
  - Files: `src/components/savings/activity-modal.tsx` (new).
  - **Match**: Modal shell and control tokens from `HF#L550–L602`, reusing `CalendarPopover` (`src/components/entries/popovers/calendar-popover.tsx`).
  - Expected behavior: pre-set to target bucket and operation kind (`Contribution` | `Withdrawal` segmented toggle), with `AMOUNT (PHP)`, Monday-first `DATE` popover (defaulting to today, with dates `> today` disabled/rejected), and optional `NOTE`. Shows current bucket balance and projected balance after save; blocks Save with `"Bucket balance cannot be negative."` if a withdrawal exceeds current balance; disables Save while in-flight to prevent double-submission.
  - Breakpoints: 1100, 1280, and 1440px wide.
  - Provenance: `recreated manually: savings activity modal required by spec Clarification #4 using HF#L550–L602 modal tokens (Deviation D3)`.
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [ ] **T032 🎨 [US2, US3] Bucket Activity History modal component**
  - Files: `src/components/savings/bucket-history-modal.tsx` (new).
  - **Match**: Modal shell `HF#L550–L602` and table row tokens `HF#L215–L227`.
  - Expected behavior: displays bucket name, opening balance, and derived lifetime current balance; lists recorded contributions (`+` in status green `#3f7d5c`) and withdrawals (`−` in ink `#14181a`) ordered newest first, with date, kind, note, amount in Mono, and `✎` (inline/modal edit) and `✕` (delete with confirmation via `ConfirmDialog`) actions on active buckets (strictly read-only on archived buckets — no edit or delete controls). Blocks edits or deletes that would cause the bucket balance to go negative or have `date > today`.
  - Breakpoints: 1100, 1280, and 1440px wide.
  - Provenance: `recreated manually: activity history modal required by spec Clarifications #4–#5 using HF modal and table row tokens (Deviation D3)`.
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [ ] **T033 🎨 [US3] Collapsible Archived Buckets section component**
  - Files: `src/components/savings/archived-buckets.tsx` (new).
  - **Match**: Collapsible section styling matching `src/components/household/archived-members.tsx` and `HF#L377–L378`.
  - Expected behavior: renders at the bottom of `/savings` when `archivedBuckets.length > 0`. Expands/collapses to show archived buckets with `(archived)` badge, preserved balance, `History` button (read-only), and `Restore` button. Also includes archive confirmation dialog via `ConfirmDialog`.
  - Breakpoints: 1100, 1280, and 1440px wide.
  - Provenance: `recreated manually: archived buckets section required by spec Clarification #4 and US3 (Deviation D3)`.
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [ ] **T034 [US1, US2, US3] Savings screen container and Server Component page**
  - Files: `src/components/savings/savings-screen.tsx` (new), `src/app/(shell)/savings/page.tsx`.
  - Expected behavior:
    - `SavingsScreen` orchestrates `SavingsHeader`, `SavingsKpiRow`, active `BucketCard` grid (or `EmptyState` when no active buckets exist), `ArchivedBuckets`, `BucketModal`, `ActivityModal`, `BucketHistoryModal`, archive `ConfirmDialog`, and `Toast`, calling `router.refresh()` after mutations (and handling `404` stale-record responses by showing an error toast, closing the stale modal, and calling `router.refresh()`).
    - `src/app/(shell)/savings/page.tsx` reads `searchParams: Promise<{ month?: string }>`, calls `getSavingsView(month)`, and renders `SavingsScreen`.
  - Validation: `tests/components/savings/savings-screen.test.tsx`.
- [ ] **T035 [US1, US2, US3] Savings screen and modal component tests**
  - Files: `tests/components/savings/savings-screen.test.tsx` (new), `tests/components/savings/savings-modals.test.tsx` (new).
  - Expected behavior: test empty state, KPI rendering (`—` runway when expenses are `0`, `"no plan for <Mon>"`, `"no savings planned"`, amber `"₱X short"` per-bucket shortfall sum, and green `"on plan"`), bucket cards, default bucket locked controls in `BucketModal` and card toggle, contribute/withdraw modal negative-balance and `date > today` guards, double-submit prevention on `BucketModal` and `ActivityModal`, history modal edit/delete flows (and read-only state on archived buckets), archive/restore workflows, and two-tab `404` stale-record recovery (toast + modal close + `router.refresh()`).
  - Validation: `npm run test`.
- [ ] **T036 Phase 04 Gate Check**
  - Run: `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build`.
  - Confirm all pass.

---

## Phase 05 — Hi-Fi Budget Models Screen (`/models`), Charts, & Collapsible Allocation Table

Order: Route loading/error boundaries → Header → Left model list (Month's Plan card + Reusable Model cards) → Stacked bar → Conic donut → Diverging bar chart → Collapsible umbrella table → Model modal → Screen & RSC page → Component tests.

- [ ] **T037 [US4] Route-level loading and error boundaries for `/models`**
  - Files: `src/app/(shell)/models/loading.tsx` (new), `src/app/(shell)/models/error.tsx` (new).
  - Expected behavior:
    - `loading.tsx`: skeleton matching `/models` header, left model list column, and right detail pane.
    - `error.tsx`: client error boundary accepting `{ error: Error; retry: () => void }` with `"Try again"` button calling `retry()`.
  - Validation: `tests/components/models/models-screen.test.tsx`.
- [ ] **T038 🎨 [US4, US5] Budget Models header component**
  - Files: `src/components/models/models-header.tsx` (new).
  - **Match**: `HF#L23–L48` (page title `"Budget models"`, `MonthPicker` navigating to `/models?month=YYYY-MM`, and `+ New model` button; Deviation `D5`).
  - Breakpoints: 1100, 1280, and 1440px wide.
  - Provenance: `lifted from prototype CSS` (HF L23–L48; `MonthPicker` added on `/models` per spec Clarification #6 / Deviation D5).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [ ] **T039 🎨 [US4, US5] Left column Month's Plan card & Reusable Model cards list**
  - Files: `src/components/models/model-list.tsx` (new).
  - **Match**: `HF#L319–L328`, styles `HF#L1083–L1097`.
  - Expected behavior:
    - **Top section (`"SELECTED MONTH PLAN"`)**:
      - When `appliedPlan !== null`: renders a selectable **Month's Plan card** (`"<Mon YYYY> plan"`, subtitle `"from <modelName>"` or `"<modelName> · revised"`, `ACTIVE` pill badge `#e4efee` bg / `#26686a` text, line 1 `"₱X exp · ₱Y sav"`, line 2 `"unallocated ₱Z/mo"`).
      - When `appliedPlan === null`: renders a muted non-selectable card (`"No plan applied for <Mon YYYY>"`).
    - **Bottom section (`"REUSABLE MODELS"`)**:
      - Renders reusable budget model cards (`border-radius: 12px`, padding `14px 15px`, border `#2f7d78` when selected else `#d5d8d8`), showing model name (`14.5px/600`), pill badge (`ACTIVE`, `REVISED`, or `DIVERGED`), line 1 (`"₱X exp · ₱Y sav"` in Mono 12px), and line 2 (`"unallocated ₱Z/mo"`), plus the dashed `+ New model` button (`border: 1px dashed #c4c9c9`, radius 12px, `#2f7d78` text; Deviation `D5`).
  - Breakpoints: 1100, 1280, and 1440px wide.
  - Provenance: `lifted from prototype CSS` (HF L319–L328, L1083–L1097) and `recreated manually: top Month's Plan card per user decision C2a (Deviation D5)`.
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [ ] **T040 🎨 [US4] `"Where the income goes"` 100% stacked bar component**
  - Files: `src/components/models/income-allocation-bar.tsx` (new).
  - **Match**: `HF#L336–L347`, styles `HF#L1156–L1168, L1384`.
  - Expected behavior: subtle card (`#f4f5f5` bg, border `#e2e4e4`, radius 12px, padding `14px 16px`):
    - Header row: `"Where the income goes"` (`13.5px/600`) and `"₱<Expected Income> planned income"` (`Mono 12px #5c6467`, appending `"· Fully allocated"` when `isFullyAllocated`), plus `"Overallocated by ₱X"` warning badge in status red (`#b0533c` on `#fdf6f3`) when `isOverallocated` (Deviation `D10`).
    - `28px`-tall stacked bar (radius 6px, track `#e2e4e4`) with segments for `Expenses` (`#8c8378`, white `%`), `Savings` (`#2f7d78`, white `%`), and `Unallocated` (`#c3cac9`, `#3c4346` `%`, shown when `> 0`), with hover tooltip `"<Name> · ₱<Amount>"`.
    - Legend row below with `11×11px` square swatches (radius 3px) and segment names.
  - Breakpoints: 1100, 1280, and 1440px wide.
  - Provenance: `lifted from prototype CSS` (HF L336–L347, L1156–L1168; status badges per Deviation D10).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [ ] **T041 🎨 [US4] `"Expense breakdown"` conic donut chart component**
  - Files: `src/components/models/expense-breakdown-donut.tsx` (new).
  - **Match**: `HF#L350–L353`, styles `HF#L1149–L1155, L1387`.
  - Expected behavior: subtle card (`#f4f5f5` bg, border `#e2e4e4`, radius 12px, padding 14px) with title `"Expense breakdown"` and centered `176×176px` `conic-gradient(...)` ring with `108×108px` inner `#f4f5f5` hole (`margin: 34px`). Shows clean neutral ring / empty label when planned expenses are `₱0`.
  - Breakpoints: 1100, 1280, and 1440px wide.
  - Provenance: `lifted from prototype CSS` (HF L350–L353, L1149–L1155, L1387).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [ ] **T042 🎨 [US6] `"Budget vs actual (Δ)"` diverging bar chart component**
  - Files: `src/components/models/budget-vs-actual-chart.tsx` (new).
  - **Match**: `HF#L354–L372`, styles `HF#L1170–L1180`.
  - Expected behavior: subtle card (`#f4f5f5` bg, border `#e2e4e4`, radius 12px, padding 14px) with title `"Budget vs actual (Δ)"`, horizontal `1px #14181a` zero line at vertical center (`top: 50%`), vertical rotated labels `SURPLUS` (`#5c6467`) and `DEFICIT` (`#b0533c`), `18px`-wide category-colored bars extending upward for surplus (`Δ > 0`) and downward for deficit (`Δ < 0`) for the selected month, and 4-letter category labels below the plot area (`#b0533c` when deficit else `#5c6467`).
  - Breakpoints: 1100, 1280, and 1440px wide.
  - Provenance: `lifted from prototype CSS` (HF L354–L372, L1170–L1180).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [ ] **T043 🎨 [US4, US5, US6, US7] Collapsible umbrella groups & Budget-vs-Actual table component**
  - Files: `src/components/models/models-table.tsx` (new).
  - **Match**: `HF#L375–L391`, styles `HF#L1098–L1144, L1385–L1386`.
  - Expected behavior:
    - Table header (`grid-template-columns: minmax(0,45%) minmax(0,1fr) minmax(0,1fr) minmax(0,0.9fr)`, gap 10px): `CATEGORY`, `BUDGET / MO`, `ACTUAL` (selected month's actuals; Deviation `D6`), `Δ`.
    - Three collapsible bordered umbrella blocks (`border: 1px solid #e2e4e4`, radius 9px, margin-top 8px) in order: **Income**, **Expenses**, **Savings**.
    - Group header bar (`#f4f5f5`, caret `▾`/`▸`, group label, and group totals for `BUDGET / MO`, `ACTUAL`, and `Δ`) stays visible when collapsed.
    - Rows display category square swatch (`10×10px`, radius 3px; hidden for savings buckets), entity name (with `(archived)` or `(merged → <Target>)` badge when applicable; Deviation `D7`), editable `BUDGET / MO` input (`JetBrains Mono 12px`, radius 6px, tinted `#fdf6f3` / `#cf9b8c` on expense/income deficit or `#fdf9f0` / `#d3a13f` on savings shortfall; on a merge target `T` with `mergedSources.length > 0`, the `<input>` displays and edits `T`'s own stored `rawPlannedCentavos` while rendering `"₱<plannedCentavos> effective (+₱<sourceAmount> from <Source>)"` as a subtitle beneath the input; read-only on `isFoldedIntoMergeTarget` reference rows — with an optional `"Zero out"` action if `rawPlannedCentavos > 0` — and on archived rows when `rawPlannedCentavos === 0`, or zero-out-only when `archived && rawPlannedCentavos > 0`; locked on past-month plans until unlocked), selected-month `ACTUAL` (with `"N% used · ₱X remaining"` or `"N% used · ₱X overspent"` or `"Overspent · ₱X overspent"` subtitle for expenses, `"₱X short"` / `"₱X remaining"` for savings, or `"→ <Target>"` on folded merged reference rows), and favourable-positive `Δ` (`+` green, `−` red for income/expenses, **`−` amber `#b9822c` for savings — never red**).
    - Editing a `BUDGET / MO` input updates local draft state for `<10ms` live recalculation across all charts and totals (recomputing `T`'s effective `plannedCentavos = draftRawPlanned_T + sum(rawPlanned_S)` when editing a merge target `T`), commits `T`'s own amount via `onSaveAllocation(targetType, targetId, amount)` on `blur` or `Enter` (only when changed and valid), and reverts on `Escape`.
    - Footer row (`border-top: 1px solid #d5d8d8`; Deviation `D9`): column 1 `"Unallocated"` (with `"Fully allocated"` or `"Overallocated"` pill badge), column 2 signed planned `unallocatedCentavos` (`#2f7d78` teal `> 0`, `#3c4346` `=== 0`, `#b0533c` red `< 0`), column 3 signed `actualUnallocatedCentavos`, and column 4 signed `unallocatedDeltaCentavos` (`+` green `> 0`, `−` red `< 0`, `0` muted).
  - Breakpoints: 1100, 1280, and 1440px wide.
  - Provenance: `lifted from prototype CSS` (HF L375–L391, L1098–L1144, L1385–L1386; column `ACTUAL`, utilization subtitles, post-merge rows, and footer `ACTUAL`/`Δ` per Deviations D6, D7, D9).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [ ] **T044 🎨 [US4] Create / Edit / Duplicate Budget Model modal component**
  - Files: `src/components/models/model-modal.tsx` (new).
  - **Match**: Modal shell and control tokens from `HF#L550–L602` (Deviation `D11`).
  - Expected behavior: modal for creating a new budget model, editing a model's `NAME` and optional `DESCRIPTION`, or duplicating an existing model with a custom name/description. Validates required unique name (`validateName`), disables Save while in-flight (double-submit guard), and preserves draft on error.
  - Breakpoints: 1100, 1280, and 1440px wide.
  - Provenance: `recreated manually: model create/edit/duplicate modal using HF#L550–L602 modal tokens (Deviation D11)`.
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [ ] **T045 [US4, US5, US6, US7] Budget Models screen container and Server Component page**
  - Files: `src/components/models/models-screen.tsx` (new), `src/app/(shell)/models/page.tsx`.
  - Expected behavior:
    - `ModelsScreen` defaults selection to the top **Month's Plan card** (`selectedView = { kind: "plan" }`) when `appliedPlan !== null` for `month`, or to the first reusable `BudgetModel` card (`selectedView = { kind: "model", modelId: models[0].id }`) when `appliedPlan === null`.
    - In **Month's Plan mode**: detail header shows `<Mon YYYY> plan — <modelName>`, `"Revised"` badge if `isRevised`, `"Unlock to revise past plan"` button (with `ConfirmDialog`) when `month < currentMonth`, and `Re-apply template` button (with `ConfirmDialog` and in-flight disable guard) when `sourceModelId` exists and `(isRevised || hasTemplateDiverged)`; cell commits call `PATCH /api/monthly-plans/:monthKey`; B-vs-A compares `appliedPlan` against `month` actuals.
    - In **Reusable Model mode**: detail header shows `<model.name>`, optional `description`, `Edit` (opens `ModelModal`), `Duplicate` (opens `ModelModal`), `Make active` / `Re-apply` / disabled `Active` (with in-flight disable guard, applying immediately when `appliedPlan === null && month >= currentMonth` or opening `ConfirmDialog` when overwriting an existing plan or applying to `month < currentMonth`), and `Delete` (with `ConfirmDialog`); cell commits call `PATCH /api/models/:id`; B-vs-A live-previews the selected reusable model against `month` actuals.
    - Handles `404` stale-record responses by showing an error toast, closing any open modal, and calling `router.refresh()`.
    - `src/app/(shell)/models/page.tsx` reads `searchParams: Promise<{ month?: string }>`, calls `getModelsView(month)`, and renders `ModelsScreen`.
  - Validation: `tests/components/models/models-screen.test.tsx`.
- [ ] **T046 [US4, US5, US6, US7] Budget Models screen and table component tests**
  - Files: `tests/components/models/models-screen.test.tsx` (new), `tests/components/models/models-table.test.tsx` (new).
  - Expected behavior: test empty state, default selection of Month's Plan card when `appliedPlan !== null`, switching between Month's Plan card and Reusable Model cards (verifying live B-vs-A preview and routing `PATCH` to `/api/monthly-plans/:monthKey` vs `/api/models/:id`), creating/editing/duplicating/deleting models, `Make active` immediate apply on current/future month without plan vs `ConfirmDialog` when overwriting an existing/revised plan or applying to a past month, double-submit prevention on `Make active` and `ModelModal`, past-month plan lock and `"Unlock to revise past plan"` confirmation, `<10ms` live recalculation while typing + save on `blur`/`Enter` + revert on `Escape` + invalid input error state, `Unallocated` footer `planned`/`actual`/`Δ` and `"Fully allocated"` / `"Overallocated"` badges, favourable-positive `Δ` with amber for savings shortfalls, post-merge historical B-vs-A folding with non-zero actuals (`Groceries` input showing own `20,000` with subtitle `"₱25,000 effective (+₱5,000 from Dining out)"` + `"Dining out (merged → Groceries)"` reference row, plus **editing `Groceries`'s input from `20000` to `21000`, saving via `PATCH /api/monthly-plans/:monthKey` with `amount: "21000"`, and verifying reload renders input `21,000` and subtitle `"₱26,000 effective (+₱5,000 from Dining out)"`**), and two-tab `404` stale-record recovery.
  - Validation: `npm run test`.
- [ ] **T047 Phase 05 Gate Check**
  - Run: `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build`.
  - Confirm all pass.

---

## Phase 06 — Deterministic Demo Seed & Guarded Clear Extension

Order: Extend `src/server/demo.ts` → Update CLI wrapper output → Extend `tests/server/seed-clear.test.ts`.

- [ ] **T048 [US8] Extend `seedDemoData`, `getClearSummary`, and `clearAllData` for F03 tables**
  - Files: `src/server/demo.ts`.
  - Expected behavior:
    - `getClearSummary(db)` returns counts for all 10 user tables (`monthlyBudgetAllocationsCount`, `monthlyBudgetPlansCount`, `budgetModelAllocationsCount`, `budgetModelsCount`, `savingsActivitiesCount`, `savingsBucketsCount`, `entriesCount`, `itemsCount`, `categoriesCount`, `membersCount`).
    - `clearAllData(db)` deletes rows from all 10 user tables inside a single transaction in foreign-key-safe order.
    - `seedDemoData(db, options)` refuses if any of the 10 user tables is non-empty; uses the 12 rolling calendar `months` ending with `now` (`options.currentDate ?? new Date()`); seeds the 4 buckets (`Cash buffer`, `Emergency fund`, `Car down payment`, `Insurance`), deterministic monthly savings contributions dated `${month}-01` across those 12 rolling months for buckets with `funded > 0`, the 3 reusable budget models (`Baseline 2026`, `Lean months`, `Car purchase 2027`) with their category and bucket allocations, and 12 monthly applied `Baseline 2026` plans (`MonthlyBudgetPlan` + `MonthlyBudgetAllocation`).
  - Validation: `tests/server/seed-clear.test.ts`.
- [ ] **T049 [US8] Update `scripts/seed.ts` and `scripts/clear.ts` summary output**
  - Files: `scripts/seed.ts`, `scripts/clear.ts`.
  - Expected behavior: include F03 seeded/cleared counts (buckets, savings activities, budget models, monthly plans) in CLI stdout summaries.
  - Validation: `tests/server/seed-clear.test.ts`.
- [ ] **T050 [US8] Extend demo seed and clear integration tests**
  - Files: `tests/server/seed-clear.test.ts`.
  - Expected behavior: verify `seedDemoData` seeds all 4 buckets, 36 savings contribution records (3 funded buckets × 12 rolling months dated `${month}-01`), 3 reusable models, and 12 monthly plans; verify derived lifetime bucket balances (`₱250,000`, `₱216,000`, `₱145,000`, `₱24,000`) and model totals match `scripts/seed.json`; verify non-empty refusal when only an F03 table has rows; verify `clearAllData` wipes all F03, F02, and F01 user tables.
  - Validation: `npm run test`.
- [ ] **T051 Phase 06 Gate Check**
  - Run: `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build`.
  - Confirm all pass.

---

## Phase 07 — Release Prep

Order: Version bump → Changelog → Roadmap → Repo map → README → Deviations sync → Release docs test & Gate check.

- [ ] **T052 Version bump to `3.2.0`**
  - Files: `package.json`, `package-lock.json`.
  - Expected behavior: bump `"version"` from `"3.1.0"` to `"3.2.0"` in `package.json` and `package-lock.json` (both root `"version"` and `packages[""].version`).
  - Validation: `tests/release-docs.test.ts`.
- [ ] **T053 [P] Update `CHANGELOG.md`**
  - Files: `CHANGELOG.md`.
  - Expected behavior: add `## 3.2.0 — 2026-11-08` section documenting F03 Budget & Savings (`/savings` screen, savings buckets, contributions/withdrawals, activity history, `/models` screen, reusable budget models, monthly applied snapshots, Budget-vs-Actual comparisons, Migration 3, and extended `seed`/`clear` CLI tooling).
  - Validation: `tests/release-docs.test.ts`.
- [ ] **T054 [P] Update `docs/feature_roadmap.md`**
  - Files: `docs/feature_roadmap.md`.
  - Expected behavior: mark `F03 — Budget & Savings` as `✓ Complete` and link `[Brief](features/v3-003-budget-and-savings.md)` in the roadmap table.
  - Validation: `tests/release-docs.test.ts`.
- [ ] **T055 [P] Update `docs/REPO_MAP.md`**
  - Files: `docs/REPO_MAP.md`.
  - Expected behavior: document new F03 domain modules (`month.ts`, `savings.ts`, `savings-calculations.ts`, `budget.ts`, `budget-calculations.ts`), server modules (`savings-store.ts`, `savings-service.ts`, `savings-read.ts`, `models-store.ts`, `models-service.ts`, `models-read.ts`), API routes (`/api/savings/**`, `/api/models/**`, `/api/monthly-plans/**`), and component directories (`src/components/savings/`, `src/components/models/`).
  - Validation: `tests/release-docs.test.ts`.
- [ ] **T056 [P] Update `README.md`**
  - Files: `README.md`.
  - Expected behavior: document F03 Savings Buckets (`/savings`) and Budget Models (`/models`) capabilities and updated `npm run seed` / `npm run clear` coverage.
  - Validation: `tests/release-docs.test.ts`.
- [ ] **T057 [P] Review and synchronize `deviations.md`**
  - Files: `specs/v3-003-budget-and-savings/deviations.md`.
  - Expected behavior: verify all deviations `D1`–`D11` match the implemented components and behavior.
  - Validation: `specs/v3-003-budget-and-savings/deviations.md` matches codebase.
- [ ] **T058 Update `tests/release-docs.test.ts` and run Phase 07 Gate Check**
  - Files: `tests/release-docs.test.ts`.
  - Expected behavior: update expected version to `"3.2.0"` and add `"specs/v3-003-budget-and-savings/quickstart.md"` to `releaseDocuments`. Run `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build`.
  - Validation: all checks pass.

---

## Phase 08 — Browser Smoke Test & Visual Review

Run in a real desktop browser against the to-be-merged state after Release Prep completes. Start server with `$env:CELIA_DB_PATH="./data/smoke.db"; npm run dev` (`quickstart.md`).

- [ ] **T059 Dev server network binding check**
  - Confirm the server listens exclusively on `127.0.0.1:3000` and is not bound to `0.0.0.0`.
- [ ] **T060 [US1] Walk quickstart "US1 — Create, Edit, and Manage Savings Buckets"**
  - On a clean DB, open `/savings`, verify empty state and zeroed KPIs (`no plan for <Mon>`). Create default `"Cash buffer"` (`250000`), `"Emergency fund"` (`120000`), and `"Car down payment"` (`85000` opening, `180000` target, `2027-02`). Verify badges, locked default buffer toggle, interactive buffer toggle on Car bucket, progress text, and persistence across reload.
- [ ] **T061 [US2] Walk quickstart "US2 — Record and Manage Savings Contributions and Withdrawals"**
  - Contribute `5000` to `"Car down payment"`, verify balance (`₱90,000`) and gross `FUNDED <MON>`. Attempt withdrawal of `100000` and verify negative-balance block. Withdraw `15000` (`₱75,000` balance, `FUNDED <MON>` remains `₱5,000`). Edit and delete activities in History modal. Confirm `/entries` is completely unaffected.
- [ ] **T062 [US3] Walk quickstart "US3 — Archive and Restore Savings Buckets"**
  - Create `"Travel Fund"`, contribute `10000`, archive it, verify it moves to `Archived` section and is excluded from active KPIs, inspect preserved read-only history, and restore it to active status.
- [ ] **T063 [US4] Walk quickstart "US4 — Create, Edit, Duplicate, and Delete Reusable Budget Models"**
  - On `/models`, create `"Baseline 2026"`, enter Income (`Salary = 110000`, `Freelance = 9500`), Expense (`Rent = 25000`, `Groceries = 20000`, `Dining out = 5000`), and Savings (`Emergency fund = 8000`, `Car down payment = 10000`, `Travel Fund = 3000`) allocations, verify `"Where the income goes"` stacked bar, `"Expense breakdown"` donut, teal surplus vs. red overallocated `Unallocated` states, duplicate `"Baseline 2026 (Copy)"`, and delete the copy.
- [ ] **T064 [US5] Walk quickstart "US5 — Apply a Budget Model to a Month and Preserve Historical Monthly Plans"**
  - Apply `"Baseline 2026"` (`Groceries = ₱20,000`) to Sep 2026 and `"Lean months"` (`Groceries = ₱16,000`) to Oct 2026. Edit reusable `"Baseline 2026"` template to `Groceries = ₱22,000`. Switch back to Sep 2026, select the top `"Sep 2026 plan"` card, and confirm September's applied plan still shows `Groceries = ₱20,000`.
- [ ] **T065 [US6] Walk quickstart "US6 — Compare Budget Allocations Against Actual Monthly Activity"**
  - Record Sep 2026 entries (`Salary`, `Groceries`, `Dining out`) and savings contribution (`Car down payment`). Verify `/models` for Sep 2026 displays accurate `ACTUAL`, favourable-positive `Δ` (green for underspent expense, red for overspent expense, amber — never red — for under-funded savings), utilization, diverging bar chart (`SURPLUS` / `DEFICIT`), and live preview when clicking `"Lean months"`.
- [ ] **T066 [US7] Walk quickstart "US7 — Historical Integrity Across Archived or Merged Categories and Buckets"**
  - Apply `"Baseline 2026"` to Aug 2026, record Aug 2026 entries (`Dining out = ₱4,000`, `Groceries = ₱18,000`), archive `"Travel Fund"`, and merge `"Dining out"` into `"Groceries"`. Verify Aug 2026's historical monthly plan folds `"Dining out"`'s `₱5,000` into `"Groceries"` (`₱25,000` effective planned vs `₱22,000` actual, `Δ = +₱3,000`) while rendering `"Dining out (merged → Groceries)"` as a reference row and `"Travel Fund (archived)"` intact, and verify the reusable `"Baseline 2026"` template combines `"Dining out"` into `"Groceries"`.
- [ ] **T067 [US8] Walk quickstart "US8 — Seed and Clear Verification"**
  - Run `npm run clear -- --yes`, then `npm run seed`. Verify 4 buckets on `/savings` (`FUNDED <MON> ₱15,000`, `"₱5,000 short"` in amber) and `"<Mon YYYY> plan"` + 3 reusable models on `/models`. Run `npm run clear` dry-run and `npm run clear -- --yes` full wipe.
- [ ] **T068 Server restart persistence verification**
  - Stop and restart the Next.js server with the same `CELIA_DB_PATH` and confirm all buckets, savings activities, reusable models, and monthly applied plans persist intact.
- [ ] **T069 Keyboard accessibility pass**
  - Verify Tab order, Enter submission, Escape modal/popover/input dismissal, and keyboard interaction across `/savings` and `/models` modals and collapsible groups.
- [ ] **T070 Contrast and no-shadow pass**
  - Verify text contrast >= 4.5:1 and zero `box-shadow` across `/savings` and `/models` cards, charts, tables, and modals.
- [ ] **T071 Tier 2 Visual review for every 🎨 task**
  - Tasks: `T027`, `T028`, `T029`, `T030`, `T031`, `T032`, `T033`, `T038`, `T039`, `T040`, `T041`, `T042`, `T043`, `T044`.
  - Capture screenshots of `/savings` and `/models` (and modals) at 1100, 1280, and 1440px wide, compare side by side against `reference/Money Tracker Hi-Fi.dc.html`, confirm zero horizontal scroll at `>= 1100px`, and record final visual review status in `specs/v3-003-budget-and-savings/deviations.md`.

# Implementation Plan: F03 — Budget & Savings

**Branch**: `v3-003-budget-and-savings` | **Date**: 2026-11-08 | **Spec**: [spec.md](spec.md)  
**Input**: `specs/v3-003-budget-and-savings/spec.md`, `docs/features/v3-003-budget-and-savings.md`, `handoff/celia_v3_001.zip`

## Summary

F03 introduces household financial planning and savings tracking across two complementary areas:

1. **Persistence & Migration 3**: Adds 6 tables (`savings_buckets`, `savings_activities`, `budget_models`, `budget_model_allocations`, `monthly_budget_plans`, `monthly_budget_allocations`) with foreign keys, check constraints, and partial unique indexes via `PRAGMA user_version = 3`, preserving all F01 and F02 data.
2. **Pure Domain Core & Exact Financial Calculations**: Implements non-negative and optional positive centavo parsing, shared month-key validation (`src/domain/month.ts`), lifetime savings bucket balance and deterministic `Math.floor` target progress calculations, buffer and runway KPIs, gross-contribution monthly funding with per-bucket shortfall sums, budget model allocation summaries (`"Where the income goes"`, expense donut mix, planned/actual/`Δ` unallocated), and favourable-positive Budget-vs-Actual variance (`Δ`) with post-merge category folding in `src/domain/`, reusable by F04 and F05.
3. **Savings & Budget Services, Stores, & API Route Handlers**: Provides transactional CRUD, archival/restoration, read-only archived-bucket enforcement (including on activity `DELETE`), default Cash Buffer invariants, non-negative balance and `date <= today` enforcement, monthly snapshot application/revision, and atomic reusable-model allocation merging inside `mergeCategory`.
4. **Hi-Fi Savings Buckets (`/savings`) & Budget Models (`/models`) Screens**: Replaces the placeholder `/savings` and `/models` pages with full hi-fi workspaces, modals (bucket create/edit, contribution/withdrawal, activity history, model create/edit/duplicate), charts, collapsible sections, and a two-mode `/models` left rail (selectable Month's Plan card at the top + Reusable Model cards below).
5. **Extended Demo Tooling (`seed` & `clear`)**: Extends `src/server/demo.ts` so `npm run seed` and `npm run clear` deterministically populate and wipe F03 buckets, savings activities, reusable budget models, and monthly applied plans across the 12 rolling calendar months ending with the current month from `scripts/seed.json`.

---

## Technical Context

- **Language/Version**: TypeScript 5 (strict), Node.js 22 (CI) / 24 (local)
- **Primary Dependencies**: Next.js 16.4 App Router, React 19.2, Tailwind CSS 4, `better-sqlite3`, `server-only`. Dev dependencies: `@testing-library/react`, `vitest` 4, `tsx` 4. Zero new production or development dependencies.
- **Storage**: Local SQLite file at `CELIA_DB_PATH` (default `./data/celia.db`), server-only, WAL mode, `PRAGMA foreign_keys = ON`. Tracked via `PRAGMA user_version` (migration 3).
- **Testing**: Vitest 4. Pure domain, migration, store, service, demo, and route-handler tests run in `node` environment with in-memory or temp SQLite. Component tests use `jsdom` + React Testing Library. Browser Smoke Test covers User Stories 1–8.
- **Target Platform**: Desktop browsers at 1280–1440px wide; no horizontal scrolling at 1100px or higher. Server binds strictly to `127.0.0.1`.
- **Project Type**: Single Next.js web application.
- **Performance Goals**: Instant client-side calculation updates (<10ms) while typing in `BUDGET / MO` inputs (persisted on `blur` or `Enter`) and sub-millisecond synchronous SQLite queries for household-scale data.
- **Constraints**:
  - No drop shadows; text contrast >= 4.5:1.
  - All styling values derived from shared design tokens in `src/app/globals.css`.
  - Fonts: Sora (UI) and JetBrains Mono (monetary figures).
  - Exact integer centavo arithmetic (`1 PHP = 100 centavos`); no binary floating-point representation for money.
  - Never use `"over budget"` or `"under budget"` in UI copy; use `"overspent"`, `"underspent"`, `"remaining"`, or `"short"`.
- **Scale/Scope**:
  - 2 functional screens (`/savings` and `/models`), plus `loading.tsx` and `error.tsx` for each.
  - 13 mutation route handlers under `/api/savings/**`, `/api/models/**`, and `/api/monthly-plans/**`.
  - 6 new SQLite tables in Migration 3.
  - Extended `src/server/demo.ts` for F03 seed and clear support.

---

## Constitution Check

Checked against `.specify/memory/constitution.md` (Celia v3, 21 principles). *Result: PASS, zero violations.*

| Principle | How the plan complies |
|---|---|
| **I–II. SDD, accelerated** | Traceable directly to spec user stories US1–US8; artifacts right-sized to data and multi-phase scope. |
| **III. Prototype as visual truth** | Reproduces `Money Tracker Hi-Fi.dc.html` layout, KPI cards, bucket cards, stacked allocation bar, conic donut, diverging bar chart, and collapsible umbrella groups. Intentional spec-driven additions documented in `deviations.md` (`D1`–`D11`). |
| **IV. Domain integrity** | Strict separation between F02 `entries` (actual income/expenses), F03 `savings_activities` (explicit contributions/withdrawals), and F03 `budget_model_allocations` / `monthly_budget_allocations` (planned intentions). Savings are never recorded as expenses. |
| **V. Historical integrity** | Applying a model to a month creates an independent `MonthlyBudgetPlan` snapshot; editing or deleting a reusable model never alters past monthly snapshots. Archiving buckets/categories preserves all history and locks archived buckets against any activity mutation (`POST`/`PATCH`/`DELETE`). Merging categories combines reusable model allocations while keeping historical `monthly_budget_allocations` rows intact and folding merged source allocations into their terminal merge target for accurate historical B-vs-A comparison. |
| **VI. Single source of truth** | Bucket balances, target progress, buffer, runway, expected income, planned expenses/savings, unallocated amounts, and `Δ` are always derived from authoritative records. |
| **VII. Proven need** | Concrete store and service modules (`savings-store.ts`, `savings-service.ts`, `models-store.ts`, `models-service.ts`); no speculative repository factories, ORMs, or generic engines. |
| **VIII. Clear boundaries** | Pure financial math in `src/domain/savings-calculations.ts` and `src/domain/budget-calculations.ts`; raw SQL isolated in `src/server/*-store.ts`; thin route handlers; presentational client components. |
| **IX. Data persistence** | Schema evolution managed via versioned Migration 3 (`PRAGMA user_version = 3`); existing F01 and F02 data completely preserved. |
| **X. Financial precision** | All amounts stored and manipulated as integer centavos; deterministic rounding (`Math.floor` for bucket target progress so `100%` appears only at/above target; `0.1` rounding for runway; `Math.round` for utilization `%`); `₱` formatting only at UI boundaries. |
| **XI–XII. Testing & verification** | Automated unit, migration, store, service, API, demo, and component tests plus Browser Smoke Test and visual verification pass. |
| **XIII. Accessibility** | Native `<dialog>` / accessible modals, Escape and outside-click handling, keyboard navigation, contrast >= 4.5:1, zero horizontal scroll at >= 1100px. |
| **XIV. Design tokens** | Reuses CSS variables in `src/app/globals.css`. Category colors use square swatches; status uses green, amber, and red (with savings shortfalls always amber, never red). |
| **XV. AI-assisted** | Bounded phases with objective verification criteria and explicit file targets. |
| **XVI. Recoverability** | Incremental phase commits; atomic `database.transaction()` around all multi-row writes. |
| **XVII. Dependencies** | Zero new runtime or development dependencies. |
| **XVIII. Security & privacy** | Loopback-only binding (`127.0.0.1`); git-ignored SQLite database; no sensitive financial logging. |
| **XIX. Performance** | Index-backed SQLite queries and pure in-memory calculations (`<10ms` live input recalculation). |
| **XX. Definition of done** | All 20 feature brief acceptance criteria and US1–US8 criteria verified by tests and visual review. |
| **XXI. Constitutional priority** | Follows Constitution → Spec → Brief → Prototype → Plan → Tasks. |

### Compliance Note

- **Required fields in Celia F03**:
  - `SavingsBucket`: `name`, `type`, `openingBalance` (defaults to `0`), `countsTowardBuffer`, `isDefault`.
  - `SavingsActivity`: `bucketId`, `kind` (`contribution` | `withdrawal`), `amount` (`> 0`), `date` (`YYYY-MM-DD`, `<= today`).
  - `BudgetModel`: `name`.
  - `MonthlyBudgetPlan`: `monthKey` (`YYYY-MM`), `modelName`.
- **Centralized validation rules**:
  - `parseAndValidateAmount`, `parseAndValidateNonNegativeAmount`, and `parseOptionalPositiveAmount` in `src/domain/amount.ts`.
  - `validateName` and `nameKey` in `src/domain/names.ts`.
  - `isValidMonthKey` and `currentMonthKey` in `src/domain/month.ts` (shared across `entries-read.ts`, `savings-read.ts`, `models-read.ts`, `savings.ts`, and `budget.ts`).
  - `isValidBucketType`, `validateActivityDate` (enforcing valid calendar date and `date <= today`), and `validateNonNegativeBucketBalance` in `src/domain/savings.ts`.
  - Shared by client modals/inputs for immediate inline feedback and server services for strict enforcement.
- **Justification for new dependencies**:
  - None. F03 introduces **zero** new runtime or development dependencies.
- **Persistence runtimes**:
  - Celia v3 uses local SQLite persistence via `better-sqlite3` as established in F01 and F02. There is no hosted Supabase runtime or `createRepositories(config)` factory in Celia's specification or constitution.
  - Concrete store modules (`savings-store.ts`, `models-store.ts`) isolate SQL from domain and service layers per Constitution Principles VII (Architecture Should Follow Proven Need) and VIII (Clear Boundaries).
  - Demo mode runs on the local SQLite path via `src/server/demo.ts` (`npm run seed` and `npm run clear`), extended in F03 to seed and clear buckets, savings activities, reusable budget models, and monthly applied plans.

---

## Architecture

```text
Browser Client (127.0.0.1:3000)                  Next.js Server (127.0.0.1)
────────────────────────────────────────────     ──────────────────────────────────────────────────
app/(shell)/savings/page.tsx (RSC) ────────────► server/savings-read.ts
app/(shell)/models/page.tsx  (RSC) ────────────► server/models-read.ts
   │                                                 │ await connection()
   ├► loading.tsx (skeleton fallback)                ├► server/savings-store.ts    ─┐
   ├► error.tsx   (error boundary)                   ├► server/models-store.ts     ─┤
   │                                                 ├► server/entries-store.ts    ─┼► SQLite DB
   ▼ props (view data for selected month)            └► server/categories-store.ts ─┤  (better-sqlite3,
components/savings/savings-screen.tsx (client)                                      │   migration 3)
components/models/models-screen.tsx   (client)                                      │
   │                                                                                │
   ├── Pure Domain Math:                                                            │
   │     domain/month.ts                                                            │
   │     domain/savings-calculations.ts                                             │
   │     domain/budget-calculations.ts                                              │
   │                                                                                │
   ├── Mutations (fetch JSON POST / PATCH / DELETE):                                │
   │     app/api/savings/**                                                         │
   │     app/api/models/**                                                          │
   │     app/api/monthly-plans/**                                                   │
   │        │ validate body (http.ts)                                               │
   │        ▼                                                                       │
   │     server/savings-service.ts ─────────────────────────────────────────────────┤
   │     server/models-service.ts  ─────────────────────────────────────────────────┘
   │        │ uses domain validators & atomic db.transaction()
   │        ▼
   └── 2xx Response ──► toast + router.refresh() (re-renders RSC with fresh SQLite data)
       4xx Error    ──► inline field / modal error feedback (or 404 stale-record refresh)
```

### Layer Responsibilities

- **`src/domain`**:
  - `amount.ts`: `Centavos`, `parseAndValidateAmount`, `parseAndValidateNonNegativeAmount`, `parseOptionalPositiveAmount`, `formatCentavos`.
  - `month.ts`: `isValidMonthKey`, `currentMonthKey`.
  - `savings.ts`: `BucketType`, `SavingsActivityKind`, `SavingsBucket`, `SavingsActivity`, bucket/date validators.
  - `savings-calculations.ts`: `calculateBucketMetrics`, `calculateSavingsKpis`, `wouldBalanceGoNegative`.
  - `budget.ts`: `BudgetModel`, `MonthlyBudgetPlan`, `BudgetAllocationLine`, `hasTemplateDivergedFromPlan`.
  - `budget-calculations.ts`: `calculateBudgetSummary`, `calculateExpenseMixStops`, `resolveMergedCategoryTarget`, `calculateBudgetComparisonRows`, `calculateDivergingBars`.
- **`src/server/db`**:
  - `migrations.ts`: Migration 3 adding `savings_buckets`, `savings_activities`, `budget_models`, `budget_model_allocations`, `monthly_budget_plans`, and `monthly_budget_allocations`.
- **`src/server/savings-store.ts` & `src/server/savings-service.ts`**:
  - Prepared SQLite statements and transactional use cases for creating, updating, archiving, and restoring buckets, enforcing default Cash Buffer invariants, and creating, editing, and deleting savings activities on active buckets with `date <= today` and non-negative lifetime balance checks.
- **`src/server/models-store.ts` & `src/server/models-service.ts`**:
  - Prepared SQLite statements and transactional use cases for creating, updating, duplicating, and deleting reusable budget models, applying a model snapshot to a month (`Make active` / `Re-apply`, copying active categories and active buckets only), revising a month's applied plan, and merging category allocations in reusable models when categories are merged.
- **`src/server/savings-read.ts` & `src/server/models-read.ts`**:
  - Request-time server read helpers (`await connection()`) assembling `SavingsViewData` and `ModelsViewData` for a given `monthKey` (falling back to `currentMonthKey()` on invalid `?month=`).
- **`src/server/demo.ts`**:
  - Extended `seedDemoData`, `getClearSummary`, and `clearAllData` covering all F03 tables across the 12 rolling calendar months ending with `currentDate` / today.
- **`src/components/savings` & `src/components/models`**:
  - Presentational and interactive client components for `/savings` and `/models`.

---

## Data Flow

### 1. Create / Edit Savings Bucket & Toggle Buffer Inclusion
1. User clicks `+ New bucket` (or `Edit` on an existing bucket card) on `/savings`.
2. `BucketModal` opens. Selecting type `Cash Buffer` or `Emergency Fund` defaults `countsTowardBuffer` to `true`; `Goal` and `Sinking Fund` default `countsTowardBuffer` to `false` and show the optional `TARGET / DUE MONTH` (`YYYY-MM`) input. When type is `Cash Buffer`, the `DEFAULT CASH BUFFER` checkbox is available (and locks `countsTowardBuffer` to `true`). When editing the current default bucket (`isDefault = true`), `TYPE`, `DEFAULT CASH BUFFER`, and `COUNTS TOWARD BUFFER` are locked in the UI with helper text explaining that another `Cash Buffer` bucket must be designated as default first.
3. Client validates `NAME`, `OPENING BALANCE`, and optional `TARGET AMOUNT` using domain helpers.
4. On submit, client sends `POST /api/savings/buckets` (or `PATCH /api/savings/buckets/:id`). Omitted fields remain unchanged; `""` on `targetAmount`, `targetMonth`, or `description` clears to `null`.
5. `savings-service.ts` validates uniqueness (`nameKey`), enforces default-bucket invariants (`409 invalid_state` if attempting to clear `isDefault`, change `type`, or disable `countsTowardBuffer` on the default bucket), verifies that any opening balance reduction keeps lifetime `currentBalance >= 0`, clears `is_default` on any prior default bucket if `isDefault` is true, and writes inside `database.transaction()`.
6. Clicking the `buffer` toggle switch on an active non-default bucket card sends `PATCH /api/savings/buckets/:id` with `{ countsTowardBuffer: "true" | "false" }`.
7. On `2xx`, client shows a toast and calls `router.refresh()`, recomputing lifetime `HELD IN BUCKETS`, `SAVINGS BUFFER`, and `RUNWAY`.

### 2. Record, Edit, & Delete Savings Activity (Contribution / Withdrawal)
1. User clicks `Contribute` or `Withdraw` on an active bucket card. `ActivityModal` opens with bucket and operation kind preselected, `AMOUNT (PHP)` focused, and `DATE` set to today via the Monday-first `CalendarPopover` (with dates `> today` disabled).
2. Client checks `parseAndValidateAmount`, `validateActivityDate` (`date <= today`), and verifies that a withdrawal does not exceed the bucket's lifetime current balance (`"Bucket balance cannot be negative."`). Save is disabled while a request is in-flight to prevent double-submission.
3. On submit, client sends `POST /api/savings/activities`.
4. `savings-service.ts` verifies the bucket is active (`409 archived` if archived), validates `date <= today`, recomputes the bucket's lifetime balance inside a transaction, rejects if `< 0`, and inserts the row into `savings_activities`.
5. Clicking `History` on a bucket card opens `BucketHistoryModal`, listing all contributions (`+` in status green) and withdrawals (`−` in ink) newest-first (`date DESC, created_at DESC, id ASC`). On active buckets, rows expose `✎` edit and `✕` delete (via `ConfirmDialog`); on archived buckets, the history modal is strictly read-only. Both `PATCH /api/savings/activities/:id` and `DELETE /api/savings/activities/:id` verify that the bucket is active (`409 archived` if archived) and that the resulting lifetime bucket balance remains `>= 0`.
6. No F02 `entries` rows are ever created, modified, or deleted.

### 3. Two-Mode `/models` Workspace: Month's Plan vs. Reusable Model Editing
1. User opens `/models` (with `?month=YYYY-MM` validated via `isValidMonthKey`, defaulting to `currentMonthKey()`).
2. The left column (`ModelList`) renders:
   - **Top card — Selected Month's Applied Plan**: selectable card for `<Mon YYYY> plan` (with `ACTIVE` badge, source model name, `"revised"` indicator when `isRevised === true`, `₱X exp · ₱Y sav`, and `unallocated ₱Z/mo`), or a muted `"No plan applied for <Mon YYYY>"` card when `appliedPlan === null`. Selected by default when `appliedPlan !== null`.
   - **Reusable Models list**: selectable cards for each reusable `BudgetModel` (`name`, `ACTIVE` / `REVISED` / `DIVERGED` badge when `appliedPlan?.sourceModelId === model.id`, `₱X exp · ₱Y sav`, `unallocated ₱Z/mo`) and `+ New model`.
3. **Editing `BUDGET / MO` cells**:
   - Typing a valid non-negative number in any `BUDGET / MO` input immediately recalculates `calculateBudgetSummary`, `calculateExpenseMixStops`, `calculateBudgetComparisonRows`, and `calculateDivergingBars` in memory (`<10ms`), updating `"Where the income goes"`, the donut, the diverging chart, group header totals, row `Δ`, and the `Unallocated` footer (`planned`, `actual`, `Δ`).
   - Blurring the input or pressing `Enter` commits the change if the centavo value changed:
     - When the **Month's Plan card** is selected (`selectedView.kind === "plan"`): sends `PATCH /api/monthly-plans/:monthKey` (setting `is_revised = 1`). For past months (`month < currentMonth`), `BUDGET / MO` inputs are locked until the user clicks `"Unlock to revise past plan"` and confirms in a `ConfirmDialog`.
     - When a **Reusable Model card** is selected (`selectedView.kind === "model"`): sends `PATCH /api/models/:id`, updating `budget_model_allocations` without touching any `monthly_budget_plans`.
   - Pressing `Escape` reverts the cell's draft text to its last persisted value. Invalid inputs highlight the cell in red without sending a request.
4. **Applying or Re-applying a Model (`Make active` / `Re-apply`)**:
   - First-time `Make active` on a current/future month (`month >= currentMonth`) with `appliedPlan === null` immediately sends `POST /api/models/:id/apply` with `{ monthKey }`.
   - Overwriting an existing plan (`appliedPlan !== null`, whether via `Make active` on a different model or `Re-apply` on a diverged/revised source model) or applying to a past month (`month < currentMonth`) opens a `ConfirmDialog` first.
   - `applyBudgetModelToMonth` copies only **active** categories and **active** buckets from the reusable model into `monthly_budget_plans` + `monthly_budget_allocations` (`is_revised = 0`), skipping any archived lines.

### 4. Category Merge & Entity Archive Historical Flow
1. When a user merges Category `S` into Category `D` on `/categories`, `mergeCategory` in `src/server/categories-service.ts` atomically sums `S`'s allocation into `D`'s allocation in `budget_model_allocations` (reusable models) while leaving `monthly_budget_allocations` (historical monthly plans) unchanged.
2. When viewing a historical `MonthlyBudgetPlan` after Category `S` was merged into `D` (or chained `S → D → T` via `mergedIntoCategoryId`, with `getModelsView` loading the full transitive `mergedIntoCategoryId` closure including archived zero-allocation/zero-actual targets), `calculateBudgetComparisonRows` folds `S`'s stored snapshot planned amount into `T`'s effective planned amount (`plannedCentavos = rawPlanned_T + sum(rawPlanned_S)`) so `T`'s B-vs-A comparison against `T`'s actual spending (which includes `S`'s moved/repointed entries) is accurate without false surpluses or deficits, while `T`'s `BUDGET / MO` input displays and edits `T`'s own stored allocation (`rawPlanned_T`) with a subtitle showing the combined effective budget (`"₱X effective (+₱Y from S)"`) and `"<S.name> (merged → <T.name>)"` is rendered as a read-only reference row excluded from group/summary sums.
3. When a category or savings bucket is archived, historical monthly plans on `/models` continue to display the archived entity with an `(archived)` marker and include its stored snapshot allocation in that month's table totals (whereas `/savings` KPI cards count active buckets only), while reusable models keep any non-zero archived line visible with `(archived)` (counting toward model totals) until the user zeroes it out (`0`).

---

## Phases

Every phase ends with `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build` passing.

### Phase 01: Persistence (Migration 3) & Pure Domain Core
- **Goals**: Add Migration 3 (`savings_buckets`, `savings_activities`, `budget_models`, `budget_model_allocations`, `monthly_budget_plans`, `monthly_budget_allocations`) and pure domain types, shared month helpers, validators, and calculations for savings and budgets.
- **Tasks**:
  - Extend `src/domain/amount.ts` with `parseAndValidateNonNegativeAmount` and `parseOptionalPositiveAmount`.
  - Create `src/domain/month.ts` (`isValidMonthKey`, `currentMonthKey`) and update `src/server/entries-read.ts` to use it.
  - Create `src/domain/savings.ts` and `src/domain/savings-calculations.ts`.
  - Create `src/domain/budget.ts` and `src/domain/budget-calculations.ts`.
  - Export new domain symbols from `src/domain/index.ts`.
  - Update `src/server/db/migrations.ts` with Migration 3 (`version: 3`).
  - Add unit and migration tests: `tests/domain/amount.test.ts`, `tests/domain/savings-calculations.test.ts`, `tests/domain/budget-calculations.test.ts`, and `tests/server/migrations.test.ts`.

### Phase 02: Savings Store, Service, Read Helper, & API Endpoints
- **Goals**: Implement transactional persistence, non-negative lifetime balance enforcement, `date <= today` validation, default bucket invariants, read-only archived bucket enforcement (including on activity `DELETE`), server read model, and HTTP route handlers for `/savings`.
- **Tasks**:
  - Create `src/server/savings-store.ts` and `src/server/savings-service.ts`.
  - Create `src/server/savings-read.ts` (`getSavingsView`).
  - Create route handlers:
    - `src/app/api/savings/buckets/route.ts` (`POST`)
    - `src/app/api/savings/buckets/[id]/route.ts` (`PATCH`)
    - `src/app/api/savings/buckets/[id]/archive/route.ts` (`POST`)
    - `src/app/api/savings/buckets/[id]/restore/route.ts` (`POST`)
    - `src/app/api/savings/activities/route.ts` (`POST`)
    - `src/app/api/savings/activities/[id]/route.ts` (`PATCH`, `DELETE`)
  - Add integration and API tests: `tests/server/savings-service.test.ts` and `tests/api/savings.test.ts`.

### Phase 03: Budget Models Store, Service, Read Helper, Category Merge Integration, & API Endpoints
- **Goals**: Implement reusable budget models, monthly budget plan snapshots (skipping archived entities on apply), atomic category-merge allocation combination, post-merge historical comparison folding, server read model, and HTTP route handlers for `/models`.
- **Tasks**:
  - Create `src/server/models-store.ts` and `src/server/models-service.ts`.
  - Update `mergeCategory` in `src/server/categories-service.ts` to combine reusable model allocations for merged categories inside the same transaction while leaving `monthly_budget_allocations` untouched.
  - Create `src/server/models-read.ts` (`getModelsView`) and connect `getSavingsView` to `findMonthlyBudgetPlan`.
  - Create route handlers:
    - `src/app/api/models/route.ts` (`POST`)
    - `src/app/api/models/[id]/route.ts` (`PATCH`, `DELETE`)
    - `src/app/api/models/[id]/duplicate/route.ts` (`POST`)
    - `src/app/api/models/[id]/apply/route.ts` (`POST`)
    - `src/app/api/monthly-plans/[monthKey]/route.ts` (`PATCH`)
  - Add integration and API tests: `tests/server/models-service.test.ts` and `tests/api/models.test.ts`.

### Phase 04: Savings Buckets Screen (`/savings`) & Modals
- **Goals**: Build the hi-fi `/savings` workspace, KPI row, bucket cards, Create/Edit Bucket modal, Contribute/Withdraw modal, Bucket History modal, and collapsible Archived section.
- **Tasks**:
  - Create `src/app/(shell)/savings/loading.tsx` and `src/app/(shell)/savings/error.tsx`.
  - Update `src/app/(shell)/savings/page.tsx` to read `searchParams.month` and call `getSavingsView(month)`.
  - Create `src/components/savings/savings-header.tsx`, `savings-kpi-row.tsx`, `bucket-card.tsx`, `bucket-modal.tsx`, `activity-modal.tsx`, `bucket-history-modal.tsx`, `archived-buckets.tsx`, and `savings-screen.tsx`.
  - Add component tests in `tests/components/savings/savings-screen.test.tsx` and `tests/components/savings/savings-modals.test.tsx`.

### Phase 05: Budget Models Screen (`/models`), Charts, & Collapsible Allocation Table
- **Goals**: Build the hi-fi `/models` workspace, two-mode left rail (Month's Plan card + Reusable Model cards), overwrite/past-month confirmations, `"Where the income goes"` stacked bar, `"Expense breakdown"` conic donut, `"Budget vs actual (Δ)"` diverging bar chart, collapsible Income/Expenses/Savings groups with `Unallocated` footer (`planned`, `actual`, `Δ`), and `ModelModal`.
- **Tasks**:
  - Create `src/app/(shell)/models/loading.tsx` and `src/app/(shell)/models/error.tsx`.
  - Update `src/app/(shell)/models/page.tsx` to read `searchParams.month` and call `getModelsView(month)`.
  - Create `src/components/models/models-header.tsx`, `model-list.tsx`, `income-allocation-bar.tsx`, `expense-breakdown-donut.tsx`, `budget-vs-actual-chart.tsx`, `models-table.tsx`, `model-modal.tsx`, and `models-screen.tsx`.
  - Add component tests in `tests/components/models/models-screen.test.tsx` and `tests/components/models/models-table.test.tsx`.

### Phase 06: Deterministic Demo Seed & Guarded Clear Extension
- **Goals**: Extend `src/server/demo.ts` to seed and clear F03 buckets, savings contributions (`${month}-01`), reusable models, and monthly applied plans across the 12 rolling calendar months from `scripts/seed.json`.
- **Tasks**:
  - Update `src/server/demo.ts` (`getClearSummary`, `clearAllData`, `seedDemoData`) and `scripts/clear.ts` / `scripts/seed.ts` output formatting.
  - Extend `tests/server/seed-clear.test.ts` to verify F03 seeding, determinism, non-empty refusal across F03 tables, and full wipe.

### Phase 07: Release Prep & Documentation
- **Goals**: Update version (`3.2.0`), changelog, roadmap, repo map, and release documentation tests.
- **Tasks**:
  - Bump version to `3.2.0` in `package.json` and `package-lock.json`.
  - Update `CHANGELOG.md`, `docs/feature_roadmap.md` (linking `features/v3-003-budget-and-savings.md` and marking `✓ Complete`), `docs/REPO_MAP.md`, `README.md`, and `tests/release-docs.test.ts` (including `specs/v3-003-budget-and-savings/quickstart.md`).

### Phase 08: Browser Smoke Test & Visual Review
- **Goals**: End-to-end verification of US1–US8 and visual check against `Money Tracker Hi-Fi.dc.html`.
- **Tasks**:
  - Walk `quickstart.md` User Stories 1 through 8 Independent Tests in a real browser.
  - Verify server restart persistence, keyboard navigation, contrast (>= 4.5:1), and zero horizontal scroll at 1100px, 1280px, and 1440px.
  - Record final visual review status in `specs/v3-003-budget-and-savings/deviations.md`.

---

## Validation Approach

| Layer | Environment | What is proven |
|---|---|---|
| **Domain Unit** | `node` | Non-negative and optional positive centavo parsing; `isValidMonthKey` and `currentMonthKey`; lifetime bucket balance, deterministic `Math.floor` target progress, remaining, buffer, `0.1` runway math, gross monthly funding, and per-bucket shortfall sum; non-negative balance and `date <= today` guards; budget totals, planned/actual/`Δ` unallocated, stacked bar percentages, conic donut stops, favourable-positive `Δ` (amber for savings shortfalls), and transitive post-merge category folding without double-counting. |
| **Migrations** | `node`, temp SQLite | Migration 3 executes cleanly over an existing F01+F02 database without data loss; FK constraints, `CHECK` constraints (including `GLOB` digit-shape checks on `date`, `target_month`, `month_key`), and partial unique indexes enforced. Real calendar validity (`01..12` months, leap years, `date <= today`) is verified in domain/service/API tests. |
| **Store & Service** | `node`, `:memory:` | Bucket CRUD, default flag transfer and lock invariants, archive/restore guards; activity CRUD, `date <= today`, `409 archived` on create/edit/delete for archived buckets, and rejection of negative balances on withdraw/edit/delete; model CRUD, duplicate, delete without losing monthly snapshots; applying (skipping archived entities) and revising monthly plans; atomic category merge combining reusable model allocations while preserving historical monthly plans and folding post-merge B-vs-A comparisons with real actuals. |
| **API Handlers** | `node` | JSON body validation, unknown field rejection, `PATCH` omitted vs `""` clear semantics, and `DomainError` mapping to `400`/`404`/`409`/`500` across `/api/savings/**`, `/api/models/**`, and `/api/monthly-plans/**`. |
| **Components** | `jsdom` + RTL | `/savings` KPIs (`"no plan for <Mon>"`, `"on plan"`, `"₱X short"`, `—` runway), bucket cards, locked default buffer toggle, create/edit/contribute/withdraw/history modals, double-submit prevention, two-tab `404` recovery, archived section; `/models` Month's Plan card vs Reusable Model cards, `Make active` / `Re-apply` / past-month confirmations, stacked bar, donut, diverging chart, collapsible umbrella groups, `<10ms` live typing + `blur`/`Enter` save (`Escape` revert), `Unallocated` footer `planned`/`actual`/`Δ`, and `(archived)` / `(merged → Target)` row display. |
| **Demo Module** | `node`, temp SQLite | `seedDemoData` seeds 4 buckets, 12 rolling months of `${month}-01` contributions, 3 models, and 12 monthly plans; refuses on non-empty F03 tables; `clearAllData` wipes all 10 user tables in FK-safe order. |
| **Browser Smoke & Visual** | Real browser (1100–1440px) | US1–US8 Independent Tests walked step-by-step; visual comparison against `Money Tracker Hi-Fi.dc.html` recorded in `deviations.md`. |

---

## Risks and Tradeoffs

| Risk / Tradeoff | Mitigation |
|---|---|
| **Negative bucket balance via historical edit or opening balance reduction** | `savings-service.ts` recomputes lifetime bucket balance (`openingBalance + sum(all contributions) - sum(all withdrawals)`) inside `database.transaction()` on every activity create/edit/delete and bucket update, rolling back and throwing `DomainError("validation")` if `< 0`. |
| **Editing a reusable model vs. revising a month's applied plan on `/models`** | The `/models` left rail places the selected month's applied plan in its own selectable top card above the reusable model cards. Selecting the Month's Plan card edits the month's snapshot (`PATCH /api/monthly-plans/:monthKey`); selecting a Reusable Model card edits the template (`PATCH /api/models/:id`). Overwriting an existing monthly plan or revising a past month requires confirmation via `ConfirmDialog`. |
| **False surplus/deficit on historical plans after a category merge** | `mergeCategory` leaves `monthly_budget_allocations` untouched, `getModelsView` loads the transitive `mergedIntoCategoryId` closure (`S → D → T`), and `calculateBudgetComparisonRows` folds `S`'s stored snapshot planned amount into `T`'s effective `plannedCentavos` for B-vs-A comparison while `T`'s `BUDGET / MO` input edits `T`'s own stored `rawPlannedCentavos` (with the combined effective budget shown as a subtitle) and `S (merged → T)` renders as a read-only reference row excluded from group/summary sums. |
| **RUNWAY denominator during a partially elapsed current month** | Per user decision (C7) and the hi-fi prototype (`HF#L829, L1075`), `RUNWAY` divides `SAVINGS BUFFER` by the selected month's actual household expenses (`"N.N mo"`, or `"—"` when expenses are `0`). This behavior is explicitly accepted and documented. |
| **Ambiguous budget variance phrasing** | Variance `Δ` is strictly favourable-positive (`Planned − Actual` for expenses; `Actual − Planned` for income and savings), savings shortfalls use amber (`#b9822c`), and UI copy uses `"overspent"`, `"underspent"`, `"remaining"`, or `"short"`—never `"over budget"` or `"under budget"`. |

---

## Project Structure

### Documentation (this feature)

```text
specs/v3-003-budget-and-savings/
├── spec.md                     # Approved specification
├── plan.md                     # Implementation plan (this file)
├── research.md                 # Technical research and decisions
├── data-model.md               # SQLite Migration 3 schema & domain models
├── deviations.md               # Visual and behavioral deviation ledger (D1–D11)
├── contracts/
│   └── api.md                  # HTTP API & server-only read contracts
├── quickstart.md               # Smoke testing & verification guide
└── checklists/
    └── plan-review.md          # Pre-implementation review gate
```

### Source Code (target layout)

```text
src/
├── app/
│   ├── (shell)/
│   │   ├── savings/
│   │   │   ├── page.tsx        # Functional Savings buckets screen (Server Component)
│   │   │   ├── loading.tsx     # Skeleton loading state
│   │   │   └── error.tsx       # Error boundary fallback
│   │   └── models/
│   │       ├── page.tsx        # Functional Budget models screen (Server Component)
│   │       ├── loading.tsx     # Skeleton loading state
│   │       └── error.tsx       # Error boundary fallback
│   └── api/
│       ├── savings/
│       │   ├── buckets/
│       │   │   ├── route.ts                    # POST /api/savings/buckets
│       │   │   └── [id]/
│       │   │       ├── route.ts                # PATCH /api/savings/buckets/:id
│       │   │       ├── archive/route.ts        # POST /api/savings/buckets/:id/archive
│       │   │       └── restore/route.ts        # POST /api/savings/buckets/:id/restore
│       │   └── activities/
│       │       ├── route.ts                    # POST /api/savings/activities
│       │       └── [id]/route.ts               # PATCH, DELETE /api/savings/activities/:id
│       ├── models/
│       │   ├── route.ts                        # POST /api/models
│       │   └── [id]/
│       │       ├── route.ts                    # PATCH, DELETE /api/models/:id
│       │       ├── duplicate/route.ts          # POST /api/models/:id/duplicate
│       │       └── apply/route.ts              # POST /api/models/:id/apply
│       └── monthly-plans/
│           └── [monthKey]/route.ts             # PATCH /api/monthly-plans/:monthKey
├── domain/
│   ├── amount.ts               # Extended with non-negative & optional positive parsers
│   ├── month.ts                # Shared isValidMonthKey & currentMonthKey helpers
│   ├── savings.ts              # SavingsBucket, SavingsActivity, validators
│   ├── savings-calculations.ts # Lifetime balance, Math.floor progress, buffer, runway, gross monthly funded math
│   ├── budget.ts               # BudgetModel, MonthlyBudgetPlan, BudgetAllocationLine, divergence check
│   ├── budget-calculations.ts  # Expected income, planned/actual/Δ unallocated, stacked bar, donut, post-merge Δ math
│   └── index.ts                # Barrel exports updated
├── server/
│   ├── db/
│   │   └── migrations.ts       # Migration 3 (F03 tables & indexes)
│   ├── demo.ts                 # Extended with F03 buckets, activities, models, monthly plans
│   ├── entries-read.ts         # Updated to import isValidMonthKey & currentMonthKey from @/domain/month
│   ├── categories-service.ts   # Extended mergeCategory to combine reusable model allocations
│   ├── savings-store.ts        # SQLite statements for buckets & savings activities
│   ├── savings-service.ts      # Transactional use cases for buckets & savings activities
│   ├── savings-read.ts         # getSavingsView(monthKey)
│   ├── models-store.ts         # SQLite statements for models, monthly plans, & allocations
│   ├── models-service.ts       # Transactional use cases for models & monthly plans
│   └── models-read.ts          # getModelsView(monthKey)
└── components/
    ├── savings/
    │   ├── savings-screen.tsx
    │   ├── savings-header.tsx
    │   ├── savings-kpi-row.tsx
    │   ├── bucket-card.tsx
    │   ├── bucket-modal.tsx
    │   ├── activity-modal.tsx
    │   ├── bucket-history-modal.tsx
    │   └── archived-buckets.tsx
    └── models/
        ├── models-screen.tsx
        ├── models-header.tsx
        ├── model-list.tsx
        ├── income-allocation-bar.tsx
        ├── expense-breakdown-donut.tsx
        ├── budget-vs-actual-chart.tsx
        ├── models-table.tsx
        └── model-modal.tsx
```

---

## Affected Areas

### Files/Components Likely to be Inspected
- `src/server/db/database.ts`: inspect SQLite connection singleton and pragma setup.
- `src/server/db/migrations.ts`: inspect Migrations 1 and 2 before adding Migration 3.
- `src/server/http.ts`: inspect `readBody` and `errorResponse` error code mappings.
- `src/server/entries-store.ts` & `src/server/categories-store.ts`: inspect query patterns for monthly entries and categories.
- `src/components/entries/popovers/calendar-popover.tsx`: inspect Monday-first calendar popover for reuse in `activity-modal.tsx`.
- `src/components/ui/confirm-dialog.tsx`, `src/components/ui/toast.tsx`, `src/components/ui/use-mutation.ts`, `src/components/shell/month-picker.tsx`: inspect shared UI primitives.
- `scripts/seed.json` & `handoff/celia_v3_001.zip`: inspect prototype layout and demo seed structures.

### Files/Components Likely to be Modified
- `src/domain/amount.ts`: add `parseAndValidateNonNegativeAmount` and `parseOptionalPositiveAmount`.
- `src/domain/index.ts`: export F03 domain types, validators, and calculation helpers.
- `src/server/entries-read.ts`: replace local `validMonth` / `currentMonth` with `isValidMonthKey` / `currentMonthKey` from `@/domain/month`.
- `src/server/db/migrations.ts`: add Migration 3 (`savings_buckets`, `savings_activities`, `budget_models`, `budget_model_allocations`, `monthly_budget_plans`, `monthly_budget_allocations`).
- `src/server/categories-service.ts`: update `mergeCategory` to atomically combine reusable budget model allocations from source category into target category.
- `src/server/demo.ts`: extend `getClearSummary`, `clearAllData`, and `seedDemoData` to include F03 tables.
- `scripts/seed.ts` & `scripts/clear.ts`: include F03 table counts in CLI console output.
- `src/app/(shell)/savings/page.tsx`: replace placeholder with Server Component calling `getSavingsView`.
- `src/app/(shell)/models/page.tsx`: replace placeholder with Server Component calling `getModelsView`.
- `package.json`, `package-lock.json`, `CHANGELOG.md`, `docs/feature_roadmap.md`, `docs/REPO_MAP.md`, `README.md`: Phase 07 release prep updates.

### Files/Components to be Added
- `src/domain/month.ts`
- `src/domain/savings.ts`
- `src/domain/savings-calculations.ts`
- `src/domain/budget.ts`
- `src/domain/budget-calculations.ts`
- `src/server/savings-store.ts`
- `src/server/savings-service.ts`
- `src/server/savings-read.ts`
- `src/server/models-store.ts`
- `src/server/models-service.ts`
- `src/server/models-read.ts`
- `src/app/(shell)/savings/loading.tsx`
- `src/app/(shell)/savings/error.tsx`
- `src/app/(shell)/models/loading.tsx`
- `src/app/(shell)/models/error.tsx`
- `src/app/api/savings/buckets/route.ts`
- `src/app/api/savings/buckets/[id]/route.ts`
- `src/app/api/savings/buckets/[id]/archive/route.ts`
- `src/app/api/savings/buckets/[id]/restore/route.ts`
- `src/app/api/savings/activities/route.ts`
- `src/app/api/savings/activities/[id]/route.ts`
- `src/app/api/models/route.ts`
- `src/app/api/models/[id]/route.ts`
- `src/app/api/models/[id]/duplicate/route.ts`
- `src/app/api/models/[id]/apply/route.ts`
- `src/app/api/monthly-plans/[monthKey]/route.ts`
- `src/components/savings/savings-screen.tsx`
- `src/components/savings/savings-header.tsx`
- `src/components/savings/savings-kpi-row.tsx`
- `src/components/savings/bucket-card.tsx`
- `src/components/savings/bucket-modal.tsx`
- `src/components/savings/activity-modal.tsx`
- `src/components/savings/bucket-history-modal.tsx`
- `src/components/savings/archived-buckets.tsx`
- `src/components/models/models-screen.tsx`
- `src/components/models/models-header.tsx`
- `src/components/models/model-list.tsx`
- `src/components/models/income-allocation-bar.tsx`
- `src/components/models/expense-breakdown-donut.tsx`
- `src/components/models/budget-vs-actual-chart.tsx`
- `src/components/models/models-table.tsx`
- `src/components/models/model-modal.tsx`

### Tests Likely to be Added or Updated
- `tests/domain/amount.test.ts` (updated for non-negative and optional positive parsing)
- `tests/domain/savings-calculations.test.ts` (added)
- `tests/domain/budget-calculations.test.ts` (added)
- `tests/server/migrations.test.ts` (updated for Migration 3)
- `tests/server/savings-service.test.ts` (added)
- `tests/server/models-service.test.ts` (added)
- `tests/server/seed-clear.test.ts` (updated for F03 seed and clear)
- `tests/api/savings.test.ts` (added)
- `tests/api/models.test.ts` (added)
- `tests/components/savings/savings-screen.test.tsx` (added)
- `tests/components/savings/savings-modals.test.tsx` (added)
- `tests/components/models/models-screen.test.tsx` (added)
- `tests/components/models/models-table.test.tsx` (added)
- `tests/release-docs.test.ts` (updated to include `specs/v3-003-budget-and-savings/quickstart.md` and version `3.2.0`)

### Areas Explicitly Out of Scope
- Dashboard (`/`) and Forecaster (`/forecaster`) screens (deferred to F04 and F05).
- Deferred cross-screen placeholders on `/entries` (modal budget preview strip), `/categories` (category detail spend panel, burn gauge, item month totals, and Merge/Archive dialog model-impact sections), and `/household` (`Active model` line and member financial panels) — all explicitly deferred to F04 per Spec Clarification #1.
- Automatic sweeping of monthly unallocated income into the Cash Buffer bucket balance.
- Automatic sinking-fund `"annual cost ÷ months"` calculation from `product-decisions.md:13`.
- Automatic budget rollover between calendar months, or multi-version revision history per single month.
- Member-specific ownership of savings buckets or budget models (both are household-level in F03).
- Negative savings bucket balances or future-dated savings activity (`date > today`).
- Recurring or scheduled savings transfers, bank sync, CSV import/export, multi-currency, or mobile layouts (`<1100px`).

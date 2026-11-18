# Tasks: F05 — Forecaster

**Inputs**: [spec.md](spec.md) · [plan.md](plan.md) · [data-model.md](data-model.md) · [contracts/api.md](contracts/api.md) · [research.md](research.md) · [quickstart.md](quickstart.md) · [deviations.md](deviations.md) · [checklists/plan-review.md](checklists/plan-review.md)

## Conventions

- **Status**: `[x]` done · `[ ]` pending · `[~]` skipped
- **`[P]`**: can run in parallel with other `[P]` tasks in the same phase (different files, no shared edits).
- **`[USn]`**: the spec user story a task serves (`US1`–`US6`).
- **Phase dependencies**: `01 → 02 → 03 → 04 → 05 → 06 → 07 → 08`.
- **Commands**: `npm run test` (which executes `vitest run`) and `npm run lint`.
- **Phase gate**: Every phase ends with `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build` green. Nothing is left broken at a phase boundary.
- **Server tests** start with the docblock `// @vitest-environment node`. The global default is `jsdom`.
- **Constitution test areas mapped to Celia F05**:
  - *Status transitions*: Baseline vs alternative scenario selection; 3-tier verdict transitions (`Comfortable` $\rightarrow$ `Tight but doable` $\rightarrow$ `Risky buffer`) based on cash flow and runway thresholds; empty state transitions when no budget plan is applied for the current month (`No budget applied for {Month YYYY}.`).
  - *Required fields*: Strict non-nullable entity definitions (`name`, `shortLabel`, `color`, `type`, `startMonth`); exact minor units (`Centavos` integer $\ge 0$ for monetary quantities); integer validation checks `typeof(...) = 'integer'`; signed integer `deltaAmount` for nudges.
  - *URL validation*: Scenario query parameter handling (`?scenario=<id>`) accepting UUIDs or stable IDs (`baseline`, `a`, `b`, `c`), with fallback to the baseline scenario on missing or invalid ID.
  - *Date handling*: Dynamic 24-month horizon calculation anchoring cleanly on the active calendar month ($M_0$ to $M_{23}$); 4 milestone label calculations ($M_0$, $M_6$, $M_{12}$, $M_{23}$) formatted as `MMM YYYY`.

### Design reference aliases

The handoff zip is `handoff/celia_v3_001.zip`, root folder `design_handoff_money_tracker/`:
- `HF`: `reference/Money Tracker Hi-Fi.dc.html` (Forecaster screen lines 396–491, state lines 650–678, logic lines 1182–1247).
- `PD`: `reference/product-decisions.md` (Forecaster decisions lines 20–26).
- `SEED`: `data/seed.json`.

---

## Phase Summary Table

| Phase | Focus | Tasks | User Stories |
|---|---|---|---|
| **01** | Pure Domain Core & Forecaster Calculations | `T001–T006` | US1, US2, US3 |
| **02** | Database Schema (Migration 4), Store, Service, Categories Merge & Demo Tooling | `T007–T011` | US1–US6 |
| **03** | Server Read Model & API Route Handlers | `T012–T016` | US1–US5 |
| **04** | Hi-Fi Output UI Components (Hero Cards, 24-Month Chart, Comparison Table) | `T017–T019` | US1, US2, US6 |
| **05** | Hi-Fi Input UI Components (Scenario Chips, What Changes, Budget Nudges) | `T020–T022` | US2, US3, US4 |
| **06** | Modals, Interactivity, Page Assembly, & Component Tests | `T023–T027` | US1–US6 |
| **07** | Release Prep | `T028–T032` | — |
| **08** | Browser Smoke Test & Visual Review | `T033–T039` | US1–US6 |

---

## Phase 01 — Pure Domain Core & Forecaster Calculations

Order: View Model Types → Pure Calculation Helpers → Comprehensive Unit Test Suite.

- [ ] **T001 [P] [US1–US6] Create forecaster domain interfaces and types**
  - Files: `src/domain/forecaster.ts` (new).
  - Expected behavior:
    - Declare TypeScript types per `data-model.md §1`: `ScenarioEventType` (`"financed purchase" | "recurring" | "seasonal"`), `ForecastVerdictTier`, `ForecastStatusTone`, `ForecastVerdict` (`tier`, `statusTone` only; zero hex colors), `PaletteKey` (`"teal" | "purple" | "gold" | "blue" | "slate"`), `Scenario` (`startMonth` 0..23, `drawAmount` integer centavos, `paletteKey: PaletteKey | null`), `ScenarioEvent` (`monthlyAmount > 0`, `description: string | null`), `ScenarioNudge` (`deltaAmount: Centavos` signed integer centavos; no `adjustedAmount` or `freedAmount`), `ScenarioNudgeDerived`, `ScenarioWithRelations`, `BaselineMetrics` (`modelName` from plan, `planId: string | null`), `ScenarioMetrics`, `OutlookBar` (flat unallocated, `heightRatioInContainer: number`, `isNegative: boolean`), `OutlookPolyline` (normalized points $(x, y) \in [0, 1] \times [0, 1]$), `OutlookData` (`milestones: { index: number; monthKey: string }[]`), and `ForecasterViewData`.
    - Monetary quantities use strict integer minor units (`Centavos`).
    - Zero server-only module imports (`@/server/*`). All imports strictly from `@/domain/*`.
  - Constraints: pure TypeScript types; exact centavo type adherence; strict nullability.
  - Validation: `npm run typecheck`.

- [ ] **T002 [P] [US1, US2] Implement 3-tier verdict matrix calculation**
  - Files: `src/domain/forecaster-calculations.ts` (new).
  - Expected behavior:
    - Implement `calculateVerdict(runway: number | null, monthlyUnallocated: Centavos): ForecastVerdict`:
      - Evaluates pre-rounded runway $R_S$ and net cash flow $U_S$:
      - When `runway === null` (zero monthly expenses with positive buffer):
        - `monthlyUnallocated >= 0`: returns `{ tier: "Comfortable", statusTone: "favourable" }`.
        - `monthlyUnallocated < 0`: returns `{ tier: "Risky buffer", statusTone: "critical" }`.
      - When `runway <= 0.0` (overdrawn or zero buffer):
        - returns `{ tier: "Risky buffer", statusTone: "critical" }`.
      - When `monthlyUnallocated < 0`:
        - `runway >= 6.0`: returns `{ tier: "Tight but doable", statusTone: "warning" }`.
        - `runway < 6.0`: returns `{ tier: "Risky buffer", statusTone: "critical" }`.
      - When `monthlyUnallocated >= 0`:
        - `runway >= 6.0`: returns `{ tier: "Comfortable", statusTone: "favourable" }`.
        - `3.0 <= runway < 6.0`: returns `{ tier: "Tight but doable", statusTone: "warning" }`.
        - `runway < 3.0`: returns `{ tier: "Risky buffer", statusTone: "critical" }`.
  - Constraints: pure numerical/enum output; zero UI formatting; zero hex colors in domain layer.
  - Validation: `tests/domain/forecaster-calculations.test.ts`.

- [ ] **T003 [P] [US1, US2] Implement scenario metrics calculation with overdrawn buffer priority**
  - Files: `src/domain/forecaster-calculations.ts`.
  - Expected behavior:
    - Implement `calculateScenarioMetrics(baseline: BaselineMetrics, scenario: ScenarioWithRelations): ScenarioMetrics`:
      - `totalEventMonthly = sum(e.monthlyAmount)` across scenario events ($e.\text{monthlyAmount} > 0$).
      - `totalExpenseNudgeFreed = sum(n.freedAmount)` across expense-category nudges only.
      - `totalSavingsNudgeFreed = sum(n.freedAmount)` across savings-bucket nudges.
      - `monthlyExpense = baseline.monthlyExpense + totalEventMonthly - totalExpenseNudgeFreed` (Savings nudges do NOT alter monthly expenses per Constitution IV).
      - `monthlyUnallocated = baseline.monthlyUnallocated - totalEventMonthly + totalExpenseNudgeFreed + totalSavingsNudgeFreed`.
      - `drawnFromBuffer = scenario.drawAmount`.
      - `bufferAfter = baseline.startingBuffer - scenario.drawAmount`.
      - **Overdrawn buffer priority rule**:
        - If `bufferAfter <= 0`: `runwayMonths = 0.0` (overdrawn buffer always wins, never negative).
        - Else if `monthlyExpense === 0`: `runwayMonths = null`.
        - Else: `runwayMonths = Math.round((bufferAfter * 10) / monthlyExpense) / 10`.
      - `verdict = calculateVerdict(runwayMonths, monthlyUnallocated)`.
  - Constraints: division-by-zero protection (`monthlyExpense === 0` with positive buffer yields `null` runway); overdrawn buffer yields `0.0 mo` and `Risky buffer`; runway rounded to 0.1 decimal place matching `calculateSavingsKpis`.
  - Validation: `tests/domain/forecaster-calculations.test.ts`.

- [ ] **T004 [P] [US1, US2] Implement 24-month outlook chart data calculation**
  - Files: `src/domain/forecaster-calculations.ts`.
  - Expected behavior:
    - Implement `calculate24MonthOutlook(baselineUnallocated: Centavos, scenarios: readonly ScenarioWithRelations[], startMonthKey: string): OutlookData`:
      - Generates 24 flat monthly bars ($i = 0..23$):
        - `monthKey` computed via calendar month addition from `startMonthKey`.
        - `unallocatedCentavos = baselineUnallocated` (flat bars; removes artificial `1 + i * 0.004` trend).
        - `isNegative = baselineUnallocated < 0`.
      - Computes vertical scaling:
        - `domainHi = Math.max(baselineUnallocated, ...scenarioLevels, 0) * 1.15`.
        - `domainLo = Math.min(0, baselineUnallocated, ...scenarioLevels) * 1.25`.
        - Special case: all values zero $\rightarrow$ `domainHi = 1, domainLo = 0`.
        - Special case: all values negative $\rightarrow$ `domainHi = 0, domainLo = min * 1.25`.
        - `span = (domainHi - domainLo) || 1`.
        - `zeroRuleRatio = domainHi / span`.
        - `heightRatioInContainer = isNegative ? Math.abs(baselineUnallocated) / (Math.abs(domainLo) || 1) : (domainHi > 0 ? baselineUnallocated / domainHi : 0)`.
      - Generates normalized polyline coordinates $(x_i, y_i) \in [0, 1] \times [0, 1]$:
        - $x_i = i / 23$.
        - Value $v_i = i < s.\text{startMonth} \ ? \ \text{baselineUnallocated} : \text{steadyStateUnallocated}$.
        - $y_i = (\text{domainHi} - v_i) / \text{span}$.
      - Generates 4 milestone labels at $i = 0, 6, 12, 23$.
  - Constraints: zero division by zero; output points strictly normalized $0..1$; handles negative baseline and all-negative/all-zero states.
  - Validation: `tests/domain/forecaster-calculations.test.ts`.

- [ ] **T005 [P] [US3] Implement budget nudge derivation and stepping helpers**
  - Files: `src/domain/forecaster-calculations.ts`.
  - Expected behavior:
    - Implement `deriveNudgeAmounts(baseAllocation: Centavos, deltaAmount: Centavos): { adjustedAllocation: Centavos; freedAmount: Centavos }`:
      - `adjustedAllocation = Math.max(0, baseAllocation + deltaAmount)`.
      - `freedAmount = baseAllocation - adjustedAllocation`.
    - Implement `stepCategoryNudge(baseAllocation: Centavos, currentAllocation: Centavos, direction: 1 | -1): NudgeStepResult`:
      - Step size: ₱500 (50,000 centavos).
      - `direction === 1` (`+` button) raises allocation (more spend, less freed): `nextAllocation = currentAllocation + 50000`.
      - `direction === -1` (`−` button) lowers allocation (less spend, more freed): `nextAllocation = Math.max(0, currentAllocation - 50000)`.
      - `nextDelta = nextAllocation - baseAllocation`.
      - `freedAmount = baseAllocation - nextAllocation`.
      - Track fill percentage: if `baseAllocation > 0` returns `clamp(2, 98, round((nextAllocation / baseAllocation) * 50) + 25)`; if `baseAllocation === 0` returns `50`.
  - Constraints: allocation cannot drop below 0; exact centavo math; `+` raises allocation.
  - Validation: `tests/domain/forecaster-calculations.test.ts`.

- [ ] **T006 [US1–US3] Add unit test suite for forecaster pure calculations**
  - Files: `tests/domain/forecaster-calculations.test.ts` (new).
  - Expected behavior:
    - Test `calculateVerdict`:
      - Boundary testing for pre-rounded runway inputs: `runway === null` (positive buffer, cash flow decides), `runway <= 0.0` (returns `"Risky buffer"`), `runway === 3.0` (`"Tight but doable"`), `runway === 5.9` (`"Tight but doable"`), `runway === 6.0` (`"Comfortable"`).
      - Net cash flow impact: negative unallocated requires `runway >= 6.0` for `"Tight but doable"`, else `"Risky buffer"`.
    - Test `calculateScenarioMetrics`:
      - Runway rounding: `2.95` rounds to `3.0`, `5.95` rounds to `6.0`.
      - Overdrawn buffer priority: `bufferAfter <= 0` yields `0.0 mo` and `"Risky buffer"` even when `monthlyExpense === 0`.
      - Zero expenses with positive buffer: `monthlyExpense === 0` and `bufferAfter > 0` yields `null` (displays `—`) and verdict from cash flow alone (`Comfortable` for $U \ge 0$, `Risky buffer` for $U < 0$).
      - Savings nudges affect ONLY unallocated, not monthly expense or runway.
      - Verifies confirmed figures on seed scenarios:
        - Baseline: Expense ₱79,000, Unallocated +₱20,500, Buffer after ₱466,000, Runway 5.9 mo, Verdict Tight but doable.
        - Scenario A: Expense ₱96,930, Unallocated −₱2,430, Buffer after ₱367,500, Runway 3.8 mo, Verdict Risky buffer.
        - Scenario B: Expense ₱100,400, Unallocated −₱900, Buffer after ₱466,000, Runway 4.6 mo, Verdict Risky buffer.
        - Scenario C: Expense ₱84,200, Unallocated +₱15,300, Buffer after −₱52,500, Runway 0.0 mo, Verdict Risky buffer.
    - Test `calculate24MonthOutlook`:
      - Verifies 24 flat baseline bars, normalized coordinates, zero rule ratio, step transition at `startMonth`, negative baseline scaling (`isNegative = true`), all-negative scaling, and all-zero scaling.
    - Test `stepCategoryNudge`:
      - `+` increases allocation and delta; `−` decreases allocation and delta; allocation clamped at $\ge 0$; base 0 fill fallback is 50%.
  - Constraints: runs in `node` environment; 100% pure math tests.
  - Validation: `npx vitest run tests/domain/forecaster-calculations.test.ts`.

---

## Phase 02 — Database Schema (Migration 4), Store, Service, Categories Merge & Demo Tooling

Order: Migration 4 → SQLite Store Queries → Categories Merge Update → Forecaster Service → Demo Tooling Update → Integration Tests.

- [ ] **T007 [P] [US1–US6] Implement SQLite Migration 4**
  - Files: `src/server/db/migrations.ts`.
  - Expected behavior:
    - Add `migrationFour: Migration` with `version: 4`:
      - `CREATE TABLE scenarios` (fields: `id`, `name` CHECK `length(name) > 0`, `short_label` CHECK `length(short_label) > 0`, `palette_key` CHECK `((is_baseline = 1 AND palette_key IS NULL) OR (is_baseline = 0 AND palette_key IS NOT NULL AND palette_key IN ('teal', 'purple', 'gold', 'blue', 'slate')))`, `start_month` CHECK `0..23 AND typeof='integer'`, `draw_amount` CHECK `draw_amount >= 0 AND typeof='integer'`, `is_baseline`, `display_order`, `created_at`, `updated_at`). Removes duplicate `color`, `tint`, `ink`, `dash` columns.
      - `CREATE UNIQUE INDEX scenarios_baseline_unique ON scenarios (is_baseline) WHERE is_baseline = 1`.
      - Automatically inserts the baseline row (`id: 'baseline'`, `name: 'Baseline'`, `short_label: 'BASELINE'`, `palette_key: NULL`, `start_month: 0`, `draw_amount: 0`, `is_baseline: 1`, `created_at = new Date().toISOString()`).
      - `CREATE TABLE scenario_events` (foreign key `scenario_id REFERENCES scenarios(id) ON DELETE CASCADE`, `name`, `type` CHECK `in ('financed purchase', 'recurring', 'seasonal')`, `monthly_amount` CHECK `monthly_amount > 0 AND typeof='integer'`, `description TEXT`, `created_at`, `updated_at`).
      - `CREATE TABLE scenario_nudges` (foreign key `scenario_id REFERENCES scenarios(id) ON DELETE CASCADE`, `target_type`, `category_id REFERENCES categories(id)`, `bucket_id REFERENCES savings_buckets(id)`, `delta_amount INTEGER NOT NULL CHECK (typeof(delta_amount) = 'integer')`, `updated_at`).
      - Plain foreign keys without `ON DELETE` for categories and buckets.
      - Unique indexes for category and bucket nudges per scenario.
    - Append `migrationFour` to `migrations` array.
  - Constraints: preserves existing migrations 1, 2, 3; runs in SQLite transaction; enforces `PRAGMA user_version = 4`; strict integer checks.
  - Validation: `tests/server/forecaster-store.test.ts`.

- [ ] **T008 [P] [US1–US6] Implement SQLite forecaster store queries and category merge integration**
  - Files: `src/server/forecaster-store.ts` (new), `src/server/categories-service.ts`.
  - Expected behavior:
    - In `src/server/forecaster-store.ts`, implement typed store functions:
      - `listScenarios(database)`: Returns all scenarios with associated events and nudges, sorted by `display_order ASC, created_at ASC`.
      - `getScenarioById(database, id)`: Returns scenario with events and nudges, or `null`. Accepts UUIDs or stable IDs (`baseline`, `a`, `b`, `c`).
      - `createScenario(database, input)`: Inserts new scenario with `palette_key`.
      - `updateScenario(database, id, updates)`: Updates scenario fields (name, short_label, start_month, draw_amount, palette_key).
      - `deleteScenario(database, id)`: Deletes scenario (cascading to events and nudges).
      - `createScenarioEvent(database, input)`: Inserts event into `scenario_events` (`monthly_amount > 0`, `description`).
      - `updateScenarioEvent(database, eventId, updates)`: Updates event name, type, monthly_amount, description.
      - `deleteScenarioEvent(database, eventId)`: Deletes event.
      - `upsertScenarioNudge(database, input)`: Inserts or replaces nudge in `scenario_nudges` with signed `delta_amount`.
      - `mergeCategoryNudges(database, sourceCategoryId, targetCategoryId, now)`: Re-points nudges from source to target category; if target already nudged, sums `delta_amount` and deletes source.
    - In `src/server/categories-service.ts`:
      - In `mergeCategories`, invoke `mergeCategoryNudges(db, sourceCategoryId, targetCategoryId, now)` inside the merge transaction.
      - Surviving category base budget folds allocations from merged-away categories using a recursive CTE (transitive merge closure).
  - Constraints: server-only (`import "server-only"`); prepared statements; integer centavos.
  - Validation: `tests/server/forecaster-store.test.ts`.

- [ ] **T009 [P] [US1–US6] Implement forecaster service business logic**
  - Files: `src/server/forecaster-service.ts` (new).
  - Expected behavior:
    - Implement service methods wrapping store functions with business validation:
      - Guards baseline: prevents renaming, updating draw amount, adding events, applying nudges, duplicating, or deleting baseline scenario. Throws `DomainError` with code `invalid_state` (HTTP 409).
      - `duplicateScenario(database, scenarioId)`: Loads non-baseline scenario, creates new scenario with `(Copy)` suffix, and clones all events and nudges with new UUIDs.
      - Validates scenario name, short label, start month ($0..23$), draw amount ($\ge 0$), positive event amounts ($> 0$), and fixed palette key mapping (`teal`, `purple`, `gold`, `blue`, `slate`).
      - Archived target guard: rejects nudges on archived categories or buckets, throwing `DomainError` with code `archived` (HTTP 409).
  - Constraints: server-only; throws typed domain errors (`ValidationError`, `NotFoundError`, `InvalidStateError`, `ArchivedError`).
  - Validation: `tests/server/forecaster-service.test.ts`.

- [ ] **T010 [P] [US1–US6] Update seed and clear demo tooling**
  - Files: `src/server/demo.ts`, `scripts/seed.json`.
  - Expected behavior:
    - In `src/server/demo.ts`:
      - Update `clearAllData` to delete from `scenario_nudges`, `scenario_events`, and delete non-baseline scenarios (`DELETE FROM scenarios WHERE is_baseline = 0`), preserving the Baseline row.
      - Update `getClearSummary` to count non-baseline scenarios only (`SELECT COUNT(*) FROM scenarios WHERE is_baseline = 0`), ensuring `seedDemoData` can run on clean database.
      - Update `seedDemoData` (requires an otherwise empty database, checking `getClearSummary` is 0): skips inserting the baseline row (Migration 4 creates it), and populates scenarios A, B, and C with stable IDs (`a`, `b`, `c`), category name key `"dining out"`, bucket `id: 'car'` (`car down payment`), and signed centavo deltas per `data-model.md §3`:
        - A: Groceries `-200000`, Dining out `-200000`, Transport `-450000`, Car down payment `500000`.
        - B: Dining out `-100000`.
        - C: Dining out `-200000`.
    - In `scripts/seed.json`: scenario definitions are rewritten to match `data-model.md §3` schema.
  - Constraints: preserves existing F01–F03 seed records; seeding requires an otherwise empty database (second run without clear fails as expected).
  - Validation: `npm run clear -- --yes && npm run seed`.

- [ ] **T011 [US1–US6] Add integration tests for forecaster store, service, and category merges**
  - Files: `tests/server/forecaster-store.test.ts` (new), `tests/server/forecaster-service.test.ts` (new).
  - Expected behavior:
    - Test Migration 4 on a populated database (Constitution IX): upgrades from version 3 to 4, inserts baseline row with ISO-8601 timestamp, verifies `PRAGMA user_version = 4`.
    - Test palette check constraint: verifies non-baseline scenario with `palette_key = NULL` is rejected by SQLite check constraint, while baseline scenario requires `palette_key IS NULL`.
    - Test integer and string check constraints: rejects empty name or short_label; rejects fractional, zero, negative amounts for events; rejects negative draw amounts; rejects fractional deltas.
    - Test baseline invariant guards: updating baseline name, draw, events, nudges, duplicating, or deleting throws `invalid_state` (409).
    - Test cascade deletion: deleting a scenario cascades to delete child events and nudges.
    - Test scenario duplication: clones scenario with all events and nudges.
    - Test category merge through the real `categories-service.ts` merge route: `mergeCategoryNudges` sums deltas when target already nudged, and re-points when target has no nudge.
    - Test archived target rejection: attempting to nudge an archived category or bucket returns 409 `archived`.
    - Test unseeded upgrade and `clearAllData`: verifies baseline row exists after wipe, and `getClearSummary` reports 0.
    - Test AC13 & AC20: forecaster operations leave `entries`, `monthly_budget_plans`, `budget_models`, and `savings_buckets` completely untouched; adjustments to one scenario do not affect others.
  - Constraints: docblock `// @vitest-environment node`; uses in-memory or temporary SQLite database.
  - Validation: `npx vitest run tests/server/forecaster-store.test.ts tests/server/forecaster-service.test.ts`.

---

## Phase 03 — Server Read Model & API Route Handlers

Order: Read Model Assembly → API Route Handlers → Integration Tests.

- [ ] **T012 [P] [US1, US2, US6] Implement server read model query assembly**
  - Files: `src/server/forecaster-read.ts` (new).
  - Expected behavior:
    - Implement `getForecasterView(selectedScenarioId?: string): Promise<ForecasterViewData>`:
      - Accepts UUIDs and stable IDs (`baseline`, `a`, `b`, `c`), defaulting to `'baseline'`.
      - Retrieves current calendar month row from `monthly_budget_plans` where `month_key = currentMonthKey()` and its allocations.
      - If no plan is applied for current month, returns `hasAppliedPlan: false` with empty state view data (`No budget applied for {Month YYYY}.`).
      - Sets baseline scenario name dynamically from plan's `model_name`.
      - Calculates starting cash buffer from active buckets (`counts_toward_buffer = 1`).
      - Transitive base budget resolution: folds merged-away category allocations into surviving category totals.
      - Loads all scenarios, events, and nudges via `forecaster-store.ts`.
      - Resolves target names and archived status for all nudged items.
      - Computes baseline metrics, selected scenario metrics, and comparison metrics.
      - Computes 24-month outlook geometry via `calculate24MonthOutlook`.
  - Constraints: single synchronous SQLite pass; performance design target < 10ms for household data; handles gap/empty states gracefully.
  - Validation: `tests/server/forecaster-read.test.ts`.

- [ ] **T013 [P] [US1, US5] Implement scenario CRUD and duplicate API routes**
  - Files: `src/app/api/scenarios/route.ts` (new), `src/app/api/scenarios/[id]/route.ts` (new), `src/app/api/scenarios/[id]/duplicate/route.ts` (new).
  - Expected behavior:
    - Accepts UUIDs and stable IDs (`baseline`, `a`, `b`, `c`) for `[id]`.
    - `GET /api/scenarios`: Returns list of all scenarios.
    - `POST /api/scenarios`: Creates a new scenario from a fixed palette key (`teal`, `purple`, `gold`, `blue`, `slate`) (`201 Created`).
    - `PATCH /api/scenarios/[id]`: Updates scenario properties (`200 OK`). Returns `409 Conflict` (`invalid_state`) if baseline.
    - `DELETE /api/scenarios/[id]`: Deletes scenario (`200 OK`). Returns `409 Conflict` (`invalid_state`) if baseline.
    - `POST /api/scenarios/[id]/duplicate`: Clones scenario (`201 Created`). Returns `409 Conflict` (`invalid_state`) if baseline.
  - Constraints: uses standard Celia error format `{ error: { code, message, field? } }` from `src/server/http.ts:72-99`.
  - Validation: `tests/api/forecaster-routes.test.ts`.

- [ ] **T014 [P] [US4] Implement scenario events API routes**
  - Files: `src/app/api/scenarios/[id]/events/route.ts` (new), `src/app/api/scenarios/[id]/events/[eventId]/route.ts` (new).
  - Expected behavior:
    - Accepts UUIDs and stable IDs for `[id]`.
    - `POST /api/scenarios/[id]/events`: Creates event for scenario (`201 Created`). Returns `409 Conflict` if baseline.
    - `PATCH /api/scenarios/[id]/events/[eventId]`: Updates event (`200 OK`).
    - `DELETE /api/scenarios/[id]/events/[eventId]`: Deletes event (`200 OK`).
  - Constraints: validates event types (`financed purchase`, `recurring`, `seasonal`), positive amounts ($> 0$), and optional description.
  - Validation: `tests/api/forecaster-routes.test.ts`.

- [ ] **T015 [P] [US3] Implement scenario budget nudges API route**
  - Files: `src/app/api/scenarios/[id]/nudges/route.ts` (new).
  - Expected behavior:
    - Accepts UUIDs and stable IDs for `[id]`.
    - `PUT /api/scenarios/[id]/nudges`: Upserts category or bucket nudge with signed `deltaAmount` (`200 OK`). Returns `409 Conflict` (`invalid_state`) if baseline. Returns `409 Conflict` (`archived`) if target category or bucket is archived. Rejects nudges on income categories.
  - Constraints: validates target type, non-archived status, and signed integer centavos.
  - Validation: `tests/api/forecaster-routes.test.ts`.

- [ ] **T016 [US1–US5] Add integration tests for read model and API routes**
  - Files: `tests/server/forecaster-read.test.ts` (new), `tests/api/forecaster-routes.test.ts` (new).
  - Expected behavior:
    - Test `getForecasterView`:
      - Plan present: verifies baseline metrics match applied plan allocations, runway calculation (5.9 mo), Tight but doable verdict.
      - No plan applied for current month: returns `hasAppliedPlan: false`.
      - Deleted source model: plan snapshot remains intact and readable.
      - Multiple models: selects current month's applied plan snapshot.
      - Revised plan: reflects mid-month revised allocations.
      - Measures read model execution against <10ms target (reported in benchmark, not hard assertion that fails CI).
    - Test API routes:
      - HTTP error format `{ error: { code, message, field? } }`.
      - Stable ID acceptance (`a`, `b`, `c`, `baseline`).
      - Baseline write attempts (PATCH, DELETE, duplicate, add event, nudge) return 409 `invalid_state`.
      - Archived category/bucket nudges return 409 `archived`.
      - Palette key validation on creation (`rose` rejected).
      - Event amount validation (rejects 0, negative, fractional).
      - Nudge upsert updates signed delta.
  - Constraints: docblock `// @vitest-environment node`.
  - Validation: `npx vitest run tests/server/forecaster-read.test.ts tests/api/forecaster-routes.test.ts`.

---

## Phase 04 — Hi-Fi Output UI Components (Visual-Fidelity Pattern)

Order: Scenario Hero Cards → 24-Month Outlook Chart → Side-by-Side Comparison Table.

- [ ] **T017 [P] [US1, US2] Implement Scenario Hero Cards (VERDICT, RUNWAY, MONTHLY UNALLOCATED)**
  - Component: `src/components/forecaster/scenario-hero-cards.tsx` (new).
  - **Match**: `reference/Money Tracker Hi-Fi.dc.html#L441-L445` (prototype lines 441–445).
  - Breakpoints: Desktop grid `grid-template-columns: repeat(3, minmax(0, 1fr))` with 12px gap at $\ge 1100\text{px}$.
  - Style provenance: lifted from prototype CSS.
    - VERDICT card: radius 14px, padding 16px 18px, dynamic background/border/color from verdict token, title `VERDICT` (11.5px, letter-spacing .07em, #5c6467), verdict text (19px, weight 600; green `#2c6647`, accessible amber `#8a6516`, red `#8a3b28`), subtitle `"24-month horizon"`.
    - RUNWAY card: white card, border `#d5d8d8`, radius 14px, padding 16px 18px, title `RUNWAY`, large figure (JetBrains Mono 700 24px, clamped min `0.0 mo` or `—`), subtitle `"from N.N mo"` (or `"baseline runway"`).
    - MONTHLY UNALLOCATED card: white card, title `MONTHLY UNALLOCATED`, large figure (JetBrains Mono 700 24px, green `#2c6647` when $\ge 0$, red `#b0533c` when $< 0$), subtitle (`"₱X drawn from the buffer"` or `"buffer untouched"`).
  - Constraints: pure presentational component consuming `ScenarioMetrics`.
  - Validation: Visual check against prototype + RTL unit tests.

- [ ] **T018 [P] [US1, US2] Implement 24-Month Outlook Chart with zero rule and polylines**
  - Component: `src/components/forecaster/outlook-chart.tsx` (new).
  - **Match**: `reference/Money Tracker Hi-Fi.dc.html#L447-L467` (prototype lines 447–467).
  - Breakpoints: Container height 210px, relative positioning, full card width at $\ge 1100\text{px}$.
  - Style provenance: lifted from prototype CSS.
    - Chart card: white background, border `#d5d8d8`, radius 14px, padding 18px, title `"24-month outlook"`.
    - Baseline bars: 24 flat bars flex container:
      - Positive baseline: positioned at `top: 0, height: (zeroRuleRatio * 100)%`, `display: flex; align-items: flex-end; gap: 3px`. Each bar is sized as `height: (heightRatioInContainer * 100)%` where `heightRatioInContainer = heightRatio / zeroRuleRatio = U_0 / domainHi`, so bar tops meet the baseline polyline at $U_0$ exactly (bars `#dfe3e3`, radius 2px 2px 0 0, flex: 1).
      - Negative baseline: positioned at `top: (zeroRuleRatio * 100)%`, bars hang downwards below zero rule line with height ratio without clipping.
    - Zero rule line: 1px solid rule `#14181a` at `top: (zeroRuleRatio * 100)%`.
    - SVG polylines: `<svg viewBox="0 0 720 210" preserveAspectRatio="none">`, mapping normalized points $(x \times 720, y \times 210)$. Selected scenario polyline rendered at full opacity (1.0); non-selected polylines dimmed (`opacity: 0.35`). When Baseline is selected, alternative scenarios remain visible in dimmed state.
    - Milestone labels: flex space-between, font size 11.5px, color `#5c6467`, padding-top 7px.
    - Accessible summary: visually hidden table / sr-only summary describing baseline unallocated and scenario trajectory.
    - Legend: flex-wrap, gap 14px, color `#3c4346`, baseline unallocated badge + scenario colored strokes.
  - Constraints: converts normalized coordinates to SVG viewBox space; preserves zero rule alignment.
  - Validation: Visual check against prototype + RTL unit tests.

- [ ] **T019 [P] [US1, US2] Implement Scenarios Side by Side Comparison Table**
  - Component: `src/components/forecaster/scenario-comparison-table.tsx` (new).
  - **Match**: `reference/Money Tracker Hi-Fi.dc.html#L469-L487` (prototype lines 469–487).
  - Breakpoints: Wrapped in `overflow-x-auto` with inner `min-width: 520px` to eliminate window horizontal scroll; metric label column pinned with `sticky left-0 bg-white z-10`.
  - Style provenance: lifted from prototype CSS.
    - Table card: white background, border `#d5d8d8`, radius 14px, padding 18px.
    - Header: `"Scenarios side by side"` with subtitle `"runway = buffer ÷ monthly expense"`.
    - Steady-state rows: `Monthly expense`, `Unallocated`, `Drawn from buffer`, `Buffer after`, `Runway` (rounded 0.1, clamped min `0.0 mo` or `—`), `Verdict`.
    - Verdict badges: pill style radius 20px, padding 4px 10px, text-center, font size 12px with verdict colors (`#2c6647`, `#8a6516`, `#8a3b28`).
  - Constraints: scrollable inside card container; pinned label column; verified figures match R11.
  - Validation: Visual check against prototype + RTL unit tests.

---

## Phase 05 — Hi-Fi Input UI Components (Visual-Fidelity Pattern)

Order: Scenario Selector Chips → What Changes Event List → Budget Nudges Card.

- [ ] **T020 [P] [US1, US2, US5] Implement Scenario Selector Chips bar**
  - Component: `src/components/forecaster/scenario-chips.tsx` (new).
  - **Match**: `reference/Money Tracker Hi-Fi.dc.html#L398-L403` (prototype lines 398–403).
  - Breakpoints: Flex wrap with 9px gap, margin-bottom 16px.
  - Style provenance: lifted from prototype CSS.
    - Scenario chip: radius 9px, padding 8px 15px, font size 13px, cursor pointer. Active chip styled with `border: 1px solid <color>`, background `<tint>`, text `<ink>`, font-weight 500. Inactive chip styled with border `#d5d8d8`, background `#fff`, text `#3c4346`.
    - `+ scenario` chip: dashed border `#c4c9c9`, radius 9px, padding 8px 15px, font size 13px, color `#5c6467`, cursor pointer.
  - Constraints: keyboard navigation (`Enter` / `Space`); triggers scenario switch callback.
  - Validation: Visual check against prototype + RTL unit tests.

- [ ] **T021 [P] [US1, US4] Implement "What changes" Event List Card**
  - Component: `src/components/forecaster/what-changes-card.tsx` (new).
  - **Match**: `reference/Money Tracker Hi-Fi.dc.html#L408-L422` (prototype lines 408–422).
  - Breakpoints: Card in left column, width `minmax(260px, 320px)`.
  - Style provenance: lifted from prototype CSS.
    - Card: white background, border `#d5d8d8`, radius 14px, padding 18px.
    - Header: `"What changes"` with count badge (`N events`), subtitle `"click an event to edit it"`.
    - Event rows: `<button>` element with `aria-label`, radius 9px, padding 10px 12px, border `#d5d8d8`, flex space-between, cursor pointer. Name (13.5px), type (11.5px `#5c6467`), monthly impact (JetBrains Mono 12px, flex: none, formatted as `−₱X/mo`).
    - Empty baseline state: `"No events — this is the baseline."` in `#5c6467`.
    - `+ add event` button: dashed border `#c4c9c9`, radius 9px, padding 10px, text `#2f7d78`, text-center, cursor pointer (hidden on Baseline).
    - Net monthly impact summary: top border `#e2e4e4`, margin-top 12px, padding-top 12px, flex space-between, bold mono total in `#b0533c`.
  - Constraints: baseline scenario hides `+ add event` and shows baseline empty message.
  - Validation: Visual check against prototype + RTL unit tests.

- [ ] **T022 [P] [US3] Implement "Nudge the budget" Steppers Card with sequential per-row queue**
  - Component: `src/components/forecaster/budget-nudges-card.tsx` (new).
  - **Match**: `reference/Money Tracker Hi-Fi.dc.html#L424-L436` (prototype lines 424–436).
  - Breakpoints: Card in left column below "What changes".
  - Style provenance: lifted from prototype CSS.
    - Card: white background, border `#d5d8d8`, radius 14px, padding 18px.
    - Title `"Nudge the budget"`, subtitle `"drag to rebalance — 'freed' is money released"`.
    - Category nudge row: lists every expense category and savings bucket with a base allocation or existing nudge. Group header (10.5px, letter-spacing .06em, `#5c6467`), name + value row with status badge:
      - `+₱X freed` in green `#2c6647` when `freed > 0`.
      - `−₱X funded` in accessible amber `#8a6516` when `freed < 0`.
      - `₱0 freed` when `freed = 0`.
      - Archived targets display `(archived)` badge and disabled controls.
    - Stepper controls: accessible `−` and `+` `<button>` elements (20x20px, radius 6px, border `#d5d8d8`, hover background `#f4f5f5`, cursor pointer). `+` raises allocation; `−` lowers allocation.
    - Slider track: height 18px, background track `#e2e4e4`, colored fill (teal `#2f7d78` for freed, amber `#d3a13f` for funded; 50% fallback for base = 0), visual knob circle (white with 2px solid `#14181a`).
    - Sequential per-row queue: rapid clicks update optimistic state immediately and queue writes sequentially per row; if an older save fails with a newer edit queued, the newer edit stays visible and is dispatched next; only if terminal save fails does the row roll back to confirmed server delta; flushes pending writes on scenario switch.
  - Constraints: stepper-only; knob is visual; allocation clamped at $\ge 0$.
  - Validation: Visual check against prototype + RTL unit tests.

---

## Phase 06 — Modals, Interactivity, Page Assembly, & Component Tests

Order: Modals → Container Screen Assembly → Route Pages → End-to-End Component Tests.

- [ ] **T023 [P] [US5] Implement Scenario Modal (Create, Edit, Delete)**
  - Component: `src/components/forecaster/scenario-modal.tsx` (new).
  - Expected behavior:
    - Modal dialog supporting creation and editing of scenarios:
      - Fields: Name (required), Short Label (required), Start Month offset (`0..23`), Draw Amount (₱, integer $\ge 0$), Palette selection (`teal`, `purple`, `gold`, `blue`, `slate`).
      - Edit mode includes "Delete scenario" button (hidden for baseline).
      - Submitting executes `POST /api/scenarios` or `PATCH /api/scenarios/[id]`, triggers toast, and revalidates page data.
  - Constraints: accessible modal with focus trap and `Escape` key support; validates non-empty inputs.
  - Validation: `tests/components/forecaster/forecaster-screen.test.tsx`.

- [ ] **T024 [P] [US4] Implement Event Modal (Add, Edit, Delete)**
  - Component: `src/components/forecaster/event-modal.tsx` (new).
  - Expected behavior:
    - Modal dialog supporting creation and editing of hypothetical financial events:
      - Fields: Event Name (required), Event Type dropdown (`financed purchase`, `recurring`, `seasonal`), Monthly Amount (₱, integer $> 0$), optional Description.
      - Helper text explains that seasonal events represent the flat monthly equivalent of an annual or irregular cost (e.g. ₱9,600/yr = ₱800/mo).
      - Edit mode includes "Delete event" button.
      - Submitting executes `POST /api/scenarios/[id]/events` or `PATCH /api/scenarios/[id]/events/[eventId]`, triggers toast, and updates scenario.
  - Constraints: accessible modal; validates positive monetary amounts.
  - Validation: `tests/components/forecaster/forecaster-screen.test.tsx`.

- [ ] **T025 [US1–US6] Implement ForecasterScreen interactive container**
  - Component: `src/components/forecaster/forecaster-screen.tsx` (new).
  - Expected behavior:
    - Client component integrating:
      - Scenario selector chips (`ScenarioChips`).
      - Two-column responsive desktop layout (`minmax(260px, 320px) minmax(0, 1fr)`).
      - Left column: `WhatChangesCard` and `BudgetNudgesCard`.
      - Right column: `ScenarioHeroCards`, `OutlookChart`, and `ScenarioComparisonTable`.
      - Empty state when `data.hasAppliedPlan === false`: renders friendly empty state card `No budget applied for {Month YYYY}.` with link to `/models`.
      - Scenario switching: updates local state, flushes pending nudge writes, and updates URL `?scenario=<id>` without full page reload.
      - Budget nudging: updates local state optimistically and calls `PUT /api/scenarios/[id]/nudges` via sequential queue.
  - Constraints: desktop-first responsive design; zero horizontal page scroll at $\ge 1100\text{px}$.
  - Validation: `tests/components/forecaster/forecaster-screen.test.tsx`.

- [ ] **T026 [US1, US6] Assemble Forecaster Server Component page, loading, and error boundaries**
  - Files: `src/app/(shell)/forecaster/page.tsx`, `src/app/(shell)/forecaster/loading.tsx` (new), `src/app/(shell)/forecaster/error.tsx` (new).
  - Expected behavior:
    - `page.tsx`: Server Component reading `searchParams.scenario`, calling `getForecasterView(params.scenario)`, and passing view data to `<ForecasterScreen />`.
    - `loading.tsx`: Skeleton loader matching the two-column forecaster grid.
    - `error.tsx`: Friendly error card with `retry()` button, isolated strictly to the forecaster route without breaking the shell header or sidebar.
  - Constraints: Server Component; no client-only APIs in `page.tsx`.
  - Validation: `tests/components/forecaster/forecaster-screen.test.tsx`.

- [ ] **T027 [US1–US6] Add comprehensive component tests for ForecasterScreen**
  - Files: `tests/components/forecaster/forecaster-screen.test.tsx` (new).
  - Expected behavior:
    - Test initial rendering of Baseline scenario with hero cards, flat chart bars, comparison table, and empty baseline message.
    - Test scenario switching: clicking Scenario A highlights chip, updates hero cards, and highlights Scenario A's polyline at opacity 1.0 while others are dimmed at 0.35.
    - Test empty state rendering when `hasAppliedPlan: false`: renders `No budget applied for {Month YYYY}.` with link to `/models`.
    - Test budget nudge stepping:
      - Rapid clicks on nudge stepper queueing saves sequentially.
      - First save that fails while a newer edit is queued behind it (verifying newer edit stays visible and dispatches next).
      - Switching scenarios with saves pending (flushes in-flight saves before switching).
    - Test event modal interactions: opening, saving, and deleting an event.
    - Test loading skeleton and error boundary retry trigger.
  - Constraints: React Testing Library (`jsdom` environment); mocks fetch calls cleanly.
  - Validation: `npx vitest run tests/components/forecaster/forecaster-screen.test.tsx`.

---

## Phase 07 — Release Prep

Order: Version Bump → Changelog → Roadmap Update → Repo Map & README → Docs Sanity Test.

- [ ] **T028 [P] Bump project version in package.json and package-lock.json**
  - Files: `package.json`, `package-lock.json`.
  - Expected behavior: Bump version cleanly from `3.3.0` to `3.4.0`.
  - Constraints: lockfile matches `package.json` exactly.
  - Validation: `npm run lint`.

- [ ] **T029 [P] Update CHANGELOG.md with F05 release notes**
  - Files: `CHANGELOG.md`.
  - Expected behavior: Document Feature 005 (Forecaster), detailing the 24-month projection engine, applied monthly plan baseline derivation, scenario management, budget nudges, hypothetical events, and prototype alignment.
  - Validation: manual review.

- [ ] **T030 [P] Update docs/feature_roadmap.md**
  - Files: `docs/feature_roadmap.md`.
  - Expected behavior: Update row to `| F05 — Forecaster | In progress | [Brief](features/v3-005-forecaster.md) |` (during dev) then `✓ Complete`.
  - Validation: manual review.

- [ ] **T031 [P] Update docs/REPO_MAP.md and README.md**
  - Files: `docs/REPO_MAP.md`, `README.md`.
  - Expected behavior:
    - Add new domain, server, and component forecaster files to `docs/REPO_MAP.md`.
    - Update `README.md` feature summary highlighting Forecaster availability.
  - Validation: manual review.

- [ ] **T032 Run release documentation test suite**
  - Command: `npx vitest run tests/release-docs.test.ts`.
  - Expected behavior: All documentation tests pass cleanly.
  - Validation: `npx vitest run tests/release-docs.test.ts`.

---

## Phase 08 — Browser Smoke Test & Visual Review

Order: Clean Install Test → Baseline Outlook → Scenario Switching → Budget Nudges → Events Management → Scenario CRUD → Visual Breakpoint Pass.

- [ ] **T033 [US6] Smoke Test 1 — Fresh Install & Empty States**
  - Walkthrough:
    1. Wipe database with `npm run clear -- --yes`.
    2. Open `http://127.0.0.1:3000/forecaster`.
    3. Verify clean empty state card displays: `No budget applied for {Month YYYY}.`.
    4. Click the link to `/models` and verify navigation.
  - Validation: Browser verification.

- [ ] **T034 [US1] Smoke Test 2 — Baseline 24-Month Outlook**
  - Walkthrough:
    1. Seed demo dataset with `npm run seed`.
    2. Navigate to `http://127.0.0.1:3000/forecaster`.
    3. Verify Baseline is selected by default.
    4. Confirm VERDICT card shows `Tight but doable` in accessible amber (`#8a6516`) with `24-month horizon`.
    5. Confirm RUNWAY card displays baseline runway `5.9 mo`.
    6. Confirm MONTHLY UNALLOCATED displays `+₱20,500` with subtitle `buffer untouched`.
    7. Confirm 24-month chart displays 24 flat baseline bars, dark zero rule line, dimmed lines for alternative scenarios, and 4 milestone dates.
    8. Confirm "What changes" card displays: `"No events — this is the baseline."` with `+ add event` hidden.
  - Validation: Browser verification.

- [ ] **T035 [US2] Smoke Test 3 — Scenario Switching & Side-by-Side Comparison**
  - Walkthrough:
    1. Click chip for **A · Buy now, 5-yr loan**.
    2. Verify chip activates with teal border, tint, and ink.
    3. Verify Hero cards update: runway updates to `3.8 mo` with note `from 5.9 mo`, unallocated updates to `−₱2,430` with note `₱98,500 drawn from the buffer`.
    4. Verify 24-month chart renders Scenario A's polyline starting at month 5 at full opacity (1.0), while other lines are dimmed (0.35).
    5. In "Scenarios side by side", verify columns for Baseline, Scenario A, Scenario B, and Scenario C are aligned with confirmed figures:
       - Baseline: Expense ₱79,000, Unallocated +₱20,500, Buffer after ₱466,000, Runway 5.9 mo, Verdict Tight but doable.
       - A: Expense ₱96,930, Unallocated −₱2,430, Buffer after ₱367,500, Runway 3.8 mo, Verdict Risky buffer.
       - B: Expense ₱100,400, Unallocated −₱900, Buffer after ₱466,000, Runway 4.6 mo, Verdict Risky buffer.
       - C: Expense ₱84,200, Unallocated +₱15,300, Buffer after −₱52,500, Runway 0.0 mo, Verdict Risky buffer.
  - Validation: Browser verification.

- [ ] **T036 [US3] Smoke Test 4 — Budget Nudges & Real-Time Rebalancing**
  - Walkthrough:
    1. Under Scenario A, locate the **Groceries** row in "Nudge the budget".
    2. Click `+` to raise the allocation by ₱500.
    3. Confirm allocation displays ₱18,500 and status badge updates from `+₱2,000 freed` to `+₱1,500 freed`.
    4. Click `−` twice. Confirm allocation decreases to ₱17,500 and freed funds increase to `+₱2,500 freed`.
    5. Confirm Monthly Expense, Monthly Unallocated, Runway, and comparison table update immediately.
    6. Refresh browser (`F5`); verify updated nudge persists.
  - Validation: Browser verification.

- [ ] **T037 [US4] Smoke Test 5 — Hypothetical Financial Events Management**
  - Walkthrough:
    1. Select Scenario A, click `+ add event`.
    2. Enter Name: "Annual Insurance", Type: "seasonal", Amount: "1,200". (Modal helper text notes seasonal is the monthly equivalent of an annual cost).
    3. Save event. Confirm "Annual Insurance" appears in the "What changes" list.
    4. Confirm event count updates, net monthly impact updates, and runway updates.
    5. Click "Annual Insurance" row, click "Delete event", and confirm it is removed and figures restore.
  - Validation: Browser verification.

- [ ] **T038 [US5] Smoke Test 6 — Scenario Creation, Duplication, & Deletion**
  - Walkthrough:
    1. Select **A · Buy now, 5-yr loan**, open scenario settings modal, click "Duplicate".
    2. Confirm "A · Buy now, 5-yr loan (Copy)" appears with all 2 events and 4 nudges cloned.
    3. Click `+ scenario`.
    4. Enter Name: "D · Secondhand car", Short Label: "D · SECONDHAND", Start Month: 6, Buffer Draw: "50,000", Palette Key: `purple`.
    5. Save scenario. Confirm "D · SECONDHAND" chip appears in the selector.
    6. Open scenario modal for "A · Buy now, 5-yr loan (Copy)" and click "Delete". Confirm it is removed.
    7. Confirm the Baseline scenario has no delete option and rejects write mutations with 409 `invalid_state`.
  - Validation: Browser verification.

- [ ] **T039 Desktop Visual Verification Pass at 1100px, 1280px, and 1440px**
  - Walkthrough:
    1. Test screen layout at viewport widths 1100px, 1280px, and 1440px.
    2. Verify zero horizontal page scrolling occurs; comparison table scrolls inside its card with pinned label column.
    3. Verify text contrast on status badges meets WCAG AA standards (`#8a6516` contrast $\ge 4.5:1$).
    4. Compare visually with prototype `Money Tracker Hi-Fi.dc.html#L396-L491`.
  - Validation: Visual check against prototype.

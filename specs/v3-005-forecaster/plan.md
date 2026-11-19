# Implementation Plan: F05 — Forecaster

**Branch**: `v3-005-forecaster` | **Date**: 2026-11-18 (revised Req-Review 2026-11-18) | **Spec**: [spec.md](spec.md)  
**Input**: `specs/v3-005-forecaster/spec.md`, `docs/features/v3-005-forecaster.md`, `handoff/celia_v3_001.zip`

---

## Summary

F05 implements Celia's final planned core capability: the **Forecaster** screen (`/forecaster`). It introduces forward-looking financial trajectory modeling without modifying actual transactions (F02), savings buckets (F03), or monthly budget models (F03):

1. **Pure Domain Core & Deterministic Modeling**:
   - Reuses F03's applied monthly budget plans and savings buckets to establish an authoritative baseline derived from the current calendar month's row in `monthly_budget_plans` and its `monthly_budget_allocations`.
   - Implements `src/domain/forecaster.ts` and `src/domain/forecaster-calculations.ts` for projection mathematics:
     - 24-month horizon calculation ($M_0$ through $M_{23}$), anchored to the current calendar month with flat baseline unallocated bars (positive bars sized as `heightRatio / zeroRuleRatio = U_0 / domainHi` to meet the baseline polyline; negative bars extending downwards below the zero rule line).
     - Scenario metrics calculation:
       - `Monthly expense = Σ baseExpenseAllocations + Σ events − Σ freedExpenseNudges`.
       - Savings-bucket nudges affect **only Unallocated** cash flow (Constitution Principle IV: "Savings are not expenses").
       - `Unallocated = income − baseExpenseAllocations − baseSavingsAllocations − Σ events + Σ freedAllNudges`.
       - `Runway = buffer after ÷ monthly expense`, rounded to 0.1.
       - **Overdrawn buffer precedence rule**: If remaining buffer $\le 0$, runway is strictly `0.0 mo` and verdict is `Risky buffer` regardless of monthly expenses. If monthly expenses are 0 and buffer $> 0$, runway is undefined (`null`, displayed as `—`), with the verdict derived from cash flow alone (`Comfortable` if $\ge 0$, `Risky buffer` if $< 0$).
     - 3-tier deterministic verdict classification (`Comfortable` green, `Tight but doable` accessible amber `#8a6516`, `Risky buffer` red `#8a3b28`).
     - 24-month outlook chart geometry: zero-rule ratio, flat baseline bars, and multi-scenario normalized $(x, y) \in [0, 1] \times [0, 1]$ coordinates with step transition at `start_month`.
     - Budget nudge step math: adjusting category allocations in ±₱500 (50,000 centavos) increments via stepper buttons (`+` raises allocation, `−` lowers allocation), storing signed `delta_amount`, deriving adjusted and freed amounts, and clamping allocations at $\ge 0$.
   - Strict domain/presentation separation (Constitution Principle VIII): domain functions return pure numbers, normalized ratios, and semantic state enums; UI components handle currency formatting, hex color tokens, and localized text.
2. **Persistence Layer, Migration 4 & Demo Tooling**:
   - Implements SQLite Migration 4 via `src/server/db/migrations.ts`, adding `scenarios`, `scenario_events`, and `scenario_nudges` tables with foreign keys, check constraints, integer validation checks (`typeof(...) = 'integer'`), cascade deletes on scenarios, storing only `palette_key` on scenarios (no duplicate hex columns), and automatically inserting the Baseline row using ISO-8601 timestamps.
   - Updates `src/server/demo.ts`:
     - `clearAllData` preserves the Baseline scenario row (`DELETE FROM scenarios WHERE is_baseline = 0`).
     - `getClearSummary` counts non-baseline scenarios only (`WHERE is_baseline = 0`).
     - `seedDemoData` requires an otherwise empty database (wiped via `npm run clear -- --yes`). It skips creating the baseline row (since Migration 4 creates it) and populates scenarios A, B, C using rewritten `scripts/seed.json` entries matching `data-model.md §3` with stable IDs (`a`, `b`, `c`), category name key `"dining out"`, and bucket `id: 'car'`.
   - Updates `src/server/categories-service.ts` to invoke `mergeCategoryNudges` within the merge transaction. The Phase 03 Forecaster read model owns the recursive query for applied budget allocations.
   - Implements `src/server/forecaster-store.ts` and `src/server/forecaster-service.ts` providing typed CRUD operations, baseline mutation guards (returning 409 `invalid_state`), and category merge re-pointing.
3. **Optimized Server Read Model**:
   - Implements `src/server/forecaster-read.ts`, querying the database in a single synchronous pass with a performance design target of sub-10ms response (measured, non-failing):
     - Resolves current month's applied budget plan (or signals an unconfigured empty state `No budget applied for {Month YYYY}.`).
     - Calculates starting cash buffer from active buckets with `counts_toward_buffer = 1`.
     - Loads scenarios, events, and nudges.
     - Assembles `ForecasterViewData` ready for Server Component rendering.
4. **Interactive Component Architecture & Modals**:
   - Implements `/forecaster` matching the visual layout of `Money Tracker Hi-Fi.dc.html#L396-L491`:
     - Scenario selector chips with 5 curated palette accents (`teal #2f7d78`, `purple #7c6f9a`, `gold #a17c3f`, `blue #2563eb`, `slate #7d8ba8`), with fixed baseline style (`#3a4145`), and `+ scenario` action.
     - Left column (`minmax(260px, 320px)`): "What changes" event list with net monthly impact, and "Nudge the budget" stepper cards with freed/funded badges and sequential per-row write queue with interim failure continuity.
     - Right column: 3 Hero cards (VERDICT, RUNWAY, MONTHLY UNALLOCATED), 24-month outlook SVG chart with zero rule line, and "Scenarios side by side" comparison table with pinned label column.
     - Create/Edit/Duplicate Scenario modal and Add/Edit Event modal (`financed purchase`, `recurring`, `seasonal`).
5. **Route Shell Integration & Error Boundaries**:
   - Implements `src/app/(shell)/forecaster/page.tsx`, `loading.tsx`, and `error.tsx` (with `retry()`), isolating forecaster states within the shell without impacting sibling pages.

---

## User Stories & Phased Architecture

| Phase | Focus | User Stories Covered | Verification Gate |
|---|---|---|---|
| **Phase 01** | Pure Domain Core & Forecaster Calculations | US1, US2, US3 | `npm run test` (pure math tests, node environment) |
| **Phase 02** | Database Schema (Migration 4), Store, Service, Categories Merge & Demo Tooling | US1–US6 | `npm run test` (SQLite migration, merge and service integration tests) |
| **Phase 03** | Server Read Model & API Route Handlers | US1–US5 | Integration tests covering query assembly & mutation routes |
| **Phase 04** | Hi-Fi Output UI Components (Hero Cards, 24-Month Chart, Comparison Table) | US1, US2, US6 | Visual review against prototype lines 439–491 |
| **Phase 05** | Hi-Fi Input UI Components (Scenario Chips, What Changes, Budget Nudges) | US2, US3, US4 | Visual review against prototype lines 396–437 |
| **Phase 06** | Modals, Interactivity, Page Assembly, & Component Tests | US1–US6 | RTL component tests + full verification gate |
| **Phase 07** | Release Prep | — | Roadmap, Changelog, Version Bump (3.4.0), Docs sanity |
| **Phase 08** | Browser Smoke Test & Visual Review | US1–US6 | Manual browser walkthrough on fresh and seeded data |

---

## Detailed Implementation Phases

### Phase 01 — Pure Domain Core & Forecaster Calculations
- Create `src/domain/forecaster.ts`:
  - Define interfaces: `Scenario`, `ScenarioEvent`, `ScenarioNudge`, `ScenarioEventType`, `ForecastVerdictTier`, `ForecastStatusTone`, `ForecastVerdict`, `PaletteKey`, `ScenarioMetrics`, `OutlookBar`, `OutlookPolyline`, `OutlookData`, `ForecasterViewData`.
  - Type definitions use strict integer minor units (`Centavos`) and zero server-only dependencies.
  - Zero hex colors or presentation styling in domain types.
- Create `src/domain/forecaster-calculations.ts`:
  - `calculateVerdict(runway: number | null, monthlyUnallocated: Centavos): ForecastVerdict`:
    - Evaluates 3-tier verdict matrix with rounded runway; handles overdrawn buffers ($\le 0 \implies \text{Risky buffer}$) and zero expenses with positive buffer (runway `null`, verdict from cash flow). Returns pure tier and status tone.
  - `calculateScenarioMetrics(baseline: BaselineMetrics, scenario: ScenarioWithRelations): ScenarioMetrics`:
    - Computes `monthlyExpense`, `monthlyUnallocated`, `bufferAfter`, `runway`, and `verdict`. Separates expense category nudges from savings bucket nudges. Applies overdrawn buffer priority rule.
  - `calculate24MonthOutlook(baselineUnallocated: Centavos, scenarios: readonly ScenarioWithRelations[], startMonthKey: string): OutlookData`:
    - Generates 24 flat baseline monthly bars (with `isNegative` flag and `heightRatioInContainer = isNegative ? |U_0| / |domainLo| : U_0 / domainHi`), scaling factors, zero rule ratio, and normalized $(x, y)$ coordinates in $[0, 1] \times [0, 1]$ with step transitions at `start_month`.
  - `deriveNudgeAmounts(baseAllocation: Centavos, deltaAmount: Centavos): { adjustedAllocation: Centavos; freedAmount: Centavos }`:
    - Computes `adjusted = max(0, base + delta)` and `freed = base - adjusted`.
  - `stepCategoryNudge(baseAllocation: Centavos, currentAllocation: Centavos, direction: 1 | -1): NudgeStepResult`:
    - Computes new allocation stepped by ±₱500, new delta, freed/funded amount, and visual fill percentage.
- Add unit tests in `tests/domain/forecaster-calculations.test.ts`.

### Phase 02 — Database Schema (Migration 4), Store, Service, Categories Merge & Demo Tooling
- Update `src/server/db/migrations.ts`:
  - Add `migrationFour` with version 4:
    - `scenarios` table (with `is_baseline` unique index, `name` and `short_label` non-empty length checks, `start_month` 0..23, `palette_key` CHECK `((is_baseline = 1 AND palette_key IS NULL) OR (is_baseline = 0 AND palette_key IS NOT NULL AND palette_key IN ('teal', 'purple', 'gold', 'blue', 'slate')))` , `typeof(...) = 'integer'` checks). Does NOT store color/tint/ink/dash columns.
    - Automatically inserts the Baseline row (`id: 'baseline'`, `name: 'Baseline'`, `short_label: 'BASELINE'`, `palette_key: NULL`, `start_month: 0`, `is_baseline: 1`, `created_at: new Date().toISOString()`).
    - `scenario_events` table (foreign key `scenario_id REFERENCES scenarios(id) ON DELETE CASCADE`, `monthly_amount > 0`, `typeof(...) = 'integer'`).
    - `scenario_nudges` table (foreign key `scenario_id REFERENCES scenarios(id) ON DELETE CASCADE`, plain foreign keys to categories and buckets, `delta_amount INTEGER`, `typeof(...) = 'integer'`).
  - Register in `migrations` array.
- Update `src/server/demo.ts`:
  - Update `clearAllData` to preserve the Baseline scenario row (`DELETE FROM scenarios WHERE is_baseline = 0`).
  - Update `getClearSummary` to count non-baseline scenarios only (`SELECT COUNT(*) FROM scenarios WHERE is_baseline = 0`).
  - Update `seedDemoData` (requires an otherwise empty database wiped with `npm run clear -- --yes`): skips inserting baseline row, and seeds scenarios A, B, C from rewritten `scripts/seed.json` entries matching `data-model.md §3` with stable IDs (`a`, `b`, `c`), category name key `"dining out"`, bucket `id: 'car'`, and signed centavo deltas.
- Update `src/server/categories-service.ts`:
  - In `mergeCategory`, invoke `mergeCategoryNudges(db, sourceCategoryId, targetCategoryId, now)` inside the merge transaction. The Phase 03 Forecaster read model owns the recursive query for applied budget allocations.
- Create `src/server/forecaster-store.ts`:
  - Typed SQLite queries using `better-sqlite3`: scenario CRUD, event CRUD, nudge upserts, batch queries.
  - Implement `mergeCategoryNudges(database, sourceCategoryId, targetCategoryId, now)` for category merges.
- Create `src/server/forecaster-service.ts`:
  - Business logic: prevents modifying, renaming, giving draws/events, nudging, duplicating, or deleting the baseline scenario (throws `DomainError` with code `invalid_state` $\rightarrow$ HTTP 409).
  - Handles scenario duplication (cloning scenario + associated events and nudges).
  - Validates palette keys (`teal`, `purple`, `gold`, `blue`, `slate`), event types, positive amounts, and string lengths.
  - Rejects nudges on archived categories or buckets with code `archived` $\rightarrow$ HTTP 409.
- Add tests in `tests/server/forecaster-store.test.ts` and `tests/server/forecaster-service.test.ts`.

### Phase 03 — Server Read Model & API Route Handlers
- Create `src/server/forecaster-read.ts`:
  - Implements `getForecasterView(selectedScenarioId?: string): Promise<ForecasterViewData>`:
    - Resolves current calendar month row from `monthly_budget_plans` and its `monthly_budget_allocations`.
    - If no plan exists for current month, returns `hasAppliedPlan: false` with empty state view (`No budget applied for {Month YYYY}.`).
    - Sets baseline scenario name from plan's `model_name`.
    - Computes active savings buffer balance from buckets with `counts_toward_buffer = 1`.
    - Transitive base budget resolution: folds merged-away category allocations into surviving categories via recursive CTE.
    - Fetches all scenarios, events, and nudges.
    - Resolves target names and archived status for all nudged items.
    - Includes all applied expense and savings allocation targets so the UI can create a first nudge. Existing scenario nudges also carry details for targets with no applied allocation.
    - Computes 24-month outlook geometry and comparison table rows.
    - Accepts UUIDs and stable IDs (`baseline`, `a`, `b`, `c`), falling back to `'baseline'` if invalid.
- Create API route handlers adhering to `src/server/http.ts:72-99` error format:
  - `src/app/api/scenarios/route.ts` (`GET`, `POST`)
  - `src/app/api/scenarios/[id]/route.ts` (`PATCH`, `DELETE`)
  - `src/app/api/scenarios/[id]/duplicate/route.ts` (`POST`)
  - `src/app/api/scenarios/[id]/events/route.ts` (`POST`)
  - `src/app/api/scenarios/[id]/events/[eventId]/route.ts` (`PATCH`, `DELETE`)
  - `src/app/api/scenarios/[id]/nudges/route.ts` (`PUT`) - returns 409 `archived` if target is archived.
- Create `src/server/forecaster-http.ts` for typed JSON bodies with numeric centavos and nullable fields.
- Add integration tests in `tests/server/forecaster-read.test.ts` and `tests/api/forecaster-routes.test.ts`. Measure sub-10ms performance target without hard assertions that fail CI.

### Phase 04 — Hi-Fi Output UI Components
- Create `src/components/forecaster/scenario-hero-cards.tsx`:
  - VERDICT card (tinted background, status badge, "24-month horizon" caption).
  - RUNWAY card (large mono runway rounded to 0.1, clamped at min 0.0 mo, "from N.N mo" baseline diff).
  - MONTHLY UNALLOCATED card (large mono signed figure, green for $\ge 0$, red for $< 0$, buffer draw note).
- Create `src/components/forecaster/outlook-chart.tsx`:
  - 24 flat monthly bars, zero rule line, multi-scenario SVG polylines.
  - Positive baseline bars sized as `heightRatioInContainer * 100%` inside the container of height `zeroRuleRatio * 100%` with `align-items: flex-end`, meeting the baseline polyline at $U_0$ exactly.
  - Baseline bars extend downwards below zero rule line when negative (`isNegative = true`).
  - Selected polyline at full opacity (1.0), others dimmed (`0.35`). When Baseline is selected, alternative scenarios remain visible in dimmed state.
  - 4 milestone labels ($M_0$, $M_6$, $M_{12}$, $M_{23}$).
  - Legend with scenario colors and baseline unallocated key.
  - Screen reader accessible summary table.
- Create `src/components/forecaster/scenario-comparison-table.tsx`:
  - Side-by-side grid rendering Baseline and all alternative scenarios inside `overflow-x-auto` with pinned label column (`sticky left-0 bg-white`).
  - Rows: Monthly expense, Unallocated, Drawn from buffer, Buffer after, Runway, Verdict.

### Phase 05 — Hi-Fi Input UI Components
- Create `src/components/forecaster/scenario-chips.tsx`:
  - Chip bar displaying all scenarios with custom palette accents and `+ scenario` trigger. Baseline renders fixed dark neutral style `#3a4145`.
- Create `src/components/forecaster/what-changes-card.tsx`:
  - Event list displaying name, type, and monthly impact (`−₱X/mo`).
  - Net monthly impact summary line.
  - Empty state for baseline: `"No events — this is the baseline."` with `+ add event` hidden.
- Create `src/components/forecaster/budget-nudges-card.tsx`:
  - Lists every category/bucket with a base allocation or existing nudge.
  - Steppers `−` and `+` with accessible `aria-label` (`+` raises allocation, `−` lowers allocation).
  - Accessible status text: `+₱X freed` (green `#2c6647`) or `−₱X funded` (amber `#8a6516`).
  - Disabled controls with `(archived)` badge for archived targets.
  - Visual slider track (50% fill fallback for base = 0).
  - Sequential per-row queue: rapid clicks queue writes sequentially; if an older save fails while a newer edit is queued, the newer edit stays visible and is dispatched next; only if terminal save fails does the row roll back to confirmed server delta.
  - Exposes `flushPendingSaves` for Phase 06 scenario switching.
- Verify the three input components in `tests/components/forecaster/forecaster-input.test.tsx`.

### Phase 06 — Modals, Interactivity, Page Assembly, & Component Tests
- Create modals:
  - `src/components/forecaster/scenario-modal.tsx`: Create, edit, and delete scenario using fixed palette keys (`teal`, `purple`, `gold`, `blue`, `slate`).
  - `src/components/forecaster/event-modal.tsx`: Add, edit, and delete event (`financed purchase`, `recurring`, `seasonal`), with seasonal helper text.
- Assemble screen in `src/components/forecaster/forecaster-screen.tsx`:
  - Responsive two-column grid on desktop (`minmax(260px, 320px) minmax(0, 1fr)`).
  - Empty state when `data.hasAppliedPlan === false`: renders card `No budget applied for {Month YYYY}.` with link to `/models`.
  - Synchronizes URL `?scenario=<id>` without full page reload.
  - Flushes pending nudge writes before switching scenarios.
- Assemble page:
  - Update `src/app/(shell)/forecaster/page.tsx` as Server Component.
  - Add `src/app/(shell)/forecaster/loading.tsx` and `src/app/(shell)/forecaster/error.tsx` (with `retry()`).
- Add comprehensive component tests in `tests/components/forecaster/forecaster-screen.test.tsx`:
  - Rapid clicks on nudge stepper queueing saves sequentially.
  - A first save that fails with a newer edit queued behind it (verifying newer edit stays visible and dispatches next).
  - Switching scenarios with saves pending (flushes in-flight saves before switching).

### Phase 07 — Release Prep
- Update `package.json` and `package-lock.json` version cleanly from `3.3.0` to `3.4.0`.
- Update `CHANGELOG.md` with Feature 005 entries.
- Update `docs/feature_roadmap.md`: mark Forecaster `In progress` (during dev) then `✓ Complete`.
- Update `docs/REPO_MAP.md` and `README.md`.
- Run `npx vitest run tests/release-docs.test.ts`.

### Phase 08 — Browser Smoke Test & Visual Review
- Execute Browser Smoke Test walkthrough covering US1 through US6 with confirmed figures.
- Duplicate Scenario A in Smoke Test 6 to verify cloned events and nudges.
- Desktop visual verification pass at 1100px, 1280px, and 1440px against prototype.
- Run complete verification gate:
  `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build`
- After browser acceptance and verification pass, mark F05 `✓ Complete` in `docs/feature_roadmap.md` and remove the pending acceptance note (T040).

---

## Affected Areas

### Files Likely to be Inspected
- `src/domain/month.ts`
- `src/domain/budget.ts`
- `src/domain/savings.ts`
- `src/domain/savings-calculations.ts`
- `src/server/models-store.ts`
- `src/server/savings-store.ts`
- `src/server/dashboard-read.ts`
- `src/server/demo.ts`
- `handoff/celia_v3_001.zip` (`Money Tracker Hi-Fi.dc.html`, `product-decisions.md`)

### Files Likely to be Modified
- `src/server/db/migrations.ts` (adds Migration 4 for scenarios, events, and nudges, creates baseline row)
- `src/server/demo.ts` (updates `clearAllData` to preserve baseline row, `getClearSummary` to count non-baseline scenarios only, skips baseline in `seedDemoData`)
- `src/server/categories-service.ts` (invokes `mergeCategoryNudges` within category merge transaction)
- `scripts/seed.json` (rewrites demo scenarios A, B, C to signed centavo deltas and palette keys)
- `src/app/(shell)/forecaster/page.tsx` (replaces stub with full Server Component)
- `docs/feature_roadmap.md` (updates Forecaster row status and link)
- `CHANGELOG.md`
- `docs/REPO_MAP.md`
- `package.json` & `package-lock.json`

### New Files to be Created
- `specs/v3-005-forecaster/deviations.md`
- `src/domain/forecaster.ts`
- `src/domain/forecaster-calculations.ts`
- `src/server/forecaster-store.ts`
- `src/server/forecaster-service.ts`
- `src/server/forecaster-read.ts`
- `src/server/forecaster-http.ts`
- `src/app/api/scenarios/route.ts`
- `src/app/api/scenarios/[id]/route.ts`
- `src/app/api/scenarios/[id]/duplicate/route.ts`
- `src/app/api/scenarios/[id]/events/route.ts`
- `src/app/api/scenarios/[id]/events/[eventId]/route.ts`
- `src/app/api/scenarios/[id]/nudges/route.ts`
- `src/components/forecaster/forecaster-screen.tsx`
- `src/components/forecaster/scenario-chips.tsx`
- `src/components/forecaster/what-changes-card.tsx`
- `src/components/forecaster/budget-nudges-card.tsx`
- `src/components/forecaster/scenario-hero-cards.tsx`
- `src/components/forecaster/outlook-chart.tsx`
- `src/components/forecaster/scenario-comparison-table.tsx`
- `src/components/forecaster/presentation.ts`
- `src/components/forecaster/scenario-modal.tsx`
- `src/components/forecaster/event-modal.tsx`
- `src/components/forecaster/mutation-dialog.tsx` (shared modal submission and error state)
- `src/components/ui/form-dialog.tsx` (shared native form dialog and control styles)
- `src/app/(shell)/forecaster/loading.tsx`
- `src/app/(shell)/forecaster/error.tsx`

### Tests Likely to be Added or Updated
- `tests/domain/forecaster-calculations.test.ts`
- `tests/server/forecaster-store.test.ts`
- `tests/server/forecaster-service.test.ts`
- `tests/server/forecaster-read.test.ts`
- `tests/api/forecaster-routes.test.ts`
- `tests/components/forecaster/forecaster-output.test.tsx`
- `tests/components/forecaster/forecaster-input.test.tsx`
- `tests/components/forecaster/forecaster-screen.test.tsx`
- `tests/components/app-rail.test.tsx` (Forecaster route and empty-state coverage)
- `tests/release-docs.test.ts`

---

## Validation Approach

1. **Pure Math Unit Testing**:
   - Test `calculateVerdict` across boundary conditions ($<0$, $0$, $2.95$, $3.0$, $5.95$, $6.0$ months).
   - Test `calculateScenarioMetrics` separating expense nudges from savings nudges, overdrawn buffer priority rule ($B_S \le 0 \implies 0.0\text{ mo}$, `Risky buffer`), zero expenses with positive buffer ($R_S = \text{null}$, cash-flow verdict), and verified figures for Baseline, A, B, C.
   - Test `calculate24MonthOutlook` with negative baseline, all-negative values, and all-zero data.
2. **Store & Service Integration Testing**:
   - Test SQLite Migration 4 execution, baseline insertion with ISO-8601 timestamp, and integer check constraints.
   - Test baseline mutation rejection (returns 409 `invalid_state`).
   - Test category merge in `categories-service.ts` re-pointing and delta summation with base budget transitive closure.
   - Test rejection of nudges on archived categories/buckets (returns 409 `archived`).
   - Test scenario duplication and cascade deletes.
   - Test unseeded upgrade and `clearAllData` baseline preservation.
3. **API & Read Model Testing**:
   - Verify `getForecasterView` produces complete view data matching the applied plan, or clean empty state when unbudgeted.
   - Measure read model latency against performance target (<10ms).
   - Test API route handlers for HTTP error format `{ error: { code, message, field? } }` and route parameter acceptance of stable IDs (`baseline`, `a`, `b`, `c`).
4. **Component & Accessibility Testing**:
   - RTL tests for `ForecasterScreen`, verifying scenario switching, event additions, and stepper adjustments.
   - Sequential per-row save queue with optimistic UI and rollback.
   - Verify keyboard navigability, button `aria-label` tags, and WCAG AA contrast (`#8a6516`).
5. **Browser Smoke Testing**:
   - End-to-end verification of User Stories 1 through 6 against seeded and clean databases. Duplicating Scenario A in Smoke Test 6.

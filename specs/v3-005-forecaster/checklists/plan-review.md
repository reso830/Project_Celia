# Plan Review Gate: F05 — Forecaster

**Gate result**: PASS  
**Date**: 2026-11-18 | **Spec**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md)

Verify against `plan.md` and its supporting artifacts (`research.md`, `data-model.md`, `contracts/api.md`, `quickstart.md`) **before any implementation code is written**. Every item is checkable from the planning artifacts alone.

---

## 1. Spec ↔ Plan Alignment

- [x] Every spec user story (US1–US6) maps directly to concrete plan phases and implementation tasks.
- [x] The plan reflects the current spec clarifications, including decisions that supersede the original session:
  - [x] Baseline income, expenses, and savings allocations derive from the current month's applied F03 budget plan, with the active savings buffer as starting reserves.
  - [x] Forecast horizon is fixed at 24 months, aligning strictly with the prototype's 24-month horizon card, 24-bar outlook chart, and comparison matrix.
  - [x] Projections begin with the current calendar month ($M_0$) as a clean baseline starting from the real-time savings buffer balance.
  - [x] Scenarios support one-time buffer draws, flat monthly costs (financed purchase, recurring, seasonal), and expense and savings nudges in ±₱500 steps.
  - [x] Seed dataset includes Baseline 2026 plus prototype scenarios A, B, and C, with full user CRUD for custom scenarios.
- [x] Non-goals remain strictly excluded: no AI-generated financial advice, no modifications to actual transactions (`entries`), actual savings movements (`savings_activities`), or applied monthly budgets (`monthly_budget_plans`), no debt amortization engine, no multi-currency forecasting, and no bank integrations.

---

## 2. Architecture & Layer Boundaries

- [x] Clear layer separation:
  - [x] `src/domain/forecaster-calculations.ts`: Pure, zero-dependency calculation functions returning normalized points (`0..1`), ratios, and domain enums (`ForecastVerdictTier`, `ForecastStatusTone`). Zero formatted text strings (`"₱X"`), zero SVG path strings, and zero CSS in domain layer.
  - [x] `src/domain/forecaster.ts`: Pure domain interfaces with zero imports from server-only modules.
  - [x] `src/server/forecaster-read.ts`: Server-only request-time query assembly.
  - [x] `src/server/forecaster-store.ts` & `src/server/forecaster-service.ts`: Isolated persistence operations for scenarios, events, and nudges.
  - [x] `src/components/forecaster/*`: Client components consuming domain view models and formatting display text.
  - [x] `src/app/(shell)/forecaster/page.tsx`: Server Component entry point reading URL query parameter `?scenario=` in the shell layout.
- [x] The read model uses the current month's applied plan allocations and includes active savings buckets flagged countsTowardBuffer in the starting reserve.
- [x] Route-level `loading.tsx` and `error.tsx` (with `retry()` callback matching existing shell pages) isolated strictly within `src/app/(shell)/forecaster/` so sibling shell pages are completely unaffected.
- [x] Scenario selection updates the URL. Optimistic nudge saves run sequentially per row, preserve newer edits on interim failure, roll back on terminal failure, and flush on switch.

---

## 3. Data Model & Read Performance

- [x] SQLite Migration 4 defines `scenarios`, `scenario_events`, and `scenario_nudges` with foreign keys, check constraints, and cascade deletes.
- [x] Migration 4 creates the baseline, the partial unique index prevents duplicates, and clear and mutation operations preserve it.
- [x] Buffer draws use non-negative integer centavos, event costs use positive integer centavos, and nudge deltas use signed integer centavos.
- [x] Freed funds are derived from base allocation minus adjusted allocation. Positive amounts are freed and negative amounts are funded.
- [x] Archiving retains nudges and disables edits. Category merges re-point nudges in the merge transaction and fold merged allocations into the surviving category's base budget.
- [x] The synchronous read-model pass has a benchmark target under 10 ms on seeded household data, measured without a hard CI assertion.

---

## 4. Contract Correctness & Error Recovery

- [x] URL query parameter fallback rules:
  - [x] Missing or invalid `?scenario=` falls back gracefully to the baseline scenario ID.
- [x] Guarded calculations for all domain arithmetic:
  - [x] Zero expenses with a positive remaining buffer yields undefined runway, shown as “—”. A zero or negative buffer takes precedence and yields 0.0 mo and Risky buffer.
  - [x] Buffer draw exceeding total buffer yields negative ending buffer, formatted in critical red tone, with runway `0.0 mo` and verdict `"Risky buffer"`.
  - [x] Division-by-zero protection in chart span calculation (`span = (domainHi - domainLo) || 1`).
- [x] Baseline protection:
  - [x] API prevents deleting or renaming the baseline scenario.
  - [x] "What changes" card displays non-editable message for baseline: `"No events — this is the baseline."`.
- [x] Empty state handling:
  - [x] When the current month has no applied plan, the page renders an empty state linking to /models.

---

## 5. Test Strategy & Verification Approach

- [x] Automated unit test suite planned in `tests/domain/forecaster-calculations.test.ts` covering:
  - [x] Scenario metrics calculation with event additions, freed nudges, funded nudges, and buffer draws.
  - [x] Verdict matrix boundaries (negative cash flow, $0$, $3$, and $6$ months runway).
  - [x] 24-month outlook chart scaling, zero-rule percentage, and polyline coordinate generation.
  - [x] Nudge stepping logic and clamping at $\ge 0$.
- [x] Store and service test suite planned in `tests/server/forecaster-store.test.ts` and `tests/server/forecaster-service.test.ts` covering:
  - [x] Migration 4 schema creation and constraints.
  - [x] Scenario CRUD and cascade deletion of child events and nudges.
  - [x] Scenario duplication cloning all associated events and nudges.
  - [x] Baseline deletion and modification prevention.
- [x] The planned server read-model tests verify view assembly against the current month's applied plan, savings buffer, and empty states.
- [x] API route test suite planned in `tests/api/forecaster-routes.test.ts` verifying HTTP responses, validation errors, and mutation outcomes.
- [x] The planned component tests cover scenario switching, event additions, stepper adjustments, and queued save failures.
- [x] Browser Smoke Test walk (US1–US6) documented with step-by-step verification flows in `quickstart.md`.

---

## 6. Constitution Compliance

- [x] **Principle I & II (Specification-Driven Development)**: Comprehensive specification, plan, contracts, data model, and review checklist established before implementation.
- [x] **Principle III (Prototype as Visual Source of Truth)**: The hi-fi prototype remains the visual reference, with deviations recorded in the feature ledger.
- [x] **Principle IV (Domain Integrity)**: Forecasts remain strictly distinct from actuals; no mutations to transactions, savings records, or applied budget plans.
- [x] **Principle V (Historical Integrity)**: Archiving or modifying categories does not break scenario calculations.
- [x] **Principle VI (Single Source of Truth)**: Baseline derives from F03's current-month applied plan and active savings buffer.
- [x] **Principle X (Financial Precision)**: All monetary values stored and computed in integer centavos (`Centavos`).
- [x] **Principle XIII (Accessibility)**: Status amber text uses accessible `#8a6516` (contrast ratio 4.9:1 $\ge$ 4.5:1). Layout responsive at $\ge$1100px.
- [x] **Principle XVII (Dependencies)**: Zero new external dependencies.

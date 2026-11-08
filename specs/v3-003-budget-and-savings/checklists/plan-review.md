# Plan Review Gate: F03 — Budget & Savings

**Gate result**: PASS — re-reviewed 2026-11-08; R1–R7 addressed at the artifact level

Verify against `plan.md` and its supporting artifacts (`research.md`, `data-model.md`, `contracts/api.md`, `quickstart.md`, `deviations.md`) **before any code is written**. Every item must be checkable from the planning documents alone.

---

## 1. Spec ↔ Plan Alignment

- [x] Every spec user story (US1–US8) maps to a concrete plan phase and task.
- [x] Every spec Clarification and documented deviation (`deviations.md` D1–D11) is reflected in the plan:
  - [x] Cross-screen scope is strictly limited to `/savings`, `/models`, `mergeCategory` reusable-model allocation combine, and `seed`/`clear` CLI scripts; `/entries`, `/categories` UI panels, and `/household` panels remain untouched for F04.
  - [x] Bucket balances are **lifetime current totals** (`openingBalance + sum(all contributions) − sum(all withdrawals)`) with no automatic monthly unallocated sweep and no future-dated activity (`date <= today`).
  - [x] `/savings` includes the 4 KPI cards (`HELD IN BUCKETS`, `SAVINGS BUFFER`, `RUNWAY`, `FUNDED <MON>` using gross contributions, per-bucket shortfall sum, and `"no plan for <Mon>"` when no plan applies), month picker, `+ New bucket`, per-card actions (`Contribute`, `Withdraw`, `History`, `Edit`, `Archive`), `buffer` toggle (locked on default Cash Buffer bucket), and collapsible `Archived` section.
  - [x] All 4 bucket types (`cash_buffer`, `emergency_fund`, `goal`, `sinking_fund`) are supported with optional non-negative opening balance, optional positive target amount, optional target/due month (`YYYY-MM`), and optional description.
  - [x] Recorded contributions and withdrawals on active buckets can be edited and deleted from the bucket's History modal, enforcing non-negative lifetime bucket balances at all times; archived buckets are strictly read-only (`409 archived` on create, edit, and delete).
  - [x] `/models` includes the month picker and a selectable **Month's Plan card** at the top of the left rail above the reusable `BudgetModel` cards; clicking `Make active` / `Re-apply` writes an independent `MonthlyBudgetPlan` snapshot (copying active categories and active buckets only, with confirmation when overwriting an existing plan or applying to a past month) so later edits or deletion of reusable models never rewrite historical monthly plans.
  - [x] `/models` table uses three collapsible umbrella groups (**Income**, **Expenses**, **Savings**), derives expected income from Income category allocations, compares whichever card is currently selected against the **selected month's actuals** (`BUDGET / MO`, `ACTUAL`, `Δ`, utilization/remaining), and renders `Unallocated` planned, actual, and `Δ` in the footer.
- [x] No planned phase introduces anything listed under Non-goals (Dashboard, Forecaster, auto-sweep, sinking-fund annual-cost formula, budget rollover, member-owned buckets/models, negative bucket balances, future-dated savings activity, recurring transfers, bank sync, or mobile layout).

---

## 2. Architecture & Layer Boundaries

- [x] Layer responsibilities (`domain`, `server/db`, `server/*-store`, `server/*-service`, `server/*-read`, `api`, `components`) are strictly defined.
- [x] Dependency direction is strictly one-way: `src/domain` has zero I/O or React dependencies; raw SQL is isolated in `savings-store.ts` and `models-store.ts`; components consume domain types and server read functions.
- [x] Server Component reads (`getSavingsView`, `getModelsView`) call `await connection()` to ensure request-time execution and share `isValidMonthKey` / `currentMonthKey` from `src/domain/month.ts`.
- [x] Route-level `loading.tsx` and `error.tsx` boundaries are planned for both `/savings` and `/models`.
- [x] Mutation responses trigger `router.refresh()` to re-read authoritative server state without parallel client caches.
- [x] Financial calculations in `src/domain/savings-calculations.ts` and `src/domain/budget-calculations.ts` are UI-independent and reusable by F04 and F05.

---

## 3. Data Model & Persistence

- [x] Migration 3 adds the 6 F03 tables (`savings_buckets`, `savings_activities`, `budget_models`, `budget_model_allocations`, `monthly_budget_plans`, `monthly_budget_allocations`) via `PRAGMA user_version = 3` without resetting F01 or F02 data.
- [x] All monetary columns (`opening_balance`, `target_amount`, `amount`) use exact integer centavos (`INTEGER`) with `CHECK` constraints (`>= 0` or `> 0`).
- [x] `savings_buckets` enforces case-insensitive name uniqueness (`name_key UNIQUE`) and at most one default Cash Buffer bucket (`savings_buckets_default_unique` partial unique index + `CHECK` constraint).
- [x] `budget_model_allocations` and `monthly_budget_allocations` enforce foreign keys to both `categories(id)` and `savings_buckets(id)` with discriminated `target_type` check constraints and partial unique indexes.
- [x] `monthly_budget_plans` enforces one active plan per month (`month_key UNIQUE`) and uses `ON DELETE SET NULL` for `source_model_id` so deleting a reusable model preserves historical monthly snapshots.
- [x] Merging Category `S` into Category `D` atomically combines `S`'s allocation into `D` in `budget_model_allocations` while leaving `monthly_budget_allocations` untouched.
- [x] Local SQLite runtime and absence of speculative `createRepositories(config)` / Supabase abstractions are documented and justified per Constitution Principle VII.

---

## 4. Contract Correctness & Error Mapping

- [x] Mutation endpoints are specified for buckets (`POST`, `PATCH`, `archive`, `restore`), savings activities (`POST`, `PATCH`, `DELETE`), reusable budget models (`POST`, `PATCH`, `DELETE`, `duplicate`, `apply`), and monthly plan revisions (`PATCH /api/monthly-plans/:monthKey`).
- [x] Request bodies are validated via `readBody` before domain service invocation, with monetary amounts transported as strings and explicit `PATCH` semantics (omitted = unchanged; `""` on nullable fields clears to `null`).
- [x] Any withdrawal, activity edit/delete, or opening balance reduction that would result in a negative lifetime bucket balance is rejected with `400 validation`.
- [x] Archiving the default Cash Buffer bucket, clearing `isDefault`, changing its `type` away from `cash_buffer`, or disabling `countsTowardBuffer` without first transferring default status is rejected with `409 invalid_state`.
- [x] Creating, editing, or deleting activity on an archived bucket is rejected with `409 archived`.
- [x] Domain errors map deterministically to HTTP status codes (`400 validation`, `404 not_found`, `409 duplicate_name`, `409 archived`, `409 invalid_state`, `500 internal`).

---

## 5. Test Strategy & Verification

- [x] Unit tests planned for non-negative and optional positive centavo parsing in `tests/domain/amount.test.ts`.
- [x] Unit tests planned for lifetime bucket balances, `Math.floor` target progress, buffer, `0.1` runway, gross monthly funding, per-bucket shortfall sums, `date <= today`, and non-negative balance checks in `tests/domain/savings-calculations.test.ts`.
- [x] Unit tests planned for expected income, planned/actual/`Δ` unallocated, stacked bar percentages, donut stops, favourable-positive `Δ` (including amber tone for savings shortfalls), and transitive post-merge category folding in `tests/domain/budget-calculations.test.ts`.
- [x] Migration tests planned in `tests/server/migrations.test.ts` verifying Migration 3 upgrades an existing F01+F02 database and enforces SQLite `CHECK` constraints (including `length` and `GLOB` digit-shape checks, while calendar validity is tested in domain/service/API tests).
- [x] Service and API integration tests planned in `tests/server/savings-service.test.ts`, `tests/server/models-service.test.ts`, `tests/api/savings.test.ts`, and `tests/api/models.test.ts`.
- [x] Demo seed and clear tests planned in `tests/server/seed-clear.test.ts` covering F03 tables across the 12 rolling calendar months.
- [x] Component tests planned for `/savings` and `/models` screens, modals, charts, collapsible groups, double-submit prevention, and two-tab `404` stale-record recovery.
- [x] Browser smoke test in `quickstart.md` walks all 8 user stories' Independent Tests and the visual comparison pass.

---

## 6. Constitution Compliance (Celia's 21 Principles)

- [x] Principles I–III (SDD, Accelerated SDD, Prototype as Visual Truth): Traceable to spec and brief; deviations explicitly catalogued in `deviations.md` (`D1`–`D11`).
- [x] Principles IV–VI (Domain Integrity, Historical Integrity, Single Source of Truth): Savings activity never alters income/expenses; budget allocations never alter actual balances; monthly snapshots are isolated from template edits; post-merge historical comparisons fold merged category allocations into their merge target without double-counting while retaining stored snapshot rows; all totals are derived.
- [x] Principles VII–X (Proven Need, Clear Boundaries, Data Persistence, Financial Precision): Concrete SQLite stores, pure domain math in centavos with deterministic rounding, Migration 3 schema evolution.
- [x] Principles XI–XIV (Testing, Verification, Accessibility, Design Tokens): Comprehensive automated tests, keyboard-accessible dialogs/popovers, contrast >= 4.5:1, shared tokens, square category swatches vs. status colors.
- [x] Principles XV–XXI (AI-Assisted Development, Recoverability, Dependencies, Security/Privacy, Performance, Definition of Done, Constitutional Priority): Zero new dependencies, loopback-only server, atomic transactions, bounded phases.

---

## Review findings — 2026-11-08 (Resolved)

- **Resolved MAJOR C1 / R3 — Post-merge historical comparison policy (gate 6.2).** Defined `resolveMergedCategoryTarget` (following transitive `mergedIntoCategoryId` chains with cycle protection) in `calculateBudgetComparisonRows`. When viewing a historical `MonthlyBudgetPlan`, a merged category `S`'s stored snapshot planned amount is folded into its terminal merge target `T`'s effective planned amount (`effectivePlanned_T = planned_T + sum(planned_S)`) so `T`'s comparison against `T`'s actual spending (which includes `S`'s moved/repointed entries) is accurate without false surpluses or deficits, while `S (merged → T)` is rendered as a read-only reference row excluded from group/summary sums. Added test requirements with non-zero actuals recorded before the merge in `T005`, `T020`, `T046`, and `quickstart.md` US7.
- **Resolved MAJOR C2 — Two-mode `/models` design and comparison baseline.** Per user decisions C2a and C2b, added a selectable **Month's Plan card** at the top of the `/models` left rail above the reusable `BudgetModel` cards (selected by default when `appliedPlan !== null`), defined explicit Month's Plan vs. Reusable Model modes, defined `Make active` / `Re-apply` / `Active` button states and `ACTIVE` / `REVISED` / `DIVERGED` card badges, specified live B-vs-A comparison against whichever card is selected, and removed the global active-model fallback from `T021`.
- **Resolved MINOR C3 / R1 — Funding basis alignment (gate 1.2, 1.2.3).** Per user decision C3, standardized on **gross contributions** (`sum(contributions)` in `monthKey`) across bucket card `Funded <Mon>`, the `/savings` `FUNDED <MON>` KPI, and `/models` Savings `ACTUAL`; removed `monthlyNetFundedCentavos`; defined KPI `monthlyShortfallCentavos` as the sum of per-bucket shortfalls (`sum(max(0, planned_b − grossContributed_b))`); added `"no plan for <Mon>"` and `"no savings planned"` KPI states; and added withdrawal + two-bucket shortfall test cases in `T003`.
- **Resolved MINOR C4 / R2 — Balance reporting cutoff & future-dated activity (gate 1.2, 1.2.2).** Per user decision C4, specified that bucket balances, target progress, `HELD IN BUCKETS`, and `SAVINGS BUFFER` are **lifetime current totals** across all dates while the month picker scopes monthly funding/plan and `RUNWAY` expenses; disallowed future-dated savings activity (`date <= today`); and added two-month and future-dated test cases in `T003`, `T011`, `T015`, and `T035`.
- **Resolved MINOR C5 / R4 — Archived bucket activity deletion guard (gate 4.1).** Updated `deleteSavingsActivity` (`T010`), `DELETE /api/savings/activities/:id` (`contracts/api.md`), and tests (`T011`, `T015`) to require an active bucket and return `409 archived` if the bucket is archived, leaving the activity record unchanged.
- **Resolved MINOR C6 / R5 — Migration date-validation boundary (gate 5.4).** Explicitly scoped Migration 3 SQL `CHECK` assertions and `T007` migration tests to length and `GLOB` digit-pattern shape (matching Migration 2's `entries` table), while calendar validity (`01..12` months, leap years, and `date <= today`) is enforced and tested in domain, service, and API layers.
- **Resolved MINOR C7–C16 & INFO items.** Documented accepted `RUNWAY` actual-expense denominator (C7); unified default Cash Buffer rules across edit and archive (C8); specified archived/post-snapshot entity handling and skipping archived entities on `Make active` (C9); added confirmation dialogs for overwriting a monthly plan or revising a past month (C10); defined `Unallocated` footer `actual` and `Δ` formulas and `"Fully allocated"` / `"Overallocated"` badges (C11); specified `<10ms` local typing recalculation with `blur`/`Enter` save and `Escape` revert (C12); specified deterministic `Math.floor` progress and `0.1` runway rounding (C13); aligned `quickstart.md` setup steps and rolling 12-month seed dates `${month}-01` (C14); added tests for two-tab `404`, double-submit, and invalid `?month=` (C15); expanded `deviations.md` to `D1`–`D11` and fixed the Phase 08 reference (C16); and addressed all INFO notes (`src/domain/month.ts`, `PATCH` omitted vs `""` semantics, `product-decisions.md` conflict note, sinking-fund formula non-goal, Compliance Note cleanup, single-snapshot-per-month note, and `T054` roadmap brief link).

## Independent re-review — 2026-11-08

Original R1–R5 are addressed at the artifact level: gross funding and withdrawal assertions agree; lifetime balances and future-date rules are explicit; post-merge comparison folding and non-zero-actual tests are specified; archived activity DELETE requires an active bucket; migration tests distinguish SQL shape checks from domain calendar validation. The previous documentation observations (Phase 08 reference, roadmap brief link, and smoke setup) are also addressed. The original merge finding is closed; the following are separate edge cases in its new design.

- **MINOR R6 — Editing a folded comparison amount has no write-back contract (open 4.1).** `tasks.md:113` and `quickstart.md` US7 display the merge target's effective `BUDGET / MO` (e.g. Groceries PHP25,000 = PHP20,000 raw + PHP5,000 Dining out). T043 (`tasks.md:412`) makes that target editable, locking only the source reference row. But `PATCH /api/monthly-plans/:monthKey` sets one raw target allocation and leaves source snapshot rows intact. Entering PHP26,000 and sending it as the target's amount therefore produces PHP31,000 after reload. Define whether the editor changes raw or effective allocation, its label/value and request transformation, and behavior when the requested effective total is less than the folded source sum (or when the terminal target is archived). Keep stored history changes explicit. Add an edit-save-reload test on the merged target, not just a display test.
- **MINOR R7 — Read-model filtering can omit nodes required for merge resolution (open 6.2).** T021 (`tasks.md:245`) includes inactive categories only when they have non-zero allocations or actuals, while T005 follows `mergedIntoCategoryId` chains using that supplied category map. For a historical plan with S=PHP5,000 and D=PHP0, no actuals, then S merged into D and D archived, D satisfies neither inclusion condition. Similarly, an unallocated/zero-actual intermediate category in S -> D -> T is omitted. The resolver cannot reach the required terminal target, risking a missing folded amount, incorrect totals, or an unresolved reference. Require the read helper to include the transitive merge-target closure of retained categories (or provide a separate complete resolution map), including archived zero-allocation/zero-actual targets. Test these scenarios through getModelsView, not only a pure helper given a complete hand-built category map.

Coverage: rechecked the updated spec, plan, tasks, data model, research, API/read contracts, quickstart, deviations, roadmap, and this gate against the original findings and the repo review prompt. This remains an artifact review; no source or tests changed and no implementation tests run. Only this worksheet was edited.

## Follow-up re-review — 2026-11-08 — PASS

- **Resolved R6 (gate 4.1):** Spec US7 AC2, data-model comparison types/rules, research R6, plan Data Flow 4, and T005/T043 now consistently separate the editable raw target allocation from its effective folded comparison amount. The input edits and PATCH persists only `rawPlannedCentavos`; the effective total is a labeled subtitle. Archived targets are read-only or zero-out-only. T020/T046 and quickstart US7 require edit/save/reload verification (raw PHP20,000 -> PHP21,000, source PHP5,000 preserved, effective PHP26,000). The existing single-target PATCH contract remains suitable.
- **Resolved R7 (gate 6.2):** Spec US7 AC2, data-model rules, research R6, plan Data Flow 4, T021, and the ModelsViewData contract require the transitive merge-target closure, including zero-allocation/zero-actual intermediate nodes and archived terminal targets. Verified the referenced existing `listCategories(db, { includeMerged: true })` can retrieve both merged and archived categories. T020 explicitly requires getModelsView integration tests for both reported cases.
- Original R1–R5 remain addressed. Related smoke assertions now distinguish the raw input from the effective comparison, include Rent in group totals, and correctly expect the seeded Car savings shortfall. No new non-INFO findings identified in this follow-up artifact review.

Coverage: review prompt, checklist and review history; related updated spec, plan, tasks, data model, API/read contracts, research, quickstart, and deviations; existing category-store read capability. Restored the two remaining gate checks after verifying their resolutions. Only this worksheet was edited; no implementation tests were run. PASS establishes package readiness for implementation, not implemented behavior or release acceptance.

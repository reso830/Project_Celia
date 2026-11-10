# Plan Review Gate: F04 — Dashboard & Reporting

**Gate result**: FAIL — pending independent re-review of MINOR 1 (combined filters) and MINOR 2 (owner=household link-only view) (2026-11-10)  
**Date**: 2026-11-09 (revised 2026-11-10) | **Spec**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md)

Verify against `plan.md` and its supporting artifacts (`research.md`, `data-model.md`, `contracts/api.md`, `quickstart.md`, `deviations.md`) **before any implementation code is written**. Every item is checkable from the planning artifacts alone.

---

## 1. Spec ↔ Plan Alignment

- [x] Every spec user story (US1–US7) maps directly to concrete plan phases and implementation tasks.
- [x] Every approved clarification from `### Session 2026-11-09` and `### Session 2026-11-10` is honored in the plan:
  - [x] Burn Rate gauge displays selected month's Budget Utilization % (`Math.round((expenses / budget) * 100)%`) with status bands `<85%` green, `85–115%` amber, `>115%` red.
  - [x] Runway is calculated as `Savings Buffer ÷ selected month's actual expenses` formatted as `"N.N months runway"` (or `"—"` when expenses are zero).
  - [x] "Upcoming commitments" derives dynamically from F03 Sinking Fund and Goal buckets with target dates (`targetMonth >= selectedMonthKey`) and a defined target amount (`targetAmount > 0`). Fully funded commitments remain in the list displaying `"₱0 left · Funded"`.
  - [x] Owner filter distinguishes `"all"` (All members / Everyone), `"household"` (Household-owned only where `owner_member_id IS NULL`), and `<memberId>` (Individual member).
  - [x] In "Expense per member", clicking an active member row **filters the dashboard in-place** to that member (`?member=<id>`), and clicking it again clears back to `"all"`, matching canonical prototype `HF#L974`. It does not navigate away to `/entries`.
  - [x] In the Categories table, clicking an active category row navigates to `/entries` with bounded query parameters and explicit drill-down figure matching rules:
    - Under All members (`member=all` or unset): `/entries?month=YYYY-MM&category=<id>`, entries table sum and Expense total chip match dashboard category spend.
    - Under Individual member (`member=<id>`): `/entries?month=YYYY-MM&category=<id>&owner=<id>`, summary chip's "own" figure (`ownExpenseCentavos`) matches dashboard member category spend.
    - Under Household (`member=household`): `/entries?month=YYYY-MM&category=<id>&owner=household`, operates as a link-only Household view on `/entries` with `"Household only ▾"` chip label and suppressed `"own · shared"` breakdown, matching dashboard household category spend.
  - [x] F02's approved member filter rule on `/entries` remains **100% intact**: choosing a member displays member entries plus Household-owned entries, with Household rows marked and summary chips displaying `own · shared` (`₱X own · ₱Y shared`).
  - [x] Archived member rows in "Expense per member" and archived category rows in the Categories table are display-only (non-clickable).
  - [x] Single authoritative savings rule: active buckets only across current metrics and historical buffer running balance.
  - [x] A bucket's opening balance contributes to the buffer sparkline **only for months on or after that bucket's creation month** (`substr(createdAt, 1, 7) <= monthKey`). Running buffer balances carry forward across gap months; zero rule applies to monthly activity totals only. Backdated activities respect effective transaction dates.
  - [x] Zero budget with actual spend displays `"Overspent"`, subtitle `"No budget allocated"`, critical red tone, and full 270° arc (1.0).
  - [x] Income category filter handling: Burn Rate gauge displays `"—"` with `"Income category selected"` in neutral tone (`#636f73`) and 0% arc; trend chart and categories table display empty states.
  - [x] Category item moves follow F01/F03 behavior: all historical entries move to the new category while budget allocation snapshots remain untouched.
  - [x] Categories table `↺` column displays current-period unspent allocation (`budget − spent` when positive, or `—` when zero/overspent) without multi-month rollover.
- [x] Documented deviations (`deviations.md` D1–D8) are explicitly accounted for in component and read-model tasks with corrected citations.
- [x] Non-goals remain strictly excluded: no forecasting, no standalone net cash flow KPI, no category % of total column, no income/net per member panels, no automated cash buffer sweeps, no bank sync, no multi-currency forex, and no mobile layouts under 1100px.

---

## 2. Architecture & Layer Boundaries

- [x] Clear layer separation:
  - [x] `src/domain/dashboard-calculations.ts`: Pure, zero-dependency calculation functions returning normalized points (`0..1`), ratios, and domain enums (`BurnRateDisplayState`, `GoalFundingStatus`, `statusTone`). Zero formatted text strings (`"SEP 2026"`, `"₱X"`, `"Zero budget · ₱0 spent"`), zero SVG path strings, and zero CSS gradients in domain layer. Sparkline normalization helper handles empty array, singleton $N=1$ (`{ x: 0.5, y: val > 0 ? 0.5 : 0 }`), flat zero ($y=0$), flat positive ($y=0.5$), and peak scaling. Presentational conversion (`svgX = x * 120`, `svgY = 44 - y * 36`) lives strictly in `savings-buffer-hero.tsx`.
  - [x] `src/domain/dashboard.ts`: Pure domain interfaces with **zero imports from server-only modules**. Modal data types defined directly in domain, with `DashboardModalCategory.items` declared mutable for direct `EntryModal` compatibility.
  - [x] `src/server/dashboard-read.ts`: Server-only request-time query assembly invoking `await connection()`.
  - [x] `src/components/dashboard/*`: Presentational and interactive client components consuming domain view models and formatting display text.
  - [x] `src/app/(shell)/(dashboard)/page.tsx`: Server Component entry point reading URL query parameters in isolated route group.
- [x] Reuse of authoritative F03 calculations: `calculateSavingsKpis` and `calculateBucketMetrics` (including `progressPercent`) from `@/domain/savings-calculations`, and `calculateBudgetComparisonRows` from `@/domain/budget-calculations`.
- [x] Route-level `loading.tsx` and `error.tsx` (with `retry()` callback matching existing shell pages) isolated strictly within `src/app/(shell)/(dashboard)/` so `/categories`, `/household`, and `/forecaster` are completely unaffected.
- [x] Filter changes update URL query parameters (`?month=`, `?member=`, `?category=`, `?range=`), triggering native Next.js RSC re-rendering without bespoke client fetch caching.
- [x] `+ Add entry` CTA opens existing `EntryModal` populated with full `modalCategories` and `modalMembers`, revalidating server data on submit via `router.refresh()`.
- [x] Bounded `/entries` task `T008` reads `searchParams` for `category` and `owner` (supporting link-only `"Household only ▾"` view and falling back unknown owners to `'all'`) without altering F02 filter behavior, summary chips, or row marking.

---

## 3. Data Model & Read Performance

- [x] Confirmed that F04 introduces zero new database tables, columns, indexes, or migrations.
- [x] Confirmed that all monetary calculations are performed in exact integer centavos (`INTEGER`), avoiding floating-point rounding errors.
- [x] Historical 12-month trend queries use real schema joins:
  `entries` joined with `items` (for `category_id`) and `categories` (for `umbrella_id AS type`), using half-open date bounds (`WHERE e.date >= :startDate AND e.date < :nextMonthStart`).
- [x] Transitive category merge closure is preserved using F03's `calculateBudgetComparisonRows` with `foldMergedCategories: true`, and folded merge rows are excluded from totals to prevent double-counting.
- [x] Archived categories and archived members with historical transactions in the selected month are preserved in breakdowns, ensuring totals sum exactly to `EXPENSES`, and are marked non-clickable.
- [x] Historical savings buffer calculation rules strictly defined: active buffer buckets only, opening balance gated by creation month, point-in-time contribution/withdrawal sums, balance carry-forward across gap months, and effective financial date handling for backdated activity.

---

## 4. Contract Correctness & Error Recovery

- [x] URL query parameter fallback rules are defined:
  - [x] Invalid or missing `?month=` falls back to `currentMonthKey()`.
  - [x] Invalid `?member=` falls back to `'all'` (valid: `'all'`, `'household'`, or active member UUID).
  - [x] Invalid `?category=` falls back to `'all'`.
  - [x] Invalid `?range=` falls back to `6`.
- [x] Card-by-Card Filter Scope Matrix fully specified in `data-model.md §2`, covering All, Household, Member, Expense Category, Income Category, Member & Expense Category, Household & Expense Category, and Member/Household & Income Category.
- [x] KPI delta semantics fully specified against `MonthlyBudgetPlan`:
  - [x] Income delta: `actualIncome - plannedIncome`
  - [x] Expense delta: `plannedExpenses - actualExpenses` (favourable-positive: $>0$ unspent green, $<0$ overspent red)
  - [x] Savings delta: `actualSavings - plannedSavings` (favourable $\ge 0$, $<0$ warning text `#8a6516`)
  - [x] Unallocated delta: `actualUnallocated - plannedUnallocated`
  - [x] `unallocatedScope` handles `"all"`, `"household"`, and `"member"`
  - [x] Deltas set to `null` when `hasMonthlyPlan === false`, under any owner filter (D2), or under combined owner & category filters (Owner filter delta rule).
- [x] Zero-division edge cases are guarded across all domain calculation functions:
  - [x] Zero monthly expenses yields `runwayMonths = null` (`"—"`).
  - [x] Applied zero planned budget yields `utilizationPercent = null, arcRatio = 0, state = "zero_budget_zero_spend"` when actual expenses are zero, and `utilizationPercent = null, arcRatio = 1.0, state = "zero_budget_overspent", tone = "critical"` when actual expenses > 0.
  - [x] Chart peak scaling guarded via `Math.max(1, ...)` eliminating `0/0` on empty data.
  - [x] Unfunded goals yield `"No contributions this month · ₱X left"` with no infinite projection.
  - [x] Fresh installs with zero rows render clean empty states without thrown exceptions.

---

## 5. Test Strategy & Verification Approach

- [x] Automated unit test suite planned in `tests/domain/dashboard-calculations.test.ts` covering sparkline ratios (with $N=1$ singleton expected finite value `{ x: 0.5, y: 0.5 }`, flat zero, flat positive, ascending, descending, and empty series), 270° gauge arc geometry, budget utilization thresholds, peak scaling, runway edge cases, zero-funding goal notes, and income category filter state.
- [x] Bounded `/entries` component test in `tests/components/entries/entries-screen.test.tsx` verifying initial query parameter pre-selection, matching entries table rendering, `"Household only ▾"` chip label, summary chips suppression, and dropdown option transition.
- [x] Server read model test suite planned in `tests/server/dashboard-read.test.ts` testing 12-month aggregations, member filtering, Household sentinel, combined owner + category filters, buffer/runway consistency with `/savings`, category totals equalling `EXPENSES`, item moves, creation-month opening balance gating, gap month carry-forward, backdated activity, bucket archiving, income category scope, and in-place member filter toggle.
- [x] Component test suite planned in `tests/components/dashboard/dashboard-screen.test.tsx` verifying rendering of all 4 rows, interactive range toggle, drill-down links, `EntryModal` save/refresh flow (submitting form, asserting mock `fetch` called with `POST /api/entries` and payload, toast notification, modal closed, and `router.refresh()` called), `loading.tsx` skeleton, and `error.tsx` retry button.
- [x] Browser Smoke Test walk (US1–US7) documented with explicit step-by-step verification flows in `quickstart.md`, aligning 1-to-1 with Phase 07 tasks `T030`–`T036`.

---

## 6. Constitution Compliance

- [x] Constitution Principle III: Hi-fi prototype faithfully reproduced, with intentional additions tracked in `deviations.md` (D1–D8).
- [x] Constitution Principle IV: Domain integrity enforced; savings are not counted as expenses; available funds / net cash flow correctly calculated; KPI plan deltas clearly specified with owner-filter precedence.
- [x] Constitution Principle VI: Single Source of Truth; reuses F03 domain calculation engines (`calculateSavingsKpis`, `calculateBucketMetrics`, `calculateBudgetComparisonRows`).
- [x] Constitution Principle VIII: Clear layer boundaries; domain returns math fractions, ratios, and semantic enums; UI presentation formatting isolated to components; zero server imports in domain; modal categories compatible with `EntryModal`.
- [x] Constitution Principle X: Integer centavo representation strictly enforced; deterministic rounding rules applied.
- [x] Constitution Principle XIII: Desktop width targets 1280–1440px; horizontal scroll eliminated at $\ge$1100px; text contrast $\ge$ 4.5:1 verified (`#8a6516` warning text).
- [x] Constitution Principle XIV: Design system tokens reused from `globals.css`; zero drop shadows; 1px borders for visual separation.
- [x] Constitution Principle XVII: Zero new production or development dependencies introduced.

---

## Independent follow-up review — 2026-11-10 (current revision)

**Verdict: Gate FAIL (pending independent re-review of MINOR 1 & MINOR 2).** Addressed items submitted for review:

1. **MINOR 1 — Combined Member/Household & Category Filter Rules Restored**:
   - `data-model.md §2` restored the full Combined Filter Scope Matrix covering:
     - `Member & Expense Category`: scopes actuals to that member in that category; sets all KPI deltas to `null` (Owner filter delta rule: category budget is household-wide and cannot be compared to a single member's spend); Burn Rate gauge shows household burn rate; trend and category tables display that category.
     - `Household & Expense Category`: scopes actuals to Household (`owner_member_id IS NULL`) in that category; sets all KPI deltas to `null`; Burn Rate gauge shows household burn rate.
     - `Member or Household & Income Category`: returns member/household income in that category; sets expenses to `—`; sets all deltas to `null`; Burn Rate gauge shows `"—"` (`state: "income_category"`); trend, table, and distribution cards render empty states (`isApplicable: false`).
   - `tasks.md T009` and `T011` updated to explicitly test these combined filter combinations.

2. **MINOR 2 — owner=household Link-Only View on /entries Defined**:
   - `contracts/api.md §2.5`, `data-model.md`, `spec.md`, `tasks.md T008`, `quickstart.md Test 4`, and `deviations.md` (new D8) define `owner=household` as a link-only view on `/entries`:
     - Header owner chip button displays `"Household only ▾"` (distinct from F02's `"Household ▾"` = everyone).
     - `SummaryChips` suppresses the `"0 own · ₱X shared"` breakdown and displays simply the total shared amount (`Expense ₱X`).
     - Entries table displays only entries where `owner_member_id === null`.
     - Selecting another option from the dropdown transitions back to F02's standard filters.
     - `filterEntries` and existing F02 dropdown options remain untouched.
     - `tests/components/entries/entries-screen.test.tsx` in `T008` adds RTL test coverage for `"Household only ▾"` chip label, summary chip suppression, and dropdown option switching.

3. **INFO Items**:
   - `spec.md` line 37 aligned with `T005`: "sum to total household EXPENSES".
   - `checklists/plan-review.md` Gate Result set to `FAIL` pending reviewer verification.
   - Full baseline, favorable sign, and filter semantics defined against `MonthlyBudgetPlan` in `spec.md`, `data-model.md §2`, `tasks.md T009/T014`, and `plan.md`:
     - Income delta: `actual − planned` (favourable $\ge 0$).
     - Expense delta: `planned − actual` (favourable-positive: $>0$ unspent green, $<0$ overspent red).
     - Savings delta: `actual − planned` (favourable $\ge 0$, $<0$ warning text `#8a6516`).
     - Unallocated delta: `actual − planned`.
     - `unallocatedScope` handles `"all"`, `"household"`, and `"member"`.
     - Deltas evaluate to `null` when unbudgeted (`hasMonthlyPlan === false`) or under member filter (D2).

4. **Automated Modal Save & Refresh Coverage Added to T024**:
   - `tasks.md T024` explicitly includes testing direct entry save via `EntryModal`: form submission, mocking `POST /api/entries` with exact payload `{ type, amount, date, itemId, ownerMemberId, note }`, toast presentation, modal close, and `router.refresh()` invocation.

5. **Deviations Ledger Fully Restored**:
   - `deviations.md` tracks all 7 deviations D1–D7, including D4 (unbudgeted/empty states) and D5 (`#8a6516` contrast), with accurate citations.

All 67 checklist items are checked [x]. Planning artifacts are consistent, unambiguous, and ready for Phase 01 implementation.

Artifacts reviewed: spec, plan, tasks, data model, contracts, research, quickstart, deviations, and checklist, using the already-inspected F02/F03 source contracts for integration checks. No workflow ledger exists separately in this package. Only this worksheet was edited. No implementation, test execution, build, database wipe, or seeding was performed.
---

## Independent verification of latest resolutions — 2026-11-10

**Verdict: Ready. Gate: PASS.** Verified the four latest findings against their owning artifacts, rather than relying on the submitted PASS note:

- Category drill-down now defines the exact figure to compare under all/member/Household scopes: total Expense, own Expense, or shared Expense respectively. Contracts, spec, plan, quickstart, and T008 consistently retain F02's member-plus-shared behavior, with explicit tests for the destination figures and unknown-owner fallback.
- T002 now specifies normalized unit-square coordinates, finite singleton output, flat-zero/flat-positive behavior, and UI-only pixel conversion; research and data-model rules match. Earlier coordinate-space and singleton findings are closed.
- KPI deltas now have a selected MonthlyBudgetPlan baseline, explicit signs and formulas, null/missing-plan behavior, and owner/category scope rules. Earlier undefined-delta finding is closed.
- T024 explicitly covers EntryModal form submission, POST payload, toast, modal closure, router.refresh, range toggling, and drill-down. Mutable modal items remain compatible with the existing modal interface.

No new actionable CRITICAL, MAJOR, or MINOR findings raised. Checked items certify pre-implementation planning readiness only. Existing implementation, automatic tests, database behavior, prototype fidelity, and manual acceptance are not certified by this gate.

Coverage: current spec, plan, tasks, data model, research, contracts, quickstart, deviations D1–D7, and worksheet; relevant existing Entries filter/summary/modal interfaces were cross-checked. Earlier reviewed brief/constitution context remains applicable. No separate workflow ledger exists in this package. Only this worksheet was edited; no implementation, runtime tests, build, seeding, or clearing was performed.
# Feature Specification: F03 — Budget & Savings

**Feature Branch**: `v3-003-budget-and-savings`
**Created**: 2026-11-08
**Status**: Approved
**Input**: `docs/features/v3-003-budget-and-savings.md`
**Design reference**: `handoff/celia_v3_001.zip` (hi-fi prototype: Savings buckets and Budget
models screens; `README.md`; `product-decisions.md`; `data/seed.json`)

## Clarifications

### Session 2026-11-08

- Q: Which cross-screen integrations and deferred placeholders are in scope for F03 alongside `/savings` and `/models`? → A: Only `/savings`, `/models`, and the `seed`/`clear` CLI scripts. Deferred placeholders on `/entries` (modal budget preview strip), `/categories` (detail spend panel, burn gauge, item month totals, and Merge/Archive model-impact sections), and `/household` (`Active model` line and financial panels) remain untouched for F04.
- Q: How do savings bucket balances and the prototype's "Cash buffer" sweep work with F03's explicit contributions and withdrawals? → A: A bucket's current balance is a **lifetime current total** derived strictly from `opening balance + all explicit contributions − all explicit withdrawals` across all recorded dates (future-dated activity `date > today` is disallowed). There is no automatic monthly unallocated sweep into bucket balances. The `/savings` month picker scopes only the monthly funding figures (`FUNDED <MONTH>` KPI, per-bucket `Funded <Mon>`, and the month's planned savings target) and the `RUNWAY` denominator (`Savings Buffer ÷ selected month's actual household expenses`, accepted even when viewing a partially elapsed month).
- Q: Which basis (gross contributions vs. net of withdrawals) is used for monthly savings funding across `/savings` and `/models`? → A: **Gross contributions (`sum(contributions)` in the selected month)** are used everywhere: on each bucket card's `Funded <Mon>`, on the `/savings` `FUNDED <MONTH>` KPI, and on `/models`'s Savings `ACTUAL` column. The `FUNDED <MONTH>` KPI shortfall is the **sum of per-bucket shortfalls** (`sum(max(0, planned_b − grossContributed_b))`) so over-funding one bucket never hides another bucket's shortfall, and shows `"no plan for <Mon>"` (or `"no savings planned"`) in muted text when no savings plan is applied to the month.
- Q: How are bucket management, contributions/withdrawals, and activity history presented on `/savings` given the hi-fi prototype only shows static bucket cards with a buffer toggle? → A: Add a month picker and `+ New bucket` button in the `/savings` header; `Contribute`, `Withdraw`, `History`, `Edit`, and `Archive` actions on each bucket card; modals for creating/editing buckets and recording contributions/withdrawals; a history modal/drawer per bucket showing its recorded activity; and a collapsible `Archived` section for archived buckets (with `Restore` and read-only `History`).
- Q: How do bucket types and recorded contribution/withdrawal history behave? → A: Support all 4 brief types (`Cash Buffer`, `Emergency Fund`, `Goal`, `Sinking Fund`), where `Goal` and `Sinking Fund` have an optional target amount and optional target/due month (`YYYY-MM`), and `Cash Buffer` / `Emergency Fund` may also have an optional target amount. Every bucket has an optional description and optional non-negative opening balance. Recorded contributions and withdrawals on active buckets can be edited or deleted from the bucket's history modal as long as the resulting bucket balance never goes negative. Archived buckets are strictly read-only (cannot add, edit, or delete activity).
- Q: How does `/models` separate viewing/revising the selected month's applied plan from editing a reusable model template, and what does Budget-vs-Actual compare against? → A: The left rail on `/models` shows the **selected month's applied plan as its own selectable card at the top** (above the reusable `BudgetModel` cards), selected by default when the month has an applied plan. Selecting the Month's Plan card edits/revises that month's snapshot (`PATCH /api/monthly-plans/:monthKey`); selecting a Reusable Model card edits that reusable template (`PATCH /api/models/:id`). In both modes, the `ACTUAL` / `Δ` columns, charts, and `Unallocated` footer compare **whichever card is currently selected** against the selected month's actuals (providing a live preview when clicking a reusable model card). Overwriting an existing monthly plan (`Make active` / `Re-apply`) or revising a past month (`< currentMonth`) requires user confirmation.

## Problem Statement

F01 established Celia's household, members, and category/item structure, and F02 added the authoritative record of actual income and expense entries. However, users still have no way to organize savings separately from expenses, track progress toward financial goals, or define monthly budget plans against which actual spending and savings can be evaluated. F03 introduces **Savings Buckets** (with explicit contribution and withdrawal tracking) and **Budget Models** (reusable household allocation templates that can be applied as monthly snapshots and compared against actual monthly activity).

## Scope

**In scope**

- **Savings Buckets** under the Savings umbrella:
  - Fields: stable identity, name (unique case-insensitively across buckets), type (`Cash Buffer`, `Emergency Fund`, `Goal`, `Sinking Fund`), optional non-negative opening balance (default `₱0`), optional positive target amount, optional target/due month (`YYYY-MM`, for `Goal` and `Sinking Fund`), optional description, `countsTowardBuffer` boolean flag (locked `true` on the default Cash Buffer bucket), `isDefault` flag (at most one default Cash Buffer bucket), archived state (`archivedAt`), and creation/update timestamps.
  - Derived bucket metrics: lifetime current balance (`openingBalance + sum(all contributions) − sum(all withdrawals)`), amount remaining to target (`max(0, targetAmount − currentBalance)`), percentage of target achieved (deterministic integer floor `Math.floor((currentBalance * 100) / targetAmount)`, so `100%` appears only when `currentBalance >= targetAmount`), and selected-month gross contributions (`monthlyContributionsCentavos`), withdrawals (`monthlyWithdrawalsCentavos`), planned monthly contribution (`plannedMonthlyCentavos`), and per-bucket monthly shortfall (`max(0, plannedMonthly − monthlyContributions)`).
  - Creating, editing, archiving, and restoring savings buckets.
- **Savings Contributions and Withdrawals**:
  - Recording money moving into (`contribution`) or out of (`withdrawal`) an active savings bucket with exact positive PHP amount (centavos allowed), calendar date (`YYYY-MM-DD`, must not be in the future: `date <= today`), operation type, and optional note.
  - Viewing, editing, and deleting recorded contribution/withdrawal items for an active bucket, enforcing that a bucket's balance never becomes negative. Archived buckets are strictly read-only (`409 archived` on create, edit, or delete of activity).
  - Strict separation from F02 income/expense entries: contributions do not create expenses, and withdrawals do not create income.
- **The Savings Buckets screen (`/savings`)** at hi-fi fidelity:
  - Header with month picker and `+ New bucket` primary CTA.
  - Four KPI cards:
    - `HELD IN BUCKETS`: sum of lifetime current balances across active buckets and active bucket count (`"N buckets"` / `"1 bucket"`).
    - `SAVINGS BUFFER`: sum of lifetime current balances of active buckets where `countsTowardBuffer` is `true` (`"counted buckets only"`).
    - `RUNWAY`: `Savings Buffer ÷ selected month's actual household expenses` formatted to 1 decimal place via `Math.round((buffer * 10) / expenses) / 10` (`"N.N mo"`), or `"—"` when the selected month's actual expenses are `0`. Using the selected month's actual expenses (even when viewing a partially elapsed current month) is the accepted specification matching the prototype.
    - `FUNDED <MONTH>`: sum of gross contributions recorded in the selected month across **active buckets only** (`monthlyFundedCentavos`), with planned savings and per-bucket shortfalls also scoped strictly to **active buckets** (`monthlyPlannedSavingsCentavos = sum(planned_b for active b)`, `monthlyShortfallCentavos = sum(max(0, planned_b − funded_b) for active b)`), and subtitle showing `"₱X short"` in amber (`#b9822c`) when `monthlyShortfallCentavos > 0`, `"on plan"` in status green (`#3f7d5c`) when active planned savings > `₱0` and per-bucket shortfall sum is `0`, `"no savings planned"` in muted text when a monthly plan exists with `₱0` planned savings across active buckets, or `"no plan for <Mon>"` in muted text when no `MonthlyBudgetPlan` is applied for the selected month.
  - Bucket cards showing name, `DEFAULT` / `COUNTED` badge, type & target/due month subtitle, lifetime current balance in Mono, progress bar (amber `<100%`, green `>=100%` for targeted buckets; teal for open-ended buckets without a target), progress/remaining and target/percentage labels, `Funded <Mon>` line (selected month's gross contributions vs. planned monthly allocation), interactive `buffer` toggle switch (locked on default bucket), and card actions (`Contribute`, `Withdraw`, `History`, `Edit`, `Archive`).
  - Modals for bucket creation/editing, contribution/withdrawal entry, and per-bucket activity history (with edit and delete confirmation on active buckets; read-only on archived buckets).
  - Collapsible `Archived` buckets section allowing historical inspection and restoration.
  - Empty, loading, and error states.
- **Budget Models & Monthly Budget Plans**:
  - Reusable budget models with name (unique case-insensitively across models), optional description, planned monthly allocations per active Income and Expense category, and planned monthly allocations per active Savings bucket.
  - Creating, editing (name, description, and per-category/per-bucket allocations), duplicating, and deleting reusable budget models (with confirmation on delete).
  - Derived model totals: `Expected Income` (sum of Income category allocations), `Planned Expenses` (sum of Expense category allocations), `Planned Savings` (sum of Savings bucket allocations), and `Unallocated = Expected Income − Planned Expenses − Planned Savings`.
  - Clear visual identification of fully allocated (`Unallocated = 0` and `Expected Income > 0`), unallocated surplus (`Unallocated > 0`, teal), and overallocated (`Unallocated < 0`, status red) states.
  - Monthly budget application: applying a model to a selected calendar month (`YYYY-MM`) via `Make active` / `Re-apply`, storing one active `MonthlyBudgetPlan` snapshot per month (copying only active categories and active buckets) so later edits or deletions of reusable models never rewrite historical monthly plans, and allowing explicit revision of a month's applied plan (with confirmation when overwriting an existing plan or revising a past month).
- **The Budget Models screen (`/models`)** at hi-fi fidelity:
  - Header with month picker and `+ New model` control.
  - Left column (`model-list.tsx`):
    - **Top card — Selected Month's Applied Plan**: selectable card for `<Mon YYYY> plan` (with `ACTIVE` badge, source model name, `"revised"` indicator when edited directly, `₱X exp · ₱Y sav`, and `unallocated ₱Z/mo`), or a muted `"No plan applied for <Mon YYYY>"` card when the month has no snapshot yet. Selected by default when the month has an applied plan.
    - **Reusable Models list**: selectable cards for each reusable `BudgetModel` showing model name, `ACTIVE` badge when `appliedPlan.sourceModelId === model.id && !appliedPlan.isRevised && !appliedPlan.hasTemplateDiverged` (or `"DIVERGED"` / `"REVISED"` pill when the month's plan was revised or the template changed after application), summary lines (`₱X exp · ₱Y sav` and `unallocated ₱Z/mo`), and `+ New model` button.
  - Right detail pane (`models-screen.tsx`):
    - Supports two explicit modes based on which left-rail card is selected:
      1. **Month's Plan Mode** (when the top Month's Plan card is selected): edits revise the selected month's snapshot (`PATCH /api/monthly-plans/:monthKey`, locked behind an `"Unlock to revise past plan"` confirmation when `monthKey < currentMonth`), header shows `Re-apply template` (when `sourceModelId` exists and `isRevised || hasTemplateDiverged`) or disabled `Active`, and B-vs-A compares the month's applied plan against the month's actuals.
      2. **Reusable Model Mode** (when a reusable `BudgetModel` card is selected): edits update the reusable template (`PATCH /api/models/:id`), header shows `Edit` (metadata modal), `Duplicate`, `Make active` / `Re-apply` / disabled `Active`, and `Delete`, and B-vs-A live-previews that model's allocations against the selected month's actuals.
    - `"Where the income goes"` 100% stacked bar splitting planned income into `Expenses` (`#8c8378`), `Savings` (`#2f7d78`), and `Unallocated` (`#c3cac9`, when positive), with percentage labels inside segments, `"Fully allocated"` note when `Unallocated = 0`, and `"Overallocated by ₱X"` red badge when `Unallocated < 0`.
    - Chart row with `"Expense breakdown"` conic donut chart (by category colour) and `"Budget vs actual (Δ)"` diverging bar chart (surplus up, deficit down around a zero line, per expense category for the selected month).
    - Collapsible umbrella groups (**Income**, **Expenses**, **Savings**) with group header totals and rows showing `CATEGORY / BUCKET`, editable `BUDGET / MO` (with instant `<10ms` local recalculation while typing and server `PATCH` on `blur` or `Enter`), selected month's `ACTUAL` (gross contributions for Savings; F02 entries for Income/Expenses), `Δ` (favourable-positive: `budget − actual` for expenses; `actual − budget` for income and savings, with savings shortfalls in amber `#b9822c` and never red), and utilization/remaining indicators.
    - Footer row showing `Unallocated` planned (`expectedIncome − plannedExpenses − plannedSavings`), actual (`actualIncome − actualExpenses − actualSavings`), and `Δ` (`actualUnallocated − plannedUnallocated`), plus `"Fully allocated"` / `"Overallocated"` pill badge.
  - Empty, loading, and error states.
- **Historical Integrity**:
  - Archiving a category or savings bucket preserves all past monthly budget plans and savings activity.
  - Merging Category `S` into Category `D` (F01) atomically combines Category `S`'s planned allocation into Category `D`'s allocation in reusable budget models while keeping historical `monthly_budget_allocations` rows untouched. When displaying a historical monthly plan after a merge (including chained merges `S → D → T` across the transitive `mergedIntoCategoryId` closure), `S`'s stored snapshot allocation is folded into its terminal merge target `T`'s effective planned amount (`plannedCentavos = rawPlanned_T + sum(rawPlanned_S)`) for B-vs-A comparison (matching `T`'s actual spending, which now includes `S`'s moved/repointed entries, without double-counting), while `T`'s `BUDGET / MO` input displays and edits `T`'s own stored amount (`rawPlanned_T`) with a subtitle showing the combined effective budget (`"₱25,000 effective (+₱5,000 from Dining out)"`), and `S (merged → T)` is rendered as a read-only historical reference row showing its stored snapshot amount.
- **Persistence & Demo Tooling**:
  - SQLite Migration 3 adding F03 tables without losing or resetting F01 or F02 data.
  - Reusable, UI-independent domain calculations for bucket balances, buffer, runway, model allocations, monthly snapshots, and budget-vs-actual comparisons (consumable by F04 and F05).
  - Extending `npm run seed` and `npm run clear` to seed and clear F03 buckets, savings activity, reusable models, and monthly applied plans from `scripts/seed.json` across the same 12 rolling calendar months ending with the current month as F02's entry seeding.
  - Automated unit, integration, API, and component tests.

**Non-goals**

- Updating `/entries` (the Add/Edit entry modal's budget preview strip remains out of scope until F04).
- Updating `/categories` (the category detail spend panel, burn gauge, items table month totals, and Merge/Archive dialog model-impact UI remain out of scope until F04).
- Updating `/household` (the `Active model` line in Defaults and the member financial panels remain out of scope until F04).
- Implementing the Dashboard (`/`) or Forecaster (`/forecaster`) screens.
- Automatic sweeping of monthly unallocated income into the Cash Buffer bucket's balance.
- Automatic sinking-fund `"annual cost ÷ months"` monthly contribution calculation (mentioned in `product-decisions.md:13`; sinking funds use explicit user-entered target amount, target/due month, and budget allocations).
- Automatic budget rollover between calendar months.
- Storing multiple historical revision versions for the same month (each `monthKey` maintains a single active `MonthlyBudgetPlan` snapshot updated in place on revision or re-application).
- Treating savings contributions as expenses or savings withdrawals as income.
- Automatically generating entries or savings activity when creating or applying a budget model.
- Member-specific ownership of savings buckets or budget models (both are household-level in F03).
- Negative savings bucket balances or future-dated savings activities (`date > today`).
- Automated bank transfers, bank sync, CSV import/export, interest accrual, investment portfolios, or debt amortization engines.
- Recurring or scheduled savings contributions/withdrawals.
- Multi-currency budgeting or custom month start dates.
- Mobile layouts (`<1100px` width).

## User Scenarios & Testing

### User Story 1 — Create, edit, and manage savings buckets (Priority: P1)

A user organizes household savings into dedicated buckets (Cash Buffer, Emergency Fund, Goal, Sinking Fund), configures targets and buffer inclusion, and sees top-level savings KPIs update immediately.

**Independent Test**: On a fresh database, open `/savings` and confirm the empty state and zeroed KPI row (`HELD IN BUCKETS ₱0`, `SAVINGS BUFFER ₱0`, `RUNWAY —`, `FUNDED <MONTH> ₱0` with `"no plan for <Mon>"`). Click `+ New bucket`, create a `Cash Buffer` bucket named `"Cash buffer"` with opening balance `250000`, marked as the default bucket, and save. Confirm its card shows the `DEFAULT` badge, `₱250,000` balance, `open-ended` progress, and a locked-on `buffer` toggle, and that both `HELD IN BUCKETS` and `SAVINGS BUFFER` read `₱250,000`. Create a `Goal` bucket `"Car down payment"` with opening balance `85000`, target amount `180000`, target month `2027-02`, and `buffer` toggle off. Confirm `HELD IN BUCKETS` is `₱335,000`, `SAVINGS BUFFER` stays `₱250,000`, and the Car bucket shows `₱85,000 of ₱180,000 · ₱95,000 left` (`47%`). Toggle `buffer` on and off for Car down payment and confirm `SAVINGS BUFFER` updates accordingly. Edit the Car bucket's name and target, reload, and confirm all changes persist.

**Acceptance criteria**

1. The `/savings` header shows the page title `"Savings buckets"`, the month picker (defaulting to the current month), and `+ New bucket`.
2. The KPI row renders four cards per the hi-fi:
   - `HELD IN BUCKETS`: total lifetime balance across active buckets + `"N buckets"` (`"1 bucket"` singular).
   - `SAVINGS BUFFER`: total lifetime balance of active buckets with `countsTowardBuffer = true` + `"counted buckets only"`.
   - `RUNWAY`: `Savings Buffer ÷ selected month's actual household expenses` formatted to 1 decimal place (`"N.N mo"`, rounded half-up to 0.1), or `"—"` when monthly expenses are `0`.
   - `FUNDED <MON>`: selected month's gross contributions (`sum(contributions)` in `monthKey` across **active buckets only**), with planned savings (`monthlyPlannedSavingsCentavos`) and per-bucket shortfall sum (`sum(max(0, planned_b − grossContributed_b))`) also scoped strictly to **active buckets**, and subtitle showing `"₱X short"` in amber (`#b9822c`) when the active per-bucket shortfall sum is `> 0`, `"on plan"` in status green (`#3f7d5c`) when active `plannedSavings > 0` has `0` total per-bucket shortfall, `"no savings planned"` in muted text when a monthly plan has `₱0` planned savings across active buckets, or `"no plan for <Mon>"` in muted text when no plan is applied for `monthKey`.
3. `+ New bucket` opens the Create bucket modal with fields: `NAME` (required, unique case-insensitively), `TYPE` (`Cash Buffer`, `Emergency Fund`, `Goal`, `Sinking Fund`), `OPENING BALANCE (PHP)` (optional, defaults to `0`, non-negative exact PHP/centavos), `TARGET AMOUNT (PHP)` (optional positive PHP/centavos), `TARGET / DUE MONTH` (optional `YYYY-MM`, shown for `Goal` and `Sinking Fund`), `DESCRIPTION` (optional), `COUNTS TOWARD BUFFER` toggle (defaults to `true` for `Cash Buffer` and `Emergency Fund`, `false` for `Goal` and `Sinking Fund`), and `DEFAULT CASH BUFFER` checkbox when type is `Cash Buffer`.
4. At most one bucket may be the default Cash Buffer (`isDefault = true`). Its `type` must be `cash_buffer`, and its `countsTowardBuffer` toggle is always `true` and locked in the UI. Once a bucket is the default Cash Buffer, `isDefault` cannot be cleared directly, its `type` cannot be changed away from `cash_buffer`, and it cannot be archived until another active `Cash Buffer` bucket is designated as default first (which atomically transfers `isDefault = true` to the new bucket).
5. Each bucket card displays: name, badge (`DEFAULT` on the default bucket, `COUNTED` on other buffer-counted buckets), type subtitle (including target/due month when set and optional description), lifetime current balance in Mono, progress bar, progress text (`"₱balance of ₱target · ₱remaining left"` and `"N%"` using `Math.floor((balance * 100) / target)` when a target is set, or `"no target"` and `"open-ended"` when no target is set), `"Funded <Mon> ₱actual"` (with `"of ₱planned"` when `planned > 0`, colored amber `#b9822c` when `actual < planned`), the `buffer` toggle switch, and actions (`Contribute`, `Withdraw`, `History`, `Edit`, `Archive`).
6. Editing a bucket allows updating its name, type (locked if `isDefault = true`), opening balance (unless reducing it would push the bucket's lifetime balance below zero), target amount (empty string clears to `null`), target/due month (empty string clears to `null`), description (empty string clears to `null`), default status (can be set to `true` on a `cash_buffer` bucket to transfer default), and buffer toggle (locked `true` if `isDefault = true`).
7. All bucket configurations persist across reloads and server restarts.

### User Story 2 — Record and manage savings contributions and withdrawals (Priority: P1)

A user records money added to or withdrawn from a savings bucket, reviews the bucket's transaction history, and edits or deletes past activity without affecting household income or expense totals.

**Independent Test**: With the `"Car down payment"` bucket (`₱85,000` opening balance, `₱180,000` target), click `Contribute` on its card. Enter `5000`, date in the current month (`<= today`), note `"September transfer"`, and Save. Confirm the toast, that the bucket balance increases to `₱90,000` (`50%`, `₱90,000 left`), and `FUNDED <MON>` increases by `₱5,000`. Click `Withdraw` on the same card, try `100000`, and confirm Save is blocked because it exceeds the `₱90,000` balance. Enter `15000` and Save; confirm the balance drops to `₱75,000` while `"Funded <Mon>"` and `FUNDED <MON>` remain `₱5,000` (gross contributions). Open `History` on the card, edit the `₱5,000` contribution to `10000`, and confirm the balance becomes `₱80,000` and `FUNDED <MON>` becomes `₱10,000`. Delete the `₱15,000` withdrawal after confirmation and confirm the balance becomes `₱95,000`. Open `/entries` and confirm neither the contribution nor the withdrawal appears as an income or expense entry or alters `/entries` summary chips.

**Acceptance criteria**

1. Clicking `Contribute` or `Withdraw` on an active bucket card opens the Savings Activity modal pre-set to that bucket and operation type (`Contribution` or `Withdrawal`), with `AMOUNT (PHP)`, `DATE` (custom Monday-first calendar popover defaulting to today, with dates `> today` disabled), and optional `NOTE`.
2. `AMOUNT` validates using exact centavo rules (positive value `> 0`, at most two decimal places, within maximum bound). `DATE` must be a valid `YYYY-MM-DD` calendar date not in the future (`date <= today`).
3. A withdrawal (or an edit/deletion of a prior contribution, or reduction of opening balance) that would cause the bucket's lifetime balance (`openingBalance + sum(all contributions) − sum(all withdrawals)`) to become negative is rejected with `"Bucket balance cannot be negative."`, and Save is disabled or blocked.
4. Saving a contribution increases the bucket's lifetime balance; saving a withdrawal decreases it. Bucket balances, target progress, `HELD IN BUCKETS`, and `SAVINGS BUFFER` always show lifetime totals across all recorded activity, while `"Funded <Mon>"` on the card and the `FUNDED <MON>` KPI show **gross contributions (`sum(contributions)`)** recorded in the selected month.
5. Clicking `History` on a bucket card opens a modal/drawer listing all recorded contributions (`+` in status green) and withdrawals (`−` in ink) for that bucket, ordered newest first (`date DESC, created_at DESC, id ASC`), showing date, operation type, note, amount, and `✎` (edit) and `✕` (delete with confirmation) actions on active buckets (hidden/disabled on archived buckets), plus the bucket's opening balance and derived current balance.
6. Editing or deleting a savings activity record on an active bucket updates the bucket's balance and progress immediately and persists to SQLite.
7. Recording, editing, or deleting savings activity never creates, modifies, or deletes F02 income/expense entries and never alters household income or expense totals.

### User Story 3 — Archive and restore savings buckets (Priority: P2)

A user archives a bucket they no longer actively use without losing its historical activity or breaking past monthly budgets, and can restore it later.

**Independent Test**: Create a `"Travel Fund"` bucket, record a `₱10,000` contribution, and click `Archive`. Confirm the confirmation dialog explains that history is preserved and new activity is disabled. Confirm the bucket moves out of the active bucket grid into the collapsible `Archived` section at the bottom of `/savings`, and is excluded from active bucket KPIs unless restored. Expand `Archived`, open `History` on `"Travel Fund"` to confirm the `₱10,000` contribution is still visible and read-only (no edit or delete buttons), then click `Restore` and confirm `"Travel Fund"` returns to the active grid with its `₱10,000` balance intact.

**Acceptance criteria**

1. Clicking `Archive` on an active bucket opens a confirmation dialog. The default Cash Buffer bucket cannot be archived unless another active `Cash Buffer` bucket is designated as default first (`409 invalid_state`).
2. An archived bucket leaves the active bucket cards grid and all active KPI totals on `/savings` (`HELD IN BUCKETS`, `SAVINGS BUFFER`, `RUNWAY`, and `FUNDED <MON>` — including its planned savings total and shortfall — count **active buckets only**), and appears in a collapsible `Archived` section on `/savings`. (On `/models`, a historical monthly plan that stored a non-zero allocation for the bucket before it was archived continues to display that `(archived)` row and include it in the historical plan's table totals.)
3. Archived buckets are strictly read-only: creating, editing, or deleting a savings activity on an archived bucket, updating the bucket's fields, or assigning a new non-zero budget allocation to the archived bucket is rejected with `409 archived`.
4. Users can still view an archived bucket's activity history from the `Archived` section and can click `Restore` to return it to active status with its full history and balance preserved.
5. Historical monthly budget plans and reusable budget models that already referenced the bucket continue to resolve its name and archived status (`(archived)` marker).

### User Story 4 — Create, edit, duplicate, and delete reusable budget models (Priority: P1)

A user creates reusable household budget templates, allocates planned amounts to income categories, expense categories, and savings buckets, sees unallocated or overallocated amounts immediately, and duplicates or deletes models.

**Independent Test**: With active Income categories (`Salary`, `Freelance`), Expense categories (`Rent`, `Groceries`, `Dining out`), and Savings buckets (`Emergency fund`, `Car down payment`, `Travel Fund`), open `/models`. Click `+ New model`, name it `"Baseline 2026"`, and save. In the detail pane, enter planned monthly amounts: `Salary = 110000`, `Freelance = 9500` (Income group total `₱119,500`), `Rent = 25000`, `Groceries = 20000`, `Dining out = 5000` (Expenses group total `₱50,000`), and `Emergency fund = 8000`, `Car down payment = 10000`, `Travel Fund = 3000` (Savings group total `₱21,000`). Confirm `"Where the income goes"` shows `₱119,500 planned income`, segmented bar percentages for Expenses, Savings, and Unallocated, and the footer `Unallocated` shows `+₱48,500` in teal. Increase `Groceries` to `90000` and confirm `Unallocated` becomes `−₱21,500` in status red with an `"Overallocated by ₱21,500"` indicator. Restore `Groceries` to `20000`. Click `Duplicate`, confirm `"Baseline 2026 (Copy)"` is created with identical allocations, then delete the copy after confirmation. Reload and confirm `"Baseline 2026"` persists.

**Acceptance criteria**

1. The left column of `/models` displays the **Selected Month's Plan card** at the top (when a plan is applied to `monthKey`, or a muted `"No plan applied for <Mon YYYY>"` card otherwise), followed by all reusable budget models as cards showing name, `ACTIVE` badge (if applied to `monthKey` without revision or template divergence, or `"REVISED"` / `"DIVERGED"` pill when applicable), `₱X exp · ₱Y sav`, and `unallocated ₱Z/mo`, plus `+ New model`.
2. `+ New model` opens `ModelModal` for model `NAME` (required, unique case-insensitively) and optional `DESCRIPTION`, initializing allocations for active categories and buckets to `₱0` and selecting the new model card.
3. When a reusable model card is selected, the right detail pane shows the selected model's name, optional description, and action buttons: `Edit` (opens `ModelModal` to update name/description), `Duplicate`, `Make active` / `Re-apply` / disabled `Active`, and `Delete` (with confirmation).
4. The table presents three collapsible bordered umbrella groups in order: **Income**, **Expenses**, **Savings**. Each group's header bar remains visible when collapsed and displays the group's total `BUDGET / MO`, `ACTUAL`, and `Δ`.
5. Every active Income category appears under **Income**, every active Expense category appears under **Expenses** (with its square colour swatch), and every active Savings bucket appears under **Savings**. Each row has an editable `BUDGET / MO` input accepting non-negative exact PHP/centavos (`>= 0`). Typing a valid amount updates all summary totals, charts, and `Δ` values locally in `<10ms`; blurring the input or pressing `Enter` persists the change (`PATCH /api/models/:id` in Reusable Model mode, or `PATCH /api/monthly-plans/:monthKey` in Month's Plan mode), while `Escape` reverts unsaved draft text. Invalid inputs highlight the cell in red without sending a request.
6. The system computes `Expected Income = sum(Income allocations)`, `Planned Expenses = sum(Expense allocations)`, `Planned Savings = sum(Savings allocations)`, and `Unallocated = Expected Income − Planned Expenses − Planned Savings`.
7. The `"Where the income goes"` card shows `₱<Expected Income> planned income` (with `"Fully allocated"` when `Unallocated = 0 && Expected Income > 0`, or an `"Overallocated by ₱X"` red badge when `Unallocated < 0`) and a 100% stacked bar for `Expenses` (`#8c8378`), `Savings` (`#2f7d78`), and `Unallocated` (`#c3cac9`, when `> 0`) with integer percentage labels inside segments.
8. The `"Expense breakdown"` card renders a conic donut chart of planned expense allocations by category colour (or an explicit empty state when planned expenses are `0`).
9. `Duplicate` opens `ModelModal` (or creates a unique copy name `"<Model Name> (Copy)"`) and copies all category and bucket allocations. `Delete` removes the reusable model after confirmation without deleting any previously applied monthly budget snapshots.

### User Story 5 — Apply a budget model to a month and preserve historical monthly plans (Priority: P1)

A user applies a budget model to a selected calendar month, revises that month's plan if needed, and edits the reusable model later without rewriting past months' budgets.

**Independent Test**: On `/models`, select `"Sep 2026"` in the month picker, select `"Baseline 2026"` (`Groceries = ₱20,000`), and click `Make active` (confirming if Sep 2026 is a past month). Confirm the top **Month's Plan card** (`"Sep 2026 plan"`) appears with the `ACTIVE` badge and becomes selected. Switch the month picker to `"Oct 2026"` and apply `"Lean months"` (`Groceries = ₱16,000`). Now click the reusable `"Baseline 2026"` card and edit its template so `Groceries = ₱22,000`. Switch the month picker back to `"Sep 2026"`, select the `"Sep 2026 plan"` card at the top of the left rail, and confirm September's applied plan still has `Groceries = ₱20,000` while `"Baseline 2026"` shows that its template has diverged (offering `Re-apply` with confirmation). Reload and confirm both months retain their independent applied plans.

**Acceptance criteria**

1. Each calendar month (`YYYY-MM`) has at most one active applied budget plan (`MonthlyBudgetPlan`), updated in place when revised or re-applied.
2. Clicking `Make active` (or `Re-apply`) on a reusable model copies that model's expected income and all **active** category and **active** bucket allocations into `monthly_budget_plans` + `monthly_budget_allocations` for the selected `monthKey` (`isRevised = false`, `sourceModelId = model.id`), skipping any archived categories or archived buckets.
3. First-time `Make active` on a current or future month (`monthKey >= currentMonth`) with no existing plan applies immediately. Overwriting an existing monthly plan (`appliedPlan !== null`) or applying a model to a past month (`monthKey < currentMonth`) requires confirmation in a `ConfirmDialog`.
4. Once applied, the monthly plan retains its own allocation values. Subsequent edits to—or deletion of—the source reusable model do not silently alter any previously applied monthly plan.
5. When viewing a month that has an applied plan, the Month's Plan card at the top of the left rail is selected by default on load. Users can edit the Month's Plan directly (`PATCH /api/monthly-plans/:monthKey`, setting `isRevised = true`; for past months `monthKey < currentMonth`, inputs are locked until the user confirms `"Unlock to revise past plan"`), or select a reusable model card below to edit the template or click `Re-apply` / `Make active` (with confirmation) to overwrite that month's plan.
6. Historical monthly plans remain available for review when stepping back and forward with the month picker.

### User Story 6 — Compare budget allocations against actual monthly activity (Priority: P1)

A user compares planned allocations (either from the selected month's applied plan or a selected reusable model card) against actual income, spending, and gross savings contributions for the selected month, seeing variance (`Δ`), utilization percentage, and shortfalls or overspending.

**Independent Test**: With `"Baseline 2026"` applied to September 2026 (`Salary = ₱110,000`, `Groceries = ₱20,000`, `Dining out = ₱5,000`, `Car down payment = ₱10,000`), record September entries in `/entries`: `Salary = ₱110,000`, `Groceries = ₱18,400`, `Dining out = ₱7,900`, and record a September savings contribution in `/savings`: `Car down payment = ₱5,000`. Open `/models` for September 2026 (which selects `"Sep 2026 plan"` by default). Confirm:
- `Groceries` shows `BUDGET / MO = 20,000`, `ACTUAL = 18,400` (`92% used · ₱1,600 remaining`), `Δ = +1,600` (green).
- `Dining out` shows `BUDGET / MO = 5,000`, `ACTUAL = 7,900` (`158% used · ₱2,900 overspent`), `Δ = −2,900` (red).
- `Car down payment` shows `BUDGET / MO = 10,000`, `ACTUAL = 5,000` (`₱5,000 short`), `Δ = −5,000` (amber — never red).
- The `"Budget vs actual (Δ)"` diverging bar chart plots `Groceries` above the zero line (`SURPLUS`) and `Dining out` below the zero line (`DEFICIT`) in their respective category colours.
- Clicking another reusable model card in the left rail live-previews that model's allocations against September 2026's actuals.

**Acceptance criteria**

1. Actual income and expense figures for the selected month are derived strictly from F02 `entries` dated within that calendar month (`YYYY-MM`).
2. Actual savings figures for the selected month are derived strictly from F03 **gross savings contributions** (`kind = 'contribution'`) recorded within that calendar month (`YYYY-MM`).
3. Variance `Δ` is favourable-positive everywhere (following `product-decisions.md` line 18 and the hi-fi prototype `HF#L1102, L1113`; note `product-decisions.md` line 23 has a typo mentioning red for savings shortfalls which is superseded by line 18):
   - For **Expenses**: `Δ = Planned − Actual`. Positive (`Actual < Planned`) is green (`+`), representing remaining allocation. Negative (`Actual > Planned`) is status red (`−`), representing the overspent amount.
   - For **Income**: `Δ = Actual − Planned`. Positive is green (`+`); negative is status red (`−`).
   - For **Savings**: `Δ = Actual Gross Contributions − Planned`. Positive is green (`+`); negative (under-funded) is **amber (`#b9822c`), never red**, showing the remaining planned contribution (`"₱X short"`).
4. Expense rows display planned amount, actual spending, subtitle with integer percentage utilized (`Math.round((Actual * 100) / Planned)`) and remaining (`"N% used · ₱X remaining"`) or overspent (`"N% used · ₱X overspent"`, or `"Overspent · ₱X overspent"` when `Planned = 0 && Actual > 0`, or `"—"` when `Planned = 0 && Actual = 0`). UI copy never uses the ambiguous phrases `"over budget"` or `"under budget"`—it uses `"overspent"`, `"underspent"`, `"remaining"`, or `"short"`.
5. The `Unallocated` footer row displays:
   - Planned unallocated: `Expected Income − Planned Expenses − Planned Savings` (signed; teal when `> 0`, ink when `= 0` with `"Fully allocated"` badge, status red when `< 0` with `"Overallocated"` badge).
   - Actual unallocated: `Actual Income − Actual Expenses − Actual Gross Savings Contributions` for the selected month.
   - Variance `Δ`: `Actual Unallocated − Planned Unallocated` (`+` green when `> 0`, `−` status red when `< 0`, `0` muted).
6. The `"Budget vs actual (Δ)"` diverging bar chart displays one bar per expense category around a horizontal zero line (`SURPLUS` above, `DEFICIT` below) coloured with the category's identity colour, with 4-letter category labels below the plot area.
7. Budget allocations never alter actual transaction totals or bucket balances.

### User Story 7 — Historical integrity across archived or merged categories and buckets (Priority: P2)

A user archives or merges categories or archives a savings bucket without corrupting or orphaning reusable models or historical monthly budget plans, and sees accurate historical Budget-vs-Actual comparisons after a category merge.

**Independent Test**: Apply `"Baseline 2026"` (`Rent = ₱25,000`, `Dining out = ₱5,000`, `Groceries = ₱20,000`, `Travel Fund = ₱3,000`) to August 2026. Record August 2026 expense entries in `/entries`: `Dining out = ₱4,000` and `Groceries = ₱18,000`. In `/savings`, archive `"Travel Fund"`. In `/categories`, merge `"Dining out"` into `"Groceries"`. Open `/models` for August 2026 (`"Aug 2026 plan"`):
- Confirm `"Groceries"` displays its own stored allocation (`20,000`) in the editable `BUDGET / MO` input with a subtitle showing the combined effective budget (`"₱25,000 effective (+₱5,000 from Dining out)"`), and folds `"Dining out"`'s `₱5,000` into its comparison (`ACTUAL = ₱22,000`, `Δ = +₱3,000` green, `88% used · ₱3,000 remaining`), while `"Dining out (merged → Groceries)"` is still shown as a read-only stored snapshot reference row (`₱5,000` stored snapshot, `"→ Groceries"` in `ACTUAL`/`Δ`, not double-counted in the Expenses group total of `₱50,000` planned — `Rent ₱25,000 + Groceries ₱25,000 effective` — vs `₱22,000` actual). Edit `"Groceries"`'s own `BUDGET / MO` input from `20000` to `21000`, reload, and confirm the input persists as `21,000` with subtitle `"₱26,000 effective (+₱5,000 from Dining out)"` (`Δ = +₱4,000`).
- Confirm `"Travel Fund (archived)"` remains visible in August's historical plan with its `₱3,000` planned allocation preserved.
- Click the reusable `"Baseline 2026"` template card and confirm `"Dining out"`'s `₱5,000` was combined into `"Groceries"` (`₱25,000`) and `"Travel Fund (archived)"` is marked `(archived)` so the user can zero it out.

**Acceptance criteria**

1. Merging Category `S` into Category `D` in `/categories` atomically adds Category `S`'s planned amount in each reusable budget model to Category `D`'s planned amount and removes Category `S` from active reusable model rows, while keeping historical `monthly_budget_allocations` rows untouched.
2. When loading, rendering, and computing Budget-vs-Actual for a historical `MonthlyBudgetPlan` after Category `S` has been merged into `D` (following transitive merge chains `S → D → T` via `mergedIntoCategoryId` with cycle protection):
   - `getModelsView` loads all categories in the transitive `mergedIntoCategoryId` closure (`S → D → T`) reachable from any retained category — including intermediate merged categories (`D`) with `₱0` allocation/actuals and terminal targets (`T`) even if `T` was subsequently archived with `₱0` own allocation and `₱0` actuals.
   - `S`'s stored snapshot planned amount (`rawPlanned_S`) is folded into its terminal merge target `T`'s effective planned amount (`plannedCentavos = rawPlanned_T + sum(rawPlanned_S)`) so `T`'s `ACTUAL` (which includes `S`'s moved/repointed entries), `Δ`, utilization `%`, and diverging bar are accurate without false surpluses or deficits, and group/summary totals sum `T`'s `plannedCentavos`.
   - `T`'s `BUDGET / MO` input displays and edits **`T`'s own stored allocation (`rawPlanned_T`, `>= 0`)** while rendering a subtitle beneath the input with the combined effective budget (`"₱<plannedCentavos> effective (+₱<rawPlanned_S> from <S.name>)"`). Saving an edit on `T` (`PATCH /api/monthly-plans/:monthKey`) updates only `T`'s own stored row (`rawPlanned_T`) in `monthly_budget_allocations` and leaves `S`'s stored snapshot row untouched. If `T` is itself archived, `T`'s input is read-only when `rawPlanned_T === 0` or allows only zeroing out (`amount = "0"`) when `rawPlanned_T > 0` (`amount > 0` on archived `T` returns `409 archived`).
   - `S` is still rendered as a read-only reference row (`"<S.name> (merged → <T.name>)"`) showing its stored snapshot amount (`rawPlanned_S`, with an optional `"Zero out"` action sending `amount = "0"` if the user explicitly wants to clear `S`'s historical snapshot row) and `"→ <T.name>"` in the `ACTUAL`/`Δ` columns, and is excluded from group/summary totals so neither planned budget nor actual spending is ever double-counted.
3. Archiving a category or savings bucket leaves historical monthly budget plans completely intact, displaying the archived entity's name with an `(archived)` indicator and including its stored snapshot allocation in that month's totals.
4. In a reusable budget model, an archived category or bucket with a non-zero allocation remains visible with an `(archived)` marker (and counts toward the model's totals) until the user zeroes it out (`0`), at which point it is removed/hidden; archived categories/buckets with zero allocation are hidden from active model editing and cannot be assigned new non-zero allocations (`409 archived`).
5. Active categories or active buckets created *after* a month's snapshot was applied appear as `₱0` planned rows when viewing that month's plan (and can be revised via `PATCH /api/monthly-plans/:monthKey`).

### User Story 8 — Seed and clear demo data for buckets and models (Priority: P3)

A developer or tester runs `npm run seed` to populate a complete demo household including savings buckets, savings activity, reusable budget models, and applied monthly plans across the 12 rolling calendar months ending with the current month, and runs `npm run clear -- --yes` to wipe all data back to the empty first-run state.

**Independent Test**: Run `npm run clear -- --yes` on the database, then `npm run seed`. Open `/savings` (which defaults to the current month, the 12th seeded month) and confirm the 4 prototype buckets (`Cash buffer` `₱250,000`, `Emergency fund` `₱216,000`, `Car down payment` `₱145,000`, `Insurance` `₱24,000`), their balances, and current-month funded amounts (`FUNDED <MON> ₱15,000`, `"₱5,000 short"` in amber because `Baseline 2026` plans `Car down payment` at `₱10,000` while `₱5,000` is contributed per month) match the seeded dataset. Open `/models` and confirm the current month's `"<Mon YYYY> plan"` card (`Baseline 2026`, `ACTIVE`) and the 3 prototype reusable models (`Baseline 2026`, `Lean months`, `Car purchase 2027`) exist. Run `npm run clear` without `--yes` and confirm it prints counts of all 10 user tables without deleting anything. Run `npm run clear -- --yes` and confirm `/savings` and `/models` return to their empty states.

**Acceptance criteria**

1. `seedDemoData` in `src/server/demo.ts` seeds the 4 buckets (`Cash buffer`, `Emergency fund`, `Car down payment`, `Insurance`), deterministic monthly savings contributions on `${month}-01` across the 12 rolling calendar months ending with `currentDate` / today (matching F02's 12 rolling seeded months and `scripts/seed.json`), the 3 reusable budget models (`Baseline 2026`, `Lean months`, `Car purchase 2027`), and 12 monthly applied plans (`Baseline 2026`) for those 12 rolling months.
2. `seedDemoData` refuses to run if any F01, F02, or F03 user tables contain rows.
3. `getClearSummary` and `clearAllData` include counts for and delete all F03 tables (`monthly_budget_allocations`, `monthly_budget_plans`, `budget_model_allocations`, `budget_models`, `savings_activities`, `savings_buckets`) alongside F02 and F01 tables in foreign-key-safe order within a single transaction.

## Edge Cases

- **No buckets exist**: `/savings` shows an empty state prompting to create a first bucket; KPI cards show `₱0` for Held in Buckets, Savings Buffer, and Funded (with `"no plan for <Mon>"` when no plan exists), and `—` for Runway.
- **No monthly expenses in the selected month**: `RUNWAY` displays `—` (never `Infinity` or `NaN`).
- **Bucket without a target amount**: displays current balance, `"no target"`, and `"open-ended"` with a full teal bar; no artificial target percentage or remaining amount is shown.
- **Bucket balance below or exceeding target amount**: percentage achieved uses `Math.floor((currentBalance * 100) / targetAmount)` so a bucket at `99.6%` displays `"99%"` in amber (never `"100%"` while `remaining > 0`). When `currentBalance >= targetAmount`, the progress bar caps at `100%` width in status green, the label displays the exact integer floor percentage (e.g. `"100%"`, `"105%"`), and remaining to target is `₱0`.
- **Withdrawal or edit/delete that would cause a negative bucket balance**: blocked on both client and server with `"Bucket balance cannot be negative."` (`400 validation`).
- **Future-dated savings activity (`date > today`)**: blocked in `CalendarPopover` and rejected on the server with `"Activity date cannot be in the future."` (`400 validation`).
- **Editing, changing type, clearing default, or archiving the default Cash Buffer bucket**: `isDefault` cannot be cleared directly, `type` cannot be changed away from `cash_buffer`, `countsTowardBuffer` cannot be set to `false`, and the bucket cannot be archived unless another active `Cash Buffer` bucket is designated as default first (`409 invalid_state`).
- **Mutating an archived bucket or its activity history**: creating, editing, or deleting a savings activity on an archived bucket is rejected with `409 archived`.
- **No budget models exist**: `/models` shows an empty state with a `+ New model` CTA.
- **No active categories or buckets when creating/viewing a model**: the corresponding umbrella group shows an empty-group message and `₱0` group total.
- **Expected income is `₱0` in a budget model**: `"Where the income goes"` does not divide by zero; if expenses or savings are `> 0`, `Unallocated` is negative and the model is flagged as overallocated.
- **Category has `₱0` planned budget but `> ₱0` actual spending**: `Δ` is `−Actual` (red), remaining is `₱0`, and utilization shows `"Overspent · ₱<Actual> overspent"` rather than `Infinity%`.
- **Deleting the currently active reusable model**: allowed after confirmation; months where that model was previously applied keep their independent `MonthlyBudgetPlan` snapshot (`sourceModelId` becomes `NULL`).
- **Invalid `?month=` query parameter on `/savings` or `/models`**: falls back cleanly to `currentMonthKey()` (`YYYY-MM`) via shared validation in `src/domain/month.ts`.
- **Concurrent mutations / stale records (two tabs)**: editing or deleting a deleted bucket, savings activity, or model returns `404` with a clear message, closes any open stale modal without recreating rows, and calls `router.refresh()`.
- **Double-submit on modals and `Make active`**: rapid clicks on Save in `BucketModal`, `ActivityModal`, `ModelModal`, or on `Make active` / `Re-apply` disable the control while in-flight and execute only one request.

## Data Considerations

**Entity: SavingsBucket**

| Field | Rules |
|---|---|
| Identity (`id`) | Stable UUID, unchanged by edits. |
| Name (`name`, `nameKey`) | Required, trimmed, non-empty, unique case-insensitively across all buckets. |
| Type (`type`) | One of `'cash_buffer'`, `'emergency_fund'`, `'goal'`, `'sinking_fund'`. |
| Opening Balance (`openingBalance`) | Exact integer centavos `>= 0`. Defaults to `0`. |
| Target Amount (`targetAmount`) | Optional exact integer centavos `> 0` (`NULL` when open-ended / no target). |
| Target Month (`targetMonth`) | Optional `'YYYY-MM'` string (`NULL` when not applicable). |
| Description (`description`) | Optional trimmed text (`NULL` when empty). |
| Counts Toward Buffer (`countsTowardBuffer`) | Boolean. Always `true` when `isDefault = true`. |
| Is Default (`isDefault`) | Boolean. At most one bucket has `isDefault = true` (must be active with `type = 'cash_buffer'`). |
| Archived At (`archivedAt`) | Nullable ISO timestamp (`NULL` = active). |
| Created / Updated | ISO-8601 UTC timestamps. |

**Entity: SavingsActivity**

| Field | Rules |
|---|---|
| Identity (`id`) | Stable UUID. |
| Bucket (`bucketId`) | Required FK → `savings_buckets(id)`. Creating, editing, or deleting activity requires an active bucket (`archivedAt === null`). |
| Kind (`kind`) | `'contribution'` or `'withdrawal'`. |
| Amount (`amount`) | Exact integer centavos `> 0`. |
| Date (`date`) | Calendar date `'YYYY-MM-DD'`, validated as a real calendar date `<= today`. |
| Note (`note`) | Optional trimmed text (`NULL` when empty). |
| Created / Updated | ISO-8601 UTC timestamps. |

**Entity: BudgetModel & Allocations**

| Field | Rules |
|---|---|
| Identity (`id`) | Stable UUID. |
| Name (`name`, `nameKey`) | Required, trimmed, non-empty, unique case-insensitively across budget models. |
| Description (`description`) | Optional trimmed text (`NULL` when empty). |
| Category Allocations | Zero or more rows `(modelId, categoryId, amountCentavos >= 0)` referencing `categories(id)`. |
| Bucket Allocations | Zero or more rows `(modelId, bucketId, amountCentavos >= 0)` referencing `savings_buckets(id)`. |
| Created / Updated | ISO-8601 UTC timestamps. |

**Entity: MonthlyBudgetPlan & Allocations (Snapshot)**

| Field | Rules |
|---|---|
| Identity (`id`) | Stable UUID. |
| Month (`monthKey`) | Unique `'YYYY-MM'` calendar month (one active snapshot per month, updated in place on revision or re-apply). |
| Source Model (`sourceModelId`) | Nullable FK → `budget_models(id) ON DELETE SET NULL`. |
| Model Name Snapshot (`modelName`) | Snapshot of the model name at application time. |
| Is Revised (`isRevised`) | Boolean indicating whether the month's snapshot was explicitly revised after model application. |
| Category Allocations | Snapshot rows `(planId, categoryId, amountCentavos >= 0)` for that month. |
| Bucket Allocations | Snapshot rows `(planId, bucketId, amountCentavos >= 0)` for that month. |
| Applied / Updated | ISO-8601 UTC timestamps. |

**Rules & Invariants**

- **Non-negative Lifetime Bucket Balance**: For every bucket, `openingBalance + sum(all contributions) − sum(all withdrawals) >= 0` must hold after every create, update, or delete of a bucket or savings activity.
- **No Future-Dated Savings Activity**: Savings activity dates must satisfy `date <= today`.
- **Read-Only Archived Buckets**: Archived buckets (`archivedAt !== null`) reject activity creation, activity editing, activity deletion, bucket field edits, and new non-zero budget allocations with `409 archived`.
- **No Conflation with Entries**: Savings activity lives in `savings_activities` and never touches `entries`. Budget allocations live in `budget_model_allocations` / `monthly_budget_allocations` and never touch `entries` or `savings_activities`.
- **Single Source of Truth**: Bucket balances, target progress, buffer total, runway, expected income, planned expenses, planned savings, unallocated amounts, and budget-vs-actual deltas are always derived from authoritative persisted records, never stored as redundant denormalized totals.
- **Historical Isolation & Post-Merge Comparison**: Editing or deleting a `BudgetModel` never mutates existing `MonthlyBudgetPlan` or `MonthlyBudgetAllocation` rows. Merging Category `S` into `D` combines `S` into `D` in reusable models, preserves `S`'s row in historical `monthly_budget_allocations`, and folds `S`'s stored snapshot amount into its terminal merge target `T` during historical B-vs-A comparison while displaying `S (merged → T)` as a non-double-counted reference row.

## Success Criteria

- Every user story's Independent Test passes in the Browser Smoke Test phase.
- Automated tests cover:
  - Exact centavo arithmetic and deterministic rounding for lifetime bucket balances, target progress (`Math.floor`), buffer, runway (`0.1` rounding), budget allocations, planned/actual/`Δ` unallocated calculations, and favourable-positive `Δ`.
  - Gross-contribution funding basis (`Funded <Mon>`, `FUNDED <MON>` KPI with per-bucket shortfall sum and `"no plan for <Mon>"` state, and `/models` Savings `ACTUAL`), including months with both contributions and withdrawals.
  - Non-negative bucket balance enforcement on withdrawal, contribution edit/delete, and opening balance edit, plus rejection of future-dated activity (`date > today`) and rejection of activity edits/deletes on archived buckets (`409 archived`).
  - Default Cash Buffer invariants (preventing clearing `isDefault`, changing `type`, disabling `countsTowardBuffer`, or archiving without transferring default first).
  - Independence of savings activity from F02 income/expense totals and independence of budget allocations from actual balances.
  - Applying a budget model to a month (skipping archived entities), selecting the Month's Plan card vs. Reusable Model cards on `/models`, confirming before overwriting an existing monthly plan or revising a past month, and verifying that editing or deleting a reusable model does not alter historical monthly plans.
  - Historical integrity when categories or buckets are archived and when categories with non-zero actual spending are merged (including chained merges, verifying folded B-vs-A comparison without double-counting).
  - Migration 3 over existing F01+F02 databases (testing SQL shape constraints in migration tests and calendar validity in domain/service/API tests) and persistence round-trips across reloads.
  - Two-tab stale-record `404` recovery, double-submit prevention on modals and `Make active`, and invalid `?month=` query parameter fallback.
  - `seed` and `clear` CLI scripts including F03 buckets, savings activity, models, and monthly plans across the 12 rolling seeded months.
- The `/savings` and `/models` screens pass a visual check against the hi-fi prototype at 1280–1440px, with no horizontal scroll at 1100px or more. Intentional additions required by the brief and clarifications are recorded in `deviations.md` (`D1`–`D11`).
- Text contrast is at least 4.5:1, there are no drop shadows, and all visual values use shared design tokens.

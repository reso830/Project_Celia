# Data Model: F04 — Dashboard & Reporting

**Branch**: `v3-004-dashboard-reporting` | **Date**: 2026-11-09 (revised 2026-11-10) | **Spec**: [spec.md](spec.md)

## 1. Schema Evolution & Persistence

**F04 introduces zero new database tables, columns, indexes, or migrations.**

Per Constitution Principle IV (Domain Integrity), VI (Single Source of Truth), and VII (Architecture Should Follow Proven Need), the Dashboard is a **pure read and visualization layer**. All displayed metrics are derived on-demand from authoritative data established in F01, F02, and F03:
- **F01 Core Tracking**: `members`, `categories`, `items`.
- **F02 Entries**: `entries` (actual income and expense transactions).
- **F03 Budget & Savings**: `savings_buckets`, `savings_activities`, `budget_models`, `budget_model_allocations`, `monthly_budget_plans`, `monthly_budget_allocations`.

---

## 2. Card-by-Card Filter Scope Matrix

To eliminate ambiguity and prevent misleading financial metrics, the dashboard enforces explicit scoping rules across all filter states:

### Owner Filter Semantics
- `"all"` (**All members / Everyone**): Aggregates all transactions across the entire household.
- `"household"` (**Household-owned only**): Isolates shared transactions where `owner_member_id IS NULL`.
- `<memberId>` (**Individual member**): Isolates transactions where `owner_member_id === <memberId>`.

| Card / Component | All Members (`all`) | Member (`<memberId>`) | Household (`household`) | Expense Category Filter | Income Category Filter |
|---|---|---|---|---|---|
| **Header Controls** | Reflects all | Shows selected member name | Shows `"Household"` | Shows selected expense category | Shows selected income category |
| **Savings Buffer Hero** | Lifetime household buffer; household runway | Lifetime household buffer; household runway (labeled `"Household buffer"`, `"Household runway"`) | Lifetime household buffer; household runway (labeled `"Household buffer"`) | Lifetime household buffer; household runway | Lifetime household buffer; household runway |
| **Hero Sparkline** | 12-mo household buffer balance trajectory | 12-mo household buffer balance trajectory (household-wide) | 12-mo household buffer balance trajectory (household-wide) | 12-mo household buffer balance trajectory (household-wide) | 12-mo household buffer balance trajectory (household-wide) |
| **INCOME KPI** | Total household income for month | Income attributed to chosen member | Income attributed to Household | **`—` (dash)** | Category income for month |
| **EXPENSES KPI** | Total household expenses for month | Expenses attributed to chosen member | Expenses attributed to Household | Category expenses for month | **`—` (dash)** |
| **SAVINGS KPI** | Gross contributions to active buckets | Gross contributions to active buckets (labeled `"Household savings"`) | Gross contributions to active buckets (labeled `"Household savings"`) | **`—` (dash)** | **`—` (dash)** |
| **UNALLOCATED KPI** | Net household cash flow (`Income − Exp − Savings`, `unallocatedScope: "all"`, UI subtitle: `"Unallocated"`) | Member net cash flow (`Income − Exp`, `unallocatedScope: "member"`, UI subtitle: `"Member net"`) | Household net cash flow (`Income − Exp`, `unallocatedScope: "household"`, UI subtitle: `"Household net"`) | **`—` (dash)** | **`—` (dash)** |
| **KPI Deltas** | Compared against selected month's plan | `null` (household budgets are not divided per member) | `null` | `Expense Δ = Category Budget − Actual` | `null` |
| **Burn Rate Gauge** | Household expenses / Household budget | Shows **Household burn rate** (`Household expenses / Household budget * 100%`, labeled `"Household burn rate"`) | Shows **Household burn rate** (`Household expenses / Household budget * 100%`) | Category budget utilization (`category actual / category budget * 100%`, labeled `"<Category> budget utilization"`) | **`—` (dash)** (`state: "income_category"`, neutral tone, 0% arc) |
| **Actual vs Budget Trend** | Bars show household monthly expenses vs each month's budget | Bars show selected member monthly expenses vs household budget line | Bars show household-owned monthly expenses vs household budget line | Bars show selected category's monthly expenses vs that category's budget | Empty state: `"Expense trend not applicable to income categories"` (`isApplicable: false`) |
| **Categories Table** | All expense categories with household actuals vs budget | All expense categories with actuals scoped to selected member vs household budget | All expense categories with actuals scoped to Household vs household budget | Filters table to show only the selected category row | Empty state: `"No expense categories match filter"` (`isApplicable: false`) |
| **Member Distribution** | All members + Household; all rows unselected | Displays all members + Household; **highlights** the selected member's row | Displays all members + Household; **highlights** Household row | Shows distribution of spending in that category across members | Empty state: `"Expense distribution not applicable to income categories"` (`isApplicable: false`) |
| **Goal Highlight** | First active goal; household progress | First active goal; household progress (labeled `"Household goal"`) | First active goal; household progress | First active goal; household progress | First active goal; household progress |
| **Upcoming Commitments** | Active commitments due $\ge$ selected month | Active commitments (labeled `"Household commitments"`) | Active commitments | Active commitments | Active commitments |

### KPI Trend History

`kpis.history` contains 12 oldest-first calendar-month samples ending in the selected month, independent of the trend chart range. Each sample applies the KPI rows of the scope matrix above, including combined owner/category filters. Inapplicable metrics are `null` and have no trend. Quiet months have zero amounts. Savings are gross contributions to currently active buckets, excluding withdrawals, opening balances and archived buckets. Unallocated is signed Income − Expenses − Savings for All members, and Income − Expenses for an owner filter. No plan is required for actual history. The UI draws the prototype’s 88×30 trend with min/max scaling, preserving negative values, a horizontal flat series, and a flat empty fallback. Plan deltas remain alongside the trends.

### Combined Filter Scope Matrix (Owner & Category Filters Together)

When an owner filter (`memberFilter !== 'all'`) and a category filter (`categoryId !== 'all'`) are active simultaneously:

**Governing Rule for KPI Deltas under Combined Filters**:
The **Owner Filter (Member or Household) wins over the Category Filter**. Because monthly budget plans are established at the household level and are never divided among individual members or household-only ownership (Principle D2 / Brief §3.2), comparing an individual member's or household-only partial spend against a full category budget would produce misleading plan variances. Therefore, whenever any owner filter is active (`memberFilter !== 'all'`), all KPI deltas are strictly **`null`**.

| Card / Component | Member & Expense Category (`member=<id> & category=<id>`) | Household & Expense Category (`member=household & category=<id>`) | Member or Household & Income Category (`member=<id\|household> & category=<id>`) |
|---|---|---|---|
| **Header Controls** | Shows selected member name + category name | Shows `"Household"` + category name | Shows selected member / `"Household"` + category name |
| **Savings Buffer Hero** | Lifetime household buffer; household runway (labeled `"Household buffer"`, `"Household runway"`) | Lifetime household buffer; household runway (labeled `"Household buffer"`) | Lifetime household buffer; household runway |
| **Hero Sparkline** | 12-mo household buffer trajectory (household-wide) | 12-mo household buffer trajectory (household-wide) | 12-mo household buffer trajectory (household-wide) |
| **INCOME KPI** | **`—` (dash)** (expense category selected) | **`—` (dash)** (expense category selected) | Actual income for this member / Household in that category |
| **EXPENSES KPI** | Actual expenses for this member in this category | Actual expenses for Household in this category | **`—` (dash)** (income category selected) |
| **SAVINGS KPI** | **`—` (dash)** | **`—` (dash)** | **`—` (dash)** |
| **UNALLOCATED KPI** | **`—` (dash)** (net cash flow not applicable to single category) | **`—` (dash)** (net cash flow not applicable to single category) | **`—` (dash)** (net cash flow not applicable to single category) |
| **KPI Deltas** | **`null`** (Owner filter wins; category budget is household-wide) | **`null`** (Owner filter wins; category budget is household-wide) | **`null`** |
| **Burn Rate Gauge** | Shows **Household burn rate** (`Household expenses / Household budget * 100%`, labeled `"Household burn rate"`) | Shows **Household burn rate** (`Household expenses / Household budget * 100%`, labeled `"Household burn rate"`) | **`—` (dash)** (`state: "income_category"`, neutral tone `#636f73`, 0% arc) |
| **Actual vs Budget Trend** | Bars show member's monthly expenses in this category vs that category's monthly budget line | Bars show Household-owned monthly expenses in this category vs that category's monthly budget line | Empty state: `"Expense trend not applicable to income categories"` (`isApplicable: false`) |
| **Categories Table** | Filters to selected category row: member actuals vs household category budget; delta = `budget − spent` | Filters to selected category row: Household actuals vs household category budget; delta = `budget − spent` | Empty state: `"No expense categories match filter"` (`isApplicable: false`) |
| **Member Distribution** | Displays all members + Household for this category; **highlights** the selected member's row | Displays all members + Household for this category; **highlights** Household row | Empty state: `"Expense distribution not applicable to income categories"` (`isApplicable: false`) |
| **Goal Highlight** | First active goal; household progress (labeled `"Household goal"`) | First active goal; household progress | First active goal; household progress |
| **Upcoming Commitments** | Active commitments (labeled `"Household commitments"`) | Active commitments | Active commitments |

### Drill-Down Destination Figure Matching Rules
When clicking an active category row in the Categories table:
- **Under All members** (`member=all` or unset): Navigates to `/entries?month=YYYY-MM&category=<id>`. On `/entries`, `owner` is omitted (defaulting to `"all"`), so the entries table sum and Expense summary chip match the Categories table row's `spentCentavos` exactly.
- **Under Individual member** (`member=<memberId>`): Navigates to `/entries?month=YYYY-MM&category=<id>&owner=<memberId>`. Per F02's approved rule, `/entries` displays member entries plus shared Household entries, with Household rows marked and summary chips displaying `own · shared`. The summary chip's **"own" figure (`ownExpenseCentavos`)** matches the member's spending in that category on the dashboard.
- **Under Household** (`member=household`): Navigates to `/entries?month=YYYY-MM&category=<id>&owner=household`.
  - On `/entries`, `owner=household` acts as a **link-only Household view**:
    - The header owner filter chip button displays `"Household only ▾"` (clearly distinct from F02's `"Household ▾"` which denotes all members / everyone).
    - `SummaryChips` displays total entries and total amounts without the `"0 own · ₱X shared"` sub-label, rendering simply `Expense ₱X` to cleanly match the dashboard Household category spend.
    - The entries table displays only Household-owned entries (`owner_member_id IS NULL`), matching the dashboard Categories table row's `spentCentavos` exactly.
    - If the user opens the owner dropdown and selects another option (e.g. `"Household"` / all, or an individual member), `/entries` transitions seamlessly back to F02's standard filter modes.

---

## 3. Pure Domain View Model Types

All types reside in `src/domain/dashboard.ts` with **zero imports from server-only modules**. Modal data types are defined directly in the domain layer, with mutable items arrays to ensure full compatibility with `EntryModal`. Domain view models contain **pure numerical values, ratios, and domain enums with zero formatted presentation text strings**.

```typescript
import type { Centavos } from "@/domain/amount";
import type { HexColor } from "@/domain/color";
import type { ClassifiableUmbrella } from "@/domain/umbrella";

export type DashboardMemberFilter = "all" | "household" | string;

export type DashboardFilterState = {
  readonly monthKey: string;
  readonly memberFilter: DashboardMemberFilter;
  readonly categoryId: string | "all";
  readonly range: 6 | 12;
};

export type SavingsBufferHeroData = {
  readonly bufferCentavos: Centavos;
  readonly runwayMonths: number | null;
  readonly sparklinePoints: readonly { readonly x: number; readonly y: number }[]; // 0..1 normalized
  readonly isHouseholdScope: boolean;
};

export type DashboardKpiHistoryMonth = {
  readonly monthKey: string;
  readonly incomeCentavos: Centavos | null;
  readonly expensesCentavos: Centavos | null;
  readonly savingsCentavos: Centavos | null;
  readonly unallocatedCentavos: Centavos | null;
};

export type DashboardKpisData = {
  readonly history: readonly DashboardKpiHistoryMonth[];
  readonly incomeCentavos: Centavos | null;
  readonly incomeDeltaCentavos: Centavos | null;
  readonly expensesCentavos: Centavos | null;
  readonly expensesDeltaCentavos: Centavos | null;
  readonly savingsCentavos: Centavos | null;
  readonly savingsDeltaCentavos: Centavos | null;
  readonly unallocatedCentavos: Centavos | null;
  readonly unallocatedDeltaCentavos: Centavos | null;
  readonly unallocatedScope: "all" | "household" | "member";
};

export type BurnRateDisplayState =
  | "no_plan"
  | "zero_budget_zero_spend"
  | "zero_budget_overspent"
  | "income_category"
  | "under_pace"
  | "on_pace"
  | "over_pace";

export type BurnRateData = {
  readonly utilizationPercent: number | null;
  readonly arcRatio: number; // 0..1
  readonly statusTone: "favourable" | "warning" | "critical" | "neutral";
  readonly state: BurnRateDisplayState;
  readonly hasMonthlyPlan: boolean;
};

export type BudgetTrendBar = {
  readonly monthKey: string;
  readonly actualExpensesCentavos: Centavos;
  readonly heightRatio: number; // 0..1 relative to peak
  readonly isOverspent: boolean;
  readonly isSelected: boolean;
  readonly isUnbudgeted: boolean;
};

export type BudgetTrendData = {
  readonly bars: readonly BudgetTrendBar[];
  readonly budgetLineRatio: number; // 0..1
  readonly budgetCentavos: Centavos;
  readonly range: 6 | 12;
  readonly isApplicable: boolean; // false for income categories
};

export type CategorySpendingRowData = {
  readonly categoryId: string;
  readonly name: string;
  readonly color: HexColor;
  readonly spentCentavos: Centavos;
  readonly budgetCentavos: Centavos;
  readonly progressRatio: number; // 0..1
  readonly deltaCentavos: Centavos; // favourable-positive: budget - spent
  readonly rolloverCentavos: Centavos | null; // current-month unspent or null
  readonly progressTone: BurnRateData["statusTone"];
  readonly statusTone: "favourable" | "warning" | "critical" | "neutral";
  readonly isArchived: boolean;
  readonly isClickable: boolean; // false for archived categories
  readonly isFoldedIntoMergeTarget: boolean;
};

export type CategoriesTableData = {
  readonly rows: readonly CategorySpendingRowData[];
  readonly totalSpentCentavos: Centavos;
  readonly totalBudgetCentavos: Centavos;
  readonly totalDeltaCentavos: Centavos;
  readonly isApplicable: boolean; // false when filtered to an income category
};

export type MemberDistributionSegment = {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly color: HexColor;
  readonly amountCentavos: Centavos;
  readonly widthRatio: number; // 0..1 relative to member's total spend
};

export type MemberDistributionRow = {
  readonly memberId: string | "household";
  readonly name: string;
  readonly totalSpentCentavos: Centavos;
  readonly isArchived: boolean;
  readonly isClickable: boolean; // false for archived members
  readonly isSelected: boolean;
  readonly segments: readonly MemberDistributionSegment[];
};

export type MemberDistributionData = {
  readonly rows: readonly MemberDistributionRow[];
  readonly maxSpendCentavos: Centavos;
  readonly legendSwatches: readonly { readonly name: string; readonly color: HexColor }[];
  readonly isApplicable: boolean; // false for income categories
};

export type GoalFundingStatus =
  | "no_goal"
  | "funded"
  | "on_track"
  | "no_contributions";

export type GoalHighlightData = {
  readonly hasGoal: boolean;
  readonly bucketId: string | null;
  readonly name: string | null;
  readonly currentBalanceCentavos: Centavos;
  readonly targetAmountCentavos: Centavos | null;
  readonly progressRatio: number; // 0..1
  readonly statusTone: "favourable" | "warning" | "neutral";
  readonly status: GoalFundingStatus;
  readonly monthsToTarget: number | null;
  readonly remainingCentavos: Centavos;
  readonly currentMonthFundedCentavos: Centavos;
};

export type UpcomingCommitmentItem = {
  readonly bucketId: string;
  readonly name: string;
  readonly targetMonth: string; // YYYY-MM
  readonly targetAmountCentavos: Centavos;
  readonly currentBalanceCentavos: Centavos;
  readonly remainingCentavos: Centavos;
  readonly isFunded: boolean;
};

export type UpcomingCommitmentsData = {
  readonly commitments: readonly UpcomingCommitmentItem[];
};

export type DashboardModalCategory = {
  readonly id: string;
  readonly umbrella: ClassifiableUmbrella;
  readonly name: string;
  readonly color: HexColor;
  readonly archived: boolean;
  items: { id: string; name: string }[]; // mutable array for EntryModal compatibility
};

export type DashboardModalMember = {
  readonly id: string;
  readonly name: string;
  readonly archived?: boolean;
};

export type DashboardViewData = {
  readonly modelName: string | null; // applied plan for the selected month
  readonly filter: DashboardFilterState;
  readonly hero: SavingsBufferHeroData;
  readonly kpis: DashboardKpisData;
  readonly burnRate: BurnRateData;
  readonly budgetTrend: BudgetTrendData;
  readonly categoriesTable: CategoriesTableData;
  readonly memberDistribution: MemberDistributionData;
  readonly goalHighlight: GoalHighlightData;
  readonly upcomingCommitments: UpcomingCommitmentsData;
  readonly filterMembers: readonly { readonly id: string; readonly name: string }[];
  readonly filterCategories: readonly { readonly id: string; readonly name: string; readonly umbrella: ClassifiableUmbrella }[];
  readonly modalCategories: readonly DashboardModalCategory[];
  readonly modalMembers: readonly DashboardModalMember[];
};
```

---

## 4. Savings Bucket Rules & Historical Balance Derivation

### Single Authoritative Savings Rule: Active Buckets Only
To ensure 100% mathematical consistency with `/savings` (`calculateSavingsKpis`) and `/models`:
- **`SAVINGS BUFFER`**: Sum of lifetime current balances across active buckets where `countsTowardBuffer = true && archivedAt === null`.
- **`SAVINGS` KPI**: Gross contributions (`kind = 'contribution'`) recorded in the selected month across **active buckets only**.
- **Buffer Sparkline**: Historical month-end balances across **active buffer buckets only**. When a bucket is archived, it leaves active totals across current and historical metrics.

### Cumulative Running Balance vs. Monthly Totals
- **Monthly Totals** (Income, Expenses, Monthly Contributions): A month with no transactions displays an exact total of `0`.
- **Cumulative Running Balance** (Savings Buffer):
  - A bucket's opening balance contributes to the buffer **only for months on or after that bucket's creation month** (`substr(bucket.createdAt, 1, 7) <= monthKey`). A bucket created in October with a ₱50,000 opening balance is excluded from January–September's buffer balance points.
  - For each month $M$ in the 12-month rolling window:
    $$\text{balance}(M) = \sum_{\substack{b \in \text{active buffer buckets} \\ \text{substr}(b.\text{createdAt}, 1, 7) \le M}} b.\text{openingBalance} + \sum_{\substack{a \in \text{contribs} \\ a.\text{date} < \text{nextMonthStart}(M)}} a.\text{amount} - \sum_{\substack{a \in \text{withdrawals} \\ a.\text{date} < \text{nextMonthStart}(M)}} a.\text{amount}$$
  - If a month $M$ has no savings activity, its buffer balance **carries forward** from $M-1$ (it does NOT drop to zero).
  - Backdated activity (`activity.date < nextMonthStart(M)`) is included based on its effective financial date, correctly updating that month's ending balance and carrying forward into subsequent months.

### Sparkline Coordinate Normalization Algorithm
In `src/domain/dashboard-calculations.ts`:
`generateSparklineRatios(values: readonly number[]): readonly { x: number; y: number }[]`
- Computes pure normalized coordinates in the unit square $(x, y) \in [0, 1] \times [0, 1]$:
  - If `values.length === 0`: returns `[]`.
  - If `values.length === 1`: returns `[{ x: 0.5, y: values[0] > 0 ? 0.5 : 0 }]`.
  - If `values.length > 1`:
    - Let $N = \text{values.length}$. $x_i = i / (N - 1)$.
    - Let $\max = \max(\text{values})$, $\min = \min(\text{values})$.
    - If $\max === 0$: $y_i = 0$ for all $i$ (baseline flat line).
    - If $\max === \min > 0$: $y_i = 0.5$ for all $i$ (centered flat line).
    - Otherwise: $y_i = \text{values}[i] / \max$ (scaled relative to peak).
- In UI (`savings-buffer-hero.tsx`):
  Maps normalized points to SVG `viewBox="0 0 120 48"`:
  `svgX = point.x * 120`
  `svgY = 44 - point.y * 36` (padded 4px top and bottom, so $y \in [4, 44]$).

---

## 5. Burn Rate Gauge Display States

UI components format the center text and subtitle based on the pure domain `state` and `statusTone`:

| State (`BurnRateDisplayState`) | Condition | Utilization % | Arc Ratio | Status Tone | UI Center Text | UI Subtitle |
|---|---|---|---|---|---|---|
| `"no_plan"` | `hasMonthlyPlan === false` | `null` | `0` | `"neutral"` | `"—"` | `"No plan applied"` |
| `"zero_budget_zero_spend"` | `budget === 0 && actual === 0` | `null` | `0` | `"neutral"` | `"—"` | `"Zero budget · ₱0 spent"` |
| `"zero_budget_overspent"` | `budget === 0 && actual > 0` | `null` | `1.0` (full arc) | `"critical"` | `"Overspent"` | `"No budget allocated"` |
| `"income_category"` | Income category filtered | `null` | `0` | `"neutral"` | `"—"` | `"Income category selected"` |
| `"under_pace"` | `budget > 0 && actual < 85%` | `Math.round(actual*100/budget)` | `actual / (budget*1.5)` | `"favourable"` | `"${utilizationPercent}%"` | `"Under pace"` |
| `"on_pace"` | `budget > 0 && 85% <= actual <= 115%` | `Math.round(actual*100/budget)` | `actual / (budget*1.5)` | `"warning"` | `"${utilizationPercent}%"` | `"On pace"` |
| `"over_pace"` | `budget > 0 && actual > 115%` | `Math.round(actual*100/budget)` | `Math.min(1.0, actual/(budget*1.5))` | `"critical"` | `"${utilizationPercent}%"` | `"Over pace"` |

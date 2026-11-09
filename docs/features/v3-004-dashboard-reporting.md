# Celia v3 — F04: Dashboard & Reporting
**Feature Brief | Accelerated SDD**

## 1. Overview

The Dashboard & Reporting feature provides users with a consolidated view of their household's financial position, spending patterns, budget performance, and savings progress.

Building upon the household configuration (F01), financial transactions (F02), and budget and savings management (F03), this feature transforms recorded financial data into actionable insights.

F04 introduces the primary Dashboard experience and supporting financial visualizations across Celia.

**Primary objective:** Enable users to understand their household's financial position at a glance, identify spending patterns, and evaluate progress against financial plans.

## 2. Goals

Users should be able to:

- View consolidated household financial summaries.
- Monitor income, expenses, savings, and available funds.
- Compare actual spending against planned budgets.
- Understand spending patterns across categories and household members.
- Monitor savings goals and financial commitments.
- Evaluate spending trends over time.
- Navigate from summarized information to the underlying financial records.
- Filter financial information by reporting period and household member.

The Dashboard should prioritize clarity and useful insights over excessive visualizations.

## 3. Functional Scope

### 3.1 Dashboard Overview

The Dashboard shall serve as Celia's primary landing screen.

It should present a consolidated financial summary for the selected reporting period.

At minimum, the overview shall include:

| Metric | Description |
|---|---|
| Total Income | Income recorded during the selected period |
| Total Expenses | Expenses recorded during the selected period |
| Net Cash Flow | Income minus expenses |
| Savings Allocated | Net contributions to savings buckets during the period |
| Available Funds | Net cash flow less net savings allocations |
| Budget Utilization | Actual expenses compared with planned expense allocations |

Financial summaries must derive from authoritative records established in F02 and F03.

Available Funds represents a period-based financial calculation, not necessarily the household's actual bank balance.

### 3.2 Reporting Period and Member Filters

Users shall be able to select a reporting period and household context.

Supported reporting controls should include:

- Monthly reporting.
- Navigation between months.
- Household-wide reporting.
- Individual member reporting where applicable.

The selected context should apply consistently to relevant dashboard components.

Household-wide reporting aggregates all applicable financial activity.

Member-specific reporting must distinguish transactions attributed to a member from transactions explicitly attributed to Household.

Household-level budgets and savings must not be arbitrarily distributed among members.

### 3.3 Income and Expense Trends

The Dashboard shall visualize financial activity over time.

The visualization should support:

- Income trends.
- Expense trends.
- Net cash flow trends.
- Comparison across reporting periods.

Users should be able to identify whether spending is increasing or decreasing and how expenses compare with income.

All plotted values must be derived from recorded transactions.

Periods without activity should be represented accurately rather than omitted in ways that distort the trend.

### 3.4 Expense Breakdown

Users shall be able to understand where household money is being spent.

The Dashboard should display expense distribution by category.

Relevant information includes:

- Category name and identifying color.
- Total spending.
- Percentage of overall expenses.
- Relative contribution to household spending.

Category colors must remain consistent with those established in F01.

Archived categories containing historical transactions must remain represented in historical reports.

Users should be able to navigate from a category summary to the corresponding filtered transaction records.

### 3.5 Budget Performance

The Dashboard shall summarize actual financial performance against the active monthly budget established in F03.

Relevant metrics include:

- Total planned expenses.
- Actual expenses.
- Remaining budget.
- Budget utilization percentage.
- Over-budget categories.
- Unallocated planned income.

Budget performance should distinguish between:

**Within Budget:** Actual spending remains within the planned allocation.

**At Budget:** Actual spending equals the allocation.

**Over Budget:** Actual spending exceeds the allocation.

Categories without a budget allocation must not be incorrectly treated as having unlimited available budget.

When no budget model is applied to the selected month, the Dashboard should present an appropriate unconfigured state rather than fabricated budget values.

### 3.6 Savings Overview

The Dashboard shall summarize the household's savings position using Savings Buckets established in F03.

Relevant information includes:

- Total savings balance.
- Savings contributions during the selected period.
- Savings withdrawals during the selected period.
- Net savings movement.
- Progress toward savings targets.
- Selected savings bucket highlights.

Savings contributions must not be counted as expenses.

Savings withdrawals must not be counted as income.

Savings figures must remain consistent with the Savings Buckets screen.

### 3.7 Cash Buffer and Burn Rate

The Dashboard should provide indicators of the household's ability to sustain expenses.

**Cash Buffer**

Represents funds explicitly designated as readily available reserves, based on the relevant savings bucket configuration.

**Burn Rate**

Represents the household's average expense outflow over a defined historical period.

**Runway**

Estimates how long the available cash buffer could cover expenses at the calculated burn rate.

For example:

Runway = Available Cash Buffer ÷ Average Monthly Expenses

The reporting specification must define the averaging window, eligible buckets, and handling of insufficient historical data.

These metrics are descriptive indicators rather than forecasts.

When insufficient data exists, Celia should indicate that the metric cannot yet be calculated reliably.

### 3.8 Household Member Breakdown

Users shall be able to view financial activity attributed to individual household members.

Relevant information includes:

- Income per member.
- Expenses per member.
- Net cash flow per member.
- Relative contribution to household income.
- Relative share of household spending.

Transactions explicitly owned by Household must remain separate unless an approved allocation rule exists.

The Dashboard should not imply that a household-level expense belongs to a specific member without supporting data.

### 3.9 Financial Commitments and Goals

The Dashboard should provide a concise overview of relevant financial commitments and savings goals.

This may include:

- Savings goals approaching their targets.
- Savings goals requiring additional contributions.
- Budget categories approaching their limits.
- Significant recurring spending patterns identifiable from existing records.

F04 must not introduce a separate commitments-management system.

Any displayed commitments or goals must originate from existing F01–F03 data.

### 3.10 Drill-Down Navigation

Dashboard summaries should allow users to investigate the underlying financial activity.

Where applicable, users should be able to navigate to:

- Entries filtered by reporting period.
- Entries filtered by category.
- Entries filtered by member.
- Savings Buckets.
- Budget Models.

Navigation should preserve relevant reporting context when supported by the destination screen.

The Dashboard must not create separate copies of underlying transaction or savings data.

## 4. Domain Rules

### Authoritative Financial Data

All financial reports must derive from authoritative data established by preceding features.

- Income and expenses originate from F02 transactions.
- Savings balances and movements originate from F03 savings activity.
- Budget allocations originate from F03 monthly plans.
- Household ownership originates from F01.

Dashboard calculations must not introduce competing sources of financial truth.

### Financial Distinctions

Celia must maintain clear distinctions between:

- Actual income
- Actual expenses
- Net cash flow
- Savings allocations
- Available funds
- Planned budgets
- Forecast values

Savings allocations must not be double-counted as expenses.

Budget allocations must not be treated as actual spending.

### Reporting Consistency

All dashboard components must use consistent reporting-period boundaries.

Monthly reporting uses calendar months unless an approved project-wide convention specifies otherwise.

Historical reports must reflect the applicable financial records and budget plans.

### Financial Precision

All monetary calculations must follow Celia's established exact-money representation and deterministic rounding rules.

Percentages and ratios may be rounded for presentation without altering underlying financial values.

### Incomplete Data

Missing financial information must not be represented as zero when the distinction is meaningful.

For example:

- No applied budget is different from a zero budget.
- No historical expense data is different from an established zero burn rate.
- No savings target is different from a target of zero.

The Dashboard must handle these conditions explicitly.

## 5. UX Requirements

The supplied Celia v3 prototype remains the primary visual and interaction reference.

F04 should implement the relevant:

- Dashboard screen.
- Financial KPI cards.
- Income and expense visualizations.
- Budget utilization indicators.
- Savings summaries.
- Cash buffer and runway indicators.
- Category and member breakdowns.
- Reporting-period controls.
- Drill-down navigation.
- Empty, loading, and error states.

The interface should reuse the Celia design system established in F01.

Visualizations should prioritize readability and meaningful comparison.

Avoid introducing charts merely to fill available space.

The Dashboard should remain usable at the desktop widths established by the project.

## 6. Persistence and Integration

F04 primarily consumes existing financial data and should not introduce unnecessary new financial entities.

Any persisted reporting preferences should be limited to genuine user configuration, such as the preferred reporting period or default view, if required.

Derived financial values should generally be calculated rather than stored independently.

Caching or precomputed summaries may be introduced when justified by measured performance needs.

Reporting logic should be implemented through reusable calculation functions or services rather than duplicated across UI components.

These calculations should also be available to F05 Forecaster where applicable.

## 7. Out of Scope

F04 does not implement:

- Financial forecasting or scenario simulation.
- AI-generated financial advice.
- Automated spending recommendations.
- Bank balance reconciliation.
- Bank account synchronization.
- Investment performance reporting.
- Tax reporting.
- Custom report builders.
- PDF or spreadsheet exports.
- Automated notifications.
- Debt amortization engines.
- New recurring transaction management.
- Additional transaction or budget editing workflows.

These may be introduced through later features or future Celia versions.

## 8. Acceptance Criteria

F04 is complete when:

1. The Dashboard displays consolidated household financial summaries.
2. Income, expense, and net cash flow calculations match F02 records.
3. Savings balances and movements match F03 savings activity.
4. Available funds are calculated without double-counting savings.
5. Users can navigate between monthly reporting periods.
6. Household and member filters produce consistent financial summaries.
7. Income and expense trends accurately reflect historical transactions.
8. Expense breakdowns accurately represent category spending.
9. Category colors remain consistent with F01.
10. Budget utilization reflects the applied monthly budget and actual expenses.
11. Over-budget categories are clearly identified.
12. Months without applied budgets display appropriate unconfigured states.
13. Savings progress and balances match the Savings Buckets screen.
14. Cash buffer, burn rate, and runway calculations follow documented rules.
15. Insufficient historical data is handled without misleading calculations.
16. Household-owned transactions are not incorrectly attributed to individual members.
17. Relevant Dashboard elements support navigation to underlying records.
18. Reporting remains consistent after transactions, budgets, or savings activity change.
19. Empty, loading, and error states are handled appropriately.
20. The Dashboard follows the supplied Celia v3 prototype.
21. Automated tests verify critical financial summaries, aggregation rules, reporting periods, and edge cases.

## 9. Implementation Guidance

F04 should be implemented as a reporting and visualization layer over existing Celia capabilities.

The implementation plan may separate work into:

- Financial aggregation and reporting calculations.
- Dashboard KPI components.
- Income and expense visualizations.
- Budget and savings summaries.
- Household and category breakdowns.
- Reporting filters and drill-down navigation.

These remain implementation tasks within one feature rather than separate feature briefs.

Avoid introducing a generalized analytics platform, reporting database, or separate financial calculation engine unless an actual requirement justifies it.

Reuse established domain logic and keep financial calculations independently testable.

**Expected outcome:** After F04, Celia should provide a comprehensive, reliable view of household finances, allowing users to understand financial activity, monitor budgets and savings, and identify spending patterns without manually consolidating data.
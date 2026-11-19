# F05 — Forecaster

## 1. Overview

The Forecaster enables users to project their household's future financial position based on historical financial activity, current budgets, savings, and hypothetical scenarios.

Building upon F01–F04, this feature introduces forward-looking financial analysis without modifying actual financial records.

Users can explore potential financial outcomes, evaluate upcoming expenses, and understand how changes in income, spending, or savings may affect their financial position.

**Primary objective:** Enable users to make informed financial decisions by exploring realistic financial projections and comparing alternative scenarios.

## 2. Goals

Users should be able to:

- Generate financial projections from existing household data.
- View expected income, expenses, savings, and available funds over time.
- Create hypothetical financial scenarios.
- Introduce future financial events and adjustments.
- Compare scenarios against a baseline projection.
- Identify potential future deficits and financial pressure.
- Understand how planned changes affect savings and financial runway.
- Explore projections without changing actual financial records.

The Forecaster should prioritize understandable calculations and transparent assumptions over unnecessarily sophisticated predictive models.

## 3. Functional Scope

### 3.1 Baseline Forecast

Celia shall generate a baseline projection representing the household's expected financial trajectory under existing financial conditions.

The baseline should consider:

- Historical income and expense activity from F02.
- Applied monthly budgets from F03.
- Savings balances and planned allocations from F03.
- Existing financial indicators and calculations from F04.

The baseline must distinguish between historical actuals and projected values.

Forecast assumptions must be identifiable and consistent.

Where insufficient data exists, Celia should clearly indicate which assumptions or estimates are being used.

### 3.2 Forecast Horizon

Users shall be able to view projections across configurable future periods.

The Forecaster should support:

- Monthly projection intervals.
- A selectable forecast horizon.
- Navigation across projected periods.
- Cumulative financial position over time.

Each projected month should present:

| Metric | Description |
|---|---|
| Projected Income | Expected household income |
| Projected Expenses | Expected household spending |
| Projected Net Cash Flow | Income minus expenses |
| Projected Savings | Expected savings contributions and withdrawals |
| Projected Available Funds | Net cash flow after net savings movements |
| Projected Reserves | Expected balance of tracked savings buckets |

The specification should define how projections begin when the current month is already partially complete.

### 3.3 Financial Scenarios

Users shall be able to create alternative scenarios to explore changes in their financial circumstances.

Examples include:

- Reduced household income.
- Increased monthly living expenses.
- Additional recurring expenses.
- A major one-time purchase.
- Increased savings contributions.
- Temporary loss of income.

Each scenario should contain:

- Name
- Optional description
- Forecast horizon
- Financial adjustments
- Associated future events

Users should be able to create, edit, duplicate, and remove scenarios.

Scenarios must remain separate from actual financial activity and applied budgets.

### 3.4 Scenario Adjustments

Users shall be able to modify forecast assumptions within a scenario.

Supported adjustments should include:

**Income adjustments**
- Increase or decrease projected income.
- Apply changes beginning in a selected future month.
- Specify whether changes are temporary or ongoing.

**Expense adjustments**
- Increase or decrease projected expenses.
- Adjust specific expense categories.
- Apply temporary or ongoing changes.

**Savings adjustments**
- Modify planned savings contributions.
- Evaluate the effect of reduced or increased savings allocations.

Adjustments must affect only the selected scenario.

### 3.5 Future Financial Events

Users shall be able to introduce hypothetical financial events.

Examples include:

- Annual insurance payment.
- Vehicle maintenance.
- Travel expenses.
- Bonus income.
- Appliance purchase.
- Temporary income interruption.

An event should contain:

- Name
- Financial type
- Amount
- Scheduled date or month
- One-time or recurring behavior
- Optional description

Events must be incorporated into projections without creating actual F02 transactions or F03 savings activity.

### 3.6 Scenario Comparison

The Forecaster shall allow users to compare financial outcomes between a baseline and alternative scenarios.

Comparisons should include:

- Projected cumulative available funds.
- Projected income and expenses.
- Projected savings position.
- Expected monthly surplus or deficit.
- Financial runway where applicable.
- Difference from baseline.

The comparison should clearly identify the financial impact of each scenario.

Multiple scenarios may be compared where supported by the interface.

### 3.7 Forecast Visualizations

The Forecaster should provide visual representations of projected financial performance.

Relevant visualizations include:

- Financial trajectory over time.
- Baseline versus scenario projections.
- Monthly projected income and expenses.
- Projected savings balances.
- Periods of expected financial deficits.
- Scenario impact summaries.

Historical actuals and projected values must be visually distinguishable.

Charts must use consistent financial definitions and calculation rules.

### 3.8 Financial Nudges

Celia should provide contextual observations based on forecast results.

Examples include:

- A projected deficit in a future month.
- A savings bucket expected to fall below its target.
- An upcoming expense that significantly reduces available funds.
- A scenario that improves or reduces projected financial runway.
- A projected savings goal completion date.

Nudges should be generated from deterministic financial calculations.

They must not imply certainty about future financial outcomes.

AI-generated financial advice is not required.

## 4. Domain Rules

### Forecasts Are Not Actuals

Forecast records must remain separate from actual financial transactions, savings movements, and applied monthly budgets.

Creating or modifying a scenario must not change historical financial data.

Projected values must never be presented as confirmed financial activity.

### Financial Consistency

F05 must preserve the distinctions established in previous features:

- Income is distinct from expenses.
- Savings movements are not income or expenses.
- Budget allocations are plans, not actual transactions.
- Forecast adjustments are hypothetical.
- Available funds are not necessarily actual bank balances.

### Deterministic Calculations

Given identical source data and assumptions, the Forecaster must produce identical results.

Forecasting logic must be independently testable.

The calculation method and relevant assumptions must be documented in the specification.

### Scenario Isolation

Each scenario must maintain its own assumptions and adjustments.

Changes to one scenario must not unintentionally affect another scenario or the baseline.

### Historical Integrity

Forecasting must not overwrite historical transactions or monthly budget plans.

Changes to underlying financial records may affect newly calculated forecasts.

Previously saved scenarios should retain their explicitly configured assumptions.

### Financial Precision

Monetary calculations must follow Celia's established financial precision and rounding rules.

## 5. UX Requirements

The supplied Celia v3 prototype remains the primary visual and interaction reference.

F05 should implement the relevant:

- Forecaster screen.
- Baseline financial projection.
- Forecast horizon controls.
- Scenario creation and management.
- Scenario adjustment controls.
- Future financial events.
- Scenario comparison.
- Financial projection charts.
- Contextual financial nudges.
- Empty, validation, and error states.

The interface should reuse the design system established in F01.

Users should be able to understand which values are historical, planned, or projected without requiring knowledge of the underlying calculation implementation.

Forecast assumptions should be accessible and understandable.

## 6. Persistence and Integration

F05 consumes financial information established in F01–F04.

Persisted information should include:

- Scenario definitions.
- Scenario adjustments.
- Hypothetical financial events.
- User-configured forecast assumptions.
- Forecast horizon preferences, where applicable.

Derived projections should generally be recalculated from authoritative source data rather than maintained as independent financial records.

The implementation should reuse established financial calculation utilities where appropriate.

Forecast calculations should remain separate from presentation components.

## 7. Out of Scope

F05 does not implement:

- AI-generated financial advice.
- Machine-learning-based financial predictions.
- Automated investment recommendations.
- Market or economic forecasting.
- Bank account reconciliation.
- Automated financial transactions.
- Automated budget modifications.
- Debt amortization engines.
- Tax forecasting.
- Multi-currency projections.
- External financial data integrations.
- Real-time market data.
- Financial product recommendations.

These may be considered for future Celia versions.

## 8. Acceptance Criteria

F05 is complete when:

1. Users can generate a baseline financial projection from existing Celia data.
2. Projections distinguish historical actuals from future estimates.
3. Users can select a forecast horizon.
4. Monthly projected income, expenses, savings, and available funds are calculated consistently.
5. Users can create, edit, duplicate, and remove scenarios.
6. Users can adjust projected income, expenses, and savings within scenarios.
7. Users can define one-time and recurring hypothetical financial events.
8. Scenario adjustments affect only their associated scenario.
9. Users can compare scenario outcomes against the baseline.
10. Financial visualizations accurately represent projected values.
11. Projected deficits and significant financial changes are identifiable.
12. Contextual nudges are derived from explainable financial calculations.
13. Forecast operations do not modify actual transactions or budgets.
14. Saved scenarios and assumptions persist across reloads.
15. Changes to underlying financial data are reflected when forecasts are recalculated.
16. Financial calculations are deterministic and use appropriate precision.
17. Missing or insufficient historical data is handled explicitly.
18. The Forecaster follows the supplied Celia v3 prototype.
19. Relevant empty, validation, and error states are handled.
20. Automated tests verify projection calculations, scenario isolation, and financial edge cases.

## 9. Implementation Guidance

F05 should be implemented as a single vertical feature, with the implementation plan potentially separating work into:

- Baseline projection calculations.
- Forecast horizon and monthly projection logic.
- Scenario management.
- Hypothetical financial events.
- Scenario comparison.
- Forecast visualizations and nudges.

Avoid introducing a generic simulation engine or AI forecasting infrastructure.

A deterministic, rule-based projection model is sufficient for Celia v3 unless an approved requirement establishes otherwise.

Forecast assumptions, particularly those involving historical averages, future budget allocations, savings movements, and partial months, should be explicitly defined during specification.

**Expected outcome:** After F05, Celia should allow users to explore how their household finances may evolve, compare alternative financial decisions, and identify potential financial challenges before they occur.

This completes the five-feature scope planned for Celia v3.
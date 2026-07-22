# Dashboard household comparison chart design

## Purpose

Let a household compare every member's recorded income and expenses, so spending distribution is clear at a glance.

## Data and display

The dashboard will pass ready `members` and `transactions` into a `HouseholdComparisonChart`. A pure domain helper will group every transaction by `memberId`, retain separate positive income and expense totals in PHP minor units, and associate each total with its configured member name. Totals are sorted alphabetically by member name for a stable display.

The card uses a native SVG grouped-bar chart: each member has an income bar and an expense bar sharing a zero baseline. It includes a legend, member labels, and screen-reader text with formatted PHP totals. No chart library, filtering, mutation, or forecasting behavior is added.

## Empty state

The card stays visible when no transactions are recorded and explains that member comparisons will appear after transactions are added. It does not render an empty chart graphic. Members without transactions are not shown, preventing misleading zero-value comparisons.

## Verification

Domain tests cover per-member aggregation, income/expense separation, ordering, and no-transaction input. Dashboard tests cover populated chart data and the empty state. The final pipeline checks formatting, linting, types, tests, and the production build.

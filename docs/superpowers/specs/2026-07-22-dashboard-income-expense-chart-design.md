# Dashboard income and expense chart design

## Purpose

Let users compare monthly income with monthly expenses to identify spending trends from their recorded transactions.

## Chart and data flow

The dashboard will render an `IncomeExpenseChart` card before the existing bucket-group section. When application data is ready, the component receives the transaction list and groups each transaction by its `YYYY-MM` date prefix. It sums positive PHP minor-unit amounts into separate income and expense totals for each month, then orders the monthly buckets chronologically.

The visual is a native SVG grouped bar chart: each month has one income bar and one expense bar sharing a zero baseline. A compact legend identifies the two series, month labels sit below their groups, and a text summary makes the data available without relying on the graphic. Values use the application currency convention and are formatted as PHP amounts for display. Native SVG avoids adding a chart dependency and allows the existing Tailwind styling to match the prototype.

## Empty and unavailable data

When the ready transaction list is empty, the card remains visible and shows an explicit empty state explaining that the chart will appear after transactions are recorded. It does not render misleading axes or zero-value bars. While data is loading or has failed, the dashboard preserves the existing safe empty inputs and the chart shows the same empty-state treatment.

## Boundaries and testing

The chart is descriptive only: it has no forecasting, filtering controls, or mutation behavior. Existing transaction persistence and dashboard bucket groups are unchanged.

Domain-level tests cover monthly aggregation and income/expense separation. Component tests cover populated rendering and the empty state with the data provider. The verification pipeline runs formatting, linting, type checking, tests, and production build.

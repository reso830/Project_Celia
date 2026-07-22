# Dashboard cash flow chart design

## Goal

Show how the household cash balance changes over time on the dashboard.

## Scope

- Add a cash-flow chart to the dashboard.
- Calculate a running balance from persisted transactions.
- Combine all transactions occurring on the same calendar date into one chart point.
- Display an explicit empty state when no transactions exist.

Forecasting, time-of-day ordering, and interactive chart controls are out of scope.

## Approach

Create a `CashFlowChart` component that receives transactions from the ready
application data state. It will derive daily balance points by sorting transactions
by ISO date, treating income as positive and expenses as negative, aggregating the
signed movement for each date, and cumulatively adding the daily movements from a
zero opening balance.

The component will render an inline SVG line chart without an added dependency.
It will expose the current balance and text alternatives for its date/balance points
so the data remains available to assistive technology. Amounts remain PHP minor
units until display formatting.

When no transactions are supplied, the component will render a named empty-state
message rather than an SVG chart. The existing dashboard heading, navigation, and
bucket-group content remain unchanged.

## Testing

Component tests will cover:

- Rendering a cash-flow chart for transactions.
- Daily aggregation and running-balance calculation across income and expenses.
- Chronological ordering when input order differs from date order.
- The no-transactions empty state.

The verification pipeline will run the focused component tests, full test suite,
lint, type check, formatting check, and production build.

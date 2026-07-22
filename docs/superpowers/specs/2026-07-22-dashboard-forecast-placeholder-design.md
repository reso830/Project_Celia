# Dashboard forecast placeholder design

## Goal

Show that forecasting is planned without implementing forecasts, predictions, or
any related calculations.

## Design

Add a focused `ForecastPlaceholder` presentational component and render it on
the dashboard immediately beneath `CashFlowChart`.

The component is static: it accepts no data and does not import domain helpers,
repositories, or forecasting code. It displays the exact prototype copy:

> Coming soon — forecasting projected balances from your recurring income and
> expenses.

## Visual treatment

The callout follows the approved prototype:

- `1px dashed #c3ccd6` border and `12px` corner radius.
- `14px 18px` padding, with a compact horizontal layout and `10px` gap.
- Body text uses `12.5px` muted `#8a93a3` text.
- The `Coming soon —` prefix is semibold `#4c6a92`.

It appears below the dashboard chart area, after the cash-flow chart and before
the bucket-groups section.

## Testing and scope

A component test will assert that the placeholder and exact roadmap copy render.
The dashboard integration test will assert that the callout appears in the
dashboard. The component has no data inputs, which prevents it from deriving a
forecast or performing any calculation.

No transaction, domain, repository, persistence, prediction, or forecasting
logic changes are included. The existing lint, formatting, typecheck, test, and
production-build pipeline will be run after implementation.

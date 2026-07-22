# Dashboard Financial Summary Design

## Purpose

Give users an at-a-glance view of their all-time financial position without adding charts or time filtering.

## Scope

The dashboard will display four summary cards above the existing bucket-group section:

- Income: sum of income transaction amounts.
- Expenses: sum of expense transaction amounts, shown as a positive monetary value.
- Net: income minus expenses.
- Savings Rate: `(net / income) * 100`, shown as `0%` when income is zero.

All values use the full transaction collection. A later time-filter feature will supply a filtered collection without changing these calculations.

## Architecture

Add a focused domain summary function that accepts readonly transactions and returns the four minor-unit metrics plus the percentage savings rate. It will keep business calculations out of React and support direct unit tests.

Add a reusable dashboard summary component which formats PHP minor-unit values as currency and renders four accessible cards. The existing dashboard component will read transactions from the ready data state, provide an empty collection while loading or errored, and render the summary above Bucket groups.

## Empty State and Errors

With no transactions, all monetary values display zero and Savings Rate displays `0%`. The current bucket-group empty message remains unchanged. Loading and data-error states also safely use zero transactions, matching the dashboard's existing defensive data access.

## Testing

Domain tests will cover mixed income and expenses, expenses-only data, and no income. Component tests will verify all four cards for populated and empty data. The verification pipeline will run linting, type checking, unit tests, formatting validation, and production build.

## Out of Scope

Charts, time filtering, and any data-model changes are excluded.

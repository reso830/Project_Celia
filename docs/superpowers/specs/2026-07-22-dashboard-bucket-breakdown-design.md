# Dashboard bucket breakdown design

## Purpose

Give the dashboard an at-a-glance view of expense distribution so a user can identify their largest spending buckets.

## Scope

The dashboard will show a bucket breakdown chart above the existing bucket-group overview. It includes expense transactions only; income, orphaned transactions whose category no longer exists, and buckets with zero spending are excluded.

## Architecture

Add a pure domain helper that accepts transactions and categories, associates each expense transaction with its category's expense bucket group, and returns totals in PHP minor units. Transactions for the same normalized bucket name are accumulated together.

`BucketBreakdownChart` receives the breakdown data and configured bucket colors. It resolves an expense bucket's color using `expenseBucketColorKey`, retaining the existing neutral fallback when no color has been configured. The component owns presentation only; the dashboard reads application data and passes it in.

## User interface and accessibility

The component renders a native SVG donut chart with a visible color-keyed breakdown list. Each entry exposes the bucket name, PHP total, and percentage of total expense. The SVG has an accessible name and descriptive text, while the adjacent list provides all information without relying on color alone.

If no expense breakdown is available, the chart area instead displays: `No expense transactions yet.`

## Testing and verification

Domain tests will verify category-to-bucket aggregation, normalization, expense-only filtering, and orphaned-category handling. Component tests will verify chart rendering, configured bucket colors, the empty state, and dashboard integration. The full lint, formatting, typecheck, test, and production-build pipeline will pass.

## Out of scope

Forecasting, time-range filters, interactive chart tooltips, and a third-party charting dependency are out of scope.

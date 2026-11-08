# Repository map

- `src/app/(shell)`: shell pages and routes for the desktop application.
- `src/app/api`: JSON route handlers for mutations.
- `src/domain`: pure entity types, validation, and domain errors.
- `src/server`: read models, services, and SQLite store adapters.
- `src/server/db`: database opening, migrations, and singleton access.
- `src/server/demo.ts`: transactional F01/F02/F03 demo seed and guarded clear across all ten user tables.
- `src/components/shell`: navigation rail, page headers, and shared shell controls.
- `src/components/household`: household and member-management UI.
- `src/components/categories`: category, item, move, merge, and archive UI.
- `src/components/entries`: Entries workspace, entry modal, table, and custom popovers.
- `src/components/ui`: shared dialogs, empty states, and mutation helper.
- `tests/domain`: pure domain-rule tests.
- `tests/server`: database, store, migration, service, and seed/clear tests (`seed-clear.test.ts`).
- `tests/api`: route-handler and HTTP helper tests.
- `tests/components`: component workflow tests, including `tests/components/entries`, `tests/components/savings`, and `tests/components/models`.
- `tests/release-docs.test.ts`: release metadata, command, and documentation link checks.
- `specs/`: feature specifications, plans, tasks, contracts, and quickstarts.
- `docs/features/`: approved feature briefs.
- `handoff/`: supplied design-reference archives.
- `scripts/prompts/`: project workflow prompts.
- `scripts/seed.ts`, `scripts/clear.ts`: demo tooling command-line entry points.
- `scripts/seed.json`: prototype-based demo dataset.
- `.specify/`: Spec Kit templates and project constitution.

## F03 Budget & Savings

- `src/app/(shell)/savings`: Savings server page, loading skeleton and retry error boundary.
- `src/app/(shell)/models`: Budget Models server page, loading skeleton and retry error boundary.
- `src/domain/month.ts`: shared month-key validation and current-month helper.
- `src/domain/savings.ts`: bucket/activity types, date and balance validation, and bucket display helpers.
- `src/domain/savings-calculations.ts`: lifetime balances, target progress, buffer, runway and gross monthly funding/shortfall KPIs.
- `src/domain/budget.ts`: reusable model, monthly plan and allocation types and validation.
- `src/domain/budget-calculations.ts`: planned/actual summaries, favourable-positive variances, historical merge folding, and chart data.
- `src/server/savings-store.ts`: savings bucket/activity SQL and aggregate reads.
- `src/server/savings-service.ts`: transactional bucket/activity writes, default transfer and non-negative balance enforcement.
- `src/server/savings-read.ts`: selected-month Savings view and KPI assembly.
- `src/server/models-store.ts`: model/plan allocation SQL and reusable-model merge updates.
- `src/server/models-service.ts`: transactional model CRUD/duplicate/apply and monthly snapshot revisions.
- `src/server/models-read.ts`: selected-month Models view, template badges, actuals and merged-category closure.
- `src/app/api/savings/**`: bucket create/update/archive/restore and activity create/update/delete JSON handlers.
- `src/app/api/models/**`: reusable model create/update/delete/duplicate/apply JSON handlers.
- `src/app/api/monthly-plans/**`: monthly snapshot allocation revision handler.
- `src/components/savings/`: KPI row, bucket cards, forms, activity history, archive/restore and screen orchestration.
- `src/components/models/`: two-mode model list, allocation table, charts, metadata modal and screen orchestration.
- `specs/v3-003-budget-and-savings/`: [spec](../specs/v3-003-budget-and-savings/spec.md), [API contract](../specs/v3-003-budget-and-savings/contracts/api.md), [quickstart](../specs/v3-003-budget-and-savings/quickstart.md) and [deviations](../specs/v3-003-budget-and-savings/deviations.md).

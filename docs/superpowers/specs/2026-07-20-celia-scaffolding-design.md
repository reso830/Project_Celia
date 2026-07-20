# Celia Project Scaffolding Design

## Purpose

Establish a maintainable, local-only foundation for Celia, an expense-tracking web application. This scaffold provides project conventions, an intentionally empty dashboard, a replaceable data boundary, automated verification, and continuous integration. It does not implement expense tracking features yet.

## Scope

Included:

- Next.js App Router with TypeScript in strict mode.
- Tailwind CSS for styling and a small reusable dashboard shell.
- One empty dashboard route that communicates the product is ready for future expense data.
- Typed domain models and calculation helpers for expenses and budgets.
- A `BudgetRepository` contract with an in-memory adapter that returns no data initially.
- Vitest and Testing Library for unit and component tests.
- ESLint, Prettier, type checking, and a GitHub Actions workflow that runs verification on pushes and pull requests.
- README documentation for setup, commands, architecture, and deferred work.

Excluded:

- Authentication and passkeys.
- Persistent local storage, a database, or a backend API.
- Expense-entry forms, transaction management, budgets, categories, charts, or reports.
- Production hosting and deployment configuration.
- Final visual design; a separate wireframe/prototype task will direct that work.

## Architecture

The application uses Next.js App Router for routing and page composition. The `app` layer is limited to route and layout concerns. Reusable presentation components live in `components`.

Business concepts and calculations are isolated in `domain`. Money is represented as integer minor currency units, such as cents, so calculations do not use floating-point values. Formatting happens only at the presentation boundary.

Data access is isolated in `data`. Screens depend on the `BudgetRepository` interface, not an implementation. The initial in-memory adapter is a deliberately temporary implementation. A later localStorage, IndexedDB, SQLite, or HTTP-backed adapter can replace it without requiring screen-level changes.

```text
src/
  app/              Next.js routes, layout, empty dashboard
  components/       reusable UI primitives and dashboard shell
  data/             repository interface and in-memory adapter
  domain/           expense/budget types and numeric helpers
  lib/              small shared utilities
tests/              unit and component tests
.github/workflows/  CI workflow
```

## User Experience and Data Flow

The only application view is an empty dashboard state. It presents no sample transactions or financial totals, leaving the UI ready for a later wireframe-driven feature task.

The dashboard obtains data through the repository contract. For the scaffold, the in-memory adapter returns an empty transaction collection. An empty collection is a normal state and renders the empty dashboard without an error. The scaffold does not add persistence or failure UI because neither is needed until a real adapter is introduced.

## Verification

Unit tests cover numeric domain helpers and the in-memory repository's conformance to the repository contract. A component test confirms the dashboard's empty state renders.

The local verification commands are linting, formatting checks, TypeScript checking, unit/component tests, and a production build. GitHub Actions uses a supported Node LTS release, caches dependencies, and runs the same checks for pushes and pull requests.

## Future Evolution

The next feature task can replace the empty dashboard using the wireframe/prototype and can add transaction entry and charts. It should use the existing domain and repository boundaries. A local passkey gate can be added later without reshaping expense data or calculations; it is intentionally not part of this scaffold.

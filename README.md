# Celia

Celia is a local-first household finance application. Version 3.4.0 includes household
members, Income/Expense categories and items, an Entries workspace, Savings Buckets,
Budget Models, Dashboard reporting, and Forecaster. Amounts are stored as integer centavos so calculations remain exact.

## Forecaster

- `/forecaster` projects 24 months from the current month's applied budget plan and active savings buffer. Apply a budget in `/models` to get started.
- Create or duplicate scenarios to compare a one-time buffer draw, hypothetical monthly costs, and expense or savings adjustments. Review the outlook chart, cash flow, runway, and verdict side by side.
- Scenario changes leave actual entries, savings activity, and applied budgets intact.

See the [F05 quickstart](specs/v3-005-forecaster/quickstart.md) for Forecaster flows.

## Dashboard and reporting

- `/` shows savings buffer, runway, monthly totals, and trends alongside the applied budget.
- Filter by month, owner, or category. Use the six- or twelve-month spending comparison,
  category breakdown, and member distribution to review spending. Category links open
  the matching Entries view.
- Track savings goals and upcoming commitments. Add an entry from the dashboard to
  refresh the reporting totals.

See the [F04 quickstart](specs/v3-004-dashboard-reporting/quickstart.md) for reporting flows.

## Savings and budget planning

- `/savings`: create and manage savings buckets with opening balances, optional targets
  and due months, buffer inclusion, and a protected default Cash Buffer. Record contributions
  and withdrawals, edit or delete activity from history, and archive or restore buckets.
  Lifetime balances, buffer, runway, and selected-month gross funding and shortfalls are
  derived from recorded activity. Savings activity is separate from income and expense entries.
- `/models`: create, edit, duplicate, and delete reusable budget models. Allocate income,
  expenses, and savings inline with live totals and charts. Apply a template to a selected
  month to create an independent snapshot; later template changes leave that plan intact.
  Past-month plans require an explicit unlock to revise, and overwrites require confirmation.
  Budget-vs-Actual uses the selected month's entries and gross savings contributions, including
  historical merged-category folding.

See the [F03 quickstart](specs/v3-003-budget-and-savings/quickstart.md) for detailed flows.

## Prerequisites

- Node.js 22 or later
- npm 10 or later
- A supported native build environment for [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3)

## Getting started

```bash
npm install
npm run dev
```

The development server binds only to `http://127.0.0.1:3000`. Celia stores its local SQLite
database at `./data/celia.db` by default. Set `CELIA_DB_PATH` to use another local path:

```bash
CELIA_DB_PATH=./data/celia.db npm run dev
```

On PowerShell:

```powershell
$env:CELIA_DB_PATH = "./data/celia.db"
npm run dev
```

Celia is not deployable to serverless hosting: `better-sqlite3` requires a persistent local
filesystem and native module support.

## Demo data

With development dependencies installed, `npm run seed` adds a deterministic household
and twelve rolling calendar months of entries ending in the current month, plus four
savings buckets, 36 contributions dated on each month's first day, three reusable budget
models, 12 independent Baseline 2026 monthly plans, and three Forecaster alternatives from `scripts/seed.json`. Bucket
balances are derived from opening balances and activity; target/due months retain the
fixture's dates. Seeding requires an otherwise empty database and retains the protected Forecaster baseline.
These commands use `CELIA_DB_PATH` when set, or `./data/celia.db` otherwise.

```bash
npm run seed
npm run clear          # Dry run: show counts without deleting
npm run clear -- --yes # Delete all user records, including savings and budget data
```

Dry run reports counts for savings buckets and activities, budget models and allocations,
monthly plans and allocations, entries, items, categories, members, alternative scenarios, events, and nudges.

The confirmed clear is irreversible and removes real user data as well as demo data;
household and umbrella configuration rows, the Forecaster baseline, and the schema are retained.

## Verification

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
```

GitHub Actions runs these checks on every push and pull request.

## Architecture

- `src/domain` holds pure entity types, validation, exact-centavo calculations, and domain errors.
- `src/server/db` opens the local SQLite database and applies migrations; server stores and
  services map rows and enforce use-case rules.
- `src/app/api` exposes thin JSON mutation handlers.
- `src/app/(shell)` server pages read views and pass them to client components.
- `src/components` renders the shell, household, categories, Entries, Savings, Models, Dashboard, Forecaster, and shared UI workflows.
- `src/server/dashboard-read.ts` assembles reporting views from entries, applied monthly plans, and savings activity.

## Scope

Authentication and server deployment are outside
the current feature scope.

See the [changelog](CHANGELOG.md), [feature roadmap](docs/feature_roadmap.md), and
[repository map](docs/REPO_MAP.md) for project context.

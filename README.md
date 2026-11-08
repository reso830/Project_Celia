# Celia

Celia is a local-first household finance application. Version 3.1.0 includes household
members, Income/Expense categories and items, and an Entries workspace for recording,
editing, deleting, searching, filtering, and reviewing income and expenses. Amounts are
stored as integer centavos so calculations remain exact.

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
and twelve months of entries to an empty database. It refuses to run if user data exists.
These commands use `CELIA_DB_PATH` when set, or `./data/celia.db` otherwise.

```bash
npm run seed
npm run clear          # Dry run: show counts without deleting
npm run clear -- --yes # Delete all entries, items, categories, and members
```

The confirmed clear is irreversible and removes real user data as well as demo data;
household and umbrella configuration rows and the schema are retained.

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
- `src/components` renders the shell, household, categories, Entries, and shared UI workflows.

## Scope

Savings buckets, budget models, dashboard calculations, forecasting, authentication, and
server deployment are outside the current feature scope.

See the [changelog](CHANGELOG.md), [feature roadmap](docs/feature_roadmap.md), and
[repository map](docs/REPO_MAP.md) for project context.

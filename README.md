# Celia

Celia is a local-first household finance application. Version 3.0.0 provides the shared
application shell, household member management, and Income/Expense category and item
configuration that later financial-entry and planning features build on.

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

- `src/domain` holds pure entity types, validation, default colours, and domain errors.
- `src/server/db` opens the local SQLite database and applies migrations; server stores and
  services map rows and enforce use-case rules.
- `src/app/api` exposes thin JSON mutation handlers.
- `src/app/(shell)` server pages read views and pass them to client components.
- `src/components` renders the shell, household, categories, and shared UI workflows.

## Scope

F01 Core Tracking deliberately does not implement financial entries, savings buckets, budget
models, dashboard calculations, forecasting, authentication, or server deployment.

See the [changelog](CHANGELOG.md), [feature roadmap](docs/feature_roadmap.md), and
[repository map](docs/REPO_MAP.md) for project context.

# Celia

Celia is a local-first expense-tracking application. This repository currently contains the project foundation and an empty dashboard.

## Prerequisites

- Node.js 22 or later
- npm 10 or later

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in a browser.

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

- `src/app` contains route and layout composition.
- `src/components` contains reusable UI components.
- `src/domain` contains expense and budget types plus integer minor-unit calculations.
- `src/data` contains the `BudgetRepository` contract and its in-memory adapter. Replace this adapter when persistent storage is introduced; UI code should remain dependent on the interface.

## Current scope

The scaffold intentionally has no authentication, persistent storage, expense-entry forms, sample financial data, charts, or production deployment configuration. A future wireframe-driven UI task will define those product features.

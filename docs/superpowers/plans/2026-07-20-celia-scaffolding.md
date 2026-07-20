# Celia Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a local-only, maintainable Next.js foundation for Celia with an empty dashboard, replaceable data access, tests, and GitHub Actions verification.

**Architecture:** Next.js App Router owns routing and layout; focused components render the empty dashboard. Domain types and integer-minor-unit helpers live independently of the UI. A `BudgetRepository` contract isolates the initial in-memory data adapter so a persistent local adapter or API can replace it later.

**Tech Stack:** Next.js App Router, React, TypeScript (strict), Tailwind CSS, Vitest, Testing Library, ESLint, Prettier, GitHub Actions.

## Global Constraints

- The app runs locally; do not add authentication, passkeys, a backend API, or deployment configuration.
- Keep the first dashboard intentionally empty: no sample transactions, expense-entry forms, charts, categories, or budgets UI.
- Represent money as integer minor units; never perform calculations with floating-point currency values.
- UI code depends on `BudgetRepository`, never directly on a storage mechanism.
- CI must run dependency installation, linting, formatting checks, TypeScript checks, tests, and the production build for both pushes and pull requests.

---

## File Structure

```text
.
├── .github/workflows/ci.yml
├── src/
│   ├── app/layout.tsx
│   ├── app/page.tsx
│   ├── components/dashboard-empty-state.tsx
│   ├── data/budget-repository.ts
│   ├── data/in-memory-budget-repository.ts
│   ├── domain/budget.ts
│   ├── domain/transaction.ts
│   └── domain/transaction-total.ts
├── tests/
│   ├── components/dashboard-empty-state.test.tsx
│   ├── data/in-memory-budget-repository.test.ts
│   ├── domain/transaction-total.test.ts
│   └── setup.ts
├── .prettierrc.json
├── README.md
└── vitest.config.ts
```

### Task 1: Bootstrap the Next.js project and quality tooling

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `.prettierrc.json`, `vitest.config.ts`, `tests/setup.ts`
- Modify: `.gitignore`, `README.md`

**Interfaces:**
- Produces: `npm run dev`, `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Produces: the `@/*` TypeScript path alias used by all source and test imports.

- [ ] **Step 1: Generate and import the strict TypeScript application**

Run:

```powershell
$scaffoldDirectory = Join-Path $env:TEMP "celia-next-scaffold"
Remove-Item -Recurse -Force $scaffoldDirectory -ErrorAction SilentlyContinue
npx create-next-app@latest $scaffoldDirectory --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
Get-ChildItem -Force $scaffoldDirectory | Move-Item -Destination .
Remove-Item -Recurse -Force $scaffoldDirectory
```

Expected: a Next.js project is imported into the repository root with `src/app`, Tailwind, ESLint, and strict TypeScript configuration while preserving the existing README and approved documents.

- [ ] **Step 2: Install test and formatting dependencies**

Run:

```powershell
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event prettier
```

Expected: the five development dependencies appear in `package.json` and `package-lock.json` is updated.

- [ ] **Step 3: Configure Vitest, shared test setup, and formatting**

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    passWithNoTests: true,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDirectory, "./src"),
    },
  },
});
```

Create `tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `.prettierrc.json`:

```json
{
  "singleQuote": false,
  "trailingComma": "all"
}
```

Add these scripts to the `scripts` object in `package.json`:

```json
{
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```

- [ ] **Step 4: Verify the baseline toolchain**

Run:

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
```

Expected: each command exits with status `0`. The test command may report no test files before Task 2.

- [ ] **Step 5: Commit the baseline**

```powershell
git add .gitignore .prettierrc.json eslint.config.mjs next.config.ts package.json package-lock.json postcss.config.mjs src/app tsconfig.json tests/setup.ts vitest.config.ts
git commit -m "chore: bootstrap Celia Next.js app"
```

### Task 2: Define numeric domain models and calculation tests

**Files:**
- Create: `src/domain/transaction.ts`, `src/domain/budget.ts`, `src/domain/transaction-total.ts`
- Create: `tests/domain/transaction-total.test.ts`

**Interfaces:**
- Produces: `Transaction`, `{ id: string; description: string; category: string; amountMinor: number; currency: string; occurredOn: string }`.
- Produces: `Budget`, `{ id: string; name: string; amountMinor: number; currency: string; period: "monthly" | "yearly" }`.
- Produces: `calculateTransactionTotal(transactions: readonly Transaction[]): number`.

- [ ] **Step 1: Write the failing calculation tests**

Create `tests/domain/transaction-total.test.ts`:

```ts
import { calculateTransactionTotal } from "@/domain/transaction-total";
import type { Transaction } from "@/domain/transaction";

const transactions: readonly Transaction[] = [
  { id: "coffee", description: "Coffee", category: "Food", amountMinor: -450, currency: "TWD", occurredOn: "2026-07-20" },
  { id: "salary", description: "Salary", category: "Income", amountMinor: 500000, currency: "TWD", occurredOn: "2026-07-01" },
];

describe("calculateTransactionTotal", () => {
  it("adds integer minor-unit transaction amounts", () => {
    expect(calculateTransactionTotal(transactions)).toBe(499550);
  });

  it("returns zero when no transactions exist", () => {
    expect(calculateTransactionTotal([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test -- tests/domain/transaction-total.test.ts
```

Expected: FAIL because `@/domain/transaction-total` and `@/domain/transaction` do not exist.

- [ ] **Step 3: Implement the domain types and calculation**

Create `src/domain/transaction.ts`:

```ts
export type Transaction = {
  id: string;
  description: string;
  category: string;
  amountMinor: number;
  currency: string;
  occurredOn: string;
};
```

Create `src/domain/budget.ts`:

```ts
export type Budget = {
  id: string;
  name: string;
  amountMinor: number;
  currency: string;
  period: "monthly" | "yearly";
};
```

Create `src/domain/transaction-total.ts`:

```ts
import type { Transaction } from "./transaction";

export function calculateTransactionTotal(
  transactions: readonly Transaction[],
): number {
  return transactions.reduce(
    (total, transaction) => total + transaction.amountMinor,
    0,
  );
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```powershell
npm run test -- tests/domain/transaction-total.test.ts
```

Expected: PASS with two passing tests.

- [ ] **Step 5: Commit the domain layer**

```powershell
git add src/domain tests/domain/transaction-total.test.ts
git commit -m "feat: add expense domain models"
```

### Task 3: Add the replaceable in-memory repository

**Files:**
- Create: `src/data/budget-repository.ts`, `src/data/in-memory-budget-repository.ts`
- Create: `tests/data/in-memory-budget-repository.test.ts`

**Interfaces:**
- Consumes: `Transaction` from `@/domain/transaction`.
- Produces: `BudgetRepository` with `listTransactions(): Promise<readonly Transaction[]>` and `saveTransaction(transaction: Transaction): Promise<void>`.
- Produces: `InMemoryBudgetRepository`, constructed with optional `readonly Transaction[]` seed data.

- [ ] **Step 1: Write the failing repository contract test**

Create `tests/data/in-memory-budget-repository.test.ts`:

```ts
import { InMemoryBudgetRepository } from "@/data/in-memory-budget-repository";
import type { Transaction } from "@/domain/transaction";

const rent: Transaction = {
  id: "rent", description: "Rent", category: "Housing", amountMinor: -2500000, currency: "TWD", occurredOn: "2026-07-01",
};

describe("InMemoryBudgetRepository", () => {
  it("starts empty without seed data", async () => {
    await expect(new InMemoryBudgetRepository().listTransactions()).resolves.toEqual([]);
  });

  it("returns a saved transaction", async () => {
    const repository = new InMemoryBudgetRepository();
    await repository.saveTransaction(rent);
    await expect(repository.listTransactions()).resolves.toEqual([rent]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test -- tests/data/in-memory-budget-repository.test.ts
```

Expected: FAIL because `@/data/in-memory-budget-repository` does not exist.

- [ ] **Step 3: Implement the contract and adapter**

Create `src/data/budget-repository.ts`:

```ts
import type { Transaction } from "@/domain/transaction";

export interface BudgetRepository {
  listTransactions(): Promise<readonly Transaction[]>;
  saveTransaction(transaction: Transaction): Promise<void>;
}
```

Create `src/data/in-memory-budget-repository.ts`:

```ts
import type { Transaction } from "@/domain/transaction";
import type { BudgetRepository } from "./budget-repository";

export class InMemoryBudgetRepository implements BudgetRepository {
  private readonly transactions: Transaction[];

  constructor(seedTransactions: readonly Transaction[] = []) {
    this.transactions = [...seedTransactions];
  }

  async listTransactions(): Promise<readonly Transaction[]> {
    return [...this.transactions];
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    this.transactions.push(transaction);
  }
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```powershell
npm run test -- tests/data/in-memory-budget-repository.test.ts
```

Expected: PASS with two passing tests.

- [ ] **Step 5: Commit the repository boundary**

```powershell
git add src/data tests/data/in-memory-budget-repository.test.ts
git commit -m "feat: add in-memory budget repository"
```

### Task 4: Build and test the empty dashboard shell

**Files:**
- Create: `src/components/dashboard-empty-state.tsx`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `tests/components/dashboard-empty-state.test.tsx`

**Interfaces:**
- Consumes: no persistence data; the scaffold dashboard intentionally renders an empty state.
- Produces: `DashboardEmptyState(): JSX.Element`, an accessible component with a visible `Celia` heading and `No expenses yet` status text.

- [ ] **Step 1: Write the failing empty-state component test**

Create `tests/components/dashboard-empty-state.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { DashboardEmptyState } from "@/components/dashboard-empty-state";

describe("DashboardEmptyState", () => {
  it("renders the Celia dashboard empty state", () => {
    render(<DashboardEmptyState />);

    expect(screen.getByRole("heading", { name: "Celia" })).toBeInTheDocument();
    expect(screen.getByText("No expenses yet")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm run test -- tests/components/dashboard-empty-state.test.tsx
```

Expected: FAIL because `@/components/dashboard-empty-state` does not exist.

- [ ] **Step 3: Implement the accessible dashboard shell**

Create `src/components/dashboard-empty-state.tsx`:

```tsx
export function DashboardEmptyState() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <section aria-labelledby="celia-title" className="space-y-3">
        <p className="text-sm font-medium text-slate-500">Expense tracking, made simple</p>
        <h1 id="celia-title" className="text-4xl font-semibold tracking-tight text-slate-950">Celia</h1>
        <p className="text-lg text-slate-700">No expenses yet</p>
        <p className="max-w-xl text-sm leading-6 text-slate-500">Your dashboard is ready for the budgeting tools you add next.</p>
      </section>
    </main>
  );
}
```

Replace `src/app/page.tsx` with:

```tsx
import { DashboardEmptyState } from "@/components/dashboard-empty-state";

export default function HomePage() {
  return <DashboardEmptyState />;
}
```

Set the title and description in `src/app/layout.tsx` to `Celia` and `A local expense-tracking application.`. Keep the generated font setup and global stylesheet imports intact.

- [ ] **Step 4: Run the focused test and production build**

Run:

```powershell
npm run test -- tests/components/dashboard-empty-state.test.tsx
npm run build
```

Expected: the component test passes and Next.js completes an optimized production build.

- [ ] **Step 5: Commit the empty dashboard**

```powershell
git add src/app src/components tests/components
git commit -m "feat: add Celia empty dashboard"
```

### Task 5: Document the project and automate verification

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: the scripts created in Task 1.
- Produces: CI that executes `npm ci`, `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test`, and `npm run build` on Ubuntu using Node 22.

- [ ] **Step 1: Create the GitHub Actions workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
```

- [ ] **Step 2: Document setup, commands, and architectural boundaries**

Replace `README.md` with:

```markdown
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
```

- [ ] **Step 3: Run the complete verification suite**

Run:

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
```

Expected: all five commands exit with status `0`.

- [ ] **Step 4: Commit documentation and CI**

```powershell
git add .github/workflows/ci.yml README.md
git commit -m "ci: verify Celia quality checks"
```

## Plan Self-Review

- Spec coverage: Tasks 1 and 4 establish the Next.js, TypeScript, Tailwind, and empty-dashboard foundations. Task 2 covers typed budget/expense concepts and integer-minor-unit calculation. Task 3 provides the swappable repository contract and empty in-memory data source. Task 1 and Task 5 provide local and GitHub Actions verification plus documentation. Authentication, storage, expense UI, charts, and deployment remain explicitly excluded.
- Placeholder scan: No incomplete markers, generic test instructions, or unspecified error-handling steps remain. Each test and configuration change includes exact source content and commands.
- Type consistency: `Transaction` is imported consistently by the calculation and repository layers. `BudgetRepository.listTransactions` and `saveTransaction` match the in-memory implementation and its test. Dashboard test selectors match the component copy.

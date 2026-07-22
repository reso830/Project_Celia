# Dashboard Financial Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display all-time income, expenses, net, and savings rate in four dashboard summary cards.

**Architecture:** A domain utility derives financial metrics from readonly transactions in PHP minor units. A presentational React component formats those values and renders the four cards; `DashboardEmptyState` supplies transactions from `useData` and retains its bucket-group section.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Use all recorded transactions; do not add time filtering.
- Income, expenses, and net are PHP minor-unit values.
- Expenses are displayed as a positive amount; net equals income minus expenses.
- Savings rate is `(net / income) * 100` and is `0` if income is zero.
- Do not add charts, persistence changes, or dependencies.

---

## File Structure

- Create: `src/domain/financial-summary.ts` — derives four financial metrics from transactions.
- Modify: `src/domain/index.ts` — exposes the financial-summary API.
- Create: `src/components/financial-summary-cards.tsx` — formats PHP amounts and renders accessible summary cards.
- Modify: `src/components/dashboard-empty-state.tsx` — supplies ready-state transactions and places cards above bucket groups.
- Create: `tests/domain/financial-summary.test.ts` — verifies calculations and zero-income behavior.
- Modify: `tests/components/dashboard-empty-state.test.tsx` — verifies populated and empty dashboard summaries.

### Task 1: Financial summary calculation

**Files:**

- Create: `tests/domain/financial-summary.test.ts`
- Create: `src/domain/financial-summary.ts`
- Modify: `src/domain/index.ts`

**Interfaces:**

- Consumes: `Transaction` from `src/domain/transaction.ts` with positive PHP minor-unit `amount` and `type` of `income` or `expense`.
- Produces: `FinancialSummary` and `calculateFinancialSummary(transactions: readonly Transaction[]): FinancialSummary`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { calculateFinancialSummary, type Transaction } from "@/domain";

const income: Transaction = { id: "salary", date: "2026-07-01", memberId: "alex", categoryId: "salary", type: "income", amount: 500_000, recurring: false, currency: "PHP" };
const expense: Transaction = { id: "groceries", date: "2026-07-02", memberId: "alex", categoryId: "food", type: "expense", amount: 125_000, recurring: false, currency: "PHP" };

describe("calculateFinancialSummary", () => {
  it("derives income, positive expenses, net, and savings rate", () => {
    expect(calculateFinancialSummary([income, expense])).toEqual({ income: 500_000, expenses: 125_000, net: 375_000, savingsRate: 75 });
  });
  it("returns zero savings rate when there is no income", () => {
    expect(calculateFinancialSummary([expense])).toEqual({ income: 0, expenses: 125_000, net: -125_000, savingsRate: 0 });
  });
  it("returns zero values for no transactions", () => {
    expect(calculateFinancialSummary([])).toEqual({ income: 0, expenses: 0, net: 0, savingsRate: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/domain/financial-summary.test.ts`

Expected: FAIL because `calculateFinancialSummary` is not exported by `@/domain`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/financial-summary.ts
import type { Transaction } from "./transaction";

export interface FinancialSummary { income: number; expenses: number; net: number; savingsRate: number; }

export function calculateFinancialSummary(transactions: readonly Transaction[]): FinancialSummary {
  const { income, expenses } = transactions.reduce(
    (summary, transaction) => transaction.type === "income"
      ? { ...summary, income: summary.income + transaction.amount }
      : { ...summary, expenses: summary.expenses + transaction.amount },
    { income: 0, expenses: 0 },
  );
  const net = income - expenses;
  return { income, expenses, net, savingsRate: income === 0 ? 0 : (net / income) * 100 };
}
```

Append `export * from "./financial-summary";` to `src/domain/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/domain/financial-summary.test.ts`

Expected: PASS with 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domain/financial-summary.ts src/domain/index.ts tests/domain/financial-summary.test.ts
git commit -m "feat: calculate dashboard financial summary"
```

### Task 2: Dashboard summary cards

**Files:**

- Create: `src/components/financial-summary-cards.tsx`
- Modify: `src/components/dashboard-empty-state.tsx`
- Modify: `tests/components/dashboard-empty-state.test.tsx`

**Interfaces:**

- Consumes: `calculateFinancialSummary(transactions)` from `@/domain` and readonly transactions from ready `DataState`.
- Produces: `FinancialSummaryCards({ transactions }: { transactions: readonly Transaction[] })`.

- [ ] **Step 1: Write the failing component tests**

Extend the `repositories` helper in `tests/components/dashboard-empty-state.test.tsx` with an optional `transactions` list that the transaction `list` mock returns. Add a mixed fixture and assert the following:

```tsx
it("renders financial metrics from all persisted transactions", async () => {
  renderDashboard(repositories(undefined, undefined, undefined, summaryTransactions));
  expect(await screen.findByText("Income")).toBeInTheDocument();
  expect(screen.getByText("₱5,000.00")).toBeInTheDocument();
  expect(screen.getByText("Expenses")).toBeInTheDocument();
  expect(screen.getByText("₱1,250.00")).toBeInTheDocument();
  expect(screen.getByText("Net")).toBeInTheDocument();
  expect(screen.getByText("₱3,750.00")).toBeInTheDocument();
  expect(screen.getByText("Savings Rate")).toBeInTheDocument();
  expect(screen.getByText("75%")).toBeInTheDocument();
});

it("renders zero financial metrics without transactions", async () => {
  renderDashboard();
  expect(await screen.findByText("Income")).toBeInTheDocument();
  expect(screen.getAllByText("₱0.00")).toHaveLength(3);
  expect(screen.getByText("0%")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run component tests to verify they fail**

Run: `npm test -- tests/components/dashboard-empty-state.test.tsx`

Expected: FAIL because the dashboard does not render an `Income` card.

- [ ] **Step 3: Write minimal component and integration implementation**

```tsx
// src/components/financial-summary-cards.tsx
import { calculateFinancialSummary, type Transaction } from "@/domain";

const formatter = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function FinancialSummaryCards({ transactions }: { transactions: readonly Transaction[] }) {
  const summary = calculateFinancialSummary(transactions);
  const cards = [["Income", formatter.format(summary.income / 100)], ["Expenses", formatter.format(summary.expenses / 100)], ["Net", formatter.format(summary.net / 100)], ["Savings Rate", `${summary.savingsRate}%`]] as const;
  return <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <div className="rounded-xl border border-[#d6dae1] bg-white p-4" key={label}><dt className="text-sm font-medium text-slate-500">{label}</dt><dd className="mt-2 text-2xl font-semibold text-slate-950">{value}</dd></div>)}</dl>;
}
```

In `src/components/dashboard-empty-state.tsx`, import `FinancialSummaryCards`, define `const transactions = data.status === "ready" ? data.transactions : [];`, and render `<FinancialSummaryCards transactions={transactions} />` immediately after the `Celia` heading and before `Bucket groups`.

- [ ] **Step 4: Run component tests to verify they pass**

Run: `npm test -- tests/components/dashboard-empty-state.test.tsx`

Expected: PASS with existing bucket-group tests plus two summary tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/financial-summary-cards.tsx src/components/dashboard-empty-state.tsx tests/components/dashboard-empty-state.test.tsx
git commit -m "feat: show dashboard financial summary cards"
```

### Task 3: Full verification

**Files:**

- Verify: dashboard summary source and test files.

- [ ] **Step 1: Format changed source and test files**

Run: `npx prettier --write src/domain/financial-summary.ts src/domain/index.ts src/components/financial-summary-cards.tsx src/components/dashboard-empty-state.tsx tests/domain/financial-summary.test.ts tests/components/dashboard-empty-state.test.tsx`

Expected: files are formatted without errors.

- [ ] **Step 2: Run the verification pipeline**

Run: `npm run lint; npm run typecheck; npm test; npm run format:check; npm run build`

Expected: each command exits 0.

- [ ] **Step 3: Commit formatting only if needed**

Run: `git status --short`

If formatting changed tracked feature files after Task 2, run:

```bash
git add src/domain/financial-summary.ts src/domain/index.ts src/components/financial-summary-cards.tsx src/components/dashboard-empty-state.tsx tests/domain/financial-summary.test.ts tests/components/dashboard-empty-state.test.tsx
git commit -m "style: format dashboard financial summary"
```

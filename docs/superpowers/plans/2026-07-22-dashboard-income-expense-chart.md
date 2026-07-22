# Dashboard Income and Expense Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display a monthly chart that compares recorded income against expenses, with an explicit empty state.

**Architecture:** A pure domain helper turns transactions into chronological month totals in PHP minor units. `IncomeExpenseChart` uses those totals to render a native SVG grouped-bar chart and accessible textual summary; the dashboard passes ready transaction data into it without changing persistence behavior.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Vitest 4, Testing Library.

## Global Constraints

- Aggregate with the `YYYY-MM` portion of ISO transaction dates.
- Keep `income` and `expense` in separate, positive PHP minor-unit series.
- Use native SVG and add no chart dependency.
- Render an informative chart-card empty state when no transactions exist.
- Do not add forecasting, filtering controls, or transaction mutations.
- Before handoff run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

---

## File structure

- Create: `src/domain/monthly-transaction-totals.ts` — groups transactions into month totals.
- Create: `src/components/income-expense-chart.tsx` — chart card, SVG marks, legend, accessible text, and empty state.
- Modify: `src/components/dashboard-empty-state.tsx` — passes ready transactions to the chart before bucket groups.
- Create: `tests/domain/monthly-transaction-totals.test.ts` — direct aggregation tests.
- Modify: `tests/components/dashboard-empty-state.test.tsx` — populated chart and empty-state tests.

### Task 1: Build monthly transaction aggregation

**Files:**
- Create: `src/domain/monthly-transaction-totals.ts`
- Create: `tests/domain/monthly-transaction-totals.test.ts`

**Interfaces:**
- Produces `MonthlyTransactionTotal`: `{ month: string; label: string; income: number; expense: number }`.
- Produces `calculateMonthlyTransactionTotals(transactions: readonly Transaction[]): readonly MonthlyTransactionTotal[]`.

- [ ] **Step 1: Write the failing aggregation test**

```ts
import { calculateMonthlyTransactionTotals } from "@/domain/monthly-transaction-totals";
import type { Transaction } from "@/domain/transaction";

const transactions: readonly Transaction[] = [
  { id: "july-pay", date: "2026-07-01", memberId: "alex", categoryId: "salary", type: "income", amount: 500_000, recurring: false, currency: "PHP" },
  { id: "july-food", date: "2026-07-12", memberId: "alex", categoryId: "food", type: "expense", amount: 12_500, recurring: false, currency: "PHP" },
  { id: "july-rent", date: "2026-07-20", memberId: "alex", categoryId: "rent", type: "expense", amount: 25_000, recurring: true, currency: "PHP" },
  { id: "june-food", date: "2026-06-20", memberId: "alex", categoryId: "food", type: "expense", amount: 2_500, recurring: false, currency: "PHP" },
];

it("groups income and expenses into chronological monthly totals", () => {
  expect(calculateMonthlyTransactionTotals(transactions)).toEqual([
    { month: "2026-06", label: "Jun 2026", income: 0, expense: 2_500 },
    { month: "2026-07", label: "Jul 2026", income: 500_000, expense: 37_500 },
  ]);
});

it("returns no monthly totals when transactions are absent", () => {
  expect(calculateMonthlyTransactionTotals([])).toEqual([]);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/domain/monthly-transaction-totals.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the minimal aggregation module**

```ts
import type { Transaction } from "./transaction";

export interface MonthlyTransactionTotal {
  month: string;
  label: string;
  income: number;
  expense: number;
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1)));
}

export function calculateMonthlyTransactionTotals(
  transactions: readonly Transaction[],
): readonly MonthlyTransactionTotal[] {
  const totals = new Map<string, Omit<MonthlyTransactionTotal, "label">>();

  for (const transaction of transactions) {
    const month = transaction.date.slice(0, 7);
    const current = totals.get(month) ?? { month, income: 0, expense: 0 };
    current[transaction.type] += transaction.amount;
    totals.set(month, current);
  }

  return [...totals.values()]
    .sort((left, right) => left.month.localeCompare(right.month))
    .map((total) => ({ ...total, label: formatMonth(total.month) }));
}
```

- [ ] **Step 4: Run the aggregation test to verify it passes**

Run: `npm test -- tests/domain/monthly-transaction-totals.test.ts`

Expected: PASS with 2 tests.

- [ ] **Step 5: Commit**

```powershell
git add src/domain/monthly-transaction-totals.ts tests/domain/monthly-transaction-totals.test.ts
git commit -m "feat: aggregate transactions by month"
```

### Task 2: Render the chart card and empty state

**Files:**
- Create: `src/components/income-expense-chart.tsx`
- Modify: `tests/components/dashboard-empty-state.test.tsx`

**Interfaces:**
- Consumes `transactions: readonly Transaction[]`.
- Uses Task 1's `calculateMonthlyTransactionTotals`.
- Renders a `section` labelled `Income vs expenses`.
- An empty list renders exactly: `No transactions yet. Add transactions to see your monthly income and expenses.`

- [ ] **Step 1: Write failing component tests**

```tsx
it("shows a chart empty state when there are no transactions", async () => {
  renderDashboard();

  expect(
    await screen.findByText(
      "No transactions yet. Add transactions to see your monthly income and expenses.",
    ),
  ).toBeInTheDocument();
});

it("renders monthly income and expense chart data", async () => {
  renderDashboard(repositoriesWithTransactions([
    { id: "salary", date: "2026-07-01", memberId: "alex", categoryId: "salary", type: "income", amount: 500_000, recurring: false, currency: "PHP" },
    { id: "food", date: "2026-07-12", memberId: "alex", categoryId: "food", type: "expense", amount: 12_500, recurring: false, currency: "PHP" },
  ]));

  expect(await screen.findByRole("region", { name: "Income vs expenses" })).toBeInTheDocument();
  expect(screen.getByText("Jul 2026")).toBeInTheDocument();
  expect(screen.getByText("Income: ₱5,000.00")).toBeInTheDocument();
  expect(screen.getByText("Expenses: ₱125.00")).toBeInTheDocument();
});
```

Create `repositoriesWithTransactions` by extending the existing test repository helper with a `transactions.list` mock.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/components/dashboard-empty-state.test.tsx -t "chart empty state|monthly income"`

Expected: FAIL because no chart card exists.

- [ ] **Step 3: Implement the minimum chart**

```tsx
"use client";

import { calculateMonthlyTransactionTotals } from "@/domain/monthly-transaction-totals";
import type { Transaction } from "@/domain/transaction";

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function formatAmount(amount: number): string {
  return currency.format(amount / 100);
}

export function IncomeExpenseChart({
  transactions,
}: {
  transactions: readonly Transaction[];
}) {
  const totals = calculateMonthlyTransactionTotals(transactions);

  return (
    <section aria-labelledby="income-expense-title" className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 id="income-expense-title" className="text-base font-bold text-[#16213f]">Income vs expenses</h2>
        <div aria-label="Chart legend" className="flex gap-3 text-sm text-slate-600">
          <span><span aria-hidden className="mr-1 inline-block size-2 rounded-sm bg-emerald-500" />Income</span>
          <span><span aria-hidden className="mr-1 inline-block size-2 rounded-sm bg-rose-500" />Expenses</span>
        </div>
      </div>
      {totals.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">No transactions yet. Add transactions to see your monthly income and expenses.</p>
      ) : (
        <ChartGraphic totals={totals} />
      )}
    </section>
  );
}
```

Define `ChartGraphic` in this file. Use a fixed `viewBox="0 0 640 260"`, derive the largest amount across both series for 0–160px bar heights, and render two 18px-wide `rect` elements per month (emerald income and rose expense) from a shared baseline. Render month labels, a descriptive SVG `title`, and an `sr-only` list whose entries are `Month: Income: amount. Expenses: amount.`.

- [ ] **Step 4: Run component tests to verify they pass**

Run: `npm test -- tests/components/dashboard-empty-state.test.tsx -t "chart empty state|monthly income"`

Expected: PASS with 2 tests.

- [ ] **Step 5: Commit**

```powershell
git add src/components/income-expense-chart.tsx tests/components/dashboard-empty-state.test.tsx
git commit -m "feat: render dashboard income expense chart"
```

### Task 3: Connect ready dashboard data

**Files:**
- Modify: `src/components/dashboard-empty-state.tsx`
- Modify: `tests/components/dashboard-empty-state.test.tsx`

**Interfaces:**
- Passes `transactions={data.status === "ready" ? data.transactions : []}` to `IncomeExpenseChart`.
- Leaves the existing `BucketGroupGrid` input behavior unchanged.

- [ ] **Step 1: Write the failing dashboard integration assertion**

Add this to the populated dashboard test after rendering the transaction repository data:

```tsx
expect(await screen.findByText("Income: ₱5,000.00")).toBeInTheDocument();
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/components/dashboard-empty-state.test.tsx -t "renders monthly income and expense chart data"`

Expected: FAIL because the dashboard does not pass provider transactions to the chart.

- [ ] **Step 3: Add the chart to the dashboard**

```tsx
import { IncomeExpenseChart } from "@/components/income-expense-chart";

// In DashboardEmptyState:
const transactions = data.status === "ready" ? data.transactions : [];

// Inside the section, before the Bucket groups heading:
<IncomeExpenseChart transactions={transactions} />
```

- [ ] **Step 4: Run the integration test to verify it passes**

Run: `npm test -- tests/components/dashboard-empty-state.test.tsx -t "renders monthly income and expense chart data"`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/dashboard-empty-state.tsx tests/components/dashboard-empty-state.test.tsx
git commit -m "feat: connect dashboard chart to transactions"
```

### Task 4: Run the verification pipeline

- [ ] **Step 1: Check formatting**

Run: `npm run format:check`

Expected: exit code 0.

- [ ] **Step 2: Check linting and types**

Run: `npm run lint; npm run typecheck`

Expected: both commands exit code 0.

- [ ] **Step 3: Run all tests**

Run: `npm test`

Expected: exit code 0.

- [ ] **Step 4: Build production output**

Run: `npm run build`

Expected: exit code 0.

## Plan self-review

- Spec coverage: Task 1 creates chronological monthly income/expense totals; Task 2 provides SVG bars, legend, accessible summary, and empty state; Task 3 connects provider data; Task 4 runs the required pipeline.
- Placeholder scan: no incomplete steps or deferred behavior remain.
- Type consistency: the provider and chart use the existing `Transaction`; the chart consumes the `MonthlyTransactionTotal` from Task 1.


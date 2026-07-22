# Dashboard Cash Flow Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a dashboard chart showing the daily running PHP balance from recorded transactions.

**Architecture:** `CashFlowChart` owns daily aggregation and inline SVG rendering. The dashboard passes ready-state transactions to it while retaining bucket groups.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Use existing `Transaction` records and PHP minor-unit amounts.
- Aggregate every ISO calendar date into one point; starting balance is zero.
- Income adds; expense subtracts.
- Do not add chart dependencies, forecasting, time-ordering, or interactive controls.
- Render a named empty state when there are no transactions.

---

## File structure

- Create `src/components/cash-flow-chart.tsx`: derived points, PHP formatting, SVG, and empty state.
- Create `tests/components/cash-flow-chart.test.tsx`: calculation, chart, ordering, and empty-state coverage.
- Modify `src/components/dashboard-empty-state.tsx`: provide transactions to the chart.
- Modify `tests/components/dashboard-empty-state.test.tsx`: test dashboard integration.

### Task 1: Create the cash-flow chart

**Files:**
- Create: `src/components/cash-flow-chart.tsx`
- Test: `tests/components/cash-flow-chart.test.tsx`

**Interfaces:**
- Consumes: `readonly Transaction[]` from `@/domain/transaction`.
- Produces: `CashFlowPoint`, `cashFlowPoints(transactions)`, and `CashFlowChart({ transactions })`.

- [ ] **Step 1: Write the failing test**

Create `tests/components/cash-flow-chart.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { cashFlowPoints, CashFlowChart } from "@/components/cash-flow-chart";
import type { Transaction } from "@/domain/transaction";

const income: Transaction = { id: "income", date: "2026-07-03", memberId: "member", categoryId: "salary", type: "income", amount: 10_000, recurring: false, currency: "PHP" };
const expense: Transaction = { id: "expense", date: "2026-07-03", memberId: "member", categoryId: "food", type: "expense", amount: 2_500, recurring: false, currency: "PHP" };
const earlierExpense: Transaction = { id: "earlier", date: "2026-07-01", memberId: "member", categoryId: "rent", type: "expense", amount: 1_000, recurring: false, currency: "PHP" };

describe("CashFlowChart", () => {
  it("aggregates daily movements and carries the balance chronologically", () => {
    expect(cashFlowPoints([income, expense, earlierExpense])).toEqual([
      { date: "2026-07-01", movement: -1_000, balance: -1_000 },
      { date: "2026-07-03", movement: 7_500, balance: 6_500 },
    ]);
  });

  it("renders a named empty state without a chart", () => {
    render(<CashFlowChart transactions={[]} />);
    expect(screen.getByText("No cash flow data yet.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Cash flow" })).not.toBeInTheDocument();
  });

  it("renders the current balance and one point label per calendar date", () => {
    render(<CashFlowChart transactions={[income, expense, earlierExpense]} />);
    expect(screen.getByRole("img", { name: "Cash flow" })).toBeInTheDocument();
    expect(screen.getByText("₱65.00")).toBeInTheDocument();
    expect(screen.getByText("2026-07-01: -₱10.00")).toBeInTheDocument();
    expect(screen.getByText("2026-07-03: ₱65.00")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/components/cash-flow-chart.test.tsx`

Expected: FAIL because the component module does not exist.

- [ ] **Step 3: Implement the minimal component**

Create `src/components/cash-flow-chart.tsx`:

```tsx
import type { Transaction } from "@/domain/transaction";
export interface CashFlowPoint { date: string; movement: number; balance: number; }
export function cashFlowPoints(transactions: readonly Transaction[]): readonly CashFlowPoint[] {
  const movements = new Map<string, number>();
  for (const transaction of transactions) {
    const amount = transaction.type === "income" ? transaction.amount : -transaction.amount;
    movements.set(transaction.date, (movements.get(transaction.date) ?? 0) + amount);
  }
  let balance = 0;
  return [...movements.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, movement]) => {
    balance += movement;
    return { date, movement, balance };
  });
}
function formatPhp(amount: number): string { return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount / 100); }
export function CashFlowChart({ transactions }: { transactions: readonly Transaction[] }) {
  const points = cashFlowPoints(transactions);
  if (!points.length) return <section aria-labelledby="cash-flow-title" className="mt-6"><h2 id="cash-flow-title" className="text-base font-bold text-[#16213f]">Cash flow</h2><p className="mt-4 rounded-xl border border-[#d6dae1] bg-white p-5 text-sm text-[#8a93a3]">No cash flow data yet.</p></section>;
  const balances = points.map(({ balance }) => balance); const minimum = Math.min(...balances, 0); const maximum = Math.max(...balances, 0); const range = maximum - minimum || 1; const width = 600; const height = 200;
  const line = points.map((point, index) => { const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width; const y = height - ((point.balance - minimum) / range) * height; return `${x},${y}`; }).join(" ");
  return <section aria-labelledby="cash-flow-title" className="mt-6"><div className="flex items-baseline justify-between gap-4"><h2 id="cash-flow-title" className="text-base font-bold text-[#16213f]">Cash flow</h2><p className="text-sm font-semibold text-[#16213f]">{formatPhp(points.at(-1)!.balance)}</p></div><svg aria-label="Cash flow" className="mt-4 h-52 w-full rounded-xl border border-[#d6dae1] bg-white p-4" role="img" viewBox={`0 0 ${width} ${height}`}><polyline fill="none" points={line} stroke="#2463eb" strokeWidth="4" /></svg><ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6b7686]">{points.map((point) => <li key={point.date}>{point.date}: {formatPhp(point.balance)}</li>)}</ul></section>;
}
```

- [ ] **Step 4: Run focused test and verify GREEN**

Run: `npm test -- tests/components/cash-flow-chart.test.tsx`

Expected: PASS with 3 tests.

- [ ] **Step 5: Commit the component**

Run: `git add src/components/cash-flow-chart.tsx tests/components/cash-flow-chart.test.tsx; git commit -m "feat: add cash flow chart component"`

### Task 2: Integrate the chart into the dashboard

**Files:**
- Modify: `src/components/dashboard-empty-state.tsx`
- Modify: `tests/components/dashboard-empty-state.test.tsx`

**Interfaces:**
- Consumes: `CashFlowChart({ transactions })` and ready-state `useData().transactions`.
- Produces: Chart rendering above the bucket-group section.

- [ ] **Step 1: Add the failing dashboard assertion**

In the first test of `tests/components/dashboard-empty-state.test.tsx`, add:

```tsx
expect(screen.getByText("No cash flow data yet.")).toBeInTheDocument();
```

- [ ] **Step 2: Run the dashboard test and verify RED**

Run: `npm test -- tests/components/dashboard-empty-state.test.tsx`

Expected: FAIL because the dashboard does not render the chart.

- [ ] **Step 3: Integrate ready-state transactions**

Add to `src/components/dashboard-empty-state.tsx`:

```tsx
import { CashFlowChart } from "@/components/cash-flow-chart";
const transactions = data.status === "ready" ? data.transactions : [];
```

Place this directly after the `Celia` `h1` and before the bucket-group `h2`:

```tsx
<CashFlowChart transactions={transactions} />
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- tests/components/cash-flow-chart.test.tsx tests/components/dashboard-empty-state.test.tsx`

Expected: PASS with all chart and dashboard tests green.

- [ ] **Step 5: Commit dashboard integration**

Run: `git add src/components/dashboard-empty-state.tsx tests/components/dashboard-empty-state.test.tsx; git commit -m "feat: show cash flow on dashboard"`

### Task 3: Run the verification pipeline

**Files:**
- Verify: all modified component and test files.

**Interfaces:**
- Consumes: completed chart and dashboard integration.
- Produces: fresh evidence that the repository pipeline passes.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: PASS with zero failing tests.

- [ ] **Step 2: Run checks and production build**

Run: `npm run lint; npm run typecheck; npm run format:check; npm run build`

Expected: every command exits with status 0 and reports no lint, type, formatting, or build errors.

- [ ] **Step 3: Inspect final scope**

Run: `git status --short; git diff HEAD~2..HEAD -- src/components/cash-flow-chart.tsx src/components/dashboard-empty-state.tsx tests/components/cash-flow-chart.test.tsx tests/components/dashboard-empty-state.test.tsx`

Expected: only intended cash-flow chart, dashboard integration, and test changes.

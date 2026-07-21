# Transactions Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved responsive, static Transactions list page with its controls, table header, and fresh-install empty state.

**Architecture:** Add a focused `TransactionsPage` client component and a thin `/transactions` route. Update `AppHeader` so Transactions is a navigable active page and its Add Transaction control is visible but inert.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest, Testing Library.

## Global Constraints

- Keep the page presentational: no transaction create, edit, delete, filtering, search, or persistence behavior.
- Use `#eef0f3` for the page background, `#12213d` for navy controls, `#16213f` for headings, `#d6dae1` for borders, and `#f4f5f7` for table headings.
- Use a 1400px maximum content width and wrapping controls; avoid page-level horizontal scrolling.
- Retain the exact empty-state copy: `No transactions match your filters.`
- Do not implement Spreadsheet/pivot content.

---

## File Structure

- `src/components/app-header.tsx` — shared navigation and static Add Transaction button.
- `src/components/transactions-page.tsx` — presentational page controls, table header, and empty state.
- `src/app/transactions/page.tsx` — route entry point.
- `tests/components/transactions-page.test.tsx` — regression test for the page acceptance criteria.

### Task 1: Add Transactions navigation and page layout

**Files:**
- Create: `tests/components/transactions-page.test.tsx`
- Create: `src/components/transactions-page.tsx`
- Create: `src/app/transactions/page.tsx`
- Modify: `src/components/app-header.tsx`

**Interfaces:**
- Consumes: `AppHeader` from `@/components/app-header`.
- Produces: `TransactionsPage(): JSX.Element`, rendered by `/transactions`.
- Produces: `AppPage = "dashboard" | "transactions" | "settings"`, accepted by `AppHeader`.

- [ ] **Step 1: Write the failing component test**

```tsx
import { render, screen } from "@testing-library/react";
import { TransactionsPage } from "@/components/transactions-page";

describe("TransactionsPage", () => {
  it("renders the static transactions controls and empty table", () => {
    render(<TransactionsPage />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Transactions")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "+ Add Transaction" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Household (All)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Spreadsheet" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Search transactions")).toBeInTheDocument();
    expect(screen.getByLabelText("Transaction type")).toHaveValue("all");
    expect(screen.getByText("0 transactions")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Date" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Recurring" })).toBeInTheDocument();
    expect(screen.getByText("No transactions match your filters.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/components/transactions-page.test.tsx`

Expected: FAIL because `@/components/transactions-page` does not exist.

- [ ] **Step 3: Implement the minimal page and navigation changes**

```tsx
// In src/components/app-header.tsx, add "transactions" to AppPage.
// In the nav, render this exact active-or-link branch between Dashboard and Settings:
{activePage === "transactions" ? (
  <span aria-current="page" className="rounded-md bg-white px-3 py-2 text-[#12213d]">Transactions</span>
) : (
  <Link className={navigationItemClassName} href="/transactions">Transactions</Link>
)}
// Add this static control after the navigation:
<button className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#12213d] sm:mt-0" type="button">+ Add Transaction</button>
```

```tsx
// src/app/transactions/page.tsx
import { TransactionsPage } from "@/components/transactions-page";
export default function TransactionsRoute() { return <TransactionsPage />; }
```

```tsx
// src/components/transactions-page.tsx
"use client";

import { AppHeader } from "@/components/app-header";

const columns = ["Date", "Member", "Bucket", "Description", "Amount", "Recurring"];

export function TransactionsPage() {
  return (
    <main className="min-h-screen bg-[#eef0f3] px-4 py-6 sm:px-6 lg:px-7">
      <div className="mx-auto w-full max-w-[1400px]">
        <AppHeader activePage="transactions" />
        <section aria-labelledby="transactions-title" className="mt-6">
          <h1 id="transactions-title" className="text-3xl font-semibold tracking-tight text-[#16213f]">Transactions</h1>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button className="rounded-lg border border-[#d6dae1] bg-white px-3 py-2 text-sm font-semibold text-[#16213f]" type="button">Household (All)</button>
            <div className="flex rounded-lg bg-[#e2e6eb] p-1" aria-label="Transaction view">
              <button aria-pressed="true" className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-[#12213d]" type="button">List</button>
              <button aria-pressed="false" className="rounded-md px-3 py-1.5 text-sm font-semibold text-[#3a4459]" type="button">Spreadsheet</button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="min-w-[220px] flex-1 text-sm font-medium text-[#3a4459]">Search transactions<input aria-label="Search transactions" className="mt-1 w-full rounded-lg border border-[#d6dae1] bg-white px-3 py-2 text-[#16213f]" placeholder="Search descriptions" type="search" /></label>
            <label className="text-sm font-medium text-[#3a4459]">Transaction type<select aria-label="Transaction type" className="mt-1 block rounded-lg border border-[#d6dae1] bg-white px-3 py-2 text-[#16213f]" defaultValue="all"><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option></select></label>
            <p className="pb-2 text-sm text-[#6b7686]">0 transactions</p>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#d6dae1] bg-white">
            <table className="min-w-[760px] w-full border-collapse text-left text-sm">
              <thead className="bg-[#f4f5f7] text-xs font-semibold uppercase tracking-wide text-[#6b7686]"><tr>{columns.map((column) => <th className="px-4 py-3" key={column} scope="col">{column}</th>)}</tr></thead>
              <tbody><tr><td className="px-4 py-12 text-center text-[#8a93a3]" colSpan={columns.length}>No transactions match your filters.</td></tr></tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/components/transactions-page.test.tsx`

Expected: PASS with one passing `TransactionsPage` test.

- [ ] **Step 5: Commit the page implementation**

```bash
git add src/components/app-header.tsx src/components/transactions-page.tsx src/app/transactions/page.tsx tests/components/transactions-page.test.tsx
git commit -m "feat: add transactions page layout"
```

### Task 2: Verify the full pipeline

**Files:**
- Modify: no source files expected.

**Interfaces:**
- Consumes: the Transactions route, component, and component test from Task 1.
- Produces: verified format, lint, type, test, and production build results.

- [ ] **Step 1: Check formatting**

Run: `npm run format:check`

Expected: PASS with no formatting differences.

- [ ] **Step 2: Run linting and type checking**

Run: `npm run lint; npm run typecheck`

Expected: both commands exit successfully with no diagnostics.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`

Expected: PASS, including `tests/components/transactions-page.test.tsx` and all existing tests.

- [ ] **Step 4: Build the production application**

Run: `npm run build`

Expected: Next.js completes successfully and lists `/transactions` among generated routes.

- [ ] **Step 5: Commit formatting-only corrections if required**

```bash
git add src/components/app-header.tsx src/components/transactions-page.tsx src/app/transactions/page.tsx tests/components/transactions-page.test.tsx
git commit -m "chore: format transactions page"
```

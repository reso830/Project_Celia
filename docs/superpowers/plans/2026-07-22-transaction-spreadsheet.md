# Transaction Spreadsheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a selectable, read-only spreadsheet transaction view with monthly groupings and PHP totals.

**Architecture:** Keep the existing list rendering in `TransactionsPage` and introduce a view state for the current toggle. Add a focused spreadsheet component with pure grouping helpers, leaving data loading and labels in the page. The spreadsheet remains a semantic table in a horizontal-scroll container.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest, Testing Library.

## Global Constraints

- Preserve the List view and select it initially.
- Spreadsheet cells are display-only; do not add inline editing or filters.
- Display PHP amounts and calculate net as income minus expense.
- Keep responsive horizontal scrolling with a fixed table minimum width.
- Do not change repositories or domain model types.

---

## File structure

- Create: `src/components/transaction-spreadsheet.tsx` — monthly grouping helpers and read-only table.
- Modify: `src/components/transactions-page.tsx` — selected view state and conditional rendering.
- Modify: `tests/components/transactions-page.test.tsx` — feature acceptance tests.

### Task 1: Build monthly spreadsheet rendering

**Files:**
- Create: `src/components/transaction-spreadsheet.tsx`
- Test: `tests/components/transactions-page.test.tsx`

**Interfaces:**
- Consumes: `Transaction` from `@/domain`; `memberName(memberId: string): string`; `bucketName(categoryId: string): string`.
- Produces: `TransactionSpreadsheet({ transactions, memberName, bucketName }): JSX.Element`.

- [ ] **Step 1: Write the failing test**

Add income and expense fixtures dated in July and June. Add this test:

```tsx
it("groups spreadsheet transactions by month and displays monthly totals", async () => {
  const user = userEvent.setup();
  renderTransactions({
    members: [alex],
    categories: [groceries, salary],
    transactions: [juneGroceries, julySalary, julyGroceries],
  });

  await user.click(await screen.findByRole("button", { name: "Spreadsheet" }));

  expect(screen.getByRole("rowheader", { name: "July 2026" })).toBeInTheDocument();
  expect(screen.getByRole("rowheader", { name: "June 2026" })).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "₱5,000.00" })).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "₱1,250.00" })).toBeInTheDocument();
  expect(screen.getByText("Net ₱3,750.00")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/transactions-page.test.tsx`

Expected: FAIL because selecting Spreadsheet has no month headings or totals.

- [ ] **Step 3: Write minimal implementation**

Create the component with these public types and pure function:

```tsx
type TransactionSpreadsheetProps = {
  transactions: readonly Transaction[];
  memberName: (memberId: string) => string;
  bucketName: (categoryId: string) => string;
};

export function groupTransactionsByMonth(
  transactions: readonly Transaction[],
): readonly TransactionMonthGroup[] {
  // Sort a copied array by descending ISO date, group YYYY-MM keys,
  // and sum income and expense cents separately.
}

export function TransactionSpreadsheet(props: TransactionSpreadsheetProps) {
  // Render Date, Member, Bucket, Description, Income, Expense, Recurring.
}
```

Format values with `Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })`. Use a table with `min-w-[900px]`, bordered cells, a month label row, its transaction rows, and a summary row containing `Net <formatted amount>`. Render `No transactions match your filters.` when no rows exist.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/transactions-page.test.tsx`

Expected: PASS, including the new grouping-and-totals test and existing page tests.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/components/transaction-spreadsheet.tsx tests/components/transactions-page.test.tsx
git commit -m "feat: render grouped transaction spreadsheet"
```

### Task 2: Connect the view switcher and responsive table container

**Files:**
- Modify: `src/components/transactions-page.tsx`
- Modify: `tests/components/transactions-page.test.tsx`

**Interfaces:**
- Consumes: `TransactionSpreadsheet` from `@/components/transaction-spreadsheet`.
- Produces: an accessible List/Spreadsheet view switcher.

- [ ] **Step 1: Write the failing test**

```tsx
it("switches between the list and responsive read-only spreadsheet views", async () => {
  const user = userEvent.setup();
  renderTransactions({ members: [alex], categories: [groceries], transactions: [groceryTransaction] });

  const spreadsheetButton = await screen.findByRole("button", { name: "Spreadsheet" });
  await user.click(spreadsheetButton);

  expect(spreadsheetButton).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByTestId("transaction-spreadsheet-scroll")).toHaveClass("overflow-x-auto");
  expect(screen.getByRole("columnheader", { name: "Income" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "List" }));
  expect(screen.getByRole("columnheader", { name: "Amount" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/transactions-page.test.tsx`

Expected: FAIL because the button state is fixed and the spreadsheet component is not connected.

- [ ] **Step 3: Write minimal implementation**

In `src/components/transactions-page.tsx`, add the state below:

```tsx
type TransactionView = "list" | "spreadsheet";

const [view, setView] = useState<TransactionView>("list");
```

Import and render `TransactionSpreadsheet` when `view === "spreadsheet"`. Buttons must set the matching value and derive their `aria-pressed` attributes and active styles from `view`. Place the spreadsheet in a `data-testid="transaction-spreadsheet-scroll"` wrapper with `overflow-x-auto`. Keep the current List table unchanged and do not attach editors or inputs to grid cells.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/transactions-page.test.tsx`

Expected: PASS, including the view-switching and responsive-overflow test.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/components/transactions-page.tsx tests/components/transactions-page.test.tsx
git commit -m "feat: add transaction spreadsheet view switcher"
```

### Task 3: Run the repository verification pipeline

**Files:**
- Modify: none, unless a verification command reveals a source correction.

**Interfaces:**
- Consumes: completed spreadsheet component and page integration.
- Produces: fresh verification evidence for the acceptance criteria.

- [ ] **Step 1: Check formatting**

Run: `npm run format:check`

Expected: exit code 0 and all files correctly formatted.

- [ ] **Step 2: Check linting and types**

Run: `npm run lint; npm run typecheck`

Expected: both commands exit 0 with no ESLint or TypeScript errors.

- [ ] **Step 3: Run automated tests**

Run: `npm test`

Expected: exit code 0 with all Vitest suites passing.

- [ ] **Step 4: Build production output**

Run: `npm run build`

Expected: exit code 0 after the Next.js production build completes.

- [ ] **Step 5: Commit a correction only if verification required one**

Run:

```powershell
git add <corrected-files>
git commit -m "fix: satisfy transaction spreadsheet verification"
```

## Plan self-review

- Spec coverage: Task 1 delivers spreadsheet layout, monthly groups, transaction rows, summary rows, PHP totals, and read-only cells. Task 2 delivers selectable List/Spreadsheet views and responsive scrolling. Task 3 executes the required verification pipeline.
- Placeholder scan: no TODO/TBD markers or unspecified implementation actions remain.
- Type consistency: both tasks use `TransactionSpreadsheet`, `readonly Transaction[]`, and the same `list`/`spreadsheet` union values.

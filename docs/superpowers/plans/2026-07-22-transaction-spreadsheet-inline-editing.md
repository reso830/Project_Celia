# Transaction Spreadsheet Inline Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Enable direct spreadsheet transaction edits with keyboard save, navigation, and cancellation.

**Architecture:** TransactionSpreadsheet owns a single active-cell draft and the ordered editable-cell focus map. TransactionsPage provides members, same-type categories, and a callback that builds a validated replacement transaction and calls the existing DataProvider save action; the provider already persists it and replaces the matching row.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Vitest 4, Testing Library.

## Global Constraints

- Edit only visible data: Date, Member, Bucket, Description, active Income/Expense amount, and Recurring.
- Preserve the transaction type; the inactive amount cell is not editable.
- Enter/double-click opens; Enter saves and moves down; Tab/Shift+Tab save and move across; Escape cancels.
- Keep modal editing, monthly grouping/totals, and Dashboard unchanged.
- Skip month rows, total rows, inactive amount cells, and action cells in navigation.

---

## File structure

- Modify: src/components/transaction-spreadsheet.tsx — active-cell state, controls, validation, saving, and focus navigation.
- Modify: src/components/transactions-page.tsx — pass members/categories and persist replacement transactions.
- Modify: tests/components/transactions-page.test.tsx — acceptance and regression tests.

### Task 1: Add test-first cell edit mode

**Files:**
- Modify: src/components/transaction-spreadsheet.tsx
- Test: tests/components/transactions-page.test.tsx

**Interfaces:**
- Add spreadsheet props members: readonly Member[], categories: readonly Category[], and onSave(transaction: Transaction): Promise<void>.
- Add EditableColumn = "date" | "memberId" | "categoryId" | "description" | "amount" | "recurring".

- [ ] **Step 1: Write the failing test**

~~~tsx
it("enters a visible spreadsheet cell with Enter or double click", async () => {
  const user = userEvent.setup();
  renderSpreadsheet({ transactions: [groceryTransaction] });
  const description = screen.getByRole("button", {
    name: "Description: Weekly groceries",
  });
  description.focus();
  await user.keyboard("{Enter}");
  expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
    "Weekly groceries",
  );

  await user.dblClick(screen.getByRole("button", { name: "Date: 2026-07-22" }));
  expect(screen.getByLabelText("Date")).toHaveValue("2026-07-22");
});
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: npm test -- tests/components/transactions-page.test.tsx -t "enters a visible spreadsheet cell"

Expected: FAIL because spreadsheet cells currently render plain text.

- [ ] **Step 3: Implement the minimum active-cell behavior**

Add activeCell: { transactionId: string; column: EditableColumn } | undefined and a draft value. Render each display value as a labelled button; its Enter and double-click handlers set the active cell. Replace only the active cell with a focused controlled input or select. Do not render a button for an inactive amount cell. Use date input, member select, same-type category select, description text input, decimal amount input, and recurring checkbox.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: npm test -- tests/components/transactions-page.test.tsx -t "enters a visible spreadsheet cell"

Expected: PASS.

- [ ] **Step 5: Commit**

~~~powershell
git add src/components/transaction-spreadsheet.tsx tests/components/transactions-page.test.tsx
git commit -m "feat: add spreadsheet cell edit mode"
~~~

### Task 2: Save inline edits and retain failure drafts

**Files:**
- Modify: src/components/transaction-spreadsheet.tsx
- Modify: src/components/transactions-page.tsx
- Test: tests/components/transactions-page.test.tsx

**Interfaces:**
- onSave receives a complete, validated replacement Transaction.
- Page callback preserves id, type, and unedited fields, then calls state.saveTransaction.

- [ ] **Step 1: Write failing save and failure tests**

~~~tsx
it("saves an inline amount through the transaction repository", async () => {
  const user = userEvent.setup();
  const { transactionSave } = renderTransactions({
    members: [alex], categories: [groceries], transactions: [groceryTransaction],
  });
  await user.click(await screen.findByRole("button", { name: "Spreadsheet" }));
  await user.dblClick(screen.getByRole("button", { name: "Expense: ₱12.50" }));
  await user.clear(screen.getByRole("textbox", { name: "Expense" }));
  await user.type(screen.getByRole("textbox", { name: "Expense" }), "24.75");
  await user.keyboard("{Enter}");

  await waitFor(() => expect(transactionSave).toHaveBeenCalledWith(
    expect.objectContaining({ id: groceryTransaction.id, amount: 2_475 }),
  ));
  expect(screen.getByRole("button", { name: "Expense: ₱24.75" })).toBeInTheDocument();
});

it("retains the inline draft when save fails", async () => {
  const user = userEvent.setup();
  const repositories = repositoriesWith({
    members: [alex], categories: [groceries], transactions: [groceryTransaction],
  });
  repositories.transactions.save = vi.fn().mockRejectedValue(new Error("offline"));
  renderWithRepositories(repositories);
  await user.click(await screen.findByRole("button", { name: "Spreadsheet" }));
  await user.dblClick(screen.getByRole("button", { name: "Description: Weekly groceries" }));
  await user.clear(screen.getByRole("textbox", { name: "Description" }));
  await user.type(screen.getByRole("textbox", { name: "Description" }), "Market run");
  await user.keyboard("{Enter}");

  expect(await screen.findByText("Unable to save this cell. Please try again.")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue("Market run");
});
~~~

- [ ] **Step 2: Run tests to verify they fail**

Run: npm test -- tests/components/transactions-page.test.tsx -t "inline amount|retains the inline draft"

Expected: FAIL because no inline repository save or error UI exists.

- [ ] **Step 3: Implement the smallest persistence path**

In the page, construct the replacement with existing createTransaction and call state.saveTransaction. In the spreadsheet, parse decimal amount with the existing positive PHP-cent validation (extract a shared helper only if needed), keep description empty as undefined, and filter category choices to the row type. Disable the active control while saving. On rejection, keep the active draft and render Unable to save this cell. Please try again.; on success clear the active state.

- [ ] **Step 4: Run tests to verify they pass**

Run: npm test -- tests/components/transactions-page.test.tsx -t "inline amount|retains the inline draft"

Expected: PASS.

- [ ] **Step 5: Commit**

~~~powershell
git add src/components/transaction-spreadsheet.tsx src/components/transactions-page.tsx tests/components/transactions-page.test.tsx
git commit -m "feat: persist inline spreadsheet edits"
~~~

### Task 3: Cancel and navigate edited cells

**Files:**
- Modify: src/components/transaction-spreadsheet.tsx
- Test: tests/components/transactions-page.test.tsx

**Interfaces:**
- Use a ref map keyed by transaction id and column for display-button focus.
- Derive target order from rendered, grouped transaction rows.

- [ ] **Step 1: Write failing cancel and navigation tests**

~~~tsx
it("cancels an inline edit without saving and restores focus", async () => {
  const user = userEvent.setup();
  const { transactionSave } = renderSpreadsheet({ transactions: [groceryTransaction] });
  await user.dblClick(screen.getByRole("button", { name: "Description: Weekly groceries" }));
  await user.clear(screen.getByRole("textbox", { name: "Description" }));
  await user.type(screen.getByRole("textbox", { name: "Description" }), "Changed");
  await user.keyboard("{Escape}");

  expect(transactionSave).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Description: Weekly groceries" })).toHaveFocus();
});

it("saves with Enter and focuses the same column in the next transaction row", async () => {
  const user = userEvent.setup();
  renderSpreadsheet({ transactions: [groceryTransaction, juneGroceries] });
  await user.dblClick(screen.getByRole("button", { name: "Description: Weekly groceries" }));
  await user.keyboard("{End} updated{Enter}");

  await waitFor(() => expect(screen.getByRole("button", {
    name: "Description: Weekly groceries updated",
  })).toBeInTheDocument());
  expect(screen.getByRole("button", { name: "Description: Weekly groceries" })).toHaveFocus();
});

it("saves with Tab and Shift+Tab to adjacent editable cells", async () => {
  const user = userEvent.setup();
  renderSpreadsheet({ transactions: [groceryTransaction] });
  await user.dblClick(screen.getByRole("button", { name: "Date: 2026-07-22" }));
  await user.keyboard("{Tab}");
  expect(screen.getByRole("button", { name: "Member: Alex" })).toHaveFocus();
  await user.keyboard("{Enter}{Shift>}{Tab}{/Shift}");
  expect(screen.getByRole("button", { name: "Date: 2026-07-22" })).toHaveFocus();
});
~~~

- [ ] **Step 2: Run tests to verify they fail**

Run: npm test -- tests/components/transactions-page.test.tsx -t "cancels an inline edit|same column|Shift\+Tab"

Expected: FAIL because no Escape, Tab, Shift+Tab, or target focus behavior exists.

- [ ] **Step 3: Implement save/cancel key handling**

Escape clears active state without calling onSave and focuses the original display button. Intercept Enter, Tab, and Shift+Tab from an active editor; prevent native movement, await save, clear edit state, then focus the calculated target. Enter selects the next transaction in the same editable column; Tab and Shift+Tab select the adjacent editable cell in row-major order. Do not move focus after a rejected save.

- [ ] **Step 4: Run tests to verify they pass**

Run: npm test -- tests/components/transactions-page.test.tsx -t "cancels an inline edit|same column|Shift\+Tab"

Expected: PASS.

- [ ] **Step 5: Commit**

~~~powershell
git add src/components/transaction-spreadsheet.tsx tests/components/transactions-page.test.tsx
git commit -m "feat: navigate inline spreadsheet edits by keyboard"
~~~

### Task 4: Run the verification pipeline

- [ ] **Step 1: Check formatting**

Run: npm run format:check

Expected: exit code 0.

- [ ] **Step 2: Check linting and types**

Run: npm run lint; npm run typecheck

Expected: both commands exit code 0.

- [ ] **Step 3: Run all tests**

Run: npm test

Expected: exit code 0.

- [ ] **Step 4: Build production output**

Run: npm run build

Expected: exit code 0.

## Plan self-review

- Spec coverage: Tasks 1–3 cover entering edit mode, visible-field controls, persistence, save errors, Escape restoration, and Enter/Tab/Shift+Tab movement; Task 4 covers the pipeline.
- Placeholder scan: no incomplete steps or unspecified behavior.
- Type consistency: all persisted edits use existing Transaction, createTransaction, and DataProvider.saveTransaction APIs.

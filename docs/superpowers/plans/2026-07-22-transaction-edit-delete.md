# Transaction Edit and Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users edit or, after confirmation, delete persisted transactions from both List and Spreadsheet views.

**Architecture:** Add deletion to the ready `DataProvider` state using the existing transaction repository. `TransactionsPage` owns edit selection and reuses its form for an existing ID, plus a separate confirmation dialog. `TransactionSpreadsheet` renders callbacks in an Actions column.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest, Testing Library, IndexedDB.

## Global Constraints

- Edit and Delete are available in both List and Spreadsheet views.
- Reuse the current transaction dialog for edits; do not add inline spreadsheet editing.
- Save edits with the original ID and require confirmation before deletion.
- Failed operations keep the visible collection unchanged and show an inline dialog error.

---

## File Structure

- `src/data/data-provider.tsx` — ready-state deletion action.
- `tests/data/data-provider.test.tsx` — deletion persistence coverage.
- `src/components/transaction-spreadsheet.tsx` — Actions column and callbacks.
- `src/components/transactions-page.tsx` — form prefill, row actions, confirmation dialog.
- `tests/components/transactions-page.test.tsx` — edit/delete interactions.

### Task 1: Persist deletion through the data provider

**Files:** Modify `src/data/data-provider.tsx`; modify `tests/data/data-provider.test.tsx`.

**Interfaces:** Consumes `TransactionRepository.delete(id: string): Promise<void>`; produces ready-state `deleteTransaction(id: string): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `TransactionDeleteProbe`, which calls `state.deleteTransaction("transaction-grocery")` and renders `transactions:${state.transactions.length}`. Initialize transaction repository `list` with `groceryTransaction`; assert its `delete` mock receives `"transaction-grocery"` and ready state renders `transactions:0`.

- [ ] **Step 2: Run the focused test (red)**

Run: `npm test -- tests/data/data-provider.test.tsx`

Expected: FAIL because `deleteTransaction` is absent from the ready state.

- [ ] **Step 3: Add the minimal action**

Add `deleteTransaction(id: string): Promise<void>` to the ready variant. In `initialize`, implement:

```ts
const deleteTransaction = async (id: string) => {
  await repositories.transactions.delete(id);
  if (!active) return;
  setState((current) => current.status === "ready"
    ? { ...current, transactions: current.transactions.filter((transaction) => transaction.id !== id) }
    : current);
};
```

Publish it in the ready state object.

- [ ] **Step 4: Run the focused test (green)**

Run: `npm test -- tests/data/data-provider.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/data-provider.tsx tests/data/data-provider.test.tsx
git commit -m "feat: delete transactions through data provider"
```

### Task 2: Add spreadsheet actions

**Files:** Modify `src/components/transaction-spreadsheet.tsx`; modify `tests/components/transactions-page.test.tsx`.

**Interfaces:** Consumes `onEdit(transaction: Transaction): void` and `onDelete(transaction: Transaction): void`; produces explicit action buttons.

- [ ] **Step 1: Write the failing test**

Seed `groceryTransaction`, switch to Spreadsheet, and assert `Edit Weekly groceries` and `Delete Weekly groceries` buttons are present.

- [ ] **Step 2: Run the focused test (red)**

Run: `npm test -- tests/components/transactions-page.test.tsx`

Expected: FAIL because the spreadsheet has no action controls.

- [ ] **Step 3: Add callbacks and the column**

Extend `TransactionSpreadsheetProps` with `onEdit` and `onDelete`, append `Actions` to `columns`, and render this cell for each transaction:

```tsx
<td className="border border-[#d6dae1] px-3 py-2.5">
  <button aria-label={`Edit ${transaction.description || bucketName(transaction.categoryId)}`} onClick={() => onEdit(transaction)} type="button">Edit</button>
  <button aria-label={`Delete ${transaction.description || bucketName(transaction.categoryId)}`} onClick={() => onDelete(transaction)} type="button">Delete</button>
</td>
```

Add one empty cell to the monthly total row.

- [ ] **Step 4: Run the focused test (green)**

Run: `npm test -- tests/components/transactions-page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/transaction-spreadsheet.tsx tests/components/transactions-page.test.tsx
git commit -m "feat: add spreadsheet transaction actions"
```

### Task 3: Reuse the form for edits and confirm deletion

**Files:** Modify `src/components/transactions-page.tsx`; modify `tests/components/transactions-page.test.tsx`.

**Interfaces:** Consumes ready `saveTransaction`, `deleteTransaction`, and `Transaction`; produces prefilled Edit Transaction dialog and Delete transaction? confirmation dialog.

- [ ] **Step 1: Write the failing interaction tests**

List view: click `Edit Weekly groceries`, assert dialog name `Edit Transaction`, date `2026-07-22`, member `member-alex`, and amount `12.50`; replace amount with `24.75`, save `Save changes`, and assert repository save receives `{ id: "transaction-grocery", amount: 2475 }` and the table shows `₱24.75`.

Deletion: click `Delete Weekly groceries`, assert dialog `Delete transaction?`, cancel and assert no delete call; reopen, click `Delete transaction`, assert deletion receives the ID and the description disappears. Update the rendering helper to return save and delete mocks.

- [ ] **Step 2: Run the focused test (red)**

Run: `npm test -- tests/components/transactions-page.test.tsx`

Expected: FAIL because row actions, edit mode, and confirmation dialog do not exist.

- [ ] **Step 3: Implement edit state and prefill**

Add `editingTransaction: Transaction | undefined`. `openEditDialog(transaction)` records focus, finds its category, and sets date/member/type/bucket/category ID, `(amount / 100).toFixed(2)`, description, and recurring. In the current save handler, use `editingTransaction?.id ?? crypto.randomUUID()` for `createTransaction`. Use dialog/title/button text `Edit Transaction` and `Save changes` when editing; retain Add Transaction behavior otherwise.

- [ ] **Step 4: Implement list and confirmation actions**

Add List-row buttons with the same accessible names as Task 2. Add `transactionPendingDeletion`, `deleteError`, and `isDeleting` state. The confirmation dialog must have accessible name `Delete transaction?`, Cancel, and `Delete transaction`; only the last invokes `await state.deleteTransaction(transactionPendingDeletion.id)`. On success clear selection; on error retain it and show `Unable to delete this transaction. Please try again.`. Prevent duplicate deletion while `isDeleting` is true and restore trigger focus when cancelling/closing.

- [ ] **Step 5: Run the focused test (green)**

Run: `npm test -- tests/components/transactions-page.test.tsx`

Expected: PASS, proving prefill, ID-preserving update, cancellation, confirmation, persistence, and immediate UI refresh.

- [ ] **Step 6: Commit**

```bash
git add src/components/transactions-page.tsx tests/components/transactions-page.test.tsx
git commit -m "feat: edit and delete transactions"
```

### Task 4: Verify the full pipeline

**Files:** No source changes expected.

- [ ] **Step 1: Check formatting**

Run: `npm run format:check`

Expected: exit 0 with no differences.

- [ ] **Step 2: Run static checks**

Run: `npm run lint; npm run typecheck`

Expected: both exit 0 without diagnostics.

- [ ] **Step 3: Run automated tests**

Run: `npm test`

Expected: exit 0 with all Vitest files passing.

- [ ] **Step 4: Build production application**

Run: `npm run build`

Expected: exit 0 and the route list includes `/transactions`.

- [ ] **Step 5: Commit formatting-only changes if any**

```bash
git add src/data/data-provider.tsx src/components/transaction-spreadsheet.tsx src/components/transactions-page.tsx tests/data/data-provider.test.tsx tests/components/transactions-page.test.tsx
git commit -m "chore: format transaction edit and delete"
```

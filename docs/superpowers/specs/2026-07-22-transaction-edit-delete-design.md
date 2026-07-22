# Transaction Edit and Delete Design

## Purpose

Allow household users to correct or remove existing transactions while keeping the stored data and both transaction views in sync.

## Scope

- Edit a transaction from either List or Spreadsheet view.
- Reuse the existing transaction dialog for creation and editing.
- Delete a transaction only after explicit confirmation.
- Persist updates and removals through the existing transaction repository.

## Architecture

- Extend the ready `DataState` with `deleteTransaction(id: string): Promise<void>`.
- Continue using `saveTransaction(transaction)` for updates: the repository save operation and its local immutable upsert already support a transaction with an existing ID.
- Keep editing and confirmation-dialog state in `TransactionsPage`; no route or shared form abstraction is introduced.
- Pass row action rendering to `TransactionSpreadsheet` so edit and delete are available in both views while preserving read-only spreadsheet cells.

## Editing Flow

- Every transaction row has explicit `Edit` and `Delete` buttons in both List and Spreadsheet views.
- Choosing `Edit` opens the existing accessible dialog, titled `Edit Transaction`, with all values populated from the selected transaction.
- The user can change the same fields available during creation: date, member, type, bucket, subcategory, amount, notes, and recurring.
- The selected transaction ID is retained. A successful save calls `saveTransaction` with that ID, immediately updates both views, resets form state, and closes the dialog.
- Creation behavior remains unchanged: it opens an `Add Transaction` dialog and creates a new ID.

## Deletion Flow

- Choosing `Delete` opens a separate accessible confirmation dialog. It identifies the transaction by its date and description, falling back to its bucket when no description exists.
- `Cancel` and dialog close leave the transaction untouched and restore focus to the trigger.
- The destructive action is explicitly labeled `Delete transaction`. While deletion is in progress, controls prevent duplicate requests.
- On success, `deleteTransaction` removes the item from IndexedDB and immutable ready-state transactions, then closes the confirmation dialog. On failure, it remains open and displays a non-destructive error.

## Data Flow and Errors

- `deleteTransaction` awaits `repositories.transactions.delete(id)` before filtering the ready-state transaction collection by ID.
- Edit saves retain the existing validation, setup-state, and save-error behavior of the add dialog.
- A failed edit or delete never changes the visible transaction collection.

## Testing and Verification

- Add a data-provider test proving `deleteTransaction` calls the repository and removes the ready-state record.
- Add component tests confirming edit buttons in both views, prefilled edit fields, persistence of changed values, and immediate rendering of the update.
- Add component tests confirming deletion requires confirmation, cancellation preserves the transaction, and confirmed deletion persists and removes it from the UI.
- Run formatting validation, lint, typecheck, the full Vitest suite, and a production build.

## Exclusions

- Inline spreadsheet editing.
- Bulk deletion.
- Undo or trash retention.
- Search and filter behavior changes.

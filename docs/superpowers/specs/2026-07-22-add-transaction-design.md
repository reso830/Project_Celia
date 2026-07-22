# Add Transaction Modal Design

## Purpose

Enable a household to record an income or expense from the Transactions page. A successful submission persists a valid transaction and displays it in the list immediately.

## Architecture

- Keep modal and form state in `TransactionsPage`; do not introduce a route or reusable form abstraction in this increment.
- Extend the ready `DataState` with `saveTransaction(transaction)`.
- `saveTransaction` writes through the existing `TransactionRepository` and updates the ready state's `transactions` collection, following the established member/category save pattern.
- The page derives its transaction table from `useData()` rather than static empty-state markup.
- The component uses the existing `createTransaction` domain factory before persistence.

## Modal and Form

- The existing `+ Add Transaction` button opens an accessible dialog titled `Add Transaction`.
- The form contains Date, Member, Income / Expense, Bucket, Subcategory, Amount, Notes, and a Recurring toggle.
- Date initially uses the local calendar date in `yyyy-mm-dd` form and remains editable.
- Expense is the initial transaction type. Changing type clears any selected bucket and subcategory.
- Bucket values are unique category `group` values matching the selected type. Subcategory values are matching category names for the selected bucket; the selected subcategory supplies `categoryId`.
- Notes maps to the domain transaction `description` field. Amount is entered as PHP pesos with optional centavos and converted exactly to positive PHP minor units before construction.
- Cancel closes the modal without saving. Successful save closes the modal and clears form state for its next opening.

## Validation and Empty Setup State

- Date, member, bucket, subcategory, and a positive amount are required.
- Amount rejects malformed currency input, zero, and negative values. Validation errors are shown inline and submission does not persist.
- If no members exist, or no categories exist for the selected type, the modal presents a concise setup message and disables Save. Changing the type re-evaluates availability.
- Save failures remain in the dialog and display a non-destructive form-level error.

## Transaction List

- The list count reflects `transactions.length`.
- With no transactions, retain `No transactions match your filters.`
- Each saved transaction renders a row with date, member name, category bucket, description (notes), PHP-formatted amount, and recurring status.
- The existing search/filter controls remain out of scope; the list simply displays saved transactions.

## Testing and Verification

- Add a data-provider test proving `saveTransaction` persists through the repository and refreshes the provider state.
- Add component tests for opening the modal, required-field validation, unavailable member/category setup state, and a successful submission appearing in the table.
- Test currency conversion and dialog behavior through user interactions, using the real domain factory and in-memory repositories.
- Run formatting validation, lint, typecheck, the full Vitest suite, and a production build.

## Exclusions

- Editing or deleting transactions.
- Spreadsheet implementation.
- Search and filter behavior.
- Recurrence schedule generation; the toggle only stores the current transaction's recurring flag.

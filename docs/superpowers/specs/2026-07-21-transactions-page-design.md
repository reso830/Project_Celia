# Transactions Page Design

## Purpose

Add the approved Transactions list layout so users have a dedicated place to browse financial records. This increment establishes the page structure and fresh-install empty state only; it does not create, edit, delete, filter, or persist transactions.

## Route and Layout

- Add a `/transactions` route that renders a `TransactionsPage` component.
- Reuse the shared navy application header, with Transactions as the active navigation pill. Dashboard and Settings remain links.
- Include a visible `+ Add Transaction` header button as part of the approved layout. It is presentational and does not open a modal in this increment.
- Use the established `#eef0f3` application background with centered content up to 1400px wide and responsive outer padding.

## Transaction Controls

- Render the top controls row with a `Household (All)` scope chip and a List/Spreadsheet segmented control. List is selected.
- Render the list-only toolbar below it: a search field labelled `Search transactions`, a Type selector containing All types, Income, and Expense, and a `0 transactions` caption.
- Controls are visual only; their values do not alter the empty state. Spreadsheet content is not implemented.

## Table and Empty State

- Render a bordered white table container using the approved flat-card treatment: a one-pixel `#d6dae1` border, 12px radius, and no shadow.
- Preserve the list column headings: Date, Member, Bucket, Description, Amount, and Recurring.
- Show the centered empty-state copy `No transactions match your filters.` below the headings.
- Do not render sample transaction data, editable rows, delete controls, or transaction dialogs.

## Responsive Behavior

- Keep the toolbar and top controls flexible, wrapping rather than causing horizontal page scrolling on narrow viewports.
- Let the search field grow on wider screens and occupy the available row width on small screens.
- Make the table container horizontally scrollable if the header columns no longer fit, while preserving readable labels and empty-state copy.

## Testing and Verification

- Add a component test that checks the Transactions heading/navigation state, Add Transaction button, search field, filter controls, list headers, and empty-state copy.
- Verify with formatting validation, linting, strict type checking, the full test suite, and a production build.

## Exclusions

- Transaction CRUD and modal behavior.
- Search/filter behavior and transaction data binding.
- Spreadsheet/pivot table implementation.
- Dashboard changes.

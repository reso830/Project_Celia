# Transaction spreadsheet inline editing design

## Purpose

Allow users to edit existing transactions directly in the spreadsheet view so rapid data entry does not require opening the transaction dialog.

## Editable surface

Only visible transaction cells are editable. The spreadsheet keeps its existing columns and monthly grouping rows. Date, Member, Bucket, Description, the active Income or Expense amount cell, and Recurring can enter edit mode. The inactive amount cell remains unavailable because a transaction keeps its existing income or expense type. The action column remains available for the existing edit and delete dialog actions.

Date uses a date input. Member, Bucket, and Recurring use controls populated from the ready page data. Bucket choices are limited to categories valid for the transaction's immutable type. Description is text. The active amount cell accepts a decimal PHP amount and is converted to the persisted integer-cent amount.

## Interaction and keyboard behavior

Double-clicking a cell or pressing Enter on its focused display value enters edit mode and moves focus into the inline control. Only one cell is edited at a time. Each edit keeps a draft and its original transaction value.

Enter saves the edited value, exits edit mode, and focuses the same column in the next transaction row. Tab saves and advances to the next editable cell; Shift+Tab saves and moves to the previous editable cell. Escape cancels the edit, restores the original displayed value, and returns focus to the cell display. Normal table navigation skips month and total rows, plus non-editable cells such as the inactive amount column and action buttons.

## Persistence and failure handling

Saving creates an updated transaction from the existing row and writes it through the existing transaction repository. The normal data subscription updates the rendered spreadsheet so saved values persist after reload. While saving, the active control is disabled to prevent duplicate writes. If the repository rejects the write, the cell remains in edit mode with its draft intact and presents an inline error; keyboard focus stays in the control.

## Boundaries and testing

No transaction-domain or repository API changes are required. The current modal edit flow and dashboard remain unchanged.

Component tests cover entering edit mode, control selection, save behavior and repository persistence, Escape restoration, Enter and Tab/Shift+Tab navigation, and failed saves. The repository tests remain the source of IndexedDB persistence coverage. The verification pipeline runs formatting, linting, type checking, tests, and production build.

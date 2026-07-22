# Transaction spreadsheet design

## Purpose

Add a read-only spreadsheet view to the Transactions page so users can scan many household transactions in an Excel-like grid while retaining the existing list view.

## View selection

The existing `List` and `Spreadsheet` controls act as a view switcher. List remains selected initially and preserves the current table. Selecting Spreadsheet replaces the table beneath the controls with the spreadsheet layout; it does not change data, filters, or the add-transaction dialog.

## Spreadsheet layout

The spreadsheet is a semantic table inside a horizontally scrollable container. It uses a fixed minimum width, grid cell borders, compact rows, and aligned currency cells so narrow screens can scroll without compressing columns into unreadability.

Columns are Date, Member, Bucket, Description, Income, Expense, and Recurring. A transaction contributes its amount to Income when its type is income and to Expense when its type is expense; the opposite amount cell is empty. Cells are display-only.

## Monthly grouping and totals

Transactions are grouped by calendar month using their ISO dates, ordered newest month first. Each group contains a labelled month row, its transaction rows, then a summary row. The summary row displays the month income total, expense total, and net total (income minus expense). Currency values use PHP formatting. An empty spreadsheet shows the existing no-transactions message.

## Boundaries and testing

Presentation helpers derive month labels, group transactions, and calculate group totals from the persisted transaction array. The components resolve member and category labels from the ready data state. No repository or domain-model changes are required.

Component tests verify switching views, grouping transactions into months, correct totals, and the scrollable spreadsheet container. Existing list-view and transaction-dialog tests remain valid.

## Scope

This work adds rendering only. Inline editing and filters remain out of scope.

# Celia v3 — F02: Entries
**Feature Brief | Accelerated SDD**

## 1. Overview

The Entries feature enables users to record, manage, and review household financial transactions.

Building upon the household, member, category, and item structures established in F01, this feature introduces the primary data-entry workflow for Celia.

Entries serve as the authoritative source of actual income and expense activity, providing the financial data required by subsequent budgeting, reporting, and forecasting features.

**Primary objective:** Make recording and reviewing financial activity fast, intuitive, and reliable.

## 2. Goals

Users should be able to:

- Record income and expense transactions.
- Assign transactions to household members or the household itself.
- Classify transactions using existing categories and items.
- Edit and delete existing transactions.
- Browse historical financial activity.
- Search, filter, and sort transactions.
- View transaction totals and summaries.
- Reliably persist transaction records.

The feature should prioritize efficient data entry with minimal unnecessary interaction.

## 3. Functional Scope

### 3.1 Transaction Management

Celia shall support two primary transaction types:

- **Income:** Money received by the household or an individual member.
- **Expense:** Money spent by the household or an individual member.

Each transaction shall contain:

| Field | Description |
|---|---|
| Type | Income or Expense |
| Amount | Positive monetary value in PHP |
| Date | Date of the financial activity |
| Category | Income or expense classification |
| Item | Specific item belonging to the selected category |
| Owner | Household or individual member |
| Description / Notes | Optional additional details |

Each transaction must have a unique identifier and appropriate creation/update metadata.

### 3.2 Add Entry

Users shall be able to create transactions using the entry modal defined in the Celia v3 prototype.

The workflow should support:

- Selecting Income or Expense.
- Entering a monetary amount.
- Selecting the transaction date.
- Choosing a category and corresponding item.
- Assigning ownership.
- Adding optional notes.
- Saving or canceling the entry.

**Behavioral requirements:**

- The transaction date defaults to the current date.
- Ownership defaults to Household.
- The item selection depends on the selected category.
- Only active categories and items are available for new entries.
- Required fields must be validated before saving.
- Invalid submissions must provide clear feedback.
- Canceling must not persist changes.

The entry modal should favor keyboard-friendly interactions and efficient repeated entry.

### 3.3 Edit and Delete Entries

Users shall be able to modify existing transactions.

Editing should reuse the entry modal and populate it with the selected transaction's existing values.

Users may modify any editable transaction field.

Deleting an entry must require confirmation to prevent accidental loss of financial records.

Changes must immediately affect relevant transaction listings and calculated summaries.

### 3.4 Entries List

The Entries screen shall display recorded transactions using the structure established in the v3 prototype.

Each entry should expose sufficient information to identify:

- Transaction date
- Description or item
- Category
- Owner
- Amount
- Transaction type

Income and expense amounts should be visually distinguishable.

The list should support appropriate empty states, including when no transactions exist or filters produce no matches.

### 3.5 Search, Filtering, and Sorting

Users shall be able to narrow transaction records through:

**Search**
- Transaction descriptions and notes
- Category names
- Item names

**Filters**
- Date or reporting period
- Transaction type
- Category
- Household member / owner

**Sorting**
- Transaction date
- Amount

The default presentation should show the most recent transactions first.

Search and filters should work together, with summaries reflecting the applicable filtered records.
Changing the month keeps the active search and filters while the Entries screen remains open;
leaving and returning to the screen resets them.

### 3.6 Financial Summaries

The Entries screen should provide basic financial summaries for the selected reporting period.

At minimum:

- Total income
- Total expenses
- Net balance (income minus expenses)

These values must be derived from persisted transactions rather than maintained as separate authoritative totals.

Savings allocations, budgets, and projections are not included in these calculations.

## 4. Domain Rules

### Financial Classification

Each transaction belongs to exactly one financial type: Income or Expense.

The selected item must belong to a category compatible with that type.

A transaction cannot simultaneously represent income and expense.

### Ownership

A transaction belongs either to Household or to one individual member.

Household-level views aggregate transactions regardless of ownership.

Member-specific views must distinguish individually owned transactions from those explicitly assigned to Household.

### Financial Precision

Monetary values must use an exact representation suitable for financial calculations.

Negative amounts are not used to distinguish transaction types. Income and Expense are represented explicitly.

Zero or negative transaction amounts are invalid for ordinary entry creation.

### Category Changes

Transactions reference the item classification established in F01.

If an item is moved between categories, its associated transactions follow the updated classification.

Archived categories and items remain available for displaying historical transactions.

Existing transactions must remain readable and editable even when their associated classification has been archived.

### Historical Records

Editing a transaction updates the existing record rather than creating a duplicate.

Deletion must be explicit and must not inadvertently affect unrelated financial records.

## 5. UX Requirements

The supplied Celia v3 prototype remains the primary visual and interaction reference.

F02 should implement:

- Entries screen
- Add/Edit Entry modal
- Search and filter controls
- Transaction listing
- Transaction summaries
- Empty, loading, validation, and error states

The implementation should follow the existing Celia design system established in F01.

Interaction efficiency is particularly important because transaction recording is expected to be one of Celia's most frequently used workflows.

## 6. Persistence and Integration

F02 shall extend the persistence model established in F01.

Transactions must retain stable references to their associated:

- Household
- Member, when applicable
- Category/item classification

Financial data must survive application reloads.

Transaction creation, updates, and deletion must maintain consistency between persisted records and displayed summaries.

F02 should expose reusable transaction data access and calculation behavior for later features, without prematurely implementing their business logic.

## 7. Out of Scope

F02 does not implement:

- Savings bucket contributions or withdrawals
- Budget allocation or enforcement
- Recurring or scheduled transactions
- Bank account integration
- CSV or bank statement imports
- Receipt attachments
- Transfers between accounts
- Multi-currency transactions
- Forecast calculations
- Advanced analytics
- Approval workflows or transaction-level permissions

These may be addressed by later features or future Celia versions.

## 8. Acceptance Criteria

F02 is complete when:

1. Users can create valid income and expense transactions.
2. Transactions support amount, date, category, item, owner, and optional notes.
3. Transaction types and classifications are validated consistently.
4. Users can edit existing transactions without creating duplicates.
5. Users can delete transactions through an explicit confirmation flow.
6. Transactions persist correctly across reloads.
7. Users can browse transactions in the Entries screen.
8. Search, filters, and sorting produce accurate results.
9. Income, expense, and net totals are calculated correctly.
10. Household and member ownership are represented consistently.
11. Archived classifications remain usable for historical records.
12. Changes to transactions are reflected in displayed summaries.
13. Financial calculations use deterministic, precise arithmetic.
14. Relevant empty, error, and validation states are handled.
15. The implemented experience follows the supplied Celia v3 prototype.
16. Automated tests cover core transaction behavior, calculations, and persistence.

## 9. Implementation Guidance

F02 should be developed as a single vertical feature, covering the UI, transaction domain behavior, persistence, and verification.

The specification and implementation plan may decompose the feature into smaller tasks, but additional feature briefs are unnecessary.

Keep transaction logic separate from UI components so later features can reuse authoritative financial records without duplicating calculations.

Avoid introducing generalized accounting systems, ledgers, or transaction-processing infrastructure unless an approved requirement explicitly demands them.

**Expected outcome:** After F02, Celia should function as a usable household income and expense tracker, even before budgeting, savings management, and forecasting are implemented.

# Dummy Data Script Design

## Goal

Provide a deterministic, local-only way to replace or clear Celia's IndexedDB data, so developers can validate the UI and workflows without entering records manually.

## Scope

The feature is deliberately script-only. It does not add a Settings control or any other application UI.

## Architecture

`src/data/dummy-data` will be independent of React and expose a generator that accepts a reference date (`yyyy-mm-dd`) and returns validated Celia domain entities: members, bucket groups, categories, expense bucket-color overrides, and transactions. IDs, values, and category/member relationships are fixed. Dates are derived from the reference date and span its current month plus the six preceding complete months.

A population module will use a single IndexedDB read-write transaction across every Celia store. `populate` clears all stores and writes the generated dataset in dependency order; `clear` clears every store. If a request fails, the transaction aborts, preserving the prior data. This module will be shared by the command-line runner and repository-focused tests.

The npm script will run a TypeScript-free Node-compatible entry point using the installed project tooling. It will support `populate` (optionally with a `--reference-date=yyyy-mm-dd` argument) and `clear`. It targets the browser's local database only when executed in an environment that supplies IndexedDB; it will otherwise report that IndexedDB is unavailable. The test environment will use `fake-indexeddb`.

## Dataset

The generator creates Alex and Sam using the first two existing Settings member-palette colors. It creates the specified Employment and Other Income groups, the five required income categories, the Housing, Food, Transportation, Household, and Personal expense groups, and all listed expense categories. Expense groups receive fixed overrides selected from Celia's existing visual palette; income groups do not receive overrides.

Handcrafted monthly patterns create roughly 80–120 transactions. They include salaries for both members, recurring rent, utilities, internet, and subscriptions; regular groceries; dining, coffee, transport, household, and personal spending; and non-recurring bonus/freelance/reimbursement entries. One month contains an unusually large furniture expense, ensuring it exceeds the household's typical expense level. Amounts are positive PHP minor units and every transaction has a valid ISO date, member ID, category ID, transaction type, and unique deterministic ID.

## Error Handling

Population returns only after the database transaction completes. Any failure rejects the operation and aborts the transaction. The command runner writes a concise error to stderr and exits non-zero; it makes no changes when it cannot open IndexedDB.

## Testing

Tests will assert that fixed reference dates produce identical data, that all IDs and transaction references resolve, that dates cover the specified window, and that required members/categories/recurring and non-recurring records exist. Persistence tests will seed old records, run population and clear operations against `fake-indexeddb`, and verify full replacement plus rollback on an injected write failure.

## Constraints

- Use existing domain constructors and IndexedDB persistence boundaries.
- Never seed on normal application startup.
- Store PHP amounts as positive integer minor units.
- Do not implement a recurring scheduler or future transactions.
- Verify with lint, formatting, type checking, tests, and production build.

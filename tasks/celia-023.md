# CELIA-023 - Populate Local Database with Dummy Data

## Epic

Development Support

## Goal

Provide a deterministic set of dummy household, bucket, and transaction data so that Celia can be demonstrated and tested without manually entering records.

## User Story

As a developer or reviewer,
I want to populate Celia with realistic dummy data
so that I can verify transaction workflows, dashboard calculations, charts, filtering, and household views.

## Background

Celia currently starts with an empty local database.

An empty database is appropriate for normal use, but it makes development and demonstration inefficient because dashboard and transaction features require a meaningful amount of data.

This feature introduces an explicit development-only action that populates the existing local database with predictable dummy data.

The dummy dataset must use the existing domain model and repository interfaces. It must not bypass the persistence layer or be embedded directly inside UI components.

## Scope

Implement a reusable dummy-data generator and a development-only method for inserting the generated records into the local database.

The generated dataset must include:

* Household members
* Income buckets and subcategories
* Expense buckets and subcategories
* Bucket color overrides
* Income transactions
* Expense transactions
* Recurring and non-recurring transactions
* Transactions belonging to different household members
* Transactions distributed across multiple months

## Dummy Household Members

Create the following members:

| Name | Color                       |
| ---- | --------------------------- |
| Alex | First member palette color  |
| Sam  | Second member palette color |

Use the existing member color palette rather than hard-coding unrelated colors.

## Dummy Income Buckets

Create the following income groups and subcategories:

### Employment

* Salary
* Bonus

### Other Income

* Freelance
* Reimbursement
* Interest

## Dummy Expense Buckets

Create the following expense groups and subcategories:

### Housing

* Rent
* Electricity
* Water
* Internet

### Food

* Groceries
* Dining Out
* Coffee

### Transportation

* Fuel
* Public Transport
* Parking
* Ride Hailing

### Household

* Supplies
* Maintenance
* Furniture

### Personal

* Shopping
* Entertainment
* Healthcare
* Subscriptions

## Bucket Colors

Assign deterministic colors to expense bucket groups using Celia's existing expense palette.

The same dummy dataset must always produce the same bucket colors.

Income groups must continue using the fixed income color defined by the application.

## Dummy Transactions

Generate transactions covering at least the previous six complete calendar months and the current month.

The dataset must include:

* At least two salary transactions per month
* Monthly rent
* Monthly utility expenses
* Monthly internet expense
* Weekly or semi-regular grocery expenses
* Dining and coffee transactions
* Transportation expenses
* Household and personal expenses
* At least one bonus or freelance income transaction
* At least one reimbursement
* At least one unusually large expense
* At least one month where expenses are higher than the household average
* Transactions assigned to both household members

The dataset should contain enough records to make all prototype charts and filters meaningful.

Target approximately 80 to 120 transactions.

## Transaction Rules

All generated transactions must follow the current Celia domain rules:

* Amounts are stored as positive integer minor units.
* Income or expense direction is represented by the transaction type.
* Dates use ISO `yyyy-mm-dd`.
* Every transaction references an existing member.
* Every transaction references an existing category.
* Currency remains fixed to PHP.
* Transaction IDs are unique.
* Generated records use deterministic values.
* Re-running generation produces the same logical dataset.

## Recurring Data

Mark suitable transactions as recurring, including:

* Salary
* Rent
* Electricity
* Water
* Internet
* Selected subscriptions

This task only sets the recurring flag on generated transactions.

It must not implement a recurring-transaction scheduler or generate future records automatically.

## Data Generation

Create the dummy dataset through a dedicated module, such as:

```text
src/data/dummy-data/
```

The generator should return domain entities that can be inserted through the existing repositories.

Example responsibilities:

* Generate deterministic IDs
* Calculate dates relative to a fixed reference date
* Generate members
* Generate categories
* Generate bucket color overrides
* Generate transactions
* Insert the complete dataset

Avoid placing one large unstructured array directly inside a page or component.

## Reference Date

The generator must accept a reference date.

Transaction dates should be derived from that date so tests remain deterministic.

For example:

```ts
createDummyDataset({
  referenceDate: "2026-07-01",
});
```

Production or development UI may supply the current date, but automated tests must use a fixed date.

## Population Behavior

Provide an explicit development-only action to populate the database.

Acceptable implementations include:

* A button shown only in development mode
* A development tools section in Settings
* A dedicated local development route
* A command or script that uses the same repositories

The action must not run automatically during normal application startup.

## Existing Data Handling

Before inserting dummy data, the user must be warned that existing local records will be replaced.

The population action must:

1. Request confirmation.
2. Clear existing Celia records.
3. Insert the complete dummy dataset.
4. Report success or failure.
5. Leave the database in a consistent state if insertion fails.

The operation should behave atomically where supported by the persistence implementation.

## Acceptance Criteria

* [ ] A reusable dummy-data generator exists.
* [ ] The generator accepts a reference date.
* [ ] The generated dataset is deterministic.
* [ ] Two household members are generated.
* [ ] Income and expense bucket groups are generated.
* [ ] All required subcategories are generated.
* [ ] Expense bucket color overrides are generated.
* [ ] Approximately 80 to 120 transactions are generated.
* [ ] Transactions cover the current month and at least six previous complete months.
* [ ] Both members have income and expense transactions.
* [ ] Recurring and non-recurring transactions are included.
* [ ] Transaction amounts use positive integer minor units.
* [ ] All transaction references point to existing members and categories.
* [ ] A development-only population action is available.
* [ ] Dummy data is not inserted automatically on application startup.
* [ ] The user is warned before existing records are replaced.
* [ ] Existing records are cleared before the dummy dataset is inserted.
* [ ] Successful population persists after page reload.
* [ ] Re-running the action produces the same logical dataset without duplicate records.
* [ ] The application remains in a consistent state if population fails.
* [ ] Tests cover deterministic generation.
* [ ] Tests cover entity references.
* [ ] Tests cover database replacement behavior.
* [ ] Tests verify the generated transaction date range.
* [ ] Tests verify that both members and multiple buckets are represented.
* [ ] `npm run lint` passes.
* [ ] `npm run format:check` passes.
* [ ] `npm run typecheck` passes.
* [ ] `npm run test` passes.
* [ ] `npm run build` passes.

## Dependencies

* CELIA-010
* Local persistence and repository tasks must already be complete.

This task may be implemented before the Transactions and Dashboard epics are complete, but its data will primarily be consumed by those features.

## Out of Scope

* Production onboarding data
* Automatic seeding on startup
* CSV import or export
* Excel migration
* Randomized data on every run
* Data anonymization
* Cloud synchronization
* Authentication
* Forecasting
* Budget targets
* Recurring-transaction scheduling
* Future transaction generation
* Editing the generated dataset outside existing Celia features

## Implementation Notes

Prefer deterministic handcrafted patterns over a random-data library.

The purpose of this dataset is repeatable testing and demonstration, not simulation. A deterministic dataset makes screenshots, automated tests, dashboard values, and defect reproduction consistent across runs.

The generator should remain independent of the UI so it can later be reused by:

* Automated tests
* Storybook or component previews
* Local demonstrations
* Screenshot generation
* End-to-end test setup

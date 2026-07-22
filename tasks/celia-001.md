# CELIA-001 - Align Core Domain Model

## Epic
Core Data Foundation

## Goal

Replace the preliminary domain model with the entities defined by the approved prototype.

## User Story

As a developer,
I want the application's core domain model to match the product design
so that future features are built on a consistent foundation.

## Scope

Implement or update the following domain entities:

- Member
- Category
- CategoryType
- Transaction

Domain rules:

- Transaction amounts are stored as positive integer minor units.
- Income/Expense is represented by Transaction.type.
- Dates use ISO-8601 (`yyyy-mm-dd`).
- Transactions reference Members and Categories by ID.
- Categories belong to a Bucket Group.
- Currency is fixed to PHP for this pilot.

Remove obsolete fields that no longer fit the design.

## Acceptance Criteria

- [ ] Member entity exists
- [ ] Category entity exists
- [ ] CategoryType exists
- [ ] Transaction entity matches prototype
- [ ] Positive minor-unit amounts are enforced
- [ ] Income/Expense represented via Transaction.type
- [ ] Unit tests cover income and expense examples
- [ ] Existing verification pipeline passes

## Dependencies

None

## Out of Scope

- Database
- UI
- CRUD
- Forecasting
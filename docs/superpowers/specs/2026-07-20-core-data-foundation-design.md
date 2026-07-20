# Core Data Foundation Design

## Purpose

Establish a small, framework-independent TypeScript domain model for Celia's household budget data. The model matches the approved prototype and is deliberately limited to entities and validation; persistence, UI, CRUD services, and forecasting remain out of scope.

## Domain API

The `src/domain` module will export immutable entities and creation functions:

- `CategoryType`: the union `'income' | 'expense'` and a type guard.
- `Member`: `{ id, name, color }`.
- `Category`: `{ id, type, group, name }`, where `group` is the bucket group and `name` is the sub-category.
- `Transaction`: `{ id, date, memberId, categoryId, type, amount, description?, recurring, currency }`.

Entity IDs are opaque strings. A transaction stores `memberId` and `categoryId`; it does not embed referenced entities or validate their existence because no repository exists in this scope.

## Invariants

- `Transaction.type` is the only income/expense indicator. Amounts are never signed.
- `Transaction.amount` is an integer number of PHP minor units (centavos), strictly greater than zero and within JavaScript's safe-integer range.
- `Transaction.date` is a real calendar date in ISO-8601 date-only form: `yyyy-mm-dd`.
- `Transaction.currency` is always the literal `'PHP'`; callers do not supply another currency.
- Categories are assigned to a bucket group through their non-empty `group` field.

Creation functions reject invalid input with explicit validation errors. They do not coerce invalid data silently.

## Testing

Vitest will cover valid income and expense transaction creation, including their member/category ID links and PHP minor-unit amounts. It will also cover invalid zero, negative, fractional, non-finite, and unsafe amounts, invalid ISO dates, fixed currency, and category type/group behavior.

## Exclusions

No database, UI, CRUD, recurring-rule scheduling, currency conversion, or reporting/forecasting logic is included.

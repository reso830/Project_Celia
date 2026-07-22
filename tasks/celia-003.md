# CELIA-003 - Repository Contracts

## Epic

Core Data Foundation

## Goal

Provide persistence abstractions independent of IndexedDB.

## User Story

As a developer,
I want repository interfaces
so that the UI is isolated from storage implementation.

## Scope

Create repositories for:

- Members
- Categories
- Transactions
- Bucket Colors

Implement IndexedDB adapters.

## Acceptance Criteria

- [ ] Repository interfaces exist
- [ ] IndexedDB adapters implemented
- [ ] CRUD operations supported
- [ ] Tests added
- [ ] Verification pipeline passes

## Dependencies

- CELIA-001
- CELIA-002

## Out of Scope

- UI
- Dashboard
- Forms
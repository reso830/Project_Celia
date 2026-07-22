# CELIA-002 - Local Persistence Schema

## Epic

Core Data Foundation

## Goal

Create the local persistence layer for Celia.

## User Story

As a developer,
I want a versioned local database
so that application data survives browser refreshes.

## Scope

Create IndexedDB stores for:

- Members
- Categories
- Transactions
- Bucket Color Overrides

Persist only the schema.

Do not build UI.

## Acceptance Criteria

- [ ] IndexedDB initializes successfully
- [ ] Stores created
- [ ] Versioned schema exists
- [ ] Empty database loads correctly
- [ ] Data survives refresh
- [ ] Tests added
- [ ] Verification pipeline passes

## Dependencies

- CELIA-001

## Out of Scope

- Import/Export
- Sync
- Authentication
- Encryption
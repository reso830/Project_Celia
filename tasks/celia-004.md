# CELIA-004 - Application Data Provider

## Epic

Core Data Foundation

## Goal

Expose repositories to the application.

## User Story

As a developer,
I want a centralized data provider
so that application state is initialized consistently.

## Scope

Create application-level initialization.

Expose:

- Loading
- Ready
- Error

Connect repositories.

Do not create sample data.

## Acceptance Criteria

- [ ] Provider initializes correctly
- [ ] Empty installation supported
- [ ] Persisted data loads correctly
- [ ] Error state handled
- [ ] Verification pipeline passes

## Dependencies

- CELIA-003

## Out of Scope

- Dashboard
- Transaction entry
- Settings UI
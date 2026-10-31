**Gate result**: PASS (reviewed 2026-09-26)

# Plan Review Gate: F01 — Core Tracking

Verify against `plan.md` and its supporting artifacts **before any code is written**. Every
item must be checkable from the documents alone.

## Spec ↔ plan alignment

- [x] Every spec user story (US1–US7) maps to at least one plan phase
- [x] Every spec Clarification answer is reflected:
  - empty first run
  - member archive and restore
  - empty financial panels
  - always-combine merge
  - uniqueness scopes
  - read-only archived categories
  - free-form hex
  - v2 replaced with fresh storage
  - SQLite server-side
  - Dashboard landing
- [x] No plan phase introduces anything listed under the spec's Non-goals: entries,
  calculations, buckets, models, model-impact dialog sections, "All history / From Sep",
  hard deletes, auth, hosted persistence
- [x] Wireframe elements intentionally dropped are named in the plan or quickstart

## Architecture

- [x] Layer responsibilities (domain / db / store / service / read / API / components) are
  defined, and dependency direction is one-way
- [x] Reads avoid build-time prerendering (`await connection()`) and the risk is recorded
- [x] Mutation flow defines both success (`router.refresh()`) and failure (inline error, UI
  unchanged) paths
- [x] No abstraction with a single implementation is introduced (no repository interface or
  runtime factory)
- [x] Loopback binding and git-ignored DB path are specified

## Data model

- [x] Every persisted entity from the brief is covered: household, members, umbrellas,
  categories, items, colours, archived state
- [x] Uniqueness indexes match the clarified scopes: archived rows included, merged rows
  excluded
- [x] Savings cannot hold categories (CHECK constraint)
- [x] Merge algorithm is a single transaction and defines both the combine path and the
  move path
- [x] No operation deletes a row; archived and merged rows remain resolvable
- [x] Extension points for F02, F03 and Forecaster are stated without being implemented
- [x] Migration strategy supports later schema changes without DB resets

## Contracts

- [x] Every UI mutation in the spec has exactly one endpoint
- [x] Each endpoint lists its success status and every applicable error code
- [x] Error codes are defined once, with status and user-facing message semantics
- [x] State rules in the contract match data-model.md (archived and merged restrictions,
  umbrella match, same-category)

## Test strategy

- [x] High-risk rules have automated tests planned at the service level: uniqueness, archived
  read-only, move rules, merge combine, merge atomicity, restore, persistence round-trip
- [x] Migrations have a fresh-DB and a reopen test planned
- [x] Component tests cover the key workflows and failure paths, not implementation details
- [x] quickstart.md has one smoke block per user story, matching each Independent Test
- [x] A visual pass against the hi-fi at 1100, 1280 and 1440px is planned

## Constitution compliance

- [x] Constitution Check table covers every principle, with no unjustified violation
- [x] Validation rules are centralised in `src/domain` and reused by client and server
- [x] Each new dependency has a written justification and a rejected alternative
- [x] Removed dependency (`fake-indexeddb`) and deleted v2 areas are listed explicitly
- [x] Design tokens, fonts, no-shadow and contrast requirements are captured

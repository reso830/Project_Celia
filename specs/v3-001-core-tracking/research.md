# Research: F01 — Core Tracking

**Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)

Each decision records what was chosen, why, and what was rejected. Product questions were
settled with the user (see spec Clarifications); this file covers technical choices only.

## R1. SQLite driver

**Decision**: `better-sqlite3` (runtime dependency), with `@types/better-sqlite3` (dev).

**Rationale**:

- Mature, actively maintained, synchronous API. Simple transactions are a good fit for a
  single-household app.
- Next.js 16 lists `better-sqlite3` in its default `serverExternalPackages`, so no bundler
  configuration is needed.
- Prebuilt binaries exist for Node 22 (CI) and Node 24 (local, Windows).

**Alternatives rejected**:

- `node:sqlite` (built in, zero dependency). It still emits `ExperimentalWarning` on Node
  24.14 and its API may change. The constitution prefers platform capabilities (XVII.1), but
  maturity (XVII.3) wins for the store that holds financial data. Revisit when it is stable.
- ORM or query builder (Drizzle, Prisma, Kysely). Adds a dependency and a second schema
  language for about 5 tables (VII).
- In-browser SQLite (WASM + OPFS). Rejected by the user in favour of a server-side file.

## R2. Schema migrations

**Decision**: Hand-written, ordered SQL migrations in code. Track them with SQLite
`PRAGMA user_version`, and run each migration inside a transaction when the database is
first opened.

**Rationale**: Satisfies constitution IX (schema evolution without database resets) with no
tooling. Later features append migration 2, 3, … .

**Alternatives rejected**: A migration framework (unneeded for one local file); `CREATE
TABLE IF NOT EXISTS` without versioning (cannot evolve columns safely).

## R3. Reads and writes between UI and database

**Decision**:

- **Reads**: route pages are Server Components. They call read functions in `src/server`
  directly, after `await connection()` so the page is never prerendered at build time.
- **Writes**: client components call JSON Route Handlers under `/api`. On success they call
  `router.refresh()` so the server re-renders with fresh data.

**Rationale**:

- Server Components give the first render real data with no loading state.
- Route handlers give an explicit HTTP contract ([contracts/api.md](contracts/api.md)),
  map errors to status codes, and are directly testable with `Request` objects.
- `router.refresh()` means the UI never keeps a second copy of the data (VI).

**Alternatives rejected**:

- Server Actions. Viable, but the error contract is less explicit and harder to test in
  isolation.
- A client data provider holding all state (the v2 pattern). It duplicates the source of
  truth.
- GET endpoints for reads. No current consumer (VII).

## R4. Layering without speculative abstraction

**Decision**:

- `src/domain`: pure types and validation.
- `src/server/db`: connection and migrations.
- `src/server/*-store.ts`: concrete SQLite functions.
- `src/server/*-service.ts`: use cases, rules and transactions.
- `src/app/api`: HTTP adapters.

There is no repository interface or `createRepositories(config)` factory.

**Rationale**: Hosted persistence is out of scope, so an interface would have one
implementation (VII, "generic abstractions with only one implementation"). Keeping SQL in
store modules still isolates storage from domain rules (VIII, IX).

## R5. Identity, names and uniqueness

**Decision**:

- IDs are `crypto.randomUUID()` text.
- Every named entity stores `name` (trimmed display text) and `name_key` (trimmed,
  lower-cased with `toLocaleLowerCase('en-US')`).
- Uniqueness is enforced twice: by the service, which returns a friendly error, and by a
  unique index, which is the backstop.
- Uniqueness scopes include archived rows, so restoring can never collide.
- Merged rows are excluded from the unique indexes, so a merged-away name can be reused.

**Rationale**: The same `name_key` rule defines the merge "same name" match (spec
Clarifications).

## R6. Archive, merge, retention

**Decision**:

- Archive sets `archived_at`; restore clears it.
- Merge sets the source category's `merged_into_category_id` and moves its items.
- A combined item sets `merged_into_item_id` and keeps its row.
- No row is ever deleted.

**Rationale**:

- History stays resolvable: future entries and budgets referencing a merged category or
  item can follow the pointer (V).
- Combined items keep their rows because F02 entries that are not yet re-pointed must
  still resolve. F02 must re-point `entries.item_id` in the same merge transaction (see
  data-model.md, "Extension points").

## R7. Category colours

**Decision**:

- Colours are stored as lowercase `#rrggbb`.
- The picker is a popover with the native `<input type="color">` and a hex text field,
  both validated by one domain function.
- A new category's default colour is the next colour in the handoff identity list (Rent
  `#7d8ba8`, Groceries `#7f9b6e`, Utilities `#c2a24a`, Transport `#6f9aa5`, Childcare
  `#a98bb0`, Dining out `#a5714f`, Health `#c98f9b`, Salary `#5f8a7d`, Freelance
  `#8a8f6e`). The index is the count of non-merged categories, modulo 9.

**Rationale**: Free-form hex per the user. A native colour input is acceptable: the
handoff's warning about native popups applies to `<select>` and date inputs in the entry
modal.

## R8. Design tokens, fonts, icons

**Decision**:

- **Tokens**: handoff tokens become CSS custom properties exposed through Tailwind v4
  `@theme` in `globals.css`.
- **Fonts**: Sora and JetBrains Mono via `next/font/google`.
- **Icons**: the handoff's Unicode glyphs are kept, behind one `NavIcon` map.

**Rationale**: The icon set has no existing codebase library to map to. One map makes a
later swap a one-file change, and avoids adding an icon dependency for seven glyphs (XVII).

## R9. Dialogs and accessibility

**Decision**: Native `<dialog>` with `showModal()` for Move, Merge, Archive, Remove member
and Restore. In-place rename uses an inline input: Enter saves, Escape cancels.

**Rationale**: The native dialog provides focus trapping, Escape to close, and `inert`
background without a dependency (XIII).

## R10. Local-only exposure

**Decision**:

- Bind `next dev` and `next start` to `127.0.0.1` (`-H 127.0.0.1`).
- The database path comes from `CELIA_DB_PATH`, defaulting to `./data/celia.db`.
- The `data/` directory is git-ignored.

**Rationale**: The API has no authentication (non-goal). Binding to loopback keeps
financial data off the LAN (XVIII). Ignoring `data/` prevents committing personal data.

**Consequence**: Celia cannot run on serverless hosting with this persistence. Deployment
is out of scope.

## R11. Server-only module boundary

**Decision**: Install `server-only` as a runtime marker and import it from database and store
modules. Vitest aliases the package to its shipped `empty.js` entry so node tests preserve the
same server-only module graph without triggering the client-component guard.

**Rationale**: The package is the small, Next.js-recommended way to prevent a client component
from importing local SQLite code. It was added with explicit user approval after T024's resolver
check showed the marker was not already available. The alias is test-only compatibility, not a
second implementation of the boundary.

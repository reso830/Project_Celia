# Research: F02 — Entries

**Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

This document records the architectural and technical decisions for F02: Entries, evaluating options, documenting trade-offs, and detailing chosen approaches.

---

## R1. Monetary Representation & Exact Arithmetic

**Decision**: Store amounts as positive integers representing minor currency units (centavos: `1 PHP = 100 centavos`) in SQLite (`amount INTEGER NOT NULL CHECK (amount > 0)`) and in domain models. Formatting to pesos (with `₱` symbol, comma grouping, and at most two decimal places) occurs strictly at the presentation layer.

**Rationale**:
- Satisfies Constitution Principle X (Financial Precision): money uses an exact integer representation, preventing binary floating-point rounding errors (`0.1 + 0.2 === 0.30000000000000004`).
- Centavos as integers allow deterministic, exact arithmetic (`+`, `-`) using standard integer operations.
- Max safe integer in JavaScript (`Number.MAX_SAFE_INTEGER` = 9,007,199,254,740,991) allows representing up to ~90 trillion centavos (900 billion pesos), far exceeding household financial scale. SQLite integer types natively support 64-bit signed integers.
- An upper bound of ₱999,999,999.99 (99,999,999,999 centavos) is enforced during input parsing to avoid absurd values.

**Alternatives rejected**:
- Floating-point `REAL` in SQLite and raw `number` pesos in domain. Rejected due to rounding errors and violation of Constitution Principle X.
- `decimal.js` or `big.js` dependency. Rejected per Constitution Principle XVII (Dependencies) and VII (Proven Need). Standard integer centavos require no third-party libraries for addition, subtraction, or formatting.
- `TEXT` decimal strings in SQLite. Adds string parsing overhead in SQL queries without benefits over 64-bit integers.

---

## R2. Schema Evolution & Migration 2

**Decision**: Add migration 2 in `src/server/db/migrations.ts` executed within the existing `PRAGMA user_version` mechanism. Migration 2 creates the `entries` table and required indexes without altering existing F01 tables or losing any existing user data.

**Table Structure**:
```sql
CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id),
  owner_member_id TEXT REFERENCES members(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  date TEXT NOT NULL CHECK (length(date) = 10 AND date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX entries_date_idx ON entries (date);
CREATE INDEX entries_item_id_idx ON entries (item_id);
CREATE INDEX entries_owner_member_id_idx ON entries (owner_member_id);
```

**Rationale**:
- Follows the migration pattern established in F01 (`runMigrations`).
- Preserves referential integrity via foreign keys (`PRAGMA foreign_keys = ON`).
- An entry links to an item (`item_id`), from which the parent category and umbrella are derived.
- `owner_member_id` is nullable: `NULL` represents Household ownership; non-null UUID represents an individual member.
- ISO calendar date `YYYY-MM-DD` (10 characters) avoids time-zone shifts and enables efficient date filtering and sorting (`date >= '2026-09-01' AND date <= '2026-09-30'`).

**Alternatives rejected**:
- Adding a `household_id` column: Rejected as redundant because Celia supports exactly one household row (`id = 'household'`).
- Timestamps with time-of-day/time zones for transaction date: Rejected per spec Clarifications ("A calendar date, with no time of day or time zone. Determines the entry's month").

---

## R3. Deriving vs. Storing Entry Umbrella / Type & Edit Behavior

**Decision**: Derive the entry's financial type (`income` vs. `expense`) by joining through `items` to `categories.umbrella_id`. Do not store a redundant `type` column in `entries`. When editing an entry via `PATCH /api/entries/:id`, changing the item (`itemId`) automatically determines the entry's type from the new item's category umbrella. There is no `umbrella_mismatch` on PATCH.

**Rationale**:
- Enforces Constitution Principle VI (Single Source of Truth). An entry attaches to an `item`. In F01, an item belongs to a category, and a category belongs to an umbrella (`income` or `expense`).
- On `POST /api/entries`, `type` is passed to ensure the requested category and item match the user's intent.
- On `PATCH /api/entries/:id`, the entry's type follows `itemId`. If the user moves an entry from an Expense item to an Income item (or vice versa), the entry's type becomes that of the new item's category without error.
- If `type` were stored in `entries`, it would introduce denormalized state that could drift from `item -> category -> umbrella`.
- For query convenience, store read queries use a `JOIN` (`entries JOIN items ON entries.item_id = items.id JOIN categories ON items.category_id = categories.id`) to project `umbrella_id` as the entry's `type`.

**Alternatives rejected**:
- Storing `umbrella_id` directly on `entries`. Rejected because it introduces dual sources of truth and redundant storage for an immutable relationship.
- Retaining `umbrella_mismatch` error on `PATCH`. Rejected because it would block users from correcting an entry recorded under the wrong financial type.

---

## R4. Category Merge & Item Move Entry Re-pointing

**Decision**:
1. When moving an item (`moveItem`), no changes to `entries` are needed because entries reference `item_id`, and moving an item changes `items.category_id`. Entries follow the item automatically across history.
2. When merging categories (`mergeCategory`): for combined items (where an item in the source category matches an item in the destination category by `nameKey`), update `entries.item_id` in the same transaction:
   ```sql
   UPDATE entries SET item_id = :intoItemId, updated_at = :now WHERE item_id = :fromItemId;
   ```
3. Re-pointing touches `updated_at` on the affected entries, reflecting the database record modification.
4. Entry count queries are defined in `src/server/entries-store.ts` (`countEntriesByItem`, `countEntriesByCategory`) and consumed by `getCategoriesView()` to supply real counts to `MoveItemDialog` and `MergeCategoryDialog`.

**Rationale**:
- Fulfills F01's planned extension point documented in `data-model.md` and spec User Story 7.
- Re-pointing entries in the merge transaction ensures atomicity: if the merge fails or rolls back, entry pointers remain completely intact.
- Single source for count queries avoids duplication across store modules.

---

## R5. UI Architecture, Server Component Reads, & Filtering

**Decision**:
- `/entries/page.tsx` is a Server Component that reads `searchParams: Promise<{ month?: string }>`.
- It invokes `getEntriesView(monthKey)` in `src/server/entries-read.ts`, passing the month (defaulting to the current calendar month `YYYY-MM`).
- `getEntriesView` queries entries for the requested month, along with active categories (including categories with zero items) and active members. It also returns archived categories and members referenced by current-month entries so their historical swatches and names display accurately.
- Dedicated `loading.tsx` and `error.tsx` handle loading skeletons and load-failure boundaries per spec US2 AC6.
- The client component `EntriesScreen` manages in-month search, filters (type, category, owner), and sorting (date, amount, with deterministic tie-breaking on `created_at` then `id`).
- Switching months via `MonthPicker` updates the URL query string (`/entries?month=YYYY-MM`), loading the selected month from SQLite.
- Summary chips are computed synchronously on the client from the active filtered set via pure domain helpers: `calculateTotals(filteredEntries)` and `calculateMemberSummary(filteredEntries, selectedMemberId)`.

**Rationale**:
- Single calendar month reporting period is an explicit specification constraint.
- Server Component fetches only the active month's entries, ensuring fast initial page render and zero layout shift.
- Within the month, filtering by type, category, owner, and search term is instant (0ms latency, no network round-trip).
- Preserves categories with zero items so the modal can explain why an item cannot be picked.
- Computing summary chips via pure functions fulfills Constitution Principle IV (Domain Integrity) and Principle VIII (Clear Boundaries).

---

## R6. Add / Edit Entry Modal Interaction & Keyboard Behavior

**Decision**:
- Conforms to the hi-fi prototype (`Money Tracker Hi-Fi.dc.html`, `HF#L550–L603`) and design handoff specifications:
  - Custom popovers for Date (`HF#L563–L571`), Category (`HF#L574–L580`), and Item (`HF#L581–L588`); no native `<select>` or `<input type="date">`.
  - Single open popover rule: opening one popover closes any other open popover.
  - Keyboard management:
    - When a popover is open, pressing **Escape** closes *only the popover* and keeps the modal open.
    - When no popover is open, pressing **Escape** closes the modal.
    - Date calendar popover supports Arrow key navigation across days and Enter to select.
    - Category and Item popovers support Up/Down arrow navigation and Enter to select.
  - Monday-first calendar grid with month navigation controls.
  - Category popover lists active categories for the selected type. Item popover lists active items for the selected category.
  - Switching type resets category and item to valid defaults for the new type.
  - Switching category resets item to the first item in that category.
  - Owner segmented control: Household (default) + each active member (`HF#L589–L593`).
  - Validation styling: When amount is invalid, the AMOUNT input shows a red border (`#b0533c`) on `#fdf6f3`, an inline message displays directly below the field with the specific error from `parseAndValidateAmount`, and Save buttons are disabled with muted styling (`#5c6467` on `#f4f5f5` with `#d5d8d8` border).
  - "Save & add another" persists the record, preserves selections (type, date, category, item, owner), clears amount and note, and leaves the modal open.
  - Keyboard submission: Pressing Enter from single-line inputs (such as the AMOUNT field) triggers Save (or Save & add another if focused), supporting fast, repeated entry. The multiline NOTE textarea preserves Enter for newlines.
  - Edit mode: title is "Edit entry", prefilled with current values, hides "Save & add another", and retains archived categories/members if already assigned. If switched away to an active entity, the archived one cannot be reselected.
- Omit the budget preview strip ("Groceries after save: X / Y") per spec Clarifications (budgets arrive in F03).

**Rationale**:
- Faithful to prototype interaction intent per Constitution Principle III.
- Custom popovers prevent native control styling glitches and positioning errors under browser zoom.

---

## R7. Deterministic Demo Seed & Guarded Clear Tooling

**Decision**:
- Move all seeding and clearing logic into an importable server module: `src/server/demo.ts`.
- Store the seed JSON in `scripts/seed.json` (tracked in git; `data/` is ignored by `.gitignore`).
- Add `tsx` as a `devDependency` to run the scripts via `package.json`:
  - `"seed": "tsx --conditions react-server scripts/seed.ts"`
  - `"clear": "tsx --conditions react-server scripts/clear.ts"`
- `scripts/seed.ts` and `scripts/clear.ts` are thin CLI wrappers that open the database using shared `getDatabase()` (which honors `process.env.CELIA_DB_PATH` and falls back to `./data/celia.db`) and delegate to `src/server/demo.ts`.
- `tests/server/seed-clear.test.ts` imports `src/server/demo.ts` directly, avoiding CLI subprocess overhead during testing.
- `seedDemoData(db, options?: { seedJson?: SeedData; currentDate?: string })`:
  - Reads `scripts/seed.json` (or uses provided `seedJson`).
  - Implements the exact PRNG algorithm from `HF#L680–L706` (linear congruential generator with seed `987654321`).
  - Generates 12 calendar months ending at `currentDate` (defaulting to today's date). Days are drawn from 2–27, meaning current-month entries can be dated after today (valid per spec Clarifications). Passing a fixed `currentDate` in tests guarantees repeatable, identical output.
  - Ignores budgets, buckets, and models in `seed.json` (deferred to F03).
  - Checks if database has any existing members, categories, or entries. If non-empty, refuses execution with clear instructions to run `npm run clear` first.
  - Seeding twice on the same fixed date produces identical, deterministic data.
  - Runs in a single SQLite transaction.
- `getClearSummary(db)` & `clearAllData(db)`:
  - Guarded: `npm run clear` without `--yes` calls `getClearSummary(db)`, prints a dry-run summary of rows that would be deleted (entries, items, categories, members), and exits with code 0 without modifying the database.
  - With `--yes`, calls `clearAllData(db)` to delete all records in `entries`, `items`, `categories`, and `members`, leaving structural tables (`household`, `umbrellas`) and schema intact (F01 first-run state).
  - Both CLI scripts use `getDatabase()`, respecting `process.env.CELIA_DB_PATH` with a safe fallback to `./data/celia.db` so test environments (e.g. `./data/smoke.db`) are targeted accurately without crashing when unset.

**Rationale**:
- Satisfies Constitution Principle XVII (Dependencies): `tsx` is added strictly as a `devDependency` (0 runtime dependencies). Node's built-in TypeScript support (`--experimental-strip-types`) was evaluated and rejected because it cannot resolve the `@/` path mappings defined in `tsconfig.json`, and plain Node throws on `server-only`. `tsx` transparently resolves `@/*` path aliases and supports `--conditions react-server` so that server modules run cleanly outside Next.js RSC.
- Storing `seed.json` in `scripts/seed.json` ensures it is committed to git and available on fresh clones.
- Encapsulating logic in `src/server/demo.ts` ensures clean testability in Vitest without spawning shell processes.

---

## R8. Persistence Architecture & Boundaries

**Decision**:
- Retain local SQLite persistence (`CELIA_DB_PATH`) using `better-sqlite3`.
- Follow Constitution Principle VII (Architecture Should Follow Proven Need): do not introduce generic repository abstractions, ORMs, or speculative interfaces with a single implementation.
- Store modules (`entries-store.ts`, `categories-store.ts`, `members-store.ts`) isolate raw SQL from use-case services and UI components, maintaining clean architectural boundaries (Constitution Principle VIII).
- Demo mode operates directly on the local SQLite database via `src/server/demo.ts`.

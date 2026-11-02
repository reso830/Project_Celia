# Plan Review Gate: F02 — Entries

**Gate result**: PASS — reviewed 2026-11-02

Verify against `plan.md` and its supporting artifacts (`research.md`, `data-model.md`, `contracts/api.md`, `quickstart.md`, `deviations.md`) **before any code is written**. Every item must be checkable from the planning documents alone.

---

## 1. Spec ↔ Plan Alignment

- [x] Every spec user story (US1–US8) maps to a concrete plan phase and task.
- [x] Every spec Clarification and documented deviation (`deviations.md` D1–D9) is reflected in the plan:
  - [x] Exact integer centavo storage; at most two decimal places.
  - [x] Member filter shows member entries plus Household-owned entries (with Household rows marked).
  - [x] Member view summary chips separate own and shared amounts.
  - [x] Summary chips: Entries N, Expense, Income, Net (replacing prototype Avg / entry per spec).
  - [x] Month picker represents the only reporting period (always one calendar month).
  - [x] Non-entry F01 placeholders remain empty; only Merge and Move dialogs show real entry counts.
  - [x] Modal budget preview strip ("Groceries after save...") omitted.
  - [x] Demo tooling provided via backend CLI scripts (`npm run seed`, `npm run clear`) only, backed by `src/server/demo.ts`.
  - [x] Seeding covers 12 calendar months ending with current month; refuses on non-empty DB; reads `scripts/seed.json`.
  - [x] Clear command deletes data back to first-run state; requires explicit `--yes` confirmation flag.
  - [x] Future-dated entries allowed; appear in their respective calendar month.
  - [x] Archived members/categories excluded from new entry pickers and filter options, but past entries display normally; edit mode preserves existing archived entity.
  - [x] Table row date format specifies `"Sep 19"` (short month + day, no year) per prototype row markup.
  - [x] Search input uses 9px radius matching prototype (HF L211).
  - [x] Delete requires modal confirmation dialog.
- [x] No planned phase introduces anything listed under Non-goals: budgets, savings buckets, forecaster, accounts/ledgers, recurring entries, bank imports, or mobile layout.

---

## 2. Architecture & Layer Boundaries

- [x] Layer responsibilities (`domain`, `server/db`, `server/*-store`, `server/*-service`, `server/*-read`, `api`, `components`) are strictly defined.
- [x] Dependency direction is strictly one-way: Domain has zero I/O or React dependencies; SQL is isolated in store modules; components consume domain types and read functions.
- [x] Server Component reads call `await connection()` to avoid build-time prerendering.
- [x] Route-level `loading.tsx` and `error.tsx` (with `retry` prop) boundaries are planned for `/entries` (US2 AC6) and covered by component tests.
- [x] Mutation responses trigger `router.refresh()` to update Server Components without duplicating state in client caches.
- [x] In-month filtering, search, and summary totals are calculated purely in-memory using pure domain functions.
- [x] Deterministic sorting is implemented as pure `sortEntries` in `src/domain/entry-calculations.ts` and called directly by the table component.
- [x] Entry count queries are centralized in `src/server/entries-store.ts` (`countEntriesByItem`, `countEntriesByCategory`) and consumed by category read helpers without cross-store duplication.
- [x] Demo seed and clear logic is isolated in an importable module (`src/server/demo.ts`) behind thin CLI wrappers (`scripts/seed.ts`, `scripts/clear.ts`) executed via `tsx --conditions react-server` and using shared `getDatabase()` (honoring `CELIA_DB_PATH` with safe fallback to `./data/celia.db`).

---

## 3. Data Model & Persistence

- [x] Table schema for `entries` matches data requirements: UUID primary key, foreign keys to `items` and `members`, check constraint for positive integer centavos, ISO date string check.
- [x] `amount` is stored as integer centavos (`amount INTEGER NOT NULL CHECK (amount > 0)`), preventing floating-point rounding errors.
- [x] `date` is stored as `YYYY-MM-DD` text without time or timezone.
- [x] Indexes defined for `date`, `item_id`, and `owner_member_id`.
- [x] Migration 2 runs within the existing `PRAGMA user_version` mechanism and preserves all existing F01 data.
- [x] Category merge algorithm re-points entries of combined items atomically in the same transaction, bumping `updated_at`.
- [x] Moving an item requires no row changes in `entries` because entries point to `item_id`.
- [x] Table sorting enforces deterministic tie-breaking on `createdAt DESC`, then `id ASC` for identical dates or amounts.
- [x] Seed data file resides at `scripts/seed.json` (outside the gitignored `/data/` directory).

---

## 4. Contract Correctness & Error Mapping

- [x] Endpoints defined for `POST /api/entries`, `PATCH /api/entries/:id`, and `DELETE /api/entries/:id`.
- [x] Request bodies validated before domain service invocation via `readBody`.
- [x] Amount transported as a string to eliminate JSON float parsing issues.
- [x] On `PATCH /api/entries/:id`, changing `itemId` automatically updates entry `type` to match the target item's umbrella (no `umbrella_mismatch` error on PATCH).
- [x] Retaining an existing archived category or member on `PATCH` is allowed; switching to another archived entity returns `409 archived`. (Item archive status derives from parent category; no independent archived items exist).
- [x] Domain errors map deterministically to HTTP status codes (`400 validation`, `404 not_found`, `409 archived`, `409 umbrella_mismatch` [POST only], `500 internal`).
- [x] Server read function `getEntriesView(monthKey)` returns entries, active categories (including zero-item categories), active items, active members, defaults, and packaged `archivedCategories` and `archivedMembers`.
- [x] `getCategoriesView()` contract updated to include real `entryCount` on categories and items.
- [x] Mutation edge cases are handled:
  - [x] Modal preserves entered values and displays inline feedback from `parseAndValidateAmount` on failed save.
  - [x] 404 on stale record triggers list refresh and user notification.
  - [x] Rapid double save is prevented by submit button disabling / in-flight request deduplication.
  - [x] Empty category state or category with zero items provides clear explanation pointing to Categories screen.

---

## 5. Test Strategy & Verification

- [x] Unit tests planned for amount parsing (commas, decimals, negatives, zero, upper limit), date validation, and presentation formatting.
- [x] Unit tests planned for in-memory entry filtering (combining search, type, category, and owner with Household marking), exact summary arithmetic, and deterministic sorting with tie-breaks in `tests/domain/entry-calculations.test.ts`.
- [x] Migration tests verify Migration 2 applies cleanly over an existing F01 database and enforces foreign keys and check constraints.
- [x] Service integration tests verify transactional entry creation, updating, deletion, type change via `itemId` on PATCH, archived retention vs reassignment rejection, and atomic merge re-pointing rollback on error.
- [x] Store integration tests verify CRUD operations, count queries, and deterministic tie-breaking (`ORDER BY date DESC, created_at DESC, id ASC`).
- [x] Demo tooling integration tests verify `src/server/demo.ts` in-memory via Vitest in `tests/server/seed-clear.test.ts`: refusal on non-empty DB, 12-month date shifts, repeat seed determinism with fixed `currentDate`, dry-run clear without flag, and full wipe with `--yes`.
- [x] Component tests cover modal validation states, custom popovers, keyboard interaction rules (Escape closes popover only when open; Escape closes modal when no popover open; arrow keys / Enter inside popovers; Enter submits from Amount field), "Save & add another", delete confirmation, and loading/error states.
- [x] Browser smoke test walks all 8 user stories' Independent Tests, server binding check (127.0.0.1), persistence check, keyboard accessibility pass, contrast/no-shadow pass, and Tier 2 visual reviews against prototype.

---

## 6. Constitution Compliance (Celia's 21 Principles)

- [x] Principle I (Specification-Driven Development): Requirements trace directly from feature brief to spec user stories US1–US8 and plan tasks without speculative scope.
- [x] Principle II (Accelerated SDD): Documentation provides sufficient implementation guidance without excessive decomposition or ceremony.
- [x] Principle III (Prototype as Visual Source of Truth): Recreates `Money Tracker Hi-Fi.dc.html` layout, colors, typography, and custom popovers; deviations recorded in `deviations.md`.
- [x] Principle IV (Domain Integrity): Distinguishes income from expense via item category umbrella; savings buckets untouched; derived summary totals computed from authoritative persisted entries.
- [x] Principle V (Historical Integrity): Historical entries survive item moves and category merges (entries re-pointed atomically with `updated_at` bump). Archived categories and members remain resolvable on historical entries.
- [x] Principle VI (Single Source of Truth): Entry type derived from item category umbrella; summary chips computed from listed entries; UI re-reads from server via `router.refresh()`.
- [x] Principle VII (Architecture Should Follow Proven Need): Concrete store and service modules; no speculative repository abstractions, ORMs, or generic rule engines with a single implementation.
- [x] Principle VIII (Clear Boundaries): Pure domain calculations in `src/domain/`; SQL strictly isolated in `src/server/*-store.ts`; thin route handlers; presentational client components.
- [x] Principle IX (Data Persistence): Schema evolution managed via versioned migration 2; existing F01 data completely preserved; SQLite transactions used for atomic persistence.
- [x] Principle X (Financial Precision): Stored as positive integer centavos in SQLite and domain (`amount INTEGER NOT NULL CHECK (amount > 0)`); exact integer addition/subtraction; formatting (`₱`) only at UI boundary.
- [x] Principle XI (Testing Strategy): Automated tests prioritize monetary correctness, state transitions, migration, and merge re-pointing atomicity.
- [x] Principle XII (Verification Against Specifications): Feature verified against all US1–US8 acceptance criteria, persistence across restarts, and side-by-side prototype comparisons.
- [x] Principle XIII (Accessibility and Responsive Behavior): Custom popovers close on Escape and outside click; full keyboard navigation; high contrast (>= 4.5:1); responsive grid down to 1100px without horizontal scroll.
- [x] Principle XIV (Design System Consistency): Shared CSS variables in `globals.css` used for colors, radii, spacing, and borders. Category swatches vs status indicators kept distinct.
- [x] Principle XV (AI-Assisted Development): Discrete phases with verifiable acceptance criteria, explicit test locations, and objective checks.
- [x] Principle XVI (Recoverability): Incremental commits per phase; atomic database transactions; isolated migration with clean rollback.
- [x] Principle XVII (Dependencies): Zero new runtime dependencies. `tsx` added strictly as a devDependency for running TS scripts with `--conditions react-server` and path alias resolution (since Node's `--experimental-strip-types` cannot resolve `@/` path mappings).
- [x] Principle XVIII (Security and Privacy): Loopback binding (127.0.0.1); gitignored database file; no sensitive logging.
- [x] Principle XIX (Performance): Fast in-memory filtering for monthly transactions; index-backed SQLite queries.
- [x] Principle XX (Definition of Done): All acceptance criteria satisfied, automated tests pass, visual check against prototype completed, no critical defects.
- [x] Principle XXI (Constitutional Priority): Respects governance hierarchy: Constitution → Spec → Brief → Prototype → Plan → Tasks.

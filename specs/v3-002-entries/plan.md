# Implementation Plan: F02 — Entries

**Branch**: `v3-002-entries` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)  
**Input**: `specs/v3-002-entries/spec.md`, `docs/features/v3-002-entries.md`, `handoff/celia_v3_001.zip`

## Summary

F02 builds Celia's core transaction workflow, establishing the authoritative source of actual income and expense activity:

1. **Persistence & Migration 2**: Adds the `entries` table with foreign keys referencing F01 items and members, check constraints for positive integer centavos and ISO dates, and index coverage. Atomic category merge re-points entries of combined items.
2. **Pure Domain Core & Exact Arithmetic**: Implements integer centavo arithmetic (`1 PHP = 100 centavos`), amount string parsing, calendar date validation, in-memory filtering, deterministic sorting (with `id` tie-breaker), and summary totals (Income, Expense, Net, and member own/shared splits).
3. **Backend Service & Route Handlers**: Provides transactional CRUD operations for entries, JSON route handlers under `/api/entries`, and real entry counts in `getCategoriesView` for Move and Merge dialogs.
4. **Hi-Fi Entries Screen & Modal**: Transforms the placeholder `/entries` screen into the hi-fi entries workspace (month picker, search, type/category/owner filters, summary chips, sortable table, loading and error states) and the custom Add/Edit Entry modal with custom popovers (calendar, category, item) and keyboard support.
5. **Deterministic Demo Tooling**: Standalone CLI scripts (`npm run seed`, `npm run clear`) running via `tsx` thin wrappers over `src/server/demo.ts`, reading `scripts/seed.json` (tracked in git) with safety guards.

---

## Technical Context

- **Language/Version**: TypeScript 5 (strict), Node.js 22 (CI) / 24 (local)
- **Primary Dependencies**: Next.js 16.4 App Router, React 19.2, Tailwind CSS 4, `better-sqlite3`, `server-only`. Dev dependencies: `@testing-library/react`, `vitest` 4.
  *New devDependency*: `tsx` (v4) for running TypeScript CLI scripts with `--conditions react-server` and path alias resolution. Zero new production runtime dependencies.
- **Storage**: Local SQLite file at `CELIA_DB_PATH` (default `./data/celia.db`), server-only, WAL mode, `PRAGMA foreign_keys = ON`. Tracked via `PRAGMA user_version` (migration 2).
- **Testing**: Vitest 4. Pure domain, store, service, and route-handler tests run in `node` environment with in-memory or temp SQLite. Component tests use jsdom + React Testing Library. Browser Smoke Test covers User Stories 1–8.
- **Target Platform**: Desktop browsers at 1280–1440px wide; no horizontal scrolling at 1100px or higher. Server binds to `127.0.0.1`.
- **Project Type**: Single Next.js web application.
- **Performance Goals**: Instant client-side filtering, sorting, and totals (<10ms) on monthly datasets. SQLite queries run synchronously in <1ms.
- **Constraints**:
  - No drop shadows, text contrast >= 4.5:1.
  - All styling values derived from design tokens.
  - Fonts: Sora (UI) and JetBrains Mono (figures).
  - Exact centavo arithmetic; no binary floating-point representation for money.
- **Scale/Scope**:
  - 1 functional screen (`/entries`), plus `loading.tsx` and `error.tsx`.
  - 3 mutation endpoints (`POST /api/entries`, `PATCH /api/entries/:id`, `DELETE /api/entries/:id`).
  - 1 new table (`entries`), 3 indexes.
  - 1 demo module (`src/server/demo.ts`), 2 CLI scripts (`scripts/seed.ts`, `scripts/clear.ts`), 1 seed asset (`scripts/seed.json`).

---

## Constitution Check

Checked against `.specify/memory/constitution.md` (Celia v3, 21 principles). *Result: PASS, zero violations.*

| Principle | How the plan complies |
|---|---|
| **I–II. SDD, accelerated** | Traceable directly to spec user stories US1–US8; documentation right-sized to feature needs without ceremony. |
| **III. Prototype as visual truth** | Recreates `Money Tracker Hi-Fi.dc.html` layout, colors, typography, and custom popovers element-for-element. Documented deviations in `deviations.md`. |
| **IV. Domain integrity** | Clear distinction between income and expense via item category umbrella; savings buckets untouched; derived totals computed from authoritative persisted entries. |
| **V. Historical Integrity** | Entries survive item moves and category merges (entries re-pointed atomically). Archived categories, items, and members remain resolvable on historical entries. |
| **VI. Single source of truth** | Entry type derived from item category umbrella; summary chips computed from listed entries; UI re-reads from server via `router.refresh()`. |
| **VII. Proven need** | Concrete store and service modules; no speculative repository abstractions, ORMs, or generic rule engines with a single implementation. |
| **VIII. Clear boundaries** | Pure domain calculations in `src/domain/`; SQL strictly isolated in `src/server/*-store.ts`; thin route handlers; presentational client components. |
| **IX. Data persistence** | Schema evolution managed via versioned migration 2; existing F01 data completely preserved. |
| **X. Financial precision** | Stored as positive integer centavos in SQLite and domain (`amount INTEGER NOT NULL CHECK (amount > 0)`); exact integer addition/subtraction; formatting (`₱`) only at UI boundary. |
| **XI–XII. Testing & verification** | Unit tests for amount parsing, date validation, and summary calculations; store/service tests for CRUD and merge re-pointing; UI tests for modal, loading, error, and filtering; browser smoke test. |
| **XIII. Accessibility** | Custom popovers close on Escape and outside click; full keyboard navigation; high contrast; responsive grid down to 1100px without horizontal scroll. |
| **XIV. Design tokens** | Shared CSS variables in `globals.css` used for colors, radii, spacing, and borders. Square swatches for categories; circles for status indicators. |
| **XV. AI-assisted** | Discrete phases with verifiable acceptance criteria, explicit test locations, and objective checks. |
| **XVI. Recoverability** | Incremental commits per phase; atomic database transactions; isolated migration. |
| **XVII. Dependencies** | Zero new runtime dependencies. `tsx` added as devDependency for running TS scripts with `--conditions react-server` and path alias resolution. |
| **XVIII. Security & privacy** | Loopback binding; git-ignored database; no sensitive logging. |
| **XIX. Performance** | Fast in-memory filtering for monthly transactions; index-backed SQLite queries. |
| **XX. Definition of done** | All acceptance criteria satisfied, automated tests pass, visual check against prototype completed, no critical defects. |
| **XXI. Constitutional priority** | Respects governance hierarchy: Constitution → Spec → Brief → Prototype → Plan → Tasks. |

### Compliance Note (from plan prompt)

- **Required-field impact**: None. The prompt's list (`company`, `job title`, `status`, `last_status_update`, `responsibilities`) originates from an external template and does not apply to Celia's household finance domain. In Celia F02, required entry fields are: `amount` (positive integer centavos), `date` (valid ISO date string `YYYY-MM-DD`), and `itemId` (foreign key to active `items`).
- **Centralized validation rules**:
  - `parseAndValidateAmount` in `src/domain/amount.ts` validates monetary input, bounds, and decimals.
  - `validateEntryDate` in `src/domain/entry.ts` validates calendar date format and day limits.
  - Reused consistently by client modal forms for instant visual feedback and server route handlers/services as strict gates.
- **Justification for new dependencies**:
  - `tsx` (v4) is added to `devDependencies` only (0 runtime dependencies). Node's built-in TypeScript support (`--experimental-strip-types`) was evaluated and rejected because it cannot resolve the `@/` path mappings defined in `tsconfig.json`, and plain Node throws on `server-only`. `tsx` is justified under Constitution Principle XVII (Dependencies): it provides native TypeScript execution for CLI scripts, transparently resolves `tsconfig.json` path mappings (`@/*`), and supports Node's `--conditions react-server` flag so that server modules importing `server-only` run without throwing errors outside Next.js RSC.
- **Persistence runtimes**:
  - Celia v3 uses local SQLite persistence via `better-sqlite3` as established in F01. There is no hosted Supabase runtime in Celia's specification or constitution.
  - Store modules (`entries-store.ts`) cleanly decouple SQL persistence from domain logic. Introducing speculative repository interfaces or `createRepositories(config)` factories with a single implementation is rejected per Constitution Principle VII (Architecture Should Follow Proven Need).
  - Demo mode operates directly on the local SQLite store via `src/server/demo.ts`. CLI scripts use shared `getDatabase()` which honors `process.env.CELIA_DB_PATH` and safely falls back to `./data/celia.db`.
- **Archived Item Definition**:
  - In Celia, items do not have an independent archive status; an item is considered archived if and only if its parent category is archived (`categoryArchived`). No separate archived-item lookup is needed.
- **Deterministic Sorting Location**:
  - `sortEntries` lives in `src/domain/entry-calculations.ts` as a pure function. Sorts by primary `field` (`date` or `amount`) in `direction` (`asc` or `desc`), with deterministic secondary tie-breaking on `createdAt DESC` and final tie-breaking on `id ASC`. The client table component invokes this domain function directly.
- **Route Error Boundary**:
  - `src/app/(shell)/entries/error.tsx` conforms to Next.js App Router accepting `{ error: Error; retry: () => void }` and is verified by automated component tests.

---

## Architecture

```text
Browser Client (127.0.0.1:3000)                  Next.js Server (127.0.0.1)
────────────────────────────────────────────     ──────────────────────────────────────────────────
app/(shell)/entries/page.tsx (RSC) ─────────────► server/entries-read.ts
   │                                                 │ await connection()
   ├► loading.tsx (skeleton fallback)                ├► server/entries-store.ts ──┐
   ├► error.tsx (error boundary)                     ├► server/categories-store.ts ├► SQLite DB
   │                                                 └► server/members-store.ts   │  (better-sqlite3,
   ▼ props (entries, categories, members)                                         │   migration 2)
components/entries/entries-screen.tsx (client)                                    │
   │                                                                              │
   ├── Filter & Sort: domain/entry-calculations.ts                                │
   ├── Summary Chips: domain/entry-calculations.ts                                │
   │                                                                              │
   ├── Add/Edit Modal: components/entries/entry-modal.tsx                         │
   │      │ fetch JSON (POST / PATCH / DELETE)                                    │
   │      ▼                                                                       │
   │   app/api/entries/** (route handlers)                                        │
   │      │ validate body (http.ts)                                               │
   │      ▼                                                                       │
   │   server/entries-service.ts ─────────────────────────────────────────────────┘
   │      │ uses domain validators
   │      ▼
   └── 2xx Response ──► router.refresh() (re-renders RSC with fresh SQLite data)
       4xx Error    ──► inline field error / modal feedback
```

### Layer Responsibilities

- **`src/domain`**:
  - `amount.ts`: `Centavos`, `parseAndValidateAmount`, `formatCentavos`.
  - `entry.ts`: `Entry`, `EntryWithDetails`, `EntryDraft`, `validateEntryDate`.
  - `entry-calculations.ts`: `filterEntries`, `sortEntries`, `calculateTotals`, `calculateMemberSummary`.
  - Pure functions, no I/O, no React dependencies.
- **`src/server/db`**:
  - `migrations.ts`: Migration 2 adding `entries` table and indexes.
  - `database.ts`: Connection singleton and pragma management.
- **`src/server/entries-store.ts`**:
  - Low-level prepared statements: `insertEntry`, `updateEntry`, `deleteEntry`, `findEntryById`, `listEntriesForMonth`, `countEntriesByItem`, `countEntriesByCategory`, `repointEntriesForItem`.
- **`src/server/entries-service.ts`**:
  - Use cases: `createEntry`, `updateEntry`, `deleteEntry`.
  - Validates active entity states, enforces category umbrella match on create, allows type change on edit, executes inside `db.transaction`, throws `DomainError`.
- **`src/server/demo.ts`**:
  - `seedDemoData(db, options)`, `clearAllData(db)`, `getClearSummary(db)`. Importable module called by thin CLI wrappers and Vitest tests.
- **`src/server/entries-read.ts`**:
  - `getEntriesView(monthKey)`: Server-only read helper calling `await connection()`. Returns active categories (including zero-item categories), active members, and referenced archived entities.
- **`src/app/api/entries`**:
  - Thin HTTP adapters parsing JSON bodies, validating fields, and mapping `DomainError` to HTTP status codes.
- **`src/components/entries`**:
  - Client components: `EntriesScreen`, `EntriesHeader`, `TypeFilter`, `SearchInput`, `SummaryChips`, `EntriesTable`, `EntryRow`, `EntryModal`, `DeleteConfirmDialog`, and custom popovers.

---

## Data Flow

### 1. Add Entry Flow
1. User clicks "+ Add entry". `EntryModal` opens in Add mode with default state: Expense, today's date, Household owner, first active expense category and item, empty amount and note.
2. User enters amount `3240.50`, selects category/item/date/owner.
3. Client validates amount via `parseAndValidateAmount`. If invalid, Save button is disabled with warning style and inline message.
4. On submit, client sends `POST /api/entries`.
5. Route handler validates payload structure via `readBody` and calls `createEntry` in `entries-service.ts`.
6. Service validates item and owner are active, checks category umbrella match, inserts row into SQLite, and returns `EntryWithDetails`.
7. Client receives `201 Created`:
   - If "Save": closes modal, displays toast `"₱3,240.50 added to <Category>"`, and triggers `router.refresh()`.
   - If "Save & add another": keeps modal open, preserves type/date/category/item/owner, clears amount and note, displays toast, and triggers `router.refresh()`.

### 2. Edit Entry Flow
1. User clicks ✎ on an entry row. `EntryModal` opens in Edit mode prefilled with entry values. "Save & add another" is hidden.
2. If the entry references an archived category, item, or member, it is displayed as the selected option marked `(archived)`.
3. User modifies fields and clicks Save.
4. Client sends `PATCH /api/entries/:id`.
5. Service validates entry exists, verifies new item/member if modified, updates `entries` row, and updates `updated_at`. If `itemId` changed to a category of another umbrella, `type` updates automatically.
6. Client receives `200 OK`, closes modal, displays toast `"Entry updated"`, and triggers `router.refresh()`. If date was changed to a different month, the entry leaves the current list.

### 3. Delete Entry Flow
1. User clicks ✕ on an entry row.
2. A confirmation dialog opens displaying entry details (date, item, amount) with Cancel and Delete buttons.
3. On cancel, modal closes and no changes occur.
4. On confirm, client sends `DELETE /api/entries/:id`.
5. Service deletes row in SQLite.
6. Client receives `200 OK`, closes dialog, displays toast `"Entry deleted"`, and triggers `router.refresh()`.

### 4. Month Navigation, Search, and Filtering Flow
1. User clicks ◀ or ▶ on `MonthPicker`. Next.js navigates to `/entries?month=YYYY-MM`.
2. Server Component `EntriesPage` runs `getEntriesView('YYYY-MM')` at request time and passes data to `EntriesScreen`.
3. In `EntriesScreen`, user interacts with Type filter (All, Expense, Income), Category filter, Owner filter, or Search input.
4. React state updates trigger `filterEntries()` synchronously.
5. Filtered list updates `SummaryChips` via `calculateTotals()` or `calculateMemberSummary()` instantly without server round-trip.

---

## Phases

Every phase ends with `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build` passing.

### Phase 01: Persistence, Schema Migration 2, & Domain Core
- **Goals**: Implement exact centavo arithmetic, amount parsing, date validation, entry types, calculation helpers with deterministic tie-breaking, and database migration 2.
- **Tasks**:
  - Create `src/domain/amount.ts` (`Centavos`, `parseAndValidateAmount`, `formatCentavos`).
  - Create `src/domain/entry.ts` (`Entry`, `EntryWithDetails`, `EntryDraft`, date validation).
  - Create `src/domain/entry-calculations.ts` (`filterEntries`, `sortEntries`, `calculateTotals`, `calculateMemberSummary`).
  - Update `src/server/db/migrations.ts` to include Migration 2 (`entries` table and indexes).
  - Add unit tests: `tests/domain/amount.test.ts`, `tests/domain/entry.test.ts`, `tests/domain/entry-calculations.test.ts`, and migration tests in `tests/server/migrations.test.ts`.

### Phase 02: Entries Service, Store, & API Route Handlers
- **Goals**: Implement transactional database operations, domain service use cases, atomic merge re-pointing, and HTTP JSON handlers.
- **Tasks**:
  - Create `src/server/entries-store.ts` (SQLite statements for insert, update, delete, get, list by month, re-point, counts).
  - Create `src/server/entries-service.ts` (`createEntry`, `updateEntry`, `deleteEntry`).
  - Create `src/app/api/entries/route.ts` (`POST`).
  - Create `src/app/api/entries/[id]/route.ts` (`PATCH`, `DELETE`).
  - Integrate atomic entry re-pointing into `mergeCategory` in `src/server/categories-service.ts`.
  - Add integration tests: `tests/server/entries-service.test.ts`, `tests/api/entries.test.ts`.

### Phase 03: Category & Item Real Entry Counts
- **Goals**: Expose real entry counts to categories view and wire them into Move and Merge dialogs.
- **Tasks**:
  - Update `src/server/categories-read.ts` to attach `entryCount` to items and categories using `entries-store.ts`.
  - Update `src/components/categories/types.ts` to include `entryCount`.
  - Update `src/components/categories/merge-category-dialog.tsx` to display real entry count instead of `"0 entries"`.
  - Update `src/components/categories/move-item-dialog.tsx` to display real entry count instead of `"0 entries"`.
  - Update category component tests.

### Phase 04: Entries Workspace Layout, Navigation, & States
- **Goals**: Build the hi-fi Entries workspace with header filters, month navigation, loading skeleton, and error boundary.
- **Tasks**:
  - Create `src/server/entries-read.ts` (`getEntriesView`).
  - Update `src/components/shell/month-picker.tsx` to support URL query param sync when navigating months.
  - Create `src/app/(shell)/entries/loading.tsx` and `src/app/(shell)/entries/error.tsx`.
  - Create `src/components/entries/entries-header.tsx` (Owner filter, Category filter, Month picker, Add entry button).
  - Create `src/components/entries/entries-screen.tsx` (Empty states: zero entries month vs filter mismatch).
  - Connect `src/app/(shell)/entries/page.tsx`.
  - Add component tests in `tests/components/entries/entries-screen.test.ts`.

### Phase 05: Search, Filters, & Summary Chips
- **Goals**: Implement search input, type toggle, and summary chips with member own/shared split.
- **Tasks**:
  - Create `src/components/entries/type-filter.tsx` (All, Expense, Income).
  - Create `src/components/entries/search-input.tsx` (radius 9px per HF L211).
  - Create `src/components/entries/summary-chips.tsx` (Entries N, Expense, Income, Net; member own/shared split).
  - Wire in-memory filtering in `EntriesScreen`.
  - Add component tests in `tests/components/entries/summary-chips.test.ts`.

### Phase 06: Entries Table, Sorting, & Delete Confirmation
- **Goals**: Build the sortable entries table and delete confirmation dialog.
- **Tasks**:
  - Create `src/components/entries/entries-table.tsx` (DATE sort newest/oldest, AMOUNT sort largest/smallest, deterministic tie-breakers).
  - Create `src/components/entries/entry-row.tsx` (Date "Sep 19", Item, Category swatch+name with archived indicator, Owner with Household distinction, Amount with +/- prefix).
  - Create `src/components/entries/delete-confirm-dialog.tsx` (native dialog with entry details).
  - Add component tests in `tests/components/entries/entries-table.test.ts`.

### Phase 07: Add / Edit Entry Modal with Custom Popovers
- **Goals**: Implement the hi-fi Add / Edit entry modal with custom popovers, keyboard navigation, and mutation edge case handling.
- **Tasks**:
  - Create custom popover components (`calendar-popover.tsx`, `category-popover.tsx`, `item-popover.tsx`).
  - Create `use-popover-manager.ts` (single open popover, Escape closes popover only).
  - Create `owner-segmented-control.tsx` (Household + active members).
  - Create `src/components/ui/toast.tsx` (2200ms feedback).
  - Create `entry-modal.tsx`:
    - Amount validation styling with inline error message directly beneath field.
    - "Save & add another" behavior.
    - Edit mode prefill and archived entity preservation.
    - Mutation edge cases: modal preserves values on error; rapid double save creates one entry; stale record 404 triggers list refresh; "no categories" and "category has no items" messages appear.
  - Add component tests in `tests/components/entries/entry-modal.test.ts`.

### Phase 08: Deterministic Demo Seed & Guarded Clear Tooling
- **Goals**: Implement importable demo module and thin CLI wrappers with `tsx` runner.
- **Tasks**:
  - Create `scripts/seed.json` copied from handoff.
  - Create `src/server/demo.ts` (`seedDemoData`, `clearAllData`, `getClearSummary`).
  - Create thin CLI wrappers `scripts/seed.ts` and `scripts/clear.ts`.
  - Register `tsx` devDependency and npm scripts in `package.json`.
  - Add tests: `tests/server/seed-clear.test.ts`.

### Phase 09: Release Prep
- **Goals**: Update version, changelog, roadmap, repo map, and documentation.
- **Tasks**:
  - Version bump to 3.1.0 in `package.json` and `package-lock.json`.
  - Update `CHANGELOG.md`, `docs/feature_roadmap.md`, `docs/REPO_MAP.md`, `README.md`.
  - Run docs sanity checks.

### Phase 10: Browser Smoke Test & Visual Review
- **Goals**: End-to-end verification and visual check.
- **Tasks**:
  - Walk quickstart User Stories 1 to 8 Independent Tests.
  - Server restart persistence test.
  - Keyboard navigation pass.
  - Contrast and no-shadow pass.
  - Tier 2 visual comparison at 1100, 1280, 1440px against `Money Tracker Hi-Fi.dc.html`, logging deviations in `deviations.md`.

---

## Validation Approach

| Layer | Environment | What is proven |
|---|---|---|
| **Domain Unit** | `node` | Centavo arithmetic; string parsing of amount (commas, decimals, negatives, zeros, max limit); date validation; in-memory filter combinations; totals and net calculations; member own/shared splits; deterministic sorting tie-breaker. |
| **Migrations** | `node`, temp SQLite | Migration 2 executes over existing F01 database without resetting; idempotency check; foreign keys enforced; check constraints reject `<= 0` amount. |
| **Store & Service** | `node`, `:memory:` | Entry CRUD; active state validation; umbrella compatibility check on create; type change on edit; merge re-pointing atomicity and rollback on failure; item move persistence. |
| **API Handlers** | `node` | JSON body parsing; unknown field rejection; `DomainError` mapping to 400/404/409/500 statuses; 201 vs 200 responses. |
| **Components** | `jsdom` + RTL | Filter dropdowns and type toggle; search input filtering; summary chips update; modal validation styling; custom popover open/close; Save & add another behavior; delete confirmation dialog; loading skeleton; error boundary; mutation edge cases. |
| **Demo Module** | `node`, temp SQLite | `seedDemoData` fails on non-empty database; generates 12 months ending at current month; identical output on repeat run; `clearAllData` wipes data with `--yes`; dry-run report without flag. |
| **Browser Smoke** | Real browser, `CELIA_DB_PATH` | User Stories 1 through 8 Independent Tests walked step-by-step. |
| **Visual Pass** | Real browser (1100–1440px) | Layout matches `Money Tracker Hi-Fi.dc.html`; no horizontal scroll at >=1100px; no drop shadows; design token fidelity; recorded in `deviations.md`. |

---

## Risks and Tradeoffs

| Risk / Tradeoff | Mitigation |
|---|---|
| **Centavo integer rounding & display** | All financial values stored and manipulated as integers. Formatting to pesos occurs only at presentation. Tests verify centavo calculations. |
| **Custom Popover vs Native Select/Date** | Native controls misplace and look inconsistent under zoom. Custom popovers follow the prototype design closely, with robust Escape and outside-click listeners. |
| **Cross-month date edit** | When an entry's date is edited into a different month, it leaves the current month's view. Verified by User Story 3 test and clear user toast. |
| **Merge category re-pointing race condition** | Entry re-pointing runs within the existing `mergeCategory` atomic database transaction. |
| **Accidental database wipe via CLI** | `npm run clear` requires an explicit `--yes` flag; otherwise, it only prints a dry-run summary. |
| **Seed date drift** | Seed script dynamically shifts dates so the final month is always the current calendar month. |

---

## Project Structure

### Documentation (this feature)

```text
specs/v3-002-entries/
├── spec.md                     # Approved specification
├── plan.md                     # Implementation plan (this file)
├── research.md                 # Technical research and decisions
├── data-model.md               # SQLite schema & domain models
├── deviations.md               # Visual and behavioral deviation ledger
├── contracts/
│   └── api.md                  # HTTP API & server-only read contracts
├── quickstart.md               # Smoke testing & verification guide
└── checklists/
    └── plan-review.md          # Pre-implementation review gate
```

### Source Code (target layout)

```text
src/
├── app/
│   ├── (shell)/
│   │   ├── categories/page.tsx # Updated with real entry counts
│   │   └── entries/
│   │       ├── page.tsx        # Functional Entries screen (Server Component)
│   │       ├── loading.tsx     # Skeleton loading state
│   │       └── error.tsx       # Error boundary fallback
│   └── api/
│       └── entries/
│           ├── route.ts        # POST /api/entries
│           └── [id]/
│               └── route.ts    # PATCH, DELETE /api/entries/:id
├── domain/
│   ├── amount.ts               # Centavos, parseAndValidateAmount, formatCentavos
│   ├── entry.ts                # Entry types, validateEntryDate
│   └── entry-calculations.ts   # filterEntries, sortEntries, calculateTotals, calculateMemberSummary
├── server/
│   ├── db/
│   │   └── migrations.ts       # Migration 2
│   ├── demo.ts                 # seedDemoData, clearAllData, getClearSummary
│   ├── categories-service.ts   # Updated with entry re-pointing
│   ├── categories-read.ts      # Updated with entry counts
│   ├── entries-store.ts        # SQLite statements for entries and counts
│   ├── entries-service.ts      # Transactional use cases for entries
│   └── entries-read.ts         # getEntriesView
├── components/
│   ├── categories/             # Merge & Move dialogs updated with real counts
│   ├── shell/
│   │   └── month-picker.tsx    # MonthPicker with navigation support
│   ├── ui/
│   │   └── toast.tsx           # Floating toast notification
│   └── entries/
│       ├── entries-screen.tsx  # Main client workspace
│       ├── entries-header.tsx  # Month picker, filters, + Add entry button
│       ├── type-filter.tsx     # Type segmented control
│       ├── search-input.tsx    # Search input (radius 9px)
│       ├── summary-chips.tsx   # Entries N, Expense, Income, Net (with member split)
│       ├── entries-table.tsx   # Table with sortable DATE/AMOUNT
│       ├── entry-row.tsx       # Entry row with edit/delete actions
│       ├── entry-modal.tsx     # Add/Edit entry modal
│       ├── owner-segmented-control.tsx # Household + active members
│       ├── popovers/
│       │   ├── calendar-popover.tsx
│       │   ├── category-popover.tsx
│       │   ├── item-popover.tsx
│       │   └── use-popover-manager.ts
│       └── delete-confirm-dialog.tsx # Delete confirmation
scripts/
├── seed.ts                     # Thin CLI wrapper for seeding
├── clear.ts                    # Thin CLI wrapper for clearing
└── seed.json                   # Tracked prototype seed data reference
tests/
├── domain/
│   ├── amount.test.ts
│   ├── entry.test.ts
│   └── entry-calculations.test.ts
├── server/
│   ├── entries-store.test.ts
│   ├── entries-service.test.ts
│   ├── seed-clear.test.ts
│   └── migrations.test.ts
├── api/
│   └── entries.test.ts
└── components/
    └── entries/
        ├── entries-screen.test.ts
        ├── summary-chips.test.ts
        ├── entries-table.test.ts
        ├── entry-modal.test.ts
        └── popovers.test.ts
```

---

## Affected Areas

### Files Likely to be Inspected
- `package.json`: verify scripts and dependencies.
- `src/server/db/database.ts`: verify connection singleton and pragma settings.
- `src/server/db/migrations.ts`: review migration 1 structure before adding migration 2.
- `src/server/http.ts`: review body parsing and domain error status mapping.
- `src/domain/names.ts`, `src/domain/umbrella.ts`, `src/domain/color.ts`: check existing domain helpers.
- `handoff/celia_v3_001.zip`: reference prototype HTML, CSS, and seed data.

### Files Likely to be Modified
- `package.json`: add `tsx` to `devDependencies`, add `seed` and `clear` npm scripts.
- `src/server/db/migrations.ts`: add migration 2 for `entries` table and indexes.
- `src/server/categories-service.ts`: integrate atomic entry re-pointing into `mergeCategory`.
- `src/server/categories-read.ts`: include entry counts in category row mapping.
- `src/components/categories/merge-category-dialog.tsx`: replace hard-coded `"0 entries"` with real count.
- `src/components/categories/move-item-dialog.tsx`: replace hard-coded `"0 entries"` with real count.
- `src/components/categories/types.ts`: add `entryCount` to category row data.
- `src/components/shell/month-picker.tsx`: support month change callbacks and query synchronization.
- `src/app/(shell)/entries/page.tsx`: replace placeholder with functional Server Component.
- `README.md`: document Entries feature, CLI tooling, and exact centavo arithmetic.

### Files to be Added
- `specs/v3-002-entries/deviations.md`
- `src/domain/amount.ts`
- `src/domain/entry.ts`
- `src/domain/entry-calculations.ts`
- `src/server/entries-store.ts`
- `src/server/entries-service.ts`
- `src/server/entries-read.ts`
- `src/server/demo.ts`
- `src/app/(shell)/entries/loading.tsx`
- `src/app/(shell)/entries/error.tsx`
- `src/app/api/entries/route.ts`
- `src/app/api/entries/[id]/route.ts`
- `src/components/ui/toast.tsx`
- `src/components/entries/entries-screen.tsx`
- `src/components/entries/entries-header.tsx`
- `src/components/entries/type-filter.tsx`
- `src/components/entries/search-input.tsx`
- `src/components/entries/summary-chips.tsx`
- `src/components/entries/entries-table.tsx`
- `src/components/entries/entry-row.tsx`
- `src/components/entries/entry-modal.tsx`
- `src/components/entries/owner-segmented-control.tsx`
- `src/components/entries/delete-confirm-dialog.tsx`
- `src/components/entries/popovers/calendar-popover.tsx`
- `src/components/entries/popovers/category-popover.tsx`
- `src/components/entries/popovers/item-popover.tsx`
- `src/components/entries/popovers/use-popover-manager.ts`
- `scripts/seed.ts`
- `scripts/clear.ts`
- `scripts/seed.json`
- Tests under `tests/domain/`, `tests/server/`, `tests/api/`, and `tests/components/entries/`.

### Areas Explicitly Out of Scope
- Savings buckets, bucket contributions, or withdrawals (F03).
- Budget models, baseline budgets, or budget rollover (F03).
- Dashboard cards, burn gauge, or recent entries list on Dashboard.
- Filling in F01's other entry-derived placeholders: category spend panel, burn gauge, and Household screen panels (income vs outgoing, keeps, expense per member).
- Budget preview strip in Add/Edit entry modal ("<Category> after save: X / budget").
- Recurring or scheduled entries.
- Bank integration, CSV imports, statement exports.
- Multi-currency or live forex.
- Mobile layouts (<1100px width).
- In-app GUI controls for seeding or clearing data.

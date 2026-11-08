# Tasks: F02 — Entries

**Inputs**: [spec.md](spec.md) · [plan.md](plan.md) · [data-model.md](data-model.md) · [contracts/api.md](contracts/api.md) · [research.md](research.md) · [quickstart.md](quickstart.md) · [deviations.md](deviations.md)

## Conventions

- **Status**: `[x]` done · `[ ]` pending · `[~]` skipped
- **`[P]`**: can run in parallel with other `[P]` tasks in the same phase (different files, no shared edits).
- **`[USn]`**: the spec user story a task serves (`US1`–`US8`).
- **Phase dependencies**: `01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10`.
- **Commands**: `npm run test` (this repo has no `test:run` script) and `npm run lint`.
- **Phase gate**: Every phase ends with `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build` green. Nothing is left broken at a phase boundary.
- **Server tests** start with the docblock `// @vitest-environment node`. The global default is jsdom.
- **Constitution test areas mapped to Celia**:
  - *Status transitions*: editing entries referencing archived categories/members; switching away from archived entities; active-only picker filtering. (Items derive archive status from category; no independent archived items).
  - *Required fields*: amount (> 0, valid centavos, max bounds), date (valid ISO `YYYY-MM-DD`), `itemId` (active item).
  - *URL validation*: not applicable. Date format and amount string validation take its place.
  - *Date handling*: calendar dates (`YYYY-MM-DD`), month string derivation (`YYYY-MM`), future-dated entries, cross-month date edits, ISO timestamps (`created_at`, `updated_at`).

### Design reference aliases

The handoff zip is `handoff/celia_v3_001.zip`, root folder `design_handoff_money_tracker/`:
- **HF**: `reference/Money Tracker Hi-Fi.dc.html` (visual source of truth)
- **WF**: `reference/Money Tracker Wireframes.dc.html` (dialog structures)
- **HR**: the handoff `README.md` ("Screens: 2. Entries", "3. Add / Edit entry modal")

### Visual-fidelity task pattern (applies to every task tagged 🎨)

Tier 1 visual regression harness is omitted per user decision (same as F01): there is no `test:visual` script and no new tooling.

- **One component per task.**
- **Match**: the cited `HF#Lnn–Lnn` or `HR` section is the visual specification. Do not paraphrase its pixels or colors into prose.
- **Breakpoints**: 1100, 1280, and 1440px wide.
- **Translation note**:
  - Lift prototype styles into token-backed Tailwind classes (using tokens defined in `globals.css`).
  - Replicate the DOM element-for-element.
  - Do not restructure.
- **Provenance**: tag each style block in a code comment, either `lifted from prototype CSS` or `recreated manually: <reason>`.
- **Done when**: Tier 2 frozen-state screenshots at all three breakpoints (1100, 1280, 1440px) have been reviewed side by side against the prototype and match. The review is recorded in Phase 10, T085.

---

## Phase Summary

| Phase | Focus | Tasks | User stories |
|---|---|---|---|
| **01** | Domain core, exact arithmetic, and Schema Migration 2 | T001–T010 | US1, US2, US5, US6 |
| **02** | Entries store, service use cases, and API mutation endpoints | T011–T019 | US1, US2, US3, US4, US7 |
| **03** | Real entry counts in categories and Move / Merge dialogs | T020–T024 | US7 |
| **04** | Entries workspace layout, month navigation, loading/error boundaries, and empty states | T025–T033 | US1, US2 |
| **05** | Search, filter combinations, and summary chips with member split | T034–T040 | US5, US6 |
| **06** | Entries table, column sorting, and delete confirmation | T041–T047 | US2, US4, US5 |
| **07** | Add / Edit Entry modal, custom popovers, keyboard flows, and mutation edge cases | T048–T059 | US1, US3, US7 |
| **08** | Deterministic demo seed, guarded clear tooling, and devDependency runner | T060–T065 | US8 |
| **09** | Release Prep | T066–T072 | — |
| **10** | Browser Smoke Test & Visual Review | T073–T085 | US1–US8 |

---

## Phase 01 — Domain Core & Persistence Core

Order: Domain amount and date types → validation rules → pure calculations & sorting → SQLite Migration 2.

- [x] **T001 [P] [US1] Exact centavo monetary domain module**
  - Files: `src/domain/amount.ts`.
  - Expected behavior: define `Centavos` type (`number`). Implement `parseAndValidateAmount(raw: string)` supporting integers, decimals (up to 2 places), commas (`3,240.50`), and rejecting empty, non-numeric, `<= 0`, and values exceeding `MAX_AMOUNT_CENTAVOS` (99,999,999,999 centavos) with specific, descriptive error messages. Implement `formatCentavos(centavos, options)` supporting commas, optional decimals when non-zero or forced, `₱` prefix, and signed `+`/`−` prefixes.
  - Constraints: pure TypeScript, zero external libraries (no `decimal.js`).
  - Validation: `tests/domain/amount.test.ts` (node environment).
- [x] **T002 [P] [US1] Amount domain unit tests**
  - Files: `tests/domain/amount.test.ts` (new).
  - Expected behavior: test `parseAndValidateAmount` with valid values (`"100"`, `"3240.50"`, `"1,000,000"`, `"0.05"`), invalid values (`"0"`, `"0.00"`, `"-5"`, `"abc"`, `"10.999"`, `"9999999999999"`), ensuring distinct descriptive errors, and formatting round-trips.
  - Constraints: covers constitution required area: required fields and bounds.
  - Validate: `npm run test`.
- [x] **T003 [P] [US1] Entry entity types and date validation**
  - Files: `src/domain/entry.ts`.
  - Expected behavior: define `EntryType` (`"income" | "expense"`), `Entry`, `EntryWithDetails`, and `EntryDraft`. Note: items do not have independent archive status; archive status derives from `categoryArchived`. Implement `validateEntryDate(dateStr: string): boolean` verifying `YYYY-MM-DD` syntax, calendar month 1–12, and valid days in month. Allow future dates.
  - Constraints: pure domain, no React or server dependencies.
  - Validation: `tests/domain/entry.test.ts` (node environment).
- [x] **T004 [P] [US1] Date validation and domain entity tests**
  - Files: `tests/domain/entry.test.ts` (new).
  - Expected behavior: test `validateEntryDate` with valid dates (`"2026-09-19"`, `"2028-01-01"`, leap year `"2024-02-29"`), invalid dates (`"2026-02-29"`, `"2026-13-01"`, `"2026-09-31"`, `"not-a-date"`, `""`).
  - Constraints: covers constitution required area: date handling.
  - Validate: `npm run test`.
- [x] **T005 [P] [US2, US5, US6] Reusable in-memory filtering, calculation, and sorting functions**
  - Files: `src/domain/entry-calculations.ts`.
  - Expected behavior:
    - Implement `filterEntries(entries, criteria)` filtering by month (`date.startsWith(monthKey)`), type (`income` | `expense`), category, owner (with Household view showing all, and member view showing member entries + Household-owned entries), and search (case-insensitive substring match on note, item name, or category name).
    - Implement `calculateTotals(entries)` returning exact `incomeCentavos`, `expenseCentavos`, and signed `netCentavos`.
    - Implement `calculateMemberSummary(entries, memberId)` returning total income/expense/net, own income/expense/net, and shared (Household) income/expense/net.
    - Implement `sortEntries(entries, field, direction)` sorting by `field` (`"date"` | `"amount"`) and `direction` (`"asc"` | `"desc"`), with secondary tie-break on `createdAt DESC` and final tie-break on `id ASC`.
  - Constraints: deterministic integer arithmetic, zero float rounding, pure domain functions.
  - Validation: `tests/domain/entry-calculations.test.ts`.
- [x] **T006 [P] [US2, US5, US6] Entry calculations & sorting unit tests**
  - Files: `tests/domain/entry-calculations.test.ts` (new).
  - Expected behavior: test filtering permutations, multi-filter combinations, case-insensitive search, member + Household inclusion, exact centavo arithmetic without rounding errors, and deterministic sorting (`date` and `amount` with `createdAt DESC` then `id ASC` tie-breakers).
  - Validate: `npm run test`.
- [x] **T007 Domain index barrel export**
  - Files: `src/domain/index.ts`.
  - Expected behavior: re-export `amount.ts`, `entry.ts`, and `entry-calculations.ts`.
  - Validate: `npm run typecheck`.
- [x] **T008 [US2] Database Schema Migration 2**
  - Files: `src/server/db/migrations.ts`.
  - Expected behavior: add `migrationTwo` to `migrations` array:
    - `CREATE TABLE entries` with `id TEXT PRIMARY KEY`, `item_id TEXT NOT NULL REFERENCES items(id)`, `owner_member_id TEXT REFERENCES members(id)`, `amount INTEGER NOT NULL CHECK (amount > 0)`, `date TEXT NOT NULL CHECK (length(date) = 10 AND date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')`, `note TEXT`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`.
    - Indexes: `entries_date_idx ON entries(date)`, `entries_item_id_idx ON entries(item_id)`, `entries_owner_member_id_idx ON entries(owner_member_id)`.
  - Constraints: does not alter existing F01 tables; preserves existing data.
  - Validation: `tests/server/migrations.test.ts`.
- [x] **T009 [US2] Migration 2 tests**
  - Files: `tests/server/migrations.test.ts`.
  - Expected behavior: verify `user_version` advances to 2; existing F01 members and categories survive; foreign keys reject invalid item/member IDs; check constraints reject `<= 0` amount or invalid date length.
  - Validate: `npm run test`.
- [x] **T010 Phase 01 Gate Check**
  - Run: `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build`.
  - Confirm all pass.

---

## Phase 02 — Entries Store, Service, & Route Handlers

Order: Store statements → Service use cases → Atomic merge re-pointing → API route handlers.

- [x] **T011 [US1, US2, US3, US4, US7] Entries SQLite store module**
  - Files: `src/server/entries-store.ts` (new).
  - Expected behavior: prepared statements with `import "server-only"`:
    - `insertEntry(db, entry)`
    - `updateEntry(db, entry)`
    - `deleteEntry(db, id)`
    - `findEntryById(db, id)`
    - `listEntriesForMonth(db, monthKey)` (joins `items`, `categories`, and `members` to return `EntryWithDetails`; ordered deterministically by `ORDER BY date DESC, created_at DESC, id ASC`)
    - `countEntriesByItem(db, itemId)`
    - `countEntriesByCategory(db, categoryId)`
    - `repointEntriesForItem(db, fromItemId, intoItemId, now)`
  - Constraints: pure SQL adapters; centralized location for all entry count queries; deterministic sorting tie-breaker.
  - Validation: `tests/server/entries-store.test.ts`.
- [x] **T012 [P] Store module integration tests**
  - Files: `tests/server/entries-store.test.ts` (new).
  - Expected behavior: test insert, retrieve by month with `createdAt DESC` and `id ASC` tie-breakers, update, delete, item/category count queries, and re-pointing against an in-memory SQLite database.
  - Validate: `npm run test`.
- [x] **T013 [US1, US3, US4] Entries domain service**
  - Files: `src/server/entries-service.ts` (new).
  - Expected behavior: use-case functions wrapped in `db.transaction`:
    - `createEntry(db, draft)`: validates active item, validates active member (if specified), checks item category umbrella matches draft `type`, inserts row, returns `EntryWithDetails`. Throws `DomainError` (`validation`, `not_found`, `archived`, `umbrella_mismatch`).
    - `updateEntry(db, id, patch)`: validates entry exists, derives new `type` directly from target item's umbrella (no `umbrella_mismatch` error on PATCH), checks updated item/member active status (retaining existing archived values allowed; switching to another archived entity returns `409 archived`), updates row and bumps `updated_at`, returns `EntryWithDetails`.
    - `deleteEntry(db, id)`: validates entry exists, deletes row.
  - Constraints: throws typed `DomainError` with descriptive user-facing message.
  - Validation: `tests/server/entries-service.test.ts`.
- [x] **T014 [US7] Atomic entry re-pointing in category merge**
  - Files: `src/server/categories-service.ts`.
  - Expected behavior: in `mergeCategory`, when combining items (`nameKey` match), call `repointEntriesForItem(database, item.id, match.id, timestamp())` inside the merge transaction before marking the item as combined. Bumps `updated_at` on re-pointed entries. If any failure occurs, entire transaction rolls back atomically.
  - Constraints: atomic within the same database transaction.
  - Validation: `tests/server/categories-operations.test.ts`.
- [x] **T015 [US1, US3, US4, US7] Entries service tests**
  - Files: `tests/server/entries-service.test.ts` (new).
  - Expected behavior: test entry creation, editing, deletion, active-status checks, category umbrella validation on creation, type change via `itemId` on `PATCH` (no umbrella mismatch), retaining archived entity vs 409 when switching to another archived entity, and atomic merge rollback on error.
  - Validate: `npm run test`.
- [x] **T016 [US1] Create entry API route handler**
  - Files: `src/app/api/entries/route.ts` (new).
  - Expected behavior: `POST /api/entries`: parse JSON body via `readBody`, call `createEntry`, return `201 { entry }`. Map domain errors via `errorResponse`.
  - Validation: `tests/api/entries.test.ts`.
- [x] **T017 [US3, US4] Edit & delete entry API route handlers**
  - Files: `src/app/api/entries/[id]/route.ts` (new).
  - Expected behavior:
    - `PATCH /api/entries/[id]`: parse JSON body, call `updateEntry`, return `200 { entry }`.
    - `DELETE /api/entries/[id]`: call `deleteEntry`, return `200 { id }`.
  - Validation: `tests/api/entries.test.ts`.
- [x] **T018 [US1, US3, US4] Route handler tests**
  - Files: `tests/api/entries.test.ts` (new).
  - Expected behavior: test `POST`, `PATCH`, `DELETE` with valid payloads, unknown fields (400), malformed bodies (400), non-existent IDs (404), and archived entity assignments (409).
  - Validate: `npm run test`.
- [x] **T019 Phase 02 Gate Check**
  - Run: `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build`.
  - Confirm all pass.

---

## Phase 03 — Category & Item Real Entry Counts

Order: Store count queries → View model mapping → Move & Merge dialog updates.

- [x] **T020 [P] [US7] Expose entry counts in getCategoriesView**
  - Files: `src/server/categories-read.ts`, `src/components/categories/types.ts`.
  - Expected behavior: extend `CategoryRowData` and `Item` types to include `entryCount: number`. Update `getCategoriesView()` to populate `entryCount` on each category and item using `countEntriesByCategory` and `countEntriesByItem` from `src/server/entries-store.ts`. Does not duplicate SQL queries in `categories-store.ts`.
  - Validate: `npm run test`.
- [x] **T021 [US7] Real entry counts in MoveItemDialog**
  - Files: `src/components/categories/move-item-dialog.tsx`.
  - Expected behavior: replace `"All 0 entries under..."` with real count: `"All ${item.entryCount} entries under <name> move with it."` (using proper singular/plural `"1 entry"` vs `"N entries"`).
  - Validate: `tests/components/categories/dialogs.test.ts`.
- [x] **T022 [US7] Real entry counts in MergeCategoryDialog**
  - Files: `src/components/categories/merge-category-dialog.tsx`.
  - Expected behavior: replace `"...and 0 entries."` with real count: `"What moves: ${category.itemCount} items and ${category.entryCount} entries."`.
  - Validate: `tests/components/categories/dialogs.test.ts`.
- [x] **T023 Category dialog entry count tests**
  - Files: `tests/components/categories/dialogs.test.ts`.
  - Expected behavior: verify `MoveItemDialog` and `MergeCategoryDialog` display actual entry numbers based on provided props and proper singular/plural strings.
  - Validate: `npm run test`.
- [x] **T024 Phase 03 Gate Check**
  - Run: `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build`.

---

## Phase 04 — Entries Workspace Layout & Navigation

Order: Server read helper → Route loading/error boundaries → MonthPicker query sync → Header and shell layout.

- [x] **T025 [US2] Server-only getEntriesView read helper**
  - Files: `src/server/entries-read.ts` (new).
  - Expected behavior: implement `getEntriesView(monthKey?: string)`:
    - Calls `await connection()`.
    - Defaults `monthKey` to current calendar month (`YYYY-MM`) if missing or invalid.
    - Queries entries for that month via `listEntriesForMonth`.
    - Queries active categories (including zero-item categories) with active items, and active members.
    - Packages `archivedCategories` and `archivedMembers` referenced by entries in this month (for edit modal display and swatches).
    - Returns `{ month, entries, categories, members, defaults, archivedCategories, archivedMembers }`.
  - Validate: `tests/server/entries-read.test.ts`.
- [x] **T026 [P] Entries read helper tests**
  - Files: `tests/server/entries-read.test.ts` (new).
  - Expected behavior: test default month resolution, valid `monthKey` filtering, active entity packaging, inclusion of zero-item categories, and `archivedCategories`/`archivedMembers` packaging.
  - Validate: `npm run test`.
- [x] **T027 [US2] Route-level loading and error boundaries**
  - Files: `src/app/(shell)/entries/loading.tsx` (new), `src/app/(shell)/entries/error.tsx` (new).
  - Expected behavior:
    - `loading.tsx`: renders skeleton matching entries header, filter chips, and table structure.
    - `error.tsx`: client boundary accepting `{ error: Error; retry: () => void }`, displaying user-facing error message with "Try again" button calling `retry()`.
  - Validate: `tests/components/entries/route-boundaries.test.ts`.
- [x] **T028 [US2] MonthPicker query parameter navigation support**
  - Files: `src/components/shell/month-picker.tsx`.
  - Expected behavior: allow controlled `value?: string` (`YYYY-MM`) and `onChange?: (month: string) => void`. When used on `/entries`, clicking ◀ / ▶ pushes the updated month to URL query parameters (`/entries?month=YYYY-MM`). Fall back to local state if uncontrolled.
  - Constraints: preserve box-content layout and styling from F01.
  - Validate: `tests/components/shell/month-picker.test.ts`.
- [x] **T029 🎨 [US1, US2] Entries screen header**
  - Files: `src/components/entries/entries-header.tsx` (new).
  - **Match**: `HF#L23–L48, L834–L848`.
  - Expected behavior: render top header row with Page title ("Entries"), Owner dropdown filter ("Household ▾" + active members), Category dropdown filter ("All categories ▾" + active categories), MonthPicker, and "+ Add entry" primary CTA button (`#2f7d78` teal surface, radius 9, white text).
  - Provenance: `lifted from prototype CSS` (HF L23–L48).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [x] **T030 🎨 [US2] Entries screen container & empty states**
  - Files: `src/components/entries/entries-screen.tsx` (new).
  - **Match**: `HF#L205–L230`.
  - Expected behavior: client component receiving `EntriesViewData`. Renders `EntriesHeader`, filter chip row placeholder, and table card. Handles empty states:
    - Zero entries in month: `"No entries recorded for this month."`
    - Entries exist but filters match none: `"No entries match these filters."`
  - Provenance: `lifted from prototype CSS` (HF L228).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [x] **T031 [US2] Functional Entries page component**
  - Files: `src/app/(shell)/entries/page.tsx`.
  - Expected behavior: Server Component reading `searchParams: Promise<{ month?: string }>`. Calls `getEntriesView(month)` and passes props to `EntriesScreen`.
  - Constraints: no prerender at build time (`await connection()` in read helper).
  - Validate: `npm run build`.
- [x] **T032 Entries screen and route boundary component tests**
  - Files: `tests/components/entries/entries-screen.test.ts` (new), `tests/components/entries/route-boundaries.test.ts` (new).
  - Expected behavior: test rendering with entries, empty month state, filter mismatch empty state, month navigation, skeleton loading state, and error boundary retry trigger.
  - Validate: `npm run test`.
- [x] **T033 Phase 04 Gate Check**
  - Run: `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build`.

---

## Phase 05 — Search, Filters, & Summary Chips

Order: Type filter toggle → Search input & filter state → Summary chips with member split.

- [x] **T034 🎨 [US5] Type filter segmented control**
  - Files: `src/components/entries/type-filter.tsx` (new).
  - **Match**: Header segmented control style (All | Expense | Income) using pill borders, radius 20, font 13px.
  - Provenance: `recreated manually: type filter not represented in prototype header (spec clarification)`.
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [x] **T035 🎨 [US5] Entries search input**
  - Files: `src/components/entries/search-input.tsx` (new).
  - **Match**: `HF#L207–L212` (input at L211). White background, border `#d5d8d8`, radius 9 (HF L211: `border-radius: 9px;`), placeholder `"Search notes and items…"`.
  - Provenance: `lifted from prototype CSS` (HF L211).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [x] **T036 [US5] Wire in-memory filtering in EntriesScreen**
  - Files: `src/components/entries/entries-screen.tsx`, `src/components/entries/entries-header.tsx`.
  - Expected behavior: replace the temporary `visibleEntries` test seam with local React state for `search`, `type`, `categoryId`, and `ownerId`, wiring the header controls to that state. Compute `filteredEntries` using `filterEntries()` from `src/domain/entry-calculations.ts` on every state change instantly. Apply the selected styling from the prototype to active chips and their selected menu items.
  - Validate: `tests/components/entries/entries-screen.test.ts`.
- [x] **T037 🎨 [US6] Summary chips component**
  - Files: `src/components/entries/summary-chips.tsx` (new).
  - **Match**: `HF#L207–L210` / styles `HF#L1002–L1008`.
  - Expected behavior: white pill cards, border `#d5d8d8`, radius 20, padding 7×14, font 13px. Displays:
    - `Entries <N>`
    - `Expense ₱<amount>`
    - `Income ₱<amount>`
    - `Net <signed ₱amount>` (signed with `+` or true minus `−`)
  - Provenance: `lifted from prototype CSS` (HF L1002–L1008; Net replaces Avg / entry per spec).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [x] **T038 [US6] Member view own and shared summary chip split**
  - Files: `src/components/entries/summary-chips.tsx`.
  - Expected behavior: when `ownerId !== "all"`, Expense, Income, and Net chips display member's own amount and shared (Household) amount separately beneath or alongside the total (e.g., `₱18,200 own · ₱6,400 shared`).
  - Constraints: exact arithmetic via `calculateMemberSummary`.
  - Validate: `tests/components/entries/summary-chips.test.ts`.
- [x] **T039 Summary chips component tests**
  - Files: `tests/components/entries/summary-chips.test.ts` (new).
  - Expected behavior: test totals for household view, member view split, exact centavo additions, and empty/zero states.
  - Validate: `npm run test`.
- [x] **T040 Phase 05 Gate Check**
  - Run: `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build`.

---

## Phase 06 — Entries Table, Sorting, & Actions

Order: Table card & columns → Sortable headers calling domain sort → Row rendering → Delete confirmation dialog.

- [x] **T041 🎨 [US2] Entries table card & headers**
  - Files: `src/components/entries/entries-table.tsx` (new).
  - **Match**: `HF#L213–L214`.
  - Expected behavior: white card, radius 14, border `#d5d8d8`. Grid columns: `78px minmax(0,34%) 1fr 0.8fr 100px 58px`. Column headers:
    - DATE (clickable sort: toggles newest ▼ / oldest ▲, chevron 8px teal)
    - ITEM
    - CATEGORY
    - OWNER
    - AMOUNT (clickable sort: toggles largest / smallest)
    - Actions (empty header)
  - Provenance: `lifted from prototype CSS` (HF L213–L214).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [x] **T042 [US2] Table column sorting invoking domain helper**
  - Files: `src/components/entries/entries-table.tsx`.
  - Expected behavior: maintain sort state (`field: "date" | "amount"`, `direction: "asc" | "desc"`). Default is date descending (newest first). Toggling DATE flips asc/desc; clicking AMOUNT sorts by amount descending/ascending. Calls `sortEntries(entries, field, direction)` from `src/domain/entry-calculations.ts` ensuring deterministic secondary tie-break on `createdAt DESC` and final on `id ASC`.
  - Validate: `tests/components/entries/entries-table.test.ts`.
- [x] **T043 🎨 [US2, US5] Entry row component**
  - Files: `src/components/entries/entry-row.tsx` (new).
  - **Match**: `HF#L215–L227` / styles `HF#L1009–L1020`.
  - Expected behavior:
    - DATE: formatted day (e.g. `Sep 19` formatted as short month + day).
    - ITEM: item name in ink.
    - CATEGORY: 10×10 square swatch (radius 3) in category color + category name. Marked `(archived)` if category is archived.
    - OWNER: member name or "Household". When filtered by member, Household rows show a subtle distinct badge/indicator.
    - AMOUNT: right-aligned in JetBrains Mono. Income prefixed with green `+` (`PALETTE.green`); Expense prefixed with ink `−` (`PALETTE.ink`). Shows centavos if present.
    - Actions: ✎ edit button and ✕ delete button (22×22, radius 6).
  - Provenance: `lifted from prototype CSS` (HF L215–L227).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [x] **T044 🎨 [US4] Delete entry confirmation dialog**
  - Files: `src/components/entries/delete-confirm-dialog.tsx` (new).
  - **Match**: `WF#dialogs` and F01 `ConfirmDialog` styling.
  - Expected behavior: native `<dialog>` wrapper with backdrop. Title: "Delete entry". Body identifies entry (Date, Item, Amount). Buttons: Cancel and Delete entry (red hover fill). Triggers `DELETE /api/entries/:id`.
  - Provenance: `recreated manually: prototype deleted immediately without confirmation (brief requires confirmation)`.
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [x] **T045 Wire row actions, stale record recovery, and mutation feedback**
  - Files: `src/components/entries/entries-screen.tsx`.
  - Expected behavior: clicking ✎ opens EntryModal in edit mode. Clicking ✕ opens `DeleteConfirmDialog`. On successful delete, shows toast `"Entry deleted"` and triggers `router.refresh()`. If delete returns 404 (stale record), displays error notification and triggers `router.refresh()` to resync table.
  - Note: per user direction, ✎ remains intentionally inert until Phase 07 introduces `EntryModal`.
  - Validate: `tests/components/entries/entries-table.test.ts`.
- [x] **T046 Entries table component tests**
  - Files: `tests/components/entries/entries-table.test.ts` (new).
  - Expected behavior: test rendering rows, sorting by date and amount via domain helper with `createdAt DESC` and `id ASC` tie-breakers, Household row visual distinction in member filter, delete dialog open/cancel/confirm flow, and stale record 404 handling.
  - Validate: `npm run test`.
- [x] **T047 Phase 06 Gate Check**
  - Run: `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build`.

---

## Phase 07 — Add / Edit Entry Modal with Custom Popovers

Order: Popovers (Date, Category, Item) → Modal shell → Form validation → Save & Add another → Edit mode.

- [x] **T048 🎨 [US1] Custom Calendar Popover**
  - Files: `src/components/entries/popovers/calendar-popover.tsx` (new).
  - **Match**: `HF#L565–L572`, styles `HF#L720–L734`.
  - Expected behavior: opens directly under the date field at field width. Header with ◀ Month YYYY ▶. Monday-first grid with 32px day cells. Selected day on `#26686a` with white bold text in JetBrains Mono. Selection updates date and closes popover. Arrow keys navigate calendar days; Enter selects focused day.
  - Provenance: `lifted from prototype CSS` (HF L565–L572).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [x] **T049 🎨 [US1] Custom Category Popover**
  - Files: `src/components/entries/popovers/category-popover.tsx` (new).
  - **Match**: `HF#L576–L580`, styles `HF#L741–L747`.
  - Expected behavior: custom dropdown 4px under field, matching width, max-height 240px, scrollable. Lists categories matching active `type` (Expense or Income). Rows show 11×11 square color swatch and name. Selected row is `#e4efee` with `#26686a` text. Selecting a category resets item to that category's first item and closes popover. Arrow keys navigate options; Enter selects. If no categories exist, displays explanation `"No categories available. Create a category first in Categories."`.
  - Provenance: `lifted from prototype CSS` (HF L576–L580).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [x] **T050 🎨 [US1] Custom Item Popover**
  - Files: `src/components/entries/popovers/item-popover.tsx` (new).
  - **Match**: `HF#L583–L588`, styles `HF#L748–L752`.
  - Expected behavior: custom dropdown 4px under field, matching width, max-height 240px, scrollable. Lists items belonging to the currently selected category. Selected row is `#e4efee` with `#26686a` text. Arrow keys navigate options; Enter selects. If selected category has zero items, displays explanation `"No items in this category. Add items in Categories."`.
  - Provenance: `lifted from prototype CSS` (HF L583–L588).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [x] **T051 [US1] Popover manager & keyboard / outside-click handling**
  - Files: `src/components/entries/popovers/use-popover-manager.ts` (new).
  - Expected behavior: enforces single open popover rule (`formMenu: "date" | "cat" | "item" | null`).
  - Keyboard rules: Escape key closes the open popover only (does NOT close the outer modal). Closes on outside click or option selection.
  - Validate: unit/hook test in `tests/components/entries/popovers.test.ts`.
- [x] **T052 🎨 [US1] Owner segmented control**
  - Files: `src/components/entries/owner-segmented-control.tsx` (new).
  - **Match**: `HF#L589–L593`, styles `HF#L808, L1357–L1359`.
  - Expected behavior: segmented pill control: "Household" (default) plus each active member. Helper text beneath: `"Optional — stays with the household unless you pick a member."`.
  - Provenance: `lifted from prototype CSS` (HF L589–L593, L808, L1357–L1359).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [x] **T053 🎨 [US1] Entry modal card, validation styling, & draft preservation**
  - Files: `src/components/entries/entry-modal.tsx` (new).
  - **Match**: `HF#L550–L603`, styles `HF#L1350–L1376`.
  - Expected behavior:
    - Overlay `rgba(20,24,26,.42)`; card 568px wide (the prototype's 520px content width plus 24px padding on each side), white, radius 16, padding 24, no border.
    - Type toggle: Expense | Income segmented on `#e0e2e2`, radius 9. Switching type switches category and item to valid options of the new type.
    - AMOUNT input: Mono 16px text input. When amount is invalid (`<= 0`, non-numeric, >2 decimals), border turns `#b0533c` on `#fdf6f3`, message below input displays specific error from `parseAndValidateAmount`, and Save buttons are disabled with muted `#5c6467` text on `#f4f5f5` with `#d5d8d8` border.
    - NOTE: textarea, 3 rows, placeholder "Optional".
    - Keyboard rules: Pressing Enter from single-line inputs (such as AMOUNT) submits the form. NOTE textarea preserves Enter for multiline breaks. Escape closes modal ONLY when no popover is open.
    - Draft preservation: on failed save (server error, network failure), preserves all entered values in modal fields and displays inline error banner.
    - Rapid double save prevention: disables Save and "Save & add another" buttons while request is in flight.
    - Footer buttons: Cancel · Save & add another · Save.
  - Provenance: `lifted from prototype CSS` (HF L550–L603, L1350–L1376).
  - Validate: Tier 2 review at 1100, 1280, 1440px.
- [x] **T054 [US1] "Save & add another" creation flow**
  - Files: `src/components/entries/entry-modal.tsx`.
  - Expected behavior: submitting via "Save & add another" sends `POST /api/entries`. Disables submit buttons during request. On success, keeps modal open, preserves type, date, category, item, and owner, clears amount and note, focuses amount input, triggers `router.refresh()`, and displays toast `"₱<amount> added to <Category>"`.
  - Validate: `tests/components/entries/entry-modal.test.ts`.
- [x] **T055 [US3, US7] Edit mode, type follows itemId, & archived entity preservation**
  - Files: `src/components/entries/entry-modal.tsx`.
  - Expected behavior:
    - In Edit mode: title is "Edit entry", prefilled with existing entry values; hides "Save & add another".
    - Changing item to an item under a different umbrella automatically updates type to match that item's category.
    - If entry references an archived category or member, display it as selected, marked `(archived)`. (Items derive archive status from category).
    - User can edit amount/date/note without changing the archived entity. If switched away to an active entity, the archived entity can no longer be chosen. Switching to another archived entity is rejected (`409 archived`).
    - On save, sends `PATCH /api/entries/:id`, closes modal, shows toast `"Entry updated"`, triggers `router.refresh()`. If record missing (404), displays error toast and refreshes table.
  - Validate: `tests/components/entries/entry-modal.test.ts`.
- [x] **T056 Toast notification component**
  - Files: `src/components/ui/toast.tsx` (new).
  - Expected behavior: displays floating feedback toast for 2200ms (`"₱<amount> added to <Category>"`, `"Entry updated"`, `"Entry deleted"`).
  - Integration: replace Phase 06's temporary screen-local delete success and stale-record error feedback.
  - Constraints: accessible `role="status"` live region.
  - Validate: `tests/components/ui/toast.test.ts`.
- [x] **T057 Wire EntryModal into EntriesScreen**
  - Files: `src/components/entries/entries-screen.tsx`.
  - Expected behavior: connects "+ Add entry" button and row ✎ buttons to `EntryModal`. Passes active categories, items, and members.
  - Validate: `tests/components/entries/entry-modal.test.ts`.
- [x] **T058 Entry modal & popover component tests**
  - Files: `tests/components/entries/entry-modal.test.ts` (new), `tests/components/entries/popovers.test.ts` (new).
  - Expected behavior: test initial defaults, amount validation specific error messages, popover opening/closing, single open popover rule, Escape hierarchy (closes popover first, modal second), arrow key popover navigation, Enter submission from amount input, newline preservation in note textarea, draft preservation on error, double submit prevention, Save & add another behavior, Edit mode prefill, type update on itemId change, and archived entity handling.
  - Validate: `npm run test`.
- [x] **T059 Phase 07 Gate Check**
  - Run: `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build`.

---

## Phase 08 — Deterministic Demo Seed & Guarded Clear Tooling

Order: Seed reference data → Demo engine module → Thin CLI wrappers → NPM script registration → Integration tests.

- [x] **T060 [US8] Copy prototype seed data to scripts directory**
  - Files: `scripts/seed.json` (new).
  - Expected behavior: copy seed data from extracted design handoff (`reference/seed.json` / `data/seed.json` in handoff zip) into `scripts/seed.json`. Contains members (Ana, Miguel), categories, items, and 12-month actuals series.
  - Constraints: committed inside `scripts/` (outside the gitignored `/data/` directory).
  - Validate: file exists and parses as valid JSON.
- [x] **T061 [US8] Demo seed and clear engine module**
  - Files: `src/server/demo.ts` (new).
  - Expected behavior: prepared statements and transaction logic with `import "server-only"`:
    - `seedDemoData(db, options?: { seedJson?: SeedData; currentDate?: string })`:
      - Reads `scripts/seed.json` (or uses `options.seedJson`).
      - Computes 12 calendar months ending with `currentDate` (defaulting to current date).
      - Implements exact PRNG algorithm from `HF#L680–L706` (seed `987654321`).
      - Checks if database has any existing members, categories, or entries. If non-empty, throws error `"Database is not empty. Run 'npm run clear' first."`.
      - Inserts members, categories, items, and generated entries in a single SQLite transaction.
    - `getClearSummary(db)`: returns dry-run summary of row counts (`entries`, `items`, `categories`, `members`) without modifying database.
    - `clearAllData(db)`: deletes all records from `entries`, `items`, `categories`, and `members`. Preserves `household`, `umbrellas`, and database schema in a single transaction.
  - Constraints: pure importable module; callable by CLI scripts or directly by tests.
  - Validation: `tests/server/seed-clear.test.ts`.
- [x] **T062 [US8] Thin CLI wrappers for seed and clear using shared getDatabase helper**
  - Files: `scripts/seed.ts` (new), `scripts/clear.ts` (new).
  - Expected behavior:
    - `scripts/seed.ts`: imports `getDatabase` from `src/server/db/database.ts` (which safely falls back to `"./data/celia.db"` when `process.env.CELIA_DB_PATH` is unset), calls `seedDemoData(db)`, logs seeded counts or exits with error.
    - `scripts/clear.ts`: inspects `process.argv` for `--yes`, imports `getDatabase` from `src/server/db/database.ts` (safely resolving `process.env.CELIA_DB_PATH ?? "./data/celia.db"`). If `--yes`, calls `clearAllData(db)` and reports wiped counts; otherwise, calls `getClearSummary(db)` and prints dry-run summary with instructions to pass `--yes`.
  - Constraints: thin wrappers around `src/server/demo.ts`; uses shared `getDatabase()` helper to avoid crashes when `CELIA_DB_PATH` is unset.
  - Validate: manual test via `tsx --conditions react-server`.
- [x] **T063 [US8] Register tsx devDependency and npm scripts**
  - Files: `package.json`.
  - Expected behavior:
    - Add `"tsx": "^4.19.2"` to `devDependencies` (Node's `--experimental-strip-types` cannot resolve `@/` path mappings, justifying `tsx` under Constitution Principle XVII).
    - Add `"seed": "tsx --conditions react-server scripts/seed.ts"` and `"clear": "tsx --conditions react-server scripts/clear.ts"` to `scripts`.
  - Constraints: `tsx` added strictly as a `devDependency` (zero runtime dependencies).
  - Validate: `npm run seed` and `npm run clear` execute without errors.
- [x] **T064 [US8] Demo seed and clear in-memory integration tests**
  - Files: `tests/server/seed-clear.test.ts` (new).
  - Expected behavior: directly test `src/server/demo.ts` against an in-memory SQLite database:
    - Seed on empty DB creates 12 months of entries.
    - Seed refusal on non-empty DB.
    - Repeat seed determinism: seeding with a fixed `currentDate`, clearing, and seeding again yields identical row counts, dates, and amounts.
    - `getClearSummary` makes zero database changes and returns accurate counts.
    - `clearAllData` wipes back to first-run state.
  - Validate: `npm run test`.
- [x] **T065 Phase 08 Gate Check**
  - Run: `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build`.

---

## Phase 09 — Release Prep

Order: Version bump → Changelog → Roadmap → Repo map → README → Deviations sync → Docs sanity.

- [x] **T066 Version bump**
  - Files: `package.json`, `package-lock.json`.
  - Expected behavior: bump version from `3.0.0` to `3.1.0` in `package.json` and `package-lock.json` (`packages[""].version`).
  - Validate: `git diff package.json package-lock.json`.
- [x] **T067 [P] CHANGELOG.md update**
  - Files: `CHANGELOG.md`.
  - Expected behavior: add `## 3.1.0 — 2026-MM-DD` entry for F02 Entries covering:
    - Add/Edit entry modal with custom popovers and keyboard navigation.
    - Entries list with month picker, type/category/owner filters, search, and sorting.
    - Reusable exact centavo arithmetic, deterministic sorting, and summary totals (Income, Expense, Net, and member own/shared splits).
    - Database Migration 2 adding `entries` table and indexes.
    - Real entry counts in Move and Merge dialogs, and atomic entry re-pointing.
    - CLI tools `npm run seed` (12-month demo data) and `npm run clear` (guarded wipe).
  - Validate: file matches formatting conventions.
- [x] **T068 [P] Update feature roadmap**
  - Files: `docs/feature_roadmap.md`.
  - Expected behavior: mark `F02 — Entries` as `✓ Complete` with link to `[Brief](features/v3-002-entries.md)`.
  - Validate: markdown table renders cleanly.
- [x] **T069 [P] Update repository map**
  - Files: `docs/REPO_MAP.md`.
  - Expected behavior: document `src/components/entries`, `scripts/`, `scripts/seed.json`, `src/server/demo.ts`, and test files.
  - Validate: all listed directories exist.
- [x] **T070 [P] Update README.md**
  - Files: `README.md`.
  - Expected behavior: update feature description to include Entries, document `npm run seed` and `npm run clear` CLI tools, and document exact centavo arithmetic.
  - Validate: clear instructions matching codebase state.
- [x] **T071 [P] Review and synchronize deviations.md**
  - Files: `specs/v3-002-entries/deviations.md`.
  - Expected behavior: verify all deviations D1–D9 match implemented code and behavior (including D9 for field-level error and budget preview box removal).
  - Validate: `deviations.md` accurately reflects codebase state.
- [x] **T072 Docs sanity check**
  - Files: `README.md`, `CHANGELOG.md`, `docs/feature_roadmap.md`, `docs/REPO_MAP.md`, `specs/v3-002-entries/quickstart.md`.
  - Checks:
    - Commands exist in `package.json`.
    - Relative file links resolve.
    - No outdated placeholder references.
  - Validate: `npm run format:check`.

---

## Phase 10 — Browser Smoke Test & Visual Review

Run in a real desktop browser against the to-be-merged state after Release Prep completes. Start server with `$env:CELIA_DB_PATH="./data/smoke.db"; npm run dev` (quickstart.md).

T073–T082 were reported passed in the Phase 10 headless Chrome walkthrough. The keyboard, contrast, and visual follow-up below was run in Chrome on 2026-11-08 with an isolated temporary database.

On 2026-11-08, the user chose to retain the current behavior for header filter menus (Tab and Enter, without arrow-key navigation), rail styling, delete-dialog initial focus, truncated names without tooltips, the search placeholder at 1100px, and the default category. The user also accepted deviations D1–D11.

- [x] **T073 Dev server network binding check**
  - Confirm the server listens exclusively on `127.0.0.1:3000` and is unreachable via LAN IP.
- [x] **T074 [US1] Walk quickstart "US1 — Add an Entry"**
  - Open `/entries`, add expense `3240.50`, confirm toast and table row. Add income `45000` with "Save & add another", confirm modal stays open with values cleared. Verify `0` disables Save with specific error message. Reload; confirm persistence.
- [x] **T075 [US2] Walk quickstart "US2 — Browse a Month of Entries & Sorting"**
  - Seed demo data (`npm run seed`). Open `/entries`. Confirm newest first order, DATE toggle, AMOUNT toggle, month stepping. Run `npm run clear -- --yes` and confirm empty state.
- [x] **T076 [US3] Walk quickstart "US3 — Edit an Entry & Cross-Month Move"**
  - Seed data. Edit an entry's amount, change its date to the previous month. Confirm toast `"Entry updated"`, confirm row leaves current month, step back a month and confirm entry is present. Reload to verify persistence.
- [x] **T077 [US4] Walk quickstart "US4 — Delete an Entry"**
  - Click ✕ on an entry. Verify confirmation dialog identifies entry. Cancel: verify unchanged. Confirm delete: verify row disappears, chips update, toast `"Entry deleted"`. Reload to verify persistence.
- [x] **T078 [US5] Walk quickstart "US5 — Search and Filter Combinations"**
  - Test search by item, category, note. Test Type filter (Expense / Income). Test Category filter. Test Owner filter with Ana (verifying Ana's entries + Household entries are listed with Household marked). Combine filters.
- [x] **T079 [US6] Walk quickstart "US6 — Month Totals & Member Split"**
  - Check summary chips (Entries N, Expense, Income, Net). Verify exact centavo sums. Switch to member Ana: confirm Income, Expense, and Net chips split into own and shared amounts.
- [x] **T080 [US7] Walk quickstart "US7 — Historical Integrity Across Moves, Merges, & Archives"**
  - Add entry on item Coffee. Check Move dialog displays real count (`1 entry`). Move Coffee to Dining out; confirm entry category updates. Merge Dining out; confirm entry follows surviving category/item. Archive category and member; confirm entry still displays normally and opens in Edit mode with archived tags preserved.
- [x] **T081 [US8] Walk quickstart "US8 — Seed and Clear Verification"**
  - Run `npm run seed` on non-empty DB: verify refusal. Run `npm run clear` without flag: verify dry-run report. Run `npm run clear -- --yes`: verify wipe to clean first-run state.
- [x] **T082 Server restart persistence verification**
  - Stop the Next.js server, restart with the same `CELIA_DB_PATH`, and confirm all saved entries and classifications survive intact.
- [x] **T083 Keyboard accessibility pass**
  - Verify Tab navigation reaches all inputs, buttons, and popovers.
  - Verify Escape hierarchy: closes open popover only when open; closes modal when no popover open.
  - Verify Arrow keys and Enter inside modal popovers navigate and select options; header filter menus use Tab and Enter as accepted above.
  - Verify Enter submits from Amount input, and multiline Note textarea preserves Enter for newlines without submitting.
  - Verified modal tab order, calendar and category/item picker arrow-key selection, Escape hierarchy, Enter submission, and Note newlines in Chrome. No screen reader was tested.
- [x] **T084 Contrast and no-shadow pass**
  - Verify text contrast meets >= 4.5:1. Verify zero `box-shadow` on shell, table, popovers, and modal.
  - On 2026-11-08, rendered text and shadows were checked in Chrome across the shell, table, Type states, filter menus, entry modal, calendar, item/category pickers, enabled Save, and delete dialog. Disabled controls, translucent text, and hover states were not included in the automated contrast scan.
- [x] **T085 Tier 2 Visual review for every 🎨 task**
  - Tasks: T029, T030, T034, T035, T037, T041, T043, T044, T048, T049, T050, T052, T053.
  - Capture screenshots at 1100, 1280, and 1440px wide and compare against `reference/Money Tracker Hi-Fi.dc.html`.
  - Confirm zero horizontal scroll at >=1100px width.
  - Compared paired Entries and Add modal screenshots at 1100, 1280, and 1440px against the supplied prototype; inspected the owner filter, category/item/calendar pickers, and delete dialog. At each width the document scroll width matched the viewport. Differences and retained behaviors are recorded above and in the deviation ledger.

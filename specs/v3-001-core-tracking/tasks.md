# Tasks: F01 — Core Tracking

**Inputs**: [spec.md](spec.md) · [plan.md](plan.md) · [data-model.md](data-model.md) ·
[contracts/api.md](contracts/api.md) · [research.md](research.md) · [quickstart.md](quickstart.md)

## Conventions

- **Status**: `[x]` done · `[ ]` pending · `[~]` skipped
- **`[P]`**: can run in parallel with other `[P]` tasks in the same phase (different files,
  no shared edits).
- **`[USn]`**: the spec user story a task serves.
- **Phase dependencies**: `01 → 02 → 03 → 04 → 05 → 06 → 07 → 08`. Phases 04 and 05 both
  depend only on 03, but run in order because they share `src/server/http.ts` and
  `src/components/ui/*`.
- **Commands**: `npm run test` (this repo has no `test:run` script) and `npm run lint`.
  **Phase gate**: every phase ends with `npm run lint && npm run format:check && npm run
  typecheck && npm run test && npm run build` green. Nothing is left broken at a phase
  boundary.
- **Server tests** start with the docblock `// @vitest-environment node`. The global
  default stays jsdom.
- **Constitution test areas mapped to Celia**:
  - *Status transitions*: archive, restore and merge state changes.
  - *Required fields*: names.
  - *URL validation*: not applicable. F01 has no URLs; hex colour validation takes its
    place.
  - *Date handling*: F01 has no user-entered dates. This covers `created_at`,
    `updated_at` and `archived_at` ISO-8601 timestamps.

### Design reference aliases

The handoff zip is `handoff/celia_v3_001.zip`, root folder `design_handoff_money_tracker/`.

- **HF**: `reference/Money Tracker Hi-Fi.dc.html` (visual source of truth)
- **WF**: `reference/Money Tracker Wireframes.dc.html` (dialogs only)
- **HR**: the handoff `README.md` ("Design tokens", "Global layout" sections)

### Visual-fidelity task pattern (applies to every task tagged 🎨)

Tier 1 harness is omitted per user decision (2026-09-26): there is no `test:visual`
script and no new tooling.

- **One component per task.**
- **Match**: the cited `HF#Lnn–Lnn` or `WF#<id> Lnn–Lnn` is the spec. Do not paraphrase
  its pixels.
- **Breakpoints**: 1100, 1280 and 1440px wide.
- **Translation note**:
  - Lift the prototype's inline styles into token-backed Tailwind classes (tokens from
    T007).
  - Replicate the DOM element-for-element.
  - `sc-for`, `sc-if` and `{{ }}` bindings become React maps, conditionals and props.
  - Do not restructure.
- **Provenance**: tag each style block in a code comment, either `lifted from prototype
  CSS` or `recreated manually: <reason>`.
- **Done when**: Tier 2 frozen-state screenshots at all three breakpoints have been
  reviewed side by side against the prototype and match. The review is recorded in
  Phase 08, T090.

## Phase summary

| Phase | Focus | Tasks | User stories |
|---|---|---|---|
| 01 | Replace v2, foundations (deps, tokens, fonts) | T001–T009 | — |
| 02 | Application shell and placeholder routes | T010–T015 | US1 |
| 03 | Domain rules and SQLite persistence core | T016–T026 | — |
| 04 | Members and Household screen | T027–T045 | US2, US7 |
| 05 | Categories and items (create, rename, colour) | T046–T061 | US3, US4, US7 |
| 06 | Move, Merge, Archive/Restore | T062–T072 | US4, US5, US6 |
| 07 | Release Prep | T073–T078 | — |
| 08 | Browser Smoke Test | T079–T090 | US1–US7 |
| 08 fixes | Smoke-test findings | T091–T102 | — |
| PR fixes | PR #26 review findings | T103–T105 | — |

---

## Phase 01 — Replace v2, foundations

T001–T004 land together: the layout imports modules T002 deletes. The phase gate runs
after T009.

- [x] **T001 Delete v2 routes**
  - Files: delete `src/app/dev/`, `src/app/settings/`, `src/app/transactions/`,
    `src/app/page.tsx`.
  - Behavior: the v2 routes no longer exist.
  - Constraints: keep `src/app/layout.tsx`, `src/app/globals.css`, `src/app/favicon.ico`.
  - Validate: `npm run build` lists no v2 routes.
  - Out of scope: new routes (T014).
- [x] **T002 Delete v2 source modules**
  - Files: delete everything in `src/components/`, `src/data/` (including `dummy-data/`)
    and `src/domain/`.
  - Behavior: no v2 code remains.
  - Constraints: first read `src/domain/php-amount.ts`. F01 renders no money, so do not
    port it. Note anything reusable in the PR description for F02.
  - Validate: `npm run typecheck`.
- [x] **T003 Delete v2 tests**
  - Files: delete everything in `tests/components/`, `tests/data/` and `tests/domain/`.
  - Constraints: keep `tests/setup.ts`. `vitest.config.ts` already has
    `passWithNoTests`.
  - Validate: `npm run test` exits 0.
- [x] **T004 Strip v2 providers from the root layout**
  - Files: `src/app/layout.tsx`.
  - Behavior: remove `DataProvider` and `DataStateGate`; render `children` directly.
  - Constraints: fonts are changed in T008, not here.
  - Validate: `npm run build`.
- [x] **T005 Dependencies and scripts**
  - Files: `package.json`, `package-lock.json`.
  - Behavior:
    - Add `better-sqlite3` (dependency) and `@types/better-sqlite3` (devDependency).
    - Remove `fake-indexeddb`.
    - `dev` becomes `next dev -H 127.0.0.1`; `start` becomes `next start -H 127.0.0.1`.
  - Constraints: no other dependency changes (research R1, R10). Install with
    `npm install`, not by editing the lock file by hand.
  - Validate: `npm ci && npm run build`.
  - Validated (2026-10-31): CI's push run of `920f8e0` passed `npm ci` and
    `npm run build` on Ubuntu with Node 22
    ([run 41171446716](https://github.com/reso830/Project_Celia/actions/runs/41171446716)).
    Next.js was later raised to 16.4.3 by T105 (PR #26 review).
- [x] **T006 [P] Ignore the local database**
  - Files: `.gitignore`.
  - Behavior: add `/data/`.
  - Validate: `git check-ignore data/celia.db` prints the path.
- [x] **T007 🎨 Design tokens**
  - Files: `src/app/globals.css`.
  - **Match**: the HR "Design tokens" tables (colour, radius, typography scale) and HF
    L12–L21 (page background, rail and content colours).
  - Behavior:
    - Each token becomes a CSS custom property on `:root`, exposed via Tailwind v4
      `@theme` (colour, radius and font families).
    - Remove the v2 Geist variables and the `--background`/`--foreground` defaults.
  - Constraints:
    - No shadow tokens.
    - Status colours (green, amber, red) are named `status-*`, separate from any
      category colour.
  - Provenance: `lifted from prototype CSS` (HR token table).
  - Validate: build; tokens are visible in devtools on `:root`.
- [x] **T008 Fonts**
  - Files: `src/app/layout.tsx`.
  - Behavior:
    - Load Sora (400/500/600/700) and JetBrains Mono (400/500/700) with
      `next/font/google`.
    - Expose them as CSS variables consumed by the T007 font tokens.
    - `<body>` uses the page background token.
    - Metadata title is "Celia".
  - Validate: build; the rendered `<html>` carries both font variable classes.
- [x] **T009 Native SQLite loads under Vitest**
  - Files: `tests/server/sqlite-runtime.test.ts` (new, node environment).
  - Behavior: open `new Database(":memory:")` from `better-sqlite3`, run
    `select sqlite_version()`, and close it.
  - Constraints: this test must also pass in CI (`.github/workflows/ci.yml`, Node 22,
    inspect only).
  - Validate: `npm run test`.

## Phase 02 — Application shell [US1]

- [x] **T010 [P] [US1] Navigation config and icon map**
  - Files: `src/components/shell/nav-items.ts`, `src/components/shell/nav-icon.tsx`.
  - Behavior: seven entries in handoff order:

    | Label | Route | Glyph |
    |---|---|---|
    | Dashboard | `/` | ◱ |
    | Entries | `/entries` | ☰ |
    | Categories | `/categories` | ⌗ |
    | Savings buckets | `/savings` | ◎ |
    | Budget models | `/models` | ≣ |
    | Forecaster | `/forecaster` | ⤳ |
    | Household | `/household` | ⚭ |

    `NavIcon` maps an id to its glyph in one place (research R8).
  - Constraints: no icon dependency.
  - Validate: T015.
- [x] **T011 🎨 [US1] App rail**
  - Files: `src/components/shell/app-rail.tsx` (client).
  - **Match**:
    - HF#L14–L19 (rail, logo tile, item loop).
    - HF#L836–L841 (nav item size, radius, active and inactive colours).
    - Hover: HF#L17 `style-hover`.
  - Behavior:
    - Items are `next/link` links.
    - The active item comes from `usePathname()` and sets `aria-current="page"`.
    - The tooltip is the label (`title`, as in the prototype), plus an `aria-label`.
  - Provenance: `lifted from prototype CSS`.
  - Validate: T015 and the 🎨 review.
- [x] **T012 🎨 [US1] Page header**
  - Files: `src/components/shell/page-header.tsx`.
  - **Match**: HF#L23–L25 (header row and title; the right-hand control group is a
    slot).
  - Behavior: props are `title` and optional `actions`. There is never a subtitle.
  - Provenance: `lifted from prototype CSS`.
- [x] **T013 🎨 [US1] Shell layout**
  - Files: `src/app/(shell)/layout.tsx`.
  - **Match**: HF#L12 (flex row, page background) and HF#L21 (content column
    `min-width:0`, padding).
  - Behavior: renders `AppRail` plus the content column around `children`.
  - Constraints: no horizontal page scroll at 1100px or more.
  - Provenance: `lifted from prototype CSS`.
- [x] **T014 [US1] Routes**
  - Files: `src/app/(shell)/page.tsx` (Dashboard, the landing screen), plus `page.tsx`
    under `(shell)/entries/`, `(shell)/savings/`, `(shell)/models/`,
    `(shell)/forecaster/`, `(shell)/categories/` and `(shell)/household/`.
  - Behavior: each page renders only `PageHeader` with its title ("Dashboard", "Entries",
    "Categories & items" per HF L1290 titles, "Savings buckets", "Budget models",
    "Forecaster", "Household").
  - Constraints: no data, controls or placeholder figures. Categories and Household are
    filled in Phases 04 and 05.
  - Validate: build lists all seven routes.
- [x] **T015 [US1] Shell tests**
  - Files: `tests/components/app-rail.test.tsx`.
  - Behavior under test:
    - Seven links in order, with labels and hrefs.
    - `aria-current` on the active route (mock `usePathname`).
    - Each placeholder page renders its title and nothing else interactive.
  - Validate: `npm run test`.

## Phase 03 — Domain rules and persistence core

- [x] **T016 [P] Umbrellas**
  - Files: `src/domain/umbrella.ts`.
  - Behavior: `Umbrella`, `ClassifiableUmbrella` and `isClassifiableUmbrella` (true only
    for income and expense).
  - Constraints: pure; no I/O.
  - Validate: T022.
- [x] **T017 [P] Names**
  - Files: `src/domain/names.ts`.
  - Behavior:
    - `validateName(raw)` returns the trimmed name, or throws `DomainError("validation")`
      when it is empty after trimming.
    - `nameKey(name)` returns `trim().toLocaleLowerCase("en-US")`.
  - Constraints: no length cap (none is specified).
  - Validate: T020.
- [x] **T018 [P] Colours**
  - Files: `src/domain/color.ts`.
  - Behavior:
    - `HexColor` type.
    - `parseHexColor(raw)` accepts `#rrggbb` in any case, returns it lowercase, and
      throws `validation` otherwise.
    - `DEFAULT_CATEGORY_COLORS` holds the 9 handoff identity colours in research R7
      order.
    - `defaultCategoryColor(n)` returns `DEFAULT_CATEGORY_COLORS[n % 9]`.
  - Validate: T021.
- [x] **T019 Errors and entity types**
  - Files: `src/domain/errors.ts`, `src/domain/member.ts`, `src/domain/category.ts`,
    `src/domain/item.ts`, `src/domain/owner.ts`, `src/domain/index.ts`.
  - Behavior:
    - `DomainError` carries a `code`, drawn exactly from the codes in contracts/api.md,
      a user-facing `message`, and an optional `field`.
    - Entity types are as defined in data-model.md.
  - Constraints: `Owner` is a type only; it is not persisted in F01.
  - Validate: `npm run typecheck`.
- [x] **T020 [P] Tests: required names**
  - Files: `tests/domain/names.test.ts`.
  - Cases:
    - Empty and whitespace-only names are rejected with code `validation`.
    - Surrounding spaces are trimmed.
    - `nameKey` makes "  Ana " and "ana" equal and keeps inner spaces.
- [x] **T021 [P] Tests: hex colours** (substitute for URL validation)
  - Files: `tests/domain/color.test.ts`.
  - Cases:
    - `#7D8BA8` becomes `#7d8ba8`.
    - Rejected: missing `#`, 3-digit shorthand, 8-digit, non-hex characters, and
      surrounding junk.
    - `defaultCategoryColor(0..9)` wraps at 9.
- [x] **T022 [P] Tests: umbrellas**
  - Files: `tests/domain/umbrella.test.ts`.
  - Cases: income and expense are classifiable; savings and unknown strings are not.
- [x] **T023 Migrations**
  - Files: `src/server/db/migrations.ts`.
  - Behavior: an ordered array. Migration 1 creates the tables, CHECKs and indexes from
    data-model.md exactly, and inserts the `household` row and the three `umbrellas`
    rows.
  - Constraints: each migration runs in a transaction and sets `PRAGMA user_version`.
- [x] **T024 Database access**
  - Files: `src/server/db/database.ts`.
  - Behavior:
    - `openDatabase(path)` sets `foreign_keys=ON` and `journal_mode=WAL` (skip WAL for
      `:memory:`) and runs pending migrations.
    - `getDatabase()` is a process-wide singleton using `CELIA_DB_PATH`, defaulting to
      `./data/celia.db`, and creates the parent directory if it is missing.
  - Constraints:
    - Use `import "server-only"` only if it resolves in both Next and Vitest without a
      new dependency. Otherwise stop and ask; adding the `server-only` package needs a
      justification.
    - Never log row contents.
- [x] **T025 Tests: migrations and constraints**
  - Files: `tests/server/migrations.test.ts` (temp-file DB under `os.tmpdir()`).
  - Cases:
    - A fresh DB has `user_version = 1`, one household row with currency PHP, and three
      umbrellas.
    - Reopening does not re-run migrations or duplicate rows.
    - FK violations are rejected.
    - CHECK constraints reject: a `savings` category, an uppercase or invalid colour, and
      a second household row.
    - The partial unique indexes reject duplicate `name_key` among non-merged rows,
      including archived rows, and allow a duplicate once the older row is merged.
- [x] **T026 Stores**
  - Files: `src/server/members-store.ts`, `src/server/categories-store.ts` (categories
    and items).
  - Behavior: prepared statements and row ↔ domain mapping only (snake_case →
    camelCase). No rules.
  - Constraints:
    - Timestamps are `new Date().toISOString()`, set by the service layer and passed in.
    - Reads exclude merged rows unless explicitly requested.
  - Validate: exercised by the service tests in T028 and T047.

## Phase 04 — Members and Household screen [US2, US7]

- [x] **T027 [US2] Member service**
  - Files: `src/server/members-service.ts`.
  - Behavior: `addMember`, `renameMember`, `archiveMember`, `restoreMember`, each in
    `db.transaction`, following data-model.md "State rules → Member".
  - Constraints:
    - Validation comes only from `src/domain` (T017).
    - Duplicate checks include archived members.
- [x] **T028 [US2] Tests: member service** (status transitions, required fields, dates)
  - Files: `tests/server/members-service.test.ts` (`:memory:`).
  - Cases:
    - Transitions: active → archived → active. Archiving an archived member gives
      `invalid_state`. Restoring an active member gives `invalid_state`. Renaming an
      archived member gives `archived`.
    - Blank name gives `validation`.
    - Duplicates: "ana" vs "Ana" is rejected; it is also rejected while Ana is archived.
    - Unknown id gives `not_found`.
    - Timestamps: `created_at` and `updated_at` are ISO-8601. `updated_at` changes on
      rename. `archived_at` is set on archive and cleared on restore.
- [x] **T029 HTTP helpers**
  - Files: `src/server/http.ts`.
  - Behavior:
    - `readBody(request, fields)` takes a per-endpoint field spec (required and optional
      string fields, from the contracts/api.md "Body field types" table). It returns the
      typed body, or `400 validation` with `field` set, for: malformed JSON; a
      non-object body (array, string, number, `null`); unknown keys; a missing required
      field; or any field that is not a string, including `null`.
    - For endpoints with no body, an absent or `{}` body is accepted and any key is
      rejected.
    - Value rules (blank name, hex, umbrella) stay in the `src/domain` validators.
    - `errorResponse(err)` maps `DomainError` codes to statuses per contracts/api.md,
      and any other error to `500 internal` with a generic message.
  - Validate: T030.
- [x] **T030 [P] Tests: HTTP helpers**
  - Files: `tests/api/http.test.ts`.
  - Cases:
    - Every code → status pair in the contract table.
    - A non-domain error gives 500 without leaking its message.
    - `readBody` rejects, with `400 validation` and the right `field`:
      - malformed JSON;
      - a non-object body (`[]`, `"x"`, `1`, `null`);
      - unknown keys;
      - a missing required field;
      - a required field set to `null`;
      - wrong types (number, boolean, array, object) for both required and optional
        fields.
    - `readBody` accepts an absent or `{}` body for no-body endpoints and rejects any key.
- [x] **T031 [US2] Member routes**
  - Files: `src/app/api/members/route.ts` (POST), `src/app/api/members/[id]/route.ts`
    (PATCH), `src/app/api/members/[id]/archive/route.ts` (POST),
    `src/app/api/members/[id]/restore/route.ts` (POST).
  - Behavior: the status codes and bodies in contracts/api.md, "Members".
  - Constraints:
    - Thin: parse, call the service, map errors.
    - `params` is async per the Next 16 route handler docs
      (`node_modules/next/dist/docs/01-app/`).
- [x] **T032 [US2] Tests: member routes**
  - Files: `tests/api/members.test.ts`.
  - Setup: set `CELIA_DB_PATH` to a temp file per test file, or inject a `:memory:` DB
    via `getDatabase`.
  - Cases:
    - 201 on create, 200 on the other three.
    - Each contract error code reachable on these routes.
    - Body validation, one case per kind, for the POST and PATCH routes: `{}` (missing
      `name`), `{ "name": null }`, `{ "name": 123 }`. Each gives `400 validation` with
      `field: "name"`, and nothing is persisted.
    - Archive and restore reject a body that has a field.
- [x] **T033 [US2] Household read model**
  - Files: `src/server/members-read.ts`.
  - Behavior: `getHouseholdView()` calls `await connection()` first, then returns the
    shape in contracts/api.md. Members are sorted by name.
  - Validate: T045. `npm run build` must not create `data/celia.db`.
- [x] **T034 [P] Shared mutation helper**
  - Files: `src/components/ui/use-mutation.ts`.
  - Behavior:
    - `run(url, method, body?)`.
    - On 2xx it calls `router.refresh()` and resolves.
    - On a non-2xx response it returns `{ error: { code, message, field? } }` and does
      not refresh.
    - It exposes a `pending` flag to disable controls.
  - Validate: T045 and T061.
- [x] **T035 [P] Shared confirm dialog**
  - Files: `src/components/ui/confirm-dialog.tsx`.
  - Behavior:
    - Native `<dialog>` with `showModal()`.
    - Escape and ✕ close it.
    - Focus returns to the trigger.
    - Slots for title, body, error text, and cancel/confirm buttons.
    - Confirm can be disabled.
  - Constraints: no dialog library (research R9).
- [x] **T036 [P] Shared empty state**
  - Files: `src/components/ui/empty-state.tsx`.
  - Behavior: muted text block for empty panels.
  - Copy for F01 financial panels: "No entries yet." (proposed; confirm at review).
- [x] **T037 🎨 [US7] Month picker**
  - Files: `src/components/shell/month-picker.tsx` (client).
  - **Match**: HF#L42–L48.
  - Behavior: ◀ and ▶ change the displayed month. Initial value is the current month.
    Label format is "Sep 2026" (HF L610 `MLABEL`; changed from "September 2026" by
    T097).
  - Constraints: display-only client state; it affects no data in F01.
  - Provenance: `lifted from prototype CSS`.
- [x] **T038 🎨 [US2] Household page**
  - Files: `src/app/(shell)/household/page.tsx`,
    `src/components/household/household-screen.tsx` (client).
  - **Match**: HF#L23–L49 (header with the month picker, then "+ Add member") and
    HF#L493–L494 (column stack).
  - Behavior: the server page calls `getHouseholdView()` and passes the result as props.
  - Provenance: `lifted from prototype CSS`.
- [x] **T039 🎨 [US2] Members table**
  - Files: `src/components/household/members-table.tsx`.
  - **Match**: HF#L495–L507 (card, header with member count, row grid) and HF#L1258–L1270
    (row values).
  - Behavior:
    - Columns are member, INCOME VS. OUTGOING, KEEPS, and Remove.
    - The INCOME VS. OUTGOING and KEEPS cells render `EmptyState` (T036). No bars and no
      ₱0 figures.
    - The legend (HF#L508–L512) is not rendered while no figures exist.
  - Provenance: `lifted from prototype CSS`. The empty cells are `recreated manually: no
    hi-fi empty state`.
- [x] **T040 🎨 [US2] Member row**
  - Files: `src/components/household/member-row.tsx`.
  - **Match**: HF#L499 (initial avatar and name, ✎ on hover) and HF#L505 (Remove, red
    fill on hover).
  - Behavior:
    - ✎ switches the name to an input. Enter saves via `PATCH /api/members/:id`; Escape
      cancels.
    - Errors show inline and the name reverts.
  - Provenance: `lifted from prototype CSS`.
- [x] **T041 🎨 [US2] Add member**
  - Files: `src/components/household/add-member.tsx`.
  - Behavior:
    - "+ Add member" (header button, HF#L23–L49 CTA slot) opens an inline name input as
      the first row of the members table.
    - Enter or Save posts; Escape cancels.
    - Blank and duplicate names show an inline error using `validateName` client-side
      plus the server message.
  - Provenance: `recreated manually: the hi-fi has no add state`.
- [x] **T042 🎨 [US2] Remove-member dialog**
  - Files: `src/components/household/remove-member-dialog.tsx`.
  - **Match**: the WF#6a L15–L60 structure (title, explanation, Cancel/Remove), minus the
    "HIS ENTRIES BECOME" reassignment and "September, after removal" sections.
  - Behavior:
    - Copy states that the member is archived, their history is kept, and they can be
      restored.
    - Confirm calls `POST /api/members/:id/archive`.
  - Constraints: do not show "Can't be undone" (the action is reversible).
  - Provenance: `recreated manually: wireframe-only design, styled with T007 tokens`.
- [x] **T043 🎨 [US2] Archived members and restore**
  - Files: `src/components/household/archived-members.tsx`.
  - Behavior:
    - A collapsible "Archived members (N)" block below the members table, hidden when N
      is 0.
    - Each row has Restore, which confirms via T035 and calls
      `POST /api/members/:id/restore`.
  - Provenance: `recreated manually: no hi-fi design`.
- [x] **T044 🎨 [US7] Lower row: Expense per member and Defaults**
  - Files: `src/components/household/expense-per-member-panel.tsx`,
    `src/components/household/defaults-panel.tsx`.
  - **Match**:
    - The lower grid, HF#L515.
    - The Expense per member card chrome and title, HF#L516–L517. The body is
      `EmptyState`; no bars, month labels or legend.
    - The Defaults panel, HF#L535–L544.
  - Behavior: Defaults shows "New entries owned by: Household", "Currency: PHP", and
    "Active model: Not set" (models arrive in F03).
  - Provenance: `lifted from prototype CSS`. The empty body is `recreated manually`.
- [x] **T045 [US2, US7] Tests: Household screen**
  - Files: `tests/components/household-screen.test.tsx` (`fetch` and `next/navigation`
    mocked).
  - Cases:
    - The empty list shows "+ Add member".
    - Add, rename (Enter saves, Escape cancels), remove via dialog, and restore each
      send the right request.
    - A 409 shows inline copy and the UI is unchanged.
    - The financial cells and panels show "No entries yet." with no ₱ figures.
    - Defaults content is correct.
    - The member count excludes archived members.

## Phase 05 — Categories and items [US3, US4, US7]

- [x] **T046 [US3, US4] Category and item service (create, edit)**
  - Files: `src/server/categories-service.ts`.
  - Behavior:
    - `createCategory`: the default colour is `defaultCategoryColor(count of non-merged
      categories)`.
    - `updateCategory` changes name and/or colour.
    - `addItem` and `renameItem`.
    - Everything follows data-model.md "State rules".
  - Constraints: archived categories are read-only (returns `archived`). Validation
    comes only from `src/domain`.
- [x] **T047 [US3, US4] Tests: category and item service**
  - Files: `tests/server/categories-service.test.ts` (`:memory:`).
  - Cases:
    - Required names give `validation`.
    - Category duplicates within an umbrella give `duplicate_name`, including against
      archived categories. The same name in the other umbrella is allowed.
    - Umbrella `savings` or unknown gives `validation`.
    - Colours are stored lowercase; a bad hex gives `validation`; the default colour
      sequence is followed.
    - Item duplicates within a category give `duplicate_name`. The same item name in
      another category is allowed.
    - Update, add-item and rename-item on an archived category (set via the store) give
      `archived`.
    - `not_found`.
    - `updated_at` changes on edit.
- [x] **T048 [US3, US4] Category and item routes (create, edit)**
  - Files: `src/app/api/categories/route.ts` (POST),
    `src/app/api/categories/[id]/route.ts` (PATCH),
    `src/app/api/categories/[id]/items/route.ts` (POST), `src/app/api/items/[id]/route.ts`
    (PATCH).
  - Behavior: per contracts/api.md.
  - Constraints: PATCH requires at least one of `name` or `color`.
- [x] **T049 [US3, US4] Tests: those routes**
  - Files: `tests/api/categories.test.ts`.
  - Cases:
    - Success statuses, plus each applicable error code per the contract.
    - Body validation, each giving `400 validation` with `field` and persisting nothing:
      - `POST /api/categories`: missing `umbrella`, `{ "umbrella": null }`,
        `{ "name": 123 }`, `{ "color": 42 }`.
      - `PATCH /api/categories/:id`: `{}` and `{ "color": null }`.
      - Items routes: missing `name` and `{ "name": false }`.
- [x] **T050 [US3] Categories read model**
  - Files: `src/server/categories-read.ts`.
  - Behavior: `getCategoriesView()` calls `await connection()` and returns non-merged
    categories grouped by umbrella and sorted by name, each with its active items and
    item count, and an archived flag.
- [x] **T051 🎨 [US3] Categories page and two-pane grid**
  - Files: `src/app/(shell)/categories/page.tsx`,
    `src/components/categories/categories-screen.tsx` (client; holds the selected
    category id).
  - **Match**: HF#L233–L234 (grid).
  - Behavior: selects the first category by default. With no categories, the right pane
    shows a create prompt (T060).
  - Provenance: `lifted from prototype CSS`.
- [x] **T052 🎨 [US3] Category list pane**
  - Files: `src/components/categories/category-list.tsx`.
  - **Match**: HF#L235–L247 (card, group headers, rows) and HF#L1023–L1036 (group order
    EXPENSE then INCOME, count label, selected-row style).
  - Behavior:
    - Groups collapse and expand.
    - Each header shows its count.
    - Rows select a category.
  - Provenance: `lifted from prototype CSS`.
- [x] **T053 🎨 [US3] Category row**
  - Files: `src/components/categories/category-row.tsx`.
  - **Match**: HF#L240–L245 (square swatch 11px/radius 3, name, "N items", ✎ on hover).
  - Behavior:
    - ✎ triggers in-place rename via `PATCH /api/categories/:id`.
    - Clicking the swatch opens the colour picker (T054).
  - Provenance: `lifted from prototype CSS`.
- [x] **T054 🎨 [US3] Colour picker popover**
  - Files: `src/components/categories/color-picker.tsx`.
  - Behavior:
    - The popover has a native `<input type="color">`, a hex text field, and
      Save/Cancel.
    - The two inputs stay in sync.
    - An invalid hex shows an inline error and disables Save.
    - Save sends `PATCH {color}`.
  - Constraints: validation comes from `parseHexColor` (T018). Popover styling uses
    tokens (radius 10, 1px border, no shadow).
  - Provenance: `recreated manually: no hi-fi design for the picker`.
- [x] **T055 🎨 [US3] Create category**
  - Files: `src/components/categories/add-category.tsx`.
  - **Match (structure)**: the WF#1d L644–L736 per-group "+ add expense category" and
    "+ add income category" links.
  - Behavior: opens an inline name input in that group; Enter posts
    `{umbrella, name}`.
  - Provenance: `recreated manually: hi-fi has no create control`.
- [x] **T056 🎨 [US3] Detail header**
  - Files: `src/components/categories/category-detail-header.tsx`.
  - **Match**: HF#L250–L251 (18px swatch, 20px/600 name).
  - Constraints: the Merge and Archive buttons (HF#L252) are added in T066, not here.
  - Provenance: `lifted from prototype CSS`.
- [x] **T057 🎨 [US7] Summary panel (empty)**
  - Files: `src/components/categories/category-summary-panel.tsx`.
  - **Match**: HF#L254–L255 (panel chrome and grid).
  - Behavior: the body is `EmptyState` ("No entries yet."). No spend figure, budget line
    or gauge SVG (HF#L256–L270 are not rendered).
  - Provenance: `lifted from prototype CSS` for the chrome; `recreated manually` for the
    empty body.
- [x] **T058 🎨 [US4] Items table**
  - Files: `src/components/categories/items-table.tsx`.
  - **Match**: HF#L272–L280 (header ITEM · ENTRIES · month, and the row grid).
  - Behavior:
    - The ENTRIES and month cells show "—" (the handoff's empty-value glyph).
    - The month header uses the 3-letter current month.
  - Provenance: `lifted from prototype CSS`.
- [x] **T059 [US4] Add and rename items**
  - Files: `src/components/categories/item-row.tsx`, `src/components/categories/add-item.tsx`.
  - **Match (structure)**: WF#1d L644–L736 ("click to rename", "+ add item").
  - Behavior:
    - Rename in place: Enter saves, Escape cancels.
    - "+ add item" opens an inline input and posts to `/api/categories/:id/items`.
    - Errors show inline.
- [x] **T060 [US3, US4] Empty states**
  - Files: `src/components/categories/categories-screen.tsx`.
  - Behavior:
    - No categories: both groups are empty and the right pane shows "Create a category
      to get started." (proposed copy).
    - A category with 0 items shows "0 items" and an empty table with "+ add item".
- [x] **T061 [US3, US4, US7] Tests: Categories screen**
  - Files: `tests/components/categories-screen.test.tsx` (`fetch` and `next/navigation`
    mocked).
  - Cases:
    - Group order and counts.
    - Selecting a category.
    - Create, rename and colour flows send the right requests.
    - An invalid hex disables Save.
    - A 409 duplicate shows inline copy and the UI is unchanged.
    - Swatches are square (radius token).
    - The summary panel shows no ₱ figures.
    - Add and rename items.
    - Empty states.

## Phase 06 — Move, Merge, Archive [US4, US5, US6]

- [x] **T062 [US4, US5, US6] Service operations**
  - Files: `src/server/categories-service.ts`.
  - Behavior: `moveItem`, `mergeCategory` (the data-model.md "Merge algorithm", one
    transaction), `archiveCategory`, `restoreCategory`.
  - Constraints:
    - No row deletes.
    - Merge returns `{ target, movedItemIds, combined[] }`.
    - Move into a same-name clash gives `duplicate_name`.
- [x] **T063 [US4, US5, US6] Tests: operations** (status transitions, atomicity,
  persistence)
  - Files: `tests/server/categories-operations.test.ts`.
  - Cases:
    - **Transitions**: active → archived → active. Active → merged is terminal: archive,
      restore, edit, or use as source or target all give `archived`. Archiving an
      archived category gives `invalid_state`; restoring an active one gives
      `invalid_state`. `archived_at` is set and cleared.
    - **Move**: other umbrella gives `umbrella_mismatch`. Same category gives
      `same_category`. Archived destination or source category gives `archived`. A
      name clash gives `duplicate_name`. On success the item id is unchanged and
      `category_id` is updated.
    - **Merge**: the move path, the combine path (`merged_into_item_id` set), and
      multiple matches. Source `merged_into_category_id` is set. Afterwards the source
      name is reusable in that umbrella.
    - **Atomicity**: force a failure after the first item update (e.g. a temporary
      `BEFORE UPDATE` trigger that raises on the source category). All item and category
      rows are unchanged afterwards.
    - **Persistence round-trip**: on a temp-file DB, perform the operations, close,
      reopen, and check the state is identical.
- [x] **T064 [US4, US5, US6] Routes**
  - Files: `src/app/api/categories/[id]/archive/route.ts`,
    `src/app/api/categories/[id]/restore/route.ts`,
    `src/app/api/categories/[id]/merge/route.ts`, `src/app/api/items/[id]/move/route.ts`.
  - Behavior: per contracts/api.md.
- [x] **T065 [US4, US5, US6] Tests: those routes**
  - Files: `tests/api/category-operations.test.ts`.
  - Cases:
    - Success bodies, including the merge body shape.
    - Each contract error code, including `archived` for archive and restore on a
      merged category.
    - Body validation for merge and move: missing `targetCategoryId`,
      `{ "targetCategoryId": null }`, `{ "targetCategoryId": 7 }`. Each gives
      `400 validation` with `field: "targetCategoryId"`, and nothing changes.
    - Archive and restore reject a body that has a field.
- [x] **T066 🎨 [US5, US6] Detail header actions and archived state**
  - Files: `src/components/categories/category-detail-header.tsx`.
  - **Match**: HF#L252 (Merge and Archive buttons).
  - Behavior:
    - When the category is archived: show Restore in place of Archive, and disable
      Merge.
    - In the list row, items table and detail, the rename, swatch picker, add-item and
      Move affordances are hidden or disabled with a reason.
  - Provenance: `lifted from prototype CSS` for the buttons; `recreated manually` for
    the Restore and disabled states.
- [x] **T067 🎨 [US6] Archived marker in the list**
  - Files: `src/components/categories/category-row.tsx`.
  - Behavior: an archived category stays in its group with an "ARCHIVED" caps label
    (11px, muted) after the name (HR "Categories & items", "archived categories stay in
    their group with a marker").
  - Constraints: the marker is not green, amber or red, and is not a circle.
  - Provenance: `recreated manually: hi-fi has no archived state`.
- [x] **T068 🎨 [US4] Move-item dialog**
  - Files: `src/components/categories/move-item-dialog.tsx`, plus a Move action per row
    in `item-row.tsx`.
  - **Match (structure)**: WF#3c L246–L280, including the title, the "All N entries
    under <item> move with it." line (N is 0 in F01), and FROM → TO. Exclude "Past
    months change shape" and "Move history too… All history / From Sep".
  - Behavior:
    - TO lists active same-umbrella categories other than the current one.
    - Move is disabled until one is chosen.
    - Calls `POST /api/items/:id/move`.
    - Errors show in the dialog.
  - Provenance: `recreated manually: wireframe-only, styled with T007 tokens`.
- [x] **T069 🎨 [US5] Merge dialog**
  - Files: `src/components/categories/merge-category-dialog.tsx`.
  - **Match (structure)**: WF#3a L313–L363, including MERGE THIS → INTO, "What moves"
    (item count and entries, 0 in F01), the same-name list, and "Can't be undone".
    Exclude the "Model budgets" section and the "Combine / Keep both" choice.
  - Behavior:
    - INTO lists other active same-umbrella categories; Merge is disabled until one is
      chosen.
    - The same-name items are listed as "will be combined" using `nameKey`.
    - Calls `POST /api/categories/:id/merge`.
  - Provenance: `recreated manually: wireframe-only`.
- [x] **T070 🎨 [US6] Archive dialog**
  - Files: `src/components/categories/archive-category-dialog.tsx`.
  - **Match (structure)**: WF#3b L281–L312 (title, "Nothing is deleted", three ✓ lines,
    Cancel/Archive). Exclude the "N models still budget for it" section.
  - Behavior: calls `POST /api/categories/:id/archive`. Restore (from T066) uses the T035
    confirm dialog and `POST /api/categories/:id/restore`.
  - Provenance: `recreated manually: wireframe-only`.
- [x] **T071 [US4, US5, US6] Tests: dialogs**
  - Files: `tests/components/category-dialogs.test.tsx`.
  - Cases:
    - Move and Merge are disabled until a destination is chosen.
    - Pickers exclude archived categories, the other umbrella, and self.
    - The merge preview lists same-name combines.
    - Confirm sends the right request.
    - A 409 keeps the dialog open with the message.
    - Cancel sends nothing.
    - Archive and Restore flows work.
    - An archived category shows its marker and disabled edit affordances.
- [x] **T072 [US4] Single-category edge case**
  - Files: `move-item-dialog.tsx`, `merge-category-dialog.tsx`.
  - Behavior: when no valid destination exists, the action is disabled with the reason
    "No other active <Income|Expense> category".
  - Validate: add cases to T071.

## Phase 07 — Release Prep

- [x] **T073 Version bump to 3.0.0**
  - Files: `package.json` (`version`) and `package-lock.json` (root `version` and
    `packages[""].version`).
  - Constraints: there is no in-app version display to update.
  - Validate: `npm ci` succeeds and both files read 3.0.0.
  - Validation note (Windows, 2026-10-30): `npm ci` exits 1 while compiling
    `better-sqlite3`; `node-gyp` cannot find the Visual Studio C++ Build Tools. No
    project dev server or Vitest process was running, so the failure is not a file lock.
  - Validated (2026-10-31): CI's push run of `920f8e0` passed `npm ci` on Ubuntu with
    Node 22
    ([run 41171446716](https://github.com/reso830/Project_Celia/actions/runs/41171446716)),
    and `package.json`, `package-lock.json` `version` and `packages[""].version` read
    3.0.0.
- [x] **T074 [P] Create CHANGELOG.md**
  - Files: `CHANGELOG.md` (new).
  - Behavior: a "3.0.0 — 2026-MM-DD (merge date)" entry for F01 Core Tracking covering:
    - the v3 shell;
    - household members (add, rename, archive, restore);
    - categories and items (create, rename, colour, move, merge, archive, restore);
    - local SQLite persistence;
    - **Breaking**: the v2 app and IndexedDB storage are removed, and v2 data is not
      migrated.
- [x] **T075 [P] Create docs/feature_roadmap.md**
  - Files: `docs/feature_roadmap.md` (new).
  - Behavior:
    - A table of features with status, and F01 Core Tracking ticked.
    - List F02 Entries and F03 Budget & Savings as named in the brief.
    - List Dashboard and Forecaster as "number TBD", since the brief doesn't number
      them.
    - Link each brief under `docs/features/`.
  - Constraints: invent no scope beyond feature names that appear in the brief.
- [x] **T076 [P] Create docs/REPO_MAP.md**
  - Files: `docs/REPO_MAP.md` (new).
  - Behavior: a one-line purpose for each of `src/app/(shell)`, `src/app/api`,
    `src/domain`, `src/server`, `src/server/db`, `src/components/{shell,household,
    categories,ui}`, `tests/{domain,server,api,components}`, `specs/`, `docs/features/`,
    `handoff/`, `scripts/prompts/`, `.specify/`.
- [x] **T077 [P] README.md**
  - Files: `README.md`.
  - Behavior:
    - Replace the v2 description with the v3 scope.
    - Document prerequisites (a native module build for `better-sqlite3`), the
      `CELIA_DB_PATH` default, loopback-only binding, and "not deployable to serverless
      hosting".
    - Update the Architecture section to the plan's layers.
    - Link CHANGELOG, the roadmap and REPO_MAP.
  - Constraints: do not create `docs/deployment.md` (user decision).
- [x] **T078 Docs sanity check**
  - Files: README.md, CHANGELOG.md, docs/feature_roadmap.md, docs/REPO_MAP.md,
    specs/v3-001-core-tracking/quickstart.md.
  - Checks:
    - Commands exist in `package.json`.
    - `CELIA_DB_PATH` and its default match across files.
    - Relative links resolve.
    - No references to removed v2 routes or `fake-indexeddb` remain.
  - Validate: `npm run format:check`.

## Phase 08 — Browser Smoke Test

Run against the to-be-merged state after Release Prep. Delete `./data/smoke.db` first and
run `CELIA_DB_PATH=./data/smoke.db npm run dev` (quickstart.md "Run"). Each task walks
one quickstart block. Record pass/fail by ticking the task, and note any failure in the
PR.

- [x] **T079** Confirm the dev server listens only on `127.0.0.1:3000`. Navigating to
  the machine's LAN IP must fail.
- [x] **T080 [US1]** Walk quickstart "US1 — Shell", including no horizontal scroll at
  1100px.
- [x] **T081 [US2]** Walk quickstart "US2 — Members", including a reload after each
  step.
- [x] **T082 [US3]** Walk quickstart "US3 — Categories".
- [x] **T083 [US4]** Walk quickstart "US4 — Items", including the move name-clash
  rejection.
- [x] **T084 [US5]** Walk quickstart "US5 — Merge", including reuse of the merged name.
- [x] **T085 [US6]** Walk quickstart "US6 — Archive", including that archived categories
  are absent from the pickers.
- [x] **T086 [US7]** Walk quickstart "US7 — Household panels and defaults".
- [x] **T087** Stop the server, restart it with the same `CELIA_DB_PATH`, and confirm
  all data from T081–T085 is intact.
- [x] **T088** Keyboard pass:
  - The rail is reachable by Tab.
  - Rename: Enter saves, Escape cancels.
  - Dialogs trap focus, close on Escape, and return focus to the trigger.
  - Result (2026-10-30): **fail**, colour picker only. Rail Tab order, rename
    Enter/Escape (member, category, item) and the native dialogs (Remove member, Move,
    Merge, Archive) pass. The colour picker popover lets Tab leave it, and once focus is
    outside, Escape no longer closes it. Fix: T094.
  - Re-run after T091–T100 (2026-10-30): **pass**. All five dialogs, including the colour
    picker, keep focus inside, close on Escape and return focus to their trigger.
- [x] **T089** Contrast and no-shadow pass. Check with devtools that muted text, disabled
  controls and the archived marker are at least 4.5:1, and that no `box-shadow` is
  computed on shell, cards, popovers or dialogs.
- [x] **T090** Tier 2 visual review for every 🎨 task:
  - Tasks: T007, T011–T013, T037–T044, T051–T058, T066–T070.
  - Capture frozen-state screenshots at 1100, 1280 and 1440px and compare side by side
    with the cited HF or WF lines.
  - Log any mismatch as a fix task. Only if a deviation is accepted, create a deviation
    ledger in `specs/v3-001-core-tracking/`.
  - Result (2026-10-30): **fail**. Mismatches are logged as T091–T100.
  - Re-run after T091–T100 (2026-10-30): **fail**, two new findings (T101, T102).
    Everything T091–T100 touched now matches the hi-fi at 1280px: rows and group headers,
    card positions, Merge and Archive size and colours, dialog centring and backdrop,
    month labels and header buttons. The member row is 57px against the hi-fi's 59px
    only because the hi-fi row holds 32px of income bars; padding and border match, and
    F01 has no entries to draw.
  - Re-run after T101–T105 (2026-10-31, Next.js 16.4.3): **pass**. Screenshots at 1100,
    1280 and 1440px match the hi-fi apart from the accepted deviation (D1) and the
    member-row height noted above. Defaults keeps its own height, and the archived
    "+ add item" renders muted.

## Phase 08 fixes

Found by the 2026-10-30 smoke run. Re-run the affected T088 or T090 checks after each fix.

T091–T100 were fixed and re-verified in the browser on 2026-10-30. Notes on fixes that go
beyond their task text:

- T092: the dialog's close glyph also takes the hi-fi size (17px, HF L554), because the
  dialog-level font size would otherwise have shrunk it.
- T094: the picker cycles Tab and Shift+Tab itself, instead of relying on the browser's
  Tab order, so it also works where Tab skips buttons (macOS Safari).
- T095: the list card keeps `overflow: visible`, so the colour picker is never clipped. Its
  first and last elements take the inner radius instead.
- T096: Merge, Archive and Restore take the HF padding and 8px gap (HF L250–L252), so the
  header buttons match the hi-fi at the new line-height.
- T097: the month label cell is `box-content`, so it keeps the hi-fi's 118px width.

- [x] **T091 Dialogs open in the top-left corner**
  - Files: `src/components/ui/confirm-dialog.tsx`.
  - Found: every `ConfirmDialog` (Remove and Restore member, Move, Merge, Archive,
    Restore category) renders at (0,0) with `margin: 0`. Tailwind's preflight removes
    the user-agent `margin: auto` that centres a modal `<dialog>`.
  - Fix: restore centring (for example `m-auto`) and check the backdrop.
- [x] **T092 Dialog text size depends on where the dialog is mounted**
  - Files: `src/components/ui/confirm-dialog.tsx`.
  - Found: the dialog has no font size of its own, so it inherits from its parent. Merge,
    Archive and Restore (mounted in the detail header) render at 16px with 42px buttons;
    Move (mounted in an item row) renders at 13.5px with 38px buttons.
  - Fix: set an explicit body font size on the `<dialog>` from the T007 tokens.
- [x] **T093 Disabled confirm buttons look enabled**
  - Files: `src/components/ui/confirm-dialog.tsx`.
  - Found: Move item and Merge category are disabled until a destination is chosen, but
    keep the full accent fill and `opacity: 1`, so they look clickable.
  - Fix: add a disabled style that still meets 4.5:1 contrast.
- [x] **T094 Colour picker focus handling**
  - Files: `src/components/categories/color-picker.tsx`.
  - Found: Tab moves focus from the popover to the page behind it, the popover stays
    open, and Escape stops working.
  - Fix: keep focus in the popover, or close it when focus leaves. Escape must close it
    and return focus to the swatch.
- [x] **T095 🎨 Category list card corners**
  - Files: `src/components/categories/category-list.tsx`.
  - Found: the grey EXPENSE group header paints square corners over the card's rounded
    top edge (`aside` has `overflow: visible`). Match HF category list card.
- [x] **T096 🎨 Archive button colour**
  - Files: `src/components/categories/category-detail-header.tsx`.
  - Found: Archive has a red border and red text. HF#L252 styles Merge and Archive the
    same: `#d5d8d8` border, `#5c6467` text.
- [x] **T097 🎨 Month labels**
  - Files: `src/components/shell/month-picker.tsx`,
    `src/components/categories/category-summary-panel.tsx`.
  - Found: the app shows "October 2026" and "October 2026 spend". The hi-fi uses short
    months (`MLABEL`: "Sep 2026", "Sep 2026 spend").
- [x] **T098 🎨 Household header spacing**
  - Files: `src/components/household/household-screen.tsx`.
  - Found: the members card starts at y=103px; in the hi-fi it starts at 89px (Categories
    already matches at 89px). The extra 14px is one flex gap too many.
- [x] **T099 Count wording**
  - Files: `src/components/household/members-table.tsx`,
    `src/components/categories/category-list.tsx`.
  - Found: "1 members" after a removal, and the group header would show "1 categories".
    Use singular for 1, as the category rows already do ("1 item").
- [x] **T100 🎨 Rail icon colour and row height**
  - Files: `src/app/globals.css`, `specs/v3-001-core-tracking/deviations.md`.
  - Found:
    - Idle rail icons use `#5c6467`; HF uses `#6f7679`.
    - Category and item rows are 43.25px tall against 40px in HF, and group headers are
      39.5px against 37px. The cause is the base line-height, not the ✎ button:
      Tailwind's preflight sets `line-height: 1.5`, while the prototype's base CSS
      (HF L10) leaves it at `normal`. Adding `line-height: 1.5` to the HF reproduces the
      app's heights exactly.
  - Decision (user, 2026-10-30):
    - Keep the rail colour and record it in the deviation ledger. `#6f7679` is 3.45:1 on
      the rail, below the 4.5:1 text rule; `#5c6467` is 4.51:1.
    - Fix the row height by setting the base line-height to `normal`.
- [x] **T101 🎨 Household bottom grid stretches the Defaults card**
  - Files: `src/components/household/household-screen.tsx`.
  - Found (T090 re-run): the 65/35 grid holding Expense per member and Defaults has no
    `align-items: start` (HF L515), so Defaults stretches to Expense's height (both end
    at y=507px at 1280px). In the hi-fi each card keeps its own height.
  - Fix: add `items-start` to that grid.
- [x] **T102 🎨 Disabled "+ add item" looks enabled**
  - Files: `src/components/categories/add-item.tsx`.
  - Found (T090 re-run, archived state from T066): on an archived category the button is
    disabled but keeps the accent colour `rgb(47, 125, 120)`, identical to the enabled
    button. Other disabled controls in the archived state (Merge, Move) look disabled.
  - Fix: add a disabled style (for example `disabled:text-celia-muted` and a not-allowed
    cursor, as the item-row Move button does) that stays at least 4.5:1.

## PR #26 review fixes

Found by the final-gate reviews of PR #26 (Claude and Codex), fixed 2026-10-31.

- [x] **T103 Reset the new-item draft when the selected category changes**
  - Files: `src/components/categories/items-table.tsx`,
    `src/components/categories/add-item.tsx`.
  - Found: `AddItem` was not keyed, so a half-typed item name survived a change of
    category and Enter added it to the newly selected category. On an archived category
    the input also stayed editable.
  - Fix: key `AddItem` by category id, and render the input only while the button is
    enabled. Test: "drops an unfinished item draft when another category is selected".
- [x] **T104 Allow retrying a valid colour after a failed save**
  - Files: `src/components/categories/color-picker.tsx`.
  - Found: Save was disabled whenever an error message was shown, including request
    errors, so a valid colour could not be retried.
  - Fix: Save depends only on whether the colour is valid and on the pending request.
    Test: "lets a valid colour be saved again after a failed request".
- [x] **T105 Security update for Next.js**
  - Files: `package.json`, `package-lock.json`.
  - Found: `npm audit --omit=dev` reported advisories in `next@16.2.10` (one critical)
    and in the packages it bundles (`postcss`, `sharp`, `nanoid`, `source-map-js`,
    `baseline-browser-mapping`). None applied to how F01 runs (no middleware, Server
    Actions or custom server; loopback only).
  - Fix: `next` and `eslint-config-next` to 16.4.3, plus `npm audit fix` (no
    `--force`). Production dependencies now report 0 vulnerabilities. Sixteen moderate
    dev-only advisories remain in ESLint's `minimatch` chain; npm's only "fix" is a
    downgrade to eslint 4 / eslint-config-next 0.2.4, so they are left as they are.

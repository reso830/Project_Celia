# Implementation Plan: F01 — Core Tracking

**Branch**: `v3-001-core-tracking` | **Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)
**Input**: `specs/v3-001-core-tracking/spec.md`, `docs/features/v3-001-core-tracking.md`,
`handoff/celia_v3_001.zip`

## Summary

F01 has three parts:

1. **Replace the v2 app.** Remove the v2 screens, components and IndexedDB code. v3 starts
   with fresh storage.
2. **Build the persisted foundation.** A server-side local SQLite store for the household,
   umbrellas, members, categories and items. Pure domain rules, use-case services and JSON
   route handlers sit on top of it.
3. **Build the screens.** The hi-fi v3 shell, the Categories & items screen, and the
   Household screen. Merge, Archive, Move and Remove dialogs follow wireframe structure with
   hi-fi tokens.

Nothing is ever deleted. Archive, merge and combine are state changes that keep history
resolvable. No financial calculations are introduced.

## Technical Context

- **Language/Version**: TypeScript 5 (strict), Node.js 22 (CI) / 24 (local)
- **Primary Dependencies**: Next.js 16.4 App Router, React 19.2, Tailwind CSS 4.
  New: `better-sqlite3`, `server-only`, with `@types/better-sqlite3` as a dev dependency.
- **Storage**: A local SQLite file at `CELIA_DB_PATH` (default `./data/celia.db`), accessed
  only on the server. Versioned migrations use `PRAGMA user_version`.
- **Testing**: Vitest 4. Domain, store, service and route-handler tests run in the `node`
  environment against in-memory or temp-file SQLite. Component tests use jsdom and React
  Testing Library. A Browser Smoke Test phase walks the spec's Independent Tests.
- **Target Platform**: Desktop browsers at 1280–1440px, with no horizontal scroll at 1100px
  or more. The Next.js server runs locally on `127.0.0.1`.
- **Project Type**: Single Next.js web app (UI and server in one project).
- **Performance Goals**: The UI should feel immediate for household-scale data (tens of
  members and categories, hundreds of items). No optimisation work is planned.
- **Constraints**:
  - No drop shadows, and text contrast of at least 4.5:1.
  - All visual values come from tokens.
  - Fonts are Sora (UI) and JetBrains Mono (figures).
  - The server must not be reachable off-machine.
- **Scale/Scope**:
  - 7 routes: 2 functional, 5 placeholders.
  - About 11 mutation endpoints.
  - 5 tables, plus the structural `household` and `umbrellas` rows.

## Constitution Check

Checked against `.specify/memory/constitution.md` (Celia v3). *Gate: before research,
re-checked after design.* **Result: pass, with no violations.**

| Principle | How the plan complies |
|---|---|
| I–II SDD, accelerated | Traceable to spec user stories; artifacts limited to what the data change needs |
| III Prototype as visual truth | Hi-fi drives shell, Categories and Household; wireframes drive dialog structure; prototype state/inline styles not reused |
| IV Domain integrity | Umbrellas are a fixed lookup table; Savings holds no categories; moves and merges stay within an umbrella |
| V Historical integrity | No deletes. Archive and restore are reversible. Merge and combine keep rows with pointers. The merge is one transaction |
| VI Single source of truth | Counts are derived. UI re-reads from the server after writes (`router.refresh()`) and keeps no parallel state. Category colour lives only on the category |
| VII Proven need | No repository interface, ORM, state library, or icon library. Store modules are concrete |
| VIII Clear boundaries | Domain is pure; SQL stays in store modules; route handlers are thin adapters; components only render and submit |
| IX Persistence | SQLite file with versioned migrations from day one |
| X Precision | No money is stored in F01. Future money columns are INTEGER (data-model.md) |
| XI–XII Testing / verification | High-risk rules (uniqueness, archive read-only, move, merge atomicity, migrations) get automated tests. UI tests cover key workflows. Visual pass planned |
| XIII Accessibility | Native `<dialog>`, keyboard rename (Enter/Escape), labelled controls, 4.5:1 contrast, no horizontal scroll at 1100px or more |
| XIV Design tokens | Handoff tokens become CSS variables and Tailwind `@theme`. Identity swatches are squares; status marks are circles |
| XV AI-assisted | Phases are bounded, with objective checks (quickstart.md) |
| XVI Recoverability | One phase per commit series; v2 removal is isolated in Phase 1 |
| XVII Dependencies | `better-sqlite3` justified in research R1; `server-only` in R11. `fake-indexeddb` removed |
| XVIII Privacy | Loopback binding, git-ignored `data/`, no logging of names |
| XIX Performance | No speculative optimisation |

### Compliance note (from plan prompt)

- **Required-field impact**: none. Celia's constitution defines no required application
  fields. The prompt's list (company name, job title, status, `last_status_update`,
  responsibilities) belongs to another project and does not apply.
- **Centralized validation**:
  - `validateName`, `nameKey`, `parseHexColor` and `isClassifiableUmbrella` in
    `src/domain` are the only validators.
  - Services use them on the server, forms use them on the client for inline errors, and
    the database constraints are a backstop.
- **New dependencies**:
  - `better-sqlite3` is required for the user-chosen SQLite runtime. It is mature,
    synchronous, and externalised by Next.js by default. `node:sqlite` was rejected because
    it is still experimental (research R1).
  - `@types/better-sqlite3` is types only.
  - `server-only` is the user-approved marker that prevents accidental client imports of
    SQLite modules. Vitest aliases its provided no-op server entry for node tests (research R11).
  - `fake-indexeddb` is removed along with v2.
- **Persistence runtimes**:
  - There is no `createRepositories(config)` in this codebase. The user chose local SQLite
    only, and hosted runtimes (Supabase) are a spec non-goal.
  - Store modules isolate SQL, so a second runtime could be introduced later without
    touching domain or UI.

## Architecture

```text
Browser                                   Next.js server (127.0.0.1)
─────────────────────────────────────     ─────────────────────────────────────────────
app/(shell)/categories/page.tsx  (RSC) ──► server/categories-read.ts ─┐
app/(shell)/household/page.tsx   (RSC) ──► server/members-read.ts    ─┤
   │ props                                                            ├► server/db (better-sqlite3,
   ▼                                                                  │   migrations, user_version)
components/categories/* (client)                                      │
components/household/*  (client)                                      │
   │ fetch JSON  ───────────────────────► app/api/**/route.ts          │
   │                                        │ parse + map errors       │
   │                                        ▼                          │
   │                                     server/*-service.ts ─────────►┤ server/*-store.ts (SQL)
   │                                        │ uses domain validation   │
   ◄── 2xx → router.refresh() ────────────  ▼                          │
       4xx → inline error, UI unchanged  domain/* (pure) ◄─────────────┘
```

**Layers**

- **`src/domain`**: types (`Umbrella`, `Member`, `Category`, `Item`, `Owner`, `HexColor`),
  validation, name keys, the default-colour sequence, and `DomainError` with the codes from
  contracts/api.md. No I/O.
- **`src/server/db`**:
  - `openDatabase(path)` sets pragmas and runs migrations.
  - `getDatabase()` is a process-wide singleton reading `CELIA_DB_PATH`.
  - `migrations.ts` holds the ordered SQL.
  - Everything is marked `import "server-only"`.
- **`src/server/*-store.ts`**: row ↔ domain mapping and prepared statements. There is no
  business logic here.
- **`src/server/*-service.ts`**:
  - One function per use case: add/rename/archive/restore member; create/update/archive/
    restore/merge category; add/rename/move item.
  - Each validates input, checks state rules, runs in `db.transaction`, and throws
    `DomainError`.
- **`src/server/*-read.ts`**: `getCategoriesView` and `getHouseholdView`, each calling
  `await connection()`.
- **`src/app/api/**`**: thin handlers that parse the body, call a service, and map
  `DomainError` codes to statuses.
- **`src/app/(shell)`**: a route group whose `layout.tsx` renders the rail and content
  column.
  - Routes: `/` (Dashboard placeholder, the landing screen), `/entries`, `/categories`,
    `/savings`, `/models`, `/forecaster`, `/household`.
- **`src/components`**:
  - Shell: `app-rail`, `nav-icon`, `page-header`, `month-picker`, `empty-state`.
  - `categories/`: category list, category row, detail pane, items table, colour picker,
    inline rename, and the move, merge and archive dialogs.
  - `household/`: members table, member row, archived members, the remove and restore
    dialogs, and the defaults panel.
  - Shared: `confirm-dialog`, `use-mutation` (a small fetch helper that calls
    `router.refresh()` on success and returns the error otherwise).

**Data flow for a mutation** (e.g. Merge):

1. The dialog computes a preview from the props it already has: item count, same-name
   combines, and entries (0 in F01).
2. The user picks INTO; Merge is enabled.
3. The client sends `POST /api/categories/:id/merge`.
4. `mergeCategory` runs the data-model algorithm in one transaction.
5. On 200 the client calls `router.refresh()`. The page re-reads and the source category
   disappears from active use.
6. On 4xx the dialog shows `message`, and nothing changes.

**Client-only state** (not persisted): the selected category, collapsed groups, which
dialog is open, the inline-rename draft, the colour picker's open state, and the Household
month picker (display only; the panels are empty in F01).

## Phases

Each phase ends with lint, format:check, typecheck, test and build passing.

1. **Replace v2, lay foundations**
   - Delete the v2 app, components, data, domain and tests.
   - Add the dependencies, the loopback `-H 127.0.0.1` scripts, and `data/` in `.gitignore`.
   - Add tokens and fonts in `globals.css` and the layout.
   - Add the shell route group with the rail and seven routes. Five are title-only
     placeholders; `/` is Dashboard.
   - *Covers US1.*
2. **Persistence and domain core**
   - Add the domain types and validation, `server/db` with migration 1, and the stores.
   - Tests: migrations on a fresh DB are idempotent; the constraints hold.
3. **Members**
   - Member service, API routes, `getHouseholdView`.
   - The Household screen: members table, add, in-place rename, the remove (archive)
     dialog, the archived list with restore, empty financial panels, and Defaults.
   - *Covers US2 and US7.*
4. **Categories and items**
   - Category and item services, API routes, `getCategoriesView`.
   - The Categories screen: groups, create, rename, colour picker, detail pane with an
     empty summary panel, and the items table with add and rename.
   - *Covers US3, US4 AC1–2 and AC6, and US7 AC4.*
5. **Move, Merge, Archive**
   - Service operations and their dialogs, with archived markers and read-only archived
     categories.
   - *Covers US4 AC3–5, US5 and US6.*
6. **Docs and verification**
   - Update the README (architecture, `CELIA_DB_PATH`, loopback, v3 scope).
   - Run the Browser Smoke Test from quickstart.md and a visual pass against the hi-fi at
     1100, 1280 and 1440px.

## Validation Approach

| Layer | Environment | What is proven |
|---|---|---|
| Domain unit | node | `validateName`, `nameKey` (trim/case), `parseHexColor`, default-colour sequence, umbrella guard |
| Migrations | node, temp file | Fresh DB → `user_version = 1`, fixed rows present; reopening does not re-run; foreign keys enforced |
| Services | node, `:memory:` | Every contract error code; uniqueness includes archived and excludes merged; archived categories are read-only; move rules; merge combine and move paths; merge atomicity (forced failure mid-merge leaves DB unchanged); restore round-trip |
| Persistence round-trip | node, temp file | Write, close, reopen, same data (spec "survives reloads") |
| Route handlers | node | Body parsing, unknown-field rejection, `DomainError` → status/body mapping, 201 vs 200 |
| Components | jsdom + RTL, `fetch` mocked | Rail links and active state; category create/rename/colour flows; dialogs enable only with a valid destination; inline error on 4xx leaves UI unchanged; empty states; archived marker and disabled actions |
| Browser smoke | real server, fresh `CELIA_DB_PATH` | Each spec Independent Test (quickstart.md) |
| Visual | real browser | Hi-fi comparison, no horizontal scroll at 1100px or more, no shadows, contrast |

## Risks and Tradeoffs

| Risk / tradeoff | Mitigation |
|---|---|
| Native module (`better-sqlite3`) install on Windows / CI Node 22 | Prebuilt binaries exist for both. Verify `npm ci` in CI during Phase 1 |
| Pages accidentally prerendered at build (sync driver) | `await connection()` in every read function; `next build` must not create `data/celia.db` (checked in Phase 1) |
| No auth on mutation API | Loopback binding; documented. Any network exposure requires a constitution-level decision |
| Serverless hosting incompatible with a local file | Deployment out of scope; stated in README |
| Deleting v2 loses working features (transactions, charts) | User-approved; F02+ rebuild them. The v2 code remains in git history |
| Combined items keep rows that are never shown | Needed for history until F02 re-points entries. Excluded by `merged_into_item_id IS NULL` in reads |
| Unicode nav glyphs instead of an icon set | One `NavIcon` map; swapping is local |
| Free-form colours may resemble status hues | Accepted by the user. Shape (square vs. circle) carries the distinction |

## Project Structure

### Documentation (this feature)

```text
specs/v3-001-core-tracking/
├── spec.md
├── plan.md                 # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── checklists/plan-review.md
```

### Source code (target)

```text
src/
  app/
    layout.tsx                    # fonts, tokens, <html>/<body> (modified)
    globals.css                   # design tokens (modified)
    (shell)/layout.tsx            # rail + content column
    (shell)/page.tsx              # Dashboard placeholder (landing)
    (shell)/{entries,savings,models,forecaster}/page.tsx   # placeholders
    (shell)/categories/page.tsx
    (shell)/household/page.tsx
    api/members/…, api/categories/…, api/items/…           # route handlers
  domain/                         # umbrella, member, category, item, owner, validation, errors, colors
  server/
    db/{database,migrations}.ts
    members-{store,service,read}.ts
    categories-{store,service,read}.ts   # categories + items
  components/
    shell/…, categories/…, household/…, ui/…
tests/
  domain/…, server/…, api/…, components/…
```

## Affected Areas

**Inspect only**

- `package.json`, `package-lock.json` scripts and deps (before modifying).
- `.github/workflows/ci.yml`: confirm Node 22 + `npm ci` builds the native module. No change
  expected.
- `vitest.config.ts`: confirm a per-file `@vitest-environment node` works with the global
  jsdom default. Modify only if it doesn't.
- `eslint.config.mjs`, `tsconfig.json`: no change expected.
- `src/domain/php-amount.ts` (v2): check before deleting whether the peso formatting logic
  is worth porting. F01 does not render money, so formatting is otherwise deferred to F02.
- `handoff/celia_v3_001.zip`: hi-fi and wireframes, for the visual pass.

**Modify**

- `package.json`:
  - Add `better-sqlite3` and `@types/better-sqlite3`; remove `fake-indexeddb`.
  - `dev`/`start` scripts gain `-H 127.0.0.1`.
  - Rename the package from `celia-next-scaffold`: *optional, inspect with the user*.
- `.gitignore`: add `/data/`.
- `src/app/layout.tsx`: drop `DataProvider` and `DataStateGate`; use the Sora and
  JetBrains Mono fonts.
- `src/app/globals.css`: handoff tokens.
- `src/app/page.tsx`: moves into the `(shell)` group as the Dashboard placeholder.
- `README.md`: v3 scope, architecture, persistence, local-only binding.

**Add**

- `src/domain/*` (v3), `src/server/**`, `src/app/(shell)/**`, `src/app/api/**`.
- `src/components/{shell,categories,household,ui}/**`.
- Tests: `tests/domain/*`, `tests/server/*` (migrations, members service, categories
  service incl. merge atomicity, persistence round-trip), `tests/api/*`,
  `tests/components/*` (rail, categories screen, dialogs, household screen).

**Delete (v2)**

- `src/app/{dev,settings,transactions}/`
- All current `src/components/*`
- All current `src/data/*`, including `dummy-data/`
- All current `src/domain/*`
- All current `tests/components/*`, `tests/data/*`, `tests/domain/*`

**Out of scope**

- Entries and the "+ Add entry" CTA and modal.
- Savings buckets, budget models, dashboard and forecaster logic.
- Any financial calculation.
- Hosted persistence and authentication.
- Deployment config.
- `.specify/templates/*` and `scripts/prompts/*`.

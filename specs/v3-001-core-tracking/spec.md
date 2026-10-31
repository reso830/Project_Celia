# Feature Specification: F01 — Core Tracking

**Feature Branch**: `v3-001-core-tracking`
**Created**: 2026-09-26
**Status**: Draft
**Input**: `docs/features/v3-001-core-tracking.md`
**Design reference**: `handoff/celia_v3_001.zip` (hi-fi prototype, wireframes, `product-decisions.md`)

## Clarifications

### Session 2026-09-26

- Q: What does a fresh install contain before the user configures anything? → A: Nothing.
  No members and no categories; every screen shows its empty state. The prototype's seed
  data is not loaded.
- Q: What does "Remove member" do, given history must be preserved? → A: The member is
  archived, not deleted. An archived member leaves the owner pickers and the active member
  list, but historical ownership keeps pointing at them.
- Q: What do the Household financial panels (income vs. outgoing, keeps, expense per
  member) and the Categories spend summary and burn gauge show in F01? → A: They render in
  their prototype positions with an explicit empty state. F01 performs no financial
  calculations for them.
- Q: When merging Category A into Category B, what happens to an item in A whose name
  matches an item in B? → A: They always combine into B's item, and A's item's entries
  follow. No collision UI.
- Q: Can archived entities be restored? → A: Yes. Both archived categories and archived
  members can be restored to active use.

### Session 2026-09-26 (planning)

- Q: Must names be unique, and how is "same name" compared? → A: Category names are unique
  within an umbrella, item names are unique within a category, and member names are unique.
  All comparisons trim surrounding whitespace and ignore case. The same rule defines the
  merge "same name" match.
- Q: What can be done with an archived category? → A: Nothing until it is restored. It
  cannot be renamed, recoloured, given items, or used as a Move or Merge destination.
- Q: How does category colour choice work? → A: Free-form hex (picker or typed hex). Status
  hues are not blocked; separation from status comes from shape (square identity swatches,
  circular status marks). Categories may share colours. A new category starts with a
  default colour, which the user can change.
- Q: What happens to the existing v2 app and its data? → A: F01 replaces it. The v2 routes,
  components and IndexedDB storage are removed. v3 starts with fresh storage, and v2 data
  is not migrated.
- Q: Which persistence runtime? → A: A local SQLite file accessed server-side by the Next.js
  server. Hosted runtimes (e.g. Supabase) are out of scope.
- Q: Which screen does Celia open to? → A: The Dashboard placeholder.

## Problem Statement

Later Celia features (Entries, Budget & Savings, Dashboard, Forecaster) all need the same
foundation. They need to know who is in the household, how money is classified, and how
those classifications change over time without rewriting history. No such foundation
exists in the v3 model. Without it, each feature would invent its own ownership and
classification rules. F01 establishes that foundation, the screens to manage it, and the
v3 application shell every later screen lives in.

## Scope

**In scope**

- The v3 application shell: icon rail with seven destinations (Dashboard, Entries,
  Categories, Savings buckets, Budget models, Forecaster, Household), the page header
  pattern, and the design tokens from the handoff.
- Non-functional destination screens for Dashboard, Entries, Savings buckets, Budget models
  and Forecaster. Each shows its page title only.
- One household as the default ownership context ("Household").
- Members: add, rename, archive ("Remove"), restore.
- Three financial umbrellas as distinct domain concepts: Income, Expenses, Savings.
- Income and Expense categories: create, rename, change colour, archive, restore, merge.
- Items within categories: create, rename, move to another category in the same umbrella.
- Categories screen and Household screen at hi-fi fidelity. Merge, Archive and Move-item
  dialogs take their structure from the wireframes and their styling from hi-fi tokens.
- Persistence across reloads of: household, members (including archived state), umbrellas,
  categories, items, category colours, and category archived state.
- Shared conventions: PHP currency formatting (`₱119,500`, true minus `−`), and ownership
  defaulting to Household.

**Non-goals**

- Creating, editing, deleting, listing, searching or filtering entries (F02). This
  includes the "+ Add entry" CTA and the entry modal.
- Any financial calculation: totals, spend, keeps, income vs. outgoing, per-member expense,
  burn rate, budget percentage, runway, buffer.
- Savings bucket management, bucket types, the buffer toggle, and bucket rows in the
  Categories list (F03). The Savings umbrella exists in the domain only.
- Budget models, budgets per category, and the "Active model" value (F03).
- Dashboard content and Forecaster content.
- Model-impact sections of the Merge and Archive wireframes ("Model budgets", "Those budget
  lines will… Drop out / Stay").
- The Move-item wireframe's "All history / From Sep" choice. Per the brief, entries always
  follow the item across all history.
- The wireframe's "Item trend over 6 months" chart and "3-MO AVG" column. The hi-fi has
  neither.
- Hard deletion of categories, items or members.
- Deleting items, archiving items, and moving items across umbrellas.
- Reordering categories or items.
- Member roles, permissions, or the prototype's "Owner"/"Editor" role labels.
- Member surnames or profile details beyond a display name.
- Authentication, multiple households, multi-user accounts.
- Multi-currency, live forex, recurring entries, bank import, custom month start.
- Seed or demo data on first run.
- Migrating v2 data. The v2 routes, components and IndexedDB storage are removed.
- Hosted persistence (e.g. Supabase) or sync between machines.
- Mobile layouts. Only widths of 1100px and up are supported.

## User Scenarios & Testing

### User Story 1 — Navigate the v3 shell (Priority: P1)

A user opens Celia and sees the v3 icon rail. They can reach every destination. Categories
and Household are functional. The other five show only their page title.

**Independent Test**: Load the app. Hover each of the seven rail items and confirm the
tooltip label. Click each and confirm the matching page title and the active rail state. At
1100px width, confirm no horizontal scrolling.

**Acceptance criteria**

1. The rail shows the seven destinations in the handoff order, with tooltips and
   active/hover states per the hi-fi.
2. Each destination has its own address and shows its page title with no subtitle.
   Celia opens to the Dashboard.
3. Unimplemented destinations render no data, controls or placeholder figures.
4. No page scrolls horizontally at widths of 1100px or more.

### User Story 2 — Manage household members (Priority: P1)

A user adds the people in their household, corrects a name, and removes someone who no
longer belongs. Later they bring that person back.

**Independent Test**: On a fresh install, open Household and confirm the empty member
list. Add "Ana" and "Miguel", rename Miguel, and reload to confirm both persist. Remove
Ana, confirm she leaves the active list, and reload. Restore Ana and confirm she returns
with the same identity.

**Acceptance criteria**

1. "+ Add member" adds a named member. The list shows each member's initial avatar and
   name, and the header shows the member count.
2. Hovering a name shows ✎; renaming happens in place.
3. "Remove" archives the member after confirmation. The member leaves the active list and
   the member count.
4. Archived members can be viewed and restored. A restored member keeps their original
   identity, so historical references resolve to them.
5. A blank member name, or one that matches another member (trimmed, case-insensitive),
   cannot be saved.
6. Members and their archived state persist across reloads.
7. The Household option is always present, is not a member, and cannot be renamed or
   removed.

### User Story 3 — Create and edit categories (Priority: P1)

A user builds their Income and Expense categories, names them, and gives each an
identifying colour.

**Independent Test**: On a fresh install, open Categories and confirm empty INCOME and
EXPENSES groups. Create "Transport" (Expenses) and "Salary" (Income). Rename Transport,
change its colour, and reload. Confirm the name, colour and group persist, and that the
swatch is square.

**Acceptance criteria**

1. The left pane shows collapsible INCOME and EXPENSES groups, each with its count. Rows
   show a square swatch, the name and "N items". The selected row is highlighted.
2. The user can create a category in either umbrella. A category cannot be created in
   Savings.
3. Hovering a category name shows ✎; renaming happens in place.
4. Clicking a swatch opens a colour picker. The chosen colour persists and appears in every
   swatch for that category.
5. Colours are free-form hex. Category swatches are square; status marks are circles, so
   identity and status never share a shape.
6. A blank category name, or one that matches another category in the same umbrella
   (trimmed, case-insensitive), cannot be saved.
7. The right pane shows the selected category's swatch, name, Merge and Archive actions,
   and items table.

### User Story 4 — Manage items (Priority: P1)

A user adds the specific items they'll record against, fixes a name, and moves an item that
belongs elsewhere.

**Independent Test**: Create "Groceries" and "Dining out" in Expenses. Add "Supermarket"
and "Coffee" to Groceries and rename Supermarket. Move Coffee to Dining out and reload.
Confirm Coffee is under Dining out, its identity is unchanged, and item counts update.

**Acceptance criteria**

1. The user can add an item to a category. A blank item name, or one that matches another
   item in that category (trimmed, case-insensitive), cannot be saved.
2. The user can rename an item in place.
3. Each item row has a Move action. It opens the Move-item dialog, showing FROM (the
   current category) and a TO picker.
4. The TO picker lists only active categories in the same umbrella, excluding the current
   one.
5. After a move, the item belongs to the destination category and keeps its identity. Any
   entries attached to it follow it, and none are duplicated or removed.
6. The ENTRIES and month columns of the items table show an empty state. No entries exist
   in F01.

### User Story 5 — Merge categories (Priority: P2)

A user realises two categories overlap and folds one into the other.

**Independent Test**: Create "Dining out" with items Restaurants and Sari-sari, and
"Groceries" with Supermarket and Sari-sari. Merge Dining out into Groceries. Confirm
Groceries holds Supermarket, Sari-sari (one item) and Restaurants, and that Dining out no
longer appears in active use. Reload and confirm.

**Acceptance criteria**

1. Merge opens a dialog with MERGE THIS (the selected category) and an INTO picker. The
   picker lists only other active categories in the same umbrella.
2. The user must explicitly choose the destination before Merge is enabled.
3. The dialog shows what will move (item count, and entry count as empty/zero in F01), and
   notes that the action can't be undone.
4. On confirm, every item of the source moves to the destination. An item whose name
   matches an existing destination item combines into it. Its entries re-point to the
   surviving item, and none are deleted.
5. The source category leaves active use and every picker. The destination survives with
   its own name and colour.
6. The result persists across reloads.

### User Story 6 — Archive and restore categories (Priority: P2)

A user stops using a category without losing its history, and can bring it back later.

**Independent Test**: Archive "Dining out". Confirm it stays listed with an archived marker,
keeps its items, and is absent from the Move-item and Merge destination pickers. Reload.
Restore it and confirm it returns to normal use.

**Acceptance criteria**

1. Archive opens a confirmation dialog stating that nothing is deleted, the category and
   its items leave the pickers for new activity, and it can be restored.
2. An archived category remains visible in Categories with an archived marker, and keeps
   its items, colour and relationships. It is read-only until restored: no rename,
   recolour, new items, or use as a Move/Merge destination.
3. An archived category is excluded from any picker used to create new financial activity.
4. An archived category can be restored to active use.
5. Archived state persists across reloads.

### User Story 7 — Household screen defaults and financial panels (Priority: P3)

A user sees how the Household screen will look once there is financial activity, and sees
the household defaults.

**Independent Test**: With members but no entries, open Household. Confirm the INCOME VS.
OUTGOING, KEEPS and Expense per member panels show an explicit empty state with no figures.
Confirm the Defaults panel shows "New entries owned by Household" and "Currency PHP".

**Acceptance criteria**

1. The Household layout matches the hi-fi: header with month picker and "+ Add member",
   the members table, and a lower row with Expense per member and Defaults.
2. Financial columns and panels show an explicit empty state. They show no zero-value
   bars or fabricated figures.
3. Defaults shows the default owner (Household) and currency (PHP). The active-model line
   shows as not set, because models arrive in F03.
4. The Categories detail summary panel ("<Month> spend", budget line and burn gauge) shows
   an explicit empty state in the same way.

## Edge Cases

- **No members**: Household shows an empty member list with "+ Add member". Household
  remains the only owner.
- **No categories**: both groups are empty. The right pane shows a prompt to create a
  category rather than a blank detail.
- **Category with zero items**: allowed; shows "0 items". It can be a Merge or Move
  destination.
- **Only one category in an umbrella**: Merge and Move have no valid destination. The
  action is disabled or explains why.
- **Moving the last item out of a category**: the source category remains with zero items.
- **Merging a category that has zero items**: allowed; the source still leaves active use.
- **Moving an item into a category that already has an item of the same name**: rejected
  with an explanation; the user renames one of them first.
- **Restoring after a name was reused**: cannot happen, because archived members and
  categories still count toward name uniqueness.
- **Merge with multiple name matches**: each matching item combines independently.
  Non-matching items move unchanged.
- **Cancelled dialogs** (Move, Merge, Archive, Remove, Restore): no data changes.
- **Persistence failure**: the user sees an error, the on-screen state does not change,
  and nothing is partially applied. A merge applies entirely or not at all.
- **Reload during first run**: an empty install stays empty; nothing is seeded.

## Data Considerations

**Entities**

- **Household**: the single default ownership context. Exactly one exists. It is not a
  member.
- **Member**: stable identity, display name, and archived state. Referenced by ownership.
- **Umbrella**: fixed set `Income`, `Expenses`, `Savings`. Not user-editable. Savings holds
  no categories.
- **Category**: stable identity, name, umbrella (Income or Expenses only), identifying
  colour, archived state, and its items.
- **Item**: stable identity, name, and owning category. Entries (F02) will reference the
  item, never the category directly. An entry's category derives from its item.
- **Owner reference** (for F02 onward): either Household or one Member, defaulting to
  Household.

**Rules**

- Category → Item is exactly two levels.
- An item's category must share the umbrella of any category it moves to. Merges happen
  only within one umbrella.
- Archive never deletes. Archived categories and members stay resolvable for history.
- Merge moves or combines items and leaves the source out of active use. It never deletes
  entries. Whether the source record is retained (as merged) or removed is a plan
  decision, provided historical references stay resolvable.
- Category colour is identity data. It lives on the category and is the single source for
  every rendering of that category.
- Derived values (item counts, member counts) are computed, never stored separately.
- Money is exact (integer PHP pesos or minor units; plan decides). F01 stores no amounts.

**Extension points (not implemented)**

The model must allow later features to reference, without restructuring:

- Entries → Item and Owner (F02).
- Savings buckets under the Savings umbrella (F03).
- Budget models with an amount per category and per bucket (F03).
- Forecast scenarios (later).

**Persistence**

All F01 entities survive reloads and server restarts in a local SQLite file. The schema
must be versioned so that later features can evolve it, with migration of existing data
rather than database resets. F01 starts with fresh storage; v2 data is not migrated.

## Success Criteria

- Every user story's Independent Test passes in the Browser Smoke Test phase.
- Automated tests cover the domain rules above: umbrella restrictions, move, merge
  combine, archive/restore, and persistence round-trips.
- Categories and Household screens pass a visual check against the hi-fi at 1280–1440px,
  with no horizontal scroll at 1100px or more.
- Text contrast is at least 4.5:1. There are no drop shadows. Design values come from
  shared tokens.

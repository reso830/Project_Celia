# Feature Specification: F02 — Entries

**Feature Branch**: `v3-002-entries`
**Created**: 2026-11-01
**Status**: Draft
**Input**: `docs/features/v3-002-entries.md`
**Design reference**: `handoff/celia_v3_001.zip` (hi-fi prototype: Entries screen and Add / Edit
entry modal; `README.md`; `product-decisions.md`; `data/seed.json`)

## Clarifications

### Session 2026-11-01

- Q: Are amounts whole pesos or can they include centavos? → A: Centavos are allowed (at
  most two decimal places). Amounts are stored exactly.
- Q: What does the Entries member filter show? → A: "Household" shows every entry. Picking
  a member shows that member's entries **plus** Household-owned entries, with the
  Household-owned rows visibly marked.
- Q: In a member view, what do the summary chips total? → A: Income, Expense and Net each
  show the member's own amount and the shared (Household-owned) amount separately.
- Q: Which summary chips does the Entries screen show? → A: Entries N · Expense · Income ·
  Net. Net replaces the prototype's "Avg / entry".
- Q: What is the reporting period? → A: The month picker only. The screen always shows one
  calendar month. Search and filters apply within that month.
- Q: Should F02 fill in the entry-related placeholders F01 left on other screens? → A: No.
  F02 updates the Entries screen and entry modal only. Transaction data and calculations
  must be reusable so later features can fill those screens in. The items table's
  ENTRIES and month columns, the category spend panel and the Household financial panels
  keep their F01 empty states.
- Q: The Merge and Move-item dialogs hard-code "0 entries", which becomes false once
  entries exist. → A: Exception to the answer above: both dialogs show the real number of
  entries that will move.
- Q: The modal's preview strip ("Groceries after save: 18,400 / 20,000") needs a budget,
  which arrives in F03. → A: Follows from the answer above: the preview strip is not part of
  F02.
- Q: Should demo data be available? → A: Yes, through backend tooling only: npm scripts to
  seed and clear dummy data. There is no in-app control.
- Q: What does seeding create? → A: A full demo household: members, income and expense
  categories with colours and items, and entries. It is based on the prototype's
  `seed.json` and covers the 12 months ending with the current month.
- Q: What does seeding do on a database that already has data? → A: It refuses and tells the
  user to run clear first.
- Q: What does clear remove? → A: Everything. The database returns to the empty first-run
  state, including real user data.
- Q: Does clear need a guard? → A: Yes. Without an explicit confirmation flag (e.g.
  `--yes`), clear prints what it would delete and changes nothing.
- Q: Can entries be dated in the future? → A: Yes. An entry appears under its own month.
- Q: Do archived members and categories appear in the Entries filters? → A: No. Filters list
  active members and categories only. Their past entries still appear under Household and
  All categories.

## Problem Statement

F01 gave Celia its household, members and category/item structure, but no way to record
money. Without entries, Celia cannot answer how much came in, how much went out, or who it
belongs to, and later features (Budget & Savings, Dashboard, Forecaster) have no actual
financial activity to work from. F02 adds the authoritative record of income and expense
activity, the screen to enter and review it, and reusable calculations for later features.

## Scope

**In scope**

- Entry records: type (Income or Expense), exact positive PHP amount (centavos allowed),
  date, item (and through it, category), owner (Household or one member), optional note,
  stable identity, and creation/update metadata.
- The Entries screen at hi-fi fidelity: header with owner and category filters, month
  picker and "+ Add entry"; summary chips; search input; entries table; empty, loading and
  error states.
- The Add / Edit entry modal at hi-fi fidelity, without the budget preview strip.
- Creating, editing and deleting entries. Delete requires confirmation.
- Search over notes, item names and category names.
- Filters: month (month picker), type, category, owner.
- Sorting by date (default: newest first) and by amount.
- Summary chips derived from the filtered entries: Entries N, Expense, Income, Net. In a
  member view, the money chips show own and shared amounts separately.
- Historical integrity: entries stay readable and editable when their category, item or
  owner is archived, and follow item moves and category merges.
- Real entry counts in the F01 Merge and Move-item dialogs.
- Reusable, UI-independent entry data access and calculations (filtering, totals, net)
  for later features.
- Persistence of entries across reloads and server restarts, via a schema migration that
  preserves existing F01 data.
- Backend npm scripts to seed a deterministic demo household and to clear all data.
- Automated tests for entry rules, calculations, persistence, and seed/clear.

**Non-goals**

- Filling in F01's other entry-derived placeholders: the Categories items table's ENTRIES
  and month columns, the category "<Month> spend" panel and burn gauge, and the Household
  screen's INCOME VS. OUTGOING, KEEPS and Expense per member panels.
- The modal preview strip ("<Category> after save: X / budget") and any budget figure (F03).
- Dashboard content and the Dashboard's recent-entries list.
- Savings bucket contributions or withdrawals, and any Savings-umbrella entry type (F03).
- Budget allocation, budget enforcement, overspend signals, rollover.
- Forecast calculations and advanced analytics.
- Reporting periods other than a single calendar month: no "All time", custom date range,
  or cross-month search.
- An "Avg / entry" chip.
- Archived members or archived categories as filter options.
- Choosing an archived category, archived item or archived member for a new entry, or
  switching an existing entry to one.
- Recurring or scheduled entries.
- Bank integration, CSV or statement import, export.
- Receipt attachments.
- Transfers between accounts, accounts as a concept, or ledgers / double-entry accounting.
- Multi-currency, live forex, custom month start.
- Splitting one entry across several owners or items.
- Bulk edit, bulk delete, undo of a delete.
- Approval workflows, roles, or entry-level permissions.
- An in-app control to seed or clear data, or HTTP endpoints for it.
- Seeding automatically on first run. A fresh install stays empty (F01 rule).
- Pagination or virtualisation for large lists beyond what normal household volume needs.
- Mobile layouts. Only widths of 1100px and up are supported.

## User Scenarios & Testing

### User Story 1 — Add an entry (Priority: P1)

A user records an expense or an income in a few keystrokes, and can record several in a row
without reopening the modal.

**Independent Test**: With at least one active expense category with an item, one active
income category with an item, and one member: open Entries and click "+ Add entry". Confirm
the date is today, the owner is Household, and the type is Expense. Enter `3240.50`, pick a
category and item, and Save. Confirm the toast and the new row. Open the modal again, switch
to Income, assign a member, and use "Save & add another". Confirm the modal stays open with
amount and note cleared. Enter `0` and confirm Save is disabled with feedback. Cancel, and
reload to confirm exactly the two saved entries persist.

**Acceptance criteria**

1. "+ Add entry" opens the modal titled "Add entry", with focus in the amount field.
2. The type toggle offers Expense | Income. Defaults: type Expense, date today, owner
   Household, empty amount and note.
3. AMOUNT accepts a positive value with at most two decimal places. Zero, negative,
   non-numeric, or more than two decimals is invalid: the field shows the hi-fi invalid
   style, a clear message, and Save and "Save & add another" are disabled (hi-fi disabled
   style).
4. DATE opens a calendar popover under the field (Monday-first). Any valid date, including
   a future one, can be chosen.
5. CATEGORY lists only active categories of the chosen type. ITEM lists only that
   category's active items. Changing the category resets the item to that category's first
   item. Changing the type replaces category and item with a valid selection for the new
   type, so an incompatible pair can never be saved.
6. OWNER is a segmented control: Household plus each active member. The helper text reads
   "Optional — stays with the household unless you pick a member."
7. NOTE is an optional multi-line field.
8. Category, item and date pickers are custom popovers (no native select or date input).
   Only one popover is open at a time. Each closes on selection, on a click elsewhere, or
   when the modal closes.
9. Save persists the entry, closes the modal, and shows the toast "₱<amount> added to
   <Category>". "Save & add another" persists the entry, keeps the modal open, keeps type,
   date, category, item and owner, and clears amount and note.
10. Cancel, ✕, Escape and an overlay click close the modal without persisting anything.
11. Every control can be reached and operated from the keyboard.

### User Story 2 — Browse a month of entries (Priority: P1)

A user reviews what was recorded in a month, newest first, and steps back through history.

**Independent Test**: Seed demo data (US8). Open Entries and confirm the current month's
entries appear newest first, with date, item, category swatch and name, owner, and amount.
Income is shown with "+" in green and expenses with "−". Click the DATE header and confirm
oldest first; click AMOUNT and confirm amount order. Step back a month and confirm the
list changes. Run clear (US8), reload, and confirm the empty state.

**Acceptance criteria**

1. The header shows the owner filter, category filter, month picker and "+ Add entry", per
   the hi-fi. The month picker defaults to the current month.
2. The table lists every entry dated within the selected month that matches the active
   search and filters, with the hi-fi columns: DATE · ITEM · CATEGORY (square swatch +
   name) · OWNER · AMOUNT · actions. There is no footer row.
3. AMOUNT is right-aligned in Mono. Income shows "+" in status green; expense shows "−"
   (true minus) in ink. Amounts with centavos show them, and the displayed value never
   alters the stored value.
4. The default order is date, newest first. The DATE header toggles newest/oldest first.
   The AMOUNT header sorts by amount and toggles largest/smallest first. One sort is active
   at a time, and the active header shows its direction. Equal sort keys are ordered
   deterministically.
5. With no entries in the month, the screen shows an empty state. With entries that don't
   match the search or filters, it shows "No entries match these filters."
6. A loading state is shown while entries load. A load failure shows an error state, not
   an empty list.
7. Entries persist across reloads and server restarts.
8. No horizontal scrolling at widths of 1100px or more.

### User Story 3 — Edit an entry (Priority: P1)

A user fixes a mistake in a recorded entry.

**Independent Test**: Click ✎ on an expense. Confirm "Edit entry" with every field
pre-filled and no "Save & add another". Change the amount, date (to another month), item
and owner, and Save. Confirm the toast "Entry updated", that the row left the current
month, and that the entry count did not grow. Step to the new month and confirm the edited
entry is there, then reload to confirm it persisted.

**Acceptance criteria**

1. ✎ opens the modal titled "Edit entry", pre-filled with the entry's type, amount, date,
   category, item, owner and note.
2. Edit mode hides "Save & add another".
3. Every field can be changed, under the same validation as US1.
4. Save updates the existing entry (same identity, creation metadata kept, update metadata
   refreshed). It never creates a duplicate. The toast reads "Entry updated".
5. List and summary chips update immediately. An entry whose new date is outside the
   selected month leaves the list.
6. Cancelling makes no change.

### User Story 4 — Delete an entry (Priority: P1)

A user removes an entry recorded by mistake, without risk of removing one by accident.

**Independent Test**: Click ✕ on a row, then cancel the confirmation, and confirm nothing
changed. Click ✕ again, confirm, and see the row disappear, the chips update, and the toast
"Entry deleted". Reload and confirm it stays deleted and no other entry changed.

**Acceptance criteria**

1. ✕ opens a confirmation dialog that identifies the entry (at least date, item and
   amount). The brief's confirmation requirement overrides the prototype's immediate
   delete.
2. Confirming deletes only that entry, updates list and chips immediately, and shows the
   toast "Entry deleted".
3. Cancelling leaves everything unchanged.
4. A deleted entry does not return after reload.

### User Story 5 — Search and filter (Priority: P2)

A user narrows a month down to what they're looking for: one person's spending, one
category, only income, or a word from a note.

**Independent Test**: With seeded data, type part of an item name, then a category name,
then a word from a note, and confirm only matching rows remain each time. Clear the search.
Set the type filter to Income and confirm only income rows. Pick a category and confirm only
its rows. Pick member Ana and confirm Ana's entries and Household-owned entries are listed,
with Household rows marked and no rows owned by another member. Combine search and filters
and confirm both apply. Switch to another screen and back, and confirm filters reset.

**Acceptance criteria**

1. Search matches, trimmed and case-insensitive, any part of an entry's note, item name or
   category name. It updates as the user types.
2. The type filter offers All, Expense and Income. The prototype has no control for it, so
   its placement follows the hi-fi header/chip-row style and is recorded in the deviation
   ledger.
3. The category filter offers "All categories" plus each active Income and Expense
   category. Selecting one shows only entries whose item currently belongs to it.
4. The owner filter offers "Household" plus each active member. "Household" shows every
   entry regardless of owner. A member shows that member's entries and Household-owned
   entries. Household-owned rows are visibly distinguished in that view. Entries owned by
   other members are excluded.
5. Month, search, type, category and owner combine (all must match). Changes apply
   immediately, with no apply button.
6. Filters and search are per screen and do not carry over to other screens.
7. Changing the month keeps the current filters and search while the Entries screen remains mounted; leaving and returning resets them.

### User Story 6 — See month totals (Priority: P2)

A user sees at a glance how much came in, went out, and what's left for the filtered view.

**Independent Test**: With seeded data, compare the chips with a hand sum of the visible
rows: Entries N, Expense, Income, and Net = Income − Expense. Add, edit and delete an entry
and confirm the chips change by exactly the right amount. Pick a member and confirm each
money chip shows own and shared amounts that match hand sums of the member's rows and of
the Household rows.

**Acceptance criteria**

1. The chip row shows Entries N · Expense · Income · Net, followed by the search input.
2. The chips are computed from exactly the entries listed (month, search, type, category,
   owner).
3. Net = total income − total expenses, signed with "+" or a true minus "−".
4. With "Household" selected, each money chip shows one total. With a member selected,
   Income, Expense and Net each show the member's own amount and the shared
   (Household-owned) amount separately. Entries N counts all listed rows.
5. Totals use exact arithmetic. Centavo amounts sum without rounding error, and the same
   entries always give the same totals.
6. Totals are derived from persisted entries and never stored separately.
7. Savings, budgets and projections are not part of any total.

### User Story 7 — History survives classification changes (Priority: P2)

A user reorganises categories and members without losing or corrupting past entries.

**Independent Test**: Record an entry on item Coffee (Groceries) owned by Ana. Open the
Move-item dialog for Coffee and confirm it states 1 entry; move Coffee to Dining out and
confirm the entry now shows Dining out. Open Merge for Dining out and confirm the real entry
count; merge it into another category and confirm the entry shows the destination category.
Archive that category and remove Ana. Confirm the entry still lists correctly, opens in Edit
with its archived category, item and owner shown as current values, and saves an amount
change without changing those values. Confirm the archived category and Ana are not
offered for new entries or in the filters.

**Acceptance criteria**

1. An entry's category always derives from its item's current category. Moving an item
   moves its entries' category across all history, with nothing duplicated or removed.
2. Merging categories re-points entries of combined items to the surviving item, in the
   same all-or-nothing operation as the merge. No entry is deleted.
3. The Merge and Move-item dialogs show the actual number of entries that will move.
4. Entries whose category, item or owner is archived still list, search, filter (under
   Household and All categories), and count in totals.
5. Editing such an entry shows the archived values as the current selection, marked
   archived, and saves without forcing a change. The user may switch to active values.
   Once switched away, an archived value cannot be chosen again.
6. Archived categories, items and members are never offered for new entries, and are not
   filter options.

### User Story 8 — Seed and clear demo data (Priority: P3)

A developer or tester loads a realistic household to try Celia, and wipes it back to empty.

**Independent Test**: On an empty database, run the seed script. Open Entries and confirm
members, categories and entries for the current month and the 11 before it. Run seed again
and confirm it refuses without changes. Run clear without the confirmation flag and confirm
it lists what would be deleted and changes nothing. Run clear with the flag, reload, and
confirm every screen shows its first-run empty state.

**Acceptance criteria**

1. An npm script seeds a demo household: members, Income and Expense categories with
   their colours and items, and entries of both types and both ownership kinds. The data
   is based on the prototype's `seed.json`.
2. Seeded entries span the 12 calendar months ending with the current month. Apart from
   that date shift, seeding produces the same data every time.
3. Seeding runs only on an empty database (no members, categories, items or entries). If
   data exists, it stops with a message to run clear first and changes nothing.
4. An npm script clears all data (entries, items, categories, members) and returns the
   database to the F01 first-run state. Structural rows from migrations (household,
   umbrellas) and the schema remain.
5. Without an explicit confirmation flag, clear prints what it would delete and changes
   nothing.
6. Seed and clear are each all-or-nothing.
7. Neither is reachable from the app UI or over HTTP. Nothing seeds automatically.

## Edge Cases

- **No categories for the chosen type**: the modal explains that a category is needed
  first, and Save is disabled.
- **Category with no active items**: an entry cannot be saved without an item. The modal
  explains why.
- **No members**: the owner control shows Household only; the owner filter offers
  Household only.
- **Amount input**: commas in typed input, leading/trailing spaces, more than two decimals,
  `0`, `0.00`, negatives and non-numbers are each handled deterministically. Only a
  positive value with at most two decimals saves. The plan defines accepted input formats.
- **Very large amounts**: an upper limit is defined in the plan so totals stay exact. Above
  it, the amount is rejected with a message.
- **Future date**: allowed. The entry appears only when its month is selected.
- **Editing the date into another month**: the entry leaves the current list and chips.
- **Month with entries but all filtered out**: "No entries match these filters." Chips show
  zero values for the filtered view.
- **Entry owned by an archived member**: still shows the member's name and counts as that
  member's in totals. The member is not a filter option.
- **Category merged after an entry was recorded**: the entry shows the surviving category
  and item.
- **Concurrent edit/delete of the same entry (two tabs)**: saving or deleting an entry that
  no longer exists shows an error and refreshes the list. No entry is recreated.
- **Persistence failure on save, edit or delete**: the user sees an error. The modal keeps
  its values, the list does not change, and nothing is partially applied.
- **Double-submit**: pressing Save twice quickly creates one entry.
- **Cancelled modal or confirmation**: no change.
- **Seed on non-empty database / clear without flag**: no change (US8).

## Data Considerations

**Entity: Entry**

| Field | Rules |
|---|---|
| Identity | Stable, unique. Unchanged by edits. |
| Type | Income or Expense. Must always equal the umbrella of the item's current category. Whether it is stored or derived is a plan decision, but the two must never disagree. |
| Amount | Exact PHP value, greater than zero, at most two decimal places. Stored in an exact representation (e.g. integer centavos). Never negative; type, not sign, distinguishes income from expense. |
| Date | A calendar date, with no time of day or time zone. Determines the entry's month. |
| Item | Required reference to an F01 item. The entry's category is derived from it, never stored on the entry. |
| Owner | Household or exactly one member. Defaults to Household. |
| Note | Optional free text. Searchable. |
| Created / updated | Creation and last-update metadata. |

**Rules**

- An entry has exactly one type, one item, and one owner.
- New entries and changed fields may reference only active categories, items and members.
  An unchanged archived reference on an existing entry stays valid.
- Item move: entries follow automatically, because they reference the item.
- Category merge: entries on a combined item are re-pointed to the surviving item in the
  same transaction as the merge (F01 data model, merge step 2).
- Archiving or restoring a category or member never changes entries.
- Deleting an entry removes only that entry. Members, categories and items cannot be hard
  deleted (F01), so references stay resolvable.
- Derived values (totals, net, counts, the member own/shared split, an entry's category)
  are computed from entries, never stored.

**Calculations (reusable, UI-independent)**

- Entries in a month, filtered by type, category, owner (with the member + Household rule)
  and search text.
- Total income, total expenses, and net for any filtered set. For a member view, the own
  and shared parts of each.
- Entry counts per item and per category (used by the Merge and Move-item dialogs now, and
  available to later features).
- All arithmetic is exact and deterministic. Formatting is presentation only.

**Persistence**

- A new schema migration adds entries to the F01 SQLite database without resetting it.
  Existing members, categories and items are preserved.
- References to items and members are enforced by the database.
- Create, edit and delete are each atomic. Persisted records and displayed summaries stay
  consistent.

**Demo data**

- Seed uses `seed.json`'s members (Ana, Miguel), categories, colours, items and monthly
  category totals, split into entries deterministically, with dates shifted so the last
  month is the current month. Amounts in `seed.json` are whole pesos.
- Clear returns the database to the first-run state (F01: empty, nothing seeded).

## Success Criteria

- Every user story's Independent Test passes in the Browser Smoke Test phase.
- Automated tests cover: amount validation and exact arithmetic (including centavos);
  type/category compatibility; owner rules, including the member + Household filter and
  own/shared split; search and filter combination; sorting; edit without duplication;
  delete; archived-reference editing; item move and merge re-pointing of entries; the
  migration over existing F01 data; persistence round-trips; and seed/clear including the
  refusal and flag guards.
- The Entries screen and entry modal pass a visual check against the hi-fi at
  1280–1440px, with no horizontal scroll at 1100px or more. Additions not shown in the
  prototype (type filter, AMOUNT sort, delete confirmation, member own/shared chips,
  centavo display) are recorded in the deviation ledger.
- Text contrast is at least 4.5:1. There are no drop shadows. Design values come from
  shared tokens.

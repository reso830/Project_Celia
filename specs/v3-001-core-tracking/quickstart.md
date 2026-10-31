# Quickstart & Browser Smoke Test: F01 — Core Tracking

## Run

```bash
npm install
CELIA_DB_PATH=./data/smoke.db npm run dev      # binds to http://127.0.0.1:3000
```

Delete `./data/smoke.db` before each run to start from a fresh install. On PowerShell:
`$env:CELIA_DB_PATH="./data/smoke.db"; npm run dev`.

When `CELIA_DB_PATH` is not set, Celia uses `./data/celia.db`.

## Automated verification

```bash
npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build
```

`npm run build` must not create a database file (pages are request-time only).

## Browser Smoke Test

Walk these at a 1280px-wide window unless stated otherwise. Each block is one spec user
story's Independent Test.

### US1 — Shell

1. Open `/`. The Dashboard title shows, with the Dashboard rail item active.
2. Hover each of the seven rail items and check the tooltip labels, in handoff order.
3. Click each item. The title changes, the item becomes active, and the five unimplemented
   pages show only their title.
4. Resize to 1100px on each page. There is no horizontal scrollbar.

### US2 — Members

1. Open `/household` on a fresh DB. The member list is empty and shows "+ Add member".
2. Add "Ana" and "Miguel". Adding "  ana " is rejected as a duplicate.
3. Rename Miguel via ✎ (Enter saves). Reload; both persist.
4. Remove Ana and confirm. She leaves the list and the count drops. Reload.
5. Restore Ana. She returns. Adding a new "Ana" while she was archived was rejected.

### US3 — Categories

1. Open `/categories` on a fresh DB. The INCOME and EXPENSES groups are empty, with a
   create prompt.
2. Create "Transport" (Expenses) and "Salary" (Income). Swatches are square with default
   colours.
3. Rename Transport. Change its colour via the picker (type a hex). Reload; the name, colour
   and group persist.
4. Creating "transport" in Expenses is rejected. Creating "Transport" in Income is allowed.

### US4 — Items

1. Create "Groceries" and "Dining out" (Expenses). Add "Supermarket" and "Coffee" to
   Groceries.
2. Rename Supermarket in place.
3. Move Coffee. The TO picker lists only active Expense categories other than Groceries.
   Choose Dining out.
4. Reload. Coffee is under Dining out, and the counts are Groceries 1 item, Dining out
   1 item.
5. Moving an item into a category that already has one with the same name is rejected with
   a message.

### US5 — Merge

1. Set up Dining out {Restaurants, Sari-sari} and Groceries {Supermarket, Sari-sari}.
2. Open Merge on Dining out. Merge stays disabled until INTO is chosen. The preview lists
   2 items and 1 same-name combine.
3. Merge into Groceries. Groceries shows Supermarket, Sari-sari (once) and Restaurants.
   Dining out no longer appears.
4. Reload and confirm. A new category named "Dining out" can now be created.

### US6 — Archive

1. Archive Transport. It stays in EXPENSES with an archived marker and keeps its items.
2. Rename, colour, add-item and Move/Merge are unavailable on it. It is absent from the
   Move and Merge destination pickers of other categories.
3. Reload. Restore it; the actions return.

### US7 — Household panels and defaults

1. With members but no entries, the INCOME VS. OUTGOING, KEEPS and Expense per member
   panels show explicit empty states. No bars or ₱0 figures appear.
2. Defaults shows the owner (Household), currency (PHP), and the active model as not set.
3. The Categories detail summary (spend, budget, gauge) shows an empty state.

## Visual pass

Compare `/categories` and `/household` with `reference/Money Tracker Hi-Fi.dc.html` from the
handoff zip at 1280 and 1440px. Check:

- Rail dimensions and colours
- Title size
- Card borders and radii
- No shadows
- Sora and JetBrains Mono fonts
- Hover and active states

Compare the dialogs' structure with `Money Tracker Wireframes.dc.html` (3a, 3b, 3c, 6a),
leaving out the model-impact and "All history / From Sep" parts.

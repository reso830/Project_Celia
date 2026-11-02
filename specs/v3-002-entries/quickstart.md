# Quickstart & Browser Smoke Test: F02 — Entries

**Date**: 2026-11-02 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## 1. Local Run & Database Configuration

```bash
npm install
CELIA_DB_PATH=./data/smoke.db npm run dev      # binds to http://127.0.0.1:3000
```

On PowerShell:
```powershell
$env:CELIA_DB_PATH="./data/smoke.db"; npm run dev
```

To test from a fresh first-run database, delete `./data/smoke.db` prior to running. When `CELIA_DB_PATH` is unset, Celia defaults to `./data/celia.db`.

---

## 2. Demo Tooling (Seed & Clear)

Celia provides backend CLI tooling to populate and reset demo data:

### Seed 12-Month Demo Household
```bash
npm run seed
```
- Populates members (Ana, Miguel), expense and income categories, items, and deterministic entries covering the 12 calendar months ending with the current month, reading from `scripts/seed.json`.
- **Safety check**: Refuses execution if the database already contains any members, categories, or entries, instructing the user to run `npm run clear` first.

### Guarded Clear (Wipe)
```bash
# Dry run: prints rows that would be deleted, modifies nothing
npm run clear

# Actual wipe: requires explicit confirmation flag
npm run clear -- --yes
```
- Removes all records from `entries`, `items`, `categories`, and `members`.
- Leaves structural tables (`household`, `umbrellas`) and schema intact, returning the app to the clean first-run state.

---

## 3. Automated Verification

```bash
npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build
```

`npm run build` must succeed without generating or accessing `./data/celia.db` (ensuring pages run at request time only).

---

## 4. Browser Smoke Test

Walk through these steps in a desktop browser at a 1280px-wide viewport. Each section executes one spec user story's Independent Test.

### US1 — Add an Entry (+ Add Another)
1. Start with an empty database. Open `/household` and add member "Ana". Open `/categories` and add Expense category "Groceries" with item "Supermarket", and Income category "Salary" with item "Paycheck".
2. Open `/entries` and click **"+ Add entry"**.
3. Verify initial modal defaults: title "Add entry", Type is "Expense", Date is today's date, Owner is "Household", and focus starts in Amount.
4. Type `3240.50` into AMOUNT. Select "Groceries" and "Supermarket". Click **Save**.
5. Confirm toast `"₱3,240.50 added to Groceries"`, modal closes, and the new row appears in the table.
6. Click **"+ Add entry"** again. Switch type to "Income". Assign Owner to "Ana". Type `45000`. Click **"Save & add another"**.
7. Confirm toast `"₱45,000 added to Salary"`. The modal stays open with Amount and Note cleared, while Type (Income), Date, Category, Item, and Owner (Ana) are preserved.
8. Enter `0` in AMOUNT. Confirm Save and "Save & add another" are disabled with the invalid amount message `"Enter an amount above zero."` directly below the field.
9. Click **Cancel** (or press Escape). Reload the page; confirm exactly the two saved entries persist.

---

### US2 — Browse a Month of Entries & Sorting
1. Run `npm run seed` on an empty database.
2. Open `/entries`. Confirm the current month's entries are listed, sorted newest first by default.
3. Verify table columns: DATE (`"Sep 19"`), ITEM, CATEGORY (square color swatch + name), OWNER, AMOUNT (right-aligned JetBrains Mono, Income prefixed with green "+", Expense prefixed with true minus "−"), and action buttons (✎, ✕).
4. Click the **DATE** column header: confirm order toggles to oldest first (arrow pointing up). Click again to return to newest first.
5. Click the **AMOUNT** column header: confirm entries sort by amount (largest first / smallest first).
6. Step back one month using the `◀` button in the Month Picker. Confirm entries update to show the previous month's activity.
7. Run `npm run clear -- --yes`, reload the browser, and confirm the table displays the empty state: `"No entries recorded for this month."`.

---

### US3 — Edit an Entry & Cross-Month Move
1. Seed the database (`npm run seed`). Open `/entries`.
2. Locate an expense entry in the current month and click its ✎ (Edit) icon.
3. Confirm the modal opens with title "Edit entry", all fields prefilled, and "Save & add another" is hidden.
4. Change the Amount to `1999.75`. Change the Date to a date in the *previous* month. Change the Owner to "Ana". Click **Save**.
5. Confirm toast `"Entry updated"`. The entry immediately leaves the current month's list and summary chips update.
6. Click `◀` on the Month Picker to navigate to the previous month. Verify the edited entry appears with amount `1,999.75` and Owner "Ana".
7. Reload the page; confirm the edited entry persists.

---

### US4 — Delete an Entry
1. In `/entries`, locate an entry and click its ✕ (Delete) icon.
2. Verify a confirmation dialog appears displaying the entry's date, item name, and amount.
3. Click **Cancel**. Confirm nothing changes; the entry remains.
4. Click ✕ again and click **Delete entry** in the confirmation dialog.
5. Confirm the row disappears immediately, summary chips update, and toast `"Entry deleted"` appears.
6. Reload the page; confirm the entry remains deleted and all other entries are untouched.

---

### US5 — Search and Filter Combinations
1. With seeded data, type an item name into the search bar (e.g., "Supermarket"). Confirm only rows matching that item remain.
2. Type a category name (e.g., "Utilities"). Confirm only utilities rows appear. Clear search.
3. Set the Type filter to "Income". Confirm only income rows appear.
4. Set the Category filter to a specific category. Confirm only its entries appear.
5. Set the Owner filter to member "Ana". Confirm the list displays Ana's individual entries **plus** Household-owned entries, with Household rows visibly marked. Confirm entries owned by Miguel are excluded.
6. Combine search text with Type and Owner filters. Confirm all active filters apply simultaneously.
7. Navigate to `/categories` and back to `/entries`. Confirm filters reset to their default state.

---

### US6 — Month Totals & Member Split
1. In `/entries` with "Household" selected as the owner filter, inspect the summary chips:
   - `Entries N`: count of visible rows.
   - `Expense`: exact sum of visible expense rows.
   - `Income`: exact sum of visible income rows.
   - `Net`: exact difference (`Income − Expense`), signed with "+" or "−".
2. Add a new entry with centavos (e.g. `123.45`). Confirm the chips update by exactly `₱123.45` without rounding errors.
3. Switch the Owner filter to "Ana".
4. Confirm each money chip displays Ana's own amount and the shared (Household-owned) amount separately (e.g. `₱18,200 own · ₱6,400 shared`).
5. Hand-sum visible rows to verify exact arithmetic precision.

---

### US7 — Historical Integrity Across Moves, Merges, & Archives
1. Open `/household` and add member "Ana". Open `/categories` and create Expense category "Groceries" with item "Coffee", and Expense category "Dining out".
2. Open `/entries` and record an entry on item "Coffee" (Groceries) owned by Ana for `100.00`.
3. Navigate to `/categories`. Open the **Move item** dialog for "Coffee". Confirm the dialog displays `"All 1 entry under Coffee move with it."` (using singular "1 entry").
4. Move "Coffee" to category "Dining out". Return to `/entries` and confirm the entry now displays "Dining out" as its category.
5. Return to `/categories`. Open the **Merge category** dialog for "Dining out". Confirm the dialog reports the real entry count moving (`1 entry`).
6. Merge "Dining out" into another category (e.g. "Groceries"). Confirm in `/entries` that the entry reflects the surviving category and item.
7. In `/household`, archive member "Ana". In `/categories`, archive that category.
8. Return to `/entries`. Confirm the Category filter and Owner filter do NOT offer the archived category or Ana as filter options.
9. Confirm the entry still displays normally in the list with its archived category swatch and Ana's name.
10. Click ✎ to edit the entry. Confirm the modal opens with the archived category and member preselected and marked `(archived)`. Change the amount to `125.00` and click Save; confirm it updates without forcing a change to the archived values.

---

### US8 — Seed and Clear Verification
1. Run `npm run seed` on a database with existing records. Confirm it halts with an error message instructing the user to run clear first.
2. Run `npm run clear` (without `--yes`). Confirm it prints a dry-run summary of rows that would be deleted, and leaves the database untouched.
3. Run `npm run clear -- --yes`. Reload the browser; confirm all screens display their clean first-run empty state.

---

## 5. Visual Pass (Hi-Fi Fidelity)

Compare `/entries` and the Add / Edit entry modal against `reference/Money Tracker Hi-Fi.dc.html` from the design handoff:

1. **Dimensions & Spacing**:
   - Desktop viewport at 1280px and 1440px.
   - Resize browser to 1100px width: confirm table and header shrink gracefully with **zero horizontal scrolling**.
2. **Typography**:
   - UI copy in Sora; monetary figures right-aligned in JetBrains Mono.
3. **Colors & Contrast**:
   - All text meets >= 4.5:1 contrast against backgrounds.
   - Status green used for income ("+"); ink used for expenses ("−").
   - Square swatches for category colors; status indicators use circles.
4. **No Drop Shadows**:
   - Borders and subtle surface tints used exclusively for depth; no box-shadows.
5. **Deviations**:
   - Confirm all intentional additions and alterations are documented in `specs/v3-002-entries/deviations.md`.

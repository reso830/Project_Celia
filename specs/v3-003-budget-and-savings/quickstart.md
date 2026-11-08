# Quickstart & Browser Smoke Test: F03 — Budget & Savings

**Date**: 2026-11-08 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

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

To test from a clean first-run database, delete `./data/smoke.db` before starting or run `npm run clear -- --yes`. When `CELIA_DB_PATH` is unset, Celia defaults to `./data/celia.db`.

---

## 2. Demo Tooling (Seed & Clear)

### Seed 12-Month Demo Household (F01 + F02 + F03)
```bash
npm run seed
```
- Populates members (`Ana`, `Miguel`), categories, items, 12 rolling calendar months of deterministic entries (ending with the current calendar month), 4 savings buckets (`Cash buffer`, `Emergency fund`, `Car down payment`, `Insurance`), 12 rolling months of deterministic savings contributions (`${month}-01`), 3 reusable budget models (`Baseline 2026`, `Lean months`, `Car purchase 2027`), and 12 applied monthly budget plans (`Baseline 2026`) from `scripts/seed.json`.
- **Safety check**: Refuses execution if any F01, F02, or F03 user table contains rows.

### Guarded Clear (Wipe)
```bash
# Dry run: prints row counts across all 10 user tables without deleting anything
npm run clear

# Actual wipe: requires explicit confirmation flag
npm run clear -- --yes
```

---

## 3. Automated Verification

```bash
npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build
```

`npm run build` must succeed without creating or mutating `./data/celia.db`.

---

## 4. Browser Smoke Test

Walk through these steps in a desktop browser at a 1280px-wide viewport. Each section executes one spec user story's Independent Test.

### US1 — Create, Edit, and Manage Savings Buckets
1. Start with a clean database (`npm run clear -- --yes`). Open `/savings`.
2. Confirm the empty state and zeroed KPI row: `HELD IN BUCKETS ₱0` (`0 buckets`), `SAVINGS BUFFER ₱0`, `RUNWAY —`, `FUNDED <MON> ₱0` (`no plan for <Mon>`).
3. Click **`+ New bucket`**. Create a `Cash Buffer` bucket named `"Cash buffer"` with opening balance `250000`, marked as default (`DEFAULT CASH BUFFER` checked), and click **Save**.
4. Confirm the card displays the `DEFAULT` badge, `₱250,000` balance, `no target` / `open-ended` progress bar in teal, and a locked-on `buffer` toggle. Confirm `HELD IN BUCKETS` and `SAVINGS BUFFER` both read `₱250,000`.
5. Click **`+ New bucket`**. Create an `Emergency Fund` bucket named `"Emergency fund"` with opening balance `120000` (`buffer` toggle defaults to on) and click **Save**.
6. Click **`+ New bucket`**. Create a `Goal` bucket named `"Car down payment"` with opening balance `85000`, target amount `180000`, target month `2027-02`, and `buffer` toggle off.
7. Confirm `HELD IN BUCKETS` updates to `₱455,000`, `SAVINGS BUFFER` reads `₱370,000`, and the Car bucket shows `₱85,000 of ₱180,000 · ₱95,000 left` and `47%` in amber.
8. Toggle `buffer` on and off on `"Car down payment"` and confirm `SAVINGS BUFFER` updates to `₱455,000` and back to `₱370,000`.
9. Click **Edit** on `"Car down payment"`, update its description, save, reload the page, and confirm all changes persist.

---

### US2 — Record and Manage Savings Contributions and Withdrawals
1. On `"Car down payment"` (`₱85,000` balance, `₱180,000` target), click **Contribute**.
2. Enter amount `5000`, select today's date in the current month (confirm future dates after today are disabled in the calendar popover), enter note `"Monthly transfer"`, and click **Save**.
3. Confirm toast, card balance increases to `₱90,000` (`50%`, `₱90,000 left`), and `FUNDED <MON>` increases by `₱5,000`.
4. Click **Withdraw** on `"Car down payment"`, enter `100000`, and confirm Save is blocked/rejected with `"Bucket balance cannot be negative."`.
5. Enter `15000` and click **Save**. Confirm the balance drops to `₱75,000` while `"Funded <Mon>"` and `FUNDED <MON>` remain `₱5,000` (gross contributions).
6. Click **History** on `"Car down payment"`. Edit the `₱5,000` contribution to `10000` and save; confirm the balance becomes `₱80,000` and `FUNDED <MON>` becomes `₱10,000`.
7. Delete the `₱15,000` withdrawal in the History modal and confirm deletion; confirm the balance becomes `₱95,000`. Also delete the `₱10,000` contribution so `"Car down payment"` returns to its `₱85,000` opening balance for subsequent tests.
8. Navigate to `/entries` and confirm neither the contribution nor the withdrawal appears as an income or expense entry or alters `/entries` summary chips.

---

### US3 — Archive and Restore Savings Buckets
1. On `/savings`, create a `Goal` bucket `"Travel Fund"` (opening balance `0`, target `60000`) and record a `₱10,000` contribution.
2. Click **Archive** on `"Travel Fund"` and confirm in the dialog.
3. Confirm `"Travel Fund"` leaves the active bucket grid, is excluded from `HELD IN BUCKETS` and `SAVINGS BUFFER`, and appears inside the collapsible **Archived** section at the bottom of `/savings`.
4. Expand **Archived**, click **History** on `"Travel Fund"`, and verify the `₱10,000` contribution is visible and strictly read-only (no edit or delete buttons).
5. Click **Restore** on `"Travel Fund"` and confirm it returns to the active grid with its `₱10,000` balance intact.

---

### US4 — Create, Edit, Duplicate, and Delete Reusable Budget Models
1. In `/categories`, ensure active Income categories (`Salary` with item `Paycheck`, `Freelance` with item `Client project`) and Expense categories (`Rent` with item `Apartment rent`, `Groceries` with item `Supermarket`, `Dining out` with item `Restaurants`) exist.
2. Open `/models`, click **`+ New model`**, name it `"Baseline 2026"`, and click **Save**.
3. Enter planned monthly amounts in `BUDGET / MO` (confirming totals and charts update live in `<10ms` while typing and persist on `blur` or `Enter`):
   - **Income**: `Salary = 110000`, `Freelance = 9500` (Income group total `₱119,500`)
   - **Expenses**: `Rent = 25000`, `Groceries = 20000`, `Dining out = 5000` (Expenses group total `₱50,000`)
   - **Savings**: `Emergency fund = 8000`, `Car down payment = 10000`, `Travel Fund = 3000` (Savings group total `₱21,000`)
4. Confirm `"Where the income goes"` shows `₱119,500 planned income`, segmented bar percentages for Expenses, Savings, and Unallocated, and the footer `Unallocated` reads `+₱48,500` in teal.
5. Change `Groceries` to `90000` and confirm `Unallocated` becomes `−₱21,500` in status red with the `"Overallocated by ₱21,500"` badge. Restore `Groceries` to `20000`.
6. Click **Duplicate**, confirm `"Baseline 2026 (Copy)"` is created with identical allocations, then click **Delete** on the copy and confirm deletion. Reload and confirm `"Baseline 2026"` persists.

---

### US5 — Apply a Budget Model to a Month and Preserve Historical Monthly Plans
1. On `/models`, select `"Sep 2026"` in the month picker, select `"Baseline 2026"` (`Groceries = ₱20,000`), and click **`Make active`** (confirming in the dialog since Sep 2026 is a past month).
2. Confirm the top **Month's Plan card** (`"Sep 2026 plan"`) appears at the top of the left rail with the `ACTIVE` badge and becomes selected.
3. Click **`+ New model`**, create `"Lean months"` with `Salary = 110000`, `Groceries = 16000`, switch the month picker to `"Oct 2026"`, and click **`Make active`** (confirming in the dialog).
4. Click the reusable `"Baseline 2026"` card in the left rail and edit `Groceries` in the reusable template to `22000`.
5. Switch the month picker back to `"Sep 2026"`, select the top `"Sep 2026 plan"` card, and confirm September's applied plan still shows `Groceries = 20,000` (while the `"Baseline 2026"` card shows `DIVERGED` and offers `Re-apply` with confirmation). Reload and confirm both months retain their independent plans.
6. Reset `"Baseline 2026"`'s `Groceries` template allocation back to `20000` for the remaining steps.

---

### US6 — Compare Budget Allocations Against Actual Monthly Activity
1. With `"Baseline 2026"` applied to Sep 2026 (`Salary = ₱110,000`, `Groceries = ₱20,000`, `Dining out = ₱5,000`, `Car down payment = ₱10,000`), record Sep 2026 entries in `/entries`: `Salary (Paycheck) = ₱110,000`, `Groceries (Supermarket) = ₱18,400`, `Dining out (Restaurants) = ₱7,900`.
2. Record a Sep 2026 savings contribution in `/savings`: `Car down payment = ₱5,000` dated `2026-09-15`.
3. Open `/models` for Sep 2026 (which selects `"Sep 2026 plan"` by default) and verify:
   - `Groceries`: `BUDGET / MO = 20,000`, `ACTUAL = 18,400` (`92% used · ₱1,600 remaining`), `Δ = +1,600` (green).
   - `Dining out`: `BUDGET / MO = 5,000`, `ACTUAL = 7,900` (`158% used · ₱2,900 overspent`), `Δ = −2,900` (red).
   - `Car down payment`: `BUDGET / MO = 10,000`, `ACTUAL = 5,000` (`₱5,000 short`), `Δ = −5,000` (amber — never red).
   - `"Budget vs actual (Δ)"` diverging bar chart plots `Groceries` above the zero line (`SURPLUS`) and `Dining out` below the zero line (`DEFICIT`) in their category colours.
   - Clicking `"Lean months"` in the left rail live-previews `"Lean months"` (`Groceries = ₱16,000`) against Sep 2026's actuals (`Δ = −2,400` red).

---

### US7 — Historical Integrity Across Archived or Merged Categories and Buckets
1. On `/models`, switch the month picker to `"Aug 2026"`, select `"Baseline 2026"` (`Rent = ₱25,000`, `Dining out = ₱5,000`, `Groceries = ₱20,000`, `Travel Fund = ₱3,000`), and click **`Make active`** (confirming in the dialog).
2. In `/entries` for Aug 2026, record expense entries: `Dining out (Restaurants) = ₱4,000` and `Groceries (Supermarket) = ₱18,000`.
3. In `/savings`, archive `"Travel Fund"`.
4. In `/categories`, merge `"Dining out"` into `"Groceries"`.
5. Open `/models` for Aug 2026 (`"Aug 2026 plan"`) and confirm:
   - `"Groceries"` displays its own stored allocation (`20,000`) in the editable `BUDGET / MO` input with subtitle `"₱25,000 effective (+₱5,000 from Dining out)"`, and folds `"Dining out"`'s `₱5,000` into its comparison (`ACTUAL = 22,000`, `Δ = +3,000` green, `88% used · ₱3,000 remaining`, Expenses group header `₱50,000` planned vs `₱22,000` actual).
   - Unlock Aug 2026's past plan for revision, edit `"Groceries"`'s `BUDGET / MO` input from `20000` to `21000`, reload, and confirm the input persists as `21,000` with subtitle `"₱26,000 effective (+₱5,000 from Dining out)"` (`Δ = +4,000`), then restore it to `20000`.
   - `"Dining out (merged → Groceries)"` is rendered as a read-only reference row showing its `₱5,000` stored snapshot and `"→ Groceries"` in `ACTUAL`/`Δ` without double-counting in the Expenses group header.
   - `"Travel Fund (archived)"` remains visible in August's historical plan with its `₱3,000` planned allocation preserved.
6. Click the reusable `"Baseline 2026"` template card and confirm `"Dining out"`'s `₱5,000` was combined into `"Groceries"` (`₱25,000`) and `"Travel Fund (archived)"` is marked `(archived)` so the user can zero it out.

---

### US8 — Seed and Clear Verification
1. Run `npm run clear -- --yes`, then `npm run seed`.
2. Open `/savings` (which opens on the current calendar month, the 12th rolling seeded month) and confirm the 4 prototype buckets (`Cash buffer` `₱250,000`, `Emergency fund` `₱216,000`, `Car down payment` `₱145,000`, `Insurance` `₱24,000`), their lifetime balances, and current-month funded amounts (`FUNDED <MON> ₱15,000`, `"₱5,000 short"` in amber because `Baseline 2026` plans `Car down payment` at `₱10,000` while `₱5,000` is contributed per month) match the seeded dataset.
3. Open `/models` (on the current month) and confirm the top `"<Mon YYYY> plan"` card (`Baseline 2026`, `ACTIVE`) and the 3 prototype reusable models (`Baseline 2026`, `Lean months`, `Car purchase 2027`) exist.
4. Run `npm run clear` without `--yes` and confirm it prints row counts for all 10 F01, F02, and F03 user tables without deleting data.
5. Run `npm run clear -- --yes` and confirm `/savings` and `/models` return to their empty states.

---

## 5. Visual Pass (Hi-Fi Fidelity)

Compare `/savings` and `/models` against `reference/Money Tracker Hi-Fi.dc.html`:
1. **Viewport & Responsive**: Check at 1280px, 1440px, and 1100px width (zero horizontal scrolling).
2. **Typography & Tokens**: Sora for UI copy; JetBrains Mono for all monetary figures; design tokens from `src/app/globals.css`.
3. **Colour Semantics**: Category identity uses square swatches; status uses green (`#3f7d5c`), amber (`#c9992f` / `#b9822c`), and red (`#b0533c`). Savings shortfalls are always amber, never red.
4. **No Drop Shadows**: 1px borders and surface tints only.
5. **Deviations**: Confirm all intentional differences are recorded in `specs/v3-003-budget-and-savings/deviations.md` (`D1`–`D11`).

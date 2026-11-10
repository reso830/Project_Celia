# Quickstart & Verification Guide: F04 — Dashboard & Reporting

**Branch**: `v3-004-dashboard-reporting` | **Date**: 2026-11-09 (revised 2026-11-10) | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## 1. Local Run & Database Configuration

```bash
# Start development server on default local SQLite path
npm run dev      # Binds strictly to http://127.0.0.1:3000
```

On PowerShell:
```powershell
$env:CELIA_DB_PATH="./data/smoke.db"; npm run dev
```

To test from a clean first-run database, wipe data with `npm run clear -- --yes` or remove the target database file. When `CELIA_DB_PATH` is unset, Celia defaults to `./data/celia.db`.

---

## 2. Demo Tooling (Seed & Clear)

### Seed Full 12-Month Household Dataset (F01–F03)
```bash
npm run seed
```
- Populates members (`Ana`, `Miguel`), categories, items, 12 rolling calendar months of income and expense entries, 4 savings buckets (`Cash buffer`, `Emergency fund`, `Car down payment`, `Insurance`), monthly savings contributions, 3 reusable budget models (`Baseline 2026`, `Lean months`, `Car purchase 2027`), and 12 rolling monthly applied plans (`Baseline 2026`).

### Guarded Clear (Wipe)
```bash
# Dry run: prints table row counts without deleting
npm run clear

# Force wipe: deletes all data across all 10 user tables
npm run clear -- --yes
```

---

## 3. Automated Verification

Run the project verification gate:
```bash
npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build
```

---

## 4. Browser Smoke Test Walk (US1–US7)

### Test 1 — Fresh Install & Empty States (User Story 7 / Task T030)
1. Run `npm run clear -- --yes` and navigate to `http://127.0.0.1:3000/`.
2. Confirm the page title is `"Dashboard"`.
3. Confirm Row 1 displays:
   - `SAVINGS BUFFER`: `₱0`, `"—"` runway, and flat horizontal sparkline.
   - `INCOME`, `EXPENSES`, `SAVINGS`: `₱0`.
   - `UNALLOCATED`: `+₱0` in teal.
4. Confirm Row 2 displays:
   - Burn rate gauge: `"—"` center text, subtitle `"No plan applied"`, neutral slate arc, and 0% sweep.
   - Actual vs budget: empty state `"No spending recorded for this period"`.
5. Confirm Row 3 displays:
   - Categories table: empty state `"No categories configured"`.
   - Expense per member: empty state `"No members configured"`.
6. Confirm Row 4 displays:
   - Goal progress: empty state `"No active savings goals"`.
   - Upcoming commitments: empty state `"No upcoming commitments"`.

### Test 2 — Seeded Overview & Runway Consistency (User Story 1 / Task T031)
1. Run `npm run seed` and navigate to `http://127.0.0.1:3000/`.
2. Verify `SAVINGS BUFFER` displays `₱470,000` with active 12-month sparkline.
3. Verify `Runway` reads `"N.N months runway"` and matches the runway figure on `http://127.0.0.1:3000/savings`.
4. Verify `INCOME`, `EXPENSES`, `SAVINGS`, and `UNALLOCATED` match the current month's applied budget plan and actual transaction totals.
5. In another tab, open `/savings` and archive a non-default bucket with a balance. Refresh `/`. Confirm `SAVINGS BUFFER`, `SAVINGS`, and the buffer sparkline update consistently.

### Test 3 — Budget Utilization & Trend Range (User Story 2 / Task T032)
1. Check the Burn rate gauge for the current month:
   - If spending is within budget (<85%), confirm green arc and `"Under pace"` subtitle.
   - If spending is near budget (85–115%), confirm amber arc and `"On pace"` subtitle.
   - If spending exceeds budget (>115%), confirm red arc and `"Over pace"` subtitle.
2. Toggle trend chart range from `6 mo` to `12 mo`. Confirm 12 historical monthly bars render.
3. Click an earlier month's bar. Confirm dashboard navigates to that month.

### Test 4 — Category Spending & Drill-Down Matching (User Story 3 / Task T033)
1. In the Categories table, locate `Groceries`. Confirm actual spend, budget, favourable-positive delta `Δ`, and unspent rollover `↺`.
2. Confirm archived categories (if any) display with an `(archived)` badge and are strictly non-clickable.
3. **Drill-down matching under All members**: Click the active `Groceries` row. Confirm browser navigates to `/entries?month=YYYY-MM&category=<groceriesId>` (with `owner` omitted). Confirm the Entries screen opens with `Groceries` pre-selected in the category filter, and the displayed transactions and Expense summary chip sum to exactly the spend shown on the dashboard.
4. **Drill-down matching under Individual member (Ana)**: On the Dashboard, select `Ana` in the owner filter. Click the `Groceries` row. Confirm browser navigates to `/entries?month=YYYY-MM&category=<groceriesId>&owner=<anaId>`. Confirm the Entries screen opens showing Ana's entries plus Household entries (per F02's approved rule), with Household rows marked, and confirm the summary chip's **"own" figure (`ownExpenseCentavos`)** matches Ana's Groceries spend on the dashboard.
5. **Drill-down matching under Household**: On the Dashboard, select `Household` in the owner filter. Click the `Groceries` row. Confirm browser navigates to `/entries?month=YYYY-MM&category=<groceriesId>&owner=household`. Confirm the Entries screen displays Household-owned entries, the header owner chip button displays `"Household only ▾"`, the SummaryChips displays the total shared amount without the `"own · shared"` breakdown, and this figure matches Household Groceries spend on the dashboard. Open the owner dropdown and select `"Household"`. Confirm filter transitions to `"Household ▾"` (all members).

### Test 5 — Member Filter, In-Place Filter Toggle, & Non-Clickable Archived Rows (User Story 4 / Task T034)
1. In the Dashboard header, select `Ana` from the owner filter.
2. Confirm `INCOME` and `EXPENSES` scope to Ana's entries.
3. Confirm `UNALLOCATED` displays Ana's net cash flow labeled `"Member net"`.
4. Confirm `SAVINGS BUFFER` and Burn rate gauge remain visible with `"Household buffer"` and `"Household burn rate"` labels.
5. In "Expense per member", confirm Ana's row is highlighted.
6. Click `Miguel`'s row in "Expense per member". Confirm the dashboard filters in-place to Miguel (`?member=<miguelId>`). Click Miguel's row again. Confirm the filter clears back to all members.
7. If an archived member has transactions, confirm they are rendered with an `(archived)` badge and their row is strictly non-clickable.
8. In the header owner filter, select `"Household"` (`?member=household`). Confirm dashboard scopes to Household-owned entries. Select `"All members"`.

### Test 6 — Goal Progress & Fully Funded Commitments (User Story 5 / Task T035)
1. In Row 4, confirm the Goal card highlights the first active goal bucket (`"Car down payment"`).
2. Confirm the funding pace note shows `"At ₱X/mo → N months to target"` or `"No contributions this month · ₱X left"`.
3. In Upcoming commitments, confirm target-dated commitments are sorted by target month ascending.
4. If a commitment has reached its target balance (`currentBalance >= targetAmount`), confirm it displays `"₱0 left"` with a favourable green status indicator.

### Test 7 — Direct Entry EntryModal Save & Refresh (User Story 6 / Task T036)
1. Click `+ Add entry` in the Dashboard header.
2. Confirm `EntryModal` opens with full category and member records available.
3. Enter an expense: Amount `1250`, Date `today`, Category `Groceries`, Member `Ana`, Note `"Dashboard direct entry test"`.
4. Click Save. Confirm success toast appears, modal closes, and the Dashboard automatically updates with the fresh entry.

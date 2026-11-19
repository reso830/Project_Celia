# Quickstart & Verification Guide: F05 — Forecaster

**Branch**: `v3-005-forecaster` | **Date**: 2026-11-18 (revised Req-Review 2026-11-18) | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## 1. Local Run & Database Configuration

```bash
# Start Next.js development server
npm run dev      # Binds strictly to http://127.0.0.1:3000
```

On Windows PowerShell:
```powershell
$env:CELIA_DB_PATH="./data/smoke.db"; npm run dev
```

To test from a clean first-run database, wipe data with `npm run clear -- --yes` or remove the target database file. When `CELIA_DB_PATH` is unset, Celia defaults to `./data/celia.db`.

---

## 2. Demo Tooling (Seed & Clear)

### Seed Full Dataset with Scenarios (F01–F05)
```bash
npm run seed
```
- Populates members, categories, items, transactions, savings buckets, monthly budget plans, and 4 Forecaster scenarios:
  1. `Baseline` (derived from current month's applied budget plan and savings buffer)
  2. `A · Buy now, 5-yr loan` (₱98.5k buffer draw, car events, budget nudges)
  3. `B · Wait 6 months` (wait 6 mo, car events, dining nudge)
  4. `C · Pay cash` (₱518.5k buffer draw, running costs event, dining nudge)
- *Prerequisite*: Requires an otherwise empty database (`getClearSummary` must report 0 non-baseline rows). If data already exists, `npm run seed` aborts. Run `npm run clear -- --yes` before re-seeding.

### Guarded Clear (Wipe)
Implemented via `src/server/demo.ts`:
```bash
# Dry run: prints row counts across user tables (counting non-baseline scenarios only)
npm run clear

# Force wipe: deletes transactional data while preserving the Baseline scenario row
npm run clear -- --yes
```

---

## 3. Automated Verification

Run the full project verification gate:
```bash
npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build
```

---

## 4. Browser Smoke Test Walk (US1–US6)

### Test 1 — Fresh Install & Empty States (User Story 6)
1. Run `npm run clear -- --yes` and navigate to `http://127.0.0.1:3000/forecaster`.
2. Confirm the page renders a clean empty state card:
   - Notice states: `No budget applied for {Month YYYY}.` (e.g. `No budget applied for November 2026.`).
   - Provides an actionable link navigating to `/models`.
3. Confirm no uncaught JavaScript exceptions or broken UI elements occur.

### Test 2 — Baseline 24-Month Outlook (User Story 1)
1. Seed demo data with `npm run seed`.
2. Navigate to `http://127.0.0.1:3000/forecaster`.
3. Confirm the **Baseline** chip is active by default.
4. Verify Hero cards:
   - **VERDICT**: Displays `Tight but doable` in accessible amber (`#8a6516`) with subtitle `24-month horizon`.
   - **RUNWAY**: Displays `5.9 mo` (calculated from ₱466,000 buffer ÷ ₱79,000 expenses, rounded to 0.1).
   - **MONTHLY UNALLOCATED**: Displays `+₱20,500` in green with subtitle `buffer untouched`.
5. Verify 24-Month Outlook chart:
   - 24 flat vertical bars representing baseline monthly unallocated funds (+₱20,500).
   - Solid zero rule line.
   - Dimmed lines for alternative scenarios are visible.
   - 4 timeline milestone labels (e.g. `Oct 2026`, `Apr 2027`, `Oct 2027`, `Sep 2028`).
6. Verify "What changes" card displays: `"No events — this is the baseline."` with the `+ add event` button hidden.

### Test 3 — Scenario Switching & Side-by-Side Comparison (User Story 2)
1. Click the chip for **A · Buy now, 5-yr loan**.
2. Confirm chip becomes highlighted with teal background and border.
3. Confirm Hero cards update:
   - VERDICT updates to `Risky buffer` (red `#8a3b28`).
   - RUNWAY updates to `3.8 mo` with note `from 5.9 mo`.
   - MONTHLY UNALLOCATED updates to `−₱2,430` (red) with note `₱98,500 drawn from the buffer`.
4. Confirm 24-month outlook chart highlights Scenario A's polyline at full opacity, stepping at month 5, while other lines are dimmed.
5. In "Scenarios side by side", confirm columns for Baseline, Scenario A, Scenario B, and Scenario C are displayed side-by-side with confirmed figures:

| Scenario | Monthly Expense | Unallocated | Buffer After | Runway | Verdict |
|---|---|---|---|---|---|
| **Baseline** | ₱79,000 | +₱20,500 | ₱466,000 | **5.9 mo** | **Tight but doable** |
| **Scenario A** | ₱96,930 | −₱2,430 | ₱367,500 | **3.8 mo** | **Risky buffer** |
| **Scenario B** | ₱100,400 | −₱900 | ₱466,000 | **4.6 mo** | **Risky buffer** |
| **Scenario C** | ₱84,200 | +₱15,300 | −₱52,500 | **0.0 mo** | **Risky buffer** |

### Test 4 — Budget Nudges & Real-Time Rebalancing (User Story 3)
1. In Scenario A, locate the **Groceries** row under "Nudge the budget".
2. Click `+` to raise the allocation by ₱500.
3. Confirm the displayed allocation increases from ₱18,000 to ₱18,500, and status badge updates from `+₱2,000 freed` to `+₱1,500 freed`.
4. Click `−` twice. Confirm allocation decreases to ₱17,500 and freed funds increase to `+₱2,500 freed`.
5. Confirm Monthly Expense, Monthly Unallocated, Runway, and the comparison table update immediately.
6. Refresh browser page (`F5`). Confirm the updated nudge persists.

### Test 5 — Hypothetical Financial Events Management (User Story 4)
1. Select Scenario A, click `+ add event`.
2. Enter Name: "Annual Insurance", Type: "seasonal", Monthly Amount: "1,200". (Modal helper text notes seasonal is the monthly equivalent of an annual cost).
3. Save event. Confirm "Annual Insurance" appears in the "What changes" list.
4. Confirm event count updates, net monthly impact updates, and runway updates.
5. Click "Annual Insurance" in the event list, click "Delete event", and choose "Confirm delete". Verify the event is removed and the figures return to their previous values.

### Test 6 — Scenario Creation, Duplication & Deletion (User Story 5)
1. Select **A · Buy now, 5-yr loan**, open scenario settings modal, click "Duplicate".
2. Confirm "A · Buy now, 5-yr loan (Copy)" appears with the short label "A · LOAN NOW (COPY)" and all 3 events and 4 nudges cloned.
3. Click `+ scenario`.
4. Enter Name: "D · Secondhand car", Short Label: "D · SECONDHAND", Start Month: 6, Buffer Draw: "50,000", select Palette Key: `purple`.
5. Save the scenario. Confirm the "D · Secondhand car" chip appears in the selector and "D · SECONDHAND" appears in the chart legend and comparison table.
6. Open scenario settings for "A · Buy now, 5-yr loan (Copy)", click "Delete scenario", and choose "Confirm delete". Verify the copy is removed and Baseline is selected.
7. Confirm the Baseline scenario has no delete or duplicate option, and write attempts return 409 `invalid_state`.

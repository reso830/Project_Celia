# Route & Interface Contracts: F04 — Dashboard & Reporting

**Branch**: `v3-004-dashboard-reporting` | **Date**: 2026-11-09 (revised 2026-11-10) | **Spec**: [spec.md](spec.md)

## 1. Page Route Contract

### `GET /` (Dashboard Server Page)

The dashboard is served by the Next.js App Router Server Component at `src/app/(shell)/(dashboard)/page.tsx`.

#### Query Parameters

| Parameter | Type | Default | Validation & Semantics |
|---|---|---|---|
| `month` | `string` | Current month (`currentMonthKey()`) | Format `'YYYY-MM'`. Validated via `isValidMonthKey(month)`. If missing or invalid, falls back to `currentMonthKey()`. |
| `member` | `string` | `'all'` | `'all'`, `'household'` (sentinel for household-owned entries where `owner_member_id IS NULL`), or active member UUID. If UUID does not match an active member (or matches an archived member), falls back to `'all'`. |
| `category` | `string` | `'all'` | Category UUID or `'all'`. If UUID does not match an active category, falls back to `'all'`. |
| `range` | `string` | `'6'` | History range for the Actual vs Budget trend chart. Validated as `'6'` or `'12'`. Any other value falls back to `6`. |

#### Server Component Invocation

```typescript
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    member?: string;
    category?: string;
    range?: string;
  }>;
}) {
  const params = await searchParams;
  const viewData = await getDashboardView({
    month: params.month,
    memberFilter: params.member || "all",
    categoryId: params.category,
    range: params.range === "12" ? 12 : 6,
  });

  return <DashboardScreen data={viewData} />;
}
```

---

## 2. Navigation & Drill-Down Contracts

### 2.1 Month Navigation
- Clicking `◀` (previous month) or `▶` (next month) in `MonthPicker`:
  - Navigates to `/?month=YYYY-MM&member=<member>&category=<category>&range=<range>`.
- Clicking any bar in the "Actual vs budget" chart:
  - Navigates to `/?month=YYYY-MM&member=<member>&category=<category>&range=<range>`.

### 2.2 Member Filter Selection & In-Place Toggle
- Selecting an owner from the header dropdown:
  - Sets `member=<memberId>`, `member=household`, or clears to `member=all`.
- Clicking an active member row in "Expense per member":
  - **Filters the dashboard in-place**: sets `member=<memberId>`. Clicking the same row again clears the filter back to `member=all` (matching `HF#L974`).
- Clicking the Household row in "Expense per member":
  - Filters the dashboard in-place to Household-owned transactions: sets `member=household`. Clicking again clears to `member=all`.
- **Archived member rows**:
  - Rendered with an `(archived)` badge and are strictly **non-clickable** (display-only; cursor default).

### 2.3 Category Filter Selection
- Selecting a category from the header dropdown:
  - Sets `category=<categoryId>` (or removes the param for `'all'`).
  - Scopes transaction actuals and category breakdown to that category.

### 2.4 Range Toggle
- Clicking `6 mo` or `12 mo` in "Actual vs budget":
  - Updates `range=6` or `range=12`.

### 2.5 Bounded Destination Contract: Drill-Down to Entries Workspace
- Clicking an active category row in the Categories table navigates to `/entries` with bounded query parameters:
  - **Under All members** (`member=all` or unset): Link is `/entries?month=YYYY-MM&category=<categoryId>`. On `/entries`, `owner` is omitted (defaulting to `"all"`), so the entries table and the Expense summary chip sum to all members' transactions in that category, matching the dashboard Categories table row's `spentCentavos` exactly.
  - **Under Individual member** (`member=<memberId>`): Link is `/entries?month=YYYY-MM&category=<categoryId>&owner=<memberId>`. Per F02's approved rule, `/entries` displays member entries plus shared Household entries, with Household rows marked and summary chips displaying `own · shared`. The summary chip's **"own" figure (`ownExpenseCentavos`)** matches the member's spending in that category on the dashboard.
  - **Under Household** (`member=household`): Link is `/entries?month=YYYY-MM&category=<categoryId>&owner=household`.
    - Operates as a **link-only Household view** on `/entries`:
      - The owner filter chip button displays `"Household only ▾"`, preventing confusion with F02's standard `"Household ▾"` label (which denotes all members / everyone).
      - `SummaryChips` suppresses the `"0 own · ₱X shared"` breakdown and displays simply the total shared amount (`Expense ₱X`), matching the dashboard's Household category spend.
      - The entries table displays only Household-owned entries (`owner_member_id IS NULL`).
      - F02's dropdown options (`Household` with id `"all"`, and active members) remain untouched; if the user picks any option from the dropdown, `/entries` transitions back to F02's standard filter behavior.
- **Archived category rows**:
  - Rendered with an `(archived)` badge and are strictly **non-clickable** (`isClickable: false`).
- **Unknown Owner Parameter Handling**:
  - If `/entries` receives an `owner` parameter that does not match `"household"` or a valid active member UUID, it gracefully falls back to `"all"`.
- **Preservation of F02 Filter Contract on `/entries`**:
  `src/app/(shell)/entries/page.tsx` and `src/components/entries/entries-screen.tsx` accept initial filter parameters from URL `searchParams`:
  - `month`: initializes active reporting month.
  - `category`: initializes category filter to `<categoryId>` (or `'all'`).
  - `owner`: initializes owner filter to `<memberId>`, `'household'`, or `'all'`.
  - F02's approved member filter rule remains **100% intact**: on `/entries`, choosing a member displays that member's entries plus Household-owned entries, with Household rows marked with a badge and summary chips displaying `own · shared` (`₱X own · ₱Y shared`). Existing F02 unit and component tests remain untouched and green.

---

## 3. Reused Mutation Contracts

### `POST /api/entries` (`+ Add entry` CTA)

Clicking `+ Add entry` opens the existing `EntryModal` component from `src/components/entries/entry-modal.tsx`.
`DashboardViewData` provides full `modalCategories: readonly DashboardModalCategory[]` and `modalMembers: readonly DashboardModalMember[]` so `EntryModal` can populate umbrellas, items, and owners.

#### Request Headers
```http
POST /api/entries HTTP/1.1
Content-Type: application/json
```

#### Request Body
```json
{
  "type": "expense",
  "amount": "2450.50",
  "date": "2026-11-09",
  "itemId": "i8e2a4...",
  "ownerMemberId": null,
  "note": "Weekly market trip"
}
```
*Note: `ownerMemberId` is `null` for Household ownership, or a member UUID string. `note` is optional.*

#### Response (`201 Created`)
```json
{
  "entry": {
    "id": "e9a1b2...",
    "type": "expense",
    "amount": 245050,
    "date": "2026-11-09",
    "itemId": "i8e2a4...",
    "ownerMemberId": null,
    "note": "Weekly market trip",
    "createdAt": "2026-11-09T13:00:00.000Z",
    "updatedAt": "2026-11-09T13:00:00.000Z"
  }
}
```

#### Client Behavior on Success
- Client triggers toast: `"₱2,450.50 added to Groceries"`.
- Closes `EntryModal`.
- Calls `router.refresh()`, re-fetching `getDashboardView` and re-rendering the Server Component with fresh transaction data.

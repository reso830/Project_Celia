# API Contract: F02 — Entries

**Date**: 2026-11-02 | **Data model**: [../data-model.md](../data-model.md) | **Spec**: [../spec.md](../spec.md)

- JSON Route Handlers under `/api`, consumed by Celia's own client components.
- The server binds strictly to `127.0.0.1`, with no remote network exposure.
- Server Components call read functions directly (`src/server/entries-read.ts`, `src/server/categories-read.ts`) after `await connection()`.

---

## 1. Conventions

- Request and response bodies are JSON.
- **Body validation** runs in the route handler via `readBody` before calling domain services:
  - Body must be a valid JSON object.
  - Unknown fields are rejected with `400 validation` and `field` set.
  - All incoming payload fields are strings. `amount` is passed as a string (e.g. `"3240.50"`, `"3240"`) to prevent floating-point loss over JSON transport.
  - `ownerMemberId` is optional: when omitted or passed as empty string `""`, it resolves to Household (`null`).
- **Domain errors** map to HTTP status codes via `errorResponse` in `src/server/http.ts`:
  - Error shape: `{ "error": { "code": string, "message": string, "field"?: string } }`.

| Status | `code` | When |
|---|---|---|
| 400 | `validation` | Zero, negative, malformed amount; invalid date; empty or malformed body; unknown fields |
| 404 | `not_found` | Unknown entry id, item id, or member id |
| 409 | `archived` | Attempting to assign an archived category, item, or member to a new entry or switching to one on edit |
| 409 | `umbrella_mismatch` | On create (`POST`), item's category umbrella does not match the requested entry type (`income` vs `expense`) |
| 409 | `invalid_state` | Attempting to operate on an invalid state |
| 500 | `internal` | Unexpected database error; transaction automatically rolled back |

---

## 2. Mutation Endpoints

### `POST /api/entries`

Creates a new financial entry.

- **Request Body**:
  ```json
  {
    "type": "expense",
    "amount": "3240.50",
    "date": "2026-11-02",
    "itemId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "ownerMemberId": "optional-member-uuid",
    "note": "Optional notes"
  }
  ```
  - Required fields: `type`, `amount`, `date`, `itemId`.
  - Optional fields: `ownerMemberId` (omit or `""` for Household), `note`.
- **Success**: `201 Created`
  ```json
  {
    "entry": {
      "id": "uuid",
      "itemId": "uuid",
      "ownerMemberId": "uuid-or-null",
      "amount": 324050,
      "date": "2026-11-02",
      "note": "Optional notes",
      "type": "expense",
      "itemName": "Supermarket",
      "categoryId": "cat-uuid",
      "categoryName": "Groceries",
      "categoryColor": "#7f9b6e",
      "categoryArchived": false,
      "ownerName": "Household",
      "isHousehold": true,
      "ownerArchived": false,
      "createdAt": "2026-11-02T00:00:00.000Z",
      "updatedAt": "2026-11-02T00:00:00.000Z"
    }
  }
  ```
  *(Note: In Celia, items do not have an independent archive status; an item is considered archived if and only if its parent category is archived [`categoryArchived`]. No separate archived-item lookup is needed.)*
- **Errors**: `validation`, `not_found`, `archived`, `umbrella_mismatch`, `internal`.

---

### `PATCH /api/entries/:id`

Modifies an existing financial entry. Updates metadata and values in-place; never creates a duplicate.

**Type change behavior**: The entry's financial type (`income` vs `expense`) strictly follows `itemId`. If `itemId` is changed to an item belonging to a category with a different umbrella, the entry's type updates automatically without error. There is no `umbrella_mismatch` error on `PATCH`.

- **Request Body**: At least one editable field must be present.
  ```json
  {
    "amount": "4500.00",
    "date": "2026-10-15",
    "itemId": "new-item-uuid",
    "ownerMemberId": "member-uuid",
    "note": "Updated note"
  }
  ```
  - Optional fields: `amount`, `date`, `itemId`, `ownerMemberId` (pass `""` to reassign to Household), `note`.
- **Success**: `200 OK`
  ```json
  {
    "entry": {
      "id": "uuid",
      "itemId": "uuid",
      "ownerMemberId": "uuid-or-null",
      "amount": 450000,
      "date": "2026-10-15",
      "note": "Updated note",
      "type": "expense",
      "itemName": "Market run",
      "categoryId": "cat-uuid",
      "categoryName": "Groceries",
      "categoryColor": "#7f9b6e",
      "categoryArchived": false,
      "ownerName": "Ana",
      "isHousehold": false,
      "ownerArchived": false,
      "createdAt": "2026-11-02T00:00:00.000Z",
      "updatedAt": "2026-11-02T01:15:00.000Z"
    }
  }
  ```
- **Errors**: `validation`, `not_found`, `archived` (if switching to a different archived item or member; retaining existing archived values is permitted), `internal`.

---

### `DELETE /api/entries/:id`

Explicitly deletes a single entry. Requires prior user confirmation in the UI.

- **Request Body**: None (`{}` or absent).
- **Success**: `200 OK`
  ```json
  {
    "id": "uuid"
  }
  ```
- **Errors**: `not_found`, `internal`.

---

## 3. Server-Only Read Functions (`src/server`)

Called directly by Next.js Server Components. Each executes `await connection()` before querying the database to ensure request-time execution.

### `getEntriesView(monthKey?: string)`

Used by `src/app/(shell)/entries/page.tsx`.

- **Input**: `monthKey?: string` (format `"YYYY-MM"`; defaults to current calendar month).
- **Output**:
  ```ts
  type EntriesViewData = {
    month: string;                             // e.g. "2026-11"
    entries: EntryWithDetails[];               // All entries dated in the specified month
    categories: {
      id: string;
      umbrella: ClassifiableUmbrella;
      name: string;
      color: HexColor;
      archived: boolean;
      items: { id: string; name: string }[];
    }[];                                       // Active categories (including categories with 0 items) and active items
    members: {
      id: string;
      name: string;
    }[];                                       // Active members for owner filter and segmented control
    archivedCategories: {
      id: string;
      umbrella: ClassifiableUmbrella;
      name: string;
      color: HexColor;
      items: { id: string; name: string }[];
    }[];                                       // Archived categories referenced by entries in this month (for edit modal)
    archivedMembers: {
      id: string;
      name: string;
    }[];                                       // Archived members referenced by entries in this month (for edit modal)
    defaults: {
      owner: "Household";
      currency: "PHP";
    };
  };
  ```

---

### `getCategoriesView()` (Updated)

Used by `src/app/(shell)/categories/page.tsx` and category dialogs.

- **Enhancement**: Queries real entry counts from `entries-store.ts` (`countEntriesByItem`, `countEntriesByCategory`):
  ```ts
  type CategoryRowDataWithEntries = CategoryRowData & {
    entryCount: number;                        // Total entries across all active items in category
    items: (Item & { entryCount: number })[];  // Entry count per specific item
  };
  ```
- These real counts feed into `MoveItemDialog` ("All N entries under Item move with it") and `MergeCategoryDialog` ("What moves: N items and M entries").

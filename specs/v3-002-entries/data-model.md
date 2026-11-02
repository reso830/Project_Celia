# Data Model: F02 — Entries

**Date**: 2026-11-02 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Storage is a single local SQLite file (`CELIA_DB_PATH`, default `./data/celia.db`), opened with `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL`. The schema version is tracked via `PRAGMA user_version`. F02 introduces migration **2** without altering existing F01 data.

---

## 1. Domain Types (`src/domain`)

### Core Types

```ts
// src/domain/amount.ts
export type Centavos = number; // Non-negative safe integer representing minor currency units (1 PHP = 100 centavos)

// src/domain/entry.ts
import type { ClassifiableUmbrella } from "./umbrella";
import type { HexColor } from "./color";

export type EntryType = ClassifiableUmbrella; // "income" | "expense"

export type Entry = {
  id: string;
  itemId: string;
  ownerMemberId: string | null; // null represents Household
  amount: Centavos;             // positive integer centavos
  date: string;                 // ISO calendar date "YYYY-MM-DD"
  note: string | null;
  createdAt: string;            // ISO-8601 timestamp
  updatedAt: string;            // ISO-8601 timestamp
};

export type EntryWithDetails = Entry & {
  type: EntryType;
  itemName: string;
  categoryId: string;
  categoryName: string;
  categoryColor: HexColor;
  categoryArchived: boolean;
  ownerName: string;            // "Household" or member name
  isHousehold: boolean;
  ownerArchived: boolean;
};

// Item Archive Definition: In Celia, items do not have an independent archive status;
// an item is considered archived if and only if its parent category is archived (categoryArchived).
// No separate archived-item lookup is needed.

export type EntryDraft = {
  type: EntryType;
  amount: string;               // Raw user input e.g. "3240.50"
  date: string;                 // "YYYY-MM-DD"
  itemId: string;
  ownerMemberId: string | null; // null for Household
  note?: string | null;
};
```

### Calculation & Summary Types

```ts
// src/domain/entry-calculations.ts
export type EntryTotals = {
  count: number;
  incomeCentavos: Centavos;
  expenseCentavos: Centavos;
  netCentavos: number;          // income - expense (signed)
};

export type MemberSummarySplit = {
  count: number;
  // Aggregate totals
  incomeCentavos: Centavos;
  expenseCentavos: Centavos;
  netCentavos: number;
  // Own amounts (explicitly assigned to the member)
  ownIncomeCentavos: Centavos;
  ownExpenseCentavos: Centavos;
  ownNetCentavos: number;
  // Shared amounts (assigned to Household)
  sharedIncomeCentavos: Centavos;
  sharedExpenseCentavos: Centavos;
  sharedNetCentavos: number;
};
```

---

## 2. SQLite Schema (Migration 2)

```sql
-- Migration 2: F02 Entries
CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id),
  owner_member_id TEXT REFERENCES members(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  date TEXT NOT NULL CHECK (length(date) = 10 AND date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX entries_date_idx ON entries (date);
CREATE INDEX entries_item_id_idx ON entries (item_id);
CREATE INDEX entries_owner_member_id_idx ON entries (owner_member_id);
```

### Table Column Details: `entries`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `TEXT` | No | UUID v4 (`crypto.randomUUID()`). Stable primary key; never changes on edit. |
| `item_id` | `TEXT` | No | Foreign key referencing `items(id)`. Determines the entry's category and umbrella. |
| `owner_member_id` | `TEXT` | Yes | Foreign key referencing `members(id)`. `NULL` = Household ownership. Foreign key enforced by SQLite. |
| `amount` | `INTEGER` | No | Exact monetary value in integer centavos (1 PHP = 100 centavos). Must be strictly > 0 (`CHECK (amount > 0)`). |
| `date` | `TEXT` | No | Calendar date formatted `YYYY-MM-DD`. `CHECK (length(date) = 10 AND date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')`. |
| `note` | `TEXT` | Yes | Optional free-form text. Searchable. Trimmed; empty strings are stored as `NULL`. |
| `created_at` | `TEXT` | No | ISO-8601 UTC creation timestamp. Preserved across edits. |
| `updated_at` | `TEXT` | No | ISO-8601 UTC timestamp updated on every edit or merge re-point. |

---

## 3. Centralized Validation Rules (`src/domain`)

All validation rules are centralized in `src/domain` and shared by client forms (for inline feedback) and server services (for enforcement).

### Amount Parsing & Validation (`src/domain/amount.ts`)

```ts
export const MAX_AMOUNT_CENTAVOS = 99_999_999_999; // ₱999,999,999.99

export function parseAndValidateAmount(raw: string): 
  | { ok: true; centavos: Centavos }
  | { ok: false; error: string; field: "amount" } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter an amount above zero.", field: "amount" };
  }

  // Allow optional commas in thousands places: e.g. "3,240.50" -> "3240.50"
  const sanitized = trimmed.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(sanitized)) {
    return { 
      ok: false, 
      error: "Amount must be a positive number with at most two decimal places.", 
      field: "amount" 
    };
  }

  const [pesosStr, centavosStr = ""] = sanitized.split(".");
  const pesos = parseInt(pesosStr, 10);
  const centavosPart = parseInt(centavosStr.padEnd(2, "0"), 10);
  const totalCentavos = pesos * 100 + centavosPart;

  if (totalCentavos <= 0) {
    return { ok: false, error: "Enter an amount above zero.", field: "amount" };
  }

  if (totalCentavos > MAX_AMOUNT_CENTAVOS) {
    return { ok: false, error: "Amount exceeds maximum allowed limit (₱999,999,999.99).", field: "amount" };
  }

  return { ok: true, centavos: totalCentavos };
}
```

### Presentation Formatting (`src/domain/amount.ts`)

```ts
export function formatCentavos(
  centavos: Centavos, 
  options?: { signed?: boolean; prefix?: string; forceDecimals?: boolean }
): string {
  const isNegative = centavos < 0;
  const abs = Math.abs(centavos);
  const pesos = Math.floor(abs / 100);
  const cents = abs % 100;
  
  const pesosFormatted = pesos.toLocaleString("en-US");
  const centsFormatted = (cents > 0 || options?.forceDecimals) ? `.${String(cents).padStart(2, "0")}` : "";
  const sign = options?.signed ? (isNegative ? "−" : "+") : "";
  const prefix = options?.prefix ?? "₱";

  return `${sign}${prefix}${pesosFormatted}${centsFormatted}`;
}
```

### Date Validation (`src/domain/entry.ts`)

```ts
export function validateEntryDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (m < 1 || m > 12) return false;
  const dim = new Date(y, m, 0).getDate();
  return d >= 1 && d <= dim;
}
```

---

## 4. Reusable Domain Calculations & Sorting (`src/domain/entry-calculations.ts`)

### In-Memory Filtering

```ts
export type EntryFilterCriteria = {
  monthKey: string;           // "YYYY-MM"
  type?: EntryType | "all";
  categoryId?: string | "all";
  ownerId?: string | "all";   // "all" = Household view (everything); memberId = member + Household
  search?: string;            // trimmed, case-insensitive match on note, item name, or category name
};

export function filterEntries(
  entries: readonly EntryWithDetails[],
  criteria: EntryFilterCriteria
): EntryWithDetails[] {
  const searchLower = criteria.search?.trim().toLowerCase() ?? "";

  return entries.filter((e) => {
    // 1. Month filter (exact match on YYYY-MM)
    if (!e.date.startsWith(criteria.monthKey)) return false;

    // 2. Type filter
    if (criteria.type && criteria.type !== "all" && e.type !== criteria.type) {
      return false;
    }

    // 3. Category filter
    if (criteria.categoryId && criteria.categoryId !== "all" && e.categoryId !== criteria.categoryId) {
      return false;
    }

    // 4. Owner filter:
    // "all" (Household filter) shows every entry.
    // memberId shows member's own entries + Household-owned entries.
    if (criteria.ownerId && criteria.ownerId !== "all") {
      const isOwn = e.ownerMemberId === criteria.ownerId;
      const isShared = e.ownerMemberId === null;
      if (!isOwn && !isShared) return false;
    }

    // 5. Search filter: matches note, item name, or category name
    if (searchLower) {
      const matchItem = e.itemName.toLowerCase().includes(searchLower);
      const matchCat = e.categoryName.toLowerCase().includes(searchLower);
      const matchNote = (e.note ?? "").toLowerCase().includes(searchLower);
      if (!matchItem && !matchCat && !matchNote) return false;
    }

    return true;
  });
}
```

### Deterministic Sorting

```ts
export type SortField = "date" | "amount";
export type SortDirection = "asc" | "desc";

export function sortEntries(
  entries: readonly EntryWithDetails[],
  field: SortField,
  direction: SortDirection
): EntryWithDetails[] {
  const modifier = direction === "asc" ? 1 : -1;

  return [...entries].sort((a, b) => {
    if (field === "date") {
      if (a.date !== b.date) {
        return (a.date < b.date ? -1 : 1) * modifier;
      }
    } else if (field === "amount") {
      if (a.amount !== b.amount) {
        return (a.amount < b.amount ? -1 : 1) * modifier;
      }
    }

    // Secondary tie-breaker: created_at descending
    if (a.createdAt !== b.createdAt) {
      return a.createdAt < b.createdAt ? 1 : -1;
    }

    // Deterministic final tie-breaker: id ascending
    return a.id.localeCompare(b.id);
  });
}
```

### Summary Calculations

```ts
export function calculateTotals(entries: readonly EntryWithDetails[]): EntryTotals {
  let income = 0;
  let expense = 0;
  for (const e of entries) {
    if (e.type === "income") income += e.amount;
    else if (e.type === "expense") expense += e.amount;
  }
  return {
    count: entries.length,
    incomeCentavos: income,
    expenseCentavos: expense,
    netCentavos: income - expense,
  };
}

export function calculateMemberSummary(
  entries: readonly EntryWithDetails[],
  memberId: string
): MemberSummarySplit {
  let ownIncome = 0;
  let ownExpense = 0;
  let sharedIncome = 0;
  let sharedExpense = 0;

  for (const e of entries) {
    if (e.ownerMemberId === memberId) {
      if (e.type === "income") ownIncome += e.amount;
      else ownExpense += e.amount;
    } else if (e.ownerMemberId === null) {
      if (e.type === "income") sharedIncome += e.amount;
      else sharedExpense += e.amount;
    }
  }

  const income = ownIncome + sharedIncome;
  const expense = ownExpense + sharedExpense;

  return {
    count: entries.length,
    incomeCentavos: income,
    expenseCentavos: expense,
    netCentavos: income - expense,
    ownIncomeCentavos: ownIncome,
    ownExpenseCentavos: ownExpense,
    ownNetCentavos: ownIncome - ownExpense,
    sharedIncomeCentavos: sharedIncome,
    sharedExpenseCentavos: sharedExpense,
    sharedNetCentavos: sharedIncome - sharedExpense,
  };
}
```

---

## 5. Historical Integrity & Re-pointing Algorithm

### Merge Update (Atomic inside `mergeCategory` transaction)

When category `S` is merged into category `D`:
1. For each active item `i` in `S`:
   - If destination `D` has an active item `j` with matching `nameKey(i.name) === nameKey(j.name)`:
     - Combined item: `i.merged_into_item_id = j.id`.
     - **F02 Re-point:** `UPDATE entries SET item_id = :j_id, updated_at = :now WHERE item_id = :i_id`.
   - If no name collision, `i.category_id = D.id` (entries stay pointing to `i.id`).
2. `S.merged_into_category_id = D.id`.

### Move Item (`moveItem`)

Entries reference `item_id`. When an item's `category_id` is updated, its entries follow automatically across all history without altering `entries` table rows.

### Archived Classifications & Members

- An entry referencing an archived member or category displays the archived name and swatch normally with an `(archived)` indicator.
- Opening that entry in "Edit entry" preserves the archived value as the selected choice, marked `(archived)`.
- If an entry references an archived category, `getEntriesView()` packages that category and its items so the modal dropdowns can resolve them.
- The user can save edits without changing the archived entity. If switched away to an active entity, the archived one cannot be reselected.

---

## 6. Demo Module Interface (`src/server/demo.ts`)

```ts
export type ClearSummary = {
  entriesCount: number;
  itemsCount: number;
  categoriesCount: number;
  membersCount: number;
};

export type SeedData = {
  _note?: string;
  months: string[];
  owners: Record<string, string>;
  categories: {
    id: string;
    name: string;
    umbrella: "income" | "expense";
    color: string;
    items: string[];
    baselineBudget?: number;
    actualSeries?: number[];
  }[];
  buckets?: unknown[];
  models?: unknown[];
};

export type SeedOptions = {
  seedJson?: SeedData;  // Optional parsed seed data; defaults to reading scripts/seed.json
  currentDate?: string; // Optional "YYYY-MM-DD" calendar date; defaults to today
};

export type SeedResult = {
  entriesSeeded: number;
  membersSeeded: number;
  categoriesSeeded: number;
  itemsSeeded: number;
};

export function getClearSummary(database: Database.Database): ClearSummary;
export function clearAllData(database: Database.Database): ClearSummary;
export function seedDemoData(database: Database.Database, options?: SeedOptions): SeedResult;
```

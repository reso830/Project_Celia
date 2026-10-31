# Data Model: F01 — Core Tracking

**Date**: 2026-09-26 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Storage is a single local SQLite file (`CELIA_DB_PATH`, default `./data/celia.db`), opened
with `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL`. The schema version is
`PRAGMA user_version`; F01 ships migration **1**.

## Domain types (`src/domain`)

```ts
type Umbrella = "income" | "expense" | "savings";
type ClassifiableUmbrella = "income" | "expense";   // umbrellas that hold categories

type Member = {
  id: string;
  name: string;
  archivedAt: string | null;
};

type Category = {
  id: string;
  umbrella: ClassifiableUmbrella;
  name: string;
  color: HexColor;              // "#rrggbb", lowercase
  archivedAt: string | null;
  mergedIntoCategoryId: string | null;
};

type Item = {
  id: string;
  categoryId: string;
  name: string;
  mergedIntoItemId: string | null;
};

// For F02 onward; not persisted in F01
type Owner = { kind: "household" } | { kind: "member"; memberId: string };
```

Derived and never stored: item counts, member counts, "active" (not archived and not
merged), and an item's umbrella (taken from its category).

## Tables (migration 1)

### `household`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Always `'household'`; `CHECK (id = 'household')` |
| `currency` | TEXT NOT NULL | `'PHP'`; `CHECK (currency = 'PHP')` |
| `created_at` | TEXT NOT NULL | ISO-8601 timestamp |

Migration 1 inserts the single row. This is structural, not demo data, and is how the
spec's "exactly one household" and default currency are persisted.

### `umbrellas`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `'income'`, `'expense'`, `'savings'` |
| `sort_order` | INTEGER NOT NULL | Income 1, Expenses 2, Savings 3 |

Migration 1 inserts the three fixed rows. This lookup table lets categories now, and
buckets and budgets later, reference umbrellas by foreign key.

### `members`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `name` | TEXT NOT NULL | Trimmed; non-empty `CHECK (length(name) > 0)` |
| `name_key` | TEXT NOT NULL | Trimmed + lower-cased |
| `archived_at` | TEXT NULL | Set by Remove; cleared by Restore |
| `created_at`, `updated_at` | TEXT NOT NULL | |

`UNIQUE (name_key)`, which includes archived members.

### `categories`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `umbrella_id` | TEXT NOT NULL | FK → `umbrellas.id`; `CHECK (umbrella_id IN ('income','expense'))` |
| `name` | TEXT NOT NULL | Trimmed, non-empty |
| `name_key` | TEXT NOT NULL | |
| `color` | TEXT NOT NULL | `CHECK (color GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]')` |
| `archived_at` | TEXT NULL | |
| `merged_into_category_id` | TEXT NULL | FK → `categories.id` |
| `created_at`, `updated_at` | TEXT NOT NULL | |

Partial unique index `(umbrella_id, name_key) WHERE merged_into_category_id IS NULL`. It
includes archived categories and excludes merged ones.

### `items`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `category_id` | TEXT NOT NULL | FK → `categories.id` |
| `name` | TEXT NOT NULL | Trimmed, non-empty |
| `name_key` | TEXT NOT NULL | |
| `merged_into_item_id` | TEXT NULL | FK → `items.id` |
| `created_at`, `updated_at` | TEXT NOT NULL | |

Partial unique index `(category_id, name_key) WHERE merged_into_item_id IS NULL`. Plain
index on `category_id`.

## State rules

**Member**

- *active* (`archived_at` null) ⇄ *archived*.
- Rename is allowed only while active.

**Category**

- *active* ⇄ *archived* (Archive and Restore).
- *active* → *merged* (terminal).
- Archived and merged categories reject rename, recolour, add-item, and use as a Move or
  Merge source or destination.
- Only active categories appear in destination pickers.

**Item**

- Belongs to exactly one category.
- Rename and Move are allowed only while its category is active.
- Move requires a different, active category with the same umbrella, and no name clash.
- A combined item is terminal (`merged_into_item_id` set).

## Merge algorithm (one transaction)

Given source category `S` and destination category `D`:

1. Check that `S ≠ D`, both are active, and both share an umbrella.
2. For each active item `i` in `S`:
   - If `D` has an active item `j` with `j.name_key = i.name_key`, set
     `i.merged_into_item_id = j.id`. Here F02 will also re-point `entries.item_id` from
     `i` to `j`. Leave `i.category_id = S`, so the combined row is historical only.
   - Otherwise set `i.category_id = D`.
3. Set `S.merged_into_category_id = D` and touch `updated_at` on both categories.

Any failure rolls back the whole merge.

## Validation rules (single source: `src/domain`)

The same rules are used by services on the server and by forms on the client.

| Rule | Function |
|---|---|
| Name is non-empty after trim | `validateName` |
| Name key derivation | `nameKey` |
| Colour is `#rrggbb` (any case in, lowercase out) | `parseHexColor` |
| Umbrella can hold categories | `isClassifiableUmbrella` |

## Extension points (not implemented in F01)

| Later feature | Expected addition | Relies on |
|---|---|---|
| F02 Entries | `entries(item_id FK → items, owner_member_id FK → members NULL = Household, amount INTEGER, …)`; merge step 2 re-points `entries.item_id` | `items.id`, `members.id`, `merged_into_item_id` |
| F03 Savings | `buckets(umbrella_id = 'savings', …)` | `umbrellas` |
| F03 Budget models | `model_lines(model_id, category_id FK, amount INTEGER)`; archive/merge dialogs gain model-impact sections | `categories.id`, `merged_into_category_id` |
| Forecaster | Scenarios referencing categories and buckets | same |

Money columns added by later features use INTEGER (constitution X).

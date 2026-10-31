# API Contract: F01 — Core Tracking

**Date**: 2026-09-26 | **Data model**: [../data-model.md](../data-model.md)

- JSON Route Handlers under `/api`, used only by Celia's own client components.
- The server binds to `127.0.0.1`, and there is no authentication (spec non-goal).
- Reads do not go through HTTP. Server Components call the read functions below directly.

## Conventions

- Request and response bodies are JSON.
- **Body validation** runs in the route handler before any service call. Every failure
  below returns `400 validation`, with `field` set when a specific field is at fault:
  - The body is not valid JSON, or is not a JSON object (an array, string, number or
    `null`).
  - The body has an unknown field.
  - A required field is missing.
  - A field is present but is not a string. This includes `null`, numbers, booleans,
    arrays and objects.
  - For endpoints marked "—" (no body), an absent or empty body (`{}`) is accepted, and
    any field is rejected as unknown.
- After the type check, value rules (non-blank name, hex format, umbrella value) run
  through the `src/domain` validators and also return `400 validation`.
- Success responses return the affected resource(s) in the shapes defined in
  data-model.md.
- Error body: `{ "error": { "code": string, "message": string, "field"?: string } }`.
  `message` is user-facing copy.

| Status | `code` | When |
|---|---|---|
| 400 | `validation` | Blank name, bad hex, bad umbrella, malformed body |
| 404 | `not_found` | Unknown id |
| 409 | `duplicate_name` | Name key clashes within its scope |
| 409 | `archived` | Target member/category is archived (or merged) and the action needs it active |
| 409 | `umbrella_mismatch` | Move/Merge across umbrellas |
| 409 | `same_category` | Move to own category / merge into itself |
| 409 | `invalid_state` | Archive an archived entity, restore an active one |
| 500 | `internal` | Unexpected failure; nothing persisted |

## Members

| Method & path | Body | Success | Errors |
|---|---|---|---|
| `POST /api/members` | `{ name }` | `201 { member }` | validation, duplicate_name |
| `PATCH /api/members/:id` | `{ name }` | `200 { member }` | validation, not_found, duplicate_name, archived |
| `POST /api/members/:id/archive` | — | `200 { member }` | not_found, invalid_state |
| `POST /api/members/:id/restore` | — | `200 { member }` | not_found, invalid_state |

## Categories

| Method & path | Body | Success | Errors |
|---|---|---|---|
| `POST /api/categories` | `{ umbrella: "income" \| "expense", name, color? }` | `201 { category }` (default colour when omitted) | validation, duplicate_name |
| `PATCH /api/categories/:id` | `{ name?, color? }` (at least one) | `200 { category }` | validation, not_found, duplicate_name, archived |
| `POST /api/categories/:id/archive` | — | `200 { category }` | not_found, archived (merged), invalid_state |
| `POST /api/categories/:id/restore` | — | `200 { category }` | not_found, archived (merged), invalid_state |
| `POST /api/categories/:id/merge` | `{ targetCategoryId }` | `200 { target, movedItemIds, combined: [{ fromItemId, intoItemId }] }` | validation, not_found, archived, umbrella_mismatch, same_category |
| `POST /api/categories/:id/items` | `{ name }` | `201 { item }` | validation, not_found, archived, duplicate_name |

## Items

| Method & path | Body | Success | Errors |
|---|---|---|---|
| `PATCH /api/items/:id` | `{ name }` | `200 { item }` | validation, not_found, archived (category), duplicate_name |
| `POST /api/items/:id/move` | `{ targetCategoryId }` | `200 { item }` | validation, not_found, archived, umbrella_mismatch, same_category, duplicate_name |

## Body field types

Every listed field is a string. "Required" means the field must be present and not `null`.

| Endpoint | Required | Optional |
|---|---|---|
| `POST /api/members` | `name` | — |
| `PATCH /api/members/:id` | `name` | — |
| `POST /api/categories` | `umbrella`, `name` | `color` |
| `PATCH /api/categories/:id` | — (at least one of the optional fields) | `name`, `color` |
| `POST /api/categories/:id/merge` | `targetCategoryId` | — |
| `POST /api/categories/:id/items` | `name` | — |
| `PATCH /api/items/:id` | `name` | — |
| `POST /api/items/:id/move` | `targetCategoryId` | — |
| Archive and restore endpoints | — | — |

## Read functions (server-only, `src/server`)

| Function | Returns | Used by |
|---|---|---|
| `getCategoriesView()` | `{ income: CategoryRow[], expense: CategoryRow[] }`. Each row is a non-merged category with its active items, item count and archived flag, sorted by name | `/categories` |
| `getHouseholdView()` | `{ members: Member[], archivedMembers: Member[], defaults: { owner: "Household", currency: "PHP" } }` | `/household` |

Each function calls `await connection()` before querying.

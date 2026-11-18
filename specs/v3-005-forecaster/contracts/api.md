# Route & Interface Contracts: F05 — Forecaster

**Branch**: `v3-005-forecaster` | **Date**: 2026-11-18 (revised Req-Review 2026-11-18) | **Spec**: [spec.md](../spec.md)

---

## 1. Page Route Contract

### `GET /forecaster` (Forecaster Server Page)

Served by the Next.js App Router Server Component at `src/app/(shell)/forecaster/page.tsx`.

#### Query Parameters

| Parameter | Type | Default | Validation & Semantics |
|---|---|---|---|
| `scenario` | `string` | `'baseline'` | Scenario UUID or stable ID (`'baseline'`, `'a'`, `'b'`, `'c'`). If missing, empty, invalid, or matching no scenario, falls back to `'baseline'`. |

#### Empty State Semantics

If the current calendar month has no row in `monthly_budget_plans`, the page renders an empty state:
- Headline: `No budget applied for {Month YYYY}.` (e.g. `No budget applied for November 2026.`)
- Call-to-action link navigating to `/models` to configure and apply a budget plan.
- The page does not fall back to an older month's plan.

#### Server Component Invocation

```typescript
export default async function ForecasterPage({
  searchParams,
}: {
  searchParams: Promise<{
    scenario?: string;
  }>;
}) {
  const params = await searchParams;
  const viewData = await getForecasterView(params.scenario);

  return <ForecasterScreen data={viewData} />;
}
```

---

## 2. API Endpoints

All error responses strictly adhere to Celia's standard error envelope format defined in `src/server/http.ts:72-99`:
```json
{
  "error": {
    "code": "validation" | "not_found" | "invalid_state" | "archived",
    "message": "Human-readable description.",
    "field": "optional_field_name"
  }
}
```

Path parameter `[id]` throughout all scenario routes accepts standard UUIDs and stable seed IDs (`'baseline'`, `'a'`, `'b'`, `'c'`).

---

### 2.1 Scenario Management

#### `GET /api/scenarios`
Returns all scenarios ordered by `display_order ASC`, with their associated events and nudges.

- **Response `200 OK`**:
  ```json
  {
    "scenarios": [
      {
        "id": "baseline",
        "name": "Baseline",
        "shortLabel": "BASELINE",
        "paletteKey": null,
        "startMonth": 0,
        "drawAmount": 0,
        "isBaseline": true,
        "displayOrder": 0,
        "events": [],
        "nudges": []
      },
      {
        "id": "a",
        "name": "A · Buy now, 5-yr loan",
        "shortLabel": "A · LOAN NOW",
        "paletteKey": "teal",
        "startMonth": 5,
        "drawAmount": 9850000,
        "isBaseline": false,
        "displayOrder": 1,
        "events": [],
        "nudges": []
      }
    ]
  }
  ```

#### `POST /api/scenarios`
Creates a new alternative scenario with a preselected palette key.

- **Request Body**:
  ```json
  {
    "name": "D · Secondhand car",
    "shortLabel": "D · SECONDHAND",
    "startMonth": 6,
    "drawAmount": 5000000,
    "paletteKey": "purple"
  }
  ```
- **Validation**:
  - `name`: String, length 1–50, trimmed.
  - `shortLabel`: String, length 1–20, trimmed.
  - `startMonth`: Integer, 0–23.
  - `drawAmount`: Integer centavos, $\ge 0$.
  - `paletteKey`: Strictly one of `"teal"`, `"purple"`, `"gold"`, `"blue"`, `"slate"`. (`"rose"` is not allowed).
- **Response `201 Created`**: Returns created `Scenario` object.
- **Response `400 Bad Request`**: `{ "error": { "code": "validation", "message": "...", "field": "..." } }`

#### `PATCH /api/scenarios/[id]`
Updates an existing scenario's metadata or draw amount.

- **Request Body**: Partial fields (`name`, `shortLabel`, `startMonth`, `drawAmount`, `paletteKey`).
- **Validation**:
  - Baseline scenario cannot be edited: returns `409 Conflict` `{ "error": { "code": "invalid_state", "message": "The baseline scenario cannot be modified." } }`.
  - `startMonth`: Integer, 0–23.
  - `drawAmount`: Integer centavos, $\ge 0$.
  - `paletteKey`: If provided, strictly one of `"teal"`, `"purple"`, `"gold"`, `"blue"`, `"slate"`.
- **Response `200 OK`**: Returns updated `Scenario` object.
- **Response `404 Not Found`**: `{ "error": { "code": "not_found", "message": "Scenario not found." } }`
- **Response `409 Conflict`**: Baseline modification rejected.

#### `DELETE /api/scenarios/[id]`
Deletes an alternative scenario and cascades to its events and nudges.

- **Validation**:
  - Baseline scenario cannot be deleted: returns `409 Conflict` `{ "error": { "code": "invalid_state", "message": "The baseline scenario cannot be deleted." } }`.
- **Response `200 OK`**: `{ "success": true }`
- **Response `404 Not Found`**: `{ "error": { "code": "not_found", "message": "Scenario not found." } }`
- **Response `409 Conflict`**: Baseline deletion rejected.

#### `POST /api/scenarios/[id]/duplicate`
Duplicates a scenario, cloning all its child events and nudges.

- **Validation**:
  - Baseline scenario cannot be duplicated: returns `409 Conflict` `{ "error": { "code": "invalid_state", "message": "The baseline scenario cannot be duplicated." } }`.
- **Behavior**:
  - Sets name to `"${original.name} (Copy)"`.
  - Assigns fresh UUIDs to the scenario, all cloned events, and all cloned nudges.
  - Preserves `paletteKey`, `startMonth`, `drawAmount`, event types/amounts, and nudge deltas.
- **Response `201 Created`**: Returns duplicated `ScenarioWithRelations` object.
- **Response `404 Not Found`**: `{ "error": { "code": "not_found", "message": "Scenario not found." } }`
- **Response `409 Conflict`**: Baseline duplication rejected.

---

### 2.2 Event Management

#### `POST /api/scenarios/[id]/events`
Adds a hypothetical financial event (flat monthly cost) to an alternative scenario.

- **Request Body**:
  ```json
  {
    "name": "Car maintenance",
    "type": "recurring",
    "monthlyAmount": 720000,
    "description": "Monthly maintenance estimate"
  }
  ```
- **Validation**:
  - Baseline scenario cannot accept events: returns `409 Conflict` `{ "error": { "code": "invalid_state", "message": "Events cannot be added to the baseline scenario." } }`.
  - `name`: String, length 1–50, trimmed.
  - `type`: Strictly one of `"financed purchase"`, `"recurring"`, `"seasonal"`. (`"seasonal"` is the flat monthly equivalent of an annual cost, e.g. ₱9,600/yr = ₱800/mo).
  - `monthlyAmount`: Positive integer centavos ($> 0$).
  - `description`: Optional string or null (max 200 chars).
- **Response `201 Created`**: Returns created `ScenarioEvent`.
- **Response `400 Bad Request`**: Validation error.
- **Response `409 Conflict`**: Baseline mutation attempt.

#### `PATCH /api/scenarios/[id]/events/[eventId]`
Updates an existing event.

- **Request Body**: Partial fields (`name`, `type`, `monthlyAmount`, `description`).
- **Validation**:
  - `type`: If provided, strictly one of `"financed purchase"`, `"recurring"`, `"seasonal"`.
  - `monthlyAmount`: If provided, positive integer centavos ($> 0$).
- **Response `200 OK`**: Returns updated `ScenarioEvent`.
- **Response `404 Not Found`**: Event or scenario not found.

#### `DELETE /api/scenarios/[id]/events/[eventId]`
Deletes an event from a scenario.

- **Response `200 OK`**: `{ "success": true }`
- **Response `404 Not Found`**: Event not found.

---

### 2.3 Budget Nudge Adjustments

#### `PUT /api/scenarios/[id]/nudges`
Upserts a category or bucket budget nudge for a scenario.

- **Request Body**:
  ```json
  {
    "targetType": "category",
    "categoryId": "cat-uuid",
    "bucketId": null,
    "deltaAmount": -200000
  }
  ```
- **Validation**:
  - Baseline scenario cannot be nudged: returns `409 Conflict` `{ "error": { "code": "invalid_state", "message": "Budget nudges cannot be applied to the baseline scenario." } }`.
  - Target archived check: If `categoryId` or `bucketId` references an archived entity, returns `409 Conflict` `{ "error": { "code": "archived", "message": "Cannot nudge an archived category or bucket." } }`.
  - `targetType`: Strictly `"category"` or `"bucket"`.
  - If `targetType === "category"`: `categoryId` must be non-null and belong to an active expense category; `bucketId` must be null. (Nudges are never permitted on income categories).
  - If `targetType === "bucket"`: `bucketId` must be non-null and belong to an active savings bucket; `categoryId` must be null.
  - `deltaAmount`: Signed integer centavos.
- **Response `200 OK`**: Returns saved `ScenarioNudge`.
- **Response `400 Bad Request`**: Validation failed.
- **Response `409 Conflict`**: Baseline mutation attempt or target archived.

---

## 3. View Model Contract

The server page resolves and passes `ForecasterViewData` directly as defined in [data-model.md §1](../data-model.md#1-domain-entities-and-view-models). The domain layer contains strictly numerical and semantic types with zero formatted currency strings, zero SVG coordinates, and zero hex colors (Constitution Principle VIII). Formatting, currency symbols, and presentation styling (such as palette color mapping and badge backgrounds) are handled exclusively by UI components.

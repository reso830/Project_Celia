# Data Model & Schema Specification: F05 — Forecaster

**Branch**: `v3-005-forecaster` | **Date**: 2026-11-18 (revised Req-Review 2026-11-18) | **Spec**: [spec.md](spec.md)

---

## 1. Domain Entities and View Models

All monetary quantities are strictly represented as integer minor units (`Centavos`, integer $\ge 0$, except signed `deltaAmount`). Domain structures contain zero server-only dependencies, zero hex color codes, and zero formatted display strings (Constitution Principle VIII).

```typescript
import type { Centavos } from "./amount";

export type ScenarioEventType = "financed purchase" | "recurring" | "seasonal";
export type ForecastVerdictTier = "Comfortable" | "Tight but doable" | "Risky buffer";
export type ForecastStatusTone = "favourable" | "warning" | "critical";
export type PaletteKey = "teal" | "purple" | "gold" | "blue" | "slate";

export interface ForecastVerdict {
  tier: ForecastVerdictTier;
  statusTone: ForecastStatusTone;
}

export interface ScenarioEvent {
  id: string;
  scenarioId: string;
  name: string;
  type: ScenarioEventType;
  monthlyAmount: Centavos; // > 0
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioNudge {
  id: string;
  scenarioId: string;
  targetType: "category" | "bucket";
  categoryId: string | null;
  bucketId: string | null;
  deltaAmount: Centavos; // Signed integer: negative frees money, positive increases allocation
  updatedAt: string;
}

export interface ScenarioNudgeDerived extends ScenarioNudge {
  targetName: string;
  isArchived: boolean;
  baseAllocation: Centavos;
  adjustedAllocation: Centavos; // max(0, baseAllocation + deltaAmount)
  freedAmount: Centavos; // baseAllocation - adjustedAllocation
}

export interface Scenario {
  id: string;
  name: string;
  shortLabel: string;
  paletteKey: PaletteKey | null; // null for baseline; one of the 5 keys for alternatives
  startMonth: number; // 0..23 relative offset
  drawAmount: Centavos; // >= 0
  isBaseline: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioWithRelations extends Scenario {
  events: ScenarioEvent[];
  nudges: ScenarioNudgeDerived[];
}

export interface BaselineMetrics {
  planId: string | null; // null when hasAppliedPlan is false
  modelName: string; // e.g. "Baseline 2026", or empty string when no plan applied
  monthlyIncome: Centavos;
  monthlyExpense: Centavos;
  monthlySavings: Centavos;
  monthlyUnallocated: Centavos;
  startingBuffer: Centavos;
  runwayMonths: number | null; // null if monthlyExpense == 0 and startingBuffer > 0
  verdict: ForecastVerdict;
}

export interface ScenarioMetrics {
  scenarioId: string;
  monthlyExpense: Centavos;
  monthlyUnallocated: Centavos;
  drawnFromBuffer: Centavos;
  bufferAfter: Centavos;
  runwayMonths: number | null; // null if monthlyExpense == 0 and bufferAfter > 0; 0.0 if bufferAfter <= 0
  verdict: ForecastVerdict;
}

export interface OutlookBar {
  monthIndex: number; // 0..23
  monthKey: string; // e.g. "2026-11"
  unallocatedCentavos: Centavos;
  heightRatioInContainer: number; // Bar height as fraction of zero-rule container (U_0 / domainHi)
  isNegative: boolean; // true if baseline unallocated < 0 (hangs down)
}

export interface OutlookPolyline {
  scenarioId: string;
  points: { x: number; y: number }[]; // Normalized (x, y) in [0, 1] x [0, 1]
}

export interface OutlookData {
  bars: OutlookBar[];
  polylines: OutlookPolyline[];
  zeroRuleRatio: number; // 0..1 vertical coordinate of the zero rule line
  milestones: { index: number; monthKey: string }[];
}

export interface ForecasterViewData {
  baselineName: string;
  appliedMonthKey: string; // e.g. "2026-11"
  activeScenarioId: string;
  hasAppliedPlan: boolean;
  scenarios: ScenarioWithRelations[];
  baselineMetrics: BaselineMetrics;
  selectedMetrics: ScenarioMetrics;
  comparisonMetrics: ScenarioMetrics[];
  outlook: OutlookData;
}
```

---

## 2. Database Schema (Migration 4)

SQLite migration registered in `src/server/db/migrations.ts` with `version: 4`.

```sql
-- Scenarios Table
CREATE TABLE scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) > 0),
  short_label TEXT NOT NULL CHECK (length(short_label) > 0),
  palette_key TEXT CHECK (
    (is_baseline = 1 AND palette_key IS NULL) OR
    (is_baseline = 0 AND palette_key IS NOT NULL AND palette_key IN ('teal', 'purple', 'gold', 'blue', 'slate'))
  ),
  start_month INTEGER NOT NULL DEFAULT 0 CHECK (
    start_month >= 0 AND start_month <= 23 AND typeof(start_month) = 'integer'
  ),
  draw_amount INTEGER NOT NULL DEFAULT 0 CHECK (
    draw_amount >= 0 AND typeof(draw_amount) = 'integer'
  ),
  is_baseline INTEGER NOT NULL DEFAULT 0 CHECK (
    is_baseline IN (0, 1) AND typeof(is_baseline) = 'integer'
  ),
  display_order INTEGER NOT NULL DEFAULT 0 CHECK (
    typeof(display_order) = 'integer'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Invariant: Exactly one baseline scenario
CREATE UNIQUE INDEX scenarios_baseline_unique ON scenarios (is_baseline) WHERE is_baseline = 1;

-- Hypothetical Scenario Events Table
CREATE TABLE scenario_events (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) > 0),
  type TEXT NOT NULL CHECK (type IN ('financed purchase', 'recurring', 'seasonal')),
  monthly_amount INTEGER NOT NULL CHECK (
    monthly_amount > 0 AND typeof(monthly_amount) = 'integer'
  ),
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_scenario_events_scenario_id ON scenario_events(scenario_id);

-- Budget Nudges Table (Signed centavo delta)
CREATE TABLE scenario_nudges (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('category', 'bucket')),
  category_id TEXT REFERENCES categories(id),
  bucket_id TEXT REFERENCES savings_buckets(id),
  delta_amount INTEGER NOT NULL CHECK (typeof(delta_amount) = 'integer'),
  updated_at TEXT NOT NULL,
  CHECK (
    (target_type = 'category' AND category_id IS NOT NULL AND bucket_id IS NULL) OR
    (target_type = 'bucket' AND bucket_id IS NOT NULL AND category_id IS NULL)
  )
);

CREATE UNIQUE INDEX idx_scenario_nudges_category
  ON scenario_nudges(scenario_id, category_id) WHERE category_id IS NOT NULL;
CREATE UNIQUE INDEX idx_scenario_nudges_bucket
  ON scenario_nudges(scenario_id, bucket_id) WHERE bucket_id IS NOT NULL;
```

Baseline row insertion in `migrationFour`:
```typescript
const now = new Date().toISOString();
database.prepare(`
  INSERT INTO scenarios (
    id, name, short_label, palette_key, start_month, draw_amount, is_baseline, display_order, created_at, updated_at
  ) VALUES (
    'baseline', 'Baseline', 'BASELINE', NULL, 0, 0, 1, 0, ?, ?
  )
`).run(now, now);
```

---

## 3. Seed Dataset Specification

The seed runner (`src/server/demo.ts:seedDemoData` invoked via `npm run seed`) requires an otherwise empty database (wiped via `npm run clear -- --yes`). It rewrites prototype scenario entries to match this schema using signed integer centavo deltas. Note: `seedDemoData` skips creating the baseline row (since Migration 4 creates it), and `getClearSummary` counts `SELECT COUNT(*) AS count FROM scenarios WHERE is_baseline = 0`:

### 1. Baseline
Auto-created by Migration 4 with `id: 'baseline'`, `is_baseline: 1`, `start_month: 0`, and `palette_key: NULL`. Its display name dynamically reflects the current month's applied budget plan `model_name` (e.g. `"Baseline 2026"`), and its UI styling is fixed (`#3a4145`).

### 2. Scenario A · Buy now, 5-yr loan
```json
{
  "id": "a",
  "name": "A · Buy now, 5-yr loan",
  "shortLabel": "A · LOAN NOW",
  "paletteKey": "teal",
  "startMonth": 5,
  "drawAmount": 9850000,
  "isBaseline": false,
  "displayOrder": 1,
  "events": [
    { "name": "Car", "type": "financed purchase", "monthlyAmount": 1843000, "description": null },
    { "name": "Running costs", "type": "recurring", "monthlyAmount": 720000, "description": null },
    { "name": "Registration", "type": "seasonal", "monthlyAmount": 80000, "description": "Annual registration equivalent" }
  ],
  "nudges": [
    { "targetType": "category", "categoryNameKey": "groceries", "deltaAmount": -200000 },
    { "targetType": "category", "categoryNameKey": "dining out", "deltaAmount": -200000 },
    { "targetType": "category", "categoryNameKey": "transport", "deltaAmount": -450000 },
    { "targetType": "bucket", "bucketId": "car", "bucketNameKey": "car down payment", "deltaAmount": 500000 }
  ]
}
```

### 3. Scenario B · Wait 6 months
```json
{
  "id": "b",
  "name": "B · Wait 6 months",
  "shortLabel": "B · WAIT",
  "paletteKey": "purple",
  "startMonth": 11,
  "drawAmount": 0,
  "isBaseline": false,
  "displayOrder": 2,
  "events": [
    { "name": "Car", "type": "financed purchase", "monthlyAmount": 1520000, "description": null },
    { "name": "Running costs", "type": "recurring", "monthlyAmount": 720000, "description": null }
  ],
  "nudges": [
    { "targetType": "category", "categoryNameKey": "dining out", "deltaAmount": -100000 }
  ]
}
```

### 4. Scenario C · Pay cash
```json
{
  "id": "c",
  "name": "C · Pay cash",
  "shortLabel": "C · CASH",
  "paletteKey": "gold",
  "startMonth": 5,
  "drawAmount": 51850000,
  "isBaseline": false,
  "displayOrder": 3,
  "events": [
    { "name": "Running costs", "type": "recurring", "monthlyAmount": 720000, "description": null }
  ],
  "nudges": [
    { "targetType": "category", "categoryNameKey": "dining out", "deltaAmount": -200000 }
  ]
}
```

---

## 4. Referential Integrity & Invariant Rules

1. **Baseline Invariance & Migration Creation**:
   - `scenarios_baseline_unique` ensures only one baseline scenario can ever exist.
   - The baseline row is created by Migration 4 using an ISO-8601 timestamp. `clearAllData` preserves the baseline row.
   - `getClearSummary` counts only non-baseline scenarios (`WHERE is_baseline = 0`), allowing `seedDemoData` to run successfully.
   - Store operations reject updating `is_baseline`, renaming, assigning buffer draws or events, nudging, duplicating, or deleting the baseline scenario, returning `409 Conflict` (`invalid_state`).
2. **Plain Foreign Keys on Nudges**:
   - `category_id REFERENCES categories(id)` and `bucket_id REFERENCES savings_buckets(id)` have no `ON DELETE` clause. Archiving in Celia does not delete rows (`archived_at` is set).
   - If a target is archived, its nudge is retained and rendered with an `(archived)` badge and disabled stepper controls.
   - Calling `PUT /api/scenarios/[id]/nudges` on an archived category or bucket returns `409 Conflict` (`archived`).
3. **Category Merge Re-Pointing & Transitive Base Budget**:
   - When categories are merged (`src/server/categories-service.ts:302`), `mergeCategoryNudges(database, sourceCategoryId, targetCategoryId, now)` is called within the merge transaction. If the scenario already had a nudge for the target category, their `delta_amount` values are summed and the source nudge is removed.
   - The read model calculates the surviving category's base budget by folding allocations from categories transitively merged into it using a recursive CTE:
     ```sql
     WITH RECURSIVE merged_tree(id) AS (
       SELECT id FROM categories WHERE id = :survivingCategoryId
       UNION ALL
       SELECT c.id FROM categories c JOIN merged_tree mt ON c.merged_into_category_id = mt.id
     )
     SELECT COALESCE(SUM(amount), 0) FROM monthly_budget_allocations
     WHERE plan_id = :planId AND category_id IN (SELECT id FROM merged_tree);
     ```
4. **Strict Integer Validation**:
   - SQLite table definitions enforce `typeof(...) = 'integer'` on `monthly_amount`, `draw_amount`, `delta_amount`, `start_month`, and `display_order` to prevent floating-point values from entering the database.
5. **Nudge Save Queue Concurrency & Interim Failure Continuity**:
   - Client-side updates process saves sequentially per row, ensuring older network requests cannot overwrite newer edits.
   - When an older save fails while a newer edit is queued behind it, the newer edit remains visible in the UI and is dispatched next. An error toast notifies the user of the interim sync failure.
   - If the final queued save fails with no subsequent edits queued, the row rolls back to the confirmed server delta and emits an error toast.

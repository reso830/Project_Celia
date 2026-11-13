# Technical Research: F04 — Dashboard & Reporting

**Branch**: `v3-004-dashboard-reporting` | **Date**: 2026-11-09 (revised 2026-11-10) | **Spec**: [spec.md](spec.md)

## Executive Summary

F04 introduces Celia's primary Dashboard (`/`), transforming recorded transactions (F02), savings buckets and contributions (F03), and monthly budget models (F03) into actionable visual reporting. Research focused on:
1. Deconstructing the interactive hi-fi prototype (`handoff/celia_v3_001.zip: reference/Money Tracker Hi-Fi.dc.html`) to extract precise geometry, color scales, and sparkline algorithms.
2. Evaluating read-model performance across 12-month historical windows in SQLite without denormalized caches or redundant writes, targeting server render latency under 100ms.
3. Defining robust, deterministic math for 270° SVG arc gauges, multi-series sparklines, diverging category comparisons, and horizontal member distribution bars.
4. Ensuring keyboard accessibility and zero horizontal scroll at $\ge$1100px desktop widths.

---

## 1. Prototype Geometry & Visual Specifications

Analysis of `Money Tracker Hi-Fi.dc.html` (lines 50–205 and 830–985) establishes exact visual rules:

### 1.1 Savings Buffer Hero Card (Row 1 Left)
- **Container**: Background `#3a4145` (`var(--celia-hero-card)`), radius 14px, padding 20px. Flex layout with space-between alignment and 16px gap.
- **Typography**:
  - Label: `SAVINGS BUFFER`, 11px, weight 500, letter-spacing `0.07em`, color `#b7bec0` (`var(--celia-muted-on-dark)`).
  - Main figure: JetBrains Mono 700 38px, white (`#ffffff`), line-height 1, letter-spacing `-0.03em`.
  - Subtitle: `"N.N months runway"`, Sora 600 15px, color `#ced4d5`, margin-top 8px.
- **Sparkline**:
  - SVG dimensions: `viewBox="0 0 120 48"`, `preserveAspectRatio="none"`, max-width 120px, height 44px.
  - Stroke: `#8fd0c9`, width 3.4px, `stroke-linecap="round"`, `stroke-linejoin="round"`, fill `none`.
  - Points algorithm: Historical buffer balance evaluated for each month in the 12-month rolling window ending with the selected month across **active buffer buckets only**:
    $$\text{balance}(M) = \sum_{\substack{b \in \text{active buffer buckets} \\ \text{substr}(b.\text{createdAt}, 1, 7) \le M}} b.\text{openingBalance} + \sum_{\substack{a \in \text{contribs} \\ a.\text{date} < \text{nextMonthStart}(M)}} a.\text{amount} - \sum_{\substack{a \in \text{withdrawals} \\ a.\text{date} < \text{nextMonthStart}(M)}} a.\text{amount}$$
    A bucket's opening balance contributes to the buffer **only for months on or after that bucket's creation month** (`substr(b.createdAt, 1, 7) <= monthKey`). A month with no savings activity **carries forward** the previous month's balance (does not drop to zero). Backdated activities are included based on effective financial date.
  - Coordinate Normalization & Architecture Separation:
    - Domain Helper (`generateSparklineRatios(values)`): produces pure normalized coordinates in the unit square $(x, y) \in [0, 1] \times [0, 1]$:
      - If `values.length === 0`: returns `[]`.
      - If `values.length === 1`: returns `[{ x: 0.5, y: values[0] > 0 ? 0.5 : 0 }]`.
      - If `values.length > 1`: $x_i = i / (N - 1)$. If $\max === 0$, $y_i = 0$ (baseline). If $\max === \min > 0$, $y_i = 0.5$ (centered horizontal line). Otherwise, $y_i = \text{values}[i] / \max$.
    - Presentational UI (`savings-buffer-hero.tsx`): converts normalized ratios into SVG pixel coordinates:
      - `svgX = point.x * 120`
      - `svgY = 44 - point.y * 36` (padded 4px top and bottom, so $y \in [4, 44]$). If empty or $\max = 0$, renders flat horizontal stroke at $y = 44$.

### 1.2 Burn Rate Gauge (Row 2 Left)
- **Container**: Width 280px (fixed on desktop), border `#e3e7e8`, background white, radius 12px, padding 20px.
- **Geometry**:
  - Outer bounding box: `viewBox="0 0 200 182"`, center $(cx, cy) = (100, 100)$, radius $r = 76$, value stroke width $18$ and outer status band stroke width $5$.
  - Sweep angle: 270° circular arc.
  - Angle definitions (in degrees, where 0° is 3 o'clock / East):
    - Arc starts at 135° (bottom-left) and sweeps clockwise 270° through 180°, 270° (top), 0° (right), to 45° (bottom-right).
    - Track length: $L = 2 \pi r \times (270 / 360) = 2 \pi (76) \times 0.75 \approx 358.14\text{px}$.
  - Outer track: three static green, amber and red status bands matching the prototype paths.
  - Foreground value arc:
    - Angular progression: $\theta = 135^\circ + (\text{arcRatio} \times 270^\circ)$.
    - When `arcRatio = 0`: no foreground path rendered.
    - When `0 < arcRatio <= 1.0`: clockwise SVG endpoint arc at angle θ, with large-arc flag set when `arcRatio > 2/3`; no dash-offset geometry.
- **Status Thresholds & Display States**:
  The domain returns pure `state` and `statusTone` enums. The UI component formats center text and subtitle:
  - `"no_plan"`: neutral slate `#636f73`, `arcRatio = 0`. UI renders `"—"`, `"No plan applied"`.
  - `"zero_budget_zero_spend"`: neutral slate `#636f73`, `arcRatio = 0`. UI renders `"—"`, `"Zero budget · ₱0 spent"`.
  - `"zero_budget_overspent"`: critical red `#b0533c`, `arcRatio = 1.0` (full 270° arc). UI renders `"Overspent"`, `"No budget allocated"`.
  - `"income_category"`: neutral slate `#636f73`, `arcRatio = 0`. UI renders `"—"`, `"Income category selected"`.
  - `"under_pace"` (<85%): green `#3f7d5c` (`var(--celia-status-favourable)`). UI renders `"${utilizationPercent}%"`, `"Under pace"`.
  - `"on_pace"` (85–115%): amber `#d3a13f` (`var(--celia-status-warning)`). UI renders `"${utilizationPercent}%"`, `"On pace"`.
  - `"over_pace"` (>115%): red `#b0533c` (`var(--celia-status-critical)`). UI renders `"${utilizationPercent}%"`, `"Over pace"`.

### 1.3 Budget Trend Bar Chart (Row 2 Right)
- **Container**: Flex 1, border `#e3e7e8`, background white, radius 12px, padding 20px.
- **Controls**: Pill segmented control for `6 mo` / `12 mo`.
- **Peak Scaling**:
  $$\text{peak} = \max(1, \max(\text{selectedBudget}, \text{actual}_1, \dots, \text{actual}_N) \times 1.12)$$
  The `max(1, ...)` guard eliminates `0/0` division on fresh or zero-spend installs.
- **Bar Heights**: Each bar's height is $\text{actualExpensesCentavos} / \text{peak}$.
- **Overspent Evaluation**: Each bar $m$ is compared against **that month's own applied budget plan** (`actual > monthlyPlans.get(m)`). Unbudgeted months are rendered neutral grey and are never flagged as overspent.
- **Income Category Handling**: When an income category is filtered, the trend chart renders an empty state: `"Expense trend not applicable to income categories"`.
- **Selected Month Budget Line**: Rendered as a dashed horizontal line across the chart at ratio $\text{selectedBudget} / \text{peak}$.

---

## 2. Mathematical Algorithms

### 2.1 Savings Buffer Runway
Reuses F03's `calculateSavingsKpis` from `@/domain/savings-calculations`:
$$\text{Runway} = \begin{cases} \text{null} & \text{if monthlyExpensesCentavos} = 0 \\ \text{round}\left(\frac{\text{bufferCentavos} \times 10}{\text{monthlyExpensesCentavos}}\right) / 10 & \text{otherwise} \end{cases}$$
UI renders `"N.N months runway"` (or `"—"` when null).

### 2.2 Category Variance & Rollover
Reuses F03's `calculateBudgetComparisonRows` from `@/domain/budget-calculations`:
- Variance $\Delta = \text{budget} - \text{spent}$ (favourable-positive everywhere).
- Rollover `↺` = $\text{budget} - \text{spent}$ when $\text{budget} > \text{spent}$, else `null` (`"—"`).
- Folded merge rows (`isFoldedIntoMergeTarget === true`) are excluded from table totals to prevent double-counting.

---

## 3. Server-Side Data Flow & SQL Queries

All read operations execute in a single synchronous pass over local SQLite within `getDashboardView`:

### 3.1 Date Boundary Optimization
To leverage `entries_date_idx` without expensive month-end date calculations, date ranges use half-open intervals:
- Start: `YYYY-MM-01`
- Next Month Start: Computed via `nextMonthKey(endMonth) + "-01"`
- Condition: `e.date >= :startDate AND e.date < :nextMonthStart`

### 3.2 Authoritative Aggregation Query
```sql
SELECT 
  substr(e.date, 1, 7) AS month_key,
  c.umbrella_id AS type,
  e.owner_member_id,
  c.id AS category_id,
  c.name AS category_name,
  c.color AS category_color,
  SUM(e.amount) AS total_centavos
FROM entries e
JOIN items i ON i.id = e.item_id
JOIN categories c ON c.id = i.category_id
WHERE e.date >= :startDate AND e.date < :nextMonthStart
GROUP BY substr(e.date, 1, 7), c.umbrella_id, e.owner_member_id, c.id;
```

### 3.3 Historical Savings Query
```sql
SELECT 
  a.bucket_id,
  substr(a.date, 1, 7) AS month_key,
  a.kind,
  SUM(a.amount) AS total_centavos
FROM savings_activities a
JOIN savings_buckets b ON b.id = a.bucket_id
WHERE b.archived_at IS NULL AND a.date < :nextMonthStart
GROUP BY a.bucket_id, substr(a.date, 1, 7), a.kind;
```
When a bucket is archived, it leaves active queries, maintaining consistency with F03 `/savings`.

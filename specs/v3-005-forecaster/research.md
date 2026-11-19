# Technical Research: F05 — Forecaster

**Branch**: `v3-005-forecaster` | **Date**: 2026-11-18 (revised Req-Review 2026-11-18) | **Spec**: [spec.md](spec.md)

---

## Executive Summary

F05 introduces Celia's forward-looking **Forecaster** (`/forecaster`), simulating hypothetical scenarios over a 24-month horizon without altering actual transactions, savings activities, or applied monthly budget plans. Technical research focused on:
1. Grounding the baseline in the current calendar month's applied budget plan (`monthly_budget_plans`), ensuring historical snapshots and revisions are preserved.
2. Defining deterministic financial mathematics separating expense category adjustments from savings bucket adjustments per Constitution Principle IV ("Savings are not expenses").
3. Resolving runway precedence: an overdrawn buffer ($\le 0$) always wins and reports `0.0 mo` / `Risky buffer`.
4. Establishing normalized chart coordinate mapping ($(x, y) \in [0, 1] \times [0, 1]$) with flat 24-month baseline bars sized via `heightRatio / zeroRuleRatio = U_0 / domainHi` to align with the baseline polyline, hanging downwards below the zero rule line when negative.
5. Specifying sequential per-row nudge persistence queues with interim failure continuity to guarantee request ordering, visual stability, and safe terminal rollback.

---

## 1. Domain Mathematical Models

### 1.1 Baseline Derivation (Decision D1)
The baseline values derive from the row in `monthly_budget_plans` where `month_key = currentMonthKey()` and its allocations (`monthly_budget_allocations`):
- $I_0 = \sum \text{applied income category allocations}$
- $E_0 = \sum \text{applied expense category allocations}$
- $S_0 = \sum \text{applied savings bucket allocations}$
- $U_0 = I_0 - E_0 - S_0$ (Baseline monthly unallocated cash flow)
- $B_0 = \sum \text{currentBalance of active buckets with } counts\_toward\_buffer = 1$
- Starting Baseline Runway:
  $$R_0 = \begin{cases} 0.0 & \text{if } B_0 \le 0 \\ \text{null} & \text{if } E_0 = 0 \text{ and } B_0 > 0 \\ \text{round}(B_0 \times 10 / E_0) / 10 & \text{if } B_0 > 0 \text{ and } E_0 > 0 \end{cases}$$

### 1.2 Scenario Impact Mathematics (Decisions D2, D3, D4)

For any scenario $S$:

1. **Net Event Monthly Impact** (costs only, $e.\text{monthlyAmount} > 0$):
   $$\Delta E_{\text{events}} = \sum_{e \in S.\text{events}} e.\text{monthlyAmount}$$
2. **Nudge Delta & Freed Funds**:
   - Each nudge stores a signed integer `deltaAmount`.
   - $\text{adjustedAllocation} = \max(0, \text{baseAllocation} + \text{deltaAmount})$
   - $\text{freedAmount} = \text{baseAllocation} - \text{adjustedAllocation}$
   - Nudges on **Expense Categories**:
     $$\Delta E_{\text{nudges}} = \sum_{n \in S.\text{nudges}_{\text{expense}}} n.\text{freedAmount}$$
   - Nudges on **Savings Buckets**:
     $$\Delta S_{\text{nudges}} = \sum_{n \in S.\text{nudges}_{\text{savings}}} n.\text{freedAmount}$$
3. **Scenario Monthly Expense** (affected ONLY by expense allocations, events, and expense nudges):
   $$E_S = E_0 + \Delta E_{\text{events}} - \Delta E_{\text{nudges}}$$
4. **Scenario Monthly Unallocated** (affected by all adjustments):
   $$U_S = U_0 - \Delta E_{\text{events}} + \Delta E_{\text{nudges}} + \Delta S_{\text{nudges}}$$
5. **Scenario Ending Buffer**:
   $$B_S = B_0 - S.\text{drawAmount}$$
6. **Scenario Runway Precedence Rule** (overdrawn buffer priority):
   - If the buffer is zero or negative ($B_S \le 0$), the buffer condition **always wins**, producing `0.0 mo` and `Risky buffer` regardless of monthly expenses.
   - If monthly expenses are zero ($E_S = 0$) and the buffer is positive ($B_S > 0$), runway is undefined (`null`, displayed as `—`), and the verdict derives strictly from monthly unallocated cash flow.
   - Otherwise, runway is rounded to 0.1 months:
   $$R_S = \begin{cases} 0.0 & \text{if } B_S \le 0 \\ \text{null} & \text{if } E_S = 0 \text{ and } B_S > 0 \\ \text{round}(B_S \times 10 / E_S) / 10 & \text{if } B_S > 0 \text{ and } E_S > 0 \end{cases}$$

### 1.3 Category Merge Handling
When categories are merged via `src/server/categories-service.ts`:
1. `mergeCategoryNudges(db, sourceCategoryId, targetCategoryId, now)` is executed in the merge transaction.
2. Nudges on the merged category are re-pointed to the target category and their `delta_amount`s are summed.
3. The base budget for the surviving category folds in allocations from all categories transitively merged into it using a recursive CTE (`merged_tree`), ensuring baseline allocations and freed amounts remain accurate across chained merges.

---

## 2. The 3-Tier Verdict Matrix (Decision D6)

The verdict evaluates the rounded runway $R_S$ and net cash flow $U_S$:

```typescript
export function calculateVerdict(
  runwayMonths: number | null,
  monthlyUnallocated: Centavos,
): ForecastVerdict {
  if (runwayMonths === null) {
    // Zero monthly expenses with positive buffer
    return monthlyUnallocated >= 0
      ? { tier: "Comfortable", statusTone: "favourable" }
      : { tier: "Risky buffer", statusTone: "critical" };
  }

  if (runwayMonths <= 0.0) {
    // Overdrawn or zero buffer
    return { tier: "Risky buffer", statusTone: "critical" };
  }

  if (monthlyUnallocated < 0) {
    return runwayMonths >= 6.0
      ? { tier: "Tight but doable", statusTone: "warning" }
      : { tier: "Risky buffer", statusTone: "critical" };
  }

  // monthlyUnallocated >= 0 and runwayMonths > 0.0
  if (runwayMonths >= 6.0) {
    return { tier: "Comfortable", statusTone: "favourable" };
  }
  if (runwayMonths >= 3.0) {
    return { tier: "Tight but doable", statusTone: "warning" };
  }
  return { tier: "Risky buffer", statusTone: "critical" };
}
```

### Presentation Tokens (UI Layer)
- **Comfortable**: Text `#2c6647`, Background `#f1f7f3`, Border `#bcd7c8`.
- **Tight but doable**: Text `#8a6516` (accessible contrast $\ge 4.5:1$ against `#fdf9f0`), Background `#fdf9f0`, Border `#e6d4a8`.
- **Risky buffer**: Text `#8a3b28`, Background `#fdf6f3`, Border `#e3c1b7`.

---

## 3. Scenario Color Palette (UI Layer)

To strictly uphold "zero hex in domain", all colors, tints, inks, and dashes are declared in UI presentation config. Scenarios store only `palette_key` in the database, while the baseline scenario receives its own fixed styling:

| Key | Hex Color | Tint (Bg) | Ink (Text) | Dash Pattern | Notes |
|---|---|---|---|---|---|
| *Baseline* | `#3a4145` | `#e8eaea` | `#14181a` | `""` (solid) | Fixed baseline style; `paletteKey: null` |
| `teal` | `#2f7d78` | `#e4efee` | `#26686a` | `""` (solid) | Prototype Scenario A |
| `purple` | `#7c6f9a` | `#efecf6` | `#5f5480` | `"6 4"` | Prototype Scenario B |
| `gold` | `#a17c3f` | `#f6f0e4` | `#7a5c22` | `"2 4"` | Prototype Scenario C |
| `blue` | `#2563eb` | `#eff6ff` | `#1d4ed8` | `"8 4 2 4"` | New addition: accessible high contrast alternative |
| `slate` | `#7d8ba8` | `#eef1f5` | `#43526e` | `"4 4"` | New addition: Celia category token, distinct from baseline `#3a4145` |

*Note*: The prototype defined styles only for baseline and scenarios A, B, and C without a scenario creation modal or palette picker. `blue` and `slate` are new additions grounded in Celia's design tokens (Constitution XIV) to support user-created scenarios (US5).

---

## 4. 24-Month Outlook Chart Geometry & Scaling (Decisions D3, D6)

The chart displays 24 months ($M_0$ to $M_{23}$), anchored to the current calendar month.

### 4.1 Domain Scaling
Let $U_0$ be baseline unallocated, and $U_S$ be each scenario's steady-state unallocated.
- Baseline bars are flat across all 24 months at $U_0$ (the artificial growth multiplier `1 + i * 0.004` is removed).
- Vertical domain bounds:
  - $\text{domainHi} = \max(U_0, \max(U_S), 0) \times 1.15$
  - $\text{domainLo} = \min(0, U_0, \min(U_S)) \times 1.25$
  - Special case: all values zero $\rightarrow$ $\text{domainHi} = 1, \text{domainLo} = 0$.
  - Special case: all values negative $\rightarrow$ $\text{domainHi} = 0, \text{domainLo} = \min(U_0, \dots) \times 1.25$.
- Span: $\text{span} = (\text{domainHi} - \text{domainLo}) || 1$.
- Zero Rule Ratio: $\text{zeroRuleRatio} = \text{domainHi} / \text{span}$. The zero rule horizontal line is positioned at `top: (zeroRuleRatio * 100)%`.

### 4.2 Normalized Coordinate Output ($(x, y) \in [0, 1] \times [0, 1]$)
The domain helper `calculate24MonthOutlook` produces pure normalized coordinates without SVG paths or hex codes:
- Horizontal: for month index $i \in [0, 23]$, $x_i = i / 23$.
- Vertical:
  $$y(v) = \frac{\text{domainHi} - v}{\text{span}}$$
  - When $v = 0$, $y(0) = \text{zeroRuleRatio}$.
  - When $v > 0$, $y(v) < y(0)$ (upper region above zero rule).
  - When $v < 0$, $y(v) > y(0)$ (lower region below zero rule).
- Polyline step transition:
  $$v_S(i) = \begin{cases} U_0 & \text{if } i < S.\text{startMonth} \\ U_S & \text{if } i \ge S.\text{startMonth} \end{cases}$$
- Selected scenario polyline is highlighted at full opacity (1.0); non-selected polylines are dimmed (`opacity: 0.35`). When Baseline is selected, alternative scenario lines remain visible in their dimmed state.

### 4.3 Baseline Bar Heights and Positioning
- **Positive baseline ($U_0 \ge 0$)**:
  - The bar container spans from the chart top down to the zero rule: `top: 0; height: (zeroRuleRatio * 100)%` with `display: flex; align-items: flex-end; gap: 3px`.
  - Inside this container, each bar's height fraction is:
    $$\text{heightRatioInContainer} = \frac{\text{heightRatio}}{\text{zeroRuleRatio}} = \frac{U_0 / \text{span}}{\text{domainHi} / \text{span}} = \frac{U_0}{\text{domainHi}}$$
  - Sizing bars as `height: (heightRatioInContainer * 100)%` inside the flex-end container ensures their tops sit at height $(U_0 / \text{domainHi}) \times (\text{domainHi} / \text{span}) = U_0 / \text{span}$ above the zero rule line, perfectly meeting the baseline polyline.
- **Negative baseline ($U_0 < 0$)**:
  - `OutlookBar.isNegative` is `true`.
  - The bar container is positioned at `top: (zeroRuleRatio * 100)%` and hangs downwards below the zero rule line with height $(|U_0| / |\text{domainLo}|) \times (1 - \text{zeroRuleRatio}) \times 100\%$, ensuring negative cash flow bars render below the zero axis without clipping.

---

## 5. Stepper-Only Budget Nudges & Sequential Ordering (Decisions D4, D6)

- Controls use explicit `−` and `+` `<button>` elements with accessible `aria-label`:
  - `+` increases the allocation (more spending, less freed funds).
  - `−` decreases the allocation (less spending, more freed funds).
- Step size is ₱500 (50,000 centavos).
- Clamped at 0: `adjusted = max(0, base + delta)`.
- Track fill percentage:
  - When $\text{base} > 0$: $\text{fillPercent} = \text{clamp}(2, 98, \text{round}((\text{adjusted} / \text{base}) \times 50) + 25)$.
  - When $\text{base} = 0$: $\text{fillPercent} = 50\%$.
- **Sequential Per-Row Queue & Interim Failure Continuity**:
  - Each budget row maintains a sequential queue for API calls.
  - Rapid clicks update local optimistic state immediately and queue writes sequentially.
  - If an older save fails while a newer edit is queued behind it, the newer edit remains visible in the UI and is dispatched next. An error toast alerts the user of the interim sync failure.
  - If a save fails with no subsequent edits queued, the row rolls back to the confirmed server delta and emits an error toast.
  - Switching scenarios immediately flushes pending writes.

---

## 6. Verified Dataset Figures

Using the seed dataset on the current calendar month applied plan (`Baseline 2026`), active buffer ₱466,000, and planned expenses ₱79,000:

| Scenario | Monthly Expense | Unallocated | Buffer After | Runway | Verdict |
|---|---|---|---|---|---|
| **Baseline** | ₱79,000 | +₱20,500 | ₱466,000 | **5.9 mo** | **Tight but doable** |
| **Scenario A** | ₱96,930 | −₱2,430 | ₱367,500 | **3.8 mo** | **Risky buffer** |
| **Scenario B** | ₱100,400 | −₱900 | ₱466,000 | **4.6 mo** | **Risky buffer** |
| **Scenario C** | ₱84,200 | +₱15,300 | −₱52,500 | **0.0 mo** | **Risky buffer** |

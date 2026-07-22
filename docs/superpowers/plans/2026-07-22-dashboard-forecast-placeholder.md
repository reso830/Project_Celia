# Dashboard Forecast Placeholder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the prototype-matched static forecast roadmap callout beneath the dashboard cash-flow chart.

**Architecture:** A zero-prop `ForecastPlaceholder` component owns the fixed roadmap copy and visual treatment. `DashboardEmptyState` composes it immediately after `CashFlowChart`; neither component reads forecast data or calls calculation logic.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest, React Testing Library.

## Global Constraints

- Render the exact copy: `Coming soon — forecasting projected balances from your recurring income and expenses.`
- Match the prototype: `1px dashed #c3ccd6`, `12px` radius, `14px 18px` padding, `10px` gap, `12.5px #8a93a3` body text, and semibold `#4c6a92` prefix.
- Place the callout after `CashFlowChart` and before the Bucket groups heading.
- Do not add forecasting, predictions, calculations, data inputs, domain helpers, repository calls, dependencies, or persistence changes.
- Run formatting, linting, typechecking, tests, and a production build.

---

## File Structure

- Create: `src/components/forecast-placeholder.tsx` — static roadmap callout, without props or data dependencies.
- Create: `tests/components/forecast-placeholder.test.tsx` — isolated rendering and styling-contract coverage.
- Modify: `src/components/dashboard-empty-state.tsx` — imports and positions the placeholder.
- Modify: `tests/components/dashboard-empty-state.test.tsx` — verifies dashboard integration.

### Task 1: Forecast placeholder component

**Files:**
- Create: `src/components/forecast-placeholder.tsx`
- Create: `tests/components/forecast-placeholder.test.tsx`

**Interfaces:**
- Consumes: no props, application data, domain helpers, repositories, or external dependencies.
- Produces: `ForecastPlaceholder(): JSX.Element`, a static roadmap callout.

- [ ] **Step 1: Write the failing component test**

Create `tests/components/forecast-placeholder.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { ForecastPlaceholder } from "@/components/forecast-placeholder";

describe("ForecastPlaceholder", () => {
  it("renders the prototype roadmap callout", () => {
    render(<ForecastPlaceholder />);

    const callout = screen.getByRole("complementary", {
      name: "Forecast roadmap",
    });

    expect(callout).toHaveTextContent("Coming soon —");
    expect(callout).toHaveTextContent(
      "forecasting projected balances from your recurring income and expenses.",
    );
    expect(callout).toHaveClass("border-dashed", "border-[#c3ccd6]");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/components/forecast-placeholder.test.tsx`

Expected: FAIL because `@/components/forecast-placeholder` does not exist.

- [ ] **Step 3: Write the minimal component implementation**

Create `src/components/forecast-placeholder.tsx`:

```tsx
export function ForecastPlaceholder() {
  return (
    <aside
      aria-label="Forecast roadmap"
      className="flex items-center gap-2.5 rounded-xl border border-dashed border-[#c3ccd6] px-[18px] py-3.5 text-[12.5px] text-[#8a93a3]"
    >
      <span className="font-semibold text-[#4c6a92]">Coming soon —</span>
      forecasting projected balances from your recurring income and expenses.
    </aside>
  );
}
```

- [ ] **Step 4: Run the component test to verify it passes**

Run: `npm test -- tests/components/forecast-placeholder.test.tsx`

Expected: PASS with one passing test.

- [ ] **Step 5: Commit the component and its test**

```bash
git add src/components/forecast-placeholder.tsx tests/components/forecast-placeholder.test.tsx
git commit -m "feat: add forecast roadmap placeholder"
```

### Task 2: Dashboard integration

**Files:**
- Modify: `src/components/dashboard-empty-state.tsx`
- Modify: `tests/components/dashboard-empty-state.test.tsx`

**Interfaces:**
- Consumes: `ForecastPlaceholder(): JSX.Element` from `@/components/forecast-placeholder`.
- Produces: dashboard markup that renders the static roadmap callout after cash flow and before Bucket groups.

- [ ] **Step 1: Write the failing dashboard integration assertion**

In the `renders the Celia dashboard empty state` test in `tests/components/dashboard-empty-state.test.tsx`, add after the cash-flow assertion:

```tsx
const forecastCallout = screen.getByRole("note", {
  name: "Forecast roadmap",
});

expect(forecastCallout).toHaveTextContent(
  "Coming soon — forecasting projected balances from your recurring income and expenses.",
);
```

- [ ] **Step 2: Run the dashboard test to verify it fails**

Run: `npm test -- tests/components/dashboard-empty-state.test.tsx -t "renders the Celia dashboard empty state"`

Expected: FAIL because the dashboard does not yet render a `Forecast roadmap` complementary landmark.

- [ ] **Step 3: Render the component after cash flow**

In `src/components/dashboard-empty-state.tsx`, add this import with the other component imports:

```tsx
import { ForecastPlaceholder } from "@/components/forecast-placeholder";
```

Then place the component immediately after the existing cash-flow chart:

```tsx
<CashFlowChart transactions={transactions} />
<ForecastPlaceholder />
<BucketBreakdownChart
  breakdown={breakdown}
  bucketColors={bucketColors}
/>
```

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npm test -- tests/components/forecast-placeholder.test.tsx tests/components/dashboard-empty-state.test.tsx`

Expected: PASS with all tests in both files passing.

- [ ] **Step 5: Commit the dashboard integration**

```bash
git add src/components/dashboard-empty-state.tsx tests/components/dashboard-empty-state.test.tsx
git commit -m "feat: show forecast roadmap on dashboard"
```

### Task 3: Full verification

**Files:**
- Verify: `src/components/forecast-placeholder.tsx`
- Verify: `tests/components/forecast-placeholder.test.tsx`
- Verify: `src/components/dashboard-empty-state.tsx`
- Verify: `tests/components/dashboard-empty-state.test.tsx`

**Interfaces:**
- Consumes: completed static placeholder and dashboard integration.
- Produces: fresh evidence that the required pipeline passes.

- [ ] **Step 1: Format the modified source and test files**

Run: `npx prettier --write src/components/forecast-placeholder.tsx src/components/dashboard-empty-state.tsx tests/components/forecast-placeholder.test.tsx tests/components/dashboard-empty-state.test.tsx`

Expected: all four files formatted without errors.

- [ ] **Step 2: Run the complete verification pipeline**

Run: `npm run format:check; npm run lint; npm run typecheck; npm test; npm run build`

Expected: every command exits with status 0.

- [ ] **Step 3: Inspect the final change scope**

Run: `git status --short; git diff HEAD~2..HEAD -- src/components/forecast-placeholder.tsx src/components/dashboard-empty-state.tsx tests/components/forecast-placeholder.test.tsx tests/components/dashboard-empty-state.test.tsx`

Expected: only the static placeholder, its dashboard integration, and their tests are present; no forecasting or calculation logic has changed.

- [ ] **Step 4: Commit formatting changes if formatting modified files**

```bash
git add src/components/forecast-placeholder.tsx src/components/dashboard-empty-state.tsx tests/components/forecast-placeholder.test.tsx tests/components/dashboard-empty-state.test.tsx
git commit -m "style: format forecast placeholder files"
```

Run the commit only when `git status --short` shows changes made by the formatting command.

## Plan Self-Review

- Spec coverage: Task 1 covers the exact static callout and prototype styling; Task 2 covers its placement beneath cash flow; Task 3 covers the required pipeline and scope inspection. No forecasting data flow or calculations are introduced.
- Placeholder scan: no TBD, TODO, deferred implementation steps, or unspecified tests remain.
- Type consistency: both tasks use the same zero-prop `ForecastPlaceholder()` export and `Forecast roadmap` accessible label.

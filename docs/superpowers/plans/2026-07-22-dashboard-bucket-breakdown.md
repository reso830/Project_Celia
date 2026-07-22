# Dashboard Bucket Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render an accessible, color-configured chart showing total expense spending by bucket on the dashboard.

**Architecture:** A pure domain function groups valid expense transactions by their category's normalized bucket name and returns sorted PHP-minor-unit totals. `BucketBreakdownChart` maps those totals to an accessible SVG donut and textual legend; `DashboardEmptyState` supplies provider data and retains the existing bucket-group grid.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Include expense transactions only; skip income and transactions with no matching expense category.
- Preserve configured expense bucket colors through `expenseBucketColorKey`; use `#8a93a3` when absent.
- Do not add a chart dependency or forecasting behavior.
- Show `No expense transactions yet.` when no breakdown exists.
- All monetary totals remain integer PHP minor units until formatting for display.

---

### Task 1: Derive bucket expense totals

**Files:**
- Create: `src/domain/bucket-breakdown.ts`
- Modify: `src/domain/index.ts`
- Test: `tests/domain/bucket-breakdown.test.ts`

**Interfaces:**
- Consumes: `readonly Transaction[]`, `readonly Category[]`.
- Produces: `BucketBreakdown` and `calculateBucketBreakdown(transactions, categories): readonly BucketBreakdown[]`.

- [ ] **Step 1: Write the failing test**

```ts
it("groups expense transactions by normalized category bucket and skips income or missing categories", () => {
  expect(calculateBucketBreakdown(transactions, categories)).toEqual([
    { bucket: "Housing", amount: 3_000 },
    { bucket: "Food", amount: 1_250 },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/domain/bucket-breakdown.test.ts`

Expected: FAIL because `@/domain/bucket-breakdown` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface BucketBreakdown { bucket: string; amount: number; }

export function calculateBucketBreakdown(transactions: readonly Transaction[], categories: readonly Category[]): readonly BucketBreakdown[] {
  const categoriesById = new Map(categories.filter(({ type }) => type === "expense").map((category) => [category.id, category]));
  const totals = new Map<string, BucketBreakdown>();
  for (const transaction of transactions) {
    const category = transaction.type === "expense" ? categoriesById.get(transaction.categoryId) : undefined;
    if (!category) continue;
    const bucket = category.group.trim();
    const key = bucket.toLocaleLowerCase();
    const current = totals.get(key);
    totals.set(key, { bucket: current?.bucket ?? bucket, amount: (current?.amount ?? 0) + transaction.amount });
  }
  return [...totals.values()].sort((left, right) => right.amount - left.amount || left.bucket.localeCompare(right.bucket));
}
```

Export it with `export * from "./bucket-breakdown";` in `src/domain/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/domain/bucket-breakdown.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/bucket-breakdown.ts src/domain/index.ts tests/domain/bucket-breakdown.test.ts
git commit -m "feat: calculate dashboard bucket totals"
```

### Task 2: Render the bucket breakdown chart

**Files:**
- Create: `src/components/bucket-breakdown-chart.tsx`
- Test: `tests/components/bucket-breakdown-chart.test.tsx`

**Interfaces:**
- Consumes: `BucketBreakdownChartProps { breakdown: readonly BucketBreakdown[]; bucketColors: readonly BucketColor[] }`.
- Produces: an accessible chart or its defined empty state.

- [ ] **Step 1: Write the failing test**

```tsx
render(<BucketBreakdownChart breakdown={[{ bucket: "Housing", amount: 75_000 }, { bucket: "Food", amount: 25_000 }]} bucketColors={[{ bucket: "expense:housing", color: "#2463eb" }]} />);
expect(screen.getByRole("img", { name: "Expense breakdown" })).toBeInTheDocument();
expect(screen.getByText("Housing")).toBeInTheDocument();
expect(screen.getByText("₱750.00 · 75%")).toBeInTheDocument();
expect(screen.getByTestId("bucket-slice-Housing")).toHaveAttribute("stroke", "#2463eb");
```

Also test an empty array renders `No expense transactions yet.` and no chart image.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/bucket-breakdown-chart.test.tsx`

Expected: FAIL because `@/components/bucket-breakdown-chart` does not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
export function BucketBreakdownChart({ breakdown, bucketColors }: BucketBreakdownChartProps) {
  if (!breakdown.length) return <div>No expense transactions yet.</div>;
  const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
  return <section aria-labelledby="bucket-breakdown-title">{/* SVG donut plus textual legend */}</section>;
}
```

Use `expenseBucketColorKey(bucket)` before the legacy normalized key lookup; render each SVG circle slice with `data-testid={\`bucket-slice-${bucket}\`}`, an accessible `role="img"` named `Expense breakdown`, and a legend with `new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })` plus rounded whole percentages.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/bucket-breakdown-chart.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/bucket-breakdown-chart.tsx tests/components/bucket-breakdown-chart.test.tsx
git commit -m "feat: render dashboard bucket breakdown chart"
```

### Task 3: Integrate the chart into the dashboard

**Files:**
- Modify: `src/components/dashboard-empty-state.tsx`
- Modify: `tests/components/dashboard-empty-state.test.tsx`

**Interfaces:**
- Consumes: `calculateBucketBreakdown` and `BucketBreakdownChart`.
- Produces: dashboard rendering the current transaction breakdown above bucket groups.

- [ ] **Step 1: Write the failing test**

```tsx
renderDashboard(repositories(categories, bucketColors, bucketGroups, transactions));
expect(await screen.findByRole("img", { name: "Expense breakdown" })).toBeInTheDocument();
expect(screen.getByText("Housing")).toBeInTheDocument();
```

Extend the local repository helper with a `transactions` list stub and add an empty-data assertion for `No expense transactions yet.`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/dashboard-empty-state.test.tsx`

Expected: FAIL because the dashboard does not render the chart.

- [ ] **Step 3: Write minimal implementation**

```tsx
const transactions = data.status === "ready" ? data.transactions : [];
const breakdown = calculateBucketBreakdown(transactions, categories);

<BucketBreakdownChart bucketColors={bucketColors} breakdown={breakdown} />
```

Import the domain helper and chart component; insert the component between the dashboard title and the Bucket groups heading.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/dashboard-empty-state.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard-empty-state.tsx tests/components/dashboard-empty-state.test.tsx
git commit -m "feat: show bucket breakdown on dashboard"
```

### Task 4: Run the verification pipeline

**Files:**
- Verify only.

- [ ] **Step 1: Run static verification**

Run: `npm run lint; npm run format:check; npm run typecheck`

Expected: all commands exit successfully.

- [ ] **Step 2: Run automated tests and production build**

Run: `npm test; npm run build`

Expected: all tests and the production build pass.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff HEAD~3..HEAD --check; git status --short`

Expected: no whitespace errors and no unintended uncommitted files.


# Bucket Group Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display configured category bucket groups as responsive, read-only cards on the Dashboard and Settings pages.

**Architecture:** A focused `BucketGroupGrid` component receives category and bucket-color records, derives group cards using normalized type-and-group keys, and renders its own empty state. The Dashboard and Settings page pass ready-state data from the existing provider, keeping the grouping and card UI consistent without changing persistence.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest, React Testing Library.

## Global Constraints

- Bucket groups are derived from `Category` records; do not create a new repository or domain model.
- Group categories by trimmed, case-insensitive group name and exact category type.
- Display the group name, `Income` or `Expense`, one color indicator with a visible color label, and every subcategory name.
- Resolve configured colors by trimmed, case-insensitive bucket name; groups with the same name share that configured color regardless of type.
- Use `#8a93a3` as the fallback swatch color when no configured color exists.
- Use a responsive grid: one column by default, two at `sm`, and three at `lg`.
- Preserve existing bucket creation and all out-of-scope boundaries: no editing, deletion, charts, or color configuration.

---

## File Structure

- `src/components/bucket-group-grid.tsx`: derives grouped card view models and renders cards or an empty state.
- `tests/components/bucket-group-grid.test.tsx`: tests normalization, type separation, colors, subcategories, and empty rendering through the component interface.
- `src/components/dashboard-empty-state.tsx`: supplies provider data to the shared grid in the Dashboard layout.
- `tests/components/dashboard-empty-state.test.tsx`: renders the Dashboard with a provider and verifies configured and empty group views.
- `src/components/settings-page.tsx`: replaces the local, one-category-per-group display with the shared grid.
- `tests/components/settings-page.test.tsx`: verifies the Settings page passes persisted categories and colors into the shared display.

### Task 1: Add the shared bucket-group grid with test-first coverage

**Files:**
- Create: `tests/components/bucket-group-grid.test.tsx`
- Create: `src/components/bucket-group-grid.tsx`

**Interfaces:**
- Consumes: `readonly Category[]` and `readonly BucketColor[]` from `@/domain`.
- Produces: `BucketGroupGrid({ categories, bucketColors, emptyMessage }): React.JSX.Element`.

- [ ] **Step 1: Write failing tests for grouping, card contents, and empty rendering**

```tsx
import { render, screen } from "@testing-library/react";
import { BucketGroupGrid } from "@/components/bucket-group-grid";

describe("BucketGroupGrid", () => {
  it("groups normalized categories by type and displays every subcategory", () => {
    render(
      <BucketGroupGrid
        bucketColors={[{ bucket: "housing", color: "#2463eb" }]}
        categories={[
          { id: "rent", type: "expense", group: " Housing ", name: "Rent" },
          { id: "power", type: "expense", group: "housing", name: "Power" },
          { id: "salary", type: "income", group: "Housing", name: "Salary" },
        ]}
        emptyMessage="No bucket groups yet."
      />,
    );

    expect(screen.getAllByRole("heading", { name: "Housing" })).toHaveLength(2);
    expect(screen.getByRole("article", { name: "Expense Housing" })).toHaveTextContent("Rent");
    expect(screen.getByRole("article", { name: "Expense Housing" })).toHaveTextContent("Power");
    expect(screen.getByRole("article", { name: "Income Housing" })).toHaveTextContent("Salary");
    expect(screen.getAllByText("Color: #2463eb")).toHaveLength(2);
  });

  it("renders the supplied empty message without category records", () => {
    render(
      <BucketGroupGrid
        bucketColors={[]}
        categories={[]}
        emptyMessage="No buckets yet."
      />,
    );

    expect(screen.getByText("No buckets yet.")).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because the component is missing**

Run: `npm test -- tests/components/bucket-group-grid.test.tsx`

Expected: FAIL with a module-resolution error for `@/components/bucket-group-grid`.

- [ ] **Step 3: Implement the minimal shared component**

```tsx
import type { BucketColor, Category } from "@/domain";

interface BucketGroupGridProps {
  categories: readonly Category[];
  bucketColors: readonly BucketColor[];
  emptyMessage: string;
}

const fallbackColor = "#8a93a3";

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function BucketGroupGrid({
  categories,
  bucketColors,
  emptyMessage,
}: BucketGroupGridProps) {
  const colors = new Map(bucketColors.map(({ bucket, color }) => [normalize(bucket), color]));
  const groups = Array.from(
    categories.reduce((grouped, category) => {
      const key = `${category.type}:${normalize(category.group)}`;
      const current = grouped.get(key) ?? [];
      grouped.set(key, [...current, category]);
      return grouped;
    }, new Map<string, readonly Category[]>()),
  );

  if (!groups.length) {
    return <div className="mt-4 rounded-xl border border-[#d6dae1] bg-white p-5 text-sm text-[#8a93a3]">{emptyMessage}</div>;
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map(([key, group]) => {
        const first = group[0];
        const name = first.group.trim();
        const type = first.type === "expense" ? "Expense" : "Income";
        const color = colors.get(normalize(first.group)) ?? fallbackColor;

        return (
          <article aria-label={`${type} ${name}`} className="rounded-xl border border-[#d6dae1] bg-white p-5" key={key}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#16213f]">{name}</h3>
                <p className="mt-1 text-sm text-[#6b7686]">{type}</p>
              </div>
              <span className="flex items-center gap-2 text-xs text-[#6b7686]">
                <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                Color: {color}
              </span>
            </div>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[#16213f]">
              {group.map((category) => <li key={category.id}>{category.name}</li>)}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run the focused test and confirm it passes**

Run: `npm test -- tests/components/bucket-group-grid.test.tsx`

Expected: PASS with 2 tests.

- [ ] **Step 5: Commit the shared card grid**

Run: `git add src/components/bucket-group-grid.tsx tests/components/bucket-group-grid.test.tsx && git commit -m "feat: add bucket group card grid"`

### Task 2: Render configured groups on the Dashboard

**Files:**
- Modify: `src/components/dashboard-empty-state.tsx`
- Modify: `tests/components/dashboard-empty-state.test.tsx`

**Interfaces:**
- Consumes: `useData(): DataState` from `@/data` and `BucketGroupGrid` from Task 1.
- Produces: Dashboard content with the existing header plus bucket-group cards or `No bucket groups yet.`.

- [ ] **Step 1: Write a failing Dashboard data-rendering test**

```tsx
import { render, screen } from "@testing-library/react";
import { DashboardEmptyState } from "@/components/dashboard-empty-state";
import { DataProvider, type DataRepositories } from "@/data";

it("renders configured bucket groups on the dashboard", async () => {
  const repositories: DataRepositories = {
    members: { get: vi.fn(), list: vi.fn().mockResolvedValue([]), save: vi.fn(), delete: vi.fn() },
    categories: { get: vi.fn(), list: vi.fn().mockResolvedValue([{ id: "rent", type: "expense", group: "Housing", name: "Rent" }]), save: vi.fn(), delete: vi.fn() },
    transactions: { get: vi.fn(), list: vi.fn().mockResolvedValue([]), save: vi.fn(), delete: vi.fn() },
    bucketColors: { get: vi.fn(), list: vi.fn().mockResolvedValue([{ bucket: "Housing", color: "#2463eb" }]), save: vi.fn(), delete: vi.fn() },
  };

  render(<DataProvider createRepositories={() => repositories}><DashboardEmptyState /></DataProvider>);

  expect(await screen.findByRole("article", { name: "Expense Housing" })).toHaveTextContent("Rent");
  expect(screen.getByText("Color: #2463eb")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the Dashboard test and confirm it fails because the page does not read provider data**

Run: `npm test -- tests/components/dashboard-empty-state.test.tsx`

Expected: FAIL because `Expense Housing` is not rendered.

- [ ] **Step 3: Update the Dashboard component to render the shared grid**

```tsx
"use client";

import { AppHeader } from "@/components/app-header";
import { BucketGroupGrid } from "@/components/bucket-group-grid";
import { useData } from "@/data";

export function DashboardEmptyState() {
  const data = useData();
  const categories = data.status === "ready" ? data.categories : [];
  const bucketColors = data.status === "ready" ? data.bucketColors : [];

  return (
    <main className="min-h-screen bg-[#eef0f3] px-4 py-6 sm:px-6 lg:px-7">
      <div className="mx-auto w-full max-w-[1100px]">
        <AppHeader activePage="dashboard" />
        <section aria-labelledby="celia-title" className="mt-6">
          <p className="text-sm font-medium text-slate-500">Expense tracking, made simple</p>
          <h1 id="celia-title" className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">Celia</h1>
          <h2 className="mt-6 text-base font-bold text-[#16213f]">Bucket groups</h2>
          <BucketGroupGrid bucketColors={bucketColors} categories={categories} emptyMessage="No bucket groups yet." />
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run the Dashboard test and confirm it passes**

Run: `npm test -- tests/components/dashboard-empty-state.test.tsx`

Expected: PASS, including the existing navigation assertion and the configured-card assertion.

- [ ] **Step 5: Commit the Dashboard integration**

Run: `git add src/components/dashboard-empty-state.tsx tests/components/dashboard-empty-state.test.tsx && git commit -m "feat: show bucket groups on dashboard"`

### Task 3: Reuse the group grid in Settings

**Files:**
- Modify: `src/components/settings-page.tsx`
- Modify: `tests/components/settings-page.test.tsx`

**Interfaces:**
- Consumes: ready-state `categories` and `bucketColors` from `useData()` and `BucketGroupGrid` from Task 1.
- Produces: Settings with existing form behavior and a responsive, grouped category display.

- [ ] **Step 1: Write a failing Settings integration test**

```tsx
it("renders every saved subcategory in one configured bucket card", async () => {
  renderSettings(undefined, {
    get: vi.fn(),
    list: vi.fn().mockResolvedValue([
      { id: "rent", type: "expense", group: "Housing", name: "Rent" },
      { id: "power", type: "expense", group: "housing", name: "Power" },
    ]),
    save: vi.fn(),
    delete: vi.fn(),
  });

  const card = await screen.findByRole("article", { name: "Expense Housing" });
  expect(card).toHaveTextContent("Rent");
  expect(card).toHaveTextContent("Power");
});
```

- [ ] **Step 2: Run the Settings test and confirm it fails because the existing card only represents the first category**

Run: `npm test -- tests/components/settings-page.test.tsx`

Expected: FAIL because the existing Buckets list does not render `Power`.

- [ ] **Step 3: Replace the local group list with the shared grid**

```tsx
import { BucketGroupGrid } from "@/components/bucket-group-grid";

// Remove the local `groups` Map derived from `categories`.

// Replace the conditional group list following the bucket form with:
<BucketGroupGrid
  bucketColors={data.status === "ready" ? data.bucketColors : []}
  categories={categories}
  emptyMessage="No buckets yet."
/>
```

- [ ] **Step 4: Run the Settings test and confirm it passes**

Run: `npm test -- tests/components/settings-page.test.tsx`

Expected: PASS, including all existing bucket creation, duplicate-prevention, and empty-state tests.

- [ ] **Step 5: Commit the Settings integration**

Run: `git add src/components/settings-page.tsx tests/components/settings-page.test.tsx && git commit -m "feat: display grouped buckets in settings"`

### Task 4: Run the full verification pipeline

**Files:**
- Verify: repository-wide source and tests

**Interfaces:**
- Consumes: all prior tasks.
- Produces: evidence that linting, formatting, type checks, tests, and production build meet the acceptance criteria.

- [ ] **Step 1: Run the complete verification pipeline**

Run: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run build`

Expected: every command exits 0; all component and data tests pass; Next.js creates the production build.

- [ ] **Step 2: Inspect the final diff and working tree**

Run: `git diff --check HEAD~3..HEAD && git status --short`

Expected: no whitespace errors and a clean working tree.

## Plan Self-Review

- Spec coverage: Task 1 implements normalized grouping, color fallback, type labels, subcategory lists, card semantics, responsive columns, and the component empty state. Tasks 2 and 3 render that component on both requested pages with page-appropriate empty copy. Task 4 executes every required verification command.
- Placeholder scan: no incomplete work markers or unspecified implementation steps remain.
- Type consistency: the component interface uses existing `Category` and `BucketColor` domain types; both consuming pages pass ready-state collections from the existing provider.

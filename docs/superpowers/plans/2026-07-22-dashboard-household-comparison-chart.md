# Dashboard Household Comparison Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display each household member's total income and expenses in a grouped comparison chart.

**Architecture:** A pure domain helper aggregates transactions by configured member. `HouseholdComparisonChart` renders those totals with a native SVG and accessible summary, while the dashboard supplies ready state data.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Vitest 4, Testing Library.

## Global Constraints

- Aggregate all transactions by `memberId` into separate positive PHP minor-unit income and expense totals.
- Include only configured members with recorded transactions; sort them by member name.
- Use native SVG and add no dependencies.
- The empty card copy is `No member comparisons yet. Add transactions to compare household contributions.`
- Do not add forecasting, filtering controls, or transaction mutations.
- Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before handoff.

---

### Task 1: Aggregate member totals

**Files:**
- Create: `src/domain/member-transaction-totals.ts`
- Create: `tests/domain/member-transaction-totals.test.ts`

**Interfaces:**
- Produces `MemberTransactionTotal`: `{ memberId: string; name: string; income: number; expense: number }`.
- Produces `calculateMemberTransactionTotals(members, transactions)`.

- [ ] **Step 1: Write failing aggregation tests**

Test that transactions for two members accumulate independently, income and expense stay separate, names sort alphabetically, and empty transactions return an empty list.

- [ ] **Step 2: Run the domain test and verify it fails**

Run: `npm test -- tests/domain/member-transaction-totals.test.ts`

- [ ] **Step 3: Implement the smallest aggregation helper**

Use a member ID lookup, skip transactions without a configured member, create zero totals only when a transaction is processed, and return name-sorted results.

- [ ] **Step 4: Re-run the domain test and verify it passes**

Run: `npm test -- tests/domain/member-transaction-totals.test.ts`

### Task 2: Render and connect the member comparison chart

**Files:**
- Create: `src/components/household-comparison-chart.tsx`
- Modify: `src/components/dashboard-empty-state.tsx`
- Modify: `tests/components/dashboard-empty-state.test.tsx`

**Interfaces:**
- `HouseholdComparisonChart` consumes `members` and `transactions`.
- The dashboard supplies ready state inputs, otherwise empty arrays.

- [ ] **Step 1: Write failing dashboard tests**

Add tests for the exact empty copy and a two-member render containing the `Household contributions` region plus accessible member total summaries.

- [ ] **Step 2: Run the selected tests and verify they fail**

Run: `npm test -- tests/components/dashboard-empty-state.test.tsx -t "member comparisons|household contributions"`

- [ ] **Step 3: Implement the minimal chart and integration**

Render a white card with legend and, for populated totals, a fixed-viewBox SVG containing two bars per member sharing a baseline, labels, a descriptive title, and an `sr-only` summary list. Place the chart before the bucket groups section.

- [ ] **Step 4: Re-run selected tests and verify they pass**

Run: `npm test -- tests/components/dashboard-empty-state.test.tsx -t "member comparisons|household contributions"`

### Task 3: Verify the change

- [ ] **Step 1: Run formatting**

Run: `npm run format:check`

- [ ] **Step 2: Run linting and types**

Run: `npm run lint; npm run typecheck`

- [ ] **Step 3: Run all tests and build**

Run: `npm test; npm run build`

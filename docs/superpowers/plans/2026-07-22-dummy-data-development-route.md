# Dummy Data Development Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic dummy-data generation and a development-only browser route that atomically populates or clears Celia's IndexedDB.

**Architecture:** A UI-independent generator produces validated domain entities from an ISO reference date. A persistence service opens one transaction across the five stores to replace or clear records. A client component at `/dev/data` invokes it only after confirmation; the server page returns `notFound()` outside development.

**Tech Stack:** Next.js App Router, TypeScript, React, IndexedDB, Vitest, fake-indexeddb.

## Global Constraints

- Use existing domain constructors and schema; never seed during normal application startup.
- Use positive PHP minor units, ISO dates, stable IDs, and deterministic values.
- Populate and clear must use one all-store read-write transaction and abort on failure.
- The development route is unavailable when `NODE_ENV !== "development"`.
- Verify lint, format check, typecheck, tests, and build.

---

### Task 1: Build the deterministic dataset generator

**Files:**
- Create: `src/data/dummy-data/create-dummy-dataset.ts`
- Create: `src/data/dummy-data/index.ts`
- Test: `tests/data/dummy-data/create-dummy-dataset.test.ts`

**Produces:** `createDummyDataset({ referenceDate: string }): DummyDataset`, with member, bucket-group, category, bucket-color, and transaction arrays.

- [ ] **Step 1: Write failing tests**

```ts
const first = createDummyDataset({ referenceDate: "2026-07-22" });
expect(first).toEqual(createDummyDataset({ referenceDate: "2026-07-22" }));
expect(first.members.map(({ name }) => name)).toEqual(["Alex", "Sam"]);
expect(first.transactions.length).toBeGreaterThanOrEqual(80);
expect(first.transactions.length).toBeLessThanOrEqual(120);
expect(first.transactions.every(({ memberId }) => first.members.some(({ id }) => id === memberId))).toBe(true);
expect(first.transactions.every(({ categoryId }) => first.categories.some(({ id }) => id === categoryId))).toBe(true);
expect(first.transactions.map(({ date }) => date)).toEqual(expect.arrayContaining(["2026-01-01", "2026-07-01"]));
```

- [ ] **Step 2: Verify red**

Run: `npm run test -- tests/data/dummy-data/create-dummy-dataset.test.ts`

Expected: fails because `@/data/dummy-data` is missing.

- [ ] **Step 3: Implement the generator**

Use `createMember`, `createBucketGroup`, `createCategory`, `createBucketColor`, and `createTransaction`. Create every named category, fixed IDs, Alex (`#2463eb`) and Sam (`#9333ea`), and expense-only overrides. Generate the reference month plus six preceding full months, with the required salary, rent, utility, internet, grocery, personal, transport, bonus/freelance, reimbursement, subscriptions, recurring flags, and an unusually large furniture expense patterns.

- [ ] **Step 4: Verify green**

Run: `npm run test -- tests/data/dummy-data/create-dummy-dataset.test.ts`

Expected: passes.

- [ ] **Step 5: Commit**

Run: `git add src/data/dummy-data tests/data/dummy-data/create-dummy-dataset.test.ts; git commit -m "feat: add deterministic dummy dataset generator"`

### Task 2: Build atomic replacement and clear operations

**Files:**
- Create: `src/data/dummy-data/populate-dummy-data.ts`
- Modify: `src/data/dummy-data/index.ts`
- Test: `tests/data/dummy-data/populate-dummy-data.test.ts`

**Consumes:** `createDummyDataset`, `openCeliaDatabase`, `CELIA_STORES`.

**Produces:** `replaceWithDummyData({ referenceDate, databaseOpener? }): Promise<void>` and `clearCeliaData(databaseOpener?): Promise<void>`.

- [ ] **Step 1: Write failing tests**

```ts
await new IndexedDbMemberRepository().save({ id: "old", name: "Old", color: "#000000" });
await replaceWithDummyData({ referenceDate: "2026-07-22" });
await expect(new IndexedDbMemberRepository().get("old")).resolves.toBeUndefined();
await clearCeliaData();
await expect(new IndexedDbTransactionRepository().list()).resolves.toEqual([]);
```

- [ ] **Step 2: Verify red**

Run: `npm run test -- tests/data/dummy-data/populate-dummy-data.test.ts`

Expected: fails because the service is missing.

- [ ] **Step 3: Implement transaction logic**

Open the database once, create a read-write transaction over `Object.values(CELIA_STORES)`, clear each store, and `put` members, bucket groups, categories, colors, then transactions. Reject and abort on a request error; resolve only on transaction completion; close in `finally`. Reuse the clear helper for `clearCeliaData`.

- [ ] **Step 4: Verify green**

Run: `npm run test -- tests/data/dummy-data/populate-dummy-data.test.ts`

Expected: passes.

- [ ] **Step 5: Commit**

Run: `git add src/data/dummy-data tests/data/dummy-data/populate-dummy-data.test.ts; git commit -m "feat: add atomic dummy data population"`

### Task 3: Add a development-only route

**Files:**
- Create: `src/app/dev/data/page.tsx`
- Create: `src/app/dev/data/dev-data-controls.tsx`
- Test: `tests/components/dev-data-controls.test.tsx`

**Consumes:** the Task 2 operations.

- [ ] **Step 1: Write failing component test**

```tsx
render(<DevDataControls populate={populate} clear={vi.fn()} referenceDate="2026-07-22" />);
await userEvent.click(screen.getByRole("button", { name: "Populate dummy data" }));
expect(populate).not.toHaveBeenCalled();
await userEvent.click(screen.getByRole("button", { name: "Confirm populate" }));
await waitFor(() => expect(populate).toHaveBeenCalled());
expect(screen.getByText("Dummy data populated.")).toBeInTheDocument();
```

- [ ] **Step 2: Verify red**

Run: `npm run test -- tests/components/dev-data-controls.test.tsx`

Expected: fails because `DevDataControls` is missing.

- [ ] **Step 3: Implement page and controls**

Use `notFound()` in `page.tsx` outside development. Make the client component provide Populate and Clear buttons, confirmation action for each destructive operation, disabled states, current ISO date, and success/failure messages. Keep operation props injectable for tests.

- [ ] **Step 4: Verify green**

Run: `npm run test -- tests/components/dev-data-controls.test.tsx`

Expected: passes.

- [ ] **Step 5: Commit**

Run: `git add src/app/dev/data tests/components/dev-data-controls.test.tsx; git commit -m "feat: add development data tools route"`

### Task 4: Full verification

- [ ] **Step 1: Run all checks**

Run: `npm run lint; npm run format:check; npm run typecheck; npm run test; npm run build`

Expected: every command exits 0.

- [ ] **Step 2: Inspect and commit verification fixes only if needed**

Run: `git status --short; git diff HEAD~3..HEAD`

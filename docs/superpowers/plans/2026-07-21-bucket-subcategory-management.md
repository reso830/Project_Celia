# Bucket Subcategory Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist bucket groups independently and support adding/deleting their subcategories without removing the group.

**Architecture:** A new `BucketGroup` entity and IndexedDB store supply canonical group records, including empty groups. The data provider backfills group records from legacy categories and exposes group/category actions. `BucketGroupGrid` joins groups to categories and only Settings provides editing callbacks.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library, fake-indexeddb, IndexedDB.

## Global Constraints

- Group uniqueness is normalized `(type, name)`; same names across income/expense are valid.
- Names trim whitespace and duplicate subcategory names within one group are rejected case-insensitively.
- Removing the final subcategory retains the empty bucket group.
- Rename, reordering, and bucket-group deletion are out of scope.
- Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`, and `npm run build` before completion.

---

## File structure

- `src/domain/bucket-group.ts`: validated immutable entity.
- `src/data/bucket-group-repository.ts`, `src/data/indexed-db-bucket-group-repository.ts`: CRUD contract and adapter.
- `src/data/celia-database.ts`: version-2 `bucket-groups` store.
- `src/data/data-provider.tsx`: loading/backfill plus mutations.
- `src/components/bucket-group-grid.tsx`: group-first cards and optional controls.
- `src/components/settings-page.tsx`: validation and persistence workflows.

### Task 1: Add the bucket-group domain and persistence boundary

**Files:**
- Create: `src/domain/bucket-group.ts`, `src/data/bucket-group-repository.ts`, `src/data/indexed-db-bucket-group-repository.ts`
- Modify: `src/domain/index.ts`, `src/data/index.ts`, `src/data/celia-database.ts`, `tests/domain/member-category.test.ts`, `tests/data/celia-database.test.ts`, `tests/data/indexed-db-repositories.test.ts`

**Interfaces:** Produces `BucketGroup { id; type; name }`, `createBucketGroup`, `BucketGroupRepository`, and `IndexedDbBucketGroupRepository`.

- [ ] **Step 1: Write failing tests**

```ts
expect(createBucketGroup({ id: "housing", type: "expense", name: " Housing " }))
  .toEqual({ id: "housing", type: "expense", name: "Housing" });
expect(() => createBucketGroup({ id: "housing", type: "expense", name: " " }))
  .toThrow("Bucket group id and name are required.");
verifiesCrud<BucketGroup>("bucket groups", () => new IndexedDbBucketGroupRepository(openCeliaDatabase), "housing", { id: "housing", type: "expense", name: "Housing" }, { id: "housing", type: "expense", name: "Home" });
```

- [ ] **Step 2: Run red tests**

Run: `npm test -- tests/domain/member-category.test.ts tests/data/celia-database.test.ts tests/data/indexed-db-repositories.test.ts`

Expected: FAIL because the entity, repository, and store do not exist.

- [ ] **Step 3: Implement minimum code**

```ts
export interface BucketGroup { id: string; type: CategoryType; name: string; }
export function createBucketGroup(input: BucketGroup): Readonly<BucketGroup> {
  const name = input.name.trim();
  if (!input.id.trim() || !name) throw new DomainValidationError("Bucket group id and name are required.");
  if (!isCategoryType(input.type)) throw new DomainValidationError("Bucket group type must be income or expense.");
  return Object.freeze({ ...input, name });
}
export interface BucketGroupRepository extends Repository<BucketGroup> {}
```

Set `CELIA_DATABASE_VERSION` to `2`; add `CELIA_STORES.bucketGroups = "bucket-groups"`, its `{ keyPath: "id" }` store definition, exports, and a thin `IndexedDbRepository<BucketGroup>` adapter.

- [ ] **Step 4: Run green tests**

Run: `npm test -- tests/domain/member-category.test.ts tests/data/celia-database.test.ts tests/data/indexed-db-repositories.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/domain src/data tests/domain/member-category.test.ts tests/data/celia-database.test.ts tests/data/indexed-db-repositories.test.ts; git commit -m "feat: persist bucket groups"`

### Task 2: Extend provider state and migrate legacy category groups

**Files:**
- Modify: `src/data/data-provider.tsx`, `tests/data/data-provider.test.tsx`

**Interfaces:** Adds `DataRepositories.bucketGroups`, ready-state `bucketGroups`, `saveBucketGroup(group)`, and `deleteCategory(id)`.

- [ ] **Step 1: Write failing provider tests**

```tsx
it("backfills a legacy category group before ready", async () => {
  // categories.list resolves [rentCategory], bucketGroups.list resolves []
  // assert bucketGroups.save receives { type: "expense", name: "Housing" }
});
it("deletes a persisted category from ready state", async () => {
  // call state.deleteCategory("category-rent")
  // assert categories.delete and rendered count:0
});
```

- [ ] **Step 2: Run red tests**

Run: `npm test -- tests/data/data-provider.test.tsx`

Expected: FAIL because the group collection and deletion action are absent.

- [ ] **Step 3: Implement minimum code**

Load `bucketGroups.list()` with all current collections. For every normalized legacy category `(type, group)` not present in groups, create and persist a UUID group before publishing ready state. Add default `IndexedDbBucketGroupRepository`, save/upsert group state, and delete category state only after its repository action resolves.

- [ ] **Step 4: Run green tests**

Run: `npm test -- tests/data/data-provider.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/data/data-provider.tsx tests/data/data-provider.test.tsx; git commit -m "feat: expose persisted bucket groups and category deletion"`

### Task 3: Render persisted empty groups and management controls

**Files:**
- Modify: `src/components/bucket-group-grid.tsx`, `tests/components/bucket-group-grid.test.tsx`, `src/components/dashboard-empty-state.tsx`, `tests/components/dashboard-empty-state.test.tsx`

**Interfaces:** Grid takes `bucketGroups`, `categories`, `bucketColors`, `emptyMessage`, and optional `onAddSubcategory(group, name)` / `onDeleteSubcategory(category)` callbacks.

- [ ] **Step 1: Write failing component tests**

```tsx
render(<BucketGroupGrid bucketGroups={[{ id: "housing", type: "expense", name: "Housing" }]} categories={[]} bucketColors={[]} emptyMessage="No buckets yet." />);
expect(screen.getByRole("article", { name: "Expense Housing" })).toHaveTextContent("No subcategories yet.");
// With callbacks and Rent: click "Delete Rent" and expect callback(category).
```

- [ ] **Step 2: Run red tests**

Run: `npm test -- tests/components/bucket-group-grid.test.tsx tests/components/dashboard-empty-state.test.tsx`

Expected: FAIL because cards are category-derived and controls do not exist.

- [ ] **Step 3: Implement minimum code**

Iterate groups, join same-type normalized categories, and render each group ID as the card key. Render `No subcategories yet.` for zero joined records. Render labelled add input/button and `Delete ${name}` buttons only when callbacks are provided; pass no callbacks from Dashboard.

- [ ] **Step 4: Run green tests**

Run: `npm test -- tests/components/bucket-group-grid.test.tsx tests/components/dashboard-empty-state.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/components/bucket-group-grid.tsx src/components/dashboard-empty-state.tsx tests/components/bucket-group-grid.test.tsx tests/components/dashboard-empty-state.test.tsx; git commit -m "feat: display and manage empty bucket groups"`

### Task 4: Implement Settings subcategory workflows

**Files:**
- Modify: `src/components/settings-page.tsx`, `tests/components/settings-page.test.tsx`

**Interfaces:** Initial form saves a group and first category. Grid callbacks validate/save a subcategory or delete one through provider state.

- [ ] **Step 1: Write failing Settings tests**

```tsx
// Seed group Housing and category Rent; type " Power "; submit Add subcategory.
expect(saveCategory).toHaveBeenCalledWith(expect.objectContaining({ type: "expense", group: "Housing", name: "Power" }));
// Blank and "rent" each produce alert and do not save.
// Delete final Rent calls category delete and leaves article "Expense Housing" with "No subcategories yet.".
// A rejected save shows an error and retains entered input.
```

- [ ] **Step 2: Run red tests**

Run: `npm test -- tests/components/settings-page.test.tsx`

Expected: FAIL because no subcategory controls or callbacks exist.

- [ ] **Step 3: Implement minimum code**

On initial form submit create/save `BucketGroup` then save the first category. In add callback trim/require input and reject matching normalized subcategory names in the same `(type, group)`; otherwise save a UUID category. In delete callback call provider deletion. Leave displayed state unchanged on rejected persistence and display `Unable to save this subcategory. Please try again.` or `Unable to delete this subcategory. Please try again.`.

- [ ] **Step 4: Run green tests**

Run: `npm test -- tests/components/settings-page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/components/settings-page.tsx tests/components/settings-page.test.tsx; git commit -m "feat: manage bucket subcategories in settings"`

### Task 5: Verify the delivery

- [ ] **Step 1: Run full pipeline**

Run: `npm test; npm run lint; npm run typecheck; npm run format:check; npm run build`

Expected: every command exits 0 with no failures, diagnostics, formatting differences, or build errors.

- [ ] **Step 2: Inspect final state**

Run: `git diff --check; git status --short`

Expected: no whitespace errors and only intended tracked changes.

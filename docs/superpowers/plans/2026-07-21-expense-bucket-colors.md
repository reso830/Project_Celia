# Expense Bucket Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users edit and persist colors for expense bucket groups with picker, hex, RGB inputs, live preview, and validation.

**Architecture:** Store overrides with a normalized expense-specific key such as `expense:housing`. A domain helper converts and validates `#RRGGBB` and RGB values. Settings owns editor state; the bucket grid renders editable expense cards.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library, IndexedDB.

## Global Constraints

- Scope is limited to expense bucket groups; income bucket groups and member colors remain unchanged.
- Hex values normalize to lowercase `#rrggbb`; RGB values are whole numbers from 0 through 255.
- Invalid or incomplete values keep entered text, show an inline error, and disable Save.
- Save failures retain editor values for retry.

---

### Task 1: Color helpers

**Files:**
- Create: `src/domain/color.ts`
- Create: `tests/domain/color.test.ts`
- Modify: `src/domain/index.ts`

**Interfaces:**
- Produces: `parseHexColor(value): RgbColor | undefined`, `parseRgbColor(red, green, blue): RgbColor | undefined`, `formatHexColor(color): string`, `formatRgbColor(color): RgbInput`, and `expenseBucketColorKey(bucket): string`.

- [ ] **Step 1: Write the failing test**

```ts
it("normalizes colors, rejects invalid values, and creates an expense-specific key", () => {
  expect(formatHexColor(parseHexColor("#24A6E9")!)).toBe("#24a6e9");
  expect(parseHexColor("24a6e9")).toBeUndefined();
  expect(parseRgbColor("256", "0", "0")).toBeUndefined();
  expect(expenseBucketColorKey(" Housing ")).toBe("expense:housing");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/domain/color.test.ts`

Expected: FAIL because `@/domain/color` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface RgbColor { red: number; green: number; blue: number }
export interface RgbInput { red: string; green: string; blue: string }

const hexPattern = /^#[0-9a-f]{6}$/i;
export const expenseBucketColorKey = (bucket: string) =>
  `expense:${bucket.trim().toLocaleLowerCase()}`;

export function parseHexColor(value: string): RgbColor | undefined {
  if (!hexPattern.test(value)) return undefined;
  return {
    red: Number.parseInt(value.slice(1, 3), 16),
    green: Number.parseInt(value.slice(3, 5), 16),
    blue: Number.parseInt(value.slice(5, 7), 16),
  };
}
```

Implement RGB parsing with `/^(0|[1-9][0-9]{0,2})$/`, reject values over 255, and format channels using `toString(16).padStart(2, "0")`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/domain/color.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/domain/color.ts src/domain/index.ts tests/domain/color.test.ts
git commit -m "feat: add bucket color helpers"
```

### Task 2: Persist and expose overrides

**Files:**
- Modify: `src/data/data-provider.tsx`
- Modify: `tests/data/data-provider.test.tsx`

**Interfaces:**
- Consumes: `BucketColorRepository.save(bucketColor)` and `expenseBucketColorKey(bucket)`.
- Produces: ready-state `saveBucketColor(bucket: string, color: string): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```tsx
await state.saveBucketColor("Housing", "#24a6e9");
expect(repositories.bucketColors.save).toHaveBeenCalledWith({
  bucket: "expense:housing", color: "#24a6e9",
});
expect(state.bucketColors).toContainEqual({
  bucket: "expense:housing", color: "#24a6e9",
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/data/data-provider.test.tsx`

Expected: FAIL because `saveBucketColor` is absent.

- [ ] **Step 3: Write minimal implementation**

Add `saveBucketColor` inside provider initialization. It creates `createBucketColor({ bucket: expenseBucketColorKey(bucket), color })`, awaits `repositories.bucketColors.save`, then replaces the matching override in ready-state `bucketColors`. Add it to the ready-state type and initialized state.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/data/data-provider.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/data/data-provider.tsx tests/data/data-provider.test.tsx
git commit -m "feat: persist expense bucket colors"
```

### Task 3: Editable expense bucket cards

**Files:**
- Modify: `src/components/bucket-group-grid.tsx`
- Modify: `tests/components/bucket-group-grid.test.tsx`

**Interfaces:**
- Consumes: `expenseBucketColorKey`.
- Produces: optional `onEditColor(bucket: string, color: string): void` and an `Edit color for {bucket}` button for expense cards only.

- [ ] **Step 1: Write the failing test**

```tsx
render(<BucketGroupGrid
  bucketColors={[{ bucket: "expense:housing", color: "#2463eb" }]}
  categories={[
    { id: "expense", type: "expense", group: "Housing", name: "Rent" },
    { id: "income", type: "income", group: "Housing", name: "Salary" },
  ]}
  emptyMessage="No buckets."
  onEditColor={onEditColor}
/>);
await user.click(screen.getByRole("button", { name: "Edit color for Housing" }));
expect(onEditColor).toHaveBeenCalledWith("Housing", "#2463eb");
expect(screen.getAllByText("Color: #2463eb")).toHaveLength(1);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/bucket-group-grid.test.tsx`

Expected: FAIL because callback and expense-specific lookup are absent.

- [ ] **Step 3: Write minimal implementation**

Use `expenseBucketColorKey(first.group)` for expense lookups, preserve the legacy normalized key lookup for income cards, and conditionally render:

```tsx
{first.type === "expense" ? (
  <button type="button" onClick={() => onEditColor?.(name, color)}>
    Edit color for {name}
  </button>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/bucket-group-grid.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/bucket-group-grid.tsx tests/components/bucket-group-grid.test.tsx
git commit -m "feat: expose expense bucket color editing"
```

### Task 4: Settings color editor

**Files:**
- Modify: `src/components/settings-page.tsx`
- Modify: `tests/components/settings-page.test.tsx`

**Interfaces:**
- Consumes: color helper functions and `data.saveBucketColor(bucket, color)`.
- Produces: inline controls labeled `Bucket color`, `Hex color`, `Red`, `Green`, `Blue`, `Save color`, and `Cancel color`.

- [ ] **Step 1: Write failing tests**

```tsx
await user.click(await screen.findByRole("button", { name: "Edit color for Housing" }));
expect(screen.getByLabelText("Hex color")).toHaveValue("#8a93a3");

fireEvent.change(screen.getByLabelText("Bucket color"), {
  target: { value: "#2463eb" },
});
expect(screen.getByLabelText("Hex color")).toHaveValue("#2463eb");
expect(screen.getByLabelText("Red")).toHaveValue("36");

await user.clear(screen.getByLabelText("Red"));
await user.type(screen.getByLabelText("Red"), "256");
expect(screen.getByRole("alert")).toHaveTextContent(
  "Enter a valid hex color or RGB values from 0 to 255.",
);
expect(screen.getByRole("button", { name: "Save color" })).toBeDisabled();
```

Add tests that valid hex updates the expense card before Save, Save calls the bucket color repository with `{ bucket: "expense:housing", color: "#24a6e9" }`, and a rejected save presents `Unable to save this color. Please try again.` while retaining input.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/settings-page.test.tsx`

Expected: FAIL because editor controls do not exist.

- [ ] **Step 3: Write minimal implementation**

Use editor state holding the bucket, hex text, and red/green/blue text. Picker and valid hex changes set all fields from `formatRgbColor(parseHexColor(value))`; RGB changes set hex from `formatHexColor(parseRgbColor(...))` when valid. Pass the valid current preview into the grid's override array so the card changes immediately. Render an inline `role="alert"` for invalid input or save failure, disable Save unless the color parses, call `data.saveBucketColor` on Save, and discard state only on successful Save or Cancel.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/settings-page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/settings-page.tsx tests/components/settings-page.test.tsx
git commit -m "feat: add expense bucket color editor"
```

### Task 5: Verification pipeline

**Files:**
- Modify: no source changes expected.

- [ ] **Step 1: Run all checks**

Run: `npm run format:check; npm run lint; npm run typecheck; npm test; npm run build`

Expected: every command exits 0.

- [ ] **Step 2: Fix verified regressions with a failing test first**

For each failed behavioral check, add the smallest reproducing test, run it to see the expected failure, make the minimal correction, and rerun that test.

- [ ] **Step 3: Re-run all checks**

Run: `npm run format:check; npm run lint; npm run typecheck; npm test; npm run build`

Expected: every command exits 0 with no warnings.

- [ ] **Step 4: Commit verification fixes if needed**

```powershell
git add src tests
git commit -m "fix: verify bucket color customization"
```


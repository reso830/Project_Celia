# Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a static, responsive `/settings` page with prototype-aligned Buckets and Household empty states.

**Architecture:** A small presentational `SettingsPage` component owns the page hierarchy and visual classes; the App Router route merely renders it. It remains independent of the data provider because this increment deliberately always displays empty states and includes no management behavior.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest, React Testing Library.

## Global Constraints

- Use the prototype colors `#12213d`, `#eef0f3`, `#d6dae1`, `#16213f`, and `#6b7686`.
- Keep content centered at 1100px maximum width with desktop padding `24px 28px 40px`.
- Render Buckets before Household and separate them with a one-pixel `#d6dae1` divider.
- Render exactly `No buckets yet.` and `No household members yet.` as the empty-state copy.
- Do not render CRUD controls, color pickers, category chips, transaction controls, or persistence behavior.
- Preserve a single-column page and avoid horizontal overflow on narrow screens.

---

## File Structure

- `src/components/settings-page.tsx`: presentational Settings page header, sections, and empty-state cards.
- `src/app/settings/page.tsx`: App Router entry point that renders `SettingsPage`.
- `tests/components/settings-page.test.tsx`: static content and structural semantics tests.

### Task 1: Add Settings page coverage

**Files:**

- Create: `tests/components/settings-page.test.tsx`

**Interfaces:**

- Consumes: `SettingsPage(): React.JSX.Element` from `@/components/settings-page`.
- Produces: executable tests defining the required visible Settings content.

- [ ] **Step 1: Write the failing component test**

```tsx
import { render, screen } from "@testing-library/react";
import { SettingsPage } from "@/components/settings-page";

describe("SettingsPage", () => {
  it("renders the buckets and household empty states", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Buckets" })).toBeInTheDocument();
    expect(screen.getByText("No buckets yet.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Household" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Household Members" })).toBeInTheDocument();
    expect(screen.getByText("No household members yet.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/components/settings-page.test.tsx`

Expected: FAIL because `@/components/settings-page` does not exist.

### Task 2: Implement the Settings route and responsive page

**Files:**

- Create: `src/components/settings-page.tsx`
- Create: `src/app/settings/page.tsx`
- Modify: `tests/components/settings-page.test.tsx`

**Interfaces:**

- Consumes: no runtime data; all content is static.
- Produces: `SettingsPage(): React.JSX.Element` and the `/settings` App Router route.

- [ ] **Step 1: Create the presentational component**

```tsx
export function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#eef0f3] px-4 py-6 sm:px-6 lg:px-7 lg:pb-10">
      <div className="mx-auto w-full max-w-[1100px]">
        <header className="rounded-xl bg-[#12213d] px-5 py-4 text-[#f3f4f6] sm:flex sm:items-center sm:justify-between">
          <p className="text-lg font-semibold">Celia</p>
          <nav aria-label="Primary navigation" className="mt-3 flex flex-wrap gap-2 text-sm font-semibold sm:mt-0">
            <span className="rounded-md px-3 py-2 text-[#c3ccd6]">Dashboard</span>
            <span className="rounded-md px-3 py-2 text-[#c3ccd6]">Transactions</span>
            <span aria-current="page" className="rounded-md bg-white px-3 py-2 text-[#12213d]">Settings</span>
          </nav>
        </header>
        <section className="mt-6 space-y-6">
          <h1 className="text-2xl font-semibold text-[#16213f]">Settings</h1>
          <section aria-labelledby="buckets-heading">
            <h2 id="buckets-heading" className="text-base font-bold text-[#16213f]">Buckets</h2>
            <p className="mt-1 text-sm text-[#6b7686]">Organize your income and expenses into bucket groups.</p>
            <div className="mt-4 rounded-xl border border-[#d6dae1] bg-white p-5 text-sm text-[#8a93a3]">No buckets yet.</div>
          </section>
          <hr className="border-[#d6dae1]" />
          <section aria-labelledby="household-heading">
            <h2 id="household-heading" className="text-base font-bold text-[#16213f]">Household</h2>
            <p className="mt-1 text-sm text-[#6b7686]">Manage the members of your household.</p>
            <div className="mt-4 rounded-xl border border-[#d6dae1] bg-white p-5">
              <h3 className="text-sm font-semibold text-[#16213f]">Household Members</h3>
              <p className="mt-3 text-sm text-[#8a93a3]">No household members yet.</p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
```

Create `src/app/settings/page.tsx` with:

```tsx
import { SettingsPage } from "@/components/settings-page";

export default function SettingsRoute() {
  return <SettingsPage />;
}
```

- [ ] **Step 2: Run the component test to verify it passes**

Run: `npm test -- tests/components/settings-page.test.tsx`

Expected: PASS; one SettingsPage test passes.

- [ ] **Step 3: Run the full verification pipeline**

Run: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run build`

Expected: every command exits 0, all tests pass, and Next.js creates a production build.

- [ ] **Step 4: Commit the implementation**

Run: `git add src/components/settings-page.tsx src/app/settings/page.tsx tests/components/settings-page.test.tsx && git commit -m "feat: add settings page layout"`

## Plan Self-Review

- Spec coverage: Task 1 covers the required headings and both empty states. Task 2 supplies the `/settings` route, visual design tokens, desktop sizing, section order, divider, and responsive single-column layout.
- Placeholder scan: no incomplete requirements or deferred work are present.
- Type consistency: Task 1 imports `SettingsPage`; Task 2 defines and exports that exact function.

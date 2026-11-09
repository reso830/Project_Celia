import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ModelsScreen from "@/components/models/models-screen";
import ModelsLoading from "@/app/(shell)/models/loading";
import ModelsError from "@/app/(shell)/models/error";
import type { ModelsViewData } from "@/server/models-read";
import { calculateBudgetSummary } from "@/domain/budget-calculations";
import { parseHexColor } from "@/domain/color";
const nav = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => nav }));
const totals = calculateBudgetSummary({
  incomeAllocations: [10000000],
  expenseAllocations: [2000000],
  savingsAllocations: [1000000],
  actualIncomeCentavos: 10000000,
  actualExpensesCentavos: 1840000,
  actualSavingsCentavos: 500000,
});
const view: ModelsViewData = {
  month: "2026-11",
  currentMonth: "2026-11",
  models: [
    {
      id: "base",
      name: "Baseline",
      description: "Standard",
      summary: totals,
      badge: "ACTIVE",
      allocationsByCategory: { salary: 10000000, food: 2000000 },
      allocationsByBucket: { car: 1000000 },
    },
    {
      id: "lean",
      name: "Lean",
      description: null,
      summary: totals,
      badge: null,
      allocationsByCategory: { salary: 10000000, food: 1600000 },
      allocationsByBucket: { car: 1000000 },
    },
  ],
  appliedPlan: {
    id: "p",
    monthKey: "2026-11",
    modelName: "Baseline",
    sourceModelId: "base",
    isRevised: false,
    hasTemplateDiverged: false,
    summary: totals,
    allocationsByCategory: { salary: 10000000, food: 2000000 },
    allocationsByBucket: { car: 1000000 },
  },
  categories: [
    {
      id: "salary",
      name: "Salary",
      umbrella: "income",
      color: parseHexColor("#5f8a7d"),
      archived: false,
      merged: false,
      mergedIntoCategoryId: null,
      actualCentavos: 10000000,
    },
    {
      id: "food",
      name: "Groceries",
      umbrella: "expense",
      color: parseHexColor("#7f9b6e"),
      archived: false,
      merged: false,
      mergedIntoCategoryId: null,
      actualCentavos: 1840000,
    },
  ],
  buckets: [
    {
      id: "car",
      name: "Car",
      type: "goal",
      archived: false,
      actualCentavos: 500000,
    },
  ],
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
const success = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ model: { id: "new" } }),
    }),
  );
const edit = (value: string) =>
  fireEvent.change(
    screen.getByRole("textbox", { name: "Groceries budget per month" }),
    { target: { value } },
  );
describe("Models screen", () => {
  it("renders empty/loading/error states and navigates month", () => {
    const { unmount } = render(
      <ModelsScreen data={{ ...view, models: [], appliedPlan: null }} />,
    );
    expect(screen.getByText(/No budget models/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(nav.push).toHaveBeenCalledWith("/models?month=2026-10");
    unmount();
    render(<ModelsLoading />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading budget models",
    );
    cleanup();
    const retry = vi.fn();
    render(<ModelsError error={new Error("private")} retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
  });
  it("defaults to month's snapshot and routes raw edits to the selected mode", async () => {
    success();
    render(<ModelsScreen data={view} />);
    expect(
      screen.getByRole("heading", { name: /Nov 2026 plan/ }),
    ).toBeInTheDocument();
    edit("21000");
    fireEvent.keyDown(
      screen.getByRole("textbox", { name: "Groceries budget per month" }),
      { key: "Enter" },
    );
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/monthly-plans/2026-11",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            targetType: "category",
            targetId: "food",
            amount: "21000",
          }),
        }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Select model Lean" }));
    expect(
      screen.getByRole("textbox", { name: "Groceries budget per month" }),
    ).toHaveValue("16,000");
    edit("17000");
    fireEvent.blur(
      screen.getByRole("textbox", { name: "Groceries budget per month" }),
    );
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/models/lean",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
  });
  it("recalculates while typing, reverts Escape and never submits invalid input", () => {
    success();
    render(<ModelsScreen data={view} />);
    const input = screen.getByRole("textbox", {
      name: "Groceries budget per month",
    });
    edit("120000");
    expect(screen.getByText(/Overallocated by/)).toHaveTextContent(
      "\u20b130,000",
    );
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("20,000");
    edit("-1");
    expect(input).toHaveAttribute("aria-invalid", "true");
    fireEvent.blur(input);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("edits only a merge target's raw allocation and reloads the effective snapshot", async () => {
    success();
    const merged = {
      ...view,
      categories: [
        ...view.categories,
        {
          id: "dining",
          name: "Dining out",
          umbrella: "expense" as const,
          color: parseHexColor("#b5816c"),
          archived: false,
          merged: true,
          mergedIntoCategoryId: "food",
          actualCentavos: 0,
        },
      ],
      appliedPlan: {
        ...view.appliedPlan!,
        allocationsByCategory: {
          ...view.appliedPlan!.allocationsByCategory,
          dining: 500000,
        },
      },
    };
    const { rerender } = render(<ModelsScreen data={merged} />);
    const input = screen.getByRole("textbox", {
      name: "Groceries budget per month",
    });
    expect(input).toHaveValue("20,000");
    expect(screen.getByText(/effective/)).toHaveTextContent(
      "\u20b125,000 effective (+\u20b15,000 from Dining out)",
    );
    edit("21000");
    expect(screen.getByText(/effective/)).toHaveTextContent(
      "\u20b126,000 effective",
    );
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(
      "/api/monthly-plans/2026-11",
      expect.objectContaining({
        body: JSON.stringify({
          targetType: "category",
          targetId: "food",
          amount: "21000",
        }),
      }),
    );
    rerender(
      <ModelsScreen
        data={{
          ...merged,
          appliedPlan: {
            ...merged.appliedPlan,
            allocationsByCategory: {
              ...merged.appliedPlan.allocationsByCategory,
              food: 2100000,
            },
          },
        }}
      />,
    );
    expect(
      screen.getByRole("textbox", { name: "Groceries budget per month" }),
    ).toHaveValue("21,000");
    expect(screen.getByText(/effective/)).toHaveTextContent(
      "\u20b126,000 effective (+\u20b15,000 from Dining out)",
    );
  });
  it("keeps keyboard focus, other drafts and collapsed groups across row saves and refreshes", async () => {
    const responses: Array<(r: unknown) => void> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise((resolve) => responses.push(resolve))),
    );
    const user = userEvent.setup();
    const sequential = {
      ...view,
      categories: [
        view.categories[0],
        { ...view.categories[0], id: "freelance", name: "Freelance" },
        view.categories[1],
      ],
      appliedPlan: {
        ...view.appliedPlan!,
        allocationsByCategory: {
          salary: 10000000,
          freelance: 2000000,
          food: 2000000,
        },
      },
    };
    const { rerender } = render(<ModelsScreen data={sequential} />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle Savings" }));
    const salary = screen.getByRole("textbox", {
      name: "Salary budget per month",
    });
    salary.focus();
    await user.clear(salary);
    await user.type(salary, "110000");
    await user.tab();
    const groceries = screen.getByRole("textbox", {
      name: "Freelance budget per month",
    });
    expect(groceries).toHaveFocus();
    expect(groceries).toBeEnabled();
    await user.clear(groceries);
    await user.type(groceries, "23000");
    await act(async () => responses[0]({ ok: true, json: async () => ({}) }));
    rerender(
      <ModelsScreen
        data={{
          ...sequential,
          appliedPlan: {
            ...sequential.appliedPlan!,
            allocationsByCategory: {
              salary: 11000000,
              freelance: 2000000,
              food: 2000000,
            },
          },
        }}
      />,
    );
    expect(groceries).toHaveFocus();
    expect(groceries).toHaveValue("23000");
    expect(salary).toHaveValue("110,000");
    expect(
      screen.getByRole("button", { name: "Toggle Savings" }),
    ).toHaveAttribute("aria-expanded", "false");
    await user.tab();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/monthly-plans/2026-11",
      expect.objectContaining({
        body: JSON.stringify({
          targetType: "category",
          targetId: "freelance",
          amount: "23000",
        }),
      }),
    );
    await act(async () => responses[1]({ ok: true, json: async () => ({}) }));
    rerender(
      <ModelsScreen
        data={{
          ...sequential,
          appliedPlan: {
            ...sequential.appliedPlan!,
            allocationsByCategory: {
              salary: 11000000,
              freelance: 2300000,
              food: 2000000,
            },
          },
        }}
      />,
    );
    expect(groceries).toHaveValue("23,000");
  });
  it("saves different rows concurrently and keeps a failed row draft for retry", async () => {
    const responses: Array<(r: unknown) => void> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise((resolve) => responses.push(resolve))),
    );
    render(<ModelsScreen data={view} />);
    const salary = screen.getByRole("textbox", {
      name: "Salary budget per month",
    });
    fireEvent.change(salary, { target: { value: "110000" } });
    fireEvent.blur(salary);
    edit("23000");
    const groceries = screen.getByRole("textbox", {
      name: "Groceries budget per month",
    });
    fireEvent.blur(groceries);
    fireEvent.blur(groceries);
    expect(fetch).toHaveBeenCalledTimes(2);
    await act(async () =>
      responses[0]({
        ok: false,
        json: async () => ({
          error: { code: "internal", message: "Retry salary." },
        }),
      }),
    );
    expect(salary).toHaveValue("110000");
    expect(screen.getByRole("alert")).toHaveTextContent("Retry salary.");
    fireEvent.blur(salary);
    expect(fetch).toHaveBeenCalledTimes(3);
    await act(async () => {
      responses[1]({ ok: true, json: async () => ({}) });
      responses[2]({ ok: true, json: async () => ({}) });
    });
  });
  it("can revise a saved row again before the first refresh arrives", async () => {
    success();
    render(<ModelsScreen data={view} />);
    const groceries = screen.getByRole("textbox", {
      name: "Groceries budget per month",
    });
    edit("21000");
    fireEvent.blur(groceries);
    await waitFor(() => expect(groceries).toBeEnabled());
    edit("22000");
    fireEvent.keyDown(groceries, { key: "Escape" });
    expect(groceries).toHaveValue("21000");
    edit("20000");
    fireEvent.blur(groceries);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/monthly-plans/2026-11",
      expect.objectContaining({
        body: JSON.stringify({
          targetType: "category",
          targetId: "food",
          amount: "20000",
        }),
      }),
    );
  });
  it.each(["plan", "model"] as const)(
    "keeps failed archived zero-outs visible and retryable in %s mode",
    async (mode) => {
      for (const target of ["category", "bucket"] as const) {
        let fail!: (response: unknown) => void;
        const request = vi
          .fn()
          .mockImplementationOnce(
            () =>
              new Promise((resolve) => {
                fail = resolve;
              }),
          )
          .mockResolvedValue({ ok: true, json: async () => ({}) });
        vi.stubGlobal("fetch", request);
        const fixture = {
          ...view,
          categories: view.categories.map((c) =>
            c.id === "food" ? { ...c, archived: true } : c,
          ),
          buckets: view.buckets.map((b) => ({ ...b, archived: true })),
          appliedPlan: mode === "plan" ? view.appliedPlan : null,
        };
        const { rerender, unmount } = render(<ModelsScreen data={fixture} />);
        const name = target === "category" ? "Groceries" : "Car",
          original = target === "category" ? "20,000" : "10,000",
          input = () =>
            screen.getByRole("textbox", { name: `${name} budget per month` }),
          button = () =>
            screen.getByRole("button", { name: `Zero out ${name}` });
        fireEvent.click(button());
        expect(input()).toHaveValue(original);
        expect(button()).toBeDisabled();
        await act(async () =>
          fail({
            ok: false,
            json: async () => ({
              error: { code: "internal", message: "Retry zero out." },
            }),
          }),
        );
        expect(screen.getByRole("alert")).toHaveTextContent("Retry zero out.");
        expect(input()).toHaveValue(original);
        expect(button()).toBeEnabled();
        expect(screen.getByLabelText("Unallocated planned")).toHaveTextContent(
          "+\u20b170,000",
        );
        fireEvent.click(button());
        await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(request).toHaveBeenLastCalledWith(
          mode === "plan" ? "/api/monthly-plans/2026-11" : "/api/models/base",
          expect.objectContaining({
            body: JSON.stringify({
              targetType: target,
              targetId: target === "category" ? "food" : "car",
              amount: "0",
            }),
          }),
        );
        const categories = {
            salary: 10000000,
            food: target === "category" ? 0 : 2000000,
          },
          buckets = { car: target === "bucket" ? 0 : 1000000 };
        rerender(
          <ModelsScreen
            data={{
              ...fixture,
              models: fixture.models.map((m) =>
                m.id === "base"
                  ? {
                      ...m,
                      allocationsByCategory: categories,
                      allocationsByBucket: buckets,
                    }
                  : m,
              ),
              appliedPlan: fixture.appliedPlan
                ? {
                    ...fixture.appliedPlan,
                    allocationsByCategory: categories,
                    allocationsByBucket: buckets,
                  }
                : null,
            }}
          />,
        );
        if (mode === "model")
          expect(
            screen.queryByRole("textbox", { name: `${name} budget per month` }),
          ).not.toBeInTheDocument();
        else expect(input()).toHaveValue("0");
        unmount();
      }
    },
  );
  it("preserves a merged reference zero-out after network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const fixture = {
      ...view,
      categories: [
        ...view.categories,
        {
          ...view.categories[1],
          id: "dining",
          name: "Dining",
          merged: true,
          mergedIntoCategoryId: "food",
        },
      ],
      appliedPlan: {
        ...view.appliedPlan!,
        allocationsByCategory: {
          salary: 10000000,
          food: 2000000,
          dining: 500000,
        },
      },
    };
    render(<ModelsScreen data={fixture} />);
    fireEvent.click(screen.getByRole("button", { name: "Zero out Dining" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to save"),
    );
    expect(
      screen.getByRole("textbox", { name: "Dining budget per month" }),
    ).toHaveValue("5,000");
    expect(
      screen.getByRole("button", { name: "Zero out Dining" }),
    ).toBeEnabled();
    expect(screen.getByText(/effective/)).toHaveTextContent(
      "\u20b125,000 effective",
    );
  });
  it("shows disabled Active for an unchanged monthly plan", () => {
    render(<ModelsScreen data={view} />);
    expect(screen.getByRole("button", { name: "Active" })).toBeDisabled();
  });
  it("locks a past snapshot until confirmed and resets the lock on month change", () => {
    const past = {
      ...view,
      month: "2026-09",
      appliedPlan: { ...view.appliedPlan!, monthKey: "2026-09" },
    };
    const { rerender } = render(<ModelsScreen data={past} />);
    expect(
      screen.getByRole("textbox", { name: "Groceries budget per month" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Unlock to revise past plan" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Unlock plan" }));
    expect(
      screen.getByRole("textbox", { name: "Groceries budget per month" }),
    ).toBeEnabled();
    rerender(
      <ModelsScreen
        data={{
          ...past,
          month: "2026-08",
          appliedPlan: { ...past.appliedPlan, monthKey: "2026-08" },
        }}
      />,
    );
    expect(
      screen.getByRole("textbox", { name: "Groceries budget per month" }),
    ).toBeDisabled();
  });
  it("requires overwrite confirmation but applies immediately when no current plan exists", async () => {
    success();
    const { unmount } = render(<ModelsScreen data={view} />);
    fireEvent.click(screen.getByRole("button", { name: "Select model Lean" }));
    fireEvent.click(screen.getByRole("button", { name: "Make active" }));
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply model" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/models/lean/apply",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ monthKey: "2026-11" }),
        }),
      ),
    );
    unmount();
    vi.mocked(fetch).mockClear();
    render(<ModelsScreen data={{ ...view, appliedPlan: null }} />);
    fireEvent.click(screen.getByRole("button", { name: "Make active" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });
  it("confirms applying to a past month and allows reapplying a diverged template", () => {
    success();
    const { unmount } = render(
      <ModelsScreen data={{ ...view, month: "2026-09", appliedPlan: null }} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Make active" }));
    expect(
      screen.getByRole("dialog", { name: "Apply budget model" }),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    unmount();
    render(
      <ModelsScreen
        data={{
          ...view,
          appliedPlan: { ...view.appliedPlan!, hasTemplateDiverged: true },
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Re-apply template" }));
    expect(
      screen.getByRole("button", { name: "Apply model" }),
    ).toBeInTheDocument();
  });
  it("creates, edits, duplicates, and deletes reusable models with confirmation", async () => {
    success();
    render(<ModelsScreen data={view} />);
    fireEvent.click(screen.getAllByRole("button", { name: "+ New model" })[0]);
    fireEvent.change(screen.getByLabelText("NAME"), {
      target: { value: "New plan" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save model" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/models",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Select model Baseline" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("DESCRIPTION"), {
      target: { value: "Changed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save model" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/models/base",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(screen.getByLabelText("NAME")).toHaveValue("Baseline (Copy)");
    fireEvent.click(screen.getByRole("button", { name: "Save model" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/models/base/duplicate",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Select model Baseline" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete model" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/models/base",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });
  it("prevents double apply and handles stale 404 by closing the modal and refreshing", async () => {
    let resolve!: (response: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      ),
    );
    const { unmount } = render(
      <ModelsScreen data={{ ...view, appliedPlan: null }} />,
    );
    const apply = screen.getByRole("button", { name: "Make active" });
    fireEvent.click(apply);
    fireEvent.click(apply);
    expect(fetch).toHaveBeenCalledTimes(1);
    resolve({ ok: true, json: async () => ({}) });
    await waitFor(() => expect(nav.refresh).toHaveBeenCalled());
    unmount();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { code: "not_found", message: "Model not found." },
        }),
      }),
    );
    render(<ModelsScreen data={view} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Select model Baseline" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save model" }));
    await waitFor(() =>
      expect(screen.getByRole("alert", { hidden: true })).toHaveTextContent(
        "Model not found.",
      ),
    );
    expect(
      screen.queryByRole("dialog", { name: "Edit model" }),
    ).not.toBeInTheDocument();
  });
  it("retains modal draft after an error and prevents double submit", async () => {
    let resolve!: (r: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      ),
    );
    render(<ModelsScreen data={{ ...view, appliedPlan: null }} />);
    fireEvent.click(screen.getAllByRole("button", { name: "+ New model" })[0]);
    fireEvent.change(screen.getByLabelText("NAME"), {
      target: { value: "My plan" },
    });
    const save = screen.getByRole("button", { name: "Save model" });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(fetch).toHaveBeenCalledTimes(1);
    resolve({
      ok: false,
      json: async () => ({
        error: { code: "internal", message: "Try later." },
      }),
    });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Try later."),
    );
    expect(screen.getByLabelText("NAME")).toHaveValue("My plan");
  });
});

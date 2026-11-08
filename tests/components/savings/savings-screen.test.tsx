import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SavingsScreen from "@/components/savings/savings-screen";
import SavingsLoading from "@/app/(shell)/savings/loading";
import SavingsError from "@/app/(shell)/savings/error";
import type { SavingsViewData } from "@/server/savings-read";
import {
  calculateBucketMetrics,
  calculateSavingsKpis,
} from "@/domain/savings-calculations";
const nav = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => nav }));
const b = {
  id: "cash",
  name: "Cash buffer",
  nameKey: "cash buffer",
  type: "cash_buffer" as const,
  openingBalance: 25000000,
  targetAmount: null,
  targetMonth: null,
  description: null,
  countsTowardBuffer: true,
  isDefault: true,
  archivedAt: null,
  createdAt: "",
  updatedAt: "",
};
const cash = { ...calculateBucketMetrics(b, [], "2026-11", 0), activities: [] };
const car = {
  ...calculateBucketMetrics(
    {
      ...b,
      id: "car",
      name: "Car",
      type: "goal",
      isDefault: false,
      countsTowardBuffer: false,
      openingBalance: 8500000,
      targetAmount: 18000000,
    },
    [],
    "2026-11",
    1000000,
  ),
  activities: [
    {
      id: "a",
      bucketId: "car",
      kind: "contribution" as const,
      amount: 500000,
      date: "2026-11-01",
      note: "Transfer",
      createdAt: "",
      updatedAt: "",
    },
  ],
};
const view: SavingsViewData = {
  month: "2026-11",
  today: "2026-11-08",
  kpis: calculateSavingsKpis({
    activeBucketMetrics: [cash, car],
    monthlyExpensesCentavos: 0,
    hasMonthlyPlan: true,
  }),
  activeBuckets: [cash, car],
  archivedBuckets: [],
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
const success = () =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
describe("Savings screen", () => {
  it("renders empty state, zero KPIs, loading and retry fallback", () => {
    const empty = {
      ...view,
      activeBuckets: [],
      kpis: calculateSavingsKpis({
        activeBucketMetrics: [],
        monthlyExpensesCentavos: 0,
        hasMonthlyPlan: false,
      }),
    };
    const { unmount } = render(<SavingsScreen data={empty} />);
    expect(screen.getByText(/No savings buckets/)).toBeInTheDocument();
    expect(screen.getByText("no plan for Nov")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    unmount();
    render(<SavingsLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading savings");
    cleanup();
    const retry = vi.fn();
    render(<SavingsError error={new Error("private")} retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
    expect(screen.queryByText("private")).not.toBeInTheDocument();
  });
  it.each(["on_plan", "short", "no_plan", "no_savings_planned"] as const)(
    "renders %s funding state",
    (status) => {
      render(
        <SavingsScreen
          data={{
            ...view,
            kpis: {
              ...view.kpis,
              fundedStatus: status,
              monthlyShortfallCentavos: 1000000,
            },
          }}
        />,
      );
      const text = {
        on_plan: "on plan",
        short: "\u20b110,000 short",
        no_plan: "no plan for Nov",
        no_savings_planned: "no savings planned",
      }[status];
      expect(screen.getByText(text)).toBeInTheDocument();
    },
  );
  it("navigates month and locks only the default buffer toggle", async () => {
    success();
    render(<SavingsScreen data={view} />);
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(nav.push).toHaveBeenCalledWith("/savings?month=2026-10");
    expect(
      screen.getByRole("switch", { name: "Cash buffer buffer" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("switch", { name: "Car buffer" }));
    await waitFor(() => expect(nav.refresh).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      "/api/savings/buckets/car",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ countsTowardBuffer: "true" }),
      }),
    );
  });
  it("archives with confirmation and restores an archived bucket", async () => {
    success();
    const { rerender } = render(<SavingsScreen data={view} />);
    fireEvent.click(
      within(screen.getByRole("article", { name: "Car" })).getByRole("button", {
        name: "Archive",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Archive bucket" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/savings/buckets/car/archive",
        expect.anything(),
      ),
    );
    rerender(
      <SavingsScreen
        data={{
          ...view,
          activeBuckets: [cash],
          archivedBuckets: [
            { ...car, bucket: { ...car.bucket, archivedAt: "2026-11-08" } },
          ],
        }}
      />,
    );
    fireEvent.click(screen.getByText("Archived (1)"));
    fireEvent.click(screen.getByRole("button", { name: "Restore Car" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/savings/buckets/car/restore",
        expect.anything(),
      ),
    );
  });
  it("edits and deletes history, retaining read-only archived history", async () => {
    success();
    const { unmount } = render(<SavingsScreen data={view} />);
    fireEvent.click(
      within(screen.getByRole("article", { name: "Car" })).getByRole("button", {
        name: "History",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Edit activity 2026-11-01" }),
    );
    fireEvent.change(screen.getByLabelText("AMOUNT (PHP)"), {
      target: { value: "6000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save activity" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/savings/activities/a",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Edit savings activity" }),
      ).not.toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Delete activity 2026-11-01" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete activity" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/savings/activities/a",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    unmount();
    render(
      <SavingsScreen
        data={{
          ...view,
          activeBuckets: [],
          archivedBuckets: [
            { ...car, bucket: { ...car.bucket, archivedAt: "old" } },
          ],
        }}
      />,
    );
    fireEvent.click(screen.getByText("Archived (1)"));
    fireEvent.click(screen.getByRole("button", { name: "History for Car" }));
    expect(
      screen.queryByRole("button", { name: /Edit activity/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Delete activity/ }),
    ).not.toBeInTheDocument();
  });
  it("keeps a pending confirmation open through dismissal attempts and shows request errors", async () => {
    let finish!: (response: unknown) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      ),
    );
    render(<SavingsScreen data={view} />);
    fireEvent.click(
      within(screen.getByRole("article", { name: "Car" })).getByRole("button", {
        name: "Archive",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Archive savings bucket",
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Archive bucket" }),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Close dialog" }),
    );
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    expect(dialog).toHaveAttribute("open");
    finish({
      ok: false,
      json: async () => ({
        error: { code: "internal", message: "Please retry." },
      }),
    });
    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "Please retry.",
      ),
    );
    expect(dialog).toHaveAttribute("open");
  });
  it("blocks contribution deletion that would make the balance negative", () => {
    render(
      <SavingsScreen
        data={{
          ...view,
          activeBuckets: [{ ...car, currentBalanceCentavos: 1000 }],
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Delete activity 2026-11-01" }),
    );
    expect(
      screen.getByRole("button", { name: "Delete activity" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Deleting this contribution would make the bucket balance negative.",
    );
  });
  it("closes stale modal and refreshes on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { code: "not_found", message: "Bucket not found." },
        }),
      }),
    );
    render(<SavingsScreen data={view} />);
    fireEvent.click(
      within(screen.getByRole("article", { name: "Car" })).getByRole("button", {
        name: "Edit",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save bucket" }));
    await waitFor(() => expect(nav.refresh).toHaveBeenCalled());
    expect(screen.getByRole("alert", { hidden: true })).toHaveTextContent(
      "Bucket not found.",
    );
    expect(
      screen.queryByRole("dialog", { name: "Edit bucket" }),
    ).not.toBeInTheDocument();
  });
});

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppRail from "@/components/shell/app-rail";
import MonthPicker from "@/components/shell/month-picker";
import DashboardPage from "@/app/(shell)/page";
import EntriesPage from "@/app/(shell)/entries/page";
import ForecasterPage from "@/app/(shell)/forecaster/page";
import BudgetModelsPage from "@/app/(shell)/models/page";
import SavingsBucketsPage from "@/app/(shell)/savings/page";
import { getEntriesView } from "@/server/entries-read";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/server/models-read", () => ({
  getModelsView: vi.fn().mockResolvedValue({
    month: "2026-11",
    currentMonth: "2026-11",
    models: [],
    appliedPlan: null,
    categories: [],
    buckets: [],
  }),
}));
vi.mock("@/server/savings-read", () => ({
  getSavingsView: vi.fn().mockResolvedValue({
    month: "2026-11",
    today: "2026-11-08",
    activeBuckets: [],
    archivedBuckets: [],
    kpis: {
      activeBucketCount: 0,
      heldInBucketsCentavos: 0,
      savingsBufferCentavos: 0,
      monthlyExpensesCentavos: 0,
      runwayMonths: null,
      monthlyFundedCentavos: 0,
      monthlyPlannedSavingsCentavos: 0,
      monthlyShortfallCentavos: 0,
      hasMonthlyPlan: false,
      fundedStatus: "no_plan",
    },
  }),
}));

vi.mock("@/server/entries-read", () => ({
  getEntriesView: vi.fn().mockResolvedValue({
    month: "2026-11",
    entries: [],
    categories: [],
    members: [],
    archivedCategories: [],
    archivedMembers: [],
    defaults: { owner: "Household", currency: "PHP" },
  }),
}));

vi.mock("next/link", async () => {
  const React = await import("react");

  return {
    default: ({
      href,
      children,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
      React.createElement("a", { ...props, href }, children),
  };
});

afterEach(() => {
  cleanup();
  navigation.pathname = "/";
  vi.useRealTimers();
});

describe("app shell", () => {
  it("renders the seven destinations in handoff order with their addresses", () => {
    render(<AppRail />);

    expect(screen.getAllByRole("link")).toHaveLength(7);
    expect(
      screen.getAllByRole("link").map((link) => link.getAttribute("href")),
    ).toEqual([
      "/",
      "/entries",
      "/categories",
      "/savings",
      "/models",
      "/forecaster",
      "/household",
    ]);
    expect(
      screen
        .getAllByRole("link")
        .map((link) => link.getAttribute("aria-label")),
    ).toEqual([
      "Dashboard",
      "Entries",
      "Categories",
      "Savings buckets",
      "Budget models",
      "Forecaster",
      "Household",
    ]);
    expect(
      screen.getAllByRole("link").map((link) => link.getAttribute("title")),
    ).toEqual([
      "Dashboard",
      "Entries",
      "Categories",
      "Savings buckets",
      "Budget models",
      "Forecaster",
      "Household",
    ]);
  });

  it("marks the current destination as active", () => {
    navigation.pathname = "/household";

    render(<AppRail />);

    expect(screen.getByRole("link", { name: "Household" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it.each([
    ["Dashboard", DashboardPage],
    ["Forecaster", ForecasterPage],
  ])("renders the %s page as a title-only placeholder", (title, Page) => {
    render(<Page />);

    expect(
      screen.getByRole("heading", { level: 1, name: title }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(document.querySelectorAll("input")).toHaveLength(0);
  });

  it("renders the Budget models workspace", async () => {
    render(await BudgetModelsPage({ searchParams: Promise.resolve({}) }));
    expect(
      screen.getByRole("heading", { name: "Budget models" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No budget models/)).toBeInTheDocument();
  });
  it("renders the Savings workspace", async () => {
    render(await SavingsBucketsPage({ searchParams: Promise.resolve({}) }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Savings buckets" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "+ New bucket" }),
    ).toBeInTheDocument();
  });

  it("renders the Entries workspace", async () => {
    render(await EntriesPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Entries" }),
    ).toBeInTheDocument();
  });

  it("passes the entries month query to the server read helper", async () => {
    render(
      await EntriesPage({
        searchParams: Promise.resolve({ month: "2026-08" }),
      }),
    );

    expect(getEntriesView).toHaveBeenCalledWith("2026-08");
  });
});

describe("month picker", () => {
  it("labels the month with its short name and steps with previous and next", async () => {
    // Pin the clock so the picker and the expected labels read the same month.
    vi.useFakeTimers({ toFake: ["Date"] });
    const user = userEvent.setup();
    const today = new Date();
    const monthLabel = (offset: number) =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
      }).format(new Date(today.getFullYear(), today.getMonth() + offset, 1));

    render(<MonthPicker />);

    expect(screen.getByText(monthLabel(0))).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByText(monthLabel(-1))).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next month" }));
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText(monthLabel(1))).toBeInTheDocument();
  });
});

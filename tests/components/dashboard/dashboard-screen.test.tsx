import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardScreen from "@/components/dashboard/dashboard-screen";
import DashboardPage from "@/app/(shell)/(dashboard)/page";
import DashboardLoading from "@/app/(shell)/(dashboard)/loading";
import DashboardError from "@/app/(shell)/(dashboard)/error";
import { getDashboardView } from "@/server/dashboard-read";
import { parseHexColor } from "@/domain/color";
import {
  calculateBudgetTrend,
  calculateBurnRateGauge,
  calculateGoalHighlight,
} from "@/domain/dashboard-calculations";
import type { DashboardViewData } from "@/domain/dashboard";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/server/dashboard-read", () => ({ getDashboardView: vi.fn() }));

const month = "2026-11";
const color = parseHexColor("#7d8ba8");
const food = {
  categoryId: "food",
  name: "Food",
  color,
  spentCentavos: 9000,
  budgetCentavos: 10000,
  progressRatio: 0.9,
  deltaCentavos: 1000,
  rolloverCentavos: 1000,
  statusTone: "favourable",
  progressTone: "warning",
  isArchived: false,
  isClickable: true,
  isFoldedIntoMergeTarget: false,
} as const;
const empty: DashboardViewData = {
  modelName: null,
  filter: { monthKey: month, memberFilter: "all", categoryId: "all", range: 6 },
  hero: {
    bufferCentavos: 0,
    runwayMonths: null,
    sparklinePoints: [],
    isHouseholdScope: false,
  },
  kpis: {
    history: [],
    incomeCentavos: 0,
    expensesCentavos: 0,
    savingsCentavos: 0,
    unallocatedCentavos: 0,
    incomeDeltaCentavos: null,
    expensesDeltaCentavos: null,
    savingsDeltaCentavos: null,
    unallocatedDeltaCentavos: null,
    unallocatedScope: "all",
  },
  burnRate: calculateBurnRateGauge(0, 0, false),
  budgetTrend: calculateBudgetTrend([], new Map(), month, 6),
  categoriesTable: {
    isApplicable: true,
    rows: [],
    totalSpentCentavos: 0,
    totalBudgetCentavos: 0,
    totalDeltaCentavos: 0,
  },
  memberDistribution: {
    isApplicable: true,
    rows: [],
    maxSpendCentavos: 0,
    legendSwatches: [],
  },
  goalHighlight: calculateGoalHighlight(null, 0, [], month, 0),
  upcomingCommitments: { commitments: [] },
  filterMembers: [],
  filterCategories: [],
  modalCategories: [],
  modalMembers: [],
};
const populated: DashboardViewData = {
  ...empty,
  modelName: "Test plan",
  burnRate: calculateBurnRateGauge(9000, 10000, true),
  budgetTrend: calculateBudgetTrend(
    [
      { monthKey: "2026-10", actualExpensesCentavos: 7000 },
      { monthKey: month, actualExpensesCentavos: 9000 },
    ],
    new Map([[month, 10000]]),
    month,
    6,
  ),
  categoriesTable: {
    isApplicable: true,
    rows: [
      food,
      {
        ...food,
        categoryId: "old",
        name: "Old category",
        isArchived: true,
        isClickable: false,
      },
    ],
    totalSpentCentavos: 18000,
    totalBudgetCentavos: 20000,
    totalDeltaCentavos: 2000,
  },
  memberDistribution: {
    isApplicable: true,
    maxSpendCentavos: 9000,
    legendSwatches: [{ name: "Food", color }],
    rows: [
      {
        memberId: "ana",
        name: "Ana",
        totalSpentCentavos: 9000,
        isArchived: false,
        isClickable: true,
        isSelected: false,
        segments: [],
      },
      {
        memberId: "old",
        name: "Old member",
        totalSpentCentavos: 500,
        isArchived: true,
        isClickable: false,
        isSelected: false,
        segments: [],
      },
    ],
  },
  filterMembers: [{ id: "ana", name: "Ana" }],
  filterCategories: [{ id: "food", name: "Food", umbrella: "expense" }],
  modalCategories: [
    {
      id: "food",
      name: "Food",
      umbrella: "expense",
      color,
      archived: false,
      items: [{ id: "market", name: "Market" }],
    },
  ],
  modalMembers: [{ id: "ana", name: "Ana" }],
};

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Dashboard route and screen", () => {
  it("resolves URL filters into the dashboard read model", async () => {
    vi.mocked(getDashboardView).mockResolvedValue(populated);
    render(
      await DashboardPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({
          month,
          member: "ana",
          category: "food",
          range: "12",
        }),
      }),
    );
    expect(getDashboardView).toHaveBeenCalledWith({
      month,
      memberFilter: "ana",
      categoryId: "food",
      range: 12,
    });
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  it("ignores repeated filter values and invalid range values", async () => {
    vi.mocked(getDashboardView).mockResolvedValue(empty);
    await DashboardPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({
        month: [month, "2026-10"],
        member: ["ana", "household"],
        category: ["food", "old"],
        range: "012",
      }),
    });
    expect(getDashboardView).toHaveBeenCalledWith({
      month: undefined,
      memberFilter: undefined,
      categoryId: undefined,
      range: 6,
    });
  });

  it("renders all rows and links only active categories", () => {
    render(<DashboardScreen data={populated} />);
    expect(
      within(
        screen.getByRole("region", { name: "Actual vs budget" }),
      ).getByText(/budget · Test plan · ₱100/),
    ).toBeVisible();
    for (const name of [
      "Dashboard",
      "Burn rate",
      "Actual vs budget",
      "Categories",
      "Expense per member",
      "Upcoming commitments",
    ])
      expect(screen.getByRole("heading", { name })).toBeVisible();
    expect(screen.getByText("SAVINGS BUFFER")).toBeVisible();
    expect(screen.getByText("UNALLOCATED")).toBeVisible();
    expect(screen.getByText("No active savings goals")).toBeVisible();
    expect(screen.getByRole("link", { name: "Food" })).toHaveAttribute(
      "href",
      "/entries?month=2026-11&category=food",
    );
    expect(
      within(screen.getByRole("row", { name: /Old category/ })).queryByRole(
        "link",
      ),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /Old member/ })).toBeNull();
  });

  it("renders zero-data and unbudgeted states", () => {
    render(<DashboardScreen data={empty} />);
    expect(
      within(screen.getByRole("region", { name: "Burn rate" })).getByText(
        "No plan applied",
      ),
    ).toBeVisible();
    for (const message of [
      "No spending recorded for this period",
      "No spending or budget this month",
      "No spending recorded for this month",
      "No active savings goals",
      "No upcoming commitments",
    ])
      expect(screen.getByText(message)).toBeVisible();
  });

  it("preserves reporting context while changing member, range, and month", async () => {
    const user = userEvent.setup();
    const data: DashboardViewData = {
      ...populated,
      filter: { ...populated.filter, categoryId: "food" },
    };
    const { rerender } = render(<DashboardScreen data={data} />);
    const options = { scroll: false };
    expect(screen.getByText("Food budget utilization")).toBeVisible();
    await user.click(
      within(
        screen.getByRole("region", { name: "Expense per member" }),
      ).getByRole("button", { name: /^Ana/ }),
    );
    expect(router.push).toHaveBeenLastCalledWith(
      "/?month=2026-11&member=ana&category=food&range=6",
      options,
    );
    rerender(
      <DashboardScreen
        data={{
          ...data,
          filter: { ...data.filter, memberFilter: "ana" },
          memberDistribution: {
            ...data.memberDistribution,
            rows: data.memberDistribution.rows.map((row) => ({
              ...row,
              isSelected: row.memberId === "ana",
            })),
          },
        }}
      />,
    );
    expect(screen.getByText("Household burn rate")).toBeVisible();
    expect(screen.getByRole("link", { name: "Food" })).toHaveAttribute(
      "href",
      "/entries?month=2026-11&category=food&owner=ana",
    );
    await user.click(
      within(
        screen.getByRole("region", { name: "Expense per member" }),
      ).getByRole("button", { name: /^Ana/ }),
    );
    expect(router.push).toHaveBeenLastCalledWith(
      "/?month=2026-11&member=all&category=food&range=6",
      options,
    );
    await user.click(screen.getByRole("button", { name: "12 mo" }));
    expect(router.push).toHaveBeenLastCalledWith(
      "/?month=2026-11&member=ana&category=food&range=12",
      options,
    );
    await user.click(screen.getByRole("button", { name: /October 2026/ }));
    expect(router.push).toHaveBeenLastCalledWith(
      "/?month=2026-10&member=ana&category=food&range=6",
      options,
    );
  });

  it("saves an entry from the real modal and refreshes once", async () => {
    vi.setSystemTime(new Date(2026, 10, 13, 12));
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<DashboardScreen data={populated} />);
    await user.click(screen.getByRole("button", { name: "+ Add entry" }));
    const dialog = within(screen.getByRole("dialog", { name: "Add entry" }));
    await user.type(dialog.getByRole("textbox", { name: "Amount" }), "12.34");
    await user.type(
      dialog.getByRole("textbox", { name: "Note" }),
      "Market trip",
    );
    await user.click(dialog.getByRole("button", { name: "Save" }));
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "expense",
        amount: "12.34",
        date: "2026-11-13",
        itemId: "market",
        ownerMemberId: "",
        note: "Market trip",
      }),
    });
    expect(await screen.findByText("₱12.34 added to Food")).toHaveAttribute(
      "role",
      "status",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("announces loading and renders a four-row skeleton", () => {
    render(<DashboardLoading />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading dashboard");
    expect(status.querySelector('[aria-hidden="true"]')?.children).toHaveLength(
      4,
    );
  });

  it("can retry loading the dashboard", async () => {
    const retry = vi.fn();
    render(<DashboardError retry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load the dashboard",
    );
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

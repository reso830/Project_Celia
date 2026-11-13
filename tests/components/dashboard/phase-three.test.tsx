import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import SavingsBufferHero from "@/components/dashboard/savings-buffer-hero";
import SecondaryKpiGrid from "@/components/dashboard/secondary-kpi-grid";
import BurnRateGauge, {
  gaugeArcPath,
} from "@/components/dashboard/burn-rate-gauge";
import BudgetTrendChart from "@/components/dashboard/budget-trend-chart";
import {
  calculateBurnRateGauge,
  calculateBudgetTrend,
} from "@/domain/dashboard-calculations";
import type { DashboardKpisData } from "@/domain/dashboard";
const kpis: DashboardKpisData = {
  history: [
    {
      monthKey: "2026-10",
      incomeCentavos: 0,
      expensesCentavos: 30000,
      savingsCentavos: 10000,
      unallocatedCentavos: -40000,
    },
    {
      monthKey: "2026-11",
      incomeCentavos: 100001,
      expensesCentavos: 20002,
      savingsCentavos: 30003,
      unallocatedCentavos: -1234,
    },
  ],
  incomeCentavos: 100001,
  incomeDeltaCentavos: 10001,
  expensesCentavos: 20002,
  expensesDeltaCentavos: -2002,
  savingsCentavos: 30003,
  savingsDeltaCentavos: -3003,
  unallocatedCentavos: -1234,
  unallocatedDeltaCentavos: -234,
  unallocatedScope: "all",
};
describe("Dashboard Phase 03 components", () => {
  it("exposes reporting chip menus in prototype order and emits filter and entry actions", async () => {
    const user = userEvent.setup(),
      onFilterChange = vi.fn(),
      onAddEntry = vi.fn();
    render(
      <DashboardHeader
        filter={{
          monthKey: "2026-11",
          memberFilter: "all",
          categoryId: "all",
          range: 6,
        }}
        members={[{ id: "ana", name: "Ana" }]}
        categories={[{ id: "food", name: "Food", umbrella: "expense" }]}
        onFilterChange={onFilterChange}
        onAddEntry={onAddEntry}
      />,
    );
    const owner = screen.getByRole("button", { name: "All members ▾" });
    const category = screen.getByRole("button", { name: "All categories ▾" });
    const previous = screen.getByRole("button", { name: "Previous month" });
    expect(
      owner.compareDocumentPosition(category) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      category.compareDocumentPosition(previous) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    owner.focus();
    await user.keyboard("{Enter}");
    expect(owner).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: "Household" }));
    expect(onFilterChange).toHaveBeenLastCalledWith({
      memberFilter: "household",
    });
    expect(owner).toHaveFocus();
    await user.click(category);
    await user.click(screen.getByRole("button", { name: "Food" }));
    expect(onFilterChange).toHaveBeenLastCalledWith({ categoryId: "food" });
    await user.click(category);
    await user.tab();
    await user.keyboard("{Escape}");
    expect(category).toHaveFocus();
    expect(category).toHaveAttribute("aria-expanded", "false");
    await user.click(previous);
    expect(onFilterChange).toHaveBeenLastCalledWith({ monthKey: "2026-10" });
    const add = screen.getByRole("button", { name: "+ Add entry" });
    expect(add).toHaveClass("bg-celia-accent", "hover:bg-celia-accent-dark");
    await user.click(add);
    expect(onAddEntry).toHaveBeenCalledOnce();
  });
  it("renders exact hero money, runway and normalized sparkline coordinates", () => {
    const { container } = render(
      <SavingsBufferHero
        data={{
          bufferCentavos: 47000001,
          runwayMonths: 7.3,
          isHouseholdScope: true,
          sparklinePoints: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
        }}
      />,
    );
    expect(screen.getByText("₱470,000.01")).toBeInTheDocument();
    expect(screen.getByText(/7.3 months runway/)).toBeInTheDocument();
    expect(screen.getByText(/Household buffer/)).toBeInTheDocument();
    expect(container.querySelector("polyline")).toHaveAttribute(
      "points",
      "0,44 120,8",
    );
  });
  it("renders an unavailable runway and flat empty sparkline safely", () => {
    const { container } = render(
      <SavingsBufferHero
        data={{
          bufferCentavos: 0,
          runwayMonths: null,
          isHouseholdScope: false,
          sparklinePoints: [],
        }}
      />,
    );
    expect(screen.getByText("Runway —")).toBeInTheDocument();
    expect(container.querySelector("polyline")).toHaveAttribute(
      "points",
      "0,44 120,44",
    );
  });
  it("formats KPI plan deltas and signed deficits with accessible warning text", () => {
    render(<SecondaryKpiGrid data={kpis} hasMonthlyPlan />);
    expect(screen.getByText("₱1,000.01")).toBeInTheDocument();
    expect(screen.getByText("₱20.02 overspent")).toBeInTheDocument();
    expect(screen.getByText("−₱30.03 vs plan")).toHaveClass(
      "text-[var(--savings-warning-ink)]",
    );
    expect(screen.getByText("−₱12.34")).toBeInTheDocument();
  });
  it("distinguishes inapplicable KPIs and member net from an absent plan", () => {
    const { rerender } = render(
      <SecondaryKpiGrid
        data={{
          ...kpis,
          incomeCentavos: null,
          incomeDeltaCentavos: null,
          unallocatedScope: "member",
          unallocatedDeltaCentavos: null,
        }}
        hasMonthlyPlan
      />,
    );
    expect(screen.getByText("Member net")).toBeInTheDocument();
    expect(screen.queryByText("No plan applied")).not.toBeInTheDocument();
    rerender(
      <SecondaryKpiGrid
        data={{
          ...kpis,
          incomeDeltaCentavos: null,
          expensesDeltaCentavos: null,
          savingsDeltaCentavos: null,
          unallocatedDeltaCentavos: null,
        }}
        hasMonthlyPlan={false}
      />,
    );
    expect(screen.getAllByText("No plan applied")).toHaveLength(4);
  });
  it.each([
    [0, 0, false, false, "—", "No plan applied"],
    [0, 0, true, false, "—", "Zero budget · ₱0 spent"],
    [1, 0, true, false, "Overspent", "No budget allocated"],
    [1, 100, true, true, "—", "Income category selected"],
    [92, 100, true, false, "92%", "On pace"],
  ] as const)(
    "renders gauge actual=%i budget=%i plan=%s income=%s",
    (actual, budget, plan, income, value, subtitle) => {
      render(
        <BurnRateGauge
          data={calculateBurnRateGauge(actual, budget, plan, income)}
          monthKey="2026-11"
          householdScope
        />,
      );
      expect(screen.getByText(value)).toBeInTheDocument();
      expect(screen.getByText(subtitle)).toBeInTheDocument();
      expect(screen.getByText("NOV 2026")).toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: /Burn rate/ }),
      ).toHaveAccessibleName(expect.stringContaining(subtitle));
    },
  );
  it("shows expense category utilization scope", () => {
    render(
      <BurnRateGauge
        data={calculateBurnRateGauge(50, 100, true)}
        monthKey="2026-11"
        scopeLabel="Food budget utilization"
      />,
    );
    expect(screen.getByText("Food budget utilization")).toBeInTheDocument();
  });
  it("uses clockwise 270 degree geometry including the large arc flag", () => {
    expect(gaugeArcPath(0)).toBe("");
    expect(gaugeArcPath(0.5)).toBe("M 46.26 153.74 A 76 76 0 0 1 100.00 24.00");
    expect(gaugeArcPath(1)).toBe("M 46.26 153.74 A 76 76 0 1 1 153.74 153.74");
    expect(gaugeArcPath(2)).toBe(gaugeArcPath(1));
  });
  it("renders four monthly KPI trends and keeps signed values within the plot", () => {
    render(<SecondaryKpiGrid data={kpis} hasMonthlyPlan />);
    for (const label of ["INCOME", "EXPENSES", "SAVINGS", "UNALLOCATED"]) {
      const chart = within(
        screen.getByRole("region", { name: label }),
      ).getByRole("img", { name: `${label} monthly trend` });
      expect(chart).toHaveAttribute("width", "88");
      expect(chart).toHaveAttribute("height", "30");
      expect(chart.querySelector("polyline")).toHaveAttribute(
        "points",
        label === "EXPENSES" ? "4,3 96,27" : "4,27 96,3",
      );
    }
  });
  it.each(["member", "household", "all"] as const)(
    "hides scope subtitles for unavailable amounts under %s scope",
    (unallocatedScope) => {
      render(
        <SecondaryKpiGrid
          data={{
            ...kpis,
            savingsCentavos: null,
            unallocatedCentavos: null,
            unallocatedScope,
          }}
          householdSavings
          hasMonthlyPlan
        />,
      );
      for (const label of [
        "Member net",
        "Household net",
        "Household savings",
        "Unallocated",
      ]) {
        expect(screen.queryByText(label)).not.toBeInTheDocument();
      }
    },
  );
  it("uses a flat empty trend and omits inapplicable trends", () => {
    render(
      <SecondaryKpiGrid
        data={{ ...kpis, history: [], incomeCentavos: null }}
        hasMonthlyPlan
      />,
    );
    expect(
      screen.queryByRole("img", { name: "INCOME monthly trend" }),
    ).not.toBeInTheDocument();
    expect(
      screen
        .getByRole("img", { name: "SAVINGS monthly trend" })
        .querySelector("polyline"),
    ).toHaveAttribute("points", "4,27 96,27");
  });
  it("emits range and month selections from keyboard accessible chart controls", async () => {
    const user = userEvent.setup(),
      onRangeChange = vi.fn(),
      onMonthChange = vi.fn();
    render(
      <BudgetTrendChart
        data={calculateBudgetTrend(
          [{ monthKey: "2026-11", actualExpensesCentavos: 50000 }],
          new Map([["2026-11", 60000]]),
          "2026-11",
          6,
        )}
        onRangeChange={onRangeChange}
        onMonthChange={onMonthChange}
        householdBudget
      />,
    );
    await user.click(screen.getByRole("button", { name: "12 mo" }));
    expect(onRangeChange).toHaveBeenCalledWith(12);
    const bar = screen.getByRole("button", { name: /November 2026.*₱500/ });
    bar.focus();
    await user.keyboard("{Enter}");
    expect(onMonthChange).toHaveBeenCalledWith("2026-11");
    expect(screen.getByText(/budget \(household\)/)).toBeInTheDocument();
    expect(
      screen.getByLabelText("Selected month budget reference"),
    ).toBeInTheDocument();
  });
  it("does not fabricate budget lines or expense charts for inapplicable data", () => {
    const onRangeChange = vi.fn(),
      onMonthChange = vi.fn();
    const { rerender } = render(
      <BudgetTrendChart
        data={calculateBudgetTrend([], new Map(), "2026-11", 6)}
        onRangeChange={onRangeChange}
        onMonthChange={onMonthChange}
      />,
    );
    expect(
      screen.queryByLabelText("Selected month budget reference"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("No spending recorded for this period"),
    ).toBeInTheDocument();
    rerender(
      <BudgetTrendChart
        data={calculateBudgetTrend([], new Map(), "2026-11", 6, true)}
        onRangeChange={onRangeChange}
        onMonthChange={onMonthChange}
      />,
    );
    expect(
      screen.getByText("Expense trend not applicable to income categories"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: "Trend range" })).getAllByRole(
        "button",
      ),
    ).toHaveLength(2);
  });
});

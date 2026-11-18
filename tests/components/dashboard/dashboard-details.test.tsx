import { render, screen, within } from "@testing-library/react";
import { parseHexColor } from "@/domain/color";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CategoriesBreakdownTable from "@/components/dashboard/categories-breakdown-table";
import MemberExpenseDistribution from "@/components/dashboard/member-expense-distribution";
import GoalHighlightCard from "@/components/dashboard/goal-highlight-card";
import UpcomingCommitmentsCard from "@/components/dashboard/upcoming-commitments-card";
import type {
  CategoriesTableData,
  MemberDistributionData,
  GoalHighlightData,
} from "@/domain/dashboard";
const categories: CategoriesTableData = {
  isApplicable: true,
  totalSpentCentavos: 12002,
  totalBudgetCentavos: 15000,
  totalDeltaCentavos: 2998,
  rows: [
    {
      categoryId: "food",
      name: "Food",
      color: parseHexColor("#123456"),
      spentCentavos: 10001,
      budgetCentavos: 15000,
      progressRatio: 0.67,
      deltaCentavos: 4999,
      rolloverCentavos: 4999,
      statusTone: "favourable",
      progressTone: "favourable",
      isArchived: false,
      isClickable: true,
      isFoldedIntoMergeTarget: false,
    },
    {
      categoryId: "old",
      name: "Old",
      color: parseHexColor("#654321"),
      spentCentavos: 2001,
      budgetCentavos: 0,
      progressRatio: 1,
      deltaCentavos: -2001,
      rolloverCentavos: null,
      statusTone: "critical",
      progressTone: "critical",
      isArchived: true,
      isClickable: false,
      isFoldedIntoMergeTarget: false,
    },
  ],
};
const distribution: MemberDistributionData = {
  isApplicable: true,
  maxSpendCentavos: 10001,
  rows: [
    {
      memberId: "ana",
      name: "Ana",
      totalSpentCentavos: 10001,
      isArchived: false,
      isClickable: true,
      isSelected: false,
      segments: [
        {
          categoryId: "food",
          categoryName: "Food",
          color: parseHexColor("#123456"),
          amountCentavos: 10001,
          widthRatio: 1,
        },
      ],
    },
    {
      memberId: "household",
      name: "Household",
      totalSpentCentavos: 2001,
      isArchived: false,
      isClickable: true,
      isSelected: false,
      segments: [
        {
          categoryId: "food",
          categoryName: "Food",
          color: parseHexColor("#123456"),
          amountCentavos: 2001,
          widthRatio: 0.2,
        },
      ],
    },
    {
      memberId: "old",
      name: "Old member",
      totalSpentCentavos: 0,
      isArchived: true,
      isClickable: false,
      isSelected: false,
      segments: [],
    },
  ],
  legendSwatches: [{ name: "Food", color: parseHexColor("#123456") }],
};
const goal: GoalHighlightData = {
  hasGoal: true,
  bucketId: "car",
  name: "Car fund",
  currentBalanceCentavos: 10001,
  targetAmountCentavos: 20000,
  progressRatio: 0.5,
  statusTone: "warning",
  status: "on_track",
  monthsToTarget: 5,
  remainingCentavos: 9999,
  currentMonthFundedCentavos: 2000,
};
describe("Dashboard detail cards", () => {
  it.each([
    ["all", ""],
    ["ana", "&owner=ana"],
    ["household", "&owner=household"],
  ])("preserves category drill-down context for %s", (memberFilter, suffix) => {
    render(
      <CategoriesBreakdownTable
        data={categories}
        monthKey="2026-11"
        memberFilter={memberFilter}
        hasMonthlyPlan
      />,
    );
    expect(screen.getByRole("link", { name: "Food" })).toHaveAttribute(
      "href",
      `/entries?month=2026-11&category=food${suffix}`,
    );
    const archived = screen.getByRole("row", { name: /Old/ });
    expect(within(archived).queryByRole("link")).not.toBeInTheDocument();
    expect(within(archived).getByText("(archived)")).toBeInTheDocument();
    expect(screen.getByText("−₱20.01")).toBeInTheDocument();
    expect(screen.getAllByText("+₱49.99")).toHaveLength(1);
    expect(screen.getByText("↺ remaining this month")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Food budget used" }),
    ).toHaveAttribute("aria-valuenow", "67");
    expect(screen.getByText("Over budget")).toBeInTheDocument();
    expect(screen.getByText("₱49.99")).toHaveClass("text-celia-status-green");
  });
  it("shows amber utilization alongside a negative delta at 110% spent", () => {
    render(
      <CategoriesBreakdownTable
        data={{
          ...categories,
          rows: [
            {
              ...categories.rows[0],
              spentCentavos: 16500,
              progressRatio: 1,
              progressTone: "warning",
              statusTone: "critical",
              deltaCentavos: -1500,
              rolloverCentavos: null,
            },
          ],
        }}
        monthKey="2026-11"
        hasMonthlyPlan
      />,
    );
    const bar = screen.getByRole("progressbar", { name: "Food budget used" });
    expect(bar.firstElementChild).toHaveStyle(
      "background-color: var(--color-status-amber)",
    );
    expect(screen.getByText("−₱15")).toHaveClass("text-celia-status-red");
  });
  it("distinguishes missing plans, empty expense data and income category applicability", () => {
    const { rerender } = render(
      <CategoriesBreakdownTable
        data={categories}
        monthKey="2026-11"
        hasMonthlyPlan={false}
      />,
    );
    expect(screen.getByText("No plan applied")).toBeInTheDocument();
    expect(screen.queryByText("+₱49.99")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    rerender(
      <CategoriesBreakdownTable
        data={{ ...categories, rows: [] }}
        monthKey="2026-11"
        hasMonthlyPlan
      />,
    );
    expect(
      screen.getByText("No spending or budget this month"),
    ).toBeInTheDocument();
    rerender(
      <CategoriesBreakdownTable
        data={{ ...categories, isApplicable: false }}
        monthKey="2026-11"
        hasMonthlyPlan
      />,
    );
    expect(
      screen.getByText("No expense categories match filter"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
  it("toggles member and Household filters from native keyboard controls and leaves archives inert", async () => {
    const user = userEvent.setup(),
      onMemberChange = vi.fn();
    const { rerender } = render(
      <MemberExpenseDistribution
        data={distribution}
        onMemberChange={onMemberChange}
      />,
    );
    const ana = screen.getByRole("button", { name: /Ana/ });
    ana.focus();
    await user.keyboard("{Enter}");
    expect(onMemberChange).toHaveBeenLastCalledWith("ana");
    await user.click(screen.getByRole("button", { name: /Household/ }));
    expect(onMemberChange).toHaveBeenLastCalledWith("household");
    expect(
      screen.queryByRole("button", { name: /Old member/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Old member")).toBeInTheDocument();
    expect(screen.getByTitle("Food: ₱20.01")).toHaveStyle({
      width: "20%",
      backgroundColor: "#123456",
    });
    rerender(
      <MemberExpenseDistribution
        data={{
          ...distribution,
          rows: distribution.rows.map((row) => ({
            ...row,
            isSelected: row.memberId === "ana",
          })),
        }}
        onMemberChange={onMemberChange}
      />,
    );
    expect(screen.getByRole("button", { name: /Ana/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: /Ana/ }));
    expect(onMemberChange).toHaveBeenLastCalledWith("all");
  });
  it("renders distribution empty and income-category states", () => {
    const { rerender } = render(
      <MemberExpenseDistribution
        data={{ ...distribution, maxSpendCentavos: 0, rows: [] }}
        onMemberChange={vi.fn()}
      />,
    );
    expect(
      screen.getByText("No spending recorded for this month"),
    ).toBeInTheDocument();
    rerender(
      <MemberExpenseDistribution
        data={{ ...distribution, isApplicable: false }}
        onMemberChange={vi.fn()}
      />,
    );
    expect(
      screen.getByText(
        "Expense distribution not applicable to income categories",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("shows exact goal money, bounded ring geometry and domain-provided funding pace", () => {
    render(<GoalHighlightCard data={goal} householdScope />);
    expect(screen.getByText("₱100.01 / ₱200")).toBeInTheDocument();
    expect(
      screen.getByText("At ₱20/mo → 5 months to target"),
    ).toBeInTheDocument();
    expect(screen.getByText("Household goal")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Goal progress 50%" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img").querySelector("circle[data-progress]"),
    ).toHaveAttribute("stroke-dasharray", "50 100");
    expect(
      screen.getByRole("img").querySelector("circle[data-progress]"),
    ).toHaveAttribute("stroke", "var(--color-status-amber)");
  });
  it("handles unfunded, funded and missing goals without inventing a projection", () => {
    const { rerender } = render(
      <GoalHighlightCard
        data={{
          ...goal,
          status: "no_contributions",
          monthsToTarget: null,
          currentMonthFundedCentavos: 0,
        }}
      />,
    );
    expect(
      screen.getByText("No contributions this month · ₱99.99 left"),
    ).toBeInTheDocument();
    rerender(
      <GoalHighlightCard
        data={{
          ...goal,
          status: "funded",
          statusTone: "favourable",
          progressRatio: 1,
          remainingCentavos: 0,
        }}
      />,
    );
    expect(screen.getByText("Funded — ready to draw")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Goal progress 100%" }),
    ).toBeInTheDocument();
    rerender(
      <GoalHighlightCard
        data={{
          ...goal,
          hasGoal: false,
          status: "no_goal",
          targetAmountCentavos: null,
        }}
      />,
    );
    expect(screen.getByText("No active savings goals")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
  it("formats commitment due months and exact remaining amounts with a text funded state", () => {
    render(
      <UpcomingCommitmentsCard
        householdScope
        data={{
          commitments: [
            {
              bucketId: "tuition",
              name: "Tuition",
              targetMonth: "2026-12",
              targetAmountCentavos: 10000,
              currentBalanceCentavos: 1234,
              remainingCentavos: 8766,
              isFunded: false,
            },
            {
              bucketId: "car",
              name: "Car fund",
              targetMonth: "2027-01",
              targetAmountCentavos: 10000,
              currentBalanceCentavos: 10000,
              remainingCentavos: 0,
              isFunded: true,
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("Dec 2026")).toBeInTheDocument();
    expect(screen.getByText("Jan 2027")).toBeInTheDocument();
    expect(screen.getByText("₱87.66 left")).toBeInTheDocument();
    expect(screen.getByText("₱0 left · Funded")).toBeInTheDocument();
    expect(screen.getByText("Household commitments")).toBeInTheDocument();
  });
  it("shows the empty commitments state", () => {
    render(<UpcomingCommitmentsCard data={{ commitments: [] }} />);
    expect(screen.getByText("No upcoming commitments")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { CashFlowChart, cashFlowPoints } from "@/components/cash-flow-chart";
import type { Transaction } from "@/domain/transaction";

const income: Transaction = {
  id: "income",
  date: "2026-07-03",
  memberId: "member",
  categoryId: "salary",
  type: "income",
  amount: 10_000,
  recurring: false,
  currency: "PHP",
};

const expense: Transaction = {
  id: "expense",
  date: "2026-07-03",
  memberId: "member",
  categoryId: "food",
  type: "expense",
  amount: 2_500,
  recurring: false,
  currency: "PHP",
};

const earlierExpense: Transaction = {
  id: "earlier",
  date: "2026-07-01",
  memberId: "member",
  categoryId: "rent",
  type: "expense",
  amount: 1_000,
  recurring: false,
  currency: "PHP",
};

describe("CashFlowChart", () => {
  it("aggregates daily movements and carries the balance chronologically", () => {
    expect(cashFlowPoints([income, expense, earlierExpense])).toEqual([
      { date: "2026-07-01", movement: -1_000, balance: -1_000 },
      { date: "2026-07-03", movement: 7_500, balance: 6_500 },
    ]);
  });

  it("renders a named empty state without a chart", () => {
    render(<CashFlowChart transactions={[]} />);

    expect(screen.getByText("No cash flow data yet.")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Cash flow" }),
    ).not.toBeInTheDocument();
  });

  it("renders the current balance and one point label per calendar date", () => {
    render(<CashFlowChart transactions={[income, expense, earlierExpense]} />);

    expect(screen.getByRole("img", { name: "Cash flow" })).toBeInTheDocument();
    expect(screen.getByText("₱65.00")).toBeInTheDocument();
    expect(screen.getByText("2026-07-01: -₱10.00")).toBeInTheDocument();
    expect(screen.getByText("2026-07-03: ₱65.00")).toBeInTheDocument();
  });

  it("renders a visible marker for a single-day series", () => {
    const { container } = render(<CashFlowChart transactions={[income]} />);

    expect(container.querySelector("svg circle")).toBeInTheDocument();
  });
});

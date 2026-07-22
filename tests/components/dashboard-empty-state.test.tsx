import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { DashboardEmptyState } from "@/components/dashboard-empty-state";
import { DataProvider, type DataRepositories } from "@/data";
import type { Transaction } from "@/domain";

function repositories(
  categories: DataRepositories["categories"]["list"] = vi
    .fn()
    .mockResolvedValue([]),
  bucketColors: DataRepositories["bucketColors"]["list"] = vi
    .fn()
    .mockResolvedValue([]),
  bucketGroups: DataRepositories["bucketGroups"]["list"] = vi
    .fn()
    .mockResolvedValue([]),
  transactions: readonly Transaction[] = [],
): DataRepositories {
  return {
    members: {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
    },
    categories: {
      get: vi.fn(),
      list: categories,
      save: vi.fn(),
      delete: vi.fn(),
    },
    transactions: {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue(transactions),
      save: vi.fn(),
      delete: vi.fn(),
    },
    bucketColors: {
      get: vi.fn(),
      list: bucketColors,
      save: vi.fn(),
      delete: vi.fn(),
    },
    bucketGroups: {
      get: vi.fn(),
      list: bucketGroups,
      save: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function renderDashboard(dataRepositories = repositories()) {
  return render(
    <DataProvider createRepositories={() => dataRepositories}>
      <DashboardEmptyState />
    </DataProvider>,
  );
}

describe("DashboardEmptyState", () => {
  const summaryTransactions: readonly Transaction[] = [
    {
      id: "salary",
      date: "2026-07-01",
      memberId: "alex",
      categoryId: "salary",
      type: "income",
      amount: 500_000,
      recurring: false,
      currency: "PHP",
    },
    {
      id: "groceries",
      date: "2026-07-02",
      memberId: "alex",
      categoryId: "food",
      type: "expense",
      amount: 125_000,
      recurring: false,
      currency: "PHP",
    },
  ];

  it("renders the Celia dashboard empty state", async () => {
    renderDashboard();

    expect(
      await screen.findByRole("heading", { name: "Celia" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No cash flow data yet.")).toBeInTheDocument();
    expect(screen.getByText("No bucket groups yet.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No transactions yet. Add transactions to see your monthly income and expenses.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("renders monthly income and expense chart data", async () => {
    const transactions: readonly Transaction[] = [
      {
        id: "salary",
        date: "2026-07-01",
        memberId: "alex",
        categoryId: "salary",
        type: "income",
        amount: 500_000,
        recurring: false,
        currency: "PHP",
      },
      {
        id: "food",
        date: "2026-07-12",
        memberId: "alex",
        categoryId: "food",
        type: "expense",
        amount: 12_500,
        recurring: false,
        currency: "PHP",
      },
    ];

    renderDashboard(
      repositories(undefined, undefined, undefined, transactions),
    );

    expect(
      await screen.findByRole("region", { name: "Income vs expenses" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Jul 2026")).toBeInTheDocument();
    expect(
      screen.getByText("Jul 2026: Income: ₱5,000.00. Expenses: ₱125.00."),
    ).toBeInTheDocument();
  });

  it("keeps adjacent monthly chart bar groups from overlapping", async () => {
    const transactions: readonly Transaction[] = Array.from(
      { length: 20 },
      (_, index): Transaction => ({
        id: `transaction-${index}`,
        date: `${2025 + Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-01`,
        memberId: "alex",
        categoryId: "salary",
        type: index % 2 === 0 ? "income" : "expense",
        amount: 10_000,
        recurring: false,
        currency: "PHP",
      }),
    );
    const { container } = renderDashboard(
      repositories(undefined, undefined, undefined, transactions),
    );

    await screen.findByRole("region", { name: "Income vs expenses" });
    const bars = Array.from(container.querySelectorAll("svg rect")).map(
      (bar) => ({
        x: Number(bar.getAttribute("x")),
        width: Number(bar.getAttribute("width")),
      }),
    );

    for (let month = 0; month < 19; month += 1) {
      const currentExpense = bars[month * 2 + 1];
      const nextIncome = bars[(month + 1) * 2];

      expect(currentExpense.x + currentExpense.width).toBeLessThanOrEqual(
        nextIncome.x,
      );
    }
  });

  it("renders configured bucket groups", async () => {
    renderDashboard(
      repositories(
        vi
          .fn()
          .mockResolvedValue([
            { id: "rent", type: "expense", group: "Housing", name: "Rent" },
          ]),
        vi.fn().mockResolvedValue([{ bucket: "Housing", color: "#2463eb" }]),
        vi
          .fn()
          .mockResolvedValue([
            { id: "expense-housing", type: "expense", name: "Housing" },
          ]),
      ),
    );

    expect(
      await screen.findByRole("article", { name: "Expense Housing" }),
    ).toHaveTextContent("Rent");
    expect(screen.getByText("Color: #2463eb")).toBeInTheDocument();
  });

  it("renders financial metrics from all persisted transactions", async () => {
    renderDashboard(
      repositories(undefined, undefined, undefined, summaryTransactions),
    );

    expect(await screen.findByText("₱5,000.00")).toBeInTheDocument();
    expect(screen.getByText("Income", { selector: "dt" })).toBeInTheDocument();
    expect(
      screen.getByText("Expenses", { selector: "dt" }),
    ).toBeInTheDocument();
    expect(screen.getByText("₱1,250.00")).toBeInTheDocument();
    const netCard = screen.getByText("Net").parentElement;
    expect(netCard).not.toBeNull();
    expect(within(netCard!).getByText("₱3,750.00")).toBeInTheDocument();
    expect(screen.getByText("Savings Rate")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("renders zero financial metrics without transactions", async () => {
    renderDashboard();

    expect(
      await screen.findByText("Income", { selector: "dt" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("₱0.00")).toHaveLength(3);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders an expense breakdown using configured bucket colors", async () => {
    const rent: Transaction = {
      id: "rent-transaction",
      date: "2026-07-22",
      memberId: "alex",
      categoryId: "rent",
      type: "expense",
      amount: 75_000,
      recurring: false,
      currency: "PHP",
    };

    renderDashboard(
      repositories(
        vi
          .fn()
          .mockResolvedValue([
            { id: "rent", type: "expense", group: "Housing", name: "Rent" },
          ]),
        vi.fn().mockResolvedValue([{ bucket: "Housing", color: "#2463eb" }]),
        vi
          .fn()
          .mockResolvedValue([
            { id: "expense-housing", type: "expense", name: "Housing" },
          ]),
        [rent],
      ),
    );

    expect(
      await screen.findByRole("img", { name: "Expense breakdown" }),
    ).toBeInTheDocument();
    expect(screen.getByText("₱750.00 · 100%")).toBeInTheDocument();
    expect(screen.getByTestId("bucket-slice-Housing")).toHaveAttribute(
      "stroke",
      "#2463eb",
    );
  });
});

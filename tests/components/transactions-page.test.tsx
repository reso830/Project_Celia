import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { TransactionsPage } from "@/components/transactions-page";
import { DataProvider, type DataRepositories } from "@/data";
import type { Category } from "@/domain/category";
import type { Member } from "@/domain/member";
import type { Transaction } from "@/domain/transaction";

const alex: Member = {
  id: "member-alex",
  name: "Alex",
  color: "#2463eb",
};

const groceries: Category = {
  id: "category-groceries",
  type: "expense",
  group: "Groceries",
  name: "Food",
};

const groceryTransaction: Transaction = {
  id: "transaction-grocery",
  date: "2026-07-22",
  memberId: "member-alex",
  categoryId: "category-groceries",
  type: "expense",
  amount: 1_250,
  description: "Weekly groceries",
  recurring: false,
  currency: "PHP",
};

function repositoriesWith({
  members = [],
  categories = [],
  transactions = [],
}: {
  members?: readonly Member[];
  categories?: readonly Category[];
  transactions?: readonly Transaction[];
} = {}): DataRepositories {
  return {
    members: {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue(members),
      save: vi.fn(),
      delete: vi.fn(),
    },
    categories: {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue(categories),
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
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
    },
    bucketGroups: {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function renderTransactions(data: Parameters<typeof repositoriesWith>[0] = {}) {
  render(
    <DataProvider createRepositories={() => repositoriesWith(data)}>
      <TransactionsPage />
    </DataProvider>,
  );
}

describe("TransactionsPage", () => {
  it("renders the transactions controls and empty table", async () => {
    renderTransactions();

    await screen.findByText("0 transactions");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      within(
        screen.getByRole("navigation", { name: "Primary navigation" }),
      ).getByText("Transactions"),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("button", { name: "+ Add Transaction" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Household (All)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Spreadsheet" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByLabelText("Search transactions")).toBeInTheDocument();
    expect(screen.getByLabelText("Transaction type")).toHaveValue("all");
    expect(
      screen.getByText("No transactions match your filters."),
    ).toBeInTheDocument();
  });

  it("displays persisted transaction data from the provider", async () => {
    renderTransactions({
      members: [alex],
      categories: [groceries],
      transactions: [groceryTransaction],
    });

    expect(await screen.findByText("1 transaction")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Alex" })).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "Groceries" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "Weekly groceries" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "₱12.50" })).toBeInTheDocument();
  });
});

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  const dataRepositories = repositoriesWith(data);

  render(
    <DataProvider createRepositories={() => dataRepositories}>
      <TransactionsPage />
    </DataProvider>,
  );

  return { transactionSave: dataRepositories.transactions.save };
}

async function completeExpenseForm(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText("Member"), "member-alex");
  await user.selectOptions(screen.getByLabelText("Bucket"), "Groceries");
  await user.selectOptions(
    screen.getByLabelText("Subcategory"),
    "category-groceries",
  );
  await user.type(screen.getByLabelText("Amount"), "12.50");
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
    expect(screen.getByRole("cell", { name: "Groceries" })).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "Weekly groceries" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "₱12.50" })).toBeInTheDocument();
  });

  it("shows required-field errors without saving", async () => {
    const user = userEvent.setup();
    const { transactionSave } = renderTransactions({
      members: [alex],
      categories: [groceries],
    });

    await user.click(
      await screen.findByRole("button", { name: "+ Add Transaction" }),
    );
    await user.click(screen.getByRole("button", { name: "Save transaction" }));

    expect(screen.getByText("Member is required.")).toBeInTheDocument();
    expect(screen.getByText("Bucket is required.")).toBeInTheDocument();
    expect(screen.getByText("Subcategory is required.")).toBeInTheDocument();
    expect(screen.getByText("Amount is required.")).toBeInTheDocument();
    expect(transactionSave).not.toHaveBeenCalled();
  });

  it("disables saving when no members exist", async () => {
    const user = userEvent.setup();
    renderTransactions({ categories: [groceries] });

    await user.click(
      await screen.findByRole("button", { name: "+ Add Transaction" }),
    );

    expect(
      screen.getByText(
        "Add a household member in Settings before creating a transaction.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save transaction" }),
    ).toBeDisabled();
  });

  it("saves a valid expense and adds it to the list", async () => {
    const user = userEvent.setup();
    const { transactionSave } = renderTransactions({
      members: [alex],
      categories: [groceries],
    });

    await user.click(
      await screen.findByRole("button", { name: "+ Add Transaction" }),
    );
    await completeExpenseForm(user);
    await user.type(screen.getByLabelText("Notes"), "Weekly groceries");
    await user.click(screen.getByRole("checkbox", { name: "Recurring" }));
    await user.click(screen.getByRole("button", { name: "Save transaction" }));

    await waitFor(() =>
      expect(transactionSave).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          memberId: "member-alex",
          categoryId: "category-groceries",
          type: "expense",
          amount: 1_250,
          description: "Weekly groceries",
          recurring: true,
          currency: "PHP",
        }),
      ),
    );
    expect(
      screen.queryByRole("dialog", { name: "Add Transaction" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "Weekly groceries" }),
    ).toBeInTheDocument();
  });

  it("saves an in-flight transaction only once", async () => {
    const user = userEvent.setup();
    let resolveSave: (() => void) | undefined;
    const dataRepositories = repositoriesWith({
      members: [alex],
      categories: [groceries],
    });
    const transactionSave = vi.fn(
      () => new Promise<void>((resolve) => (resolveSave = resolve)),
    );
    dataRepositories.transactions.save = transactionSave;

    render(
      <DataProvider createRepositories={() => dataRepositories}>
        <TransactionsPage />
      </DataProvider>,
    );

    await user.click(
      await screen.findByRole("button", { name: "+ Add Transaction" }),
    );
    await completeExpenseForm(user);
    const form = (
      screen.getByRole("button", {
        name: "Save transaction",
      }) as HTMLButtonElement
    ).form as HTMLFormElement;

    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(transactionSave).toHaveBeenCalledTimes(1));
    resolveSave?.();
  });

  it("moves focus into the dialog, traps it, and restores it on close", async () => {
    const user = userEvent.setup();
    renderTransactions({ members: [alex], categories: [groceries] });

    const trigger = await screen.findByRole("button", {
      name: "+ Add Transaction",
    });
    await user.click(trigger);

    expect(screen.getByLabelText("Date")).toHaveFocus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(
      screen.getByRole("button", { name: "Save transaction" }),
    ).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(trigger).toHaveFocus();
  });
});

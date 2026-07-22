import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { TransactionSpreadsheet } from "@/components/transaction-spreadsheet";
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

const sam: Member = {
  id: "member-sam",
  name: "Sam",
  color: "#b45309",
};

const groceries: Category = {
  id: "category-groceries",
  type: "expense",
  group: "Groceries",
  name: "Food",
};

const salary: Category = {
  id: "category-salary",
  type: "income",
  group: "Income",
  name: "Salary",
};

const housing: Category = {
  id: "category-housing",
  type: "expense",
  group: "Housing",
  name: "Rent",
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

const julySalary: Transaction = {
  id: "transaction-salary-july",
  date: "2026-07-15",
  memberId: "member-alex",
  categoryId: "category-salary",
  type: "income",
  amount: 500_000,
  description: "July salary",
  recurring: true,
  currency: "PHP",
};

const julyGroceries: Transaction = {
  ...groceryTransaction,
  id: "transaction-grocery-july",
  amount: 125_000,
};

const juneGroceries: Transaction = {
  ...groceryTransaction,
  id: "transaction-grocery-june",
  date: "2026-06-20",
  amount: 2_500,
};

const augustRent: Transaction = {
  id: "transaction-rent-august",
  date: "2026-08-01",
  memberId: "member-sam",
  categoryId: "category-housing",
  type: "expense",
  amount: 25_000,
  description: "August rent",
  recurring: true,
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

  return {
    transactionDelete: dataRepositories.transactions.delete,
    transactionSave: dataRepositories.transactions.save,
  };
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
  it("exposes edit and delete actions for spreadsheet transactions", () => {
    render(
      <TransactionSpreadsheet
        bucketName={() => "Groceries"}
        memberName={() => "Alex"}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        transactions={[groceryTransaction]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Edit Weekly groceries" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete Weekly groceries" }),
    ).toBeInTheDocument();
  });

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
    expect(
      screen.getByRole("button", { name: "Edit Weekly groceries" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete Weekly groceries" }),
    ).toBeInTheDocument();
  });

  it("edits a transaction using the prefilled transaction dialog", async () => {
    const user = userEvent.setup();
    const { transactionSave } = renderTransactions({
      members: [alex],
      categories: [groceries],
      transactions: [groceryTransaction],
    });

    await user.click(
      await screen.findByRole("button", { name: "Edit Weekly groceries" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Edit Transaction" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveValue("2026-07-22");
    expect(screen.getByLabelText("Member")).toHaveValue("member-alex");
    expect(screen.getByLabelText("Amount")).toHaveValue("12.50");

    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "24.75");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(transactionSave).toHaveBeenCalledWith(
        expect.objectContaining({ id: "transaction-grocery", amount: 2_475 }),
      ),
    );
    expect(screen.getByRole("cell", { name: "₱24.75" })).toBeInTheDocument();
  });

  it("requires confirmation before deleting a transaction", async () => {
    const user = userEvent.setup();
    const { transactionDelete } = renderTransactions({
      members: [alex],
      categories: [groceries],
      transactions: [groceryTransaction],
    });

    const deleteButton = await screen.findByRole("button", {
      name: "Delete Weekly groceries",
    });
    await user.click(deleteButton);
    expect(
      screen.getByRole("dialog", { name: "Delete transaction?" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(transactionDelete).not.toHaveBeenCalled();
    expect(
      screen.getByRole("cell", { name: "Weekly groceries" }),
    ).toBeInTheDocument();

    await user.click(deleteButton);
    await user.click(
      screen.getByRole("button", { name: "Delete transaction" }),
    );

    await waitFor(() =>
      expect(transactionDelete).toHaveBeenCalledWith("transaction-grocery"),
    );
    expect(
      screen.queryByRole("cell", { name: "Weekly groceries" }),
    ).not.toBeInTheDocument();
  });

  it("moves focus into the delete confirmation and traps it", async () => {
    const user = userEvent.setup();
    renderTransactions({
      members: [alex],
      categories: [groceries],
      transactions: [groceryTransaction],
    });

    await user.click(
      await screen.findByRole("button", { name: "Delete Weekly groceries" }),
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(
      screen.getByRole("button", { name: "Delete transaction" }),
    ).toHaveFocus();
  });

  it("keeps the delete confirmation open when deletion fails", async () => {
    const user = userEvent.setup();
    const dataRepositories = repositoriesWith({
      members: [alex],
      categories: [groceries],
      transactions: [groceryTransaction],
    });
    dataRepositories.transactions.delete = vi
      .fn()
      .mockRejectedValue(new Error("IndexedDB unavailable"));

    render(
      <DataProvider createRepositories={() => dataRepositories}>
        <TransactionsPage />
      </DataProvider>,
    );

    await user.click(
      await screen.findByRole("button", { name: "Delete Weekly groceries" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Delete transaction" }),
    );

    expect(
      await screen.findByText(
        "Unable to delete this transaction. Please try again.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Delete transaction?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "Weekly groceries" }),
    ).toBeInTheDocument();
  });

  it("searches transactions and applies member, type, bucket, and date filters", async () => {
    const user = userEvent.setup();
    renderTransactions({
      members: [alex, sam],
      categories: [groceries, salary, housing],
      transactions: [groceryTransaction, julySalary, augustRent],
    });

    await screen.findByText("3 transactions");

    await user.type(screen.getByLabelText("Search transactions"), "salary");
    expect(screen.getByText("July salary")).toBeInTheDocument();
    expect(screen.queryByText("Weekly groceries")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search transactions"));
    await user.selectOptions(
      screen.getByLabelText("Filter by member"),
      "member-sam",
    );
    expect(screen.getByText("August rent")).toBeInTheDocument();
    expect(screen.queryByText("July salary")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Filter by member"), "");
    await user.selectOptions(
      screen.getByLabelText("Transaction type"),
      "income",
    );
    expect(screen.getByText("July salary")).toBeInTheDocument();
    expect(screen.queryByText("August rent")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Transaction type"), "all");
    await user.selectOptions(
      screen.getByLabelText("Filter by bucket"),
      "Housing",
    );
    expect(screen.getByText("August rent")).toBeInTheDocument();
    expect(screen.queryByText("Weekly groceries")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Filter by bucket"), "");
    await user.type(screen.getByLabelText("From date"), "2026-08-01");
    expect(screen.getByText("August rent")).toBeInTheDocument();
    expect(screen.queryByText("July salary")).not.toBeInTheDocument();
  });

  it("combines filters and shows the empty search state when nothing matches", async () => {
    const user = userEvent.setup();
    renderTransactions({
      members: [alex, sam],
      categories: [groceries, salary, housing],
      transactions: [groceryTransaction, julySalary, augustRent],
    });

    await screen.findByText("3 transactions");
    await user.selectOptions(
      screen.getByLabelText("Filter by member"),
      "member-alex",
    );
    await user.selectOptions(
      screen.getByLabelText("Transaction type"),
      "expense",
    );
    await user.selectOptions(
      screen.getByLabelText("Filter by bucket"),
      "Groceries",
    );
    await user.type(screen.getByLabelText("From date"), "2026-07-01");
    await user.type(screen.getByLabelText("To date"), "2026-07-31");

    expect(screen.getByText("Weekly groceries")).toBeInTheDocument();
    expect(screen.getByText("1 transaction")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search transactions"), "coffee");
    expect(screen.getByText("0 transactions")).toBeInTheDocument();
    expect(
      screen.getByText("No transactions match your filters."),
    ).toBeInTheDocument();
  });

  it("groups spreadsheet transactions by month and displays monthly totals", async () => {
    const user = userEvent.setup();
    renderTransactions({
      members: [alex],
      categories: [groceries, salary],
      transactions: [juneGroceries, julySalary, julyGroceries],
    });

    await user.click(
      await screen.findByRole("button", { name: "Spreadsheet" }),
    );

    expect(
      screen.getByRole("rowheader", { name: "July 2026" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: "June 2026" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("cell", { name: "₱5,000.00" })).toHaveLength(2);
    expect(screen.getAllByRole("cell", { name: "₱1,250.00" })).toHaveLength(2);
    expect(
      screen.getByRole("rowheader", {
        name: "Monthly total · Net ₱3,750.00",
      }),
    ).toBeInTheDocument();
  });

  it("switches between the list and responsive read-only spreadsheet views", async () => {
    const user = userEvent.setup();
    renderTransactions({
      members: [alex],
      categories: [groceries],
      transactions: [groceryTransaction],
    });

    const spreadsheetButton = await screen.findByRole("button", {
      name: "Spreadsheet",
    });
    await user.click(spreadsheetButton);

    expect(spreadsheetButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByTestId("transaction-spreadsheet-scroll")).toHaveClass(
      "overflow-x-auto",
    );
    expect(
      screen.getByRole("columnheader", { name: "Income" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "List" }));
    expect(
      screen.getByRole("columnheader", { name: "Amount" }),
    ).toBeInTheDocument();
  });

  it("enters a visible spreadsheet cell with Enter or double click", async () => {
    const user = userEvent.setup();
    renderTransactions({
      members: [alex],
      categories: [groceries],
      transactions: [groceryTransaction],
    });

    await user.click(
      await screen.findByRole("button", { name: "Spreadsheet" }),
    );

    const description = screen.getByRole("button", {
      name: "Description: Weekly groceries",
    });
    description.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
      "Weekly groceries",
    );

    await user.dblClick(
      screen.getByRole("button", { name: "Date: 2026-07-22" }),
    );
    expect(screen.getByLabelText("Date")).toHaveValue("2026-07-22");
  });

  it("saves inline amount edits and moves down to the same column", async () => {
    const user = userEvent.setup();
    const { transactionSave } = renderTransactions({
      members: [alex],
      categories: [groceries],
      transactions: [groceryTransaction, juneGroceries],
    });

    await user.click(
      await screen.findByRole("button", { name: "Spreadsheet" }),
    );
    await user.dblClick(
      screen.getAllByRole("button", { name: "Expense: ₱12.50" })[0],
    );
    await user.clear(screen.getByRole("textbox", { name: "Expense" }));
    await user.type(screen.getByRole("textbox", { name: "Expense" }), "24.75");
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(transactionSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: groceryTransaction.id,
          amount: 2_475,
        }),
      ),
    );
    expect(
      screen.getByRole("button", { name: "Expense: ₱24.75" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Expense: ₱25.00" }),
    ).toHaveFocus();
  });

  it("cancels inline edits and keeps the original value", async () => {
    const user = userEvent.setup();
    const { transactionSave } = renderTransactions({
      members: [alex],
      categories: [groceries],
      transactions: [groceryTransaction],
    });

    await user.click(
      await screen.findByRole("button", { name: "Spreadsheet" }),
    );
    const description = screen.getByRole("button", {
      name: "Description: Weekly groceries",
    });
    await user.dblClick(description);
    await user.clear(screen.getByRole("textbox", { name: "Description" }));
    await user.type(
      screen.getByRole("textbox", { name: "Description" }),
      "Market run",
    );
    await user.keyboard("{Escape}");

    const restoredDescription = screen.getByRole("button", {
      name: "Description: Weekly groceries",
    });
    expect(transactionSave).not.toHaveBeenCalled();
    expect(restoredDescription).toHaveFocus();
    expect(restoredDescription).toHaveTextContent("Weekly groceries");
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

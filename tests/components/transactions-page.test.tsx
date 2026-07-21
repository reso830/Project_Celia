import { render, screen, within } from "@testing-library/react";
import { TransactionsPage } from "@/components/transactions-page";

describe("TransactionsPage", () => {
  it("renders the static transactions controls and empty table", () => {
    render(<TransactionsPage />);

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
    expect(screen.getByText("0 transactions")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Date" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Recurring" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No transactions match your filters."),
    ).toBeInTheDocument();
  });
});

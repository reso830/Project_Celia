import { render, screen } from "@testing-library/react";
import { AppHeader } from "@/components/app-header";

describe("AppHeader", () => {
  it("shows the Add Transaction button only on the Transactions page", () => {
    const view = render(<AppHeader activePage="dashboard" />);

    expect(
      screen.queryByRole("button", { name: "+ Add Transaction" }),
    ).not.toBeInTheDocument();

    view.rerender(<AppHeader activePage="transactions" />);

    expect(
      screen.getByRole("button", { name: "+ Add Transaction" }),
    ).toBeInTheDocument();
  });
});

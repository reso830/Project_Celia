import { render, screen } from "@testing-library/react";
import { DashboardEmptyState } from "@/components/dashboard-empty-state";

describe("DashboardEmptyState", () => {
  it("renders the Celia dashboard empty state", () => {
    render(<DashboardEmptyState />);

    expect(screen.getByRole("heading", { name: "Celia" })).toBeInTheDocument();
    expect(screen.getByText("No expenses yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });
});

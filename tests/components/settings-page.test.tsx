import { render, screen } from "@testing-library/react";
import { SettingsPage } from "@/components/settings-page";

describe("SettingsPage", () => {
  it("renders the buckets and household empty states", () => {
    render(<SettingsPage />);

    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Buckets" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No buckets yet.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Household" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Household Members" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No household members yet.")).toBeInTheDocument();
  });
});

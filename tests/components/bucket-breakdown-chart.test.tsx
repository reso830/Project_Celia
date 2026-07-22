import { render, screen } from "@testing-library/react";
import { BucketBreakdownChart } from "@/components/bucket-breakdown-chart";

describe("BucketBreakdownChart", () => {
  it("renders bucket totals, percentages, and configured expense colors", () => {
    render(
      <BucketBreakdownChart
        breakdown={[
          { bucket: "Housing", amount: 75_000 },
          { bucket: "Food", amount: 25_000 },
        ]}
        bucketColors={[{ bucket: "expense:housing", color: "#2463eb" }]}
      />,
    );

    expect(
      screen.getByRole("img", { name: "Expense breakdown" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Housing")).toBeInTheDocument();
    expect(screen.getByText("₱750.00 · 75%")).toBeInTheDocument();
    expect(screen.getByTestId("bucket-slice-Housing")).toHaveAttribute(
      "stroke",
      "#2463eb",
    );
    expect(screen.getByTestId("bucket-slice-Food")).toHaveAttribute(
      "stroke",
      "#8a93a3",
    );
  });

  it("renders an empty state without a chart when no expense totals exist", () => {
    render(<BucketBreakdownChart breakdown={[]} bucketColors={[]} />);

    expect(screen.getByText("No expense transactions yet.")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Expense breakdown" }),
    ).not.toBeInTheDocument();
  });
});


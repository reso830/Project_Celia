import { render, screen } from "@testing-library/react";
import { BucketGroupGrid } from "@/components/bucket-group-grid";

describe("BucketGroupGrid", () => {
  it("groups normalized categories by type and displays every subcategory", () => {
    render(
      <BucketGroupGrid
        bucketColors={[{ bucket: "housing", color: "#2463eb" }]}
        categories={[
          { id: "rent", type: "expense", group: " Housing ", name: "Rent" },
          { id: "power", type: "expense", group: "housing", name: "Power" },
          { id: "salary", type: "income", group: "Housing", name: "Salary" },
        ]}
        emptyMessage="No bucket groups yet."
      />,
    );

    expect(screen.getAllByRole("heading", { name: "Housing" })).toHaveLength(2);
    expect(
      screen.getByRole("article", { name: "Expense Housing" }),
    ).toHaveTextContent("Rent");
    expect(
      screen.getByRole("article", { name: "Expense Housing" }),
    ).toHaveTextContent("Power");
    expect(
      screen.getByRole("article", { name: "Income Housing" }),
    ).toHaveTextContent("Salary");
    expect(screen.getAllByText("Color: #2463eb")).toHaveLength(2);
  });

  it("renders the supplied empty message without category records", () => {
    render(
      <BucketGroupGrid
        bucketColors={[]}
        categories={[]}
        emptyMessage="No buckets yet."
      />,
    );

    expect(screen.getByText("No buckets yet.")).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
});

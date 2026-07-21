import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { BucketGroupGrid } from "@/components/bucket-group-grid";

describe("BucketGroupGrid", () => {
  it("groups normalized categories by type and displays every subcategory", () => {
    render(
      <BucketGroupGrid
        bucketColors={[{ bucket: "housing", color: "#2463eb" }]}
        bucketGroups={[
          { id: "expense-housing", type: "expense", name: "Housing" },
          { id: "income-housing", type: "income", name: "Housing" },
        ]}
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
        bucketGroups={[]}
        categories={[]}
        emptyMessage="No buckets yet."
      />,
    );

    expect(screen.getByText("No buckets yet.")).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("renders a persisted group without subcategories", () => {
    render(
      <BucketGroupGrid
        bucketColors={[]}
        bucketGroups={[
          { id: "expense-housing", type: "expense", name: "Housing" },
        ]}
        categories={[]}
        emptyMessage="No buckets yet."
      />,
    );

    expect(
      screen.getByRole("article", { name: "Expense Housing" }),
    ).toHaveTextContent("No subcategories yet.");
  });

  it("calls the delete callback for a selected subcategory", async () => {
    const user = userEvent.setup();
    const onDeleteSubcategory = vi.fn().mockResolvedValue(undefined);
    render(
      <BucketGroupGrid
        bucketColors={[]}
        bucketGroups={[
          { id: "expense-housing", type: "expense", name: "Housing" },
        ]}
        categories={[
          { id: "rent", type: "expense", group: "Housing", name: "Rent" },
        ]}
        emptyMessage="No buckets yet."
        onDeleteSubcategory={onDeleteSubcategory}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete Rent" }));

    expect(onDeleteSubcategory).toHaveBeenCalledWith({
      id: "rent",
      type: "expense",
      group: "Housing",
      name: "Rent",
    });
  });

  it("prevents another subcategory add while the first is pending", () => {
    let resolveAdd: (() => void) | undefined;
    const onAddSubcategory = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveAdd = () => resolve(true);
        }),
    );
    render(
      <BucketGroupGrid
        bucketColors={[]}
        bucketGroups={[
          { id: "expense-housing", type: "expense", name: "Housing" },
        ]}
        categories={[]}
        emptyMessage="No buckets yet."
        onAddSubcategory={onAddSubcategory}
      />,
    );

    fireEvent.change(screen.getByLabelText("Add subcategory to Housing"), {
      target: { value: "Power" },
    });
    const addButton = screen.getByRole("button", { name: "Add subcategory" });
    fireEvent.click(addButton);
    fireEvent.click(addButton);

    expect(onAddSubcategory).toHaveBeenCalledTimes(1);
    expect(addButton).toBeDisabled();

    resolveAdd?.();
  });
});

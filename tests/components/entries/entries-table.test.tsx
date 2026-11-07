import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EntriesTable from "@/components/entries/entries-table";
import type { EntryWithDetails } from "@/domain/entry";

const entries: EntryWithDetails[] = [
  {
    id: "entry-c",
    itemId: "item-1",
    ownerMemberId: null,
    amount: 1200,
    date: "2026-11-04",
    note: null,
    createdAt: "2026-11-04T00:00:00.000Z",
    updatedAt: "2026-11-04T00:00:00.000Z",
    type: "expense",
    itemName: "Market",
    categoryId: "category-1",
    categoryName: "Food",
    categoryColor: "#7d8ba8" as never,
    categoryArchived: false,
    ownerName: "Household",
    isHousehold: true,
    ownerArchived: false,
  },
  {
    id: "entry-a",
    itemId: "item-2",
    ownerMemberId: "ana",
    amount: 5000,
    date: "2026-11-05",
    note: null,
    createdAt: "2026-11-05T00:00:00.000Z",
    updatedAt: "2026-11-05T00:00:00.000Z",
    type: "income",
    itemName: "Salary",
    categoryId: "category-2",
    categoryName: "Work",
    categoryColor: "#7d8ba8" as never,
    categoryArchived: false,
    ownerName: "Ana",
    isHousehold: false,
    ownerArchived: false,
  },
  {
    id: "entry-b",
    itemId: "item-3",
    ownerMemberId: "ben",
    amount: 5000,
    date: "2026-11-05",
    note: null,
    createdAt: "2026-11-06T00:00:00.000Z",
    updatedAt: "2026-11-06T00:00:00.000Z",
    type: "expense",
    itemName: "Coffee",
    categoryId: "category-1",
    categoryName: "Food",
    categoryColor: "#7d8ba8" as never,
    categoryArchived: true,
    ownerName: "Ben",
    isHousehold: false,
    ownerArchived: true,
  },
  {
    id: "entry-d",
    itemId: "item-4",
    ownerMemberId: "ana",
    amount: 5000,
    date: "2026-11-05",
    note: null,
    createdAt: "2026-11-06T00:00:00.000Z",
    updatedAt: "2026-11-06T00:00:00.000Z",
    type: "expense",
    itemName: "Dining",
    categoryId: "category-1",
    categoryName: "Food",
    categoryColor: "#7d8ba8" as never,
    categoryArchived: false,
    ownerName: "Ana",
    isHousehold: false,
    ownerArchived: false,
  },
];

function renderedItems() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.getAttribute("data-entry-id"));
}

describe("EntriesTable", () => {
  it("renders semantic columns and the deterministic newest-first default", () => {
    render(<EntriesTable entries={entries} ownerId="all" onDelete={vi.fn()} />);

    expect(screen.getByRole("table", { name: "Entries" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sort by date" }),
    ).toHaveTextContent("DATE ▼");
    expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    expect(screen.getByText("Food (archived)")).toBeInTheDocument();
    expect(screen.getByText("Ben (archived)")).toBeInTheDocument();
    expect(screen.getByText("Nov 04")).toBeInTheDocument();
    expect(screen.getByText("+50")).toHaveClass("text-celia-status-green");
    expect(screen.getByText("−12")).toHaveClass("text-celia-ink");
    expect(renderedItems()).toEqual([
      "entry-b",
      "entry-d",
      "entry-a",
      "entry-c",
    ]);
  });

  it("sorts by date and amount through the deterministic domain ordering", async () => {
    const user = userEvent.setup();
    render(<EntriesTable entries={entries} ownerId="all" onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Sort by date" }));
    expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    expect(renderedItems()).toEqual([
      "entry-c",
      "entry-b",
      "entry-d",
      "entry-a",
    ]);

    await user.click(screen.getByRole("button", { name: "Sort by amount" }));
    expect(screen.getAllByRole("columnheader")[0]).not.toHaveAttribute(
      "aria-sort",
    );
    expect(screen.getAllByRole("columnheader")[4]).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    expect(renderedItems()).toEqual([
      "entry-b",
      "entry-d",
      "entry-a",
      "entry-c",
    ]);

    await user.click(screen.getByRole("button", { name: "Sort by amount" }));
    expect(renderedItems()).toEqual([
      "entry-c",
      "entry-b",
      "entry-d",
      "entry-a",
    ]);
  });

  it("marks Household rows in a member-filtered view and raises row actions", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <EntriesTable
        entries={entries}
        ownerId="ana"
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText("Shared")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit entry Market" }));
    await user.click(
      screen.getByRole("button", { name: "Delete entry Market" }),
    );

    expect(onEdit).toHaveBeenCalledWith(entries[0]);
    expect(onDelete).toHaveBeenCalledWith(entries[0], "entry-a");
  });
});

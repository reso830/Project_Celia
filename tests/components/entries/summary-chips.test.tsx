import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SummaryChips from "@/components/entries/summary-chips";
import type { EntryWithDetails } from "@/domain/entry";

const entries: EntryWithDetails[] = [
  {
    id: "shared-expense",
    itemId: "item-1",
    ownerMemberId: null,
    amount: 126,
    date: "2026-11-01",
    note: null,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
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
    id: "ana-income",
    itemId: "item-2",
    ownerMemberId: "ana",
    amount: 2550,
    date: "2026-11-02",
    note: null,
    createdAt: "2026-11-02T00:00:00.000Z",
    updatedAt: "2026-11-02T00:00:00.000Z",
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
    id: "ana-expense",
    itemId: "item-3",
    ownerMemberId: "ana",
    amount: 75,
    date: "2026-11-03",
    note: null,
    createdAt: "2026-11-03T00:00:00.000Z",
    updatedAt: "2026-11-03T00:00:00.000Z",
    type: "expense",
    itemName: "Coffee",
    categoryId: "category-1",
    categoryName: "Food",
    categoryColor: "#7d8ba8" as never,
    categoryArchived: false,
    ownerName: "Ana",
    isHousehold: false,
    ownerArchived: false,
  },
];

describe("SummaryChips", () => {
  it("shows exact household totals and a signed net", () => {
    render(<SummaryChips entries={entries} ownerId="all" />);

    const summaries = screen.getByRole("group", { name: "Entry summaries" });
    expect(summaries).toHaveClass("gap-[var(--space-2-5)]");
    expect(summaries).toHaveTextContent("Entries 3");
    expect(summaries).toHaveTextContent("Expense ₱2.01");
    expect(screen.getByText("₱2.01")).toHaveClass(
      "font-celia-figure",
      "font-bold",
    );
    expect(summaries).toHaveTextContent("Income ₱25.50");
    expect(summaries).toHaveTextContent("Net +₱23.49");
    expect(screen.queryByLabelText("Entries 3")).not.toBeInTheDocument();
  });

  it("shows own and shared centavo totals for a member", () => {
    render(<SummaryChips entries={entries} ownerId="ana" />);

    const summaries = screen.getByRole("group", { name: "Entry summaries" });
    expect(summaries).toHaveTextContent("Expense ₱2.01");
    expect(screen.getByText("₱0.75 own · ₱1.26 shared")).toBeInTheDocument();
    expect(summaries).toHaveTextContent("Income ₱25.50");
    expect(screen.getByText("₱25.50 own · ₱0 shared")).toBeInTheDocument();
    expect(summaries).toHaveTextContent("Net +₱23.49");
    expect(screen.getByText("+₱24.75 own · −₱1.26 shared")).toBeInTheDocument();
  });

  it("formats the empty view without rounding", () => {
    render(<SummaryChips entries={[]} ownerId="all" />);

    const summaries = screen.getByRole("group", { name: "Entry summaries" });
    expect(summaries).toHaveTextContent("Entries 0");
    expect(summaries).toHaveTextContent("Expense ₱0");
    expect(summaries).toHaveTextContent("Income ₱0");
    expect(summaries).toHaveTextContent("Net +₱0");
  });
});

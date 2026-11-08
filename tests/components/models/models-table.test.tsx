import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ModelsTable from "@/components/models/models-table";
import {
  calculateBudgetComparisonRows,
  calculateBudgetSummary,
} from "@/domain/budget-calculations";
import { parseHexColor } from "@/domain/color";
const cat = (id: string) => ({
  id,
  name: id,
  umbrella: "expense" as const,
  color: parseHexColor("#7f9b6e"),
  archived: false,
  merged: false,
  mergedIntoCategoryId: null,
  actualCentavos: 0,
});
const rows = calculateBudgetComparisonRows({
  categories: [
    { ...cat("Dining"), merged: true, mergedIntoCategoryId: "Groceries" },
    { ...cat("Groceries"), actualCentavos: 2200000 },
  ],
  buckets: [
    { id: "car", name: "Car", archived: false, actualCentavos: 500000 },
  ],
  plannedByCategory: { Dining: 500000, Groceries: 2000000 },
  plannedByBucket: { car: 1000000 },
  foldMergedCategories: true,
});
const summary = calculateBudgetSummary({
  incomeAllocations: [10000000],
  expenseAllocations: [2500000],
  savingsAllocations: [1000000],
  actualIncomeCentavos: 10000000,
  actualExpensesCentavos: 2200000,
  actualSavingsCentavos: 500000,
});
const props = {
  rows,
  summary,
  planMode: true,
  drafts: {},
  errors: {},
  pending: false,
  locked: false,
  onDraft: vi.fn(),
  onCommit: vi.fn(),
  onRevert: vi.fn(),
};
afterEach(() => cleanup());
describe("Model allocation table", () => {
  it("keeps raw inputs distinct from effective budgets and neutral merged references", () => {
    render(<ModelsTable {...props} />);
    expect(
      screen.getByRole("textbox", { name: "Groceries budget per month" }),
    ).toHaveValue("20,000");
    expect(screen.getByText(/effective/)).toHaveTextContent(
      "\u20b125,000 effective (+\u20b15,000 from Dining)",
    );
    expect(screen.getByText(/Dining \(merged/)).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Dining budget per month" }),
    ).toBeDisabled();
    expect(screen.getAllByText("+\u20b13,000").at(-1)!).toHaveClass(
      "text-celia-status-green",
    );
    expect(screen.getAllByText("\u2212\u20b15,000").at(-1)!).toHaveClass(
      "text-[color:var(--savings-warning-ink)]",
    );
  });
  it("collapses groups while retaining totals and shows footer planned/actual/delta", () => {
    render(<ModelsTable {...props} />);
    const group = screen.getByRole("button", { name: "Toggle Expenses" });
    fireEvent.click(group);
    expect(
      screen.queryByRole("textbox", { name: "Groceries budget per month" }),
    ).not.toBeInTheDocument();
    expect(group).toHaveTextContent("\u20b125,000");
    expect(screen.getByLabelText("Unallocated planned")).toHaveTextContent(
      "+\u20b165,000",
    );
    expect(screen.getByLabelText("Unallocated actual")).toHaveTextContent(
      "+\u20b173,000",
    );
    expect(screen.getByLabelText("Unallocated delta")).toHaveTextContent(
      "+\u20b18,000",
    );
  });
  it("shows an undefined utilization dash when both planned and actual are zero", () => {
    const zero = rows
      .filter((r) => r.targetId === "Groceries")
      .map((r) => ({
        ...r,
        plannedCentavos: 0,
        rawPlannedCentavos: 0,
        actualCentavos: 0,
        deltaCentavos: 0,
        remainingCentavos: 0,
        utilizationPercent: null,
        mergedSources: [],
      }));
    render(<ModelsTable {...props} rows={zero} />);
    expect(screen.queryByText("0% used")).not.toBeInTheDocument();
    expect(screen.getByText("\u2014")).toBeInTheDocument();
    expect(screen.queryByText(/remaining/)).not.toBeInTheDocument();
  });
  it("renders expense utilization and balance as a single subtitle", () => {
    render(<ModelsTable {...props} />);
    const text = screen.getByText(/88% used/);
    expect(text).toHaveTextContent("88% used \u00b7 \u20b13,000 remaining");
    expect(text.querySelector("br")).toBeNull();
    expect(text).toHaveClass("whitespace-nowrap");
    expect(
      screen.getByRole("textbox", { name: "Groceries budget per month" }),
    ).toHaveClass("font-celia-figure");
  });
  it("restricts archived rows to zero-out and respects past-plan lock", () => {
    const archived = rows.map((r) =>
      r.targetId === "Groceries" ? { ...r, archived: true } : r,
    );
    const { rerender } = render(<ModelsTable {...props} rows={archived} />);
    expect(
      screen.getByRole("textbox", { name: "Groceries budget per month" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Zero out Groceries" }),
    ).toBeEnabled();
    rerender(<ModelsTable {...props} rows={archived} locked />);
    expect(
      screen.getByRole("button", { name: "Zero out Groceries" }),
    ).toBeDisabled();
  });
});

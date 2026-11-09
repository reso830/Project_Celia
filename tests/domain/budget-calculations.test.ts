// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseHexColor } from "@/domain/color";
import {
  hasTemplateDivergedFromPlan,
  type BudgetModel,
  type MonthlyBudgetPlan,
  type BudgetAllocationLine,
} from "@/domain/budget";
import {
  calculateBudgetSummary,
  calculateBudgetComparisonRows,
  calculateExpenseMixStops,
  calculateDivergingBars,
  resolveMergedCategoryTarget,
  type ComparisonCategory,
} from "@/domain/budget-calculations";
const category = (
  id: string,
  mergedIntoCategoryId: string | null = null,
): ComparisonCategory => ({
  id,
  name: id,
  color: parseHexColor("#7d8ba8"),
  umbrella: "expense",
  archived: false,
  merged: mergedIntoCategoryId !== null,
  mergedIntoCategoryId,
  actualCentavos: 0,
});
const summary = (income: number[], expense: number[], savings: number[]) =>
  calculateBudgetSummary({
    incomeAllocations: income,
    expenseAllocations: expense,
    savingsAllocations: savings,
    actualIncomeCentavos: 10000,
    actualExpensesCentavos: 3000,
    actualSavingsCentavos: 2000,
  });
describe("budgets", () => {
  it("summarizes exact planned and actual amounts and zero denominators", () => {
    expect(summary([10000], [3000], [2000])).toMatchObject({
      unallocatedCentavos: 5000,
      actualUnallocatedCentavos: 5000,
      unallocatedDeltaCentavos: 0,
      isFullyAllocated: false,
    });
    expect(summary([10000], [8000], [2000]).isFullyAllocated).toBe(true);
    const over = summary([10000], [9000], [2000]);
    expect(over.isOverallocated).toBe(true);
    expect(
      over.segments.reduce((sum, s) => sum + s.widthPercent, 0),
    ).toBeCloseTo(100);
    expect(summary([], [], []).segments).toEqual([]);
    expect(summary([], [100], []).isOverallocated).toBe(true);
  });
  it("compares favourable-positive deltas with amber savings shortfalls", () => {
    const rows = calculateBudgetComparisonRows({
      categories: [
        { ...category("food"), actualCentavos: 790000 },
        { ...category("pay"), umbrella: "income", actualCentavos: 11000000 },
      ],
      buckets: [
        { id: "car", name: "Car", archived: false, actualCentavos: 500000 },
      ],
      plannedByCategory: { food: 500000, pay: 11000000 },
      plannedByBucket: { car: 1000000 },
    });
    expect(rows[0]).toMatchObject({
      deltaCentavos: -290000,
      tone: "red",
      utilizationPercent: 158,
      overspentCentavos: 290000,
    });
    expect(rows[1]).toMatchObject({ deltaCentavos: 0, tone: "muted" });
    expect(rows[2]).toMatchObject({
      deltaCentavos: -500000,
      tone: "amber",
      remainingCentavos: 500000,
    });
    const zero = calculateBudgetComparisonRows({
      categories: [{ ...category("x"), actualCentavos: 1 }],
      buckets: [],
      plannedByCategory: {},
      plannedByBucket: {},
    })[0];
    expect(zero).toMatchObject({
      isOverspentZeroBudget: true,
      utilizationPercent: null,
      deltaCentavos: -1,
    });
  });
  it("folds chained merges without double counting or mutating raw amounts", () => {
    const categories = [
      category("Dining", "Food"),
      category("Food", "Groceries"),
      { ...category("Groceries"), actualCentavos: 2200000 },
    ];
    const input = {
      categories,
      buckets: [],
      plannedByCategory: { Dining: 500000, Groceries: 2000000 },
      plannedByBucket: {},
      foldMergedCategories: true,
    };
    const rows = calculateBudgetComparisonRows(input);
    expect(rows[0]).toMatchObject({
      isFoldedIntoMergeTarget: true,
      plannedCentavos: 500000,
      rawPlannedCentavos: 500000,
      deltaCentavos: 0,
      remainingCentavos: 0,
      overspentCentavos: 0,
      utilizationPercent: null,
      isOverspentZeroBudget: false,
      tone: "muted",
    });
    expect(rows[2]).toMatchObject({
      rawPlannedCentavos: 2000000,
      plannedCentavos: 2500000,
      deltaCentavos: 300000,
      utilizationPercent: 88,
    });
    expect(
      rows
        .filter((r) => !r.isFoldedIntoMergeTarget)
        .reduce((sum, r) => sum + r.plannedCentavos, 0),
    ).toBe(2500000);
    expect(
      calculateBudgetComparisonRows({
        ...input,
        plannedByCategory: { ...input.plannedByCategory, Groceries: 2100000 },
      })[2].plannedCentavos,
    ).toBe(2600000);
    expect(input.plannedByCategory.Groceries).toBe(2000000);
    expect(calculateDivergingBars(rows)).toHaveLength(1);
    expect(() =>
      resolveMergedCategoryTarget(
        "a",
        new Map([
          ["a", category("a", "b")],
          ["b", category("b", "a")],
        ]),
      ),
    ).toThrow();
  });
  it("builds empty and populated donut stops and zero/positive/negative bars", () => {
    expect(calculateExpenseMixStops([])).toEqual([]);
    const rows = calculateBudgetComparisonRows({
      categories: [
        { ...category("Food"), actualCentavos: 25 },
        { ...category("Rent"), actualCentavos: 150 },
        category("Zero"),
      ],
      buckets: [],
      plannedByCategory: { Food: 100, Rent: 100 },
      plannedByBucket: {},
    });
    expect(
      calculateExpenseMixStops(rows).map((s) => [s.startPercent, s.endPercent]),
    ).toEqual([
      [0, 50],
      [50, 100],
    ]);
    const bars = calculateDivergingBars(rows);
    expect(bars[0]).toMatchObject({ label: "Food", upBar: 60, downBar: 0 });
    expect(bars[1].downBar).toBe(40);
    expect(bars[2]).toMatchObject({ upBar: 0, downBar: 0 });
  });
  it.each([
    [12000, 2000, "green"],
    [8000, -2000, "red"],
  ] as const)(
    "compares income actual %s with plan",
    (actualCentavos, deltaCentavos, tone) => {
      const [row] = calculateBudgetComparisonRows({
        categories: [
          { ...category("pay"), umbrella: "income", actualCentavos },
        ],
        buckets: [],
        plannedByCategory: { pay: 10000 },
        plannedByBucket: {},
      });
      expect(row).toMatchObject({ deltaCentavos, tone });
    },
  );
  it.each([
    [4000, 1000, "green"],
    [6000, -1000, "red"],
  ] as const)(
    "compares unallocated planned %s with actual",
    (planned, delta, tone) => {
      // The shared summary fixture has actual unallocated of 5,000 centavos.
      expect(summary([10000], [10000 - planned], [])).toMatchObject({
        unallocatedCentavos: planned,
        actualUnallocatedCentavos: 5000,
        unallocatedDeltaCentavos: delta,
        unallocatedDeltaTone: tone,
      });
    },
  );
  it("marks expense underspending green and clamps tiny nonzero bars to 3px", () => {
    const rows = calculateBudgetComparisonRows({
      categories: [
        { ...category("large"), actualCentavos: 0 },
        { ...category("tiny surplus"), actualCentavos: 9999 },
        { ...category("tiny deficit"), actualCentavos: 10001 },
      ],
      buckets: [],
      plannedByCategory: {
        large: 10000,
        "tiny surplus": 10000,
        "tiny deficit": 10000,
      },
      plannedByBucket: {},
    });
    expect(rows[0]).toMatchObject({
      deltaCentavos: 10000,
      tone: "green",
      remainingCentavos: 10000,
    });
    const bars = calculateDivergingBars(rows);
    expect(bars[0]).toMatchObject({ upBar: 60, downBar: 0 });
    expect(bars[1]).toMatchObject({ upBar: 3, downBar: 0 });
    expect(bars[2]).toMatchObject({ upBar: 0, downBar: 3 });
  });
  it("compares active template allocations to the entire stored snapshot", () => {
    const line = (id: string, amount: number): BudgetAllocationLine => ({
      id,
      targetType: "category",
      categoryId: id,
      bucketId: null,
      amount,
      updatedAt: "",
    });
    const model = {
      allocations: [line("a", 10), line("b", 20)],
    } as BudgetModel;
    const plan = {
      allocations: [line("b", 20), line("a", 10)],
    } as MonthlyBudgetPlan;
    expect(hasTemplateDivergedFromPlan(model, plan, ["a", "b"], [])).toBe(
      false,
    );
    expect(hasTemplateDivergedFromPlan(model, plan, ["a"], [])).toBe(true);
    expect(
      hasTemplateDivergedFromPlan(
        { ...model, allocations: [line("a", 11), line("b", 20)] },
        plan,
        ["a", "b"],
        [],
      ),
    ).toBe(true);
  });
});

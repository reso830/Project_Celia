// @vitest-environment node
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  generateSparklineRatios,
  calculateBurnRateGauge,
  calculateBudgetTrend,
  calculateCategorySpendingRows,
  calculateMemberDistribution,
  calculateGoalHighlight,
  calculateUpcomingCommitments,
} from "@/domain/dashboard-calculations";
import {
  calculateBucketMetrics,
  calculateSavingsKpis,
} from "@/domain/savings-calculations";
import type { SavingsBucket, SavingsActivity } from "@/domain/savings";
import { parseHexColor } from "@/domain/color";
import type { Category } from "@/domain/category";

const category = (id: string, patch: Partial<Category> = {}): Category => ({
  id,
  name: id,
  color: parseHexColor("#123456"),
  umbrella: "expense",
  archivedAt: null,
  mergedIntoCategoryId: null,
  ...patch,
});
const bucket = (
  id: string,
  patch: Partial<SavingsBucket> = {},
): SavingsBucket => ({
  id,
  name: id,
  nameKey: id,
  type: "goal",
  openingBalance: 0,
  targetAmount: 10001,
  targetMonth: "2027-01",
  description: null,
  countsTowardBuffer: false,
  isDefault: false,
  archivedAt: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  ...patch,
});
const activity = (
  bucketId: string,
  amount: number,
  kind: SavingsActivity["kind"] = "contribution",
): SavingsActivity => ({
  id: `${bucketId}-${kind}`,
  bucketId,
  amount,
  kind,
  date: "2026-11-01",
  note: null,
  createdAt: "2026-11-01",
  updatedAt: "2026-11-01",
});

describe("dashboard sparkline ratios", () => {
  it.each([
    [[], []],
    [[50], [{ x: 0.5, y: 0.5 }]],
    [[0], [{ x: 0.5, y: 0 }]],
    [
      [0, 0],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
    ],
    [
      [20, 20],
      [
        { x: 0, y: 0.5 },
        { x: 1, y: 0.5 },
      ],
    ],
    [
      [0, 50, 100],
      [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 1 },
      ],
    ],
    [
      [100, 50, 0],
      [
        { x: 0, y: 1 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 0 },
      ],
    ],
  ])("maps %j to finite unit-square points", (values, expected) => {
    expect(generateSparklineRatios(values as number[])).toEqual(expected);
  });
});

describe("dashboard burn rate", () => {
  it.each([
    [0, 10000, true, false, 0, 0, "favourable", "under_pace"],
    [8499, 10000, true, false, 85, 8499 / 15000, "favourable", "under_pace"],
    [8500, 10000, true, false, 85, 85 / 150, "warning", "on_pace"],
    [11500, 10000, true, false, 115, 115 / 150, "warning", "on_pace"],
    [11501, 10000, true, false, 115, 11501 / 15000, "critical", "over_pace"],
    [20000, 10000, true, false, 200, 1, "critical", "over_pace"],
    [100, 0, false, false, null, 0, "neutral", "no_plan"],
    [0, 0, true, false, null, 0, "neutral", "zero_budget_zero_spend"],
    [100, 0, true, false, null, 1, "critical", "zero_budget_overspent"],
    [100, 0, false, true, null, 0, "neutral", "income_category"],
  ] as const)(
    "handles actual=%i budget=%i plan=%s income=%s",
    (actual, budget, plan, income, percent, arc, tone, state) => {
      const result = calculateBurnRateGauge(actual, budget, plan, income);
      expect(result).toEqual({
        utilizationPercent: percent,
        arcRatio: arc,
        statusTone: tone,
        state,
        hasMonthlyPlan: plan,
      });
    },
  );
  it("provides the sweep fractions for the start, midpoint and end of a 270 degree gauge", () => {
    expect(calculateBurnRateGauge(0, 100, true).arcRatio).toBe(0);
    expect(calculateBurnRateGauge(75, 100, true).arcRatio).toBe(0.5);
    expect(calculateBurnRateGauge(150, 100, true).arcRatio).toBe(1);
  });
});

describe("dashboard budget trend", () => {
  it("fills calendar gaps across the year and uses each month's own plan, including zero plans", () => {
    const result = calculateBudgetTrend(
      [
        { monthKey: "2025-12", actualExpensesCentavos: 15000 },
        { monthKey: "2026-01", actualExpensesCentavos: 5000 },
        { monthKey: "2026-02", actualExpensesCentavos: 1000 },
        { monthKey: "2026-03", actualExpensesCentavos: 12000 },
        { monthKey: "2026-04", actualExpensesCentavos: 99999 },
      ],
      new Map([
        ["2025-12", 10000],
        ["2026-02", 0],
        ["2026-03", 20000],
      ]),
      "2026-03",
      6,
    );
    expect(result.bars.map((b) => b.monthKey)).toEqual([
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
    expect(result.bars.map((b) => b.actualExpensesCentavos)).toEqual([
      0, 0, 15000, 5000, 1000, 12000,
    ]);
    expect(result.bars.map((b) => b.isOverspent)).toEqual([
      false,
      false,
      true,
      false,
      true,
      false,
    ]);
    expect(result.bars.map((b) => b.isUnbudgeted)).toEqual([
      true,
      true,
      false,
      true,
      false,
      false,
    ]);
    expect(result.bars.map((b) => b.isSelected)).toEqual([
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(result.bars[2].heightRatio).toBeCloseTo(15000 / 22400);
    expect(result.budgetLineRatio).toBeCloseTo(20000 / 22400);
  });
  it("returns twelve zero periods with finite ratios for empty data", () => {
    const result = calculateBudgetTrend([], new Map(), "2026-11", 12);
    expect(result.bars).toHaveLength(12);
    expect(result.bars[0].monthKey).toBe("2025-12");
    expect(result.bars.every((b) => b.heightRatio === 0)).toBe(true);
    expect(result.budgetLineRatio).toBe(0);
    expect(result.budgetCentavos).toBe(0);
  });
  it("does not invent an expense trend for income categories", () => {
    expect(calculateBudgetTrend([], new Map(), "2026-11", 6, true)).toEqual({
      isApplicable: false,
      bars: [],
      budgetLineRatio: 0,
      budgetCentavos: 0,
      range: 6,
    });
  });
});

describe("dashboard category comparisons", () => {
  it.each([
    [849, "favourable", "favourable"],
    [850, "favourable", "warning"],
    [900, "favourable", "warning"],
    [1000, "neutral", "warning"],
    [1100, "critical", "warning"],
    [1150, "critical", "warning"],
    [1151, "critical", "critical"],
  ] as const)(
    "separates variance and utilization at %i centavos spent",
    (spent, tone, progressTone) => {
      const result = calculateCategorySpendingRows(
        [category("food")],
        { food: spent },
        { food: 1000 },
      );
      expect(result.rows[0].statusTone).toBe(tone);
      expect(result.rows[0].progressTone).toBe(progressTone);
    },
  );
  it("folds transitive allocations without double-counting and keeps archived history and zero-budget overspend", () => {
    const categories = [
      category("a", { mergedIntoCategoryId: "b" }),
      category("b", { mergedIntoCategoryId: "c" }),
      category("c"),
      category("old", { archivedAt: "2026-01-01" }),
      category("unplanned"),
      category("empty"),
      category("salary", { umbrella: "income" }),
    ];
    const result = calculateCategorySpendingRows(
      categories,
      { c: 2501, old: 401, unplanned: 199, salary: 9999 },
      { a: 1000, b: 2000, c: 3000, old: 100 },
      categories,
    );
    expect(result.rows.map((r) => r.categoryId)).toEqual([
      "c",
      "old",
      "unplanned",
    ]);
    expect(result).toMatchObject({
      totalSpentCentavos: 3101,
      totalBudgetCentavos: 6100,
      totalDeltaCentavos: 2999,
    });
    expect(result.rows[0]).toMatchObject({
      spentCentavos: 2501,
      budgetCentavos: 6000,
      deltaCentavos: 3499,
      rolloverCentavos: 3499,
      color: parseHexColor("#123456"),
    });
    expect(result.rows[1]).toMatchObject({
      isArchived: true,
      isClickable: false,
      progressRatio: 1,
      deltaCentavos: -301,
      rolloverCentavos: null,
    });
    expect(result.rows[2]).toMatchObject({
      budgetCentavos: 0,
      statusTone: "critical",
      progressRatio: 1,
      deltaCentavos: -199,
      rolloverCentavos: null,
    });
  });
  it("handles at-budget and no-activity rows without division by zero", () => {
    const result = calculateCategorySpendingRows(
      [category("at"), category("unused")],
      { at: 123 },
      { at: 123, unused: 100 },
      [],
    );
    expect(result.rows[0]).toMatchObject({
      progressRatio: 1,
      deltaCentavos: 0,
      rolloverCentavos: null,
    });
    expect(result.rows[1]).toMatchObject({
      progressRatio: 0,
      deltaCentavos: 100,
      rolloverCentavos: 100,
    });
    expect(calculateCategorySpendingRows([], {}, {}, [])).toMatchObject({
      rows: [],
      totalSpentCentavos: 0,
    });
  });
  it("marks income category comparisons inapplicable", () => {
    expect(calculateCategorySpendingRows([], {}, {}, [], true)).toEqual({
      isApplicable: false,
      rows: [],
      totalSpentCentavos: 0,
      totalBudgetCentavos: 0,
      totalDeltaCentavos: 0,
    });
  });
});

describe("dashboard member distribution", () => {
  it("separates Household ownership, includes archived spend, and scales segments to the largest member", () => {
    const result = calculateMemberDistribution(
      [
        { id: "ana", name: "Ana", archivedAt: null },
        { id: "old", name: "Old", archivedAt: "2026-01-01" },
        { id: "gone", name: "Gone", archivedAt: "2026-01-01" },
      ],
      [
        {
          ownerMemberId: null,
          categoryId: "food",
          amount: 100,
          type: "expense" as const,
        },
        {
          ownerMemberId: "ana",
          categoryId: "food",
          amount: 150,
          type: "expense" as const,
        },
        {
          ownerMemberId: "ana",
          categoryId: "rent",
          amount: 50,
          type: "expense" as const,
        },
        {
          ownerMemberId: "old",
          categoryId: "food",
          amount: 25,
          type: "expense" as const,
        },
        {
          ownerMemberId: "ana",
          categoryId: "salary",
          amount: 99999,
          type: "income" as const,
        },
      ],
      [category("food"), category("rent", { color: parseHexColor("#654321") })],
    );
    expect(result.rows.map((r) => [r.memberId, r.totalSpentCentavos])).toEqual([
      ["household", 100],
      ["ana", 200],
      ["old", 25],
    ]);
    expect(result.maxSpendCentavos).toBe(200);
    expect(result.rows[1].segments.map((s) => s.widthRatio)).toEqual([
      0.75, 0.25,
    ]);
    expect(result.rows[0].segments[0].widthRatio).toBe(0.5);
    expect(result.rows[2]).toMatchObject({
      isArchived: true,
      isClickable: false,
    });
    expect(result.legendSwatches).toHaveLength(2);
  });
  it("keeps empty and income-category distributions safe", () => {
    expect(calculateMemberDistribution([], [], []).rows).toEqual([]);
    expect(calculateMemberDistribution([], [], [], true)).toEqual({
      isApplicable: false,
      rows: [],
      maxSpendCentavos: 0,
      legendSwatches: [],
    });
  });
});

describe("dashboard savings", () => {
  it("requires authoritative activity, month and planned context for goal highlights", () => {
    expectTypeOf(calculateGoalHighlight).parameters.toEqualTypeOf<
      [SavingsBucket | null, number, readonly SavingsActivity[], string, number]
    >();
  });
  it("reuses F03 exact balance and runway semantics, including gross funding and zero expenses", () => {
    const metrics = calculateBucketMetrics(
      bucket("buffer", { countsTowardBuffer: true }),
      [activity("buffer", 20001), activity("buffer", 1000, "withdrawal")],
      "2026-11",
      0,
    );
    const kpis = calculateSavingsKpis({
      activeBucketMetrics: [metrics],
      monthlyExpensesCentavos: 3000,
      hasMonthlyPlan: false,
    });
    expect(kpis).toMatchObject({
      savingsBufferCentavos: 19001,
      monthlyFundedCentavos: 20001,
      runwayMonths: 6.3,
    });
    expect(
      calculateSavingsKpis({
        activeBucketMetrics: [metrics],
        monthlyExpensesCentavos: 0,
        hasMonthlyPlan: false,
      }).runwayMonths,
    ).toBeNull();
  });
  it("uses floored goal progress, withdrawals, ceiling pace, and no-funding status", () => {
    const goal = bucket("goal");
    const activities = [
      activity("goal", 5500),
      activity("goal", 500, "withdrawal"),
    ];
    expect(
      calculateGoalHighlight(goal, 2000, activities, "2026-11", 0),
    ).toMatchObject({
      currentBalanceCentavos: 5000,
      progressRatio: 0.49,
      remainingCentavos: 5001,
      monthsToTarget: 3,
      status: "on_track",
    });
    expect(
      calculateGoalHighlight(goal, 0, activities, "2026-11", 0),
    ).toMatchObject({ monthsToTarget: null, status: "no_contributions" });
    expect(
      calculateGoalHighlight(
        goal,
        100,
        [activity("goal", 11000)],
        "2026-11",
        0,
      ),
    ).toMatchObject({
      progressRatio: 1,
      remainingCentavos: 0,
      monthsToTarget: null,
      status: "funded",
      statusTone: "favourable",
    });
  });
  it("does not select missing, archived, or open-ended goals", () => {
    for (const goal of [
      null,
      bucket("open", { targetAmount: null }),
      bucket("old", { archivedAt: "2026-01-01" }),
    ]) {
      expect(calculateGoalHighlight(goal, 0, [], "2026-11", 0)).toMatchObject({
        hasGoal: false,
        progressRatio: 0,
        status: "no_goal",
        monthsToTarget: null,
      });
    }
  });
  it("sorts qualified commitments without mutating input and retains fully funded targets", () => {
    const buckets = [
      bucket("z", { name: "Z", targetMonth: "2026-12", openingBalance: 12000 }),
      bucket("a", { name: "A", targetMonth: "2026-12" }),
      bucket("now", { type: "sinking_fund", targetMonth: "2026-11" }),
      bucket("past", { targetMonth: "2026-10" }),
      bucket("open", { targetAmount: null }),
      bucket("archived", { archivedAt: "2026-01-01" }),
      bucket("nodate", { targetMonth: null }),
      bucket("buffer", { type: "cash_buffer" }),
    ];
    const metrics = buckets.map((b) =>
      calculateBucketMetrics(b, [], "2026-11", 0),
    );
    const result = calculateUpcomingCommitments(metrics, "2026-11");
    expect(result.commitments.map((c) => c.bucketId)).toEqual([
      "now",
      "a",
      "z",
    ]);
    expect(result.commitments[2]).toMatchObject({
      remainingCentavos: 0,
      isFunded: true,
    });
    expect(metrics[0].bucket.id).toBe("z");
  });
});

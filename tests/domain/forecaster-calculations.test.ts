// @vitest-environment node

import { describe, expect, it } from "vitest";
import type {
  BaselineMetrics,
  ScenarioNudgeDerived,
  ScenarioWithRelations,
} from "@/domain/forecaster";
import {
  calculate24MonthOutlook,
  calculateScenarioMetrics,
  calculateVerdict,
  deriveNudgeAmounts,
  stepCategoryNudge,
} from "@/domain/forecaster-calculations";

const baseline: BaselineMetrics = {
  planId: "plan",
  modelName: "Baseline 2026",
  monthlyIncome: 11_950_000,
  monthlyExpense: 7_900_000,
  monthlySavings: 2_000_000,
  monthlyUnallocated: 2_050_000,
  startingBuffer: 46_600_000,
  runwayMonths: 5.9,
  verdict: { tier: "Tight but doable", statusTone: "warning" },
};

function scenario(
  overrides: Partial<ScenarioWithRelations> = {},
): ScenarioWithRelations {
  return {
    id: "a",
    name: "Scenario A",
    shortLabel: "A",
    paletteKey: "teal",
    startMonth: 5,
    drawAmount: 0,
    isBaseline: false,
    displayOrder: 1,
    createdAt: "",
    updatedAt: "",
    events: [],
    nudges: [],
    ...overrides,
  };
}

function event(
  monthlyAmount: number,
  type: ScenarioWithRelations["events"][number]["type"] = "recurring",
) {
  return {
    id: String(monthlyAmount),
    scenarioId: "a",
    name: "Cost",
    type,
    monthlyAmount,
    description: null,
    createdAt: "",
    updatedAt: "",
  };
}

function nudge(
  baseAllocation: number,
  freedAmount: number,
  targetType: ScenarioNudgeDerived["targetType"] = "category",
): ScenarioNudgeDerived {
  return {
    id: String(baseAllocation),
    scenarioId: "a",
    targetType,
    categoryId: targetType === "category" ? "category" : null,
    bucketId: targetType === "bucket" ? "bucket" : null,
    deltaAmount: -freedAmount,
    updatedAt: "",
    targetName: "Allocation",
    isArchived: false,
    baseAllocation,
    adjustedAllocation: baseAllocation - freedAmount,
    freedAmount,
  };
}

describe("calculateVerdict", () => {
  it.each([
    [null, 0, "Comfortable", "favourable"],
    [null, -1, "Risky buffer", "critical"],
    [0, 0, "Risky buffer", "critical"],
    [-1, 0, "Risky buffer", "critical"],
    [2.9, 0, "Risky buffer", "critical"],
    [3, 0, "Tight but doable", "warning"],
    [5.9, 1, "Tight but doable", "warning"],
    [6, 0, "Comfortable", "favourable"],
    [5.9, -1, "Risky buffer", "critical"],
    [6, -1, "Tight but doable", "warning"],
  ])(
    "classifies runway %s and cash flow %s",
    (runway, flow, tier, statusTone) => {
      expect(calculateVerdict(runway, flow)).toEqual({ tier, statusTone });
    },
  );
});

describe("calculateScenarioMetrics", () => {
  it.each([
    {
      input: scenario({ id: "baseline", isBaseline: true, paletteKey: null }),
      expected: [7_900_000, 2_050_000, 46_600_000, 5.9, "Tight but doable"],
    },
    {
      input: scenario({
        drawAmount: 9_850_000,
        events: [
          event(1_843_000, "financed purchase"),
          event(720_000),
          event(80_000, "seasonal"),
        ],
        nudges: [
          nudge(2_000_000, 200_000),
          nudge(500_000, 200_000),
          nudge(700_000, 450_000),
          nudge(1_000_000, -500_000, "bucket"),
        ],
      }),
      expected: [9_693_000, -243_000, 36_750_000, 3.8, "Risky buffer"],
    },
    {
      input: scenario({
        id: "b",
        startMonth: 11,
        events: [event(1_520_000, "financed purchase"), event(720_000)],
        nudges: [nudge(500_000, 100_000)],
      }),
      expected: [10_040_000, -90_000, 46_600_000, 4.6, "Risky buffer"],
    },
    {
      input: scenario({
        id: "c",
        drawAmount: 51_850_000,
        events: [event(720_000)],
        nudges: [nudge(500_000, 200_000)],
      }),
      expected: [8_420_000, 1_530_000, -5_250_000, 0, "Risky buffer"],
    },
  ])("matches seed scenario $input.id", ({ input, expected }) => {
    const result = calculateScenarioMetrics(baseline, input);
    expect([
      result.monthlyExpense,
      result.monthlyUnallocated,
      result.bufferAfter,
      result.runwayMonths,
      result.verdict.tier,
    ]).toEqual(expected);
    expect(result.scenarioId).toBe(input.id);
    expect(result.drawnFromBuffer).toBe(input.drawAmount);
  });

  it.each([
    [295, 3, "Tight but doable"],
    [595, 6, "Comfortable"],
  ])(
    "rounds runway before assigning the verdict for buffer %s",
    (startingBuffer, runwayMonths, tier) => {
      const result = calculateScenarioMetrics(
        { ...baseline, startingBuffer, monthlyExpense: 100 },
        scenario(),
      );
      expect(result.runwayMonths).toBe(runwayMonths);
      expect(result.verdict.tier).toBe(tier);
    },
  );

  it.each([
    [1, 0, null, "Comfortable"],
    [1, -1, null, "Risky buffer"],
    [0, 0, 0, "Risky buffer"],
    [-1, 0, 0, "Risky buffer"],
  ])(
    "handles zero expenses with buffer %s and flow %s",
    (startingBuffer, monthlyUnallocated, runwayMonths, tier) => {
      const result = calculateScenarioMetrics(
        { ...baseline, startingBuffer, monthlyExpense: 0, monthlyUnallocated },
        scenario(),
      );
      expect(result.runwayMonths).toBe(runwayMonths);
      expect(result.verdict.tier).toBe(tier);
    },
  );

  it("applies funded expense and freed savings nudges to the right totals", () => {
    const result = calculateScenarioMetrics(
      baseline,
      scenario({
        nudges: [nudge(0, -50_000), nudge(100_000, 100_000, "bucket")],
      }),
    );
    expect(result.monthlyExpense).toBe(7_950_000);
    expect(result.monthlyUnallocated).toBe(2_100_000);
    expect(result.runwayMonths).toBe(5.9);
  });
});

describe("calculate24MonthOutlook", () => {
  it("anchors flat bars and steps at the scenario start across calendar years", () => {
    const result = calculate24MonthOutlook(
      100,
      [
        scenario({ id: "baseline", isBaseline: true, paletteKey: null }),
        scenario({ events: [event(200)], nudges: [nudge(0, -50, "bucket")] }),
      ],
      "2026-11",
    );
    expect(result.bars).toHaveLength(24);
    expect(
      result.bars.every(
        (bar) => bar.unallocatedCentavos === 100 && !bar.isNegative,
      ),
    ).toBe(true);
    expect(result.zeroRuleRatio).toBeCloseTo(115 / 302.5);
    expect(result.bars[0].heightRatioInContainer).toBeCloseTo(100 / 115);
    expect(result.milestones).toEqual([
      { index: 0, monthKey: "2026-11" },
      { index: 6, monthKey: "2027-05" },
      { index: 12, monthKey: "2027-11" },
      { index: 23, monthKey: "2028-10" },
    ]);
    expect(result.polylines.map((line) => line.scenarioId)).toEqual(["a"]);
    const { points } = result.polylines[0];
    expect(points).toHaveLength(24);
    expect(points[0].x).toBe(0);
    expect(points[23].x).toBe(1);
    expect(points[4].y).toBeCloseTo(15 / 302.5);
    expect(points[5].y).toBeCloseTo(265 / 302.5);
    expect(
      points.every(({ x, y }) => x >= 0 && x <= 1 && y >= 0 && y <= 1),
    ).toBe(true);
  });

  it("scales negative baseline bars when a scenario crosses above zero", () => {
    const result = calculate24MonthOutlook(
      -100,
      [scenario({ startMonth: 1, nudges: [nudge(300, 300)] })],
      "2026-11",
    );
    expect(result.zeroRuleRatio).toBeCloseTo(230 / 355);
    expect(result.bars[0]).toMatchObject({
      unallocatedCentavos: -100,
      isNegative: true,
      heightRatioInContainer: 0.8,
    });
    expect(result.polylines[0].points[0].y).toBeCloseTo(330 / 355);
    expect(result.polylines[0].points[1].y).toBeCloseTo(30 / 355);
  });

  it("scales negative-only outlooks below the zero line", () => {
    const result = calculate24MonthOutlook(
      -100,
      [scenario({ startMonth: 23, events: [event(100)] })],
      "2026-11",
    );
    expect(result.zeroRuleRatio).toBe(0);
    expect(result.bars[0]).toMatchObject({
      unallocatedCentavos: -100,
      isNegative: true,
      heightRatioInContainer: 0.4,
    });
    expect(result.polylines[0].points[22].y).toBeCloseTo(0.4);
    expect(result.polylines[0].points[23].y).toBeCloseTo(0.8);
  });

  it("keeps zero values finite with an empty or all-zero comparison", () => {
    const result = calculate24MonthOutlook(
      0,
      [scenario({ startMonth: 0 })],
      "2026-11",
    );
    expect(result.zeroRuleRatio).toBe(1);
    expect(result.bars.every((bar) => bar.heightRatioInContainer === 0)).toBe(
      true,
    );
    expect(result.polylines[0].points.every(({ y }) => y === 1)).toBe(true);
    expect(calculate24MonthOutlook(0, [], "2026-11").polylines).toEqual([]);
  });
});

describe("budget nudge math", () => {
  it("derives signed freed funds and clamps reductions to the base allocation", () => {
    expect(deriveNudgeAmounts(15, -20)).toEqual({
      adjustedAllocation: 0,
      freedAmount: 15,
    });
    expect(deriveNudgeAmounts(15, 20)).toEqual({
      adjustedAllocation: 35,
      freedAmount: -20,
    });
  });

  it("steps up or down by 50,000 centavos and keeps the exact remainder", () => {
    expect(stepCategoryNudge(100_001, 50_001, 1)).toMatchObject({
      nextAllocation: 100_001,
      nextDelta: 0,
      freedAmount: 0,
    });
    expect(stepCategoryNudge(100_001, 50_001, -1)).toMatchObject({
      nextAllocation: 1,
      nextDelta: -100_000,
      freedAmount: 100_000,
    });
    expect(stepCategoryNudge(100_001, 1, -1)).toMatchObject({
      nextAllocation: 0,
      nextDelta: -100_001,
      freedAmount: 100_001,
    });
  });

  it("handles a zero base and bounds track fill", () => {
    expect(stepCategoryNudge(0, 0, 1)).toEqual({
      nextAllocation: 50_000,
      nextDelta: 50_000,
      freedAmount: -50_000,
      fillPercent: 50,
    });
    expect(stepCategoryNudge(100, 0, 1).fillPercent).toBe(98);
  });
});

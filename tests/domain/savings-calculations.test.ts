// @vitest-environment node
import { describe, expect, it } from "vitest";
import { currentMonthKey, isValidMonthKey } from "@/domain/month";
import {
  defaultCountsTowardBuffer,
  formatBucketTypeSubtitle,
  isValidBucketType,
  isValidSavingsActivityKind,
  validateActivityDate,
  validateNonNegativeBucketBalance,
  type SavingsBucket,
  type SavingsActivity,
} from "@/domain/savings";
import {
  calculateBucketMetrics,
  calculateSavingsKpis,
} from "@/domain/savings-calculations";
const bucket: SavingsBucket = {
  id: "a",
  name: "A",
  nameKey: "a",
  type: "goal",
  openingBalance: 0,
  targetAmount: null,
  targetMonth: null,
  description: null,
  countsTowardBuffer: true,
  isDefault: false,
  archivedAt: null,
  createdAt: "",
  updatedAt: "",
};
const activity = (
  kind: SavingsActivity["kind"],
  amount: number,
  date = "2026-09-01",
): SavingsActivity => ({
  id: "x",
  bucketId: "a",
  kind,
  amount,
  date,
  note: null,
  createdAt: "",
  updatedAt: "",
});
describe("savings", () => {
  it("validates months, calendar dates, types and future activity", () => {
    expect(currentMonthKey(new Date(2026, 0, 1))).toBe("2026-01");
    for (const x of [undefined, "2026-00", "2026-13", "2026-1"])
      expect(isValidMonthKey(x)).toBe(false);
    expect(isValidMonthKey("2026-12")).toBe(true);
    expect(validateActivityDate("2024-02-29", "2026-09-01")).toEqual({
      ok: true,
    });
    for (const x of ["2026-02-29", "2026-02-31", "2026-09-02"])
      expect(validateActivityDate(x, "2026-09-01").ok).toBe(false);
    for (const x of ["cash_buffer", "emergency_fund", "goal", "sinking_fund"])
      expect(isValidBucketType(x)).toBe(true);
    expect(isValidBucketType("other")).toBe(false);
    expect(isValidSavingsActivityKind("withdrawal")).toBe(true);
    expect(isValidSavingsActivityKind("expense")).toBe(false);
    expect(defaultCountsTowardBuffer("cash_buffer")).toBe(true);
    expect(defaultCountsTowardBuffer("goal")).toBe(false);
    expect(
      formatBucketTypeSubtitle({ ...bucket, targetMonth: "2027-02" }),
    ).toBe("Goal \u00b7 Feb 2027");
  });
  it("keeps lifetime balances but scopes gross funding to month", () => {
    const activities = [
      activity("contribution", 500000),
      activity("withdrawal", 300000),
      activity("contribution", 100000, "2026-08-01"),
    ];
    const sep = calculateBucketMetrics(bucket, activities, "2026-09", 500000);
    const aug = calculateBucketMetrics(bucket, activities, "2026-08", 0);
    expect(sep).toMatchObject({
      currentBalanceCentavos: 300000,
      monthlyContributionsCentavos: 500000,
      monthlyWithdrawalsCentavos: 300000,
      monthlyShortfallCentavos: 0,
      progressPercent: null,
      progressBarPercent: 100,
    });
    expect(aug.currentBalanceCentavos).toBe(sep.currentBalanceCentavos);
    expect(aug.monthlyContributionsCentavos).toBe(100000);
    expect(
      calculateSavingsKpis({
        activeBucketMetrics: [sep],
        monthlyExpensesCentavos: 200000,
        hasMonthlyPlan: true,
      }),
    ).toMatchObject({
      monthlyFundedCentavos: 500000,
      fundedStatus: "on_plan",
      runwayMonths: 1.5,
    });
  });
  it("floors progress and clamps only the bar", () => {
    expect(
      calculateBucketMetrics(
        { ...bucket, openingBalance: 996, targetAmount: 1000 },
        [],
        "2026-09",
        0,
      ),
    ).toMatchObject({ progressPercent: 99, remainingToTargetCentavos: 4 });
    expect(
      calculateBucketMetrics(
        { ...bucket, openingBalance: 1050, targetAmount: 1000 },
        [],
        "2026-09",
        0,
      ),
    ).toMatchObject({
      progressPercent: 105,
      progressBarPercent: 100,
      remainingToTargetCentavos: 0,
    });
  });
  it("sums shortfalls without offsetting, excludes archived and uncounted balances", () => {
    const a = calculateBucketMetrics(
      { ...bucket, openingBalance: 100 },
      [activity("contribution", 1000000)],
      "2026-09",
      500000,
    );
    const b = calculateBucketMetrics(
      { ...bucket, id: "b", countsTowardBuffer: false, openingBalance: 200 },
      [],
      "2026-09",
      300000,
    );
    const archived = calculateBucketMetrics(
      { ...bucket, archivedAt: "2026-09-01", openingBalance: 99999 },
      [],
      "2026-09",
      99999,
    );
    expect(
      calculateSavingsKpis({
        activeBucketMetrics: [a, b, archived],
        monthlyExpensesCentavos: 0,
        hasMonthlyPlan: true,
      }),
    ).toMatchObject({
      activeBucketCount: 2,
      heldInBucketsCentavos: 1000300,
      savingsBufferCentavos: 1000100,
      monthlyShortfallCentavos: 300000,
      monthlyPlannedSavingsCentavos: 800000,
      fundedStatus: "short",
      runwayMonths: null,
    });
    expect(
      calculateSavingsKpis({
        activeBucketMetrics: [],
        monthlyExpensesCentavos: 0,
        hasMonthlyPlan: false,
      }).fundedStatus,
    ).toBe("no_plan");
    expect(
      calculateSavingsKpis({
        activeBucketMetrics: [],
        monthlyExpensesCentavos: 0,
        hasMonthlyPlan: true,
      }).fundedStatus,
    ).toBe("no_savings_planned");
  });
  it("guards balances after withdrawals, edits, deletions and opening reductions", () => {
    expect(
      validateNonNegativeBucketBalance(100, [activity("withdrawal", 100)]),
    ).toBe(true);
    expect(
      validateNonNegativeBucketBalance(99, [activity("withdrawal", 100)]),
    ).toBe(false);
    expect(
      validateNonNegativeBucketBalance(0, [
        activity("contribution", 50),
        activity("withdrawal", 100),
      ]),
    ).toBe(false);
    expect(
      validateNonNegativeBucketBalance(0, [activity("withdrawal", 100)]),
    ).toBe(false);
  });
});

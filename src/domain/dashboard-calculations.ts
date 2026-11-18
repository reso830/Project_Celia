import type { Centavos } from "./amount";
import type { Category } from "./category";
import type { Member } from "./member";
import type { EntryWithDetails } from "./entry";
import type { SavingsBucket, SavingsActivity } from "./savings";
import {
  calculateBucketMetrics,
  type BucketDerivedMetrics,
} from "./savings-calculations";
import {
  calculateBudgetComparisonRows,
  resolveMergedCategoryTarget,
  type ComparisonCategory,
} from "./budget-calculations";
import type {
  BurnRateData,
  BudgetTrendData,
  CategoriesTableData,
  MemberDistributionData,
  GoalHighlightData,
  UpcomingCommitmentsData,
} from "./dashboard";

export function generateSparklineRatios(
  values: readonly number[],
): readonly { x: number; y: number }[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [{ x: 0.5, y: values[0] > 0 ? 0.5 : 0 }];
  const max = Math.max(...values);
  const min = Math.min(...values);
  return values.map((value, index) => ({
    x: index / (values.length - 1),
    y: max === 0 ? 0 : max === min ? 0.5 : value / max,
  }));
}

export function calculateBurnRateGauge(
  actualExpenses: Centavos,
  expenseBudget: Centavos,
  hasMonthlyPlan: boolean,
  isIncomeCategory = false,
): BurnRateData {
  if (isIncomeCategory || !hasMonthlyPlan || expenseBudget === 0) {
    const overspent = hasMonthlyPlan && !isIncomeCategory && actualExpenses > 0;
    return {
      utilizationPercent: null,
      arcRatio: overspent ? 1 : 0,
      statusTone: overspent ? "critical" : "neutral",
      state: isIncomeCategory
        ? "income_category"
        : !hasMonthlyPlan
          ? "no_plan"
          : overspent
            ? "zero_budget_overspent"
            : "zero_budget_zero_spend",
      hasMonthlyPlan,
    };
  }
  const under = actualExpenses * 100 < expenseBudget * 85;
  const over = actualExpenses * 100 > expenseBudget * 115;
  return {
    utilizationPercent: Math.round((actualExpenses * 100) / expenseBudget),
    arcRatio: Math.min(1, actualExpenses / (expenseBudget * 1.5)),
    statusTone: under ? "favourable" : over ? "critical" : "warning",
    state: under ? "under_pace" : over ? "over_pace" : "on_pace",
    hasMonthlyPlan,
  };
}

export function calculateBudgetTrend(
  monthlyExpenses: readonly {
    monthKey: string;
    actualExpensesCentavos: Centavos;
  }[],
  monthlyPlans: ReadonlyMap<string, Centavos>,
  selectedMonthKey: string,
  range: 6 | 12,
  isIncomeCategory = false,
): BudgetTrendData {
  if (isIncomeCategory)
    return {
      isApplicable: false,
      bars: [],
      budgetLineRatio: 0,
      budgetCentavos: 0,
      range,
    };
  const [year, month] = selectedMonthKey.split("-").map(Number);
  const end = year * 12 + month - 1;
  const months = Array.from({ length: range }, (_, index) => {
    const key = end - range + 1 + index;
    return `${String(Math.floor(key / 12)).padStart(4, "0")}-${String((((key % 12) + 12) % 12) + 1).padStart(2, "0")}`;
  });
  const actuals = new Map(
    monthlyExpenses.map((row) => [row.monthKey, row.actualExpensesCentavos]),
  );
  const budgetCentavos = monthlyPlans.get(selectedMonthKey) ?? 0;
  const peak = Math.max(
    1,
    Math.max(budgetCentavos, ...months.map((key) => actuals.get(key) ?? 0)) *
      1.12,
  );
  return {
    isApplicable: true,
    range,
    budgetCentavos,
    budgetLineRatio: budgetCentavos / peak,
    bars: months.map((monthKey) => {
      const actualExpensesCentavos = actuals.get(monthKey) ?? 0;
      const budget = monthlyPlans.get(monthKey);
      return {
        monthKey,
        actualExpensesCentavos,
        heightRatio: actualExpensesCentavos / peak,
        isOverspent: budget !== undefined && actualExpensesCentavos > budget,
        isSelected: monthKey === selectedMonthKey,
        isUnbudgeted: budget === undefined,
      };
    }),
  };
}

export function calculateCategorySpendingRows(
  categories: readonly Category[],
  actualsByCategory: Readonly<Record<string, Centavos>>,
  budgetAllocations: Readonly<Record<string, Centavos>>,
  mergedCategoryClosure: readonly Category[] = categories,
  isIncomeCategory = false,
): CategoriesTableData {
  if (isIncomeCategory)
    return {
      isApplicable: false,
      rows: [],
      totalSpentCentavos: 0,
      totalBudgetCentavos: 0,
      totalDeltaCentavos: 0,
    };
  const all = new Map(
    [...mergedCategoryClosure, ...categories].map((c) => [c.id, c]),
  );
  const comparison: ComparisonCategory[] = [...all.values()].map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    umbrella: c.umbrella,
    archived: c.archivedAt !== null,
    merged: c.mergedIntoCategoryId !== null,
    mergedIntoCategoryId: c.mergedIntoCategoryId,
    actualCentavos: 0,
  }));
  const byId = new Map(comparison.map((c) => [c.id, c]));
  for (const c of comparison) {
    const target = resolveMergedCategoryTarget(c.id, byId);
    target.actualCentavos += actualsByCategory[c.id] ?? 0;
  }
  const comparisonRows = calculateBudgetComparisonRows({
    categories: comparison,
    buckets: [],
    plannedByCategory: budgetAllocations,
    plannedByBucket: {},
    foldMergedCategories: true,
  });
  const rows = comparisonRows
    .filter(
      (r) =>
        r.umbrella === "expense" &&
        !r.isFoldedIntoMergeTarget &&
        (r.actualCentavos > 0 || r.plannedCentavos > 0),
    )
    .map((r) => {
      return {
        categoryId: r.targetId,
        name: r.name,
        color: all.get(r.targetId)!.color,
        spentCentavos: r.actualCentavos,
        budgetCentavos: r.plannedCentavos,
        progressRatio:
          r.plannedCentavos === 0
            ? r.actualCentavos > 0
              ? 1
              : 0
            : Math.min(1, r.actualCentavos / r.plannedCentavos),
        progressTone: calculateBurnRateGauge(
          r.actualCentavos,
          r.plannedCentavos,
          true,
        ).statusTone,
        deltaCentavos: r.deltaCentavos,
        rolloverCentavos: r.remainingCentavos > 0 ? r.remainingCentavos : null,
        statusTone:
          r.tone === "green"
            ? ("favourable" as const)
            : r.tone === "red"
              ? ("critical" as const)
              : r.tone === "amber"
                ? ("warning" as const)
                : ("neutral" as const),
        isArchived: r.archived,
        isClickable: !r.archived,
        isFoldedIntoMergeTarget: r.isFoldedIntoMergeTarget,
      };
    });
  return {
    isApplicable: true,
    rows,
    totalSpentCentavos: rows.reduce((sum, r) => sum + r.spentCentavos, 0),
    totalBudgetCentavos: rows.reduce((sum, r) => sum + r.budgetCentavos, 0),
    totalDeltaCentavos: rows.reduce((sum, r) => sum + r.deltaCentavos, 0),
  };
}

export function calculateMemberDistribution(
  members: readonly Member[],
  entries: readonly Pick<
    EntryWithDetails,
    "ownerMemberId" | "amount" | "categoryId" | "type"
  >[],
  categories: readonly Category[],
  isIncomeCategory = false,
): MemberDistributionData {
  if (isIncomeCategory)
    return {
      isApplicable: false,
      rows: [],
      maxSpendCentavos: 0,
      legendSwatches: [],
    };
  const expenses = entries.filter((e) => e.type === "expense");
  if (members.length === 0 && expenses.length === 0)
    return {
      isApplicable: true,
      rows: [],
      maxSpendCentavos: 0,
      legendSwatches: [],
    };
  const owners = [
    { id: "household", name: "Household", archivedAt: null },
    ...members.filter(
      (m) =>
        m.archivedAt === null || expenses.some((e) => e.ownerMemberId === m.id),
    ),
  ];
  const totals = owners.map((owner) =>
    expenses
      .filter((e) => (e.ownerMemberId ?? "household") === owner.id)
      .reduce((sum, e) => sum + e.amount, 0),
  );
  const maxSpendCentavos = Math.max(1, ...totals);
  const represented = new Set<string>();
  const rows = owners.map((owner, index) => ({
    memberId: owner.id,
    name: owner.name,
    totalSpentCentavos: totals[index],
    isArchived: owner.archivedAt !== null,
    isClickable: owner.archivedAt === null,
    isSelected: false,
    segments: categories.flatMap((c) => {
      const amountCentavos = expenses
        .filter(
          (e) =>
            (e.ownerMemberId ?? "household") === owner.id &&
            e.categoryId === c.id,
        )
        .reduce((sum, e) => sum + e.amount, 0);
      if (amountCentavos === 0) return [];
      represented.add(c.id);
      return [
        {
          categoryId: c.id,
          categoryName: c.name,
          color: c.color,
          amountCentavos,
          widthRatio: amountCentavos / maxSpendCentavos,
        },
      ];
    }),
  }));
  return {
    isApplicable: true,
    rows,
    maxSpendCentavos,
    legendSwatches: categories
      .filter((c) => represented.has(c.id))
      .map((c) => ({ name: c.name, color: c.color })),
  };
}

export function calculateGoalHighlight(
  goalBucket: SavingsBucket | null,
  currentMonthFundedCentavos: Centavos,
  activities: readonly SavingsActivity[],
  selectedMonthKey: string,
  plannedMonthlyCentavos: Centavos,
): GoalHighlightData {
  if (
    !goalBucket ||
    goalBucket.archivedAt !== null ||
    goalBucket.type !== "goal" ||
    goalBucket.targetAmount === null ||
    goalBucket.targetAmount <= 0
  ) {
    return {
      hasGoal: false,
      bucketId: null,
      name: null,
      currentBalanceCentavos: 0,
      targetAmountCentavos: null,
      progressRatio: 0,
      statusTone: "neutral",
      status: "no_goal",
      monthsToTarget: null,
      remainingCentavos: 0,
      currentMonthFundedCentavos: 0,
    };
  }
  const metrics = calculateBucketMetrics(
    goalBucket,
    activities,
    selectedMonthKey,
    plannedMonthlyCentavos,
  );
  const remainingCentavos = metrics.remainingToTargetCentavos!;
  const funded = remainingCentavos === 0;
  return {
    hasGoal: true,
    bucketId: goalBucket.id,
    name: goalBucket.name,
    currentBalanceCentavos: metrics.currentBalanceCentavos,
    targetAmountCentavos: goalBucket.targetAmount,
    progressRatio: Math.min(1, (metrics.progressPercent ?? 0) / 100),
    statusTone: funded ? "favourable" : "warning",
    status: funded
      ? "funded"
      : currentMonthFundedCentavos > 0
        ? "on_track"
        : "no_contributions",
    monthsToTarget:
      !funded && currentMonthFundedCentavos > 0
        ? Math.ceil(remainingCentavos / currentMonthFundedCentavos)
        : null,
    remainingCentavos,
    currentMonthFundedCentavos,
  };
}

export function calculateUpcomingCommitments(
  buckets: readonly BucketDerivedMetrics[],
  selectedMonthKey: string,
): UpcomingCommitmentsData {
  return {
    commitments: buckets
      .filter(
        ({ bucket: b }) =>
          b.archivedAt === null &&
          (b.type === "sinking_fund" || b.type === "goal") &&
          b.targetMonth !== null &&
          b.targetMonth >= selectedMonthKey &&
          b.targetAmount !== null &&
          b.targetAmount > 0,
      )
      .sort(
        (a, b) =>
          a.bucket.targetMonth!.localeCompare(b.bucket.targetMonth!) ||
          a.bucket.name.localeCompare(b.bucket.name) ||
          a.bucket.id.localeCompare(b.bucket.id),
      )
      .map(({ bucket: b, currentBalanceCentavos }) => ({
        bucketId: b.id,
        name: b.name,
        targetMonth: b.targetMonth!,
        targetAmountCentavos: b.targetAmount!,
        currentBalanceCentavos,
        remainingCentavos: Math.max(
          0,
          b.targetAmount! - currentBalanceCentavos,
        ),
        isFunded: currentBalanceCentavos >= b.targetAmount!,
      })),
  };
}

import "server-only";
import { connection } from "next/server";
import type { DashboardViewData } from "@/domain/dashboard";
import type { Centavos } from "@/domain/amount";
import type { SavingsActivity } from "@/domain/savings";
import { currentMonthKey, isValidMonthKey } from "@/domain/month";
import {
  calculateBurnRateGauge,
  calculateBudgetTrend,
  calculateCategorySpendingRows,
  calculateMemberDistribution,
  calculateGoalHighlight,
  calculateUpcomingCommitments,
  generateSparklineRatios,
} from "@/domain/dashboard-calculations";
import {
  calculateBucketMetrics,
  calculateSavingsKpis,
} from "@/domain/savings-calculations";
import { getDatabase } from "./db/database";
import { listCategories, listItems } from "./categories-store";
import { listMembers } from "./members-store";
import { findMonthlyBudgetPlan } from "./models-store";
import { listSavingsBuckets } from "./savings-store";

type MonthlyActual = {
  monthKey: string;
  type: "income" | "expense";
  ownerMemberId: string | null;
  categoryId: string;
  amount: Centavos;
};
function shiftMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const value = year * 12 + month - 1 + offset;
  return `${String(Math.floor(value / 12)).padStart(4, "0")}-${String((((value % 12) + 12) % 12) + 1).padStart(2, "0")}`;
}

export async function getDashboardView(
  params: {
    month?: string;
    memberFilter?: string;
    categoryId?: string;
    range?: number;
  } = {},
): Promise<DashboardViewData> {
  await connection();
  const db = getDatabase();
  const month = isValidMonthKey(params.month)
    ? params.month
    : currentMonthKey();
  const range = params.range === 12 ? 12 : 6;
  const categories = listCategories(db, { includeMerged: true });
  const members = listMembers(db);
  const activeCategories = categories.filter(
    (c) => c.archivedAt === null && c.mergedIntoCategoryId === null,
  );
  const activeMembers = members.filter((m) => m.archivedAt === null);
  const memberFilter =
    params.memberFilter === "household" ||
    activeMembers.some((m) => m.id === params.memberFilter)
      ? params.memberFilter!
      : "all";
  const selectedCategory = activeCategories.find(
    (c) => c.id === params.categoryId,
  );
  const categoryId = selectedCategory?.id ?? "all";
  const incomeCategory = selectedCategory?.umbrella === "income";
  const ownerFiltered = memberFilter !== "all";
  const months = Array.from({ length: 12 }, (_, i) =>
    shiftMonth(month, i - 11),
  );
  const actuals = db
    .prepare(
      `SELECT substr(e.date,1,7) AS monthKey,
    c.umbrella_id AS type,e.owner_member_id AS ownerMemberId,c.id AS categoryId,SUM(e.amount) AS amount
    FROM entries e JOIN items i ON i.id=e.item_id JOIN categories c ON c.id=i.category_id
    WHERE e.date>=? AND e.date<?
    GROUP BY substr(e.date,1,7),c.umbrella_id,e.owner_member_id,c.id`,
    )
    .all(`${months[0]}-01`, `${shiftMonth(month, 1)}-01`) as MonthlyActual[];
  const inCategory = (row: MonthlyActual) =>
    categoryId === "all" || row.categoryId === categoryId;
  const inOwner = (row: MonthlyActual) =>
    memberFilter === "all" ||
    (memberFilter === "household"
      ? row.ownerMemberId === null
      : row.ownerMemberId === memberFilter);
  const selected = actuals.filter((row) => row.monthKey === month);
  const scoped = selected.filter((row) => inCategory(row) && inOwner(row));
  const total = (rows: readonly MonthlyActual[], type: "income" | "expense") =>
    rows
      .filter((row) => row.type === type)
      .reduce((sum, row) => sum + row.amount, 0);
  const householdExpenses = total(selected, "expense");
  const actualIncome = total(scoped, "income");
  const actualExpenses = total(scoped, "expense");
  const actualByCategory: Record<string, number> = {};
  for (const row of selected.filter(inOwner))
    actualByCategory[row.categoryId] =
      (actualByCategory[row.categoryId] ?? 0) + row.amount;
  const plans = new Map(
    months.map((key) => [key, findMonthlyBudgetPlan(db, key)]),
  );
  const plan = plans.get(month)!;
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const plannedByCategory = Object.fromEntries(
    (plan?.allocations ?? [])
      .filter((l) => l.categoryId !== null)
      .map((l) => [l.categoryId!, l.amount]),
  );
  const plannedByBucket = Object.fromEntries(
    (plan?.allocations ?? [])
      .filter((l) => l.bucketId !== null)
      .map((l) => [l.bucketId!, l.amount]),
  );
  const planned = (kind: "income" | "expense" | "savings") =>
    (plan?.allocations ?? [])
      .filter((l) =>
        kind === "savings"
          ? l.targetType === "bucket"
          : l.categoryId !== null &&
            categoryById.get(l.categoryId)?.umbrella === kind,
      )
      .reduce((sum, l) => sum + l.amount, 0);
  const plannedIncome = planned("income"),
    plannedExpenses = planned("expense"),
    plannedSavings = planned("savings");
  const allComparisons = calculateCategorySpendingRows(
    categories,
    actualByCategory,
    plannedByCategory,
    categories,
    incomeCategory,
  );
  const rows = allComparisons.rows.filter(
    (row) => categoryId === "all" || row.categoryId === categoryId,
  );
  const categoriesTable = {
    ...allComparisons,
    rows,
    totalSpentCentavos: rows.reduce((s, r) => s + r.spentCentavos, 0),
    totalBudgetCentavos: rows.reduce((s, r) => s + r.budgetCentavos, 0),
    totalDeltaCentavos: rows.reduce((s, r) => s + r.deltaCentavos, 0),
  };
  const buckets = listSavingsBuckets(db);
  const activities = db
    .prepare(
      `SELECT a.id,a.bucket_id AS bucketId,a.kind,a.amount,a.date,a.note,a.created_at AS createdAt,a.updated_at AS updatedAt
    FROM savings_activities a JOIN savings_buckets b ON b.id=a.bucket_id WHERE b.archived_at IS NULL ORDER BY a.date,a.id`,
    )
    .all() as SavingsActivity[];
  const metrics = buckets.map((b) =>
    calculateBucketMetrics(b, activities, month, plannedByBucket[b.id] ?? 0),
  );
  const savings = calculateSavingsKpis({
    activeBucketMetrics: metrics,
    monthlyExpensesCentavos: householdExpenses,
    hasMonthlyPlan: plan !== null,
  });
  const bufferPoints = months.map((key) => {
    const next = `${shiftMonth(key, 1)}-01`;
    return buckets
      .filter((b) => b.countsTowardBuffer)
      .reduce(
        (sum, b) =>
          sum +
          (b.createdAt.slice(0, 7) <= key ? b.openingBalance : 0) +
          activities
            .filter((a) => a.bucketId === b.id && a.date < next)
            .reduce(
              (balance, a) =>
                balance + (a.kind === "contribution" ? a.amount : -a.amount),
              0,
            ),
        0,
      );
  });
  const actualSavings = savings.monthlyFundedCentavos;
  const unallocated =
    actualIncome - actualExpenses - (ownerFiltered ? 0 : actualSavings);
  const deltasAvailable = plan !== null && !ownerFiltered;
  const expenseDelta =
    deltasAvailable && !incomeCategory
      ? (selectedCategory
          ? categoriesTable.totalBudgetCentavos
          : plannedExpenses) - actualExpenses
      : null;
  const trendPlans = new Map<string, number>();
  for (const [key, snapshot] of plans) {
    if (!snapshot) continue;
    const allocations = Object.fromEntries(
      snapshot.allocations
        .filter((l) => l.categoryId !== null)
        .map((l) => [l.categoryId!, l.amount]),
    );
    const comparisons = calculateCategorySpendingRows(
      categories,
      {},
      allocations,
      categories,
    );
    trendPlans.set(
      key,
      categoryId === "all"
        ? comparisons.totalBudgetCentavos
        : (comparisons.rows.find((r) => r.categoryId === categoryId)
            ?.budgetCentavos ?? 0),
    );
  }
  const trendActuals = months.map((key) => ({
    monthKey: key,
    actualExpensesCentavos: total(
      actuals.filter(
        (row) => row.monthKey === key && inOwner(row) && inCategory(row),
      ),
      "expense",
    ),
  }));
  const distribution = calculateMemberDistribution(
    members,
    selected.filter(inCategory),
    categories,
    incomeCategory,
  );
  const goal =
    buckets.find(
      (b) => b.type === "goal" && b.targetAmount !== null && b.targetAmount > 0,
    ) ?? null;
  const goalMetrics = metrics.find((m) => m.bucket.id === goal?.id);
  return {
    modelName: plan?.modelName ?? null,
    filter: { monthKey: month, memberFilter, categoryId, range },
    hero: {
      bufferCentavos: savings.savingsBufferCentavos,
      runwayMonths: savings.runwayMonths,
      sparklinePoints: generateSparklineRatios(
        bufferPoints.map((value) => Math.max(0, value)),
      ),
      isHouseholdScope: ownerFiltered,
    },
    kpis: {
      history: months.map((key) => {
        const monthActuals = actuals.filter(
          (row) => row.monthKey === key && inCategory(row) && inOwner(row),
        );
        const income = total(monthActuals, "income");
        const expenses = total(monthActuals, "expense");
        const funded = buckets.reduce(
          (sum, bucket) =>
            sum +
            calculateBucketMetrics(bucket, activities, key, 0)
              .monthlyContributionsCentavos,
          0,
        );
        return {
          monthKey: key,
          incomeCentavos:
            selectedCategory?.umbrella === "expense" ? null : income,
          expensesCentavos: incomeCategory ? null : expenses,
          savingsCentavos: selectedCategory ? null : funded,
          unallocatedCentavos: selectedCategory
            ? null
            : income - expenses - (ownerFiltered ? 0 : funded),
        };
      }),
      incomeCentavos:
        selectedCategory?.umbrella === "expense" ? null : actualIncome,
      expensesCentavos: incomeCategory ? null : actualExpenses,
      savingsCentavos: selectedCategory ? null : actualSavings,
      unallocatedCentavos: selectedCategory ? null : unallocated,
      incomeDeltaCentavos:
        deltasAvailable && !selectedCategory
          ? actualIncome - plannedIncome
          : null,
      expensesDeltaCentavos: expenseDelta,
      savingsDeltaCentavos:
        deltasAvailable && !selectedCategory
          ? actualSavings - plannedSavings
          : null,
      unallocatedDeltaCentavos:
        deltasAvailable && !selectedCategory
          ? unallocated - (plannedIncome - plannedExpenses - plannedSavings)
          : null,
      unallocatedScope:
        memberFilter === "all"
          ? "all"
          : memberFilter === "household"
            ? "household"
            : "member",
    },
    burnRate: calculateBurnRateGauge(
      ownerFiltered || !selectedCategory ? householdExpenses : actualExpenses,
      ownerFiltered || !selectedCategory
        ? plannedExpenses
        : categoriesTable.totalBudgetCentavos,
      plan !== null,
      incomeCategory,
    ),
    budgetTrend: calculateBudgetTrend(
      trendActuals,
      trendPlans,
      month,
      range,
      incomeCategory,
    ),
    categoriesTable,
    memberDistribution: {
      ...distribution,
      rows: distribution.rows.map((row) => ({
        ...row,
        isSelected: row.memberId === memberFilter,
      })),
    },
    goalHighlight: calculateGoalHighlight(
      goal,
      goalMetrics?.monthlyContributionsCentavos ?? 0,
      activities,
      month,
      goal ? (plannedByBucket[goal.id] ?? 0) : 0,
    ),
    upcomingCommitments: calculateUpcomingCommitments(metrics, month),
    filterMembers: activeMembers.map(({ id, name }) => ({ id, name })),
    filterCategories: activeCategories.map(({ id, name, umbrella }) => ({
      id,
      name,
      umbrella,
    })),
    modalCategories: activeCategories.map((c) => ({
      id: c.id,
      name: c.name,
      umbrella: c.umbrella,
      color: c.color,
      archived: false,
      items: listItems(db, c.id).map(({ id, name }) => ({ id, name })),
    })),
    modalMembers: activeMembers.map(({ id, name }) => ({
      id,
      name,
      archived: false,
    })),
  };
}

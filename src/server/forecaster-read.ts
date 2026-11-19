import "server-only";

import type Database from "better-sqlite3";
import { connection } from "next/server";
import { calculateBudgetSummary } from "@/domain/budget-calculations";
import type {
  BaselineMetrics,
  ForecasterNudgeTarget,
  ForecasterViewData,
  ScenarioWithRelations,
} from "@/domain/forecaster";
import {
  calculate24MonthOutlook,
  calculateScenarioMetrics,
  calculateVerdict,
  deriveNudgeAmounts,
} from "@/domain/forecaster-calculations";
import { currentMonthKey } from "@/domain/month";
import {
  calculateBucketMetrics,
  calculateSavingsKpis,
} from "@/domain/savings-calculations";
import { listCategories } from "./categories-store";
import { getDatabase } from "./db/database";
import { listScenarios } from "./forecaster-store";
import { findMonthlyBudgetPlan } from "./models-store";
import { listSavingsActivities, listSavingsBuckets } from "./savings-store";

function resolveCategoryAllocations(db: Database.Database, planId: string) {
  return db
    .prepare(
      `
    WITH RECURSIVE merged_tree(root_id, category_id) AS (
      SELECT id, id FROM categories WHERE merged_into_category_id IS NULL
      UNION ALL
      SELECT tree.root_id, category.id
      FROM categories category
      JOIN merged_tree tree ON category.merged_into_category_id = tree.category_id
    )
    SELECT tree.root_id AS id, SUM(allocation.amount) AS amount
    FROM monthly_budget_allocations allocation
    JOIN merged_tree tree ON tree.category_id = allocation.category_id
    WHERE allocation.plan_id = ?
    GROUP BY tree.root_id
  `,
    )
    .all(planId) as { id: string; amount: number }[];
}

function emptyView(monthKey: string): ForecasterViewData {
  const verdict = calculateVerdict(0, 0);
  return {
    baselineName: "Baseline",
    appliedMonthKey: monthKey,
    activeScenarioId: "baseline",
    hasAppliedPlan: false,
    scenarios: [],
    nudgeTargets: [],
    baselineMetrics: {
      planId: null,
      modelName: "",
      monthlyIncome: 0,
      monthlyExpense: 0,
      monthlySavings: 0,
      monthlyUnallocated: 0,
      startingBuffer: 0,
      runwayMonths: 0,
      verdict,
    },
    selectedMetrics: {
      scenarioId: "baseline",
      monthlyExpense: 0,
      monthlyUnallocated: 0,
      drawnFromBuffer: 0,
      bufferAfter: 0,
      runwayMonths: 0,
      verdict,
    },
    comparisonMetrics: [],
    outlook: { bars: [], polylines: [], zeroRuleRatio: 1, milestones: [] },
  };
}

function readForecasterView(
  db: Database.Database,
  monthKey: string,
  selectedScenarioId?: string,
): ForecasterViewData {
  const plan = findMonthlyBudgetPlan(db, monthKey);
  if (!plan) return emptyView(monthKey);

  const categories = new Map(
    listCategories(db).map((category) => [category.id, category]),
  );
  const buckets = new Map(
    listSavingsBuckets(db, { includeArchived: true }).map((bucket) => [
      bucket.id,
      bucket,
    ]),
  );
  const categoryAllocations = new Map(
    resolveCategoryAllocations(db, plan.id).map(({ id, amount }) => [
      id,
      amount,
    ]),
  );
  const bucketAllocations = new Map(
    plan.allocations.flatMap(({ bucketId, amount }) =>
      bucketId === null ? [] : [[bucketId, amount] as const],
    ),
  );
  const incomeAllocations: number[] = [];
  const expenseAllocations: number[] = [];
  const nudgeTargets: ForecasterNudgeTarget[] = [];
  for (const category of categories.values()) {
    const amount = categoryAllocations.get(category.id);
    if (amount === undefined) continue;
    if (category.umbrella === "income") {
      incomeAllocations.push(amount);
    } else if (category.umbrella === "expense") {
      expenseAllocations.push(amount);
      nudgeTargets.push({
        targetType: "category",
        categoryId: category.id,
        bucketId: null,
        name: category.name,
        isArchived: category.archivedAt !== null,
        baseAllocation: amount,
      });
    }
  }
  for (const bucket of buckets.values()) {
    const amount = bucketAllocations.get(bucket.id);
    if (amount === undefined) continue;
    nudgeTargets.push({
      targetType: "bucket",
      categoryId: null,
      bucketId: bucket.id,
      name: bucket.name,
      isArchived: bucket.archivedAt !== null,
      baseAllocation: amount,
    });
  }
  const budget = calculateBudgetSummary({
    incomeAllocations,
    expenseAllocations,
    savingsAllocations: [...bucketAllocations.values()],
    actualIncomeCentavos: 0,
    actualExpensesCentavos: 0,
    actualSavingsCentavos: 0,
  });
  const activities = listSavingsActivities(db);
  const activeBucketMetrics = [...buckets.values()]
    .filter((bucket) => bucket.archivedAt === null)
    .map((bucket) =>
      calculateBucketMetrics(
        bucket,
        activities,
        monthKey,
        bucketAllocations.get(bucket.id) ?? 0,
      ),
    );
  const { savingsBufferCentavos: startingBuffer } = calculateSavingsKpis({
    activeBucketMetrics,
    monthlyExpensesCentavos: budget.plannedExpensesCentavos,
    hasMonthlyPlan: true,
  });

  const scenarios: ScenarioWithRelations[] = listScenarios(db).map(
    (scenario) => ({
      ...scenario,
      name: scenario.isBaseline ? plan.modelName : scenario.name,
      nudges: scenario.nudges.flatMap((nudge) => {
        const target =
          nudge.categoryId !== null
            ? categories.get(nudge.categoryId)
            : buckets.get(nudge.bucketId!);
        if (!target) return [];
        const baseAllocation =
          (nudge.targetType === "category"
            ? categoryAllocations
            : bucketAllocations
          ).get(target.id) ?? 0;
        return [
          {
            ...nudge,
            targetName: target.name,
            isArchived: target.archivedAt !== null,
            baseAllocation,
            ...deriveNudgeAmounts(baseAllocation, nudge.deltaAmount),
          },
        ];
      }),
    }),
  );
  const baseline = scenarios.find(({ isBaseline }) => isBaseline);
  if (!baseline) throw new Error("Forecaster baseline is missing.");

  const baselineMetrics: BaselineMetrics = {
    planId: plan.id,
    modelName: plan.modelName,
    monthlyIncome: budget.expectedIncomeCentavos,
    monthlyExpense: budget.plannedExpensesCentavos,
    monthlySavings: budget.plannedSavingsCentavos,
    monthlyUnallocated: budget.unallocatedCentavos,
    startingBuffer,
    runwayMonths: null,
    verdict: calculateVerdict(0, 0),
  };
  const comparisonMetrics = scenarios.map((scenario) =>
    calculateScenarioMetrics(baselineMetrics, scenario),
  );
  const baselineResult = comparisonMetrics.find(
    ({ scenarioId }) => scenarioId === baseline.id,
  )!;
  const selectedMetrics =
    comparisonMetrics.find(
      ({ scenarioId }) => scenarioId === selectedScenarioId,
    ) ?? baselineResult;

  return {
    baselineName: plan.modelName,
    appliedMonthKey: monthKey,
    activeScenarioId: selectedMetrics.scenarioId,
    hasAppliedPlan: true,
    scenarios,
    nudgeTargets,
    baselineMetrics: {
      ...baselineMetrics,
      runwayMonths: baselineResult.runwayMonths,
      verdict: baselineResult.verdict,
    },
    selectedMetrics,
    comparisonMetrics,
    outlook: calculate24MonthOutlook(
      baselineMetrics.monthlyUnallocated,
      scenarios,
      monthKey,
    ),
  };
}

export async function getForecasterView(
  selectedScenarioId?: string,
): Promise<ForecasterViewData> {
  await connection();
  const db = getDatabase();
  return db.transaction(() =>
    readForecasterView(db, currentMonthKey(), selectedScenarioId),
  )();
}

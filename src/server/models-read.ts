import "server-only";
import { connection } from "next/server";
import type { BudgetAllocationLine } from "@/domain/budget";
import { hasTemplateDivergedFromPlan } from "@/domain/budget";
import { calculateBudgetSummary } from "@/domain/budget-calculations";
import { currentMonthKey, isValidMonthKey } from "@/domain/month";
import { getDatabase } from "./db/database";
import { listCategories } from "./categories-store";
import { listSavingsBuckets, listSavingsActivities } from "./savings-store";
import { listEntriesForMonth } from "./entries-store";
import { listBudgetModels, findMonthlyBudgetPlan } from "./models-store";
export async function getModelsView(monthKey?: string) {
  await connection();
  const currentMonth = currentMonthKey(),
    month = isValidMonthKey(monthKey) ? monthKey : currentMonth;
  const db = getDatabase();
  const models = listBudgetModels(db),
    plan = findMonthlyBudgetPlan(db, month);
  const allCategories = listCategories(db, { includeMerged: true }),
    allBuckets = listSavingsBuckets(db, { includeArchived: true });
  const actualByCategory = new Map<string, number>(),
    actualByBucket = new Map<string, number>();
  for (const e of listEntriesForMonth(db, month))
    actualByCategory.set(
      e.categoryId,
      (actualByCategory.get(e.categoryId) ?? 0) + e.amount,
    );
  for (const a of listSavingsActivities(db, { monthKey: month }))
    if (a.kind === "contribution")
      actualByBucket.set(
        a.bucketId,
        (actualByBucket.get(a.bucketId) ?? 0) + a.amount,
      );
  const referencedCategories = new Set<string>(),
    referencedBuckets = new Set<string>();
  for (const line of [
    ...models.flatMap((m) => m.allocations),
    ...(plan?.allocations ?? []),
  ])
    if (line.amount > 0) {
      if (line.categoryId) referencedCategories.add(line.categoryId);
      if (line.bucketId) referencedBuckets.add(line.bucketId);
    }
  const retained = new Set(
    allCategories
      .filter(
        (c) =>
          (c.archivedAt === null && c.mergedIntoCategoryId === null) ||
          referencedCategories.has(c.id) ||
          (actualByCategory.get(c.id) ?? 0) > 0,
      )
      .map((c) => c.id),
  );
  const byId = new Map(allCategories.map((c) => [c.id, c]));
  for (const id of [...retained]) {
    const visited = new Set<string>();
    let next: string | null = id;
    while (next !== null) {
      if (visited.has(next)) throw new Error("Category merge cycle detected.");
      visited.add(next);
      retained.add(next);
      const c = byId.get(next);
      if (!c) throw new Error(`Missing merge category: ${next}`);
      next = c.mergedIntoCategoryId;
    }
  }
  const categories = allCategories
    .filter((c) => retained.has(c.id))
    .map((c) => ({
      id: c.id,
      umbrella: c.umbrella,
      name: c.name,
      color: c.color,
      archived: c.archivedAt !== null,
      merged: c.mergedIntoCategoryId !== null,
      mergedIntoCategoryId: c.mergedIntoCategoryId,
      actualCentavos: actualByCategory.get(c.id) ?? 0,
    }));
  const buckets = allBuckets
    .filter(
      (b) =>
        b.archivedAt === null ||
        referencedBuckets.has(b.id) ||
        (actualByBucket.get(b.id) ?? 0) > 0,
    )
    .map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      archived: b.archivedAt !== null,
      actualCentavos: actualByBucket.get(b.id) ?? 0,
    }));
  const categoryById = new Map(allCategories.map((c) => [c.id, c]));
  const actualIncomeCentavos = categories
      .filter((c) => c.umbrella === "income")
      .reduce((n, c) => n + c.actualCentavos, 0),
    actualExpensesCentavos = categories
      .filter((c) => c.umbrella === "expense")
      .reduce((n, c) => n + c.actualCentavos, 0),
    actualSavingsCentavos = buckets.reduce((n, b) => n + b.actualCentavos, 0);
  function values(lines: readonly BudgetAllocationLine[]) {
    return {
      summary: calculateBudgetSummary({
        incomeAllocations: lines
          .filter(
            (l) =>
              l.categoryId &&
              categoryById.get(l.categoryId)?.umbrella === "income",
          )
          .map((l) => l.amount),
        expenseAllocations: lines
          .filter(
            (l) =>
              l.categoryId &&
              categoryById.get(l.categoryId)?.umbrella === "expense",
          )
          .map((l) => l.amount),
        savingsAllocations: lines
          .filter((l) => l.targetType === "bucket")
          .map((l) => l.amount),
        actualIncomeCentavos,
        actualExpensesCentavos,
        actualSavingsCentavos,
      }),
      allocationsByCategory: Object.fromEntries(
        lines
          .filter((l) => l.categoryId !== null)
          .map((l) => [l.categoryId!, l.amount]),
      ),
      allocationsByBucket: Object.fromEntries(
        lines
          .filter((l) => l.bucketId !== null)
          .map((l) => [l.bucketId!, l.amount]),
      ),
    };
  }
  const source = plan
    ? models.find((m) => m.id === plan.sourceModelId)
    : undefined;
  const hasTemplateDiverged = !!(
    plan &&
    source &&
    hasTemplateDivergedFromPlan(
      source,
      plan,
      allCategories
        .filter((c) => c.archivedAt === null && c.mergedIntoCategoryId === null)
        .map((c) => c.id),
      allBuckets.filter((b) => b.archivedAt === null).map((b) => b.id),
    )
  );
  const appliedPlan = plan
    ? {
        id: plan.id,
        monthKey: plan.monthKey,
        sourceModelId: plan.sourceModelId,
        modelName: plan.modelName,
        isRevised: plan.isRevised,
        hasTemplateDiverged,
        ...values(plan.allocations),
      }
    : null;
  return {
    month,
    currentMonth,
    models: models.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      ...values(m.allocations),
      badge:
        plan?.sourceModelId !== m.id
          ? null
          : plan.isRevised
            ? ("REVISED" as const)
            : hasTemplateDiverged
              ? ("DIVERGED" as const)
              : ("ACTIVE" as const),
    })),
    appliedPlan,
    categories,
    buckets,
  };
}
export type ModelsViewData = Awaited<ReturnType<typeof getModelsView>>;

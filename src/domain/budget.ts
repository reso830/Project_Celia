import type { Centavos } from "./amount";

export type AllocationTargetType = "category" | "bucket";

export type BudgetAllocationLine = {
  id: string;
  targetType: AllocationTargetType;
  categoryId: string | null;
  bucketId: string | null;
  amount: Centavos;
  updatedAt: string;
};

export type BudgetModel = {
  id: string;
  name: string;
  nameKey: string;
  description: string | null;
  displayOrder: number;
  allocations: BudgetAllocationLine[];
  createdAt: string;
  updatedAt: string;
};

export type MonthlyBudgetPlan = {
  id: string;
  monthKey: string;
  sourceModelId: string | null;
  modelName: string;
  isRevised: boolean;
  allocations: BudgetAllocationLine[];
  appliedAt: string;
  updatedAt: string;
};

export function hasTemplateDivergedFromPlan(
  model: BudgetModel,
  plan: MonthlyBudgetPlan,
  activeCategoryIds: readonly string[],
  activeBucketIds: readonly string[],
): boolean {
  const categories = new Set(activeCategoryIds),
    buckets = new Set(activeBucketIds);
  const normalized = (
    lines: readonly BudgetAllocationLine[],
    activeOnly: boolean,
  ) =>
    lines
      .filter(
        (l) =>
          l.amount !== 0 &&
          (!activeOnly ||
            (l.targetType === "category"
              ? categories.has(l.categoryId!)
              : buckets.has(l.bucketId!))),
      )
      .map(
        (l) =>
          [`${l.targetType}:${l.categoryId ?? l.bucketId}`, l.amount] as const,
      )
      .sort(([a], [b]) => a.localeCompare(b));
  return (
    JSON.stringify(normalized(model.allocations, true)) !==
    JSON.stringify(normalized(plan.allocations, false))
  );
}

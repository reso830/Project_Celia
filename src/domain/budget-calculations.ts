import type { Centavos } from "./amount";
import type { HexColor } from "./color";

export type VarianceTone = "green" | "amber" | "red" | "muted";

export type IncomeAllocationSegment = {
  key: "expenses" | "savings" | "unallocated";
  label: "Expenses" | "Savings" | "Unallocated";
  amountCentavos: Centavos;
  widthPercent: number;
  displayPercent: number;
  color: string;
};

export type BudgetSummaryTotals = {
  expectedIncomeCentavos: Centavos;
  plannedExpensesCentavos: Centavos;
  plannedSavingsCentavos: Centavos;
  unallocatedCentavos: number;
  actualIncomeCentavos: Centavos;
  actualExpensesCentavos: Centavos;
  actualSavingsCentavos: Centavos;
  actualUnallocatedCentavos: number;
  unallocatedDeltaCentavos: number;
  unallocatedDeltaTone: VarianceTone;
  isFullyAllocated: boolean;
  isOverallocated: boolean;
  segments: IncomeAllocationSegment[];
};

export type MergedAllocationSource = {
  categoryId: string;
  categoryName: string;
  amountCentavos: Centavos;
};

export type BudgetComparisonRow = {
  targetType: "category" | "bucket";
  umbrella: "income" | "expense" | "savings";
  targetId: string;
  name: string;
  color: HexColor | null;
  archived: boolean;
  merged: boolean;
  mergedIntoCategoryId: string | null;
  mergedIntoCategoryName: string | null;
  isFoldedIntoMergeTarget: boolean;
  mergedSources: MergedAllocationSource[];
  plannedCentavos: Centavos;
  rawPlannedCentavos: Centavos;
  actualCentavos: Centavos;
  deltaCentavos: number;
  remainingCentavos: Centavos;
  overspentCentavos: Centavos;
  utilizationPercent: number | null;
  isOverspentZeroBudget: boolean;
  tone: VarianceTone;
};

const sum = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0);
function varianceTone(delta: number, savings = false): VarianceTone {
  return delta > 0
    ? "green"
    : delta < 0
      ? savings
        ? "amber"
        : "red"
      : "muted";
}
export function calculateBudgetSummary({
  incomeAllocations,
  expenseAllocations,
  savingsAllocations,
  actualIncomeCentavos,
  actualExpensesCentavos,
  actualSavingsCentavos,
}: {
  incomeAllocations: readonly Centavos[];
  expenseAllocations: readonly Centavos[];
  savingsAllocations: readonly Centavos[];
  actualIncomeCentavos: Centavos;
  actualExpensesCentavos: Centavos;
  actualSavingsCentavos: Centavos;
}): BudgetSummaryTotals {
  const expectedIncomeCentavos = sum(incomeAllocations),
    plannedExpensesCentavos = sum(expenseAllocations),
    plannedSavingsCentavos = sum(savingsAllocations);
  const unallocatedCentavos =
    expectedIncomeCentavos - plannedExpensesCentavos - plannedSavingsCentavos;
  const actualUnallocatedCentavos =
    actualIncomeCentavos - actualExpensesCentavos - actualSavingsCentavos;
  const unallocatedDeltaCentavos =
    actualUnallocatedCentavos - unallocatedCentavos;
  const allocTotal =
    plannedExpensesCentavos +
    plannedSavingsCentavos +
    Math.max(0, unallocatedCentavos);
  const parts: {
    key: IncomeAllocationSegment["key"];
    label: IncomeAllocationSegment["label"];
    amountCentavos: number;
    color: string;
  }[] = [
    {
      key: "expenses",
      label: "Expenses",
      amountCentavos: plannedExpensesCentavos,
      color: "#8c8378",
    },
    {
      key: "savings",
      label: "Savings",
      amountCentavos: plannedSavingsCentavos,
      color: "#2f7d78",
    },
    {
      key: "unallocated",
      label: "Unallocated",
      amountCentavos: Math.max(0, unallocatedCentavos),
      color: "#c3cac9",
    },
  ];
  return {
    expectedIncomeCentavos,
    plannedExpensesCentavos,
    plannedSavingsCentavos,
    unallocatedCentavos,
    actualIncomeCentavos,
    actualExpensesCentavos,
    actualSavingsCentavos,
    actualUnallocatedCentavos,
    unallocatedDeltaCentavos,
    unallocatedDeltaTone: varianceTone(unallocatedDeltaCentavos),
    isFullyAllocated: unallocatedCentavos === 0 && expectedIncomeCentavos > 0,
    isOverallocated: unallocatedCentavos < 0,
    segments:
      allocTotal === 0
        ? []
        : parts
            .filter((p) => p.amountCentavos > 0)
            .map((p) => ({
              ...p,
              widthPercent: (p.amountCentavos / allocTotal) * 100,
              displayPercent: Math.round((p.amountCentavos * 100) / allocTotal),
            })),
  };
}
export type ComparisonCategory = {
  id: string;
  name: string;
  color: HexColor;
  umbrella: "income" | "expense";
  archived: boolean;
  merged: boolean;
  mergedIntoCategoryId: string | null;
  actualCentavos: Centavos;
};
export type ComparisonBucket = {
  id: string;
  name: string;
  archived: boolean;
  actualCentavos: Centavos;
};
export function resolveMergedCategoryTarget(
  categoryId: string,
  categoriesById: ReadonlyMap<string, ComparisonCategory>,
): ComparisonCategory {
  const visited = new Set<string>();
  let id = categoryId;
  while (true) {
    if (visited.has(id)) throw new Error("Category merge cycle detected.");
    visited.add(id);
    const category = categoriesById.get(id);
    if (!category) throw new Error(`Missing merge category: ${id}`);
    if (category.mergedIntoCategoryId === null) return category;
    id = category.mergedIntoCategoryId;
  }
}
export function calculateBudgetComparisonRows({
  categories,
  buckets,
  plannedByCategory,
  plannedByBucket,
  foldMergedCategories = false,
}: {
  categories: readonly ComparisonCategory[];
  buckets: readonly ComparisonBucket[];
  plannedByCategory: Readonly<Record<string, Centavos>>;
  plannedByBucket: Readonly<Record<string, Centavos>>;
  foldMergedCategories?: boolean;
}): BudgetComparisonRow[] {
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const folded = new Map<string, MergedAllocationSource[]>();
  if (foldMergedCategories) {
    for (const c of categories) {
      if (!c.mergedIntoCategoryId) continue;
      const target = resolveMergedCategoryTarget(c.id, categoriesById);
      const amountCentavos = plannedByCategory[c.id] ?? 0;
      if (amountCentavos > 0)
        folded.set(target.id, [
          ...(folded.get(target.id) ?? []),
          { categoryId: c.id, categoryName: c.name, amountCentavos },
        ]);
    }
  }
  function row(
    targetType: "category" | "bucket",
    c: ComparisonCategory | ComparisonBucket,
  ): BudgetComparisonRow {
    const category =
      targetType === "category" ? (c as ComparisonCategory) : null;
    const umbrella = category?.umbrella ?? "savings";
    const rawPlannedCentavos =
      (category ? plannedByCategory : plannedByBucket)[c.id] ?? 0;
    const isFoldedIntoMergeTarget = !!(
      foldMergedCategories && category?.mergedIntoCategoryId
    );
    const target = isFoldedIntoMergeTarget
      ? resolveMergedCategoryTarget(c.id, categoriesById)
      : null;
    const mergedSources = category ? (folded.get(c.id) ?? []) : [];
    const plannedCentavos =
      rawPlannedCentavos + sum(mergedSources.map((s) => s.amountCentavos));
    const actualCentavos = c.actualCentavos;
    const deltaCentavos = isFoldedIntoMergeTarget
      ? 0
      : umbrella === "expense"
        ? plannedCentavos - actualCentavos
        : actualCentavos - plannedCentavos;
    return {
      targetType,
      umbrella,
      targetId: c.id,
      name: c.name,
      color: category?.color ?? null,
      archived: c.archived,
      merged: category?.merged ?? false,
      mergedIntoCategoryId: category?.mergedIntoCategoryId ?? null,
      mergedIntoCategoryName: target?.name ?? null,
      isFoldedIntoMergeTarget,
      mergedSources,
      plannedCentavos,
      rawPlannedCentavos,
      actualCentavos,
      deltaCentavos,
      remainingCentavos:
        isFoldedIntoMergeTarget || umbrella === "income"
          ? 0
          : Math.max(0, plannedCentavos - actualCentavos),
      overspentCentavos:
        !isFoldedIntoMergeTarget && umbrella === "expense"
          ? Math.max(0, actualCentavos - plannedCentavos)
          : 0,
      utilizationPercent:
        isFoldedIntoMergeTarget || plannedCentavos === 0
          ? null
          : Math.round((actualCentavos * 100) / plannedCentavos),
      isOverspentZeroBudget:
        !isFoldedIntoMergeTarget &&
        umbrella === "expense" &&
        plannedCentavos === 0 &&
        actualCentavos > 0,
      tone: varianceTone(deltaCentavos, umbrella === "savings"),
    };
  }
  return [
    ...categories.map((c) => row("category", c)),
    ...buckets.map((b) => row("bucket", b)),
  ];
}
export function calculateExpenseMixStops(
  expenseRows: readonly BudgetComparisonRow[],
) {
  const rows = expenseRows.filter(
    (r) =>
      r.umbrella === "expense" &&
      !r.isFoldedIntoMergeTarget &&
      r.plannedCentavos > 0,
  );
  const total = sum(rows.map((r) => r.plannedCentavos));
  let running = 0;
  return rows.map((r) => {
    const startPercent = (running / total) * 100;
    running += r.plannedCentavos;
    return {
      targetId: r.targetId,
      color: r.color,
      startPercent,
      endPercent: (running / total) * 100,
    };
  });
}
export function calculateDivergingBars(
  expenseComparisonRows: readonly BudgetComparisonRow[],
) {
  const rows = expenseComparisonRows.filter(
    (r) => r.umbrella === "expense" && !r.isFoldedIntoMergeTarget,
  );
  const max = Math.max(0, ...rows.map((r) => Math.abs(r.deltaCentavos)));
  return rows.map((r) => {
    const height =
      max === 0 || r.deltaCentavos === 0
        ? 0
        : Math.max(3, (Math.abs(r.deltaCentavos) / max) * 60);
    return {
      targetId: r.targetId,
      label: r.name.slice(0, 4),
      color: r.color,
      deltaCentavos: r.deltaCentavos,
      upBar: r.deltaCentavos > 0 ? height : 0,
      downBar: r.deltaCentavos < 0 ? height : 0,
    };
  });
}

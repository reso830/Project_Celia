import type { Centavos } from "./amount";
import type { SavingsBucket, SavingsActivity } from "./savings";

export type BucketDerivedMetrics = {
  bucket: SavingsBucket;
  currentBalanceCentavos: Centavos;
  totalContributionsCentavos: Centavos;
  totalWithdrawalsCentavos: Centavos;
  remainingToTargetCentavos: Centavos | null;
  progressPercent: number | null;
  progressBarPercent: number;
  monthlyContributionsCentavos: Centavos;
  monthlyWithdrawalsCentavos: Centavos;
  plannedMonthlyCentavos: Centavos;
  monthlyShortfallCentavos: Centavos;
};

export type FundedKpiStatus =
  "short" | "on_plan" | "no_savings_planned" | "no_plan";

export type SavingsKpiSummary = {
  activeBucketCount: number;
  heldInBucketsCentavos: Centavos;
  savingsBufferCentavos: Centavos;
  monthlyExpensesCentavos: Centavos;
  runwayMonths: number | null;
  monthlyFundedCentavos: Centavos;
  monthlyPlannedSavingsCentavos: Centavos;
  monthlyShortfallCentavos: Centavos;
  hasMonthlyPlan: boolean;
  fundedStatus: FundedKpiStatus;
};

export function calculateBucketMetrics(
  bucket: SavingsBucket,
  activities: readonly SavingsActivity[],
  monthKey: string,
  plannedMonthlyCentavos: Centavos,
): BucketDerivedMetrics {
  let totalContributionsCentavos = 0,
    totalWithdrawalsCentavos = 0,
    monthlyContributionsCentavos = 0,
    monthlyWithdrawalsCentavos = 0;
  for (const a of activities) {
    if (a.bucketId !== bucket.id) continue;
    if (a.kind === "contribution") {
      totalContributionsCentavos += a.amount;
      if (a.date.slice(0, 7) === monthKey)
        monthlyContributionsCentavos += a.amount;
    } else {
      totalWithdrawalsCentavos += a.amount;
      if (a.date.slice(0, 7) === monthKey)
        monthlyWithdrawalsCentavos += a.amount;
    }
  }
  const currentBalanceCentavos =
    bucket.openingBalance +
    totalContributionsCentavos -
    totalWithdrawalsCentavos;
  const progressPercent =
    bucket.targetAmount === null
      ? null
      : Math.floor((currentBalanceCentavos * 100) / bucket.targetAmount);
  return {
    bucket,
    currentBalanceCentavos,
    totalContributionsCentavos,
    totalWithdrawalsCentavos,
    monthlyContributionsCentavos,
    monthlyWithdrawalsCentavos,
    plannedMonthlyCentavos,
    monthlyShortfallCentavos: Math.max(
      0,
      plannedMonthlyCentavos - monthlyContributionsCentavos,
    ),
    remainingToTargetCentavos:
      bucket.targetAmount === null
        ? null
        : Math.max(0, bucket.targetAmount - currentBalanceCentavos),
    progressPercent,
    progressBarPercent:
      progressPercent === null
        ? 100
        : Math.max(0, Math.min(100, progressPercent)),
  };
}
export function calculateSavingsKpis({
  activeBucketMetrics,
  monthlyExpensesCentavos,
  hasMonthlyPlan,
}: {
  activeBucketMetrics: readonly BucketDerivedMetrics[];
  monthlyExpensesCentavos: Centavos;
  hasMonthlyPlan: boolean;
}): SavingsKpiSummary {
  const active = activeBucketMetrics.filter(
    (m) => m.bucket.archivedAt === null,
  );
  const sum = (value: (m: BucketDerivedMetrics) => number) =>
    active.reduce((total, m) => total + value(m), 0);
  const savingsBufferCentavos = sum((m) =>
    m.bucket.countsTowardBuffer ? m.currentBalanceCentavos : 0,
  );
  const monthlyPlannedSavingsCentavos = sum((m) => m.plannedMonthlyCentavos);
  const monthlyShortfallCentavos = sum((m) => m.monthlyShortfallCentavos);
  return {
    activeBucketCount: active.length,
    heldInBucketsCentavos: sum((m) => m.currentBalanceCentavos),
    savingsBufferCentavos,
    monthlyExpensesCentavos,
    runwayMonths:
      monthlyExpensesCentavos === 0
        ? null
        : Math.round((savingsBufferCentavos * 10) / monthlyExpensesCentavos) /
          10,
    monthlyFundedCentavos: sum((m) => m.monthlyContributionsCentavos),
    monthlyPlannedSavingsCentavos,
    monthlyShortfallCentavos,
    hasMonthlyPlan,
    fundedStatus: !hasMonthlyPlan
      ? "no_plan"
      : monthlyPlannedSavingsCentavos === 0
        ? "no_savings_planned"
        : monthlyShortfallCentavos > 0
          ? "short"
          : "on_plan",
  };
}

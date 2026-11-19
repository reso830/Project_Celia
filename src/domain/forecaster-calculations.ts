import type { Centavos } from "@/domain/amount";
import type {
  BaselineMetrics,
  ForecastVerdict,
  OutlookData,
  ScenarioMetrics,
  ScenarioWithRelations,
} from "@/domain/forecaster";

const OUTLOOK_MONTHS = 24;
const MILESTONE_INDICES = [0, 6, 12, 23];
const NUDGE_STEP_CENTAVOS = 50_000;

export interface NudgeStepResult {
  nextAllocation: Centavos;
  nextDelta: Centavos;
  freedAmount: Centavos;
  fillPercent: number;
}

export function calculateVerdict(
  runway: number | null,
  monthlyUnallocated: Centavos,
): ForecastVerdict {
  if (monthlyUnallocated >= 0 && (runway === null || runway >= 6)) {
    return { tier: "Comfortable", statusTone: "favourable" };
  }
  if (runway !== null && runway >= (monthlyUnallocated < 0 ? 6 : 3)) {
    return { tier: "Tight but doable", statusTone: "warning" };
  }
  return { tier: "Risky buffer", statusTone: "critical" };
}

function calculateMonthlyAdjustments(scenario: ScenarioWithRelations) {
  const eventCost = scenario.events.reduce(
    (total, event) => total + event.monthlyAmount,
    0,
  );
  let expenseChange = eventCost;
  let savingsChange = 0;
  for (const nudge of scenario.nudges) {
    if (nudge.targetType === "category") {
      expenseChange -= nudge.freedAmount;
    } else {
      savingsChange -= nudge.freedAmount;
    }
  }
  return { expenseChange, unallocatedChange: -expenseChange - savingsChange };
}

export function calculateScenarioMetrics(
  baseline: BaselineMetrics,
  scenario: ScenarioWithRelations,
): ScenarioMetrics {
  const { expenseChange, unallocatedChange } =
    calculateMonthlyAdjustments(scenario);
  const monthlyExpense = baseline.monthlyExpense + expenseChange;
  const monthlyUnallocated = baseline.monthlyUnallocated + unallocatedChange;
  const bufferAfter = baseline.startingBuffer - scenario.drawAmount;
  let runwayMonths: number | null = 0;
  if (bufferAfter > 0) {
    runwayMonths =
      monthlyExpense === 0
        ? null
        : Math.round((bufferAfter * 10) / monthlyExpense) / 10;
  }
  return {
    scenarioId: scenario.id,
    monthlyExpense,
    monthlyUnallocated,
    drawnFromBuffer: scenario.drawAmount,
    bufferAfter,
    runwayMonths,
    verdict: calculateVerdict(runwayMonths, monthlyUnallocated),
  };
}

export function calculate24MonthOutlook(
  baselineUnallocated: Centavos,
  scenarios: readonly ScenarioWithRelations[],
  startMonthKey: string,
): OutlookData {
  const alternatives = scenarios
    .filter((scenario) => !scenario.isBaseline)
    .map((scenario) => ({
      scenario,
      unallocated:
        baselineUnallocated +
        calculateMonthlyAdjustments(scenario).unallocatedChange,
    }));

  const levels = alternatives.map(({ unallocated }) => unallocated);
  const domainLo = Math.min(0, baselineUnallocated, ...levels) * 1.25;
  const highest = Math.max(0, baselineUnallocated, ...levels);
  const domainHi = highest === 0 && domainLo === 0 ? 1 : highest * 1.15;
  const span = domainHi - domainLo || 1;
  const zeroRuleRatio = domainHi / span;
  const isNegative = baselineUnallocated < 0;
  const barRegion = isNegative ? -domainLo : domainHi;
  const heightRatioInContainer =
    Math.abs(baselineUnallocated) / (barRegion || 1);

  const [startYear, startMonth] = startMonthKey.split("-").map(Number);
  const bars = Array.from({ length: OUTLOOK_MONTHS }, (_, monthIndex) => {
    const monthOffset = startMonth - 1 + monthIndex;
    const year = String(startYear + Math.floor(monthOffset / 12)).padStart(
      4,
      "0",
    );
    const month = String((monthOffset % 12) + 1).padStart(2, "0");
    return {
      monthIndex,
      monthKey: `${year}-${month}`,
      unallocatedCentavos: baselineUnallocated,
      heightRatioInContainer,
      isNegative,
    };
  });
  return {
    bars,
    polylines: alternatives.map(({ scenario, unallocated }) => ({
      scenarioId: scenario.id,
      points: bars.map(({ monthIndex }) => {
        const value =
          monthIndex < scenario.startMonth ? baselineUnallocated : unallocated;
        return {
          x: monthIndex / (OUTLOOK_MONTHS - 1),
          y: (domainHi - value) / span,
        };
      }),
    })),
    zeroRuleRatio,
    milestones: MILESTONE_INDICES.map((index) => ({
      index,
      monthKey: bars[index].monthKey,
    })),
  };
}

export function deriveNudgeAmounts(
  baseAllocation: Centavos,
  deltaAmount: Centavos,
): { adjustedAllocation: Centavos; freedAmount: Centavos } {
  const adjustedAllocation = Math.max(0, baseAllocation + deltaAmount);
  return {
    adjustedAllocation,
    freedAmount: baseAllocation - adjustedAllocation,
  };
}

export function calculateNudgeFillPercent(
  baseAllocation: Centavos,
  adjustedAllocation: Centavos,
): number {
  if (baseAllocation === 0) return 50;
  return Math.max(
    2,
    Math.min(98, Math.round((adjustedAllocation / baseAllocation) * 50) + 25),
  );
}

export function stepCategoryNudge(
  baseAllocation: Centavos,
  currentAllocation: Centavos,
  direction: 1 | -1,
): NudgeStepResult {
  const nextAllocation = Math.max(
    0,
    currentAllocation + direction * NUDGE_STEP_CENTAVOS,
  );
  return {
    nextAllocation,
    nextDelta: nextAllocation - baseAllocation,
    freedAmount: baseAllocation - nextAllocation,
    fillPercent: calculateNudgeFillPercent(baseAllocation, nextAllocation),
  };
}

import type { Centavos } from "@/domain/amount";

export type ScenarioEventType = "financed purchase" | "recurring" | "seasonal";
export type ForecastVerdictTier =
  "Comfortable" | "Tight but doable" | "Risky buffer";
export type ForecastStatusTone = "favourable" | "warning" | "critical";
export type PaletteKey = "teal" | "purple" | "gold" | "blue" | "slate";

export interface ForecastVerdict {
  tier: ForecastVerdictTier;
  statusTone: ForecastStatusTone;
}

export interface ScenarioEvent {
  id: string;
  scenarioId: string;
  name: string;
  type: ScenarioEventType;
  monthlyAmount: Centavos; // > 0
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioNudge {
  id: string;
  scenarioId: string;
  targetType: "category" | "bucket";
  categoryId: string | null;
  bucketId: string | null;
  deltaAmount: Centavos; // Signed integer: negative frees money, positive increases allocation
  updatedAt: string;
}

export interface ScenarioNudgeDerived extends ScenarioNudge {
  targetName: string;
  isArchived: boolean;
  baseAllocation: Centavos;
  adjustedAllocation: Centavos; // max(0, baseAllocation + deltaAmount)
  freedAmount: Centavos; // baseAllocation - adjustedAllocation
}

export interface Scenario {
  id: string;
  name: string;
  shortLabel: string;
  paletteKey: PaletteKey | null; // null for baseline; one of the 5 keys for alternatives
  startMonth: number; // 0..23 relative offset
  drawAmount: Centavos; // >= 0
  isBaseline: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioWithRelations extends Scenario {
  events: ScenarioEvent[];
  nudges: ScenarioNudgeDerived[];
}

export interface BaselineMetrics {
  planId: string | null; // null when hasAppliedPlan is false
  modelName: string; // e.g. "Baseline 2026", or empty string when no plan applied
  monthlyIncome: Centavos;
  monthlyExpense: Centavos;
  monthlySavings: Centavos;
  monthlyUnallocated: Centavos;
  startingBuffer: Centavos;
  runwayMonths: number | null; // null if monthlyExpense == 0 and startingBuffer > 0
  verdict: ForecastVerdict;
}

export interface ScenarioMetrics {
  scenarioId: string;
  monthlyExpense: Centavos;
  monthlyUnallocated: Centavos;
  drawnFromBuffer: Centavos;
  bufferAfter: Centavos;
  runwayMonths: number | null; // null if monthlyExpense == 0 and bufferAfter > 0; 0.0 if bufferAfter <= 0
  verdict: ForecastVerdict;
}

export interface OutlookBar {
  monthIndex: number; // 0..23
  monthKey: string; // e.g. "2026-11"
  unallocatedCentavos: Centavos;
  heightRatioInContainer: number; // Bar height relative to its region above or below the zero line
  isNegative: boolean; // true if baseline unallocated < 0 (hangs down)
}

export interface OutlookPolyline {
  scenarioId: string;
  points: { x: number; y: number }[]; // Normalized (x, y) in [0, 1] x [0, 1]
}

export interface OutlookData {
  bars: OutlookBar[];
  polylines: OutlookPolyline[];
  zeroRuleRatio: number; // 0..1 vertical coordinate of the zero rule line
  milestones: { index: number; monthKey: string }[];
}

export type ForecasterNudgeTarget = {
  name: string;
  isArchived: boolean;
  baseAllocation: Centavos;
} & (
  | { targetType: "category"; categoryId: string; bucketId: null }
  | { targetType: "bucket"; categoryId: null; bucketId: string }
);

export interface ForecasterViewData {
  baselineName: string;
  appliedMonthKey: string; // e.g. "2026-11"
  activeScenarioId: string;
  hasAppliedPlan: boolean;
  scenarios: ScenarioWithRelations[];
  nudgeTargets: ForecasterNudgeTarget[];
  baselineMetrics: BaselineMetrics;
  selectedMetrics: ScenarioMetrics;
  comparisonMetrics: ScenarioMetrics[];
  outlook: OutlookData;
}

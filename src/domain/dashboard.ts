import type { Centavos } from "@/domain/amount";
import type { HexColor } from "@/domain/color";
import type { ClassifiableUmbrella } from "@/domain/umbrella";

export type DashboardMemberFilter = "all" | "household" | string;

export type DashboardFilterState = {
  readonly monthKey: string;
  readonly memberFilter: DashboardMemberFilter;
  readonly categoryId: string | "all";
  readonly range: 6 | 12;
};

export type SavingsBufferHeroData = {
  readonly bufferCentavos: Centavos;
  readonly runwayMonths: number | null;
  readonly sparklinePoints: readonly {
    readonly x: number;
    readonly y: number;
  }[]; // 0..1 normalized
  readonly isHouseholdScope: boolean;
};

export type DashboardKpiHistoryMonth = {
  readonly monthKey: string;
  readonly incomeCentavos: Centavos | null;
  readonly expensesCentavos: Centavos | null;
  readonly savingsCentavos: Centavos | null;
  readonly unallocatedCentavos: Centavos | null;
};

export type DashboardKpisData = {
  readonly history: readonly DashboardKpiHistoryMonth[];
  readonly incomeCentavos: Centavos | null;
  readonly incomeDeltaCentavos: Centavos | null;
  readonly expensesCentavos: Centavos | null;
  readonly expensesDeltaCentavos: Centavos | null;
  readonly savingsCentavos: Centavos | null;
  readonly savingsDeltaCentavos: Centavos | null;
  readonly unallocatedCentavos: Centavos | null;
  readonly unallocatedDeltaCentavos: Centavos | null;
  readonly unallocatedScope: "all" | "household" | "member";
};

export type BurnRateDisplayState =
  | "no_plan"
  | "zero_budget_zero_spend"
  | "zero_budget_overspent"
  | "income_category"
  | "under_pace"
  | "on_pace"
  | "over_pace";

export type BurnRateData = {
  readonly utilizationPercent: number | null;
  readonly arcRatio: number; // 0..1
  readonly statusTone: "favourable" | "warning" | "critical" | "neutral";
  readonly state: BurnRateDisplayState;
  readonly hasMonthlyPlan: boolean;
};

export type BudgetTrendBar = {
  readonly monthKey: string;
  readonly actualExpensesCentavos: Centavos;
  readonly heightRatio: number; // 0..1 relative to peak
  readonly isOverspent: boolean;
  readonly isSelected: boolean;
  readonly isUnbudgeted: boolean;
};

export type BudgetTrendData = {
  readonly bars: readonly BudgetTrendBar[];
  readonly budgetLineRatio: number; // 0..1
  readonly budgetCentavos: Centavos;
  readonly range: 6 | 12;
  readonly isApplicable: boolean; // false for income categories
};

export type CategorySpendingRowData = {
  readonly categoryId: string;
  readonly name: string;
  readonly color: HexColor;
  readonly spentCentavos: Centavos;
  readonly budgetCentavos: Centavos;
  readonly progressRatio: number; // 0..1
  readonly deltaCentavos: Centavos; // favourable-positive: budget - spent
  readonly rolloverCentavos: Centavos | null; // current-month unspent or null
  readonly progressTone: BurnRateData["statusTone"];
  readonly statusTone: "favourable" | "warning" | "critical" | "neutral";
  readonly isArchived: boolean;
  readonly isClickable: boolean; // false for archived categories
  readonly isFoldedIntoMergeTarget: boolean;
};

export type CategoriesTableData = {
  readonly rows: readonly CategorySpendingRowData[];
  readonly totalSpentCentavos: Centavos;
  readonly totalBudgetCentavos: Centavos;
  readonly totalDeltaCentavos: Centavos;
  readonly isApplicable: boolean; // false when filtered to an income category
};

export type MemberDistributionSegment = {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly color: HexColor;
  readonly amountCentavos: Centavos;
  readonly widthRatio: number; // 0..1 relative to the largest member total
};

export type MemberDistributionRow = {
  readonly memberId: string | "household";
  readonly name: string;
  readonly totalSpentCentavos: Centavos;
  readonly isArchived: boolean;
  readonly isClickable: boolean; // false for archived members
  readonly isSelected: boolean;
  readonly segments: readonly MemberDistributionSegment[];
};

export type MemberDistributionData = {
  readonly rows: readonly MemberDistributionRow[];
  readonly maxSpendCentavos: Centavos;
  readonly legendSwatches: readonly {
    readonly name: string;
    readonly color: HexColor;
  }[];
  readonly isApplicable: boolean; // false for income categories
};

export type GoalFundingStatus =
  "no_goal" | "funded" | "on_track" | "no_contributions";

export type GoalHighlightData = {
  readonly hasGoal: boolean;
  readonly bucketId: string | null;
  readonly name: string | null;
  readonly currentBalanceCentavos: Centavos;
  readonly targetAmountCentavos: Centavos | null;
  readonly progressRatio: number; // 0..1
  readonly statusTone: "favourable" | "warning" | "neutral";
  readonly status: GoalFundingStatus;
  readonly monthsToTarget: number | null;
  readonly remainingCentavos: Centavos;
  readonly currentMonthFundedCentavos: Centavos;
};

export type UpcomingCommitmentItem = {
  readonly bucketId: string;
  readonly name: string;
  readonly targetMonth: string; // YYYY-MM
  readonly targetAmountCentavos: Centavos;
  readonly currentBalanceCentavos: Centavos;
  readonly remainingCentavos: Centavos;
  readonly isFunded: boolean;
};

export type UpcomingCommitmentsData = {
  readonly commitments: readonly UpcomingCommitmentItem[];
};

export type DashboardModalCategory = {
  readonly id: string;
  readonly umbrella: ClassifiableUmbrella;
  readonly name: string;
  readonly color: HexColor;
  readonly archived: boolean;
  items: { id: string; name: string }[]; // mutable array for EntryModal compatibility
};

export type DashboardModalMember = {
  readonly id: string;
  readonly name: string;
  readonly archived?: boolean;
};

export type DashboardViewData = {
  readonly modelName: string | null; // applied plan for the selected month
  readonly filter: DashboardFilterState;
  readonly hero: SavingsBufferHeroData;
  readonly kpis: DashboardKpisData;
  readonly burnRate: BurnRateData;
  readonly budgetTrend: BudgetTrendData;
  readonly categoriesTable: CategoriesTableData;
  readonly memberDistribution: MemberDistributionData;
  readonly goalHighlight: GoalHighlightData;
  readonly upcomingCommitments: UpcomingCommitmentsData;
  readonly filterMembers: readonly {
    readonly id: string;
    readonly name: string;
  }[];
  readonly filterCategories: readonly {
    readonly id: string;
    readonly name: string;
    readonly umbrella: ClassifiableUmbrella;
  }[];
  readonly modalCategories: readonly DashboardModalCategory[];
  readonly modalMembers: readonly DashboardModalMember[];
};

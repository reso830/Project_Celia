"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EntryModal from "@/components/entries/entry-modal";
import Toast from "@/components/ui/toast";
import type {
  DashboardFilterState,
  DashboardViewData,
} from "@/domain/dashboard";
import DashboardHeader from "./dashboard-header";
import SavingsBufferHero from "./savings-buffer-hero";
import SecondaryKpiGrid from "./secondary-kpi-grid";
import BurnRateGauge from "./burn-rate-gauge";
import BudgetTrendChart from "./budget-trend-chart";
import CategoriesBreakdownTable from "./categories-breakdown-table";
import MemberExpenseDistribution from "./member-expense-distribution";
import GoalHighlightCard from "./goal-highlight-card";
import UpcomingCommitmentsCard from "./upcoming-commitments-card";

export default function DashboardScreen({ data }: { data: DashboardViewData }) {
  const router = useRouter();
  const [entryOpen, setEntryOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    kind: "success" | "error";
  } | null>(null);
  const { filter } = data;
  const ownerFiltered = filter.memberFilter !== "all";
  const expenseCategory = data.filterCategories.find(
    (category) =>
      category.id === filter.categoryId && category.umbrella === "expense",
  );
  const scopeLabel =
    !ownerFiltered && expenseCategory
      ? `${expenseCategory.name} budget utilization`
      : undefined;

  function updateFilter(patch: Partial<DashboardFilterState>) {
    const next = { ...filter, ...patch };
    const params = new URLSearchParams({
      month: next.monthKey,
      member: next.memberFilter,
      category: next.categoryId,
      range: String(next.range),
    });
    router.push(`/?${params}`, { scroll: false });
  }

  return (
    <>
      <DashboardHeader
        filter={filter}
        members={data.filterMembers}
        categories={data.filterCategories}
        onFilterChange={updateFilter}
        onAddEntry={() => setEntryOpen(true)}
      />
      <div className="grid gap-[var(--space-3-5)]">
        <div className="grid gap-[var(--space-3-5)] lg:grid-cols-[minmax(0,35fr)_minmax(0,65fr)]">
          <SavingsBufferHero data={data.hero} />
          <SecondaryKpiGrid
            data={data.kpis}
            hasMonthlyPlan={data.burnRate.hasMonthlyPlan}
            householdSavings={ownerFiltered}
          />
        </div>
        <div className="grid gap-[var(--space-3-5)] lg:grid-cols-[minmax(0,35fr)_minmax(0,65fr)]">
          <BurnRateGauge
            data={data.burnRate}
            monthKey={filter.monthKey}
            householdScope={
              ownerFiltered && data.burnRate.state !== "income_category"
            }
            scopeLabel={scopeLabel}
          />
          <BudgetTrendChart
            data={data.budgetTrend}
            modelName={data.modelName ?? undefined}
            householdBudget={ownerFiltered}
            onRangeChange={(range) => updateFilter({ range })}
            onMonthChange={(monthKey) => updateFilter({ monthKey })}
          />
        </div>
        <div className="grid items-start gap-[var(--space-3-5)] lg:grid-cols-2">
          <CategoriesBreakdownTable
            data={data.categoriesTable}
            monthKey={filter.monthKey}
            memberFilter={filter.memberFilter}
            hasMonthlyPlan={data.burnRate.hasMonthlyPlan}
          />
          <MemberExpenseDistribution
            data={data.memberDistribution}
            onMemberChange={(memberFilter) => updateFilter({ memberFilter })}
          />
        </div>
        <div className="grid items-start gap-[var(--space-3-5)] lg:grid-cols-2">
          <GoalHighlightCard
            data={data.goalHighlight}
            householdScope={ownerFiltered}
          />
          <UpcomingCommitmentsCard
            data={data.upcomingCommitments}
            householdScope={ownerFiltered}
          />
        </div>
      </div>
      <Toast
        message={feedback?.message ?? null}
        kind={feedback?.kind}
        onDismiss={() => setFeedback(null)}
      />
      {entryOpen && (
        <EntryModal
          open
          categories={data.modalCategories}
          members={data.modalMembers}
          onClose={() => setEntryOpen(false)}
          onSaved={(message) => {
            setFeedback({ kind: "success", message });
          }}
          onStale={(message) => {
            setFeedback({ kind: "error", message });
            router.refresh();
          }}
          liveMessage={feedback?.message}
        />
      )}
    </>
  );
}

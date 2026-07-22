"use client";

import { AppHeader } from "@/components/app-header";
import { BucketBreakdownChart } from "@/components/bucket-breakdown-chart";
import { BucketGroupGrid } from "@/components/bucket-group-grid";
import { CashFlowChart } from "@/components/cash-flow-chart";
import { FinancialSummaryCards } from "@/components/financial-summary-cards";
import { IncomeExpenseChart } from "@/components/income-expense-chart";
import { useData } from "@/data";
import { calculateBucketBreakdown } from "@/domain";

export function DashboardEmptyState() {
  const data = useData();
  const categories = data.status === "ready" ? data.categories : [];
  const transactions = data.status === "ready" ? data.transactions : [];
  const bucketColors = data.status === "ready" ? data.bucketColors : [];
  const bucketGroups = data.status === "ready" ? data.bucketGroups : [];
  const breakdown = calculateBucketBreakdown(transactions, categories);

  return (
    <main className="min-h-screen bg-[#eef0f3] px-4 py-6 sm:px-6 lg:px-7">
      <div className="mx-auto w-full max-w-[1100px]">
        <AppHeader activePage="dashboard" />
        <section aria-labelledby="celia-title" className="mt-6">
          <p className="text-sm font-medium text-slate-500">
            Expense tracking, made simple
          </p>
          <h1
            id="celia-title"
            className="text-4xl font-semibold tracking-tight text-slate-950"
          >
            Celia
          </h1>
          <IncomeExpenseChart transactions={transactions} />
          <FinancialSummaryCards transactions={transactions} />
          <CashFlowChart transactions={transactions} />
          <BucketBreakdownChart
            breakdown={breakdown}
            bucketColors={bucketColors}
          />
          <h2 className="mt-6 text-base font-bold text-[#16213f]">
            Bucket groups
          </h2>
          <BucketGroupGrid
            bucketColors={bucketColors}
            bucketGroups={bucketGroups}
            categories={categories}
            emptyMessage="No bucket groups yet."
          />
        </section>
      </div>
    </main>
  );
}

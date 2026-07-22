"use client";

import {
  calculateMonthlyTransactionTotals,
  type MonthlyTransactionTotal,
} from "@/domain/monthly-transaction-totals";
import type { Transaction } from "@/domain/transaction";

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const chartWidth = 640;
const chartHeight = 260;
const chartBaseline = 190;
const chartBarHeight = 150;
const chartLeft = 54;
const chartRight = 28;
const barWidth = 18;
const barGap = 6;

function formatAmount(amount: number): string {
  return currency.format(amount / 100);
}

function ChartGraphic({
  totals,
}: {
  totals: readonly MonthlyTransactionTotal[];
}) {
  const maximum = Math.max(
    ...totals.flatMap(({ income, expense }) => [income, expense]),
  );
  const availableWidth = chartWidth - chartLeft - chartRight;
  const groupWidth = availableWidth / totals.length;
  const barHeight = (amount: number) => (amount / maximum) * chartBarHeight;

  return (
    <>
      <svg
        aria-labelledby="income-expense-graphic-title"
        className="mt-6 h-auto w-full overflow-visible"
        role="img"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      >
        <title id="income-expense-graphic-title">
          Monthly income and expense comparison
        </title>
        <line
          stroke="#cbd5e1"
          strokeWidth="1"
          x1={chartLeft}
          x2={chartWidth - chartRight}
          y1={chartBaseline}
          y2={chartBaseline}
        />
        {totals.map((total, index) => {
          const groupCenter = chartLeft + groupWidth * (index + 0.5);
          const incomeHeight = barHeight(total.income);
          const expenseHeight = barHeight(total.expense);

          return (
            <g key={total.month}>
              <rect
                fill="#10b981"
                height={incomeHeight}
                rx="3"
                width={barWidth}
                x={groupCenter - barGap / 2 - barWidth}
                y={chartBaseline - incomeHeight}
              >
                <title>{`${total.label} income: ${formatAmount(total.income)}`}</title>
              </rect>
              <rect
                fill="#f43f5e"
                height={expenseHeight}
                rx="3"
                width={barWidth}
                x={groupCenter + barGap / 2}
                y={chartBaseline - expenseHeight}
              >
                <title>{`${total.label} expenses: ${formatAmount(total.expense)}`}</title>
              </rect>
              <text
                fill="#64748b"
                fontSize="12"
                textAnchor="middle"
                x={groupCenter}
                y={chartBaseline + 24}
              >
                {total.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="sr-only">
        {totals.map((total) => (
          <li key={total.month}>
            {`${total.label}: Income: ${formatAmount(total.income)}. Expenses: ${formatAmount(total.expense)}.`}
          </li>
        ))}
      </ul>
    </>
  );
}

export function IncomeExpenseChart({
  transactions,
}: {
  transactions: readonly Transaction[];
}) {
  const totals = calculateMonthlyTransactionTotals(transactions);

  return (
    <section
      aria-labelledby="income-expense-title"
      className="mt-6 rounded-2xl bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2
          id="income-expense-title"
          className="text-base font-bold text-[#16213f]"
        >
          Income vs expenses
        </h2>
        <div
          aria-label="Chart legend"
          className="flex gap-3 text-sm text-slate-600"
        >
          <span>
            <span
              aria-hidden
              className="mr-1 inline-block size-2 rounded-sm bg-emerald-500"
            />
            Income
          </span>
          <span>
            <span
              aria-hidden
              className="mr-1 inline-block size-2 rounded-sm bg-rose-500"
            />
            Expenses
          </span>
        </div>
      </div>
      {totals.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">
          No transactions yet. Add transactions to see your monthly income and
          expenses.
        </p>
      ) : (
        <ChartGraphic totals={totals} />
      )}
    </section>
  );
}

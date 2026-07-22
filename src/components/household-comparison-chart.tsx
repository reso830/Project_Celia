"use client";

import {
  calculateMemberTransactionTotals,
  type MemberTransactionTotal,
} from "@/domain/member-transaction-totals";
import type { Member } from "@/domain/member";
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
const maximumBarWidth = 18;
const maximumBarGap = 6;

function formatAmount(amount: number): string {
  return currency.format(amount / 100);
}

function ChartGraphic({
  totals,
}: {
  totals: readonly MemberTransactionTotal[];
}) {
  const maximum = Math.max(
    ...totals.flatMap(({ income, expense }) => [income, expense]),
  );
  const availableWidth = chartWidth - chartLeft - chartRight;
  const groupWidth = availableWidth / totals.length;
  const barGap = Math.min(maximumBarGap, groupWidth * 0.15);
  const barWidth = Math.min(
    maximumBarWidth,
    Math.max(0, (groupWidth - barGap - 1) / 2),
  );
  const barHeight = (amount: number) =>
    maximum === 0 ? 0 : (amount / maximum) * chartBarHeight;

  return (
    <>
      <svg
        aria-labelledby="household-comparison-graphic-title"
        className="mt-6 h-auto w-full overflow-visible"
        role="img"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      >
        <title id="household-comparison-graphic-title">
          Household income and expense comparison
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
            <g key={total.memberId}>
              <rect
                fill="#10b981"
                height={incomeHeight}
                rx="3"
                width={barWidth}
                x={groupCenter - barGap / 2 - barWidth}
                y={chartBaseline - incomeHeight}
              >
                <title>{`${total.name} income: ${formatAmount(total.income)}`}</title>
              </rect>
              <rect
                fill="#f43f5e"
                height={expenseHeight}
                rx="3"
                width={barWidth}
                x={groupCenter + barGap / 2}
                y={chartBaseline - expenseHeight}
              >
                <title>{`${total.name} expenses: ${formatAmount(total.expense)}`}</title>
              </rect>
              <text
                fill="#64748b"
                fontSize="12"
                textAnchor="middle"
                x={groupCenter}
                y={chartBaseline + 24}
              >
                {total.name}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="sr-only">
        {totals.map((total) => (
          <li key={total.memberId}>
            {`${total.name}: Income: ${formatAmount(total.income)}. Expenses: ${formatAmount(total.expense)}.`}
          </li>
        ))}
      </ul>
    </>
  );
}

export function HouseholdComparisonChart({
  members,
  transactions,
}: {
  members: readonly Member[];
  transactions: readonly Transaction[];
}) {
  const totals = calculateMemberTransactionTotals(members, transactions);

  return (
    <section
      aria-labelledby="household-comparison-title"
      className="mt-6 rounded-2xl bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2
          id="household-comparison-title"
          className="text-base font-bold text-[#16213f]"
        >
          Household contributions
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
          No member comparisons yet. Add transactions to compare household
          contributions.
        </p>
      ) : (
        <ChartGraphic totals={totals} />
      )}
    </section>
  );
}

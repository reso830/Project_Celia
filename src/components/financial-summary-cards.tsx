import { calculateFinancialSummary, type Transaction } from "@/domain";

const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const percentFormatter = new Intl.NumberFormat("en-PH", {
  maximumFractionDigits: 1,
});

export function FinancialSummaryCards({
  transactions,
}: {
  transactions: readonly Transaction[];
}) {
  const summary = calculateFinancialSummary(transactions);
  const cards = [
    ["Income", phpFormatter.format(summary.income / 100)],
    ["Expenses", phpFormatter.format(summary.expenses / 100)],
    ["Net", phpFormatter.format(summary.net / 100)],
    ["Savings Rate", `${percentFormatter.format(summary.savingsRate)}%`],
  ] as const;

  return (
    <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(([label, value]) => (
        <div
          className="rounded-xl border border-[#d6dae1] bg-white p-4"
          key={label}
        >
          <dt className="text-sm font-medium text-slate-500">{label}</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-950">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

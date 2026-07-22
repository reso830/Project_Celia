import type { Transaction } from "./transaction";

export interface MonthlyTransactionTotal {
  month: string;
  label: string;
  income: number;
  expense: number;
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1)));
}

export function calculateMonthlyTransactionTotals(
  transactions: readonly Transaction[],
): readonly MonthlyTransactionTotal[] {
  const totals = new Map<string, Omit<MonthlyTransactionTotal, "label">>();

  for (const transaction of transactions) {
    const month = transaction.date.slice(0, 7);
    const current = totals.get(month) ?? { month, income: 0, expense: 0 };
    current[transaction.type] += transaction.amount;
    totals.set(month, current);
  }

  return [...totals.values()]
    .sort((left, right) => left.month.localeCompare(right.month))
    .map((total) => ({ ...total, label: formatMonth(total.month) }));
}

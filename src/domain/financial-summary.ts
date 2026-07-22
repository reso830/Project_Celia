import type { Transaction } from "./transaction";

export interface FinancialSummary {
  income: number;
  expenses: number;
  net: number;
  savingsRate: number;
}

export function calculateFinancialSummary(
  transactions: readonly Transaction[],
): FinancialSummary {
  const { income, expenses } = transactions.reduce(
    (summary, transaction) => {
      if (transaction.type === "income") {
        summary.income += transaction.amount;
      } else {
        summary.expenses += transaction.amount;
      }

      return summary;
    },
    { income: 0, expenses: 0 },
  );
  const net = income - expenses;

  return {
    income,
    expenses,
    net,
    savingsRate: income === 0 ? 0 : (net / income) * 100,
  };
}

import type { Transaction } from "./transaction";

export function calculateTransactionTotal(
  transactions: readonly Transaction[],
): number {
  return transactions.reduce(
    (total, transaction) =>
      total +
      (transaction.type === "income"
        ? transaction.amount
        : -transaction.amount),
    0,
  );
}

import { calculateTransactionTotal } from "@/domain/transaction-total";
import type { Transaction } from "@/domain/transaction";

const transactions: readonly Transaction[] = [
  {
    id: "coffee",
    description: "Coffee",
    category: "Food",
    amountMinor: -450,
    currency: "TWD",
    occurredOn: "2026-07-20",
  },
  {
    id: "salary",
    description: "Salary",
    category: "Income",
    amountMinor: 500000,
    currency: "TWD",
    occurredOn: "2026-07-01",
  },
];

describe("calculateTransactionTotal", () => {
  it("adds integer minor-unit transaction amounts", () => {
    expect(calculateTransactionTotal(transactions)).toBe(499550);
  });

  it("returns zero when no transactions exist", () => {
    expect(calculateTransactionTotal([])).toBe(0);
  });
});

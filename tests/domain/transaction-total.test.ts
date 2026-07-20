import { calculateTransactionTotal } from "@/domain/transaction-total";
import type { Transaction } from "@/domain/transaction";

const transactions: readonly Transaction[] = [
  {
    id: "coffee",
    date: "2026-07-20",
    memberId: "member-alex",
    categoryId: "category-food",
    type: "expense",
    description: "Coffee",
    amount: 450,
    recurring: false,
    currency: "PHP",
  },
  {
    id: "salary",
    date: "2026-07-01",
    memberId: "member-alex",
    categoryId: "category-salary",
    type: "income",
    description: "Salary",
    amount: 500000,
    recurring: false,
    currency: "PHP",
  },
];

describe("calculateTransactionTotal", () => {
  it("derives the signed total from transaction type and positive minor units", () => {
    expect(calculateTransactionTotal(transactions)).toBe(499550);
  });

  it("returns zero when no transactions exist", () => {
    expect(calculateTransactionTotal([])).toBe(0);
  });
});

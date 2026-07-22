import { calculateMonthlyTransactionTotals } from "@/domain/monthly-transaction-totals";
import type { Transaction } from "@/domain/transaction";

const transactions: readonly Transaction[] = [
  {
    id: "july-pay",
    date: "2026-07-01",
    memberId: "alex",
    categoryId: "salary",
    type: "income",
    amount: 500_000,
    recurring: false,
    currency: "PHP",
  },
  {
    id: "july-food",
    date: "2026-07-12",
    memberId: "alex",
    categoryId: "food",
    type: "expense",
    amount: 12_500,
    recurring: false,
    currency: "PHP",
  },
  {
    id: "july-rent",
    date: "2026-07-20",
    memberId: "alex",
    categoryId: "rent",
    type: "expense",
    amount: 25_000,
    recurring: true,
    currency: "PHP",
  },
  {
    id: "june-food",
    date: "2026-06-20",
    memberId: "alex",
    categoryId: "food",
    type: "expense",
    amount: 2_500,
    recurring: false,
    currency: "PHP",
  },
];

describe("calculateMonthlyTransactionTotals", () => {
  it("groups income and expenses into chronological monthly totals", () => {
    expect(calculateMonthlyTransactionTotals(transactions)).toEqual([
      { month: "2026-06", label: "Jun 2026", income: 0, expense: 2_500 },
      {
        month: "2026-07",
        label: "Jul 2026",
        income: 500_000,
        expense: 37_500,
      },
    ]);
  });

  it("returns no monthly totals when transactions are absent", () => {
    expect(calculateMonthlyTransactionTotals([])).toEqual([]);
  });
});

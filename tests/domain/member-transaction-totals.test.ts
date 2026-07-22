import { calculateMemberTransactionTotals } from "@/domain/member-transaction-totals";
import type { Member } from "@/domain/member";
import type { Transaction } from "@/domain/transaction";

const members: readonly Member[] = [
  { id: "zoe", name: "Zoe", color: "#f00" },
  { id: "alex", name: "Alex", color: "#0f0" },
  { id: "mira", name: "Mira", color: "#00f" },
];

const transactions: readonly Transaction[] = [
  {
    id: "zoe-salary",
    date: "2026-07-01",
    memberId: "zoe",
    categoryId: "salary",
    type: "income",
    amount: 500_000,
    recurring: false,
    currency: "PHP",
  },
  {
    id: "zoe-rent",
    date: "2026-07-03",
    memberId: "zoe",
    categoryId: "rent",
    type: "expense",
    amount: 25_000,
    recurring: false,
    currency: "PHP",
  },
  {
    id: "alex-food",
    date: "2026-07-02",
    memberId: "alex",
    categoryId: "food",
    type: "expense",
    amount: 1_250,
    recurring: false,
    currency: "PHP",
  },
  {
    id: "unknown-income",
    date: "2026-07-04",
    memberId: "unknown",
    categoryId: "salary",
    type: "income",
    amount: 800_000,
    recurring: false,
    currency: "PHP",
  },
];

describe("calculateMemberTransactionTotals", () => {
  it("returns alphabetical configured-member totals for members with transactions", () => {
    expect(calculateMemberTransactionTotals(members, transactions)).toEqual([
      { memberId: "alex", name: "Alex", income: 0, expense: 1_250 },
      { memberId: "zoe", name: "Zoe", income: 500_000, expense: 25_000 },
    ]);
  });

  it("returns no totals when configured members have no transactions", () => {
    expect(calculateMemberTransactionTotals(members, [])).toEqual([]);
  });
});

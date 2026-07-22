import { calculateBucketBreakdown } from "@/domain/bucket-breakdown";
import type { Category } from "@/domain/category";
import type { Transaction } from "@/domain/transaction";

const categories: readonly Category[] = [
  { id: "rent", type: "expense", group: " Housing ", name: "Rent" },
  { id: "food", type: "expense", group: "Food", name: "Groceries" },
  { id: "salary", type: "income", group: "Income", name: "Salary" },
];

const transactions: readonly Transaction[] = [
  {
    id: "rent-one",
    date: "2026-07-01",
    memberId: "alex",
    categoryId: "rent",
    type: "expense",
    amount: 2_000,
    recurring: false,
    currency: "PHP",
  },
  {
    id: "rent-two",
    date: "2026-07-02",
    memberId: "alex",
    categoryId: "rent",
    type: "expense",
    amount: 1_000,
    recurring: false,
    currency: "PHP",
  },
  {
    id: "food",
    date: "2026-07-03",
    memberId: "alex",
    categoryId: "food",
    type: "expense",
    amount: 1_250,
    recurring: false,
    currency: "PHP",
  },
  {
    id: "income",
    date: "2026-07-04",
    memberId: "alex",
    categoryId: "salary",
    type: "income",
    amount: 10_000,
    recurring: false,
    currency: "PHP",
  },
  {
    id: "orphan",
    date: "2026-07-05",
    memberId: "alex",
    categoryId: "deleted",
    type: "expense",
    amount: 500,
    recurring: false,
    currency: "PHP",
  },
];

describe("calculateBucketBreakdown", () => {
  it("groups expense transactions by normalized category bucket and skips income or missing categories", () => {
    expect(calculateBucketBreakdown(transactions, categories)).toEqual([
      { bucket: "Housing", amount: 3_000 },
      { bucket: "Food", amount: 1_250 },
    ]);
  });

  it("returns no buckets when there are no matching expense transactions", () => {
    expect(calculateBucketBreakdown([], categories)).toEqual([]);
  });
});

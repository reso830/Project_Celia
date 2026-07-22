import type { Category } from "./category";
import type { Transaction } from "./transaction";

export interface BucketBreakdown {
  bucket: string;
  amount: number;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function calculateBucketBreakdown(
  transactions: readonly Transaction[],
  categories: readonly Category[],
): readonly BucketBreakdown[] {
  const expenseCategories = new Map(
    categories
      .filter((category) => category.type === "expense")
      .map((category) => [category.id, category]),
  );
  const totals = new Map<string, BucketBreakdown>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") {
      continue;
    }

    const category = expenseCategories.get(transaction.categoryId);
    if (!category) {
      continue;
    }

    const bucket = category.group.trim();
    const key = normalize(bucket);
    const current = totals.get(key);

    totals.set(key, {
      bucket: current?.bucket ?? bucket,
      amount: (current?.amount ?? 0) + transaction.amount,
    });
  }

  return [...totals.values()].sort(
    (left, right) =>
      right.amount - left.amount || left.bucket.localeCompare(right.bucket),
  );
}


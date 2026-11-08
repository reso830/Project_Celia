import { findMonthlyBudgetPlan } from "./models-store";
import "server-only";
import { connection } from "next/server";
import { currentMonthKey, isValidMonthKey } from "@/domain/month";
import {
  calculateBucketMetrics,
  calculateSavingsKpis,
} from "@/domain/savings-calculations";
import { getDatabase } from "./db/database";
import { listEntriesForMonth } from "./entries-store";
import { listSavingsBuckets, listSavingsActivities } from "./savings-store";
export async function getSavingsView(monthKey?: string) {
  await connection();
  const month = isValidMonthKey(monthKey) ? monthKey : currentMonthKey();
  const now = new Date();
  const today = `${currentMonthKey(now)}-${String(now.getDate()).padStart(2, "0")}`;
  const db = getDatabase();
  const plan = findMonthlyBudgetPlan(db, month);
  const plannedByBucket = new Map(
    (plan?.allocations ?? [])
      .filter((l) => l.bucketId !== null)
      .map((l) => [l.bucketId!, l.amount]),
  );
  const activities = listSavingsActivities(db);
  const buckets = listSavingsBuckets(db, { includeArchived: true }).map(
    (bucket) => {
      const history = activities.filter((a) => a.bucketId === bucket.id);
      return {
        ...calculateBucketMetrics(
          bucket,
          history,
          month,
          plannedByBucket.get(bucket.id) ?? 0,
        ),
        activities: history,
      };
    },
  );
  const activeBuckets = buckets.filter((b) => b.bucket.archivedAt === null);
  const archivedBuckets = buckets.filter((b) => b.bucket.archivedAt !== null);
  const monthlyExpensesCentavos = listEntriesForMonth(db, month)
    .filter((e) => e.type === "expense")
    .reduce((n, e) => n + e.amount, 0);
  return {
    month,
    today,
    kpis: calculateSavingsKpis({
      activeBucketMetrics: activeBuckets,
      monthlyExpensesCentavos,
      hasMonthlyPlan: plan !== null,
    }),
    activeBuckets,
    archivedBuckets,
  };
}
export type SavingsViewData = Awaited<ReturnType<typeof getSavingsView>>;

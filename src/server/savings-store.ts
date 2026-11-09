import "server-only";
import type Database from "better-sqlite3";
import type { SavingsBucket, SavingsActivity } from "@/domain/savings";
type BucketRow = Omit<SavingsBucket, "countsTowardBuffer" | "isDefault"> & {
  countsTowardBuffer: number;
  isDefault: number;
};
const bucketColumns = `id,name,name_key AS nameKey,type,opening_balance AS openingBalance,target_amount AS targetAmount,target_month AS targetMonth,description,counts_toward_buffer AS countsTowardBuffer,is_default AS isDefault,archived_at AS archivedAt,created_at AS createdAt,updated_at AS updatedAt`;
const activityColumns = `id,bucket_id AS bucketId,kind,amount,date,note,created_at AS createdAt,updated_at AS updatedAt`;
const bucket = (r: BucketRow): SavingsBucket => ({
  ...r,
  countsTowardBuffer: r.countsTowardBuffer === 1,
  isDefault: r.isDefault === 1,
});
export function listSavingsBuckets(
  db: Database.Database,
  options: { includeArchived?: boolean } = {},
) {
  return (
    db
      .prepare(
        `SELECT ${bucketColumns} FROM savings_buckets ${options.includeArchived ? "" : "WHERE archived_at IS NULL"} ORDER BY created_at ASC,id ASC`,
      )
      .all() as BucketRow[]
  ).map(bucket);
}
export function findSavingsBucketById(db: Database.Database, id: string) {
  const row = db
    .prepare(`SELECT ${bucketColumns} FROM savings_buckets WHERE id=?`)
    .get(id) as BucketRow | undefined;
  return row ? bucket(row) : null;
}
export function insertSavingsBucket(db: Database.Database, b: SavingsBucket) {
  db.prepare(
    `INSERT INTO savings_buckets (id,name,name_key,type,opening_balance,target_amount,target_month,description,counts_toward_buffer,is_default,archived_at,created_at,updated_at) VALUES (@id,@name,@nameKey,@type,@openingBalance,@targetAmount,@targetMonth,@description,@countsTowardBuffer,@isDefault,@archivedAt,@createdAt,@updatedAt)`,
  ).run({
    ...b,
    countsTowardBuffer: Number(b.countsTowardBuffer),
    isDefault: Number(b.isDefault),
  });
  return findSavingsBucketById(db, b.id)!;
}
export function updateSavingsBucket(db: Database.Database, b: SavingsBucket) {
  db.prepare(
    `UPDATE savings_buckets SET name=@name,name_key=@nameKey,type=@type,opening_balance=@openingBalance,target_amount=@targetAmount,target_month=@targetMonth,description=@description,counts_toward_buffer=@countsTowardBuffer,is_default=@isDefault,archived_at=@archivedAt,updated_at=@updatedAt WHERE id=@id`,
  ).run({
    ...b,
    countsTowardBuffer: Number(b.countsTowardBuffer),
    isDefault: Number(b.isDefault),
  });
  return findSavingsBucketById(db, b.id)!;
}
export function clearDefaultSavingsBucket(db: Database.Database, now: string) {
  db.prepare(
    "UPDATE savings_buckets SET is_default=0,updated_at=? WHERE is_default=1",
  ).run(now);
}
export function listSavingsActivities(
  db: Database.Database,
  options: { bucketId?: string; monthKey?: string } = {},
) {
  const where: string[] = [],
    args: string[] = [];
  if (options.bucketId !== undefined) {
    where.push("bucket_id=?");
    args.push(options.bucketId);
  }
  if (options.monthKey !== undefined) {
    where.push("date>=? AND date<?");
    args.push(`${options.monthKey}-01`, `${options.monthKey}-32`);
  }
  return db
    .prepare(
      `SELECT ${activityColumns} FROM savings_activities ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY date DESC,created_at DESC,id ASC`,
    )
    .all(...args) as SavingsActivity[];
}
export function findSavingsActivityById(db: Database.Database, id: string) {
  return (
    (db
      .prepare(`SELECT ${activityColumns} FROM savings_activities WHERE id=?`)
      .get(id) as SavingsActivity | undefined) ?? null
  );
}
export function insertSavingsActivity(
  db: Database.Database,
  a: SavingsActivity,
) {
  db.prepare(
    "INSERT INTO savings_activities (id,bucket_id,kind,amount,date,note,created_at,updated_at) VALUES (@id,@bucketId,@kind,@amount,@date,@note,@createdAt,@updatedAt)",
  ).run(a);
  return findSavingsActivityById(db, a.id)!;
}
export function updateSavingsActivity(
  db: Database.Database,
  a: SavingsActivity,
) {
  db.prepare(
    "UPDATE savings_activities SET kind=@kind,amount=@amount,date=@date,note=@note,updated_at=@updatedAt WHERE id=@id",
  ).run(a);
  return findSavingsActivityById(db, a.id)!;
}
export function deleteSavingsActivity(db: Database.Database, id: string) {
  return (
    db.prepare("DELETE FROM savings_activities WHERE id=?").run(id).changes ===
    1
  );
}

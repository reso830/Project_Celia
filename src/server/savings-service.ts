import "server-only";
import type Database from "better-sqlite3";
import {
  parseAndValidateAmount,
  parseAndValidateNonNegativeAmount,
  parseOptionalPositiveAmount,
} from "@/domain/amount";
import { DomainError } from "@/domain/errors";
import { nameKey, validateName } from "@/domain/names";
import { isValidMonthKey } from "@/domain/month";
import {
  defaultCountsTowardBuffer,
  isValidBucketType,
  isValidSavingsActivityKind,
  validateActivityDate,
  validateNonNegativeBucketBalance,
  type SavingsBucket,
  type SavingsActivity,
} from "@/domain/savings";
import { getDatabase } from "./db/database";
import * as store from "./savings-store";
import { timestamp } from "./timestamp";
export type BucketPatch = Partial<
  Record<
    | "name"
    | "type"
    | "openingBalance"
    | "targetAmount"
    | "targetMonth"
    | "description"
    | "countsTowardBuffer"
    | "isDefault",
    string
  >
>;
export type BucketDraft = BucketPatch & { name: string; type: string };
export type ActivityPatch = Partial<
  Record<"kind" | "amount" | "date" | "note", string>
>;
export type ActivityDraft = ActivityPatch & {
  bucketId: string;
  kind: string;
  amount: string;
  date: string;
};
function invalid(message: string, field?: string): never {
  throw new DomainError("validation", message, field);
}
function booleanField(
  raw: string | undefined,
  fallback: boolean,
  field: string,
) {
  if (raw === undefined) return fallback;
  if (raw !== "true" && raw !== "false")
    invalid("Choose true or false.", field);
  return raw === "true";
}
function requiredBucket(db: Database.Database, id: string) {
  const b = store.findSavingsBucketById(db, id);
  if (!b) throw new DomainError("not_found", "Bucket not found.");
  return b;
}
function activeBucket(db: Database.Database, id: string) {
  const b = requiredBucket(db, id);
  if (b.archivedAt !== null)
    throw new DomainError("archived", "Archived buckets are read-only.");
  return b;
}
function requiredActivity(db: Database.Database, id: string) {
  const a = store.findSavingsActivityById(db, id);
  if (!a) throw new DomainError("not_found", "Activity not found.");
  return a;
}
function checkedBucket(
  draft: BucketPatch,
  previous: SavingsBucket | undefined,
  db: Database.Database,
): SavingsBucket {
  const name = validateName(draft.name ?? previous?.name ?? "");
  const key = nameKey(name);
  if (
    store
      .listSavingsBuckets(db, { includeArchived: true })
      .some((b) => b.nameKey === key && b.id !== previous?.id)
  )
    throw new DomainError(
      "duplicate_name",
      "A bucket with this name already exists.",
      "name",
    );
  const type = draft.type ?? previous?.type ?? "";
  if (!isValidBucketType(type)) invalid("Choose a valid bucket type.", "type");
  const isDefault = booleanField(
    draft.isDefault,
    previous?.isDefault ?? false,
    "isDefault",
  );
  let countsTowardBuffer = booleanField(
    draft.countsTowardBuffer,
    previous?.countsTowardBuffer ?? defaultCountsTowardBuffer(type),
    "countsTowardBuffer",
  );
  if (
    previous?.isDefault &&
    (!isDefault || type !== "cash_buffer" || !countsTowardBuffer)
  )
    throw new DomainError(
      "invalid_state",
      "Designate another Cash Buffer bucket as default first.",
    );
  if (isDefault && type !== "cash_buffer")
    throw new DomainError(
      "invalid_state",
      "Only a Cash Buffer bucket can be default.",
    );
  if (isDefault) countsTowardBuffer = true;
  const opening =
    draft.openingBalance === undefined
      ? { ok: true as const, centavos: previous?.openingBalance ?? 0 }
      : parseAndValidateNonNegativeAmount(
          draft.openingBalance,
          "openingBalance",
        );
  if (!opening.ok) invalid(opening.error, opening.field);
  const target =
    draft.targetAmount === undefined
      ? { ok: true as const, centavos: previous?.targetAmount ?? null }
      : parseOptionalPositiveAmount(draft.targetAmount);
  if (!target.ok) invalid(target.error, target.field);
  const targetMonth =
    draft.targetMonth === undefined
      ? (previous?.targetMonth ?? null)
      : draft.targetMonth.trim() || null;
  if (targetMonth !== null && !isValidMonthKey(targetMonth))
    invalid("Enter a valid month (YYYY-MM).", "targetMonth");
  const now = timestamp();
  return {
    id: previous?.id ?? crypto.randomUUID(),
    name,
    nameKey: key,
    type,
    openingBalance: opening.centavos,
    targetAmount: target.centavos,
    targetMonth,
    description:
      draft.description === undefined
        ? (previous?.description ?? null)
        : draft.description.trim() || null,
    countsTowardBuffer,
    isDefault,
    archivedAt: previous?.archivedAt ?? null,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
}
function checkedBalance(
  b: SavingsBucket,
  activities: readonly SavingsActivity[],
  field = "amount",
) {
  if (!validateNonNegativeBucketBalance(b.openingBalance, activities))
    invalid("Bucket balance cannot be negative.", field);
  return activities.reduce(
    (n, a) => n + (a.kind === "contribution" ? a.amount : -a.amount),
    b.openingBalance,
  );
}
export function createSavingsBucket(
  draft: BucketDraft,
  db: Database.Database = getDatabase(),
) {
  return db.transaction(() => {
    const b = checkedBucket(draft, undefined, db);
    if (b.isDefault) store.clearDefaultSavingsBucket(db, b.updatedAt);
    return store.insertSavingsBucket(db, b);
  })();
}
export function updateSavingsBucket(
  id: string,
  patch: BucketPatch,
  db: Database.Database = getDatabase(),
) {
  return db.transaction(() => {
    if (!Object.keys(patch).length) invalid("Provide a field to update.");
    const b = checkedBucket(patch, activeBucket(db, id), db);
    checkedBalance(
      b,
      store.listSavingsActivities(db, { bucketId: id }),
      "openingBalance",
    );
    if (b.isDefault) store.clearDefaultSavingsBucket(db, b.updatedAt);
    return store.updateSavingsBucket(db, b);
  })();
}
export function archiveSavingsBucket(
  id: string,
  db: Database.Database = getDatabase(),
) {
  return db.transaction(() => {
    const b = requiredBucket(db, id);
    if (b.isDefault)
      throw new DomainError(
        "invalid_state",
        "Designate another Cash Buffer bucket as default before archiving this bucket.",
      );
    if (b.archivedAt !== null)
      throw new DomainError("invalid_state", "Bucket is already archived.");
    const now = timestamp();
    return store.updateSavingsBucket(db, {
      ...b,
      archivedAt: now,
      updatedAt: now,
    });
  })();
}
export function restoreSavingsBucket(
  id: string,
  db: Database.Database = getDatabase(),
) {
  return db.transaction(() => {
    const b = requiredBucket(db, id);
    if (b.archivedAt === null)
      throw new DomainError("invalid_state", "Bucket is already active.");
    return store.updateSavingsBucket(db, {
      ...b,
      archivedAt: null,
      updatedAt: timestamp(),
    });
  })();
}
function checkedActivity(
  patch: ActivityPatch,
  bucketId: string,
  previous?: SavingsActivity,
): SavingsActivity {
  const kind = patch.kind ?? previous?.kind ?? "";
  if (!isValidSavingsActivityKind(kind))
    invalid("Choose Contribution or Withdrawal.", "kind");
  const amount =
    patch.amount === undefined
      ? { ok: true as const, centavos: previous?.amount ?? 0 }
      : parseAndValidateAmount(patch.amount);
  if (!amount.ok) invalid(amount.error, amount.field);
  if (amount.centavos <= 0) invalid("Enter an amount above zero.", "amount");
  const date = patch.date ?? previous?.date ?? "";
  const valid = validateActivityDate(date);
  if (!valid.ok) invalid(valid.error, "date");
  const now = timestamp();
  return {
    id: previous?.id ?? crypto.randomUUID(),
    bucketId,
    kind,
    amount: amount.centavos,
    date,
    note:
      patch.note === undefined
        ? (previous?.note ?? null)
        : patch.note.trim() || null,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
}
export function createSavingsActivity(
  draft: ActivityDraft,
  db: Database.Database = getDatabase(),
) {
  return db.transaction(() => {
    const b = activeBucket(db, draft.bucketId);
    const a = checkedActivity(draft, b.id);
    const currentBalance = checkedBalance(b, [
      ...store.listSavingsActivities(db, { bucketId: b.id }),
      a,
    ]);
    return { activity: store.insertSavingsActivity(db, a), currentBalance };
  })();
}
export function updateSavingsActivity(
  id: string,
  patch: ActivityPatch,
  db: Database.Database = getDatabase(),
) {
  return db.transaction(() => {
    if (!Object.keys(patch).length) invalid("Provide a field to update.");
    const previous = requiredActivity(db, id);
    const b = activeBucket(db, previous.bucketId);
    const a = checkedActivity(patch, b.id, previous);
    const currentBalance = checkedBalance(
      b,
      store
        .listSavingsActivities(db, { bucketId: b.id })
        .map((row) => (row.id === id ? a : row)),
    );
    return { activity: store.updateSavingsActivity(db, a), currentBalance };
  })();
}
export function deleteSavingsActivity(
  id: string,
  db: Database.Database = getDatabase(),
) {
  return db.transaction(() => {
    const a = requiredActivity(db, id);
    const b = activeBucket(db, a.bucketId);
    const currentBalance = checkedBalance(
      b,
      store
        .listSavingsActivities(db, { bucketId: b.id })
        .filter((row) => row.id !== id),
    );
    store.deleteSavingsActivity(db, id);
    return { id, currentBalance };
  })();
}

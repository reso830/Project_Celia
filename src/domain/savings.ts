import type { Centavos } from "./amount";

export type BucketType =
  "cash_buffer" | "emergency_fund" | "goal" | "sinking_fund";

export type SavingsActivityKind = "contribution" | "withdrawal";

export type SavingsBucket = {
  id: string;
  name: string;
  nameKey: string;
  type: BucketType;
  openingBalance: Centavos;
  targetAmount: Centavos | null;
  targetMonth: string | null;
  description: string | null;
  countsTowardBuffer: boolean;
  isDefault: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SavingsActivity = {
  id: string;
  bucketId: string;
  kind: SavingsActivityKind;
  amount: Centavos;
  date: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

import { validateEntryDate } from "./entry";
import { currentMonthKey } from "./month";
export function isValidBucketType(value: string): value is BucketType {
  return ["cash_buffer", "emergency_fund", "goal", "sinking_fund"].includes(
    value,
  );
}
export function isValidSavingsActivityKind(
  value: string,
): value is SavingsActivityKind {
  return value === "contribution" || value === "withdrawal";
}
export function validateActivityDate(
  dateStr: string,
  todayIso?: string,
): { ok: true } | { ok: false; error: string } {
  if (!validateEntryDate(dateStr))
    return { ok: false, error: "Enter a valid calendar date." };
  const now = new Date();
  const today =
    todayIso ??
    `${currentMonthKey(now)}-${String(now.getDate()).padStart(2, "0")}`;
  return dateStr > today
    ? { ok: false, error: "Activity date cannot be in the future." }
    : { ok: true };
}
export function validateNonNegativeBucketBalance(
  openingBalance: Centavos,
  activities: readonly Pick<SavingsActivity, "kind" | "amount">[],
): boolean {
  return (
    activities.reduce(
      (balance, a) =>
        balance + (a.kind === "contribution" ? a.amount : -a.amount),
      openingBalance,
    ) >= 0
  );
}
export function defaultCountsTowardBuffer(type: BucketType): boolean {
  return type === "cash_buffer" || type === "emergency_fund";
}
export function formatBucketTypeSubtitle(
  bucket: Pick<SavingsBucket, "type" | "targetMonth" | "isDefault">,
): string {
  const label = {
    cash_buffer: "Open-ended",
    emergency_fund: "Open-ended",
    goal: "Goal",
    sinking_fund: "Sinking",
  }[bucket.type];
  if (bucket.isDefault) return `${label} \u00b7 default`;
  if (!bucket.targetMonth) return label;
  const [year, month] = bucket.targetMonth.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${label} \u00b7 ${months[Number(month) - 1]} ${year}`;
}

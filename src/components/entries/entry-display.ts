import { formatCentavos } from "@/domain/amount";
import type { EntryWithDetails } from "@/domain/entry";

export function formatEntryDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatEntryAmount(
  entry: EntryWithDetails,
  options?: { prefix?: string },
) {
  return `${entry.type === "income" ? "+" : "−"}${formatCentavos(entry.amount, options)}`;
}

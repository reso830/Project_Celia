import type { Centavos } from "./amount";
import type { EntryType, EntryWithDetails } from "./entry";
export type EntryFilterCriteria = {
  monthKey: string;
  type?: EntryType | "all";
  categoryId?: string | "all";
  ownerId?: string | "all";
  search?: string;
};
export function filterEntries(
  entries: readonly EntryWithDetails[],
  criteria: EntryFilterCriteria,
) {
  const search = criteria.search?.trim().toLowerCase() ?? "";
  return entries.filter(
    (entry) =>
      entry.date.startsWith(criteria.monthKey) &&
      (!criteria.type ||
        criteria.type === "all" ||
        entry.type === criteria.type) &&
      (!criteria.categoryId ||
        criteria.categoryId === "all" ||
        entry.categoryId === criteria.categoryId) &&
      (!criteria.ownerId ||
        criteria.ownerId === "all" ||
        entry.ownerMemberId === criteria.ownerId ||
        entry.ownerMemberId === null) &&
      (!search ||
        [entry.note ?? "", entry.itemName, entry.categoryName].some((value) =>
          value.toLowerCase().includes(search),
        )),
  );
}
export function calculateTotals(entries: readonly EntryWithDetails[]) {
  let income = 0;
  let expense = 0;
  for (const entry of entries) {
    if (entry.type === "income") income += entry.amount;
    else expense += entry.amount;
  }
  return {
    count: entries.length,
    incomeCentavos: income as Centavos,
    expenseCentavos: expense as Centavos,
    netCentavos: income - expense,
  };
}
export function sortEntries(
  entries: readonly EntryWithDetails[],
  field: "date" | "amount",
  direction: "asc" | "desc",
) {
  const modifier = direction === "asc" ? 1 : -1;
  return [...entries].sort((a, b) => {
    const primary =
      field === "date" ? a.date.localeCompare(b.date) : a.amount - b.amount;
    if (primary) return primary * modifier;
    const created = b.createdAt.localeCompare(a.createdAt);
    return created || a.id.localeCompare(b.id);
  });
}
export function calculateMemberSummary(
  entries: readonly EntryWithDetails[],
  memberId: string,
) {
  const own = calculateTotals(
    entries.filter((entry) => entry.ownerMemberId === memberId),
  );
  const shared = calculateTotals(
    entries.filter((entry) => entry.ownerMemberId === null),
  );
  return {
    count: entries.length,
    incomeCentavos: own.incomeCentavos + shared.incomeCentavos,
    expenseCentavos: own.expenseCentavos + shared.expenseCentavos,
    netCentavos: own.netCentavos + shared.netCentavos,
    ownIncomeCentavos: own.incomeCentavos,
    ownExpenseCentavos: own.expenseCentavos,
    ownNetCentavos: own.netCentavos,
    sharedIncomeCentavos: shared.incomeCentavos,
    sharedExpenseCentavos: shared.expenseCentavos,
    sharedNetCentavos: shared.netCentavos,
  };
}

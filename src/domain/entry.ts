import type { Centavos } from "./amount";
import type { HexColor } from "./color";
import type { ClassifiableUmbrella } from "./umbrella";

export type EntryType = ClassifiableUmbrella;
export type Entry = {
  id: string;
  itemId: string;
  ownerMemberId: string | null;
  amount: Centavos;
  date: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};
export type EntryWithDetails = Entry & {
  type: EntryType;
  itemName: string;
  categoryId: string;
  categoryName: string;
  categoryColor: HexColor;
  categoryArchived: boolean;
  ownerName: string;
  isHousehold: boolean;
  ownerArchived: boolean;
};
export type EntryDraft = {
  type: EntryType;
  amount: string;
  date: string;
  itemId: string;
  ownerMemberId: string | null;
  note?: string | null;
};
export function validateEntryDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= new Date(year, month, 0).getDate()
  );
}

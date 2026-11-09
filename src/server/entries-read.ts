import "server-only";

import { currentMonthKey, isValidMonthKey } from "@/domain/month";
import { connection } from "next/server";
import type { EntryWithDetails } from "@/domain/entry";
import type { HexColor } from "@/domain/color";
import type { ClassifiableUmbrella } from "@/domain/umbrella";
import { findCategory, listCategories, listItems } from "./categories-store";
import { getDatabase } from "./db/database";
import { listEntriesForMonth } from "./entries-store";
import { findMember, listMembers } from "./members-store";

export type EntriesCategory = {
  id: string;
  umbrella: ClassifiableUmbrella;
  name: string;
  color: HexColor;
  archived: boolean;
  items: { id: string; name: string }[];
};

export type EntriesMember = { id: string; name: string; archived?: boolean };

export type EntriesViewData = {
  month: string;
  entries: EntryWithDetails[];
  categories: EntriesCategory[];
  members: EntriesMember[];
  archivedCategories: EntriesCategory[];
  archivedMembers: EntriesMember[];
  defaults: { owner: "Household"; currency: "PHP" };
};

function categoryData(
  database: ReturnType<typeof getDatabase>,
  categoryId: string,
): EntriesCategory | null {
  const category = findCategory(database, categoryId, { includeMerged: true });
  if (!category) return null;
  return {
    id: category.id,
    umbrella: category.umbrella,
    name: category.name,
    color: category.color,
    archived:
      category.archivedAt !== null || category.mergedIntoCategoryId !== null,
    items: listItems(database, category.id, { includeMerged: true }).map(
      (item) => ({
        id: item.id,
        name: item.name,
      }),
    ),
  };
}

export async function getEntriesView(
  monthKey?: string,
): Promise<EntriesViewData> {
  await connection();
  const month = isValidMonthKey(monthKey) ? monthKey : currentMonthKey();
  const database = getDatabase();
  const entries = listEntriesForMonth(database, month);
  const categories = listCategories(database)
    .filter((category) => !category.archivedAt)
    .map((category) => ({
      id: category.id,
      umbrella: category.umbrella,
      name: category.name,
      color: category.color,
      archived: false,
      items: listItems(database, category.id).map((item) => ({
        id: item.id,
        name: item.name,
      })),
    }));
  const members = listMembers(database)
    .filter((member) => !member.archivedAt)
    .map(({ id, name }) => ({ id, name, archived: false }));
  const archivedCategories = [
    ...new Set(
      entries
        .filter((entry) => entry.categoryArchived)
        .map((entry) => entry.categoryId),
    ),
  ]
    .map((id) => categoryData(database, id))
    .filter((category): category is EntriesCategory => category !== null);
  const archivedMembers = [
    ...new Set(
      entries
        .filter((entry) => entry.ownerArchived && entry.ownerMemberId)
        .map((entry) => entry.ownerMemberId!),
    ),
  ]
    .map((id) => findMember(database, id))
    .filter((member): member is NonNullable<typeof member> => member !== null)
    .map(({ id, name }) => ({ id, name, archived: true }));

  return {
    month,
    entries,
    categories,
    members,
    archivedCategories,
    archivedMembers,
    defaults: { owner: "Household", currency: "PHP" },
  };
}

import "server-only";
import type Database from "better-sqlite3";
import { parseAndValidateAmount } from "@/domain/amount";
import { validateEntryDate, type EntryDraft } from "@/domain/entry";
import { DomainError } from "@/domain/errors";
import { isClassifiableUmbrella } from "@/domain/umbrella";
import { findCategory, findItem } from "./categories-store";
import { getDatabase } from "./db/database";
import {
  findEntryById,
  insertEntry,
  updateEntry as writeEntry,
  deleteEntry as eraseEntry,
} from "./entries-store";
import { findMember } from "./members-store";
import { timestamp } from "./timestamp";

export type EntryDraftInput = Omit<EntryDraft, "type"> & { type: string };
export type EntryPatch = Partial<Omit<EntryDraft, "type">>;

function checkedItem(database: Database.Database, id: string) {
  const item = findItem(database, id, { includeMerged: true });
  if (!item) throw new DomainError("not_found", "Item not found.", "itemId");
  const category = findCategory(database, item.categoryId, {
    includeMerged: true,
  });
  if (!category) throw new DomainError("not_found", "Category not found.");
  if (
    item.mergedIntoItemId ||
    category.archivedAt ||
    category.mergedIntoCategoryId
  )
    throw new DomainError(
      "archived",
      "Archived categories and items cannot be assigned.",
      "itemId",
    );
  return { item, category };
}
function checkedMember(database: Database.Database, id: string | null) {
  if (!id) return;
  const member = findMember(database, id);
  if (!member)
    throw new DomainError("not_found", "Member not found.", "ownerMemberId");
  if (member.archivedAt)
    throw new DomainError(
      "archived",
      "Archived members cannot be assigned.",
      "ownerMemberId",
    );
}
export function createEntry(
  draft: EntryDraftInput,
  database: Database.Database = getDatabase(),
) {
  return database.transaction(() => {
    if (!isClassifiableUmbrella(draft.type))
      throw new DomainError("validation", "Choose Income or Expense.", "type");
    const amount = parseAndValidateAmount(draft.amount);
    if (!amount.ok)
      throw new DomainError("validation", amount.error, amount.field);
    if (!validateEntryDate(draft.date))
      throw new DomainError(
        "validation",
        "Enter a valid calendar date.",
        "date",
      );
    const { category } = checkedItem(database, draft.itemId);
    if (category.umbrella !== draft.type)
      throw new DomainError(
        "umbrella_mismatch",
        "Choose an item matching the entry type.",
        "itemId",
      );
    checkedMember(database, draft.ownerMemberId);
    const now = timestamp();
    return insertEntry(database, {
      id: crypto.randomUUID(),
      itemId: draft.itemId,
      ownerMemberId: draft.ownerMemberId,
      amount: amount.centavos,
      date: draft.date,
      note: draft.note?.trim() || null,
      createdAt: now,
      updatedAt: now,
    });
  })();
}
export function updateEntry(
  id: string,
  patch: EntryPatch,
  database: Database.Database = getDatabase(),
) {
  return database.transaction(() => {
    const previous = findEntryById(database, id);
    if (!previous) throw new DomainError("not_found", "Entry not found.");
    const itemId = patch.itemId ?? previous.itemId;
    const owner =
      patch.ownerMemberId === undefined
        ? previous.ownerMemberId
        : patch.ownerMemberId;
    const amountRaw = patch.amount;
    const amount =
      amountRaw === undefined
        ? previous.amount
        : parseAndValidateAmount(amountRaw);
    if (typeof amount !== "number" && !amount.ok)
      throw new DomainError("validation", amount.error, amount.field);
    const date = patch.date ?? previous.date;
    if (!validateEntryDate(date))
      throw new DomainError(
        "validation",
        "Enter a valid calendar date.",
        "date",
      );
    if (itemId !== previous.itemId) checkedItem(database, itemId);
    if (owner !== previous.ownerMemberId) checkedMember(database, owner);
    return writeEntry(database, {
      ...previous,
      itemId,
      ownerMemberId: owner,
      amount: typeof amount === "number" ? amount : amount.centavos,
      date,
      note:
        patch.note === undefined ? previous.note : patch.note?.trim() || null,
      updatedAt: timestamp(),
    })!;
  })();
}
export function deleteEntry(
  id: string,
  database: Database.Database = getDatabase(),
) {
  return database.transaction(() => {
    if (!eraseEntry(database, id))
      throw new DomainError("not_found", "Entry not found.");
    return id;
  })();
}

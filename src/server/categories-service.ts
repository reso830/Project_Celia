import "server-only";

import type Database from "better-sqlite3";
import { defaultCategoryColor, parseHexColor } from "@/domain/color";
import { DomainError } from "@/domain/errors";
import { nameKey, validateName } from "@/domain/names";
import {
  isClassifiableUmbrella,
  type ClassifiableUmbrella,
} from "@/domain/umbrella";
import { getDatabase } from "./db/database";
import { timestamp } from "./timestamp";
import {
  findCategory,
  findItem,
  insertCategory,
  insertItem,
  listCategories,
  listItems,
  updateCategory as writeCategory,
  updateItem as writeItem,
} from "./categories-store";

function duplicateName() {
  return new DomainError(
    "duplicate_name",
    "A category or item already has that name.",
    "name",
  );
}

function activeCategory(database: Database.Database, id: string) {
  const category = findCategory(database, id, { includeMerged: true });
  if (!category) throw new DomainError("not_found", "Category not found.");
  if (category.archivedAt || category.mergedIntoCategoryId)
    throw new DomainError("archived", "Archived categories are read-only.");
  return category;
}

function categoryForStateChange(database: Database.Database, id: string) {
  const category = findCategory(database, id, { includeMerged: true });
  if (!category) throw new DomainError("not_found", "Category not found.");
  if (category.mergedIntoCategoryId)
    throw new DomainError("archived", "Archived categories are read-only.");
  return category;
}

function writeCategoryState(
  database: Database.Database,
  category: ReturnType<typeof activeCategory>,
  archivedAt: string | null,
  mergedIntoCategoryId: string | null,
) {
  return writeCategory(database, {
    id: category.id,
    name: category.name,
    nameKey: nameKey(category.name),
    color: category.color,
    archivedAt,
    mergedIntoCategoryId,
    updatedAt: timestamp(),
  })!;
}

export function createCategory(
  umbrella: string,
  rawName: string,
  rawColor?: string,
  database: Database.Database = getDatabase(),
) {
  return database.transaction(() => {
    if (!isClassifiableUmbrella(umbrella)) {
      throw new DomainError(
        "validation",
        "Choose Income or Expense.",
        "umbrella",
      );
    }
    const name = validateName(rawName);
    const key = nameKey(name);
    if (
      listCategories(database).some(
        (category) =>
          category.umbrella === umbrella && nameKey(category.name) === key,
      )
    ) {
      throw duplicateName();
    }
    const now = timestamp();
    return insertCategory(database, {
      id: crypto.randomUUID(),
      umbrella: umbrella as ClassifiableUmbrella,
      name,
      nameKey: key,
      color:
        rawColor === undefined
          ? defaultCategoryColor(listCategories(database).length)
          : parseHexColor(rawColor),
      archivedAt: null,
      mergedIntoCategoryId: null,
      createdAt: now,
      updatedAt: now,
    });
  })();
}

export function updateCategory(
  id: string,
  changes: { name?: string; color?: string },
  database: Database.Database = getDatabase(),
) {
  return database.transaction(() => {
    const category = activeCategory(database, id);
    const name =
      changes.name === undefined ? category.name : validateName(changes.name);
    const key = nameKey(name);
    if (
      listCategories(database).some(
        (other) =>
          other.id !== id &&
          other.umbrella === category.umbrella &&
          nameKey(other.name) === key,
      )
    ) {
      throw duplicateName();
    }
    return writeCategory(database, {
      id,
      name,
      nameKey: key,
      color:
        changes.color === undefined
          ? category.color
          : parseHexColor(changes.color),
      archivedAt: category.archivedAt,
      mergedIntoCategoryId: category.mergedIntoCategoryId,
      updatedAt: timestamp(),
    })!;
  })();
}

export function addItem(
  id: string,
  rawName: string,
  database: Database.Database = getDatabase(),
) {
  return database.transaction(() => {
    activeCategory(database, id);
    const name = validateName(rawName);
    const key = nameKey(name);
    if (listItems(database, id).some((item) => nameKey(item.name) === key))
      throw duplicateName();
    const now = timestamp();
    return insertItem(database, {
      id: crypto.randomUUID(),
      categoryId: id,
      name,
      nameKey: key,
      mergedIntoItemId: null,
      createdAt: now,
      updatedAt: now,
    });
  })();
}

export function renameItem(
  id: string,
  rawName: string,
  database: Database.Database = getDatabase(),
) {
  return database.transaction(() => {
    const item = findItem(database, id);
    if (!item) throw new DomainError("not_found", "Item not found.");
    activeCategory(database, item.categoryId);
    const name = validateName(rawName);
    const key = nameKey(name);
    if (
      listItems(database, item.categoryId).some(
        (other) => other.id !== id && nameKey(other.name) === key,
      )
    )
      throw duplicateName();
    return writeItem(database, {
      id,
      categoryId: item.categoryId,
      name,
      nameKey: key,
      mergedIntoItemId: item.mergedIntoItemId,
      updatedAt: timestamp(),
    })!;
  })();
}

export function archiveCategory(
  id: string,
  database: Database.Database = getDatabase(),
) {
  return database.transaction(() => {
    const category = categoryForStateChange(database, id);
    if (category.archivedAt)
      throw new DomainError("invalid_state", "Category is already archived.");
    return writeCategoryState(database, category, timestamp(), null);
  })();
}

export function restoreCategory(
  id: string,
  database: Database.Database = getDatabase(),
) {
  return database.transaction(() => {
    const category = categoryForStateChange(database, id);
    if (!category.archivedAt)
      throw new DomainError("invalid_state", "Category is already active.");
    return writeCategoryState(database, category, null, null);
  })();
}

export function moveItem(
  id: string,
  targetCategoryId: string,
  database: Database.Database = getDatabase(),
) {
  return database.transaction(() => {
    const item = findItem(database, id, { includeMerged: true });
    if (!item) throw new DomainError("not_found", "Item not found.");
    if (item.mergedIntoItemId)
      throw new DomainError("archived", "Archived items are read-only.");
    const source = activeCategory(database, item.categoryId);
    const target = activeCategory(database, targetCategoryId);
    if (source.id === target.id)
      throw new DomainError("same_category", "Choose a different category.");
    if (source.umbrella !== target.umbrella)
      throw new DomainError(
        "umbrella_mismatch",
        "Choose a category in the same umbrella.",
      );
    if (
      listItems(database, target.id).some(
        (other) => nameKey(other.name) === nameKey(item.name),
      )
    )
      throw duplicateName();
    return writeItem(database, {
      id: item.id,
      categoryId: target.id,
      name: item.name,
      nameKey: nameKey(item.name),
      mergedIntoItemId: null,
      updatedAt: timestamp(),
    })!;
  })();
}

export function mergeCategory(
  sourceCategoryId: string,
  targetCategoryId: string,
  database: Database.Database = getDatabase(),
) {
  return database.transaction(() => {
    const source = activeCategory(database, sourceCategoryId);
    const target = activeCategory(database, targetCategoryId);
    if (source.id === target.id)
      throw new DomainError("same_category", "Choose a different category.");
    if (source.umbrella !== target.umbrella)
      throw new DomainError(
        "umbrella_mismatch",
        "Choose a category in the same umbrella.",
      );

    const movedItemIds: string[] = [];
    const combined: { fromItemId: string; intoItemId: string }[] = [];
    const targetsByName = new Map(
      listItems(database, target.id).map((item) => [nameKey(item.name), item]),
    );
    for (const item of listItems(database, source.id)) {
      const match = targetsByName.get(nameKey(item.name));
      if (match) {
        writeItem(database, {
          id: item.id,
          categoryId: source.id,
          name: item.name,
          nameKey: nameKey(item.name),
          mergedIntoItemId: match.id,
          updatedAt: timestamp(),
        });
        combined.push({ fromItemId: item.id, intoItemId: match.id });
      } else {
        writeItem(database, {
          id: item.id,
          categoryId: target.id,
          name: item.name,
          nameKey: nameKey(item.name),
          mergedIntoItemId: null,
          updatedAt: timestamp(),
        });
        movedItemIds.push(item.id);
      }
    }
    writeCategoryState(database, source, null, target.id);
    const updatedTarget = writeCategoryState(database, target, null, null);
    return { target: updatedTarget, movedItemIds, combined };
  })();
}

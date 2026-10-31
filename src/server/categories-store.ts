import "server-only";

import type Database from "better-sqlite3";
import type { Category } from "@/domain/category";
import type { HexColor } from "@/domain/color";
import type { Item } from "@/domain/item";
import type { ClassifiableUmbrella } from "@/domain/umbrella";

type CategoryRow = {
  id: string;
  umbrella_id: ClassifiableUmbrella;
  name: string;
  color: string;
  archived_at: string | null;
  merged_into_category_id: string | null;
};

type ItemRow = {
  id: string;
  category_id: string;
  name: string;
  merged_into_item_id: string | null;
};

export type CategoryRecord = Category & {
  nameKey: string;
  createdAt: string;
  updatedAt: string;
};

export type ItemRecord = Item & {
  nameKey: string;
  createdAt: string;
  updatedAt: string;
};

export type CategoryUpdate = Omit<CategoryRecord, "umbrella" | "createdAt">;

export type MergedRowsOptions = {
  includeMerged?: boolean;
};

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    umbrella: row.umbrella_id,
    name: row.name,
    color: row.color as HexColor,
    archivedAt: row.archived_at,
    mergedIntoCategoryId: row.merged_into_category_id,
  };
}

function toItem(row: ItemRow): Item {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    mergedIntoItemId: row.merged_into_item_id,
  };
}

export function findCategory(
  database: Database.Database,
  id: string,
  options: MergedRowsOptions = {},
): Category | null {
  const row = database
    .prepare(
      `SELECT id, umbrella_id, name, color, archived_at, merged_into_category_id
       FROM categories
       WHERE id = ?${options.includeMerged ? "" : " AND merged_into_category_id IS NULL"}`,
    )
    .get(id) as CategoryRow | undefined;

  return row ? toCategory(row) : null;
}

export function listCategories(
  database: Database.Database,
  options: MergedRowsOptions = {},
): Category[] {
  return (
    database
      .prepare(
        `SELECT id, umbrella_id, name, color, archived_at, merged_into_category_id
         FROM categories${options.includeMerged ? "" : " WHERE merged_into_category_id IS NULL"}
         ORDER BY umbrella_id, name_key`,
      )
      .all() as CategoryRow[]
  ).map(toCategory);
}

export function insertCategory(
  database: Database.Database,
  category: CategoryRecord,
): Category {
  database
    .prepare(
      `INSERT INTO categories (
        id, umbrella_id, name, name_key, color, archived_at,
        merged_into_category_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      category.id,
      category.umbrella,
      category.name,
      category.nameKey,
      category.color,
      category.archivedAt,
      category.mergedIntoCategoryId,
      category.createdAt,
      category.updatedAt,
    );

  return {
    id: category.id,
    umbrella: category.umbrella,
    name: category.name,
    color: category.color,
    archivedAt: category.archivedAt,
    mergedIntoCategoryId: category.mergedIntoCategoryId,
  };
}

export function updateCategory(
  database: Database.Database,
  category: CategoryUpdate,
): Category | null {
  const result = database
    .prepare(
      `UPDATE categories
       SET name = ?, name_key = ?, color = ?, archived_at = ?,
           merged_into_category_id = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      category.name,
      category.nameKey,
      category.color,
      category.archivedAt,
      category.mergedIntoCategoryId,
      category.updatedAt,
      category.id,
    );

  return result.changes === 1
    ? findCategory(database, category.id, { includeMerged: true })
    : null;
}

export function findItem(
  database: Database.Database,
  id: string,
  options: MergedRowsOptions = {},
): Item | null {
  const row = database
    .prepare(
      `SELECT id, category_id, name, merged_into_item_id
       FROM items
       WHERE id = ?${options.includeMerged ? "" : " AND merged_into_item_id IS NULL"}`,
    )
    .get(id) as ItemRow | undefined;

  return row ? toItem(row) : null;
}

export function listItems(
  database: Database.Database,
  categoryId: string,
  options: MergedRowsOptions = {},
): Item[] {
  return (
    database
      .prepare(
        `SELECT id, category_id, name, merged_into_item_id
         FROM items
         WHERE category_id = ?${options.includeMerged ? "" : " AND merged_into_item_id IS NULL"}
         ORDER BY name_key`,
      )
      .all(categoryId) as ItemRow[]
  ).map(toItem);
}

export function insertItem(
  database: Database.Database,
  item: ItemRecord,
): Item {
  database
    .prepare(
      `INSERT INTO items (
        id, category_id, name, name_key, merged_into_item_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      item.id,
      item.categoryId,
      item.name,
      item.nameKey,
      item.mergedIntoItemId,
      item.createdAt,
      item.updatedAt,
    );

  return {
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    mergedIntoItemId: item.mergedIntoItemId,
  };
}

export function updateItem(
  database: Database.Database,
  item: Omit<ItemRecord, "createdAt">,
): Item | null {
  const result = database
    .prepare(
      `UPDATE items
       SET category_id = ?, name = ?, name_key = ?, merged_into_item_id = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      item.categoryId,
      item.name,
      item.nameKey,
      item.mergedIntoItemId,
      item.updatedAt,
      item.id,
    );

  return result.changes === 1
    ? {
        id: item.id,
        categoryId: item.categoryId,
        name: item.name,
        mergedIntoItemId: item.mergedIntoItemId,
      }
    : null;
}

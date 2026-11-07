import "server-only";

import type Database from "better-sqlite3";
import type { Entry, EntryWithDetails } from "@/domain/entry";
import type { HexColor } from "@/domain/color";

type EntryRow = {
  id: string;
  item_id: string;
  owner_member_id: string | null;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  type: "income" | "expense";
  item_name: string;
  category_id: string;
  category_name: string;
  category_color: string;
  category_archived: string | null;
  owner_name: string | null;
  owner_archived: string | null;
};

const entryDetailsQuery = `SELECT e.*, c.umbrella_id AS type, i.name AS item_name,
  c.id AS category_id, c.name AS category_name, c.color AS category_color,
  c.archived_at AS category_archived, m.name AS owner_name,
  m.archived_at AS owner_archived
  FROM entries e
  JOIN items i ON i.id = e.item_id
  JOIN categories c ON c.id = i.category_id
  LEFT JOIN members m ON m.id = e.owner_member_id`;

function toEntryWithDetails(row: EntryRow): EntryWithDetails {
  return {
    id: row.id,
    itemId: row.item_id,
    ownerMemberId: row.owner_member_id,
    amount: row.amount,
    date: row.date,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    type: row.type,
    itemName: row.item_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryColor: row.category_color as HexColor,
    categoryArchived: row.category_archived !== null,
    ownerName: row.owner_name ?? "Household",
    isHousehold: row.owner_member_id === null,
    ownerArchived: row.owner_archived !== null,
  };
}

export function insertEntry(
  database: Database.Database,
  entry: Entry,
): EntryWithDetails {
  database
    .prepare(
      `INSERT INTO entries (
        id, item_id, owner_member_id, amount, date, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      entry.id,
      entry.itemId,
      entry.ownerMemberId,
      entry.amount,
      entry.date,
      entry.note,
      entry.createdAt,
      entry.updatedAt,
    );
  return findEntryById(database, entry.id)!;
}

export function updateEntry(
  database: Database.Database,
  entry: Entry,
): EntryWithDetails | null {
  database
    .prepare(
      `UPDATE entries
       SET item_id = ?, owner_member_id = ?, amount = ?, date = ?, note = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      entry.itemId,
      entry.ownerMemberId,
      entry.amount,
      entry.date,
      entry.note,
      entry.updatedAt,
      entry.id,
    );
  return findEntryById(database, entry.id);
}

export function deleteEntry(database: Database.Database, id: string): boolean {
  return (
    database.prepare("DELETE FROM entries WHERE id = ?").run(id).changes === 1
  );
}

export function findEntryById(
  database: Database.Database,
  id: string,
): EntryWithDetails | null {
  const row = database
    .prepare(`${entryDetailsQuery} WHERE e.id = ?`)
    .get(id) as EntryRow | undefined;

  return row ? toEntryWithDetails(row) : null;
}

export function listEntriesForMonth(
  database: Database.Database,
  month: string,
): EntryWithDetails[] {
  return (
    database
      .prepare(
        `${entryDetailsQuery}
         WHERE e.date >= ? AND e.date < ?
         ORDER BY e.date DESC, e.created_at DESC, e.id ASC`,
      )
      .all(`${month}-01`, `${month}-32`) as EntryRow[]
  ).map(toEntryWithDetails);
}

export function countEntriesByItem(
  database: Database.Database,
  id: string,
): number {
  return (
    database
      .prepare("SELECT COUNT(*) AS count FROM entries WHERE item_id = ?")
      .get(id) as { count: number }
  ).count;
}

export function countEntriesByCategory(
  database: Database.Database,
  id: string,
): number {
  return (
    database
      .prepare(
        `SELECT COUNT(*) AS count
         FROM entries e
         JOIN items i ON i.id = e.item_id
         WHERE i.category_id = ?`,
      )
      .get(id) as { count: number }
  ).count;
}

export function repointEntriesForItem(
  database: Database.Database,
  fromItemId: string,
  intoItemId: string,
  now: string,
): number {
  return database
    .prepare("UPDATE entries SET item_id = ?, updated_at = ? WHERE item_id = ?")
    .run(intoItemId, now, fromItemId).changes;
}

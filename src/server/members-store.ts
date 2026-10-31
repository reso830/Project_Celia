import "server-only";

import type Database from "better-sqlite3";
import type { Member } from "@/domain/member";

type MemberRow = {
  id: string;
  name: string;
  archived_at: string | null;
};

export type MemberRecord = Member & {
  nameKey: string;
  createdAt: string;
  updatedAt: string;
};

function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    archivedAt: row.archived_at,
  };
}

export function findMember(
  database: Database.Database,
  id: string,
): Member | null {
  const row = database
    .prepare("SELECT id, name, archived_at FROM members WHERE id = ?")
    .get(id) as MemberRow | undefined;

  return row ? toMember(row) : null;
}

export function findMemberByNameKey(
  database: Database.Database,
  nameKey: string,
): Member | null {
  const row = database
    .prepare("SELECT id, name, archived_at FROM members WHERE name_key = ?")
    .get(nameKey) as MemberRow | undefined;

  return row ? toMember(row) : null;
}

export function listMembers(database: Database.Database): Member[] {
  return (
    database
      .prepare("SELECT id, name, archived_at FROM members ORDER BY name_key")
      .all() as MemberRow[]
  ).map(toMember);
}

export function insertMember(
  database: Database.Database,
  member: MemberRecord,
): Member {
  database
    .prepare(
      `INSERT INTO members (
        id, name, name_key, archived_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      member.id,
      member.name,
      member.nameKey,
      member.archivedAt,
      member.createdAt,
      member.updatedAt,
    );

  return {
    id: member.id,
    name: member.name,
    archivedAt: member.archivedAt,
  };
}

export function updateMember(
  database: Database.Database,
  member: Omit<MemberRecord, "createdAt">,
): Member | null {
  const result = database
    .prepare(
      `UPDATE members
       SET name = ?, name_key = ?, archived_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      member.name,
      member.nameKey,
      member.archivedAt,
      member.updatedAt,
      member.id,
    );

  return result.changes === 1
    ? { id: member.id, name: member.name, archivedAt: member.archivedAt }
    : null;
}

import "server-only";

import type Database from "better-sqlite3";
import { DomainError } from "@/domain/errors";
import { nameKey, validateName } from "@/domain/names";
import { getDatabase } from "./db/database";
import {
  findMember,
  findMemberByNameKey,
  insertMember,
  updateMember,
} from "./members-store";
import { timestamp } from "./timestamp";

function duplicateNameError() {
  return new DomainError(
    "duplicate_name",
    "A member already has that name.",
    "name",
  );
}

export function addMember(
  rawName: string,
  database: Database.Database = getDatabase(),
) {
  return database.transaction(() => {
    const name = validateName(rawName);
    const key = nameKey(name);

    if (findMemberByNameKey(database, key)) {
      throw duplicateNameError();
    }

    const now = timestamp();
    return insertMember(database, {
      id: crypto.randomUUID(),
      name,
      nameKey: key,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  })();
}

export function renameMember(
  id: string,
  rawName: string,
  database: Database.Database = getDatabase(),
) {
  return database.transaction(() => {
    const member = findMember(database, id);

    if (!member) {
      throw new DomainError("not_found", "Member not found.");
    }
    if (member.archivedAt) {
      throw new DomainError("archived", "Archived members cannot be renamed.");
    }

    const name = validateName(rawName);
    const key = nameKey(name);
    const duplicate = findMemberByNameKey(database, key);

    if (duplicate && duplicate.id !== id) {
      throw duplicateNameError();
    }

    return updateMember(database, {
      id,
      name,
      nameKey: key,
      archivedAt: null,
      updatedAt: timestamp(),
    })!;
  })();
}

export function archiveMember(
  id: string,
  database: Database.Database = getDatabase(),
) {
  return database.transaction(() => {
    const member = findMember(database, id);

    if (!member) {
      throw new DomainError("not_found", "Member not found.");
    }
    if (member.archivedAt) {
      throw new DomainError("invalid_state", "Member is already archived.");
    }

    const now = timestamp();
    return updateMember(database, {
      id: member.id,
      name: member.name,
      nameKey: nameKey(member.name),
      archivedAt: now,
      updatedAt: now,
    })!;
  })();
}

export function restoreMember(
  id: string,
  database: Database.Database = getDatabase(),
) {
  return database.transaction(() => {
    const member = findMember(database, id);

    if (!member) {
      throw new DomainError("not_found", "Member not found.");
    }
    if (!member.archivedAt) {
      throw new DomainError("invalid_state", "Member is already active.");
    }

    return updateMember(database, {
      id: member.id,
      name: member.name,
      nameKey: nameKey(member.name),
      archivedAt: null,
      updatedAt: timestamp(),
    })!;
  })();
}

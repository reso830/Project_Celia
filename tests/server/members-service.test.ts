// @vitest-environment node

import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors";
import { openDatabase } from "@/server/db/database";
import {
  addMember,
  archiveMember,
  renameMember,
  restoreMember,
} from "@/server/members-service";

const databases: Database.Database[] = [];

function createDatabase() {
  const database = openDatabase(":memory:");
  databases.push(database);
  return database;
}

async function expectDomainError(
  action: () => unknown,
  code: DomainError["code"],
) {
  try {
    await action();
    throw new Error("Expected a DomainError");
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ code });
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.close();
  }
});

describe("member service", () => {
  it("archives and restores a member while preserving its history", () => {
    const database = createDatabase();
    const member = addMember(" Ana ", database);

    const archived = archiveMember(member.id, database);
    const restored = restoreMember(member.id, database);

    expect(member).toMatchObject({ name: "Ana", archivedAt: null });
    expect(archived.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(restored).toEqual({ id: member.id, name: "Ana", archivedAt: null });
  });

  it("enforces archive, restore, and rename state transitions", async () => {
    const database = createDatabase();
    const member = addMember("Ana", database);

    await expectDomainError(
      () => restoreMember(member.id, database),
      "invalid_state",
    );
    archiveMember(member.id, database);
    await expectDomainError(
      () => archiveMember(member.id, database),
      "invalid_state",
    );
    await expectDomainError(
      () => renameMember(member.id, "Ana M.", database),
      "archived",
    );
  });

  it("validates names and duplicate keys including archived members", async () => {
    const database = createDatabase();

    await expectDomainError(() => addMember("  ", database), "validation");
    const ana = addMember("Ana", database);
    await expectDomainError(() => addMember("ana", database), "duplicate_name");
    archiveMember(ana.id, database);
    await expectDomainError(
      () => addMember(" ANA ", database),
      "duplicate_name",
    );
  });

  it("rejects unknown members", async () => {
    const database = createDatabase();

    await expectDomainError(
      () => renameMember("missing", "Ana", database),
      "not_found",
    );
    await expectDomainError(
      () => archiveMember("missing", database),
      "not_found",
    );
    await expectDomainError(
      () => restoreMember("missing", database),
      "not_found",
    );
  });

  it("sets ISO timestamps and touches updated_at on rename", () => {
    const database = createDatabase();
    const member = addMember("Ana", database);
    const created = database
      .prepare(
        "SELECT created_at, updated_at, archived_at FROM members WHERE id = ?",
      )
      .get(member.id) as {
      created_at: string;
      updated_at: string;
      archived_at: string | null;
    };

    renameMember(member.id, "Ana Maria", database);
    const renamed = database
      .prepare(
        "SELECT created_at, updated_at, archived_at FROM members WHERE id = ?",
      )
      .get(member.id) as {
      created_at: string;
      updated_at: string;
      archived_at: string | null;
    };

    expect(created.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(created.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(renamed.updated_at).not.toBe(created.updated_at);
    expect(renamed.archived_at).toBeNull();
  });
});

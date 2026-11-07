// @vitest-environment node

import type Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn() }));

import {
  addItem,
  archiveCategory,
  createCategory,
} from "@/server/categories-service";
import { openDatabase } from "@/server/db/database";
import { insertEntry } from "@/server/entries-store";
import { getEntriesView } from "@/server/entries-read";
import { addMember, archiveMember } from "@/server/members-service";

type DatabaseGlobal = typeof globalThis & {
  __celiaDatabase?: Database.Database;
};
const databaseGlobal = globalThis as DatabaseGlobal;

afterEach(() => {
  databaseGlobal.__celiaDatabase?.close();
  delete databaseGlobal.__celiaDatabase;
});

describe("getEntriesView", () => {
  it("packages the selected month with active and referenced archived entities", async () => {
    const database = openDatabase(":memory:");
    databaseGlobal.__celiaDatabase = database;
    const active = createCategory("expense", "Food", undefined, database);
    const empty = createCategory("expense", "Travel", undefined, database);
    const archived = createCategory("expense", "Old food", undefined, database);
    const activeItem = addItem(active.id, "Market", database);
    const archivedItem = addItem(archived.id, "Old market", database);
    const activeMember = addMember("Ana", database);
    const archivedMember = addMember("Ben", database);
    archiveCategory(archived.id, database);
    archiveMember(archivedMember.id, database);
    for (const [id, itemId, ownerMemberId, date] of [
      ["active", activeItem.id, activeMember.id, "2026-11-04"],
      ["archived", archivedItem.id, archivedMember.id, "2026-11-03"],
      ["other-month", activeItem.id, null, "2026-10-31"],
    ] as const) {
      insertEntry(database, {
        id,
        itemId,
        ownerMemberId,
        amount: 100,
        date,
        note: null,
        createdAt: "2026-11-04T00:00:00.000Z",
        updatedAt: "2026-11-04T00:00:00.000Z",
      });
    }

    const view = await getEntriesView("2026-11");

    expect(view).toMatchObject({
      month: "2026-11",
      defaults: { owner: "Household", currency: "PHP" },
      entries: [{ id: "active" }, { id: "archived" }],
      categories: [
        { id: active.id, items: [{ id: activeItem.id }] },
        { id: empty.id, items: [] },
      ],
      members: [{ id: activeMember.id, name: "Ana" }],
      archivedCategories: [
        { id: archived.id, items: [{ id: archivedItem.id }] },
      ],
      archivedMembers: [{ id: archivedMember.id, name: "Ben" }],
    });
  });

  it("defaults invalid month keys to the current calendar month", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T12:00:00.000Z"));
    const database = openDatabase(":memory:");
    databaseGlobal.__celiaDatabase = database;

    await expect(getEntriesView("2026-13")).resolves.toMatchObject({
      month: "2026-11",
    });
    await expect(getEntriesView()).resolves.toMatchObject({ month: "2026-11" });
    vi.useRealTimers();
  });
});

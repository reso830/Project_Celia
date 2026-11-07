// @vitest-environment node

import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { addItem, createCategory } from "@/server/categories-service";
import { openDatabase } from "@/server/db/database";
import {
  countEntriesByCategory,
  countEntriesByItem,
  deleteEntry,
  findEntryById,
  insertEntry,
  listEntriesForMonth,
  repointEntriesForItem,
  updateEntry,
} from "@/server/entries-store";
import { addMember } from "@/server/members-service";

const databases: Database.Database[] = [];
const time = "2026-11-04T00:00:00.000Z";

function database() {
  const instance = openDatabase(":memory:");
  databases.push(instance);
  return instance;
}

afterEach(() => databases.splice(0).forEach((instance) => instance.close()));

describe("entries store", () => {
  it("stores, retrieves, updates, and deletes detailed entries", () => {
    const db = database();
    const category = createCategory("expense", "Food", undefined, db);
    const item = addItem(category.id, "Market", db);
    const member = addMember("Ana", db);

    insertEntry(db, {
      id: "entry-3",
      itemId: item.id,
      ownerMemberId: member.id,
      amount: 1250,
      date: "2026-11-04",
      note: "Vegetables",
      createdAt: "2026-11-04T01:00:00.000Z",
      updatedAt: "2026-11-04T01:00:00.000Z",
    });
    insertEntry(db, {
      id: "entry-1",
      itemId: item.id,
      ownerMemberId: null,
      amount: 200,
      date: "2026-11-04",
      note: null,
      createdAt: time,
      updatedAt: time,
    });
    insertEntry(db, {
      id: "entry-2",
      itemId: item.id,
      ownerMemberId: null,
      amount: 300,
      date: "2026-11-04",
      note: null,
      createdAt: time,
      updatedAt: time,
    });
    insertEntry(db, {
      id: "october-entry",
      itemId: item.id,
      ownerMemberId: null,
      amount: 50,
      date: "2026-10-31",
      note: null,
      createdAt: time,
      updatedAt: time,
    });

    expect(listEntriesForMonth(db, "2026-11").map((entry) => entry.id)).toEqual(
      ["entry-3", "entry-1", "entry-2"],
    );
    expect(findEntryById(db, "entry-3")).toMatchObject({
      categoryName: "Food",
      itemName: "Market",
      ownerName: "Ana",
      isHousehold: false,
    });

    updateEntry(db, {
      id: "entry-2",
      itemId: item.id,
      ownerMemberId: null,
      amount: 1300,
      date: "2026-11-05",
      note: "Updated",
      createdAt: time,
      updatedAt: "2026-11-04T01:00:00.000Z",
    });
    expect(findEntryById(db, "entry-2")).toMatchObject({
      amount: 1300,
      date: "2026-11-05",
      isHousehold: true,
    });
    expect(deleteEntry(db, "entry-2")).toBe(true);
    expect(deleteEntry(db, "entry-2")).toBe(false);
  });

  it("counts entries and repoints them to a surviving item", () => {
    const db = database();
    const category = createCategory("expense", "Food", undefined, db);
    const source = addItem(category.id, "Market", db);
    const target = addItem(category.id, "Grocer", db);
    insertEntry(db, {
      id: "entry-1",
      itemId: source.id,
      ownerMemberId: null,
      amount: 500,
      date: "2026-11-01",
      note: null,
      createdAt: time,
      updatedAt: time,
    });

    expect(countEntriesByItem(db, source.id)).toBe(1);
    expect(countEntriesByCategory(db, category.id)).toBe(1);
    expect(
      repointEntriesForItem(
        db,
        source.id,
        target.id,
        "2026-11-04T02:00:00.000Z",
      ),
    ).toBe(1);
    expect(findEntryById(db, "entry-1")).toMatchObject({
      itemId: target.id,
      updatedAt: "2026-11-04T02:00:00.000Z",
    });
  });
});

// @vitest-environment node

import type Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn() }));

import { addItem, createCategory } from "@/server/categories-service";
import { getCategoriesView } from "@/server/categories-read";
import { openDatabase } from "@/server/db/database";
import { insertEntry } from "@/server/entries-store";

type DatabaseGlobal = typeof globalThis & {
  __celiaDatabase?: Database.Database;
};
const databaseGlobal = globalThis as DatabaseGlobal;

afterEach(() => {
  databaseGlobal.__celiaDatabase?.close();
  delete databaseGlobal.__celiaDatabase;
});

describe("getCategoriesView", () => {
  it("exposes entry counts for each category and item", async () => {
    const database = openDatabase(":memory:");
    databaseGlobal.__celiaDatabase = database;
    const category = createCategory("expense", "Food", undefined, database);
    const market = addItem(category.id, "Market", database);
    const grocer = addItem(category.id, "Grocer", database);
    insertEntry(database, {
      id: "entry-1",
      itemId: market.id,
      ownerMemberId: null,
      amount: 100,
      date: "2026-11-04",
      note: null,
      createdAt: "2026-11-04T00:00:00.000Z",
      updatedAt: "2026-11-04T00:00:00.000Z",
    });
    insertEntry(database, {
      id: "entry-2",
      itemId: grocer.id,
      ownerMemberId: null,
      amount: 200,
      date: "2026-11-04",
      note: null,
      createdAt: "2026-11-04T00:00:00.000Z",
      updatedAt: "2026-11-04T00:00:00.000Z",
    });
    insertEntry(database, {
      id: "entry-3",
      itemId: grocer.id,
      ownerMemberId: null,
      amount: 300,
      date: "2026-11-04",
      note: null,
      createdAt: "2026-11-04T00:00:00.000Z",
      updatedAt: "2026-11-04T00:00:00.000Z",
    });

    const view = await getCategoriesView();

    expect(view.expense).toMatchObject([
      {
        id: category.id,
        entryCount: 3,
        items: [
          { id: grocer.id, entryCount: 2 },
          { id: market.id, entryCount: 1 },
        ],
      },
    ]);
  });
});

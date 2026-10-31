// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { parseHexColor } from "@/domain/color";
import {
  findCategory,
  insertCategory,
  insertItem,
  listCategories,
  listItems,
  updateCategory,
} from "@/server/categories-store";
import { openDatabase } from "@/server/db/database";
import { findMember, insertMember } from "@/server/members-store";

const temporaryDirectories: string[] = [];
const databases: Database.Database[] = [];
const timestamp = "2026-09-28T00:00:00.000Z";

function createDatabase() {
  const directory = mkdtempSync(path.join(tmpdir(), "celia-stores-"));
  temporaryDirectories.push(directory);
  const database = openDatabase(path.join(directory, "celia.db"));
  databases.push(database);
  return database;
}

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.close();
  }

  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("stores", () => {
  it("maps member rows to the domain shape", () => {
    const database = createDatabase();

    insertMember(database, {
      id: "member-1",
      name: "Ana",
      nameKey: "ana",
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    expect(findMember(database, "member-1")).toEqual({
      id: "member-1",
      name: "Ana",
      archivedAt: null,
    });
  });

  it("maps category and item rows while excluding merged rows by default", () => {
    const database = createDatabase();

    insertCategory(database, {
      id: "category-1",
      umbrella: "expense",
      name: "Transport",
      nameKey: "transport",
      color: parseHexColor("#6f9aa5"),
      archivedAt: null,
      mergedIntoCategoryId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    insertCategory(database, {
      id: "category-2",
      umbrella: "expense",
      name: "Old transport",
      nameKey: "old transport",
      color: parseHexColor("#6f9aa5"),
      archivedAt: null,
      mergedIntoCategoryId: "category-1",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    insertItem(database, {
      id: "item-1",
      categoryId: "category-1",
      name: "Fuel",
      nameKey: "fuel",
      mergedIntoItemId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    insertItem(database, {
      id: "item-2",
      categoryId: "category-1",
      name: "Old fuel",
      nameKey: "old fuel",
      mergedIntoItemId: "item-1",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    expect(listCategories(database)).toEqual([
      {
        id: "category-1",
        umbrella: "expense",
        name: "Transport",
        color: "#6f9aa5",
        archivedAt: null,
        mergedIntoCategoryId: null,
      },
    ]);
    expect(listItems(database, "category-1")).toEqual([
      {
        id: "item-1",
        categoryId: "category-1",
        name: "Fuel",
        mergedIntoItemId: null,
      },
    ]);
    expect(
      findCategory(database, "category-2", { includeMerged: true }),
    ).toEqual({
      id: "category-2",
      umbrella: "expense",
      name: "Old transport",
      color: "#6f9aa5",
      archivedAt: null,
      mergedIntoCategoryId: "category-1",
    });
  });

  it("updates category details without changing its umbrella", () => {
    const database = createDatabase();

    insertCategory(database, {
      id: "category-1",
      umbrella: "expense",
      name: "Transport",
      nameKey: "transport",
      color: parseHexColor("#6f9aa5"),
      archivedAt: null,
      mergedIntoCategoryId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    expect(
      updateCategory(database, {
        id: "category-1",
        name: "Travel",
        nameKey: "travel",
        color: parseHexColor("#6f9aa5"),
        archivedAt: null,
        mergedIntoCategoryId: null,
        updatedAt: "2026-09-28T01:00:00.000Z",
      }),
    ).toEqual({
      id: "category-1",
      umbrella: "expense",
      name: "Travel",
      color: "#6f9aa5",
      archivedAt: null,
      mergedIntoCategoryId: null,
    });
  });
});

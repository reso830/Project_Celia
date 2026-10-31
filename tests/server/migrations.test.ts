// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase } from "@/server/db/database";

const temporaryDirectories: string[] = [];
const databases: Database.Database[] = [];

function createDatabase() {
  const directory = mkdtempSync(path.join(tmpdir(), "celia-migrations-"));
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

describe("database migrations", () => {
  it("creates version one with the structural household and umbrellas", () => {
    const database = createDatabase();

    expect(database.pragma("user_version", { simple: true })).toBe(1);
    expect(
      database.prepare("SELECT id, currency FROM household").all(),
    ).toEqual([{ id: "household", currency: "PHP" }]);
    expect(
      database.prepare("SELECT id FROM umbrellas ORDER BY sort_order").all(),
    ).toEqual([{ id: "income" }, { id: "expense" }, { id: "savings" }]);
  });

  it("does not duplicate structural rows when reopening a migrated database", () => {
    const database = createDatabase();
    const file = database.name;
    database.close();
    databases.splice(databases.indexOf(database), 1);

    const reopened = openDatabase(file);
    databases.push(reopened);

    expect(
      reopened.prepare("SELECT COUNT(*) AS count FROM household").get(),
    ).toEqual({
      count: 1,
    });
    expect(
      reopened.prepare("SELECT COUNT(*) AS count FROM umbrellas").get(),
    ).toEqual({
      count: 3,
    });
  });

  it("enables foreign keys, WAL file storage, and missing parent directories", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "celia-database-"));
    temporaryDirectories.push(directory);
    const database = openDatabase(path.join(directory, "nested", "celia.db"));
    databases.push(database);

    expect(database.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(database.pragma("journal_mode", { simple: true })).toBe("wal");
  });

  it("enforces foreign keys and schema checks", () => {
    const database = createDatabase();
    const timestamp = "2026-09-28T00:00:00.000Z";

    expect(() =>
      database
        .prepare(
          "INSERT INTO items (id, category_id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(
          "item-1",
          "missing-category",
          "Fuel",
          "fuel",
          timestamp,
          timestamp,
        ),
    ).toThrow(/FOREIGN KEY constraint failed/);
    expect(() =>
      database
        .prepare(
          "INSERT INTO categories (id, umbrella_id, name, name_key, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          "category-1",
          "savings",
          "Rainy day",
          "rainy day",
          "#7d8ba8",
          timestamp,
          timestamp,
        ),
    ).toThrow(/CHECK constraint failed/);
    expect(() =>
      database
        .prepare(
          "INSERT INTO categories (id, umbrella_id, name, name_key, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          "category-2",
          "income",
          "Salary",
          "salary",
          "#7D8BA8",
          timestamp,
          timestamp,
        ),
    ).toThrow(/CHECK constraint failed/);
    expect(() =>
      database
        .prepare(
          "INSERT INTO categories (id, umbrella_id, name, name_key, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          "category-3",
          "income",
          "Freelance",
          "freelance",
          "#zzzzzz",
          timestamp,
          timestamp,
        ),
    ).toThrow(/CHECK constraint failed/);
    expect(() =>
      database
        .prepare(
          "INSERT INTO household (id, currency, created_at) VALUES (?, ?, ?)",
        )
        .run("other", "PHP", timestamp),
    ).toThrow(/CHECK constraint failed/);
  });

  it("keeps archived names unique until a category is merged", () => {
    const database = createDatabase();
    const timestamp = "2026-09-28T00:00:00.000Z";
    const insertCategory = database.prepare(
      "INSERT INTO categories (id, umbrella_id, name, name_key, color, archived_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );

    insertCategory.run(
      "category-1",
      "expense",
      "Rent",
      "rent",
      "#7d8ba8",
      timestamp,
      timestamp,
      timestamp,
    );
    insertCategory.run(
      "category-target",
      "expense",
      "Housing",
      "housing",
      "#7f9b6e",
      null,
      timestamp,
      timestamp,
    );
    expect(() =>
      insertCategory.run(
        "category-2",
        "expense",
        "Rent",
        "rent",
        "#7f9b6e",
        null,
        timestamp,
        timestamp,
      ),
    ).toThrow(/UNIQUE constraint failed/);

    database
      .prepare("UPDATE categories SET merged_into_category_id = ? WHERE id = ?")
      .run("category-target", "category-1");
    expect(() =>
      insertCategory.run(
        "category-2",
        "expense",
        "Rent",
        "rent",
        "#7f9b6e",
        null,
        timestamp,
        timestamp,
      ),
    ).not.toThrow();
  });

  it("keeps archived member names unique", () => {
    const database = createDatabase();
    const timestamp = "2026-09-28T00:00:00.000Z";
    const insertMember = database.prepare(
      "INSERT INTO members (id, name, name_key, archived_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    );

    insertMember.run("member-1", "Ana", "ana", timestamp, timestamp, timestamp);
    expect(() =>
      insertMember.run("member-2", "Ana", "ana", null, timestamp, timestamp),
    ).toThrow(/UNIQUE constraint failed/);
  });

  it("rejects duplicate item names until the older item is merged", () => {
    const database = createDatabase();
    const timestamp = "2026-09-28T00:00:00.000Z";
    database
      .prepare(
        "INSERT INTO categories (id, umbrella_id, name, name_key, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        "category-1",
        "expense",
        "Transport",
        "transport",
        "#6f9aa5",
        timestamp,
        timestamp,
      );
    const insertItem = database.prepare(
      "INSERT INTO items (id, category_id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    );

    insertItem.run(
      "item-1",
      "category-1",
      "Fuel",
      "fuel",
      timestamp,
      timestamp,
    );
    insertItem.run(
      "item-target",
      "category-1",
      "Petrol",
      "petrol",
      timestamp,
      timestamp,
    );
    expect(() =>
      insertItem.run(
        "item-2",
        "category-1",
        "Fuel",
        "fuel",
        timestamp,
        timestamp,
      ),
    ).toThrow(/UNIQUE constraint failed/);

    database
      .prepare("UPDATE items SET merged_into_item_id = ? WHERE id = ?")
      .run("item-target", "item-1");
    expect(() =>
      insertItem.run(
        "item-2",
        "category-1",
        "Fuel",
        "fuel",
        timestamp,
        timestamp,
      ),
    ).not.toThrow();
  });
});

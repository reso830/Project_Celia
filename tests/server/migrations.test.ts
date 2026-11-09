// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import SqliteDatabase from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase } from "@/server/db/database";
import { migrations, runMigrations } from "@/server/db/migrations";

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
  it("creates version three with the structural household, umbrellas, and entries table", () => {
    const database = createDatabase();

    expect(database.pragma("user_version", { simple: true })).toBe(3);
    expect(
      database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'entries'",
        )
        .get(),
    ).toEqual({ name: "entries" });
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

  it("upgrades an existing F01 database without losing records", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "celia-v1-"));
    temporaryDirectories.push(directory);
    const database = new SqliteDatabase(path.join(directory, "celia.db"));
    databases.push(database);
    database.pragma("foreign_keys = ON");
    migrations[0].migrate(database);
    database.pragma("user_version = 1");
    const now = "2026-09-28T00:00:00.000Z";
    database
      .prepare("INSERT INTO members VALUES (?, ?, ?, ?, ?, ?)")
      .run("member", "Ana", "ana", null, now, now);
    database
      .prepare(
        "INSERT INTO categories (id, umbrella_id, name, name_key, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run("category", "expense", "Food", "food", "#7d8ba8", now, now);
    database
      .prepare(
        "INSERT INTO items (id, category_id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run("item", "category", "Rice", "rice", now, now);
    runMigrations(database);
    expect(database.pragma("user_version", { simple: true })).toBe(3);
    expect(database.prepare("SELECT id FROM members").all()).toEqual([
      { id: "member" },
    ]);
    expect(database.prepare("SELECT id FROM categories").all()).toEqual([
      { id: "category" },
    ]);
    expect(database.prepare("SELECT id FROM items").all()).toEqual([
      { id: "item" },
    ]);
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

  it("enforces each entry foreign key and check constraint", () => {
    const database = createDatabase();
    const timestamp = "2026-09-28T00:00:00.000Z";
    database
      .prepare(
        "INSERT INTO categories (id, umbrella_id, name, name_key, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        "category",
        "expense",
        "Food",
        "food",
        "#7d8ba8",
        timestamp,
        timestamp,
      );
    database
      .prepare(
        "INSERT INTO items (id, category_id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run("item", "category", "Rice", "rice", timestamp, timestamp);
    const insert = database.prepare(
      "INSERT INTO entries (id, item_id, owner_member_id, amount, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    expect(() =>
      insert.run(
        "missing-item",
        "missing",
        null,
        1,
        "2026-09-01",
        timestamp,
        timestamp,
      ),
    ).toThrow(/FOREIGN KEY constraint failed/);
    expect(() =>
      insert.run(
        "missing-member",
        "item",
        "missing",
        1,
        "2026-09-01",
        timestamp,
        timestamp,
      ),
    ).toThrow(/FOREIGN KEY constraint failed/);
    expect(() =>
      insert.run("zero", "item", null, 0, "2026-09-01", timestamp, timestamp),
    ).toThrow(/CHECK constraint failed/);
    expect(() =>
      insert.run("bad-date", "item", null, 1, "bad-date", timestamp, timestamp),
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

describe("F03 migration", () => {
  it("upgrades populated v2, enforces F03 constraints and preserves snapshots", () => {
    const db = new SqliteDatabase(":memory:");
    databases.push(db);
    db.pragma("foreign_keys = ON");
    migrations[0].migrate(db);
    migrations[1].migrate(db);
    db.pragma("user_version = 2");
    db.exec(
      `INSERT INTO members VALUES ('m','Ana','ana',NULL,'',''); INSERT INTO categories (id,umbrella_id,name,name_key,color,created_at,updated_at) VALUES ('c','expense','Food','food','#7d8ba8','',''); INSERT INTO items (id,category_id,name,name_key,created_at,updated_at) VALUES ('i','c','Rice','rice','',''); INSERT INTO entries VALUES ('e','i','m',101,'2026-09-01',NULL,'','');`,
    );
    runMigrations(db);
    expect(db.pragma("user_version", { simple: true })).toBe(3);
    expect(db.prepare("SELECT amount FROM entries").get()).toEqual({
      amount: 101,
    });
    const bucket = db.prepare(
      "INSERT INTO savings_buckets (id,name,name_key,type,opening_balance,counts_toward_buffer,is_default,created_at,updated_at) VALUES (?,?,?,'cash_buffer',?,1,?,'','')",
    );
    bucket.run("b", "Buffer", "buffer", 0, 1);
    expect(() => bucket.run("b2", "Other", "other", 0, 1)).toThrow(/UNIQUE/);
    expect(() => bucket.run("b3", "Negative", "negative", -1, 0)).toThrow(
      /CHECK/,
    );
    expect(() => bucket.run("b4", "BUFFER", "buffer", 0, 0)).toThrow(/UNIQUE/);
    expect(() =>
      db.exec("UPDATE savings_buckets SET counts_toward_buffer=0 WHERE id='b'"),
    ).toThrow(/CHECK/);
    const activity = db.prepare(
      "INSERT INTO savings_activities VALUES (?,?,'contribution',?,?,NULL,'','')",
    );
    expect(() => activity.run("a", "missing", 1, "2026-09-01")).toThrow(
      /FOREIGN KEY/,
    );
    expect(() => activity.run("a", "b", 0, "2026-09-01")).toThrow(/CHECK/);
    expect(() => activity.run("a", "b", 1, "2026/09/01")).toThrow(/CHECK/);
    db.exec(
      "INSERT INTO budget_models VALUES ('model','Model','model',NULL,0,'',''); INSERT INTO monthly_budget_plans VALUES ('plan','2026-09','model','Model',0,'','');",
    );
    const allocation = db.prepare(
      "INSERT INTO monthly_budget_allocations VALUES (?, 'plan', ?, ?, ?, ?, '')",
    );
    allocation.run("l", "category", "c", null, 100);
    expect(() => allocation.run("dup", "category", "c", null, 100)).toThrow(
      /UNIQUE/,
    );
    expect(() => allocation.run("bad", "bucket", "c", "b", 100)).toThrow(
      /CHECK/,
    );
    expect(() => allocation.run("bad", "bucket", null, "missing", 100)).toThrow(
      /FOREIGN KEY/,
    );
    expect(() => allocation.run("bad", "bucket", null, "b", -1)).toThrow(
      /CHECK/,
    );
    expect(() =>
      db.exec("UPDATE monthly_budget_plans SET month_key='2026-9'"),
    ).toThrow(/CHECK/);
    db.exec(
      "INSERT INTO budget_model_allocations VALUES ('ml','model','bucket',NULL,'b',500,''); DELETE FROM budget_models WHERE id='model';",
    );
    expect(
      db.prepare("SELECT source_model_id FROM monthly_budget_plans").get(),
    ).toEqual({ source_model_id: null });
    expect(
      db.prepare("SELECT amount FROM monthly_budget_allocations").get(),
    ).toEqual({ amount: 100 });
    expect(
      db.prepare("SELECT count(*) AS n FROM budget_model_allocations").get(),
    ).toEqual({ n: 0 });
    db.exec("DELETE FROM monthly_budget_plans");
    expect(
      db.prepare("SELECT count(*) AS n FROM monthly_budget_allocations").get(),
    ).toEqual({ n: 0 });
    runMigrations(db);
    expect(db.pragma("foreign_key_check")).toEqual([]);
  });
});

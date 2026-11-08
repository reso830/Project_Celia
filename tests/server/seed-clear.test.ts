// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDatabase } from "@/server/db/database";
import {
  clearAllData,
  getClearSummary,
  seedDemoData,
  type SeedData,
} from "@/server/demo";
import seed from "../../scripts/seed.json";

const database = openDatabase(":memory:");
afterEach(() => clearAllData(database));

describe("demo seed and clear", () => {
  it("the clear CLI preserves data without --yes and deletes it with --yes", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "celia-clear-test-"));
    const databasePath = path.join(directory, "demo.db");
    const fileDatabase = openDatabase(databasePath);
    try {
      seedDemoData(fileDatabase, { currentDate: "2026-11-06" });
      const before = getClearSummary(fileDatabase);
      const runClear = (args: string[]) =>
        spawnSync(
          process.execPath,
          [
            path.resolve("node_modules/tsx/dist/cli.mjs"),
            "--conditions",
            "react-server",
            path.resolve("scripts/clear.ts"),
            ...args,
          ],
          {
            cwd: process.cwd(),
            env: { ...process.env, CELIA_DB_PATH: databasePath },
            encoding: "utf8",
          },
        );
      const dryRun = runClear([]);
      expect(dryRun.status, dryRun.stderr).toBe(0);
      expect(dryRun.stdout).toContain("Dry run");
      expect(getClearSummary(fileDatabase)).toEqual(before);
      const confirmed = runClear(["--yes"]);
      expect(confirmed.status, confirmed.stderr).toBe(0);
      expect(confirmed.stdout).toContain("Cleared");
      expect(getClearSummary(fileDatabase)).toEqual({
        entriesCount: 0,
        itemsCount: 0,
        categoriesCount: 0,
        membersCount: 0,
      });
    } finally {
      fileDatabase.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("seeds twelve months, refuses a second seed, and repeats deterministically", () => {
    const first = seedDemoData(database, { currentDate: "2026-11-06" });
    const rows = database
      .prepare(
        "SELECT id, date, amount, note FROM entries ORDER BY date DESC, created_at DESC, id ASC",
      )
      .all();
    expect(first.membersSeeded).toBe(2);
    expect(first.categoriesSeeded).toBe(9);
    expect(
      database
        .prepare(
          "SELECT DISTINCT substr(date,1,7) AS month FROM entries ORDER BY month",
        )
        .all(),
    ).toHaveLength(12);
    expect(rows).not.toHaveLength(0);
    expect(
      database
        .prepare("SELECT COUNT(*) AS n FROM entries WHERE note IS NOT NULL")
        .get(),
    ).toEqual({ n: 0 });
    expect(() => seedDemoData(database, { currentDate: "2026-11-06" })).toThrow(
      "Database is not empty",
    );
    clearAllData(database);
    expect(seedDemoData(database, { currentDate: "2026-11-06" })).toEqual(
      first,
    );
    expect(
      database
        .prepare(
          "SELECT id, date, amount, note FROM entries ORDER BY date DESC, created_at DESC, id ASC",
        )
        .all(),
    ).toEqual(rows);
  });

  it("summarizes without changing data and clears only user records", () => {
    const seeded = seedDemoData(database, { currentDate: "2026-11-06" });
    const expected = {
      entriesCount: seeded.entriesSeeded,
      itemsCount: seeded.itemsSeeded,
      categoriesCount: seeded.categoriesSeeded,
      membersCount: seeded.membersSeeded,
    };
    expect(getClearSummary(database)).toEqual(expected);
    expect(getClearSummary(database)).toEqual(expected);
    expect(clearAllData(database)).toEqual(expected);
    expect(getClearSummary(database)).toEqual({
      entriesCount: 0,
      itemsCount: 0,
      categoriesCount: 0,
      membersCount: 0,
    });
    expect(
      database.prepare("SELECT COUNT(*) AS n FROM household").get(),
    ).toEqual({ n: 1 });
    expect(
      database.prepare("SELECT COUNT(*) AS n FROM umbrellas").get(),
    ).toEqual({ n: 3 });
  });

  it("preserves each prototype monthly category total in centavos", () => {
    seedDemoData(database, { currentDate: "2026-11-06" });
    for (const category of seed.categories) {
      const rows = database
        .prepare(
          "SELECT substr(e.date, 1, 7) AS month, SUM(e.amount) AS total FROM entries e JOIN items i ON i.id = e.item_id JOIN categories c ON c.id = i.category_id WHERE c.name = ? GROUP BY month ORDER BY month",
        )
        .all(category.name) as { month: string; total: number }[];
      expect(rows).toHaveLength(12);
      expect(rows.map((row) => row.total)).toEqual(
        category.actualSeries.map((amount) => amount * 100),
      );
      expect(rows[0].month).toBe("2025-12");
      expect(rows[11].month).toBe("2026-11");
    }
  });

  it("rolls back all records when seed fails after inserting records", () => {
    const invalid = {
      ...seed,
      categories: [
        ...seed.categories,
        {
          ...seed.categories[0],
          id: "invalid",
          name: "Invalid",
          color: "invalid",
        },
      ],
    };
    expect(() =>
      seedDemoData(database, {
        seedJson: invalid as SeedData,
        currentDate: "2026-11-06",
      }),
    ).toThrow();
    expect(getClearSummary(database)).toEqual({
      entriesCount: 0,
      itemsCount: 0,
      categoriesCount: 0,
      membersCount: 0,
    });
  });

  it("rolls back clear if deleting a member fails", () => {
    seedDemoData(database, { currentDate: "2026-11-06" });
    const before = getClearSummary(database);
    database.exec(
      "CREATE TRIGGER reject_member_delete BEFORE DELETE ON members BEGIN SELECT RAISE(ABORT, 'blocked'); END",
    );
    expect(() => clearAllData(database)).toThrow("blocked");
    expect(getClearSummary(database)).toEqual(before);
    database.exec("DROP TRIGGER reject_member_delete");
  });

  it("clears merged records even when their old names duplicate active names", () => {
    seedDemoData(database, { currentDate: "2026-11-06" });
    const now = "2026-11-06T00:00:00.000Z";
    const category = database
      .prepare(
        "SELECT id, umbrella_id, name, name_key, color FROM categories LIMIT 1",
      )
      .get() as {
      id: string;
      umbrella_id: string;
      name: string;
      name_key: string;
      color: string;
    };
    database
      .prepare(
        "INSERT INTO categories (id, umbrella_id, name, name_key, color, merged_into_category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        "old-category",
        category.umbrella_id,
        category.name,
        category.name_key,
        category.color,
        category.id,
        now,
        now,
      );
    const item = database
      .prepare("SELECT id, category_id, name, name_key FROM items LIMIT 1")
      .get() as {
      id: string;
      category_id: string;
      name: string;
      name_key: string;
    };
    database
      .prepare(
        "INSERT INTO items (id, category_id, name, name_key, merged_into_item_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        "old-item",
        item.category_id,
        item.name,
        item.name_key,
        item.id,
        now,
        now,
      );
    clearAllData(database);
    expect(getClearSummary(database)).toEqual({
      entriesCount: 0,
      itemsCount: 0,
      categoriesCount: 0,
      membersCount: 0,
    });
  });
});

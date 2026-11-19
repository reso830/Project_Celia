// @vitest-environment node

import Database from "better-sqlite3";
import { expect, it } from "vitest";
import { mergeCategory } from "@/server/categories-service";
import { migrations, runMigrations } from "@/server/db/migrations";
import { openDatabase } from "@/server/db/database";
import { clearAllData, getClearSummary, seedDemoData } from "@/server/demo";
import { getScenarioById, listScenarios } from "@/server/forecaster-store";

it("upgrades populated v3 data and preserves the baseline across clear", () => {
  const db = new Database(":memory:");
  try {
    db.pragma("foreign_keys = ON");
    for (const migration of migrations.slice(0, 3)) migration.migrate(db);
    db.pragma("user_version = 3");
    db.exec(
      "INSERT INTO members (id,name,name_key,created_at,updated_at) VALUES ('member','Member','member','now','now')",
    );
    runMigrations(db);
    runMigrations(db);
    expect(db.pragma("user_version", { simple: true })).toBe(4);
    expect(db.prepare("SELECT id FROM members").get()).toEqual({
      id: "member",
    });
    const [baseline] = listScenarios(db);
    expect(baseline).toMatchObject({
      id: "baseline",
      isBaseline: true,
      paletteKey: null,
    });
    expect(new Date(baseline.createdAt).toISOString()).toBe(baseline.createdAt);
    clearAllData(db);
    expect(listScenarios(db)).toEqual([baseline]);
    expect(
      Object.values(getClearSummary(db)).every((count) => count === 0),
    ).toBe(true);
  } finally {
    db.close();
  }
});

it("rejects invalid palette, strings, integer amounts, and a second baseline", () => {
  const db = openDatabase(":memory:");
  try {
    const insert = db.prepare(
      "INSERT INTO scenarios(id,name,short_label,palette_key,draw_amount,is_baseline,created_at,updated_at) VALUES('test',?,?,?,?,?,'now','now')",
    );
    for (const args of [
      ["Test", "TEST", null, 0, 0],
      ["Test", "TEST", "rose", 0, 0],
      ["Test", "TEST", "teal", 0, 1],
      ["Test", "TEST", null, 0, 1],
      ["", "TEST", "teal", 0, 0],
      ["Test", "", "teal", 0, 0],
      ["Test", "TEST", "teal", -1, 0],
      ["Test", "TEST", "teal", 1.5, 0],
    ])
      expect(() => insert.run(...args)).toThrow(/constraint/i);
    insert.run("Test", "TEST", "teal", 0, 0);
    const insertEvent = db.prepare(
      "INSERT INTO scenario_events(id,scenario_id,name,type,monthly_amount,created_at,updated_at) VALUES('event','test','Cost','recurring',?,'now','now')",
    );
    for (const amount of [-1, 0, 1.5])
      expect(() => insertEvent.run(amount)).toThrow(/constraint/i);
    seedDemoDataAfterClear(db);
    expect(() =>
      db.exec("UPDATE scenario_nudges SET delta_amount = 0.5"),
    ).toThrow(/constraint/i);
  } finally {
    db.close();
  }
});

function seedDemoDataAfterClear(db: Database.Database) {
  clearAllData(db);
  seedDemoData(db, { currentDate: "2026-11-18" });
}

it("seeds stable alternatives and merges nudges through the category service", () => {
  const db = openDatabase(":memory:");
  try {
    seedDemoData(db, { currentDate: "2026-11-18" });
    expect(
      listScenarios(db).map(({ id, displayOrder }) => [id, displayOrder]),
    ).toEqual([
      ["baseline", 0],
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
    expect(getScenarioById(db, "missing")).toBeNull();
    const loan = getScenarioById(db, "a")!;
    const source = loan.nudges.find((nudge) => nudge.deltaAmount === -450_000)!;
    const target = getScenarioById(db, "b")!.nudges[0];
    expect(loan.nudges.find((nudge) => nudge.bucketId)?.deltaAmount).toBe(
      500_000,
    );
    expect(() => seedDemoData(db)).toThrow("Database is not empty");
    const snapshot = db
      .prepare("SELECT * FROM monthly_budget_allocations ORDER BY id")
      .all();
    mergeCategory(target.categoryId!, source.categoryId!, db);
    expect(
      getScenarioById(db, "a")!.nudges.find(
        (nudge) => nudge.categoryId === source.categoryId,
      )?.deltaAmount,
    ).toBe(-650_000);
    expect(getScenarioById(db, "b")!.nudges).toEqual([
      expect.objectContaining({
        id: target.id,
        categoryId: source.categoryId,
        deltaAmount: -100_000,
      }),
    ]);
    expect(
      db.prepare("SELECT * FROM monthly_budget_allocations ORDER BY id").all(),
    ).toEqual(snapshot);
  } finally {
    db.close();
  }
});

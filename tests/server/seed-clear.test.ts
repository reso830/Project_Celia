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
const emptySummary = {
  entriesCount: 0,
  itemsCount: 0,
  categoriesCount: 0,
  membersCount: 0,
  savingsBucketsCount: 0,
  savingsActivitiesCount: 0,
  budgetModelsCount: 0,
  budgetModelAllocationsCount: 0,
  monthlyBudgetPlansCount: 0,
  monthlyBudgetAllocationsCount: 0,
};
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
      for (const key of Object.keys(emptySummary))
        expect(dryRun.stdout).toContain(key);
      expect(dryRun.stdout).toContain("savingsBucketsCount: 4");
      expect(getClearSummary(fileDatabase)).toEqual(before);
      const confirmed = runClear(["--yes"]);
      expect(confirmed.status, confirmed.stderr).toBe(0);
      expect(confirmed.stdout).toContain("Cleared");
      expect(confirmed.stdout).toContain("monthlyBudgetPlansCount: 12");
      expect(getClearSummary(fileDatabase)).toEqual(emptySummary);
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
    const activities = database
      .prepare(
        "SELECT id,bucket_id,kind,amount,date,note FROM savings_activities ORDER BY id",
      )
      .all();
    const snapshots = database
      .prepare(
        "SELECT id,plan_id,target_type,amount FROM monthly_budget_allocations ORDER BY id",
      )
      .all() as { id: string }[];
    for (const row of snapshots)
      expect(row.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
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
    expect(
      database
        .prepare(
          "SELECT id,bucket_id,kind,amount,date,note FROM savings_activities ORDER BY id",
        )
        .all(),
    ).toEqual(activities);
    expect(
      database
        .prepare(
          "SELECT id,plan_id,target_type,amount FROM monthly_budget_allocations ORDER BY id",
        )
        .all(),
    ).toEqual(snapshots);
  });

  it("seeds F03 balances, monthly funding, model allocations and independent plans from the fixture", () => {
    const seeded = seedDemoData(database, { currentDate: "2026-11-01" });
    expect(seeded).toMatchObject({
      savingsBucketsSeeded: 4,
      savingsActivitiesSeeded: 36,
      budgetModelsSeeded: 3,
      budgetModelAllocationsSeeded: 36,
      monthlyBudgetPlansSeeded: 12,
      monthlyBudgetAllocationsSeeded: 144,
    });
    expect(
      database
        .prepare("SELECT name FROM savings_buckets ORDER BY created_at,id")
        .all(),
    ).toEqual(seed.buckets.map((bucket) => ({ name: bucket.name })));
    const balances = database
      .prepare(
        "SELECT b.name,b.opening_balance+COALESCE(SUM(a.amount),0) AS balance,b.type,b.target_month,b.target_amount,b.counts_toward_buffer,b.is_default FROM savings_buckets b LEFT JOIN savings_activities a ON a.bucket_id=b.id GROUP BY b.id ORDER BY b.name",
      )
      .all();
    expect(balances).toEqual([
      {
        name: "Car down payment",
        balance: 14500000,
        type: "goal",
        target_month: "2027-02",
        target_amount: 18000000,
        counts_toward_buffer: 0,
        is_default: 0,
      },
      {
        name: "Cash buffer",
        balance: 25000000,
        type: "cash_buffer",
        target_month: null,
        target_amount: null,
        counts_toward_buffer: 1,
        is_default: 1,
      },
      {
        name: "Emergency fund",
        balance: 21600000,
        type: "emergency_fund",
        target_month: null,
        target_amount: null,
        counts_toward_buffer: 1,
        is_default: 0,
      },
      {
        name: "Insurance",
        balance: 2400000,
        type: "sinking_fund",
        target_month: "2027-03",
        target_amount: 2400000,
        counts_toward_buffer: 0,
        is_default: 0,
      },
    ]);
    const activities = database
      .prepare(
        "SELECT b.name,a.kind,a.amount,a.date FROM savings_activities a JOIN savings_buckets b ON b.id=a.bucket_id ORDER BY a.date,b.name",
      )
      .all() as { name: string; kind: string; amount: number; date: string }[];
    expect(activities).toHaveLength(36);
    for (let i = 0; i < 12; i++) {
      const date = new Date(2025, 11 + i, 1),
        month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      expect(activities.slice(i * 3, i * 3 + 3)).toEqual([
        {
          name: "Car down payment",
          kind: "contribution",
          amount: 500000,
          date: `${month}-01`,
        },
        {
          name: "Emergency fund",
          kind: "contribution",
          amount: 800000,
          date: `${month}-01`,
        },
        {
          name: "Insurance",
          kind: "contribution",
          amount: 200000,
          date: `${month}-01`,
        },
      ]);
    }
    expect(activities.every((a) => a.date <= "2026-11-01")).toBe(true);
    for (const model of seed.models) {
      const stored = database
        .prepare(
          "SELECT a.target_type,COALESCE(c.name,b.name) AS name,a.amount FROM budget_model_allocations a JOIN budget_models m ON m.id=a.model_id LEFT JOIN categories c ON c.id=a.category_id LEFT JOIN savings_buckets b ON b.id=a.bucket_id WHERE m.name=? ORDER BY name",
        )
        .all(model.name);
      const expected = [
        ...Object.entries(model.budgets)
          .filter(([, n]) => n > 0)
          .map(([id, n]) => ({
            target_type: "category",
            name: seed.categories.find((c) => c.id === id)!.name,
            amount: n * 100,
          })),
        ...Object.entries(model.savings)
          .filter(([, n]) => n > 0)
          .map(([id, n]) => ({
            target_type: "bucket",
            name: seed.buckets.find((b) => b.id === id)!.name,
            amount: n * 100,
          })),
      ].sort((a, b) => a.name.localeCompare(b.name));
      expect(stored).toEqual(expected);
    }
    const plans = database
      .prepare(
        "SELECT p.month_key,p.model_name,p.is_revised,m.name AS source,COUNT(a.id) AS allocations,SUM(a.amount) AS total FROM monthly_budget_plans p JOIN budget_models m ON m.id=p.source_model_id JOIN monthly_budget_allocations a ON a.plan_id=p.id GROUP BY p.id ORDER BY p.month_key",
      )
      .all() as {
      month_key: string;
      model_name: string;
      is_revised: number;
      source: string;
      allocations: number;
      total: number;
    }[];
    expect(plans).toHaveLength(12);
    expect(plans[0].month_key).toBe("2025-12");
    expect(plans[11].month_key).toBe("2026-11");
    const baseline = seed.models[0],
      total =
        [
          ...Object.values(baseline.budgets),
          ...Object.values(baseline.savings),
        ].reduce((a, n) => a + n, 0) * 100;
    for (const plan of plans)
      expect(plan).toMatchObject({
        model_name: baseline.name,
        source: baseline.name,
        is_revised: 0,
        allocations: 12,
        total,
      });
    database.prepare("UPDATE budget_model_allocations SET amount=1").run();
    expect(
      database
        .prepare("SELECT SUM(amount) AS total FROM monthly_budget_allocations")
        .get(),
    ).toEqual({ total: total * 12 });
    expect(database.pragma("foreign_key_check")).toEqual([]);
  });
  it.each(["savings_buckets", "budget_models", "monthly_budget_plans"])(
    "refuses seed when only %s contains user data",
    (table) => {
      if (table === "savings_buckets")
        database.exec(
          "INSERT INTO savings_buckets(id,name,name_key,type,opening_balance,counts_toward_buffer,is_default,created_at,updated_at) VALUES('only','Only','only','goal',0,0,0,'now','now')",
        );
      else if (table === "budget_models")
        database.exec(
          "INSERT INTO budget_models(id,name,name_key,created_at,updated_at) VALUES('only','Only','only','now','now')",
        );
      else
        database.exec(
          "INSERT INTO monthly_budget_plans(id,month_key,model_name,applied_at,updated_at) VALUES('only','2026-11','Deleted model','now','now')",
        );
      const before = getClearSummary(database);
      expect(() => seedDemoData(database)).toThrow("Database is not empty");
      expect(getClearSummary(database)).toEqual(before);
    },
  );
  it("rolls back F03 and existing records when a late monthly allocation fails", () => {
    database.exec(
      "CREATE TRIGGER reject_demo_plan BEFORE INSERT ON monthly_budget_allocations BEGIN SELECT RAISE(ABORT,'blocked plan'); END",
    );
    try {
      expect(() =>
        seedDemoData(database, { currentDate: "2026-11-06" }),
      ).toThrow("blocked plan");
      expect(getClearSummary(database)).toEqual(emptySummary);
    } finally {
      database.exec("DROP TRIGGER reject_demo_plan");
    }
  });
  it("reports F03 seeded counts in CLI stdout", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "celia-seed-test-"));
    try {
      const result = spawnSync(
        process.execPath,
        [
          path.resolve("node_modules/tsx/dist/cli.mjs"),
          "--conditions",
          "react-server",
          path.resolve("scripts/seed.ts"),
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            CELIA_DB_PATH: path.join(directory, "demo.db"),
          },
          encoding: "utf8",
        },
      );
      expect(result.status, result.stderr).toBe(0);
      for (const text of [
        "savingsBucketsSeeded: 4",
        "savingsActivitiesSeeded: 36",
        "budgetModelsSeeded: 3",
        "monthlyBudgetPlansSeeded: 12",
      ])
        expect(result.stdout).toContain(text);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("summarizes without changing data and clears only user records", () => {
    const seeded = seedDemoData(database, { currentDate: "2026-11-06" });
    const expected = {
      entriesCount: seeded.entriesSeeded,
      itemsCount: seeded.itemsSeeded,
      categoriesCount: seeded.categoriesSeeded,
      membersCount: seeded.membersSeeded,
      savingsBucketsCount: 4,
      savingsActivitiesCount: 36,
      budgetModelsCount: 3,
      budgetModelAllocationsCount: 36,
      monthlyBudgetPlansCount: 12,
      monthlyBudgetAllocationsCount: 144,
    };
    expect(getClearSummary(database)).toEqual(expected);
    expect(getClearSummary(database)).toEqual(expected);
    expect(clearAllData(database)).toEqual(expected);
    expect(getClearSummary(database)).toEqual(emptySummary);
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
    expect(getClearSummary(database)).toEqual(emptySummary);
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
    expect(getClearSummary(database)).toEqual(emptySummary);
  });
});

// @vitest-environment node

import { performance } from "node:perf_hooks";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mergeCategory } from "@/server/categories-service";
import { openDatabase } from "@/server/db/database";
import { seedDemoData } from "@/server/demo";
import { getForecasterView } from "@/server/forecaster-read";
import { upsertScenarioNudge } from "@/server/forecaster-service";

vi.mock("next/server", () => ({ connection: async () => {} }));
const state = globalThis as typeof globalThis & {
  __celiaDatabase?: ReturnType<typeof openDatabase>;
};
let db: ReturnType<typeof openDatabase>;

beforeEach(() => {
  vi.setSystemTime(new Date(2026, 10, 18, 12));
  db = openDatabase(":memory:");
  state.__celiaDatabase = db;
  seedDemoData(db, { currentDate: "2026-11-18" });
});

afterEach(() => {
  db.close();
  delete state.__celiaDatabase;
  vi.useRealTimers();
});

it("uses the current applied snapshot and active buffer, and selects scenarios", async () => {
  const view = await getForecasterView("a");
  expect(view).toMatchObject({
    activeScenarioId: "a",
    appliedMonthKey: "2026-11",
    hasAppliedPlan: true,
    baselineName: "Baseline 2026",
    baselineMetrics: {
      monthlyIncome: 11_950_000,
      monthlyExpense: 7_900_000,
      monthlySavings: 2_000_000,
      monthlyUnallocated: 2_050_000,
      startingBuffer: 46_600_000,
      runwayMonths: 5.9,
      verdict: { tier: "Tight but doable" },
    },
    selectedMetrics: {
      monthlyExpense: 9_693_000,
      monthlyUnallocated: -243_000,
      runwayMonths: 3.8,
    },
  });
  expect(view.scenarios[0]).toMatchObject({
    id: "baseline",
    name: "Baseline 2026",
  });
  expect(view.comparisonMetrics.map(({ scenarioId }) => scenarioId)).toEqual([
    "baseline",
    "a",
    "b",
    "c",
  ]);
  expect(view.outlook.bars).toHaveLength(24);
  expect(view.outlook.milestones.at(-1)?.monthKey).toBe("2028-10");
  for (const id of [
    undefined,
    "",
    "invalid",
    "00000000-0000-4000-8000-000000000000",
  ]) {
    expect((await getForecasterView(id)).activeScenarioId).toBe("baseline");
  }
});

it("returns the current-month empty state when only prior plans exist", async () => {
  vi.setSystemTime(new Date(2026, 11, 1, 12));
  expect(await getForecasterView("a")).toMatchObject({
    appliedMonthKey: "2026-12",
    hasAppliedPlan: false,
    nudgeTargets: [],
    baselineMetrics: { planId: null },
    comparisonMetrics: [],
    outlook: { bars: [], polylines: [] },
  });
});

it("exposes applied nudge targets before the selected scenario has adjusted them", async () => {
  const view = await getForecasterView("b");
  const groceries = view.nudgeTargets.find(({ name }) => name === "Groceries");
  expect(groceries).toMatchObject({
    targetType: "category",
    categoryId: expect.any(String),
    bucketId: null,
    baseAllocation: 2_000_000,
    isArchived: false,
  });
  expect(
    view.scenarios.find(({ id }) => id === "b")?.nudges,
  ).not.toContainEqual(
    expect.objectContaining({ categoryId: groceries?.categoryId }),
  );
  expect(view.nudgeTargets).toContainEqual(
    expect.objectContaining({
      name: "Car down payment",
      targetType: "bucket",
      categoryId: null,
      bucketId: expect.any(String),
      baseAllocation: 1_000_000,
    }),
  );
  expect(view.nudgeTargets.map(({ name }) => name)).not.toContain("Salary");
  const cash = db
    .prepare("SELECT id FROM savings_buckets WHERE is_default = 1")
    .get() as { id: string };
  expect(view.nudgeTargets).not.toContainEqual(
    expect.objectContaining({ bucketId: cash.id }),
  );
  upsertScenarioNudge(db, "b", {
    targetType: "bucket",
    categoryId: null,
    bucketId: cash.id,
    deltaAmount: 50_000,
  });
  const updated = await getForecasterView("b");
  expect(updated.scenarios.find(({ id }) => id === "b")?.nudges).toContainEqual(
    expect.objectContaining({
      bucketId: cash.id,
      baseAllocation: 0,
      adjustedAllocation: 50_000,
    }),
  );
});

it("retains a deleted source model's snapshot and reflects revised allocations", async () => {
  const plan = db
    .prepare(
      "SELECT id, source_model_id AS modelId FROM monthly_budget_plans WHERE month_key = '2026-11'",
    )
    .get() as { id: string; modelId: string };
  db.prepare("DELETE FROM budget_models WHERE id = ?").run(plan.modelId);
  expect((await getForecasterView()).baselineMetrics.monthlyExpense).toBe(
    7_900_000,
  );
  db.prepare("UPDATE monthly_budget_plans SET is_revised = 1 WHERE id = ?").run(
    plan.id,
  );
  db.prepare(
    "UPDATE monthly_budget_allocations SET amount = amount + 50_000 WHERE plan_id = ? AND category_id = (SELECT id FROM categories WHERE name_key = 'groceries')",
  ).run(plan.id);
  expect((await getForecasterView()).baselineMetrics).toMatchObject({
    planId: plan.id,
    monthlyExpense: 7_950_000,
    monthlyUnallocated: 2_000_000,
  });
});

it("folds transitive merges into nudge bases and keeps archived nudges in the forecast", async () => {
  const categories = db
    .prepare("SELECT id, name_key AS name FROM categories")
    .all() as { id: string; name: string }[];
  const id = (name: string) =>
    categories.find((category) => category.name === name)!.id;
  mergeCategory(id("groceries"), id("dining out"), db);
  mergeCategory(id("dining out"), id("transport"), db);
  db.prepare("UPDATE categories SET archived_at = 'now' WHERE id = ?").run(
    id("transport"),
  );
  const view = await getForecasterView("a");
  expect(view.baselineMetrics.monthlyExpense).toBe(7_900_000);
  expect(view.selectedMetrics.monthlyExpense).toBe(9_693_000);
  expect(view.nudgeTargets).toContainEqual({
    targetType: "category",
    categoryId: id("transport"),
    bucketId: null,
    name: "Transport",
    isArchived: true,
    baseAllocation: 3_200_000,
  });
  expect(view.nudgeTargets.map(({ categoryId }) => categoryId)).not.toContain(
    id("groceries"),
  );
  expect(view.scenarios.find(({ id }) => id === "a")?.nudges).toContainEqual(
    expect.objectContaining({
      categoryId: id("transport"),
      targetName: "Transport",
      isArchived: true,
      baseAllocation: 3_200_000,
      adjustedAllocation: 2_350_000,
      freedAmount: 850_000,
    }),
  );
});

it("reports seeded household read latency against the 10 ms target", async () => {
  await getForecasterView("a");
  const start = performance.now();
  for (let i = 0; i < 10; i++) await getForecasterView("a");
  console.info(
    `Forecaster read mean: ${((performance.now() - start) / 10).toFixed(2)} ms (target <10 ms)`,
  );
});

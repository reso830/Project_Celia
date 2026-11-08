// @vitest-environment node
import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openDatabase } from "@/server/db/database";
import * as models from "@/server/models-service";
import * as store from "@/server/models-store";
import { getModelsView } from "@/server/models-read";
import { getSavingsView } from "@/server/savings-read";
import {
  createCategory,
  archiveCategory,
  mergeCategory,
  addItem,
} from "@/server/categories-service";
import { createEntry } from "@/server/entries-service";
import {
  createSavingsBucket,
  archiveSavingsBucket,
  createSavingsActivity,
} from "@/server/savings-service";
import { calculateBudgetComparisonRows } from "@/domain/budget-calculations";
import { connection } from "next/server";
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
const state = globalThis as typeof globalThis & {
  __celiaDatabase?: Database.Database;
};
let db: Database.Database;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 8, 12));
  db = openDatabase(":memory:");
  state.__celiaDatabase = db;
});
afterEach(() => {
  db.close();
  delete state.__celiaDatabase;
  vi.useRealTimers();
  vi.clearAllMocks();
});
const expense = (name: string) =>
  createCategory("expense", name, undefined, db);
const allocate = (
  id: string,
  targetId: string,
  amount: string,
  targetType = "category",
) => models.updateBudgetModel(id, { targetType, targetId, amount }, db);
const rows = (v: Awaited<ReturnType<typeof getModelsView>>) =>
  calculateBudgetComparisonRows({
    categories: v.categories,
    buckets: v.buckets,
    plannedByCategory: v.appliedPlan!.allocationsByCategory,
    plannedByBucket: v.appliedPlan!.allocationsByBucket,
    foldMergedCategories: true,
  });
describe("budget models and monthly plans", () => {
  it("supports metadata, exact allocations and unique copies while preserving independent snapshots", () => {
    const c = expense("Food");
    const m = models.createBudgetModel(
      { name: " Base ", description: " plan " },
      db,
    );
    expect(m).toMatchObject({
      name: "Base",
      description: "plan",
      allocations: [],
    });
    expect(() => models.createBudgetModel({ name: " base " }, db)).toThrow(
      expect.objectContaining({ code: "duplicate_name" }),
    );
    allocate(m.id, c.id, "20000.01");
    const sep = models.applyBudgetModelToMonth(m.id, "2026-09", db);
    const oct = models.applyBudgetModelToMonth(m.id, "2026-10", db);
    allocate(m.id, c.id, "22000");
    expect(store.findMonthlyBudgetPlan(db, "2026-09")).toEqual(sep);
    const first = models.duplicateBudgetModel(m.id, {}, db),
      second = models.duplicateBudgetModel(m.id, { name: "" }, db);
    expect(first.name).toBe("Base (Copy)");
    expect(second.name).toBe("Base (Copy 2)");
    expect(first.allocations[0].amount).toBe(2200000);
    expect(first.allocations[0].id).not.toBe(sep.allocations[0].id);
    expect(
      models.updateBudgetModel(m.id, { description: "" }, db).description,
    ).toBe(null);
    expect(
      models.duplicateBudgetModel(
        m.id,
        { name: "Custom", description: "custom" },
        db,
      ),
    ).toMatchObject({ name: "Custom", description: "custom" });
    models.deleteBudgetModel(m.id, db);
    expect(store.findMonthlyBudgetPlan(db, "2026-09")).toEqual({
      ...sep,
      sourceModelId: null,
    });
    expect(store.findMonthlyBudgetPlan(db, "2026-10")).toEqual({
      ...oct,
      sourceModelId: null,
    });
  });
  it("revises raw snapshot lines independently, includes later entities and resets revision on reapply", async () => {
    const c = expense("Food");
    const m = models.createBudgetModel({ name: "Base" }, db);
    allocate(m.id, c.id, "100");
    const plan = models.applyBudgetModelToMonth(m.id, "2026-09", db);
    const later = expense("Later");
    const b = createSavingsBucket({ name: "Bucket", type: "goal" }, db);
    models.reviseMonthlyBudgetPlan(
      "2026-09",
      { targetType: "category", targetId: later.id, amount: "20" },
      db,
    );
    const revised = models.reviseMonthlyBudgetPlan(
      "2026-09",
      { targetType: "bucket", targetId: b.id, amount: "30" },
      db,
    );
    expect(revised.isRevised).toBe(true);
    expect(revised.id).toBe(plan.id);
    expect(store.findBudgetModelById(db, m.id)!.allocations).toHaveLength(1);
    expect((await getModelsView("2026-09")).models[0].badge).toBe("REVISED");
    const reapplied = models.applyBudgetModelToMonth(m.id, "2026-09", db);
    expect(reapplied.id).toBe(plan.id);
    expect(reapplied.isRevised).toBe(false);
    expect(reapplied.allocations).toHaveLength(1);
  });
  it("keeps archived allocations in templates/history, skips them on apply, and detects divergence", async () => {
    const c = expense("Food");
    const b = createSavingsBucket({ name: "Bucket", type: "goal" }, db);
    const m = models.createBudgetModel({ name: "Base" }, db);
    allocate(m.id, c.id, "100");
    allocate(m.id, b.id, "50", "bucket");
    models.applyBudgetModelToMonth(m.id, "2026-09", db);
    archiveCategory(c.id, db);
    archiveSavingsBucket(b.id, db);
    const view = await getModelsView("2026-09");
    expect(view.models[0].badge).toBe("DIVERGED");
    expect(view.appliedPlan!.hasTemplateDiverged).toBe(true);
    expect(view.models[0].summary).toMatchObject({
      plannedExpensesCentavos: 10000,
      plannedSavingsCentavos: 5000,
    });
    expect(
      models.applyBudgetModelToMonth(m.id, "2026-10", db).allocations,
    ).toEqual([]);
    for (const [targetType, targetId] of [
      ["category", c.id],
      ["bucket", b.id],
    ]) {
      expect(() => allocate(m.id, targetId, "1", targetType)).toThrow(
        expect.objectContaining({ code: "archived" }),
      );
      expect(() =>
        models.reviseMonthlyBudgetPlan(
          "2026-09",
          { targetType, targetId, amount: "1" },
          db,
        ),
      ).toThrow(expect.objectContaining({ code: "archived" }));
      allocate(m.id, targetId, "0", targetType);
      models.reviseMonthlyBudgetPlan(
        "2026-09",
        { targetType, targetId, amount: "0" },
        db,
      );
    }
    expect(store.findBudgetModelById(db, m.id)!.allocations).toEqual([]);
    expect(store.findMonthlyBudgetPlan(db, "2026-09")!.allocations).toEqual([]);
  });
  it("merges templates atomically, preserves snapshot rows and folds actuals without false surplus", async () => {
    const s = expense("Dining"),
      d = expense("Groceries");
    const m = models.createBudgetModel({ name: "Base" }, db);
    allocate(m.id, s.id, "5000");
    allocate(m.id, d.id, "20000");
    const si = addItem(s.id, "Meal", db),
      di = addItem(d.id, "Market", db);
    for (const [itemId, amount] of [
      [si.id, "4000"],
      [di.id, "18000"],
    ])
      createEntry(
        {
          type: "expense",
          itemId,
          ownerMemberId: null,
          amount,
          date: "2026-08-01",
        },
        db,
      );
    const snapshot = models.applyBudgetModelToMonth(m.id, "2026-08", db);
    mergeCategory(s.id, d.id, db);
    expect(store.findMonthlyBudgetPlan(db, "2026-08")).toEqual(snapshot);
    expect(store.findBudgetModelById(db, m.id)!.allocations).toMatchObject([
      { categoryId: d.id, amount: 2500000 },
    ]);
    const view = await getModelsView("2026-08");
    const comparison = rows(view);
    expect(comparison.find((r) => r.targetId === s.id)).toMatchObject({
      deltaCentavos: 0,
      tone: "muted",
      isFoldedIntoMergeTarget: true,
    });
    expect(comparison.find((r) => r.targetId === d.id)).toMatchObject({
      rawPlannedCentavos: 2000000,
      plannedCentavos: 2500000,
      actualCentavos: 2200000,
      deltaCentavos: 300000,
    });
    models.reviseMonthlyBudgetPlan(
      "2026-08",
      { targetType: "category", targetId: d.id, amount: "21000" },
      db,
    );
    const reloaded = rows(await getModelsView("2026-08"));
    expect(reloaded.find((r) => r.targetId === d.id)).toMatchObject({
      rawPlannedCentavos: 2100000,
      plannedCentavos: 2600000,
    });
    expect(reloaded.find((r) => r.targetId === s.id)!.rawPlannedCentavos).toBe(
      500000,
    );
  });
  it.each([false, true])(
    "loads merge closure with zero allocations and no actuals (chain=%s)",
    async (chain) => {
      const s = expense("Source"),
        d = expense("Intermediate"),
        t = expense("Terminal");
      const m = models.createBudgetModel({ name: "Base" }, db);
      allocate(m.id, s.id, "5000");
      models.applyBudgetModelToMonth(m.id, "2026-08", db);
      mergeCategory(s.id, d.id, db);
      if (chain) mergeCategory(d.id, t.id, db);
      const terminal = chain ? t : d;
      archiveCategory(terminal.id, db);
      const view = await getModelsView("2026-08");
      expect(view.categories.map((c) => c.id)).toEqual(
        expect.arrayContaining([s.id, d.id, terminal.id]),
      );
      expect(rows(view).find((r) => r.targetId === terminal.id)).toMatchObject({
        archived: true,
        rawPlannedCentavos: 0,
        plannedCentavos: 500000,
      });
    },
  );
  it("rolls back category moves and allocations if merge fails", () => {
    const s = expense("Source"),
      d = expense("Destination");
    const item = addItem(s.id, "Item", db);
    const m = models.createBudgetModel({ name: "Base" }, db);
    allocate(m.id, s.id, "10");
    allocate(m.id, d.id, "20");
    const before = store.findBudgetModelById(db, m.id);
    db.exec(
      "CREATE TRIGGER reject_merge BEFORE UPDATE ON budget_model_allocations BEGIN SELECT RAISE(ABORT,'forced merge failure'); END;",
    );
    expect(() => mergeCategory(s.id, d.id, db)).toThrow("forced merge failure");
    expect(store.findBudgetModelById(db, m.id)).toEqual(before);
    expect(
      db.prepare("SELECT category_id FROM items WHERE id=?").get(item.id),
    ).toEqual({ category_id: s.id });
  });
  it("keeps existing monthly snapshot intact when reapply fails after replacement starts", () => {
    const c = expense("Food"),
      m = models.createBudgetModel({ name: "Base" }, db);
    allocate(m.id, c.id, "10");
    const before = models.applyBudgetModelToMonth(m.id, "2026-09", db);
    allocate(m.id, c.id, "20");
    db.exec(
      "CREATE TRIGGER reject_snapshot BEFORE INSERT ON monthly_budget_allocations BEGIN SELECT RAISE(ABORT,'forced apply failure'); END;",
    );
    expect(() => models.applyBudgetModelToMonth(m.id, "2026-09", db)).toThrow(
      "forced apply failure",
    );
    expect(store.findMonthlyBudgetPlan(db, "2026-09")).toEqual(before);
  });
  it("reports ACTIVE, DIVERGED, REVISED and null badges against the selected month", async () => {
    const c = expense("Food"),
      m = models.createBudgetModel({ name: "Base" }, db);
    allocate(m.id, c.id, "10");
    expect((await getModelsView("2026-09")).models[0].badge).toBe(null);
    models.applyBudgetModelToMonth(m.id, "2026-09", db);
    expect((await getModelsView("2026-09")).models[0].badge).toBe("ACTIVE");
    allocate(m.id, c.id, "20");
    expect((await getModelsView("2026-09")).models[0].badge).toBe("DIVERGED");
    models.reviseMonthlyBudgetPlan(
      "2026-09",
      { targetType: "category", targetId: c.id, amount: "15" },
      db,
    );
    expect((await getModelsView("2026-09")).models[0].badge).toBe("REVISED");
    expect((await getModelsView("2026-10")).appliedPlan).toBe(null);
  });
  it("validates targets, dates, empty/partial allocation patches and atomic metadata changes", () => {
    const m = models.createBudgetModel({ name: "Base" }, db);
    expect(() =>
      models.updateBudgetModel(
        m.id,
        {
          name: "Changed",
          targetType: "category",
          targetId: "missing",
          amount: "1",
        },
        db,
      ),
    ).toThrow(expect.objectContaining({ code: "not_found" }));
    expect(store.findBudgetModelById(db, m.id)!.name).toBe("Base");
    for (const patch of [
      {},
      { targetType: "other", targetId: "x", amount: "1" },
      { amount: "1" },
      { targetType: "category" },
      { name: "" },
    ])
      expect(() => models.updateBudgetModel(m.id, patch, db)).toThrow(
        expect.objectContaining({ code: "validation" }),
      );
    expect(() => models.applyBudgetModelToMonth(m.id, "2026-13", db)).toThrow(
      expect.objectContaining({ code: "validation" }),
    );
    expect(() =>
      models.reviseMonthlyBudgetPlan(
        "2026-09",
        { targetType: "bucket", targetId: "missing", amount: "0" },
        db,
      ),
    ).toThrow(expect.objectContaining({ code: "not_found" }));
    expect(() => models.deleteBudgetModel("missing", db)).toThrow(
      expect.objectContaining({ code: "not_found" }),
    );
  });
  it("reads authoritative income/expense/gross savings and active-only savings-plan KPIs", async () => {
    const income = createCategory("income", "Salary", undefined, db),
      c = expense("Food");
    const b = createSavingsBucket({ name: "Car", type: "goal" }, db),
      old = createSavingsBucket({ name: "Old", type: "goal" }, db);
    const m = models.createBudgetModel({ name: "Base" }, db);
    allocate(m.id, income.id, "1000");
    allocate(m.id, c.id, "200");
    allocate(m.id, b.id, "100", "bucket");
    allocate(m.id, old.id, "50", "bucket");
    const item = addItem(income.id, "Pay", db);
    createEntry(
      {
        type: "income",
        itemId: item.id,
        amount: "900",
        date: "2026-09-01",
        ownerMemberId: null,
      },
      db,
    );
    createSavingsActivity(
      {
        bucketId: b.id,
        kind: "contribution",
        amount: "40",
        date: "2026-09-01",
      },
      db,
    );
    expect((await getSavingsView("2026-09")).kpis.hasMonthlyPlan).toBe(false);
    models.applyBudgetModelToMonth(m.id, "2026-09", db);
    archiveSavingsBucket(old.id, db);
    const view = await getModelsView("2026-09");
    expect(connection).toHaveBeenCalled();
    expect(view.month).toBe("2026-09");
    expect(view.currentMonth).toBe("2026-11");
    expect(view.appliedPlan!.summary).toMatchObject({
      expectedIncomeCentavos: 100000,
      plannedExpensesCentavos: 20000,
      plannedSavingsCentavos: 15000,
      actualIncomeCentavos: 90000,
      actualSavingsCentavos: 4000,
    });
    expect((await getSavingsView("2026-09")).kpis).toMatchObject({
      hasMonthlyPlan: true,
      monthlyPlannedSavingsCentavos: 10000,
      monthlyShortfallCentavos: 6000,
      fundedStatus: "short",
    });
    expect((await getSavingsView("2026-10")).kpis.hasMonthlyPlan).toBe(false);
    expect((await getModelsView("2026-13")).month).toBe("2026-11");
    models.deleteBudgetModel(m.id, db);
    expect((await getModelsView("2026-09")).appliedPlan!.sourceModelId).toBe(
      null,
    );
  });
});

// @vitest-environment node
import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openDatabase } from "@/server/db/database";
import { getDashboardView } from "@/server/dashboard-read";
import { getSavingsView } from "@/server/savings-read";
import {
  createCategory,
  addItem,
  archiveCategory,
  moveItem,
  mergeCategory,
} from "@/server/categories-service";
import { addMember, archiveMember } from "@/server/members-service";
import { insertEntry } from "@/server/entries-store";
import {
  insertSavingsBucket,
  insertSavingsActivity,
} from "@/server/savings-store";
import {
  upsertMonthlyBudgetPlan,
  replaceMonthlyBudgetAllocations,
} from "@/server/models-store";
import { seedDemoData } from "@/server/demo";
import type { SavingsBucket } from "@/domain/savings";

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
const state = globalThis as typeof globalThis & {
  __celiaDatabase?: Database.Database;
};
let db: Database.Database;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 10, 12));
  db = openDatabase(":memory:");
  state.__celiaDatabase = db;
});
afterEach(() => {
  db.close();
  delete state.__celiaDatabase;
  vi.useRealTimers();
});
function saving(id: string, patch: Partial<SavingsBucket> = {}) {
  return insertSavingsBucket(db, {
    id,
    name: id,
    nameKey: id,
    type: "goal",
    openingBalance: 0,
    targetAmount: 100000,
    targetMonth: "2027-01",
    description: null,
    countsTowardBuffer: false,
    isDefault: false,
    archivedAt: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...patch,
  });
}
function movement(
  id: string,
  bucketId: string,
  amount: number,
  date: string,
  kind: "contribution" | "withdrawal" = "contribution",
) {
  insertSavingsActivity(db, {
    id,
    bucketId,
    amount,
    date,
    kind,
    note: null,
    createdAt: "2026-11-01",
    updatedAt: "2026-11-01",
  });
}
function plan(
  month: string,
  allocations: [string, number, "category" | "bucket"][],
) {
  upsertMonthlyBudgetPlan(db, {
    id: month,
    monthKey: month,
    sourceModelId: null,
    modelName: "Test plan",
    isRevised: false,
    appliedAt: month + "-01",
    updatedAt: month + "-01",
    allocations: [],
  });
  replaceMonthlyBudgetAllocations(
    db,
    month,
    allocations.map(([id, amount, targetType], i) => ({
      id: `${month}-${i}`,
      targetType,
      categoryId: targetType === "category" ? id : null,
      bucketId: targetType === "bucket" ? id : null,
      amount,
      updatedAt: month + "-01",
    })),
  );
}
function fixture() {
  const food = createCategory("expense", "Food", undefined, db),
    rent = createCategory("expense", "Rent", undefined, db),
    income = createCategory("income", "Salary", undefined, db);
  const foodItem = addItem(food.id, "Market", db),
    rentItem = addItem(rent.id, "Lease", db),
    incomeItem = addItem(income.id, "Pay", db);
  const ana = addMember("Ana", db),
    miguel = addMember("Miguel", db),
    old = addMember("Old", db);
  const add = (
    id: string,
    itemId: string,
    ownerMemberId: string | null,
    amount: number,
    date = "2026-11-03",
  ) =>
    insertEntry(db, {
      id,
      itemId,
      ownerMemberId,
      amount,
      date,
      note: null,
      createdAt: date,
      updatedAt: date,
    });
  add("ana", foodItem.id, ana.id, 10000);
  add("shared", foodItem.id, null, 5000);
  add("miguel", foodItem.id, miguel.id, 20000);
  add("old", foodItem.id, old.id, 3000);
  add("rent", rentItem.id, null, 7000);
  add("pay-a", incomeItem.id, ana.id, 100000);
  add("pay-m", incomeItem.id, miguel.id, 60000);
  add("pay-h", incomeItem.id, null, 10000);
  saving("buffer", {
    type: "cash_buffer",
    openingBalance: 10000,
    countsTowardBuffer: true,
  });
  saving("goal", { openingBalance: 2000 });
  movement("fund-buffer", "buffer", 2000, "2026-11-01");
  movement("withdraw", "buffer", 500, "2026-11-02", "withdrawal");
  movement("fund-goal", "goal", 1000, "2026-11-01");
  plan("2026-11", [
    [income.id, 200000, "category"],
    [food.id, 40000, "category"],
    [rent.id, 10000, "category"],
    ["goal", 5000, "bucket"],
  ]);
  return { food, rent, income, foodItem, incomeItem, ana, miguel, old, add };
}

describe("getDashboardView", () => {
  it("excludes transactions outside the rolling window and includes its first and last days", async () => {
    const f = fixture();
    f.add("too-old", f.foodItem.id, null, 999999, "2025-11-30");
    f.add("first-day", f.foodItem.id, null, 123, "2025-12-01");
    f.add("last-day", f.foodItem.id, null, 321, "2026-11-30");
    f.add("next-month", f.foodItem.id, null, 999999, "2026-12-01");
    const view = await getDashboardView({ month: "2026-11", range: 12 });
    expect(view.budgetTrend.bars[0]).toMatchObject({
      monthKey: "2025-12",
      actualExpensesCentavos: 123,
    });
    expect(view.budgetTrend.bars[11].actualExpensesCentavos).toBe(45321);
    expect(view.kpis.expensesCentavos).toBe(45321);
    expect(
      view.budgetTrend.bars
        .slice(1, 11)
        .every((b) => b.actualExpensesCentavos === 0),
    ).toBe(true);
  });
  it("keeps historical sparkline points within bounds when backdated withdrawals precede opening balances", async () => {
    saving("later", {
      type: "cash_buffer",
      openingBalance: 1000,
      countsTowardBuffer: true,
      createdAt: "2026-10-01",
    });
    movement("early-draw", "later", 500, "2026-08-01", "withdrawal");
    const view = await getDashboardView({ month: "2026-11" });
    expect(view.hero.bufferCentavos).toBe(500);
    expect(view.hero.sparklinePoints.slice(-4).map((p) => p.y)).toEqual([
      0, 0, 1, 1,
    ]);
    movement("later-funding", "later", 1000, "2026-12-01");
    const future = await getDashboardView({ month: "2026-11" });
    expect(future.hero.sparklinePoints).toEqual(view.hero.sparklinePoints);
  });
  it("returns exact monthly KPI history with quiet months, signed net and active gross savings", async () => {
    const f = fixture();
    f.add("prior-income", f.incomeItem.id, f.ana.id, 1000, "2026-09-01");
    f.add("prior-spend", f.foodItem.id, f.ana.id, 2000, "2026-09-30");
    movement("prior-funding", "goal", 300, "2026-09-01");
    movement("prior-withdrawal", "goal", 100, "2026-09-02", "withdrawal");
    saving("archived", { archivedAt: "2026-11-01" });
    movement("archived-funding", "archived", 99999, "2026-09-01");
    movement("future-funding", "goal", 99999, "2026-12-01");
    const view = await getDashboardView({ month: "2026-11" });
    expect(view.kpis.history).toHaveLength(12);
    expect(view.kpis.history[0].monthKey).toBe("2025-12");
    expect(view.kpis.history[9]).toEqual({
      monthKey: "2026-09",
      incomeCentavos: 1000,
      expensesCentavos: 2000,
      savingsCentavos: 300,
      unallocatedCentavos: -1300,
    });
    expect(view.kpis.history[10]).toEqual({
      monthKey: "2026-10",
      incomeCentavos: 0,
      expensesCentavos: 0,
      savingsCentavos: 0,
      unallocatedCentavos: 0,
    });
    for (const name of [
      "incomeCentavos",
      "expensesCentavos",
      "savingsCentavos",
      "unallocatedCentavos",
    ] as const)
      expect(view.kpis.history[11][name]).toBe(view.kpis[name]);
    const owner = await getDashboardView({
      month: "2026-11",
      memberFilter: f.ana.id,
    });
    expect(owner.kpis.history[9]).toMatchObject({
      incomeCentavos: 1000,
      expensesCentavos: 2000,
      savingsCentavos: 300,
      unallocatedCentavos: -1000,
    });
    const household = await getDashboardView({
      month: "2026-11",
      memberFilter: "household",
    });
    expect(household.kpis.history[9]).toMatchObject({
      incomeCentavos: 0,
      expensesCentavos: 0,
      savingsCentavos: 300,
      unallocatedCentavos: 0,
    });
    const expense = await getDashboardView({
      month: "2026-11",
      categoryId: f.food.id,
      memberFilter: f.ana.id,
    });
    expect(expense.kpis.history[9]).toMatchObject({
      incomeCentavos: null,
      expensesCentavos: 2000,
      savingsCentavos: null,
      unallocatedCentavos: null,
    });
    const income = await getDashboardView({
      month: "2026-11",
      categoryId: f.income.id,
    });
    expect(income.kpis.history[9]).toMatchObject({
      incomeCentavos: 1000,
      expensesCentavos: null,
      savingsCentavos: null,
      unallocatedCentavos: null,
    });
  });
  it("assembles authoritative exact KPIs and plan deltas without writes", async () => {
    fixture();
    const before = db.prepare("SELECT total_changes() AS changes").get();
    const view = await getDashboardView({ month: "2026-11" });
    expect(view.kpis).toMatchObject({
      incomeCentavos: 170000,
      expensesCentavos: 45000,
      savingsCentavos: 3000,
      unallocatedCentavos: 122000,
      incomeDeltaCentavos: -30000,
      expensesDeltaCentavos: 5000,
      savingsDeltaCentavos: -2000,
      unallocatedDeltaCentavos: -23000,
      unallocatedScope: "all",
    });
    expect(view.hero).toMatchObject({
      bufferCentavos: 11500,
      runwayMonths: 0.3,
    });
    expect(view.burnRate.utilizationPercent).toBe(90);
    expect(view.categoriesTable.totalSpentCentavos).toBe(45000);
    expect(
      view.modalCategories.find((c) => c.name === "Food")?.items[0].name,
    ).toBe("Market");
    expect(view.goalHighlight).toMatchObject({
      bucketId: "goal",
      currentBalanceCentavos: 3000,
    });
    expect(db.prepare("SELECT total_changes() AS changes").get()).toEqual(
      before,
    );
    const savings = await getSavingsView("2026-11");
    expect(view.hero.bufferCentavos).toBe(savings.kpis.savingsBufferCentavos);
    expect(view.hero.runwayMonths).toBe(savings.kpis.runwayMonths);
  });
  it.each(["all", "ana", "household"])(
    "honors owner and combined category scope for %s",
    async (owner) => {
      const f = fixture();
      const memberFilter = owner === "ana" ? f.ana.id : owner;
      const view = await getDashboardView({
        month: "2026-11",
        memberFilter,
        categoryId: f.food.id,
      });
      expect(view.kpis.expensesCentavos).toBe(
        owner === "all" ? 38000 : owner === "ana" ? 10000 : 5000,
      );
      expect(view.kpis.incomeCentavos).toBeNull();
      expect(view.kpis.unallocatedCentavos).toBeNull();
      expect(view.kpis.expensesDeltaCentavos).toBe(
        owner === "all" ? 2000 : null,
      );
      expect(view.burnRate.utilizationPercent).toBe(owner === "all" ? 95 : 90);
      expect(view.categoriesTable.rows).toHaveLength(1);
      expect(view.categoriesTable.totalSpentCentavos).toBe(
        view.kpis.expensesCentavos,
      );
      expect(
        view.memberDistribution.rows.reduce(
          (s, r) => s + r.totalSpentCentavos,
          0,
        ),
      ).toBe(38000);
      expect(
        view.memberDistribution.rows.find((r) => r.isSelected)?.memberId,
      ).toBe(owner === "all" ? undefined : memberFilter);
    },
  );
  it.each(["ana", "household"])(
    "keeps household savings and burn rate while scoping %s cash flow",
    async (owner) => {
      const f = fixture();
      const view = await getDashboardView({
        month: "2026-11",
        memberFilter: owner === "ana" ? f.ana.id : owner,
      });
      expect(view.kpis).toMatchObject({
        incomeCentavos: owner === "ana" ? 100000 : 10000,
        expensesCentavos: owner === "ana" ? 10000 : 12000,
        unallocatedCentavos: owner === "ana" ? 90000 : -2000,
        savingsCentavos: 3000,
        incomeDeltaCentavos: null,
        expensesDeltaCentavos: null,
        savingsDeltaCentavos: null,
        unallocatedDeltaCentavos: null,
        unallocatedScope: owner === "ana" ? "member" : "household",
      });
      expect(view.burnRate.utilizationPercent).toBe(90);
      expect(view.hero.runwayMonths).toBe(0.3);
    },
  );
  it.each(["all", "ana", "household"])(
    "handles income-category combination with %s",
    async (owner) => {
      const f = fixture();
      const view = await getDashboardView({
        month: "2026-11",
        memberFilter: owner === "ana" ? f.ana.id : owner,
        categoryId: f.income.id,
      });
      expect(view.kpis.incomeCentavos).toBe(
        owner === "all" ? 170000 : owner === "ana" ? 100000 : 10000,
      );
      expect(view.kpis.expensesCentavos).toBeNull();
      expect(view.kpis.incomeDeltaCentavos).toBeNull();
      expect(view.burnRate.state).toBe("income_category");
      expect(view.budgetTrend.isApplicable).toBe(false);
      expect(view.categoriesTable.isApplicable).toBe(false);
      expect(view.memberDistribution.isApplicable).toBe(false);
    },
  );
  it("keeps archived identities and reconciles every distribution segment", async () => {
    const f = fixture();
    archiveMember(f.old.id, db);
    archiveCategory(f.food.id, db);
    const view = await getDashboardView({ month: "2026-11" });
    expect(
      view.categoriesTable.rows.find((r) => r.categoryId === f.food.id),
    ).toMatchObject({ isArchived: true, isClickable: false });
    expect(
      view.memberDistribution.rows.find((r) => r.memberId === f.old.id),
    ).toMatchObject({ isArchived: true, isClickable: false });
    for (const row of view.memberDistribution.rows)
      expect(row.segments.reduce((s, r) => s + r.amountCentavos, 0)).toBe(
        row.totalSpentCentavos,
      );
    expect(view.filterCategories.some((c) => c.id === f.food.id)).toBe(false);
    expect(
      (
        await getDashboardView({
          month: "2026-11",
          memberFilter: f.old.id,
          categoryId: f.food.id,
        })
      ).filter,
    ).toMatchObject({ memberFilter: "all", categoryId: "all" });
  });
  it("reclassifies historical item actuals while retaining monthly allocation snapshots", async () => {
    const f = fixture();
    moveItem(f.foodItem.id, f.rent.id, db);
    const view = await getDashboardView({ month: "2026-11" });
    expect(
      view.categoriesTable.rows.find((r) => r.categoryId === f.food.id),
    ).toMatchObject({ spentCentavos: 0, budgetCentavos: 40000 });
    expect(
      view.categoriesTable.rows.find((r) => r.categoryId === f.rent.id),
    ).toMatchObject({ spentCentavos: 45000, budgetCentavos: 10000 });
  });
  it("folds merged allocations transitively without changing totals", async () => {
    const f = fixture();
    const final = createCategory("expense", "Final", undefined, db);
    mergeCategory(f.food.id, f.rent.id, db);
    mergeCategory(f.rent.id, final.id, db);
    const view = await getDashboardView({ month: "2026-11" });
    expect(view.categoriesTable.rows).toHaveLength(1);
    expect(view.categoriesTable.rows[0]).toMatchObject({
      categoryId: final.id,
      spentCentavos: 45000,
      budgetCentavos: 50000,
    });
  });
  it("gates opening balances by creation month and carries effective movements through gaps", async () => {
    saving("later", {
      type: "cash_buffer",
      openingBalance: 10000,
      countsTowardBuffer: true,
      createdAt: "2026-10-01",
    });
    movement("prior", "later", 1000, "2026-08-01");
    movement("draw", "later", 500, "2026-11-01", "withdrawal");
    const view = await getDashboardView({ month: "2026-11" });
    expect(view.hero.sparklinePoints.slice(-4).map((p) => p.y)).toEqual([
      1000 / 11000,
      1000 / 11000,
      1,
      10500 / 11000,
    ]);
    movement("backdated", "later", 1000, "2026-08-15");
    const updated = await getDashboardView({ month: "2026-11" });
    expect(updated.hero.sparklinePoints.slice(-4).map((p) => p.y)).toEqual([
      2000 / 12000,
      2000 / 12000,
      1,
      11500 / 12000,
    ]);
    db.prepare(
      "UPDATE savings_buckets SET archived_at='2026-11-10' WHERE id='later'",
    ).run();
    const archived = await getDashboardView({ month: "2026-11" });
    expect(archived.hero.bufferCentavos).toBe(0);
    expect(archived.kpis.savingsCentavos).toBe(0);
  });
  it("distinguishes no plan, zero plans, and invalid parameters on a fresh database", async () => {
    const view = await getDashboardView({
      month: "invalid",
      memberFilter: "bad",
      categoryId: "bad",
      range: 7,
    });
    expect(view.filter).toEqual({
      monthKey: "2026-11",
      memberFilter: "all",
      categoryId: "all",
      range: 6,
    });
    expect(view.modelName).toBeNull();
    expect(view.burnRate.state).toBe("no_plan");
    expect(view.hero.runwayMonths).toBeNull();
    expect(view.budgetTrend.bars).toHaveLength(6);
    plan("2026-11", []);
    expect((await getDashboardView({ month: "2026-11" })).burnRate.state).toBe(
      "zero_budget_zero_spend",
    );
    const f = createCategory("expense", "Unplanned", undefined, db);
    const item = addItem(f.id, "Bill", db);
    insertEntry(db, {
      id: "unplanned",
      itemId: item.id,
      ownerMemberId: null,
      amount: 100,
      date: "2026-11-01",
      note: null,
      createdAt: "2026-11-01",
      updatedAt: "2026-11-01",
    });
    expect((await getDashboardView({ month: "2026-11" })).burnRate.state).toBe(
      "zero_budget_overspent",
    );
  });
  it("loads twelve demo months with authoritative totals and exact bucket funding", async () => {
    seedDemoData(db, { currentDate: "2026-11-14" });
    const view = await getDashboardView({ month: "2026-11", range: 12 });
    expect(view.modelName).toBe("Baseline 2026");
    expect(view.hero.bufferCentavos).toBe(46_600_000);
    expect(view.hero.sparklinePoints.map((point) => point.y)).toEqual(
      Array.from(
        { length: 12 },
        (_, index) => (37_000_000 + (index + 1) * 800_000) / 46_600_000,
      ),
    );
    expect(view.budgetTrend.bars).toHaveLength(12);
    expect(
      view.budgetTrend.bars.every((b) => b.actualExpensesCentavos > 0),
    ).toBe(true);
    expect(
      view.memberDistribution.rows.reduce(
        (s, r) => s + r.totalSpentCentavos,
        0,
      ),
    ).toBe(view.kpis.expensesCentavos);
    const savings = await getSavingsView("2026-11");
    expect(view.kpis.savingsCentavos).toBe(savings.kpis.monthlyFundedCentavos);
  });
});

import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { BucketType } from "@/domain/savings";
import { nameKey } from "@/domain/names";

export type ClearSummary = {
  savingsBucketsCount: number;
  savingsActivitiesCount: number;
  budgetModelsCount: number;
  budgetModelAllocationsCount: number;
  monthlyBudgetPlansCount: number;
  monthlyBudgetAllocationsCount: number;
  entriesCount: number;
  itemsCount: number;
  categoriesCount: number;
  membersCount: number;
};
export type SeedData = {
  buckets: {
    id: string;
    name: string;
    type: string;
    opening: number;
    funded: number;
    counts: boolean;
    isDefault: boolean;
    target: number;
  }[];
  models: {
    id: string;
    name: string;
    active: boolean;
    budgets: Record<string, number>;
    savings: Record<string, number>;
  }[];
  months: string[];
  owners: Record<string, string>;
  categories: {
    id: string;
    name: string;
    umbrella: "income" | "expense";
    color: string;
    items: string[];
    actualSeries?: number[];
  }[];
};
export type SeedOptions = { seedJson?: SeedData; currentDate?: string };
export type SeedResult = {
  savingsBucketsSeeded: number;
  savingsActivitiesSeeded: number;
  budgetModelsSeeded: number;
  budgetModelAllocationsSeeded: number;
  monthlyBudgetPlansSeeded: number;
  monthlyBudgetAllocationsSeeded: number;
  entriesSeeded: number;
  itemsSeeded: number;
  categoriesSeeded: number;
  membersSeeded: number;
};

export function getClearSummary(database: Database.Database): ClearSummary {
  const count = (table: string) =>
    (
      database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as {
        count: number;
      }
    ).count;
  return {
    savingsBucketsCount: count("savings_buckets"),
    savingsActivitiesCount: count("savings_activities"),
    budgetModelsCount: count("budget_models"),
    budgetModelAllocationsCount: count("budget_model_allocations"),
    monthlyBudgetPlansCount: count("monthly_budget_plans"),
    monthlyBudgetAllocationsCount: count("monthly_budget_allocations"),
    entriesCount: count("entries"),
    itemsCount: count("items"),
    categoriesCount: count("categories"),
    membersCount: count("members"),
  };
}

export function clearAllData(database: Database.Database): ClearSummary {
  return database.transaction(() => {
    const summary = getClearSummary(database);
    database.pragma("defer_foreign_keys = ON");
    database.exec(
      `DELETE FROM monthly_budget_allocations;
      DELETE FROM monthly_budget_plans;
      DELETE FROM budget_model_allocations;
      DELETE FROM budget_models;
      DELETE FROM savings_activities;
      DELETE FROM savings_buckets;
      DELETE FROM entries; DELETE FROM items; DELETE FROM categories; DELETE FROM members;`,
    );
    return summary;
  })();
}

export function seedDemoData(
  database: Database.Database,
  options: SeedOptions = {},
): SeedResult {
  const data =
    options.seedJson ??
    (JSON.parse(
      readFileSync(path.resolve("scripts/seed.json"), "utf8"),
    ) as SeedData);
  const now = options.currentDate
    ? new Date(`${options.currentDate}T00:00:00`)
    : new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Invalid current date.");
  const timestamp = now.toISOString();
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  });
  return database.transaction(() => {
    if (Object.values(getClearSummary(database)).some(Boolean))
      throw new Error("Database is not empty. Run 'npm run clear' first.");
    const insertMember = database.prepare(
      "INSERT INTO members (id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    );
    const insertCategory = database.prepare(
      "INSERT INTO categories (id, umbrella_id, name, name_key, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    const insertItem = database.prepare(
      "INSERT INTO items (id, category_id, name, name_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const insertEntry = database.prepare(
      "INSERT INTO entries (id, item_id, owner_member_id, amount, date, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    const members = new Map<string, string>();
    for (const [owner, name] of Object.entries(data.owners)) {
      if (owner === "household") continue;
      const id = randomUUID();
      insertMember.run(id, name, nameKey(name), timestamp, timestamp);
      members.set(owner, id);
    }
    const categoryIds = new Map<string, string>();
    const items = new Map<string, string[]>();
    let itemCount = 0;
    for (const category of data.categories) {
      const categoryId = randomUUID();
      categoryIds.set(category.id, categoryId);
      insertCategory.run(
        categoryId,
        category.umbrella,
        category.name,
        nameKey(category.name),
        category.color,
        timestamp,
        timestamp,
      );
      items.set(
        category.id,
        category.items.map((name) => {
          const id = randomUUID();
          insertItem.run(
            id,
            categoryId,
            name,
            nameKey(name),
            timestamp,
            timestamp,
          );
          itemCount++;
          return id;
        }),
      );
    }
    let state = 987654321;
    const rnd = () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
    let entriesCount = 0;
    months.forEach((month, monthIndex) => {
      data.categories.forEach((category) => {
        const total = category.actualSeries?.[monthIndex];
        const categoryItems = items.get(category.id) ?? [];
        if (total === undefined || categoryItems.length === 0)
          throw new Error(`Missing seed series or items for ${category.name}.`);
        let count =
          categoryItems.length === 1
            ? 1
            : Math.min(categoryItems.length, 2 + Math.floor(rnd() * 3));
        if (category.id === "salary") count = 2;
        const weights: number[] = [];
        let sum = 0;
        for (let index = 0; index < count; index++) {
          const weight = 0.5 + rnd();
          weights.push(weight);
          sum += weight;
        }
        let left = total;
        for (let index = 0; index < count; index++) {
          const amount =
            index === count - 1
              ? left
              : Math.round((total * weights[index]) / sum / 10) * 10;
          left -= amount;
          let owner = "household";
          if (category.id === "salary") owner = index === 0 ? "ana" : "miguel";
          else if (category.id === "freelance")
            owner = rnd() < 0.5 ? "ana" : "miguel";
          else if (category.id !== "rent" && category.id !== "childcare") {
            const r = rnd();
            owner = r < 0.44 ? "household" : r < 0.75 ? "ana" : "miguel";
          }
          const day = 2 + Math.floor(rnd() * 26);
          const bytes = createHash("sha256")
            .update(`celia-demo-entry:${entriesCount}`)
            .digest()
            .subarray(0, 16);
          bytes[6] = (bytes[6] & 0x0f) | 0x80;
          bytes[8] = (bytes[8] & 0x3f) | 0x80;
          const hex = bytes.toString("hex");
          const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
          insertEntry.run(
            id,
            categoryItems[index % categoryItems.length],
            members.get(owner) ?? null,
            amount * 100,
            `${month}-${String(day).padStart(2, "0")}`,
            null,
            timestamp,
            timestamp,
          );
          entriesCount++;
        }
      });
    });
    const bucketIds = new Map<string, string>();
    const insertBucket = database.prepare(`INSERT INTO savings_buckets
      (id,name,name_key,type,opening_balance,target_amount,target_month,counts_toward_buffer,is_default,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    const insertActivity = database.prepare(`INSERT INTO savings_activities
      (id,bucket_id,kind,amount,date,created_at,updated_at) VALUES (?,?,'contribution',?,?,?,?)`);
    let activityCount = 0;
    for (const [index, bucket] of data.buckets.entries()) {
      const bucketTimestamp = new Date(now.getTime() + index).toISOString();
      const id = demoId(`bucket:${bucket.id}`);
      bucketIds.set(bucket.id, id);
      const type: BucketType = bucket.isDefault
        ? "cash_buffer"
        : bucket.type.startsWith("Goal")
          ? "goal"
          : bucket.type.startsWith("Sinking")
            ? "sinking_fund"
            : "emergency_fund";
      const due =
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/.exec(
          bucket.type,
        );
      const targetMonth = due
        ? `${due[2]}-${String(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(due[1]) + 1).padStart(2, "0")}`
        : null;
      insertBucket.run(
        id,
        bucket.name,
        nameKey(bucket.name),
        type,
        bucket.opening * 100,
        bucket.target > 0 ? bucket.target * 100 : null,
        targetMonth,
        Number(bucket.counts),
        Number(bucket.isDefault),
        bucketTimestamp,
        bucketTimestamp,
      );
      if (bucket.funded > 0)
        for (const month of months) {
          insertActivity.run(
            demoId(`activity:${bucket.id}:${month}`),
            id,
            bucket.funded * 100,
            `${month}-01`,
            timestamp,
            timestamp,
          );
          activityCount++;
        }
    }
    const insertModel = database.prepare(
      `INSERT INTO budget_models(id,name,name_key,display_order,created_at,updated_at) VALUES(?,?,?,?,?,?)`,
    );
    const insertAllocation = database.prepare(
      `INSERT INTO budget_model_allocations(id,model_id,target_type,category_id,bucket_id,amount,updated_at) VALUES(?,?,?,?,?,?,?)`,
    );
    const insertPlan = database.prepare(
      `INSERT INTO monthly_budget_plans(id,month_key,source_model_id,model_name,is_revised,applied_at,updated_at) VALUES(?,?,?,?,0,?,?)`,
    );
    const listModelAllocations = database.prepare(
      "SELECT id,target_type,category_id,bucket_id,amount FROM budget_model_allocations WHERE model_id=?",
    );
    const insertPlanAllocation = database.prepare(
      "INSERT INTO monthly_budget_allocations(id,plan_id,target_type,category_id,bucket_id,amount,updated_at) VALUES(?,?,?,?,?,?,?)",
    );
    let modelAllocationCount = 0,
      planCount = 0,
      planAllocationCount = 0;
    for (const [index, model] of data.models.entries()) {
      const id = demoId(`model:${model.id}`);
      insertModel.run(
        id,
        model.name,
        nameKey(model.name),
        index,
        timestamp,
        timestamp,
      );
      for (const [type, allocations, ids] of [
        ["category", model.budgets, categoryIds],
        ["bucket", model.savings, bucketIds],
      ] as const) {
        for (const [target, amount] of Object.entries(allocations)) {
          if (amount === 0) continue;
          const targetId = ids.get(target);
          if (!targetId)
            throw new Error(`Unknown seed allocation target: ${target}.`);
          insertAllocation.run(
            demoId(`allocation:${model.id}:${type}:${target}`),
            id,
            type,
            type === "category" ? targetId : null,
            type === "bucket" ? targetId : null,
            amount * 100,
            timestamp,
          );
          modelAllocationCount++;
        }
      }
      if (model.active)
        for (const month of months) {
          const planId = demoId(`plan:${month}`);
          insertPlan.run(planId, month, id, model.name, timestamp, timestamp);
          const allocations = listModelAllocations.all(id) as {
            id: string;
            target_type: string;
            category_id: string | null;
            bucket_id: string | null;
            amount: number;
          }[];
          for (const allocation of allocations) {
            insertPlanAllocation.run(
              demoId(`snapshot:${month}:${allocation.id}`),
              planId,
              allocation.target_type,
              allocation.category_id,
              allocation.bucket_id,
              allocation.amount,
              timestamp,
            );
            planAllocationCount++;
          }
          planCount++;
        }
    }
    return {
      savingsBucketsSeeded: data.buckets.length,
      savingsActivitiesSeeded: activityCount,
      budgetModelsSeeded: data.models.length,
      budgetModelAllocationsSeeded: modelAllocationCount,
      monthlyBudgetPlansSeeded: planCount,
      monthlyBudgetAllocationsSeeded: planAllocationCount,
      entriesSeeded: entriesCount,
      itemsSeeded: itemCount,
      categoriesSeeded: data.categories.length,
      membersSeeded: members.size,
    };
  })();
}

function demoId(key: string) {
  const bytes = createHash("sha256")
    .update(`celia-demo:${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

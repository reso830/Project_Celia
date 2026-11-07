import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { nameKey } from "@/domain/names";

export type ClearSummary = {
  entriesCount: number;
  itemsCount: number;
  categoriesCount: number;
  membersCount: number;
};
export type SeedData = {
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
      "DELETE FROM entries; DELETE FROM items; DELETE FROM categories; DELETE FROM members;",
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
    const items = new Map<string, string[]>();
    let itemCount = 0;
    for (const category of data.categories) {
      const categoryId = randomUUID();
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
    return {
      entriesSeeded: entriesCount,
      itemsSeeded: itemCount,
      categoriesSeeded: data.categories.length,
      membersSeeded: members.size,
    };
  })();
}

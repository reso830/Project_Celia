// @vitest-environment node

import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors";
import { openDatabase } from "@/server/db/database";
import {
  addItem,
  createCategory,
  renameItem,
  updateCategory,
} from "@/server/categories-service";

const databases: Database.Database[] = [];

function database() {
  const instance = openDatabase(":memory:");
  databases.push(instance);
  return instance;
}

function expectDomainError(action: () => unknown, code: DomainError["code"]) {
  expect(action).toThrow(expect.objectContaining({ code }));
}

afterEach(() => databases.splice(0).forEach((instance) => instance.close()));

describe("category and item service", () => {
  it("creates categories with default colours and validated umbrellas", () => {
    const db = database();
    expect(createCategory("expense", "Rent", undefined, db)).toMatchObject({
      color: "#7d8ba8",
    });
    expect(createCategory("income", "Salary", undefined, db)).toMatchObject({
      color: "#7f9b6e",
    });
    expectDomainError(
      () => createCategory("savings", "Buffer", undefined, db),
      "validation",
    );
    expectDomainError(
      () => createCategory("other", "Other", undefined, db),
      "validation",
    );
  });

  it("enforces scoped category and item names, including archived categories", () => {
    const db = database();
    const expense = createCategory("expense", "Transport", "#AABBCC", db);
    const income = createCategory("income", "Transport", undefined, db);
    expect(expense.color).toBe("#aabbcc");
    expect(income.umbrella).toBe("income");
    expectDomainError(
      () => createCategory("expense", " transport ", undefined, db),
      "duplicate_name",
    );
    db.prepare(
      "UPDATE categories SET archived_at = '2026-01-01T00:00:00.000Z' WHERE id = ?",
    ).run(expense.id);
    expectDomainError(
      () => createCategory("expense", "Transport", undefined, db),
      "duplicate_name",
    );
    const groceries = createCategory("expense", "Groceries", undefined, db);
    addItem(groceries.id, "Food", db);
    expectDomainError(
      () => addItem(groceries.id, " food ", db),
      "duplicate_name",
    );
    const utilities = createCategory("expense", "Utilities", undefined, db);
    expect(addItem(utilities.id, "Food", db).name).toBe("Food");
  });

  it("updates active category and item names but rejects archived categories", () => {
    const db = database();
    const category = createCategory("expense", "Rent", undefined, db);
    const item = addItem(category.id, "Apartment", db);
    expect(
      updateCategory(category.id, { name: "Home", color: "#123ABC" }, db),
    ).toMatchObject({ name: "Home", color: "#123abc" });
    expect(renameItem(item.id, "Lease", db)).toMatchObject({ name: "Lease" });
    db.prepare(
      "UPDATE categories SET archived_at = '2026-01-01T00:00:00.000Z' WHERE id = ?",
    ).run(category.id);
    expectDomainError(
      () => updateCategory(category.id, { name: "Housing" }, db),
      "archived",
    );
    expectDomainError(() => addItem(category.id, "Utilities", db), "archived");
    expectDomainError(() => renameItem(item.id, "Rent", db), "archived");
  });

  it("validates blank names and colours, rejects unknown ids, and touches updated_at", () => {
    const db = database();
    expectDomainError(
      () => createCategory("expense", " ", undefined, db),
      "validation",
    );
    expectDomainError(
      () => createCategory("expense", "Rent", "bad", db),
      "validation",
    );
    expectDomainError(
      () => updateCategory("missing", { name: "Rent" }, db),
      "not_found",
    );
    const category = createCategory("expense", "Rent", undefined, db);
    const before = db
      .prepare("SELECT updated_at FROM categories WHERE id = ?")
      .get(category.id) as { updated_at: string };
    updateCategory(category.id, { name: "Home" }, db);
    const after = db
      .prepare("SELECT updated_at FROM categories WHERE id = ?")
      .get(category.id) as { updated_at: string };
    expect(after.updated_at).not.toBe(before.updated_at);
  });

  it("treats merged categories as archived for future edits", () => {
    const db = database();
    const category = createCategory("expense", "Rent", undefined, db);
    const target = createCategory("expense", "Home", undefined, db);
    db.prepare(
      "UPDATE categories SET merged_into_category_id = ? WHERE id = ?",
    ).run(target.id, category.id);
    expectDomainError(
      () => updateCategory(category.id, { name: "Home" }, db),
      "archived",
    );
  });
});

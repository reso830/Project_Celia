// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors";
import { findCategory, findItem, listItems } from "@/server/categories-store";
import { openDatabase } from "@/server/db/database";
import {
  addItem,
  archiveCategory,
  createCategory,
  mergeCategory,
  moveItem,
  restoreCategory,
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

describe("category operations", () => {
  it("archives and restores categories while enforcing terminal and invalid states", () => {
    const db = database();
    const source = createCategory("expense", "Dining", undefined, db);
    const target = createCategory("expense", "Groceries", undefined, db);
    const archived = archiveCategory(source.id, db);
    expect(archived.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expectDomainError(() => archiveCategory(source.id, db), "invalid_state");
    expect(restoreCategory(source.id, db).archivedAt).toBeNull();
    expectDomainError(() => restoreCategory(source.id, db), "invalid_state");

    mergeCategory(source.id, target.id, db);
    for (const action of [
      () => archiveCategory(source.id, db),
      () => restoreCategory(source.id, db),
      () => updateCategory(source.id, { name: "Other" }, db),
      () => mergeCategory(source.id, target.id, db),
      () => mergeCategory(target.id, source.id, db),
    ]) {
      expectDomainError(action, "archived");
    }
  });

  it("moves only active items to a distinct active category in the same umbrella", () => {
    const db = database();
    const source = createCategory("expense", "Dining", undefined, db);
    const target = createCategory("expense", "Groceries", undefined, db);
    const otherTarget = createCategory("expense", "Household", undefined, db);
    const income = createCategory("income", "Salary", undefined, db);
    const item = addItem(source.id, "Coffee", db);
    expectDomainError(() => moveItem(item.id, source.id, db), "same_category");
    expectDomainError(
      () => moveItem(item.id, income.id, db),
      "umbrella_mismatch",
    );
    addItem(target.id, "Coffee", db);
    expectDomainError(() => moveItem(item.id, target.id, db), "duplicate_name");
    addItem(target.id, "Tea", db);
    const caseVariant = addItem(source.id, "tea", db);
    expectDomainError(
      () => moveItem(caseVariant.id, target.id, db),
      "duplicate_name",
    );
    archiveCategory(target.id, db);
    expectDomainError(() => moveItem(item.id, target.id, db), "archived");
    restoreCategory(target.id, db);
    const moved = moveItem(item.id, otherTarget.id, db);
    expect(moved).toMatchObject({ id: item.id, categoryId: otherTarget.id });
    archiveCategory(otherTarget.id, db);
    expectDomainError(() => moveItem(item.id, source.id, db), "archived");
  });

  it("merges moved and same-name items, then frees the source category name", () => {
    const db = database();
    const source = createCategory("expense", "Dining", undefined, db);
    const target = createCategory("expense", "Groceries", undefined, db);
    const moved = addItem(source.id, "Coffee", db);
    const firstCombined = addItem(source.id, "Fruit", db);
    const secondCombined = addItem(source.id, "Vegetables", db);
    const duplicateFruit = addItem(target.id, "fruit", db);
    const duplicateVegetables = addItem(target.id, "Vegetables", db);
    const result = mergeCategory(source.id, target.id, db);
    expect(result.movedItemIds).toEqual([moved.id]);
    expect(result.combined).toEqual([
      { fromItemId: firstCombined.id, intoItemId: duplicateFruit.id },
      { fromItemId: secondCombined.id, intoItemId: duplicateVegetables.id },
    ]);
    expect(listItems(db, target.id).map((item) => item.id)).toContain(moved.id);
    expect(
      findItem(db, firstCombined.id, { includeMerged: true }),
    ).toMatchObject({
      categoryId: source.id,
      mergedIntoItemId: duplicateFruit.id,
    });
    expect(findCategory(db, source.id, { includeMerged: true })).toMatchObject({
      mergedIntoCategoryId: target.id,
    });
    expect(createCategory("expense", "Dining", undefined, db).name).toBe(
      "Dining",
    );
  });

  it("rolls back a merge when an item update fails", () => {
    const db = database();
    const source = createCategory("expense", "Dining", undefined, db);
    const target = createCategory("expense", "Groceries", undefined, db);
    const firstItem = addItem(source.id, "Coffee", db);
    const secondItem = addItem(source.id, "Tea", db);
    db.exec(`CREATE TRIGGER fail_merge BEFORE UPDATE ON items
      WHEN OLD.id = '${secondItem.id}'
      BEGIN SELECT RAISE(FAIL, 'forced merge failure'); END`);
    expect(() => mergeCategory(source.id, target.id, db)).toThrow(
      /forced merge failure/,
    );
    expect(findItem(db, firstItem.id)).toMatchObject({ categoryId: source.id });
    expect(findItem(db, secondItem.id)).toMatchObject({
      categoryId: source.id,
    });
    expect(findCategory(db, source.id)).toMatchObject({
      mergedIntoCategoryId: null,
    });
    expect(findCategory(db, target.id)).toMatchObject({
      mergedIntoCategoryId: null,
    });
  });

  it("persists archived and moved state after reopening a file database", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "celia-operations-"));
    const databasePath = path.join(directory, "celia.db");
    const first = openDatabase(databasePath);
    const source = createCategory("expense", "Dining", undefined, first);
    const target = createCategory("expense", "Groceries", undefined, first);
    const item = addItem(source.id, "Coffee", first);
    moveItem(item.id, target.id, first);
    archiveCategory(source.id, first);
    first.close();

    const reopened = openDatabase(databasePath);
    expect(findItem(reopened, item.id)).toMatchObject({
      categoryId: target.id,
    });
    expect(findCategory(reopened, source.id)).toMatchObject({
      archivedAt: expect.any(String),
    });
    reopened.close();
    rmSync(directory, { recursive: true, force: true });
  });
});

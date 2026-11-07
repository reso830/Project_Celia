// @vitest-environment node

import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors";
import {
  addItem,
  archiveCategory,
  createCategory,
} from "@/server/categories-service";
import { openDatabase } from "@/server/db/database";
import {
  createEntry,
  deleteEntry,
  updateEntry,
} from "@/server/entries-service";
import { addMember, archiveMember } from "@/server/members-service";

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

describe("entries service", () => {
  it("creates entries and derives a changed type from the selected item", () => {
    const db = database();
    const expense = createCategory("expense", "Food", undefined, db);
    const income = createCategory("income", "Work", undefined, db);
    const market = addItem(expense.id, "Market", db);
    const salary = addItem(income.id, "Salary", db);
    const ana = addMember("Ana", db);

    const created = createEntry(
      {
        type: "expense",
        amount: "12.50",
        date: "2026-11-04",
        itemId: market.id,
        ownerMemberId: ana.id,
        note: " Lunch ",
      },
      db,
    );
    const updated = updateEntry(
      created.id,
      { itemId: salary.id, amount: "1000" },
      db,
    );

    expect(created).toMatchObject({
      amount: 1250,
      note: "Lunch",
      type: "expense",
    });
    expect(updated).toMatchObject({
      itemId: salary.id,
      amount: 100000,
      type: "income",
    });
    expect(deleteEntry(created.id, db)).toBe(created.id);
  });

  it("rejects invalid creates and preserves archived references unless replaced", () => {
    const db = database();
    const expense = createCategory("expense", "Food", undefined, db);
    const income = createCategory("income", "Work", undefined, db);
    const market = addItem(expense.id, "Market", db);
    const salary = addItem(income.id, "Salary", db);
    const archivedCategory = createCategory(
      "expense",
      "Old food",
      undefined,
      db,
    );
    const oldMarket = addItem(archivedCategory.id, "Old market", db);
    const ana = addMember("Ana", db);
    const ben = addMember("Ben", db);
    const oldBen = addMember("Old Ben", db);

    expectDomainError(
      () =>
        createEntry(
          {
            type: "income",
            amount: "1",
            date: "2026-11-04",
            itemId: market.id,
            ownerMemberId: null,
          },
          db,
        ),
      "umbrella_mismatch",
    );
    for (const [draft, field] of [
      [
        {
          type: "expense",
          amount: "0",
          date: "2026-11-04",
          itemId: market.id,
          ownerMemberId: null,
        },
        "amount",
      ],
      [
        {
          type: "expense",
          amount: "1",
          date: "2026-02-29",
          itemId: market.id,
          ownerMemberId: null,
        },
        "date",
      ],
    ] as const) {
      try {
        createEntry(draft, db);
        throw new Error("Expected a DomainError");
      } catch (error) {
        expect(error).toMatchObject({ code: "validation", field });
      }
    }
    const entry = createEntry(
      {
        type: "expense",
        amount: "1",
        date: "2026-11-04",
        itemId: market.id,
        ownerMemberId: ana.id,
      },
      db,
    );
    archiveCategory(expense.id, db);
    archiveCategory(archivedCategory.id, db);
    archiveMember(ana.id, db);
    archiveMember(oldBen.id, db);

    expect(updateEntry(entry.id, { note: "Historical" }, db)).toMatchObject({
      note: "Historical",
    });
    expectDomainError(
      () => updateEntry(entry.id, { amount: "0" }, db),
      "validation",
    );
    expectDomainError(
      () => updateEntry(entry.id, { date: "2026-02-29" }, db),
      "validation",
    );
    expect(
      updateEntry(entry.id, { itemId: market.id, ownerMemberId: ana.id }, db),
    ).toMatchObject({ itemId: market.id, ownerMemberId: ana.id });
    expectDomainError(
      () => updateEntry(entry.id, { itemId: oldMarket.id }, db),
      "archived",
    );
    expectDomainError(
      () => updateEntry(entry.id, { ownerMemberId: oldBen.id }, db),
      "archived",
    );
    expect(
      updateEntry(entry.id, { itemId: salary.id, ownerMemberId: ben.id }, db),
    ).toMatchObject({ type: "income", ownerMemberId: ben.id });
  });
});

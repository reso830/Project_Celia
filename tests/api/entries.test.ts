// @vitest-environment node

import type Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/entries/route";
import { DELETE, PATCH } from "@/app/api/entries/[id]/route";
import {
  addItem,
  archiveCategory,
  createCategory,
} from "@/server/categories-service";
import { openDatabase } from "@/server/db/database";
import { addMember, archiveMember } from "@/server/members-service";

type DatabaseGlobal = typeof globalThis & {
  __celiaDatabase?: Database.Database;
};
const databaseGlobal = globalThis as DatabaseGlobal;

function setup() {
  const database = openDatabase(":memory:");
  databaseGlobal.__celiaDatabase = database;
  const expense = createCategory("expense", "Food", undefined, database);
  const income = createCategory("income", "Work", undefined, database);
  const archivedCategory = createCategory(
    "expense",
    "Old food",
    undefined,
    database,
  );
  const ana = addMember("Ana", database);
  const oldAna = addMember("Old Ana", database);
  return {
    database,
    expense,
    archivedCategory,
    ana,
    oldAna,
    market: addItem(expense.id, "Market", database),
    salary: addItem(income.id, "Salary", database),
    oldMarket: addItem(archivedCategory.id, "Old market", database),
  };
}

function request(body: unknown) {
  return new Request("http://localhost/api/entries", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  databaseGlobal.__celiaDatabase?.close();
  delete databaseGlobal.__celiaDatabase;
});

describe("entry mutation routes", () => {
  it("creates, updates, and deletes an entry", async () => {
    const { ana, market, salary } = setup();
    const created = await POST(
      request({
        type: "expense",
        amount: "32.40",
        date: "2026-11-04",
        itemId: market.id,
        ownerMemberId: ana.id,
      }),
    );
    const createBody = (await created.json()) as {
      entry: { id: string; amount: number; isHousehold: boolean };
    };

    expect(created.status).toBe(201);
    expect(createBody.entry).toMatchObject({
      amount: 3240,
      isHousehold: false,
    });
    const changed = await PATCH(
      request({ itemId: salary.id, amount: "1000", ownerMemberId: "" }),
      { params: Promise.resolve({ id: createBody.entry.id }) },
    );
    expect(changed.status).toBe(200);
    expect(await changed.json()).toMatchObject({
      entry: {
        itemId: salary.id,
        type: "income",
        amount: 100000,
        isHousehold: true,
      },
    });
    const deleted = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: createBody.entry.id }),
    });
    expect(deleted.status).toBe(200);
    expect(await deleted.json()).toEqual({ id: createBody.entry.id });
  });

  it("returns POST contract errors for malformed, required, invalid, and missing fields", async () => {
    const { expense, market, oldAna } = setup();
    const malformed = await POST(
      new Request("http://localhost/api/entries", {
        method: "POST",
        body: "not JSON",
      }),
    );
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toMatchObject({
      error: { code: "validation" },
    });

    const missingRequired = await POST(
      request({ type: "expense", date: "2026-11-04", itemId: market.id }),
    );
    expect(missingRequired.status).toBe(400);
    expect(await missingRequired.json()).toMatchObject({
      error: { code: "validation", field: "amount" },
    });

    const unknown = await POST(
      request({
        type: "expense",
        amount: "1",
        date: "2026-11-04",
        itemId: market.id,
        extra: "no",
      }),
    );
    expect(unknown.status).toBe(400);
    expect(await unknown.json()).toMatchObject({
      error: { code: "validation", field: "extra" },
    });

    const mismatch = await POST(
      request({
        type: "income",
        amount: "1",
        date: "2026-11-04",
        itemId: market.id,
      }),
    );
    expect(mismatch.status).toBe(409);
    expect(await mismatch.json()).toMatchObject({
      error: { code: "umbrella_mismatch" },
    });

    const invalidType = await POST(
      request({
        type: "other",
        amount: "1",
        date: "2026-11-04",
        itemId: market.id,
      }),
    );
    expect(invalidType.status).toBe(400);
    expect(await invalidType.json()).toMatchObject({
      error: { code: "validation", field: "type" },
    });

    for (const [body, field] of [
      [
        { type: "expense", amount: "0", date: "2026-11-04", itemId: market.id },
        "amount",
      ],
      [
        { type: "expense", amount: "1", date: "2026-02-29", itemId: market.id },
        "date",
      ],
    ]) {
      const invalid = await POST(request(body));
      expect(invalid.status).toBe(400);
      expect(await invalid.json()).toMatchObject({
        error: { code: "validation", field },
      });
    }

    for (const body of [
      { type: "expense", amount: "1", date: "2026-11-04", itemId: "missing" },
      {
        type: "expense",
        amount: "1",
        date: "2026-11-04",
        itemId: market.id,
        ownerMemberId: "missing",
      },
    ]) {
      const missing = await POST(request(body));
      expect(missing.status).toBe(404);
      expect(await missing.json()).toMatchObject({
        error: { code: "not_found" },
      });
    }

    archiveMember(oldAna.id);
    const archivedMember = await POST(
      request({
        type: "expense",
        amount: "1",
        date: "2026-11-04",
        itemId: market.id,
        ownerMemberId: oldAna.id,
      }),
    );
    expect(archivedMember.status).toBe(409);
    expect(await archivedMember.json()).toMatchObject({
      error: { code: "archived", field: "ownerMemberId" },
    });

    archiveCategory(expense.id);
    const archived = await POST(
      request({
        type: "expense",
        amount: "1",
        date: "2026-11-04",
        itemId: market.id,
      }),
    );
    expect(archived.status).toBe(409);
    expect(await archived.json()).toMatchObject({
      error: { code: "archived", field: "itemId" },
    });
  });

  it("returns PATCH contract errors for invalid, unknown, missing, and archived values", async () => {
    const { archivedCategory, market, oldAna, oldMarket } = setup();
    const created = await POST(
      request({
        type: "expense",
        amount: "1",
        date: "2026-11-04",
        itemId: market.id,
      }),
    );
    const { entry } = (await created.json()) as { entry: { id: string } };
    const context = { params: Promise.resolve({ id: entry.id }) };

    const emptyPatch = await PATCH(request({}), {
      params: Promise.resolve({ id: entry.id }),
    });
    expect(emptyPatch.status).toBe(400);
    const unknownPatch = await PATCH(request({ unknown: "field" }), context);
    expect(unknownPatch.status).toBe(400);
    const malformedPatch = await PATCH(
      new Request("http://localhost/api/entries", {
        method: "PATCH",
        body: "not JSON",
      }),
      context,
    );
    expect(malformedPatch.status).toBe(400);

    for (const [body, field] of [
      [{ amount: "0" }, "amount"],
      [{ date: "2026-02-29" }, "date"],
    ]) {
      const invalid = await PATCH(request(body), context);
      expect(invalid.status).toBe(400);
      expect(await invalid.json()).toMatchObject({
        error: { code: "validation", field },
      });
    }

    const missingPatch = await PATCH(request({ note: "Missing" }), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(missingPatch.status).toBe(404);

    archiveCategory(archivedCategory.id);
    archiveMember(oldAna.id);
    for (const body of [
      { itemId: oldMarket.id },
      { ownerMemberId: oldAna.id },
    ]) {
      const archived = await PATCH(request(body), context);
      expect(archived.status).toBe(409);
      expect(await archived.json()).toMatchObject({
        error: { code: "archived" },
      });
    }

    const missingDelete = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(missingDelete.status).toBe(404);
  });
});

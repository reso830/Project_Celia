// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as create } from "@/app/api/categories/route";
import { PATCH as update } from "@/app/api/categories/[id]/route";
import { POST as addItem } from "@/app/api/categories/[id]/items/route";
import { PATCH as renameItem } from "@/app/api/items/[id]/route";
import { getDatabase } from "@/server/db/database";
let directory = "";
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (body?: string) =>
  new Request("http://celia.test", {
    method: "POST",
    ...(body === undefined ? {} : { body }),
  });
function reset() {
  const state = globalThis as typeof globalThis & {
    __celiaDatabase?: Database.Database;
  };
  state.__celiaDatabase?.close();
  delete state.__celiaDatabase;
}
beforeEach(() => {
  reset();
  directory = mkdtempSync(path.join(tmpdir(), "celia-category-routes-"));
  process.env.CELIA_DB_PATH = path.join(directory, "celia.db");
});
afterEach(() => {
  reset();
  rmSync(directory, { recursive: true, force: true });
  delete process.env.CELIA_DB_PATH;
});
describe("category routes", () => {
  it("creates, updates, adds, and renames resources", async () => {
    const made = await create(request('{"umbrella":"expense","name":"Rent"}'));
    const { category } = (await made.json()) as { category: { id: string } };
    const changed = await update(
      request('{"color":"#AABBCC"}'),
      context(category.id),
    );
    const itemResponse = await addItem(
      request('{"name":"Apartment"}'),
      context(category.id),
    );
    const { item } = (await itemResponse.json()) as { item: { id: string } };
    const renamed = await renameItem(
      request('{"name":"Lease"}'),
      context(item.id),
    );
    expect([
      made.status,
      changed.status,
      itemResponse.status,
      renamed.status,
    ]).toEqual([201, 200, 201, 200]);
  });
  it.each([
    "{}",
    '{"umbrella":null,"name":"Rent"}',
    '{"umbrella":"expense","name":123}',
    '{"umbrella":"expense","name":"Rent","color":42}',
  ])("rejects invalid category bodies", async (body) => {
    const response = await create(request(body));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "validation" },
    });
  });
  it("rejects an empty update and invalid item bodies", async () => {
    const made = await create(request('{"umbrella":"expense","name":"Rent"}'));
    const { category } = (await made.json()) as { category: { id: string } };
    const empty = await update(request("{}"), context(category.id));
    const badItem = await addItem(
      request('{"name":false}'),
      context(category.id),
    );
    expect(empty.status).toBe(400);
    expect(badItem.status).toBe(400);
  });

  it("returns domain errors and field details from category and item routes", async () => {
    const first = await create(request('{"umbrella":"expense","name":"Rent"}'));
    const { category } = (await first.json()) as { category: { id: string } };
    const duplicate = await create(
      request('{"umbrella":"expense","name":" rent "}'),
    );
    const missing = await update(
      request('{"name":"Home"}'),
      context("missing"),
    );
    const nullColor = await update(
      request('{"color":null}'),
      context(category.id),
    );
    const missingItemName = await addItem(request("{}"), context(category.id));
    const missingItem = await renameItem(request("{}"), context("missing"));
    await expect(duplicate.json()).resolves.toMatchObject({
      error: { code: "duplicate_name", field: "name" },
    });
    await expect(missing.json()).resolves.toMatchObject({
      error: { code: "not_found" },
    });
    await expect(nullColor.json()).resolves.toMatchObject({
      error: { code: "validation", field: "color" },
    });
    await expect(missingItemName.json()).resolves.toMatchObject({
      error: { code: "validation", field: "name" },
    });
    await expect(missingItem.json()).resolves.toMatchObject({
      error: { code: "validation", field: "name" },
    });
  });

  it("returns archived when updating an archived category", async () => {
    const made = await create(request('{"umbrella":"expense","name":"Rent"}'));
    const { category } = (await made.json()) as { category: { id: string } };
    getDatabase()
      .prepare("UPDATE categories SET archived_at = ? WHERE id = ?")
      .run("2026-01-01T00:00:00.000Z", category.id);
    const response = await update(
      request('{"name":"Home"}'),
      context(category.id),
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "archived" },
    });
  });
});

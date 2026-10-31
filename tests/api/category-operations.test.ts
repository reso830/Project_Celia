// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as createCategory } from "@/app/api/categories/route";
import { POST as archive } from "@/app/api/categories/[id]/archive/route";
import { POST as merge } from "@/app/api/categories/[id]/merge/route";
import { POST as restore } from "@/app/api/categories/[id]/restore/route";
import { POST as addItem } from "@/app/api/categories/[id]/items/route";
import { POST as move } from "@/app/api/items/[id]/move/route";
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

async function category(umbrella: "income" | "expense", name: string) {
  const response = await createCategory(
    request(JSON.stringify({ umbrella, name })),
  );
  return ((await response.json()) as { category: { id: string } }).category;
}

beforeEach(() => {
  reset();
  directory = mkdtempSync(path.join(tmpdir(), "celia-category-operations-"));
  process.env.CELIA_DB_PATH = path.join(directory, "celia.db");
});
afterEach(() => {
  reset();
  rmSync(directory, { recursive: true, force: true });
  delete process.env.CELIA_DB_PATH;
});

describe("category operation routes", () => {
  it("archives, restores, moves, and merges with contract bodies", async () => {
    const source = await category("expense", "Dining");
    const target = await category("expense", "Groceries");
    const itemResponse = await addItem(
      request('{"name":"Coffee"}'),
      context(source.id),
    );
    const { item } = (await itemResponse.json()) as { item: { id: string } };

    const archived = await archive(request(), context(source.id));
    const restored = await restore(request(), context(source.id));
    const moved = await move(
      request(JSON.stringify({ targetCategoryId: target.id })),
      context(item.id),
    );
    const merged = await merge(
      request(JSON.stringify({ targetCategoryId: source.id })),
      context(target.id),
    );

    expect(archived.status).toBe(200);
    expect((await archived.json()).category.archivedAt).toEqual(
      expect.any(String),
    );
    expect((await restored.json()).category.archivedAt).toBeNull();
    expect((await moved.json()).item).toMatchObject({
      id: item.id,
      categoryId: target.id,
    });
    await expect(merged.json()).resolves.toMatchObject({
      target: { id: source.id },
      movedItemIds: [item.id],
      combined: [],
    });
  });

  it("returns combined item ids in the merge success body", async () => {
    const source = await category("expense", "Dining");
    const target = await category("expense", "Groceries");
    const sourceItemResponse = await addItem(
      request('{"name":"Coffee"}'),
      context(source.id),
    );
    const targetItemResponse = await addItem(
      request('{"name":"coffee"}'),
      context(target.id),
    );
    const { item: sourceItem } = (await sourceItemResponse.json()) as {
      item: { id: string };
    };
    const { item: targetItem } = (await targetItemResponse.json()) as {
      item: { id: string };
    };

    const response = await merge(
      request(JSON.stringify({ targetCategoryId: target.id })),
      context(source.id),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      target: { id: target.id },
      movedItemIds: [],
      combined: [{ fromItemId: sourceItem.id, intoItemId: targetItem.id }],
    });
  });

  it.each(["{}", '{"targetCategoryId":null}', '{"targetCategoryId":7}'])(
    "rejects invalid merge and move bodies: %s",
    async (body) => {
      const source = await category("expense", "Dining");
      const target = await category("expense", "Groceries");
      const itemResponse = await addItem(
        request('{"name":"Coffee"}'),
        context(source.id),
      );
      const { item } = (await itemResponse.json()) as { item: { id: string } };
      for (const response of [
        await merge(request(body), context(source.id)),
        await move(request(body), context(item.id)),
      ]) {
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({
          error: { code: "validation", field: "targetCategoryId" },
        });
      }
      expect(
        getDatabase()
          .prepare("SELECT category_id FROM items WHERE id = ?")
          .get(item.id),
      ).toMatchObject({ category_id: source.id });
      expect(target.id).toBeTruthy();
    },
  );

  it("rejects bodies on archive and restore and exposes every operation error", async () => {
    const source = await category("expense", "Dining");
    const target = await category("expense", "Groceries");
    const income = await category("income", "Salary");
    const itemResponse = await addItem(
      request('{"name":"Coffee"}'),
      context(source.id),
    );
    const { item } = (await itemResponse.json()) as { item: { id: string } };

    expect(
      (await archive(request('{"x":"x"}'), context(source.id))).status,
    ).toBe(400);
    expect(
      (await restore(request('{"x":"x"}'), context(source.id))).status,
    ).toBe(400);
    expect((await archive(request(), context("missing"))).status).toBe(404);
    expect(
      (
        await move(
          request(JSON.stringify({ targetCategoryId: source.id })),
          context(item.id),
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await move(
          request(JSON.stringify({ targetCategoryId: income.id })),
          context(item.id),
        )
      ).status,
    ).toBe(409);
    await archive(request(), context(target.id));
    expect(
      (
        await move(
          request(JSON.stringify({ targetCategoryId: target.id })),
          context(item.id),
        )
      ).status,
    ).toBe(409);
    await restore(request(), context(target.id));
    await merge(
      request(JSON.stringify({ targetCategoryId: target.id })),
      context(source.id),
    );
    for (const response of [
      await archive(request(), context(source.id)),
      await restore(request(), context(source.id)),
      await merge(
        request(JSON.stringify({ targetCategoryId: target.id })),
        context(source.id),
      ),
    ]) {
      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "archived" },
      });
    }
  });

  it("returns each operation error code from its route", async () => {
    const source = await category("expense", "Dining");
    const target = await category("expense", "Groceries");
    const income = await category("income", "Salary");
    const itemResponse = await addItem(
      request('{"name":"coffee"}'),
      context(source.id),
    );
    const { item } = (await itemResponse.json()) as { item: { id: string } };
    await addItem(request('{"name":"Coffee"}'), context(target.id));

    const checks: Array<[Response, string, number]> = [
      [
        await move(
          request(JSON.stringify({ targetCategoryId: source.id })),
          context(item.id),
        ),
        "same_category",
        409,
      ],
      [
        await move(
          request(JSON.stringify({ targetCategoryId: income.id })),
          context(item.id),
        ),
        "umbrella_mismatch",
        409,
      ],
      [
        await move(
          request(JSON.stringify({ targetCategoryId: target.id })),
          context(item.id),
        ),
        "duplicate_name",
        409,
      ],
      [
        await move(
          request(JSON.stringify({ targetCategoryId: target.id })),
          context("missing"),
        ),
        "not_found",
        404,
      ],
      [
        await merge(
          request(JSON.stringify({ targetCategoryId: source.id })),
          context(source.id),
        ),
        "same_category",
        409,
      ],
      [
        await merge(
          request(JSON.stringify({ targetCategoryId: income.id })),
          context(source.id),
        ),
        "umbrella_mismatch",
        409,
      ],
      [
        await merge(
          request(JSON.stringify({ targetCategoryId: target.id })),
          context("missing"),
        ),
        "not_found",
        404,
      ],
    ];
    for (const [response, code, status] of checks) {
      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toMatchObject({ error: { code } });
    }

    const archived = await archive(request(), context(source.id));
    expect(archived.status).toBe(200);
    await expect(archive(request(), context(source.id))).resolves.toMatchObject(
      {
        status: 409,
      },
    );
    await expect(restore(request(), context(target.id))).resolves.toMatchObject(
      {
        status: 409,
      },
    );
    const archiveAgain = await archive(request(), context(source.id));
    const restoreActive = await restore(request(), context(target.id));
    await expect(archiveAgain.json()).resolves.toMatchObject({
      error: { code: "invalid_state" },
    });
    await expect(restoreActive.json()).resolves.toMatchObject({
      error: { code: "invalid_state" },
    });
  });
});

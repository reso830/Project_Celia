// @vitest-environment node

import { afterEach, beforeEach, expect, it } from "vitest";
import { GET, POST } from "@/app/api/scenarios/route";
import { DELETE, PATCH } from "@/app/api/scenarios/[id]/route";
import { POST as duplicate } from "@/app/api/scenarios/[id]/duplicate/route";
import { POST as addEvent } from "@/app/api/scenarios/[id]/events/route";
import {
  DELETE as deleteEvent,
  PATCH as patchEvent,
} from "@/app/api/scenarios/[id]/events/[eventId]/route";
import { PUT } from "@/app/api/scenarios/[id]/nudges/route";
import { openDatabase } from "@/server/db/database";
import { seedDemoData } from "@/server/demo";

const state = globalThis as typeof globalThis & {
  __celiaDatabase?: ReturnType<typeof openDatabase>;
};
let db: ReturnType<typeof openDatabase>;
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (method: string, body?: unknown) =>
  new Request("http://localhost/api/scenarios", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const scenario = {
  name: "Test car",
  shortLabel: "TEST",
  startMonth: 6,
  drawAmount: 5000,
  paletteKey: "purple",
};
const event = {
  name: "Insurance",
  type: "seasonal",
  monthlyAmount: 80000,
  description: "Annual cost",
};

beforeEach(() => {
  db = openDatabase(":memory:");
  state.__celiaDatabase = db;
  seedDemoData(db);
});
afterEach(() => {
  db.close();
  delete state.__celiaDatabase;
});

async function expectError(
  response: Response,
  status: number,
  code: string,
  field?: string,
) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({
    error: { code, message: expect.any(String), ...(field ? { field } : {}) },
  });
}

it("lists stable IDs and creates, updates, duplicates and deletes a custom scenario", async () => {
  expect(
    (await (await GET()).json()).scenarios.map(({ id }: { id: string }) => id),
  ).toEqual(["baseline", "a", "b", "c"]);
  const created = await POST(request("POST", scenario));
  expect(created.status).toBe(201);
  const { id } = await created.json();
  const changed = await PATCH(
    request("PATCH", { drawAmount: 9000 }),
    context(id),
  );
  expect(changed.status).toBe(200);
  expect(await changed.json()).toMatchObject({ id, drawAmount: 9000 });
  const copied = await duplicate(request("POST"), context("b"));
  expect(copied.status).toBe(201);
  expect(await copied.json()).toMatchObject({
    name: "B · Wait 6 months (Copy)",
    shortLabel: "B · WAIT (COPY)",
    events: expect.any(Array),
    nudges: expect.any(Array),
  });
  const deleted = await DELETE(request("DELETE"), context(id));
  expect(deleted.status).toBe(200);
  expect(await deleted.json()).toEqual({ success: true });
  await expectError(
    await PATCH(request("PATCH", { name: "Missing" }), context(id)),
    404,
    "not_found",
  );
});

it("protects baseline writes with 409 invalid_state", async () => {
  const baseline = context("baseline");
  for (const response of await Promise.all([
    PATCH(request("PATCH", { name: "New baseline" }), baseline),
    DELETE(request("DELETE"), baseline),
    duplicate(request("POST"), baseline),
    addEvent(request("POST", event), baseline),
    PUT(
      request("PUT", {
        targetType: "category",
        categoryId: "unused",
        bucketId: null,
        deltaAmount: -1,
      }),
      baseline,
    ),
  ]))
    await expectError(response, 409, "invalid_state");
});

it("rejects malformed JSON, unknown fields, unsupported palettes, and invalid event amounts", async () => {
  await expectError(
    await POST(new Request("http://localhost", { method: "POST", body: "{" })),
    400,
    "validation",
  );
  await expectError(
    await POST(request("POST", { ...scenario, isBaseline: true })),
    400,
    "validation",
    "isBaseline",
  );
  await expectError(
    await POST(request("POST", { ...scenario, paletteKey: "rose" })),
    400,
    "validation",
    "paletteKey",
  );
  for (const monthlyAmount of [0, -1, 0.1, "80000", null]) {
    await expectError(
      await addEvent(
        request("POST", { ...event, monthlyAmount }),
        context("a"),
      ),
      400,
      "validation",
      "monthlyAmount",
    );
  }
});

it("adds, edits and deletes events and enforces scenario ownership", async () => {
  const created = await addEvent(request("POST", event), context("c"));
  expect(created.status).toBe(201);
  const { id } = await created.json();
  const ctx = (scenarioId: string) => ({
    params: Promise.resolve({ id: scenarioId, eventId: id }),
  });
  await expectError(
    await patchEvent(request("PATCH", { description: null }), ctx("a")),
    404,
    "not_found",
  );
  const edited = await patchEvent(
    request("PATCH", { description: null }),
    ctx("c"),
  );
  expect(edited.status).toBe(200);
  expect(await edited.json()).toMatchObject({ id, description: null });
  const removed = await deleteEvent(request("DELETE"), ctx("c"));
  expect(await removed.json()).toEqual({ success: true });
  await expectError(
    await deleteEvent(request("DELETE"), ctx("c")),
    404,
    "not_found",
  );
});

it("upserts signed deltas and rejects archived targets and income categories", async () => {
  const rowId = (table: "categories" | "savings_buckets", name: string) =>
    (
      db.prepare(`SELECT id FROM ${table} WHERE name_key = ?`).get(name) as {
        id: string;
      }
    ).id;
  const categoryId = rowId("categories", "dining out");
  const category = {
    targetType: "category",
    categoryId,
    bucketId: null,
    deltaAmount: -123,
  };
  const first = await PUT(request("PUT", category), context("b"));
  expect(first.status).toBe(200);
  const { id } = await first.json();
  const second = await PUT(
    request("PUT", { ...category, deltaAmount: 321 }),
    context("b"),
  );
  expect(second.status).toBe(200);
  expect(await second.json()).toMatchObject({ id, deltaAmount: 321 });
  await expectError(
    await PUT(
      request("PUT", {
        ...category,
        categoryId: rowId("categories", "salary"),
      }),
      context("b"),
    ),
    400,
    "validation",
    "categoryId",
  );
  db.prepare("UPDATE categories SET archived_at = 'now' WHERE id = ?").run(
    categoryId,
  );
  const bucketId = rowId("savings_buckets", "car down payment");
  db.prepare("UPDATE savings_buckets SET archived_at = 'now' WHERE id = ?").run(
    bucketId,
  );
  await expectError(
    await PUT(request("PUT", category), context("b")),
    409,
    "archived",
  );
  await expectError(
    await PUT(
      request("PUT", {
        ...category,
        targetType: "bucket",
        categoryId: null,
        bucketId,
      }),
      context("b"),
    ),
    409,
    "archived",
  );
});

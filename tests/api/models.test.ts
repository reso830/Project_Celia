// @vitest-environment node
import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "@/server/db/database";
import { POST as create } from "@/app/api/models/route";
import { PATCH as patch, DELETE as remove } from "@/app/api/models/[id]/route";
import { POST as duplicate } from "@/app/api/models/[id]/duplicate/route";
import { POST as apply } from "@/app/api/models/[id]/apply/route";
import { PATCH as revise } from "@/app/api/monthly-plans/[monthKey]/route";
import { createCategory, archiveCategory } from "@/server/categories-service";
const state = globalThis as typeof globalThis & {
  __celiaDatabase?: Database.Database;
};
const request = (body: unknown = {}) =>
  new Request("http://localhost/api/models", {
    method: "POST",
    body: JSON.stringify(body),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const month = (monthKey: string) => ({ params: Promise.resolve({ monthKey }) });
beforeEach(() => {
  state.__celiaDatabase = openDatabase(":memory:");
});
afterEach(() => {
  state.__celiaDatabase!.close();
  delete state.__celiaDatabase;
});
async function error(res: Response, status: number, code: string) {
  expect(res.status).toBe(status);
  expect(await res.json()).toMatchObject({ error: { code } });
}
async function model() {
  const r = await create(request({ name: "Base", description: "plan" }));
  expect(r.status).toBe(201);
  return (await r.json()).model;
}
describe("models and monthly plan routes", () => {
  it("performs CRUD, duplicate, apply and revision with stable snapshots", async () => {
    const m = await model();
    const c = createCategory(
      "expense",
      "Food",
      undefined,
      state.__celiaDatabase,
    );
    const p = await patch(
      request({
        description: "",
        targetType: "category",
        targetId: c.id,
        amount: "100.25",
      }),
      ctx(m.id),
    );
    expect(p.status).toBe(200);
    expect(await p.json()).toMatchObject({
      model: { description: null, allocations: [{ amount: 10025 }] },
    });
    const copy = await duplicate(request(), ctx(m.id));
    expect(copy.status).toBe(201);
    expect(await copy.json()).toMatchObject({
      model: { name: "Base (Copy)", allocations: [{ amount: 10025 }] },
    });
    const applied = await apply(request({ monthKey: "2026-09" }), ctx(m.id));
    expect(applied.status).toBe(200);
    expect(await applied.json()).toMatchObject({
      plan: {
        monthKey: "2026-09",
        isRevised: false,
        allocations: [{ amount: 10025 }],
      },
    });
    const changed = await revise(
      request({ targetType: "category", targetId: c.id, amount: "99" }),
      month("2026-09"),
    );
    expect(changed.status).toBe(200);
    expect(await changed.json()).toMatchObject({
      plan: { isRevised: true, allocations: [{ amount: 9900 }] },
    });
    expect((await remove(request(), ctx(m.id))).status).toBe(200);
    expect(
      state
        .__celiaDatabase!.prepare(
          "SELECT source_model_id FROM monthly_budget_plans",
        )
        .get(),
    ).toEqual({ source_model_id: null });
  });
  it("rejects archived positive allocations but permits zero-out on models and plans", async () => {
    const m = await model();
    const c = createCategory(
      "expense",
      "Food",
      undefined,
      state.__celiaDatabase,
    );
    const body = { targetType: "category", targetId: c.id, amount: "10" };
    await patch(request(body), ctx(m.id));
    await apply(request({ monthKey: "2026-09" }), ctx(m.id));
    archiveCategory(c.id, state.__celiaDatabase);
    await error(await patch(request(body), ctx(m.id)), 409, "archived");
    await error(await revise(request(body), month("2026-09")), 409, "archived");
    expect(
      (await patch(request({ ...body, amount: "0" }), ctx(m.id))).status,
    ).toBe(200);
    expect(
      (await revise(request({ ...body, amount: "0" }), month("2026-09")))
        .status,
    ).toBe(200);
  });
  it("returns internal errors without exposing SQL details or partially replacing snapshots", async () => {
    const m = await model();
    const c = createCategory(
      "expense",
      "Food",
      undefined,
      state.__celiaDatabase,
    );
    await patch(
      request({ targetType: "category", targetId: c.id, amount: "10" }),
      ctx(m.id),
    );
    const plan = await (
      await apply(request({ monthKey: "2026-09" }), ctx(m.id))
    ).json();
    const before = state
      .__celiaDatabase!.prepare("SELECT * FROM monthly_budget_allocations")
      .all();
    state.__celiaDatabase!.exec(
      "CREATE TRIGGER reject_snapshot BEFORE INSERT ON monthly_budget_allocations BEGIN SELECT RAISE(ABORT,'private SQL detail'); END;",
    );
    const res = await apply(request({ monthKey: "2026-09" }), ctx(m.id));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: { code: "internal", message: "An unexpected error occurred." },
    });
    expect(
      state
        .__celiaDatabase!.prepare("SELECT * FROM monthly_budget_allocations")
        .all(),
    ).toEqual(before);
    expect(
      state
        .__celiaDatabase!.prepare("SELECT id FROM monthly_budget_plans")
        .get(),
    ).toEqual({ id: plan.plan.id });
  });
  it("validates body types, unknown fields, partial targets, money, month and missing resources", async () => {
    for (const b of [null, [], {}, { name: 1 }, { name: "X", extra: "x" }])
      await error(await create(request(b)), 400, "validation");
    await error(
      await create(
        new Request("http://localhost", { method: "POST", body: "{" }),
      ),
      400,
      "validation",
    );
    const m = await model();
    await error(
      await create(request({ name: " base " })),
      409,
      "duplicate_name",
    );
    for (const b of [
      {},
      { amount: "1" },
      { targetId: "x" },
      { targetType: "category", targetId: "x", amount: "-1" },
    ])
      await error(await patch(request(b), ctx(m.id)), 400, "validation");
    await error(
      await patch(
        request({ targetType: "category", targetId: "missing", amount: "1" }),
        ctx(m.id),
      ),
      404,
      "not_found",
    );
    await error(
      await patch(request({ name: "X" }), ctx("missing")),
      404,
      "not_found",
    );
    await error(await duplicate(request(), ctx("missing")), 404, "not_found");
    await error(await remove(request(), ctx("missing")), 404, "not_found");
    await error(
      await apply(request({ monthKey: "2026-13" }), ctx(m.id)),
      400,
      "validation",
    );
    await error(
      await apply(request({ monthKey: "2026-09" }), ctx("missing")),
      404,
      "not_found",
    );
    const body = { targetType: "bucket", targetId: "missing", amount: "0" };
    await error(
      await revise(request(body), month("2026-09")),
      404,
      "not_found",
    );
    await apply(request({ monthKey: "2026-09" }), ctx(m.id));
    await error(
      await revise(request(body), month("2026-09")),
      404,
      "not_found",
    );
    await error(
      await revise(request(body), month("invalid")),
      400,
      "validation",
    );
  });
});

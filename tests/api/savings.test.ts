// @vitest-environment node
import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openDatabase } from "@/server/db/database";
import { POST as createBucket } from "@/app/api/savings/buckets/route";
import { PATCH as patchBucket } from "@/app/api/savings/buckets/[id]/route";
import { POST as archive } from "@/app/api/savings/buckets/[id]/archive/route";
import { POST as restore } from "@/app/api/savings/buckets/[id]/restore/route";
import { POST as createActivity } from "@/app/api/savings/activities/route";
import {
  PATCH as patchActivity,
  DELETE as deleteActivity,
} from "@/app/api/savings/activities/[id]/route";
const state = globalThis as typeof globalThis & {
  __celiaDatabase?: Database.Database;
};
const request = (body: unknown = {}) =>
  new Request("http://localhost/api/savings", {
    method: "POST",
    body: JSON.stringify(body),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 8, 12));
  state.__celiaDatabase = openDatabase(":memory:");
});
afterEach(() => {
  state.__celiaDatabase?.close();
  delete state.__celiaDatabase;
  vi.useRealTimers();
});
async function bucket(name = "Travel", extra = {}) {
  const res = await createBucket(request({ name, type: "goal", ...extra }));
  expect(res.status).toBe(201);
  return (await res.json()).bucket;
}
async function error(res: Response, status: number, code: string) {
  expect(res.status).toBe(status);
  expect(await res.json()).toMatchObject({ error: { code } });
}
describe("savings routes", () => {
  it("creates, patches, archives and restores buckets with exact amounts", async () => {
    const b = await bucket("Travel", {
      openingBalance: "100.25",
      targetAmount: "200",
      targetMonth: "2027-02",
      description: "Trip",
    });
    expect(b).toMatchObject({
      openingBalance: 10025,
      countsTowardBuffer: false,
    });
    const changed = await patchBucket(
      request({ targetAmount: "", targetMonth: "", description: "" }),
      ctx(b.id),
    );
    expect(changed.status).toBe(200);
    expect(await changed.json()).toMatchObject({
      bucket: {
        targetAmount: null,
        targetMonth: null,
        description: null,
        openingBalance: 10025,
      },
    });
    expect((await archive(request(), ctx(b.id))).status).toBe(200);
    await error(await archive(request(), ctx(b.id)), 409, "invalid_state");
    await error(
      await patchBucket(request({ name: "Changed" }), ctx(b.id)),
      409,
      "archived",
    );
    expect((await restore(request(), ctx(b.id))).status).toBe(200);
    await error(await restore(request(), ctx(b.id)), 409, "invalid_state");
  });
  it("distinguishes default and already-archived errors without changing state", async () => {
    const defaultBucket = await bucket("Cash", {
      type: "cash_buffer",
      isDefault: "true",
    });
    const defaultBefore = state
      .__celiaDatabase!.prepare("SELECT * FROM savings_buckets WHERE id=?")
      .get(defaultBucket.id);
    const defaultResponse = await archive(request(), ctx(defaultBucket.id));
    expect(defaultResponse.status).toBe(409);
    expect(await defaultResponse.json()).toEqual({
      error: {
        code: "invalid_state",
        message:
          "Designate another Cash Buffer bucket as default before archiving this bucket.",
      },
    });
    expect(
      state
        .__celiaDatabase!.prepare("SELECT * FROM savings_buckets WHERE id=?")
        .get(defaultBucket.id),
    ).toEqual(defaultBefore);
    const other = await bucket();
    expect((await archive(request(), ctx(other.id))).status).toBe(200);
    const archivedBefore = state
      .__celiaDatabase!.prepare("SELECT * FROM savings_buckets WHERE id=?")
      .get(other.id);
    const repeated = await archive(request(), ctx(other.id));
    expect(repeated.status).toBe(409);
    expect(await repeated.json()).toEqual({
      error: { code: "invalid_state", message: "Bucket is already archived." },
    });
    expect(
      state
        .__celiaDatabase!.prepare("SELECT * FROM savings_buckets WHERE id=?")
        .get(other.id),
    ).toEqual(archivedBefore);
  });
  it("maps default guards and duplicate names to 409", async () => {
    const b = await bucket("Cash", { type: "cash_buffer", isDefault: "true" });
    for (const patch of [
      { isDefault: "false" },
      { type: "goal" },
      { countsTowardBuffer: "false" },
    ])
      await error(
        await patchBucket(request(patch), ctx(b.id)),
        409,
        "invalid_state",
      );
    await error(await archive(request(), ctx(b.id)), 409, "invalid_state");
    await error(
      await createBucket(request({ name: " cash ", type: "goal" })),
      409,
      "duplicate_name",
    );
  });
  it("records, edits and deletes activity with exact balance responses", async () => {
    const b = await bucket();
    const res = await createActivity(
      request({
        bucketId: b.id,
        kind: "contribution",
        amount: "50.25",
        date: "2026-09-01",
        note: "deposit",
      }),
    );
    expect(res.status).toBe(201);
    const a = await res.json();
    expect(a.currentBalance).toBe(5025);
    const changed = await patchActivity(
      request({ amount: "60", note: "" }),
      ctx(a.activity.id),
    );
    expect(changed.status).toBe(200);
    expect(await changed.json()).toMatchObject({
      currentBalance: 6000,
      activity: { amount: 6000, note: null },
    });
    await error(
      await createActivity(
        request({
          bucketId: b.id,
          kind: "withdrawal",
          amount: "61",
          date: "2026-09-01",
        }),
      ),
      400,
      "validation",
    );
    await error(
      await patchActivity(request({ date: "2026-11-09" }), ctx(a.activity.id)),
      400,
      "validation",
    );
    const removed = await deleteActivity(request(), ctx(a.activity.id));
    expect(removed.status).toBe(200);
    expect(await removed.json()).toEqual({
      id: a.activity.id,
      currentBalance: 0,
    });
    await error(
      await deleteActivity(request(), ctx(a.activity.id)),
      404,
      "not_found",
    );
  });
  it("maps negative-balance edits and deletion to 400 and leaves activity intact", async () => {
    const b = await bucket();
    const contribution = await (
      await createActivity(
        request({
          bucketId: b.id,
          kind: "contribution",
          amount: "50",
          date: "2026-09-01",
        }),
      )
    ).json();
    const withdrawal = await (
      await createActivity(
        request({
          bucketId: b.id,
          kind: "withdrawal",
          amount: "40",
          date: "2026-09-01",
        }),
      )
    ).json();
    const before = state
      .__celiaDatabase!.prepare("SELECT * FROM savings_activities ORDER BY id")
      .all();
    await error(
      await patchActivity(
        request({ amount: "30" }),
        ctx(contribution.activity.id),
      ),
      400,
      "validation",
    );
    await error(
      await patchActivity(
        request({ amount: "51" }),
        ctx(withdrawal.activity.id),
      ),
      400,
      "validation",
    );
    await error(
      await patchActivity(
        request({ kind: "withdrawal" }),
        ctx(contribution.activity.id),
      ),
      400,
      "validation",
    );
    await error(
      await deleteActivity(request(), ctx(contribution.activity.id)),
      400,
      "validation",
    );
    expect(
      state
        .__celiaDatabase!.prepare(
          "SELECT * FROM savings_activities ORDER BY id",
        )
        .all(),
    ).toEqual(before);
  });
  it("returns a generic internal error for a failed database mutation with rollback", async () => {
    state.__celiaDatabase!.exec(
      "CREATE TRIGGER reject_bucket BEFORE INSERT ON savings_buckets BEGIN SELECT RAISE(ABORT,'private database failure'); END;",
    );
    const res = await createBucket(request({ name: "Travel", type: "goal" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: { code: "internal", message: "An unexpected error occurred." },
    });
    expect(
      state
        .__celiaDatabase!.prepare("SELECT count(*) AS n FROM savings_buckets")
        .get(),
    ).toEqual({ n: 0 });
  });
  it("rejects activity create/edit/delete on archived buckets without changing rows", async () => {
    const b = await bucket();
    const body = {
      bucketId: b.id,
      kind: "contribution",
      amount: "50",
      date: "2026-09-01",
    };
    const a = await (await createActivity(request(body))).json();
    await archive(request(), ctx(b.id));
    const before = state
      .__celiaDatabase!.prepare("SELECT * FROM savings_activities")
      .all();
    await error(await createActivity(request(body)), 409, "archived");
    await error(
      await patchActivity(request({ amount: "60" }), ctx(a.activity.id)),
      409,
      "archived",
    );
    await error(
      await deleteActivity(request(), ctx(a.activity.id)),
      409,
      "archived",
    );
    expect(
      state.__celiaDatabase!.prepare("SELECT * FROM savings_activities").all(),
    ).toEqual(before);
  });
  it("rejects malformed JSON, types, unknown fields, empty patches and unknown IDs", async () => {
    for (const value of [
      null,
      [],
      { name: "X" },
      { name: "X", type: "goal", extra: "x" },
      { name: "X", type: "goal", isDefault: true },
      { name: "X", type: "goal", countsTowardBuffer: "yes" },
    ])
      await error(await createBucket(request(value)), 400, "validation");
    await error(
      await createBucket(
        new Request("http://localhost", { method: "POST", body: "{" }),
      ),
      400,
      "validation",
    );
    const b = await bucket();
    await error(await patchBucket(request(), ctx(b.id)), 400, "validation");
    await error(
      await patchActivity(request(), ctx("missing")),
      400,
      "validation",
    );
    await error(
      await patchBucket(request({ name: "X" }), ctx("missing")),
      404,
      "not_found",
    );
    await error(await archive(request(), ctx("missing")), 404, "not_found");
    await error(await restore(request(), ctx("missing")), 404, "not_found");
    await error(
      await patchActivity(request({ amount: "1" }), ctx("missing")),
      404,
      "not_found",
    );
    await error(
      await createActivity(
        request({
          bucketId: b.id,
          kind: "contribution",
          amount: "1",
          date: "2026-11-09",
        }),
      ),
      400,
      "validation",
    );
    await error(
      await archive(request({ extra: "x" }), ctx(b.id)),
      400,
      "validation",
    );
  });
});

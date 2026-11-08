// @vitest-environment node
import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openDatabase } from "@/server/db/database";
import * as service from "@/server/savings-service";
import * as store from "@/server/savings-store";
import { getSavingsView } from "@/server/savings-read";
import { connection } from "next/server";
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
const state = globalThis as typeof globalThis & {
  __celiaDatabase?: Database.Database;
};
let db: Database.Database;
const draft = {
  name: "Travel",
  type: "goal",
  openingBalance: "100.50",
  targetAmount: "200",
  targetMonth: "2027-02",
  description: " trip ",
};
const activity = (bucketId: string, kind = "contribution", amount = "50") => ({
  bucketId,
  kind,
  amount,
  date: "2026-09-01",
  note: " transfer ",
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 8, 12));
  db = openDatabase(":memory:");
  state.__celiaDatabase = db;
});
afterEach(() => {
  db.close();
  delete state.__celiaDatabase;
  vi.useRealTimers();
  vi.clearAllMocks();
});
describe("savings service and read view", () => {
  it("persists metadata and nullable patch semantics with case-insensitive uniqueness", () => {
    const b = service.createSavingsBucket(draft, db);
    expect(b).toMatchObject({
      name: "Travel",
      openingBalance: 10050,
      targetAmount: 20000,
      targetMonth: "2027-02",
      description: "trip",
      countsTowardBuffer: false,
      isDefault: false,
    });
    expect(() =>
      service.createSavingsBucket({ ...draft, name: " TRAVEL " }, db),
    ).toThrow(expect.objectContaining({ code: "duplicate_name" }));
    expect(
      service.updateSavingsBucket(
        b.id,
        { targetAmount: "", targetMonth: "", description: "" },
        db,
      ),
    ).toMatchObject({
      openingBalance: 10050,
      targetAmount: null,
      targetMonth: null,
      description: null,
    });
    expect(store.listSavingsBuckets(db)).toHaveLength(1);
  });
  it("transfers default atomically and guards its flags, type, and archive", () => {
    const first = service.createSavingsBucket(
      { name: "Cash", type: "cash_buffer", isDefault: "true" },
      db,
    );
    expect(first).toMatchObject({ isDefault: true, countsTowardBuffer: true });
    for (const patch of [
      { isDefault: "false" },
      { type: "goal" },
      { countsTowardBuffer: "false" },
    ])
      expect(() => service.updateSavingsBucket(first.id, patch, db)).toThrow(
        expect.objectContaining({ code: "invalid_state" }),
      );
    expect(() => service.archiveSavingsBucket(first.id, db)).toThrow(
      expect.objectContaining({ code: "invalid_state" }),
    );
    expect(() =>
      service.createSavingsBucket(
        { name: "Bad", type: "goal", isDefault: "true" },
        db,
      ),
    ).toThrow(expect.objectContaining({ code: "invalid_state" }));
    const second = service.createSavingsBucket(
      {
        name: "Other cash",
        type: "cash_buffer",
        isDefault: "true",
        countsTowardBuffer: "false",
      },
      db,
    );
    expect(store.findSavingsBucketById(db, first.id)?.isDefault).toBe(false);
    expect(second.countsTowardBuffer).toBe(true);
    expect(() =>
      service.updateSavingsBucket(
        first.id,
        { name: "Other cash", isDefault: "true" },
        db,
      ),
    ).toThrow();
    expect(store.findSavingsBucketById(db, second.id)?.isDefault).toBe(true);
    service.updateSavingsBucket(first.id, { isDefault: "true" }, db);
    expect(store.findSavingsBucketById(db, second.id)?.isDefault).toBe(false);
  });
  it("rolls back default transfer when the database rejects the new bucket", () => {
    const previous = service.createSavingsBucket(
      { name: "Cash", type: "cash_buffer", isDefault: "true" },
      db,
    );
    db.exec(
      "CREATE TRIGGER reject_new_bucket BEFORE INSERT ON savings_buckets BEGIN SELECT RAISE(ABORT,'forced failure'); END;",
    );
    expect(() =>
      service.createSavingsBucket(
        { name: "New cash", type: "cash_buffer", isDefault: "true" },
        db,
      ),
    ).toThrow("forced failure");
    expect(store.findSavingsBucketById(db, previous.id)).toEqual(previous);
    expect(store.listSavingsBuckets(db)).toHaveLength(1);
  });
  it("orders equal-date activities by creation time then ID, and filters bucket and month", () => {
    const b = service.createSavingsBucket(draft, db);
    const other = service.createSavingsBucket({ ...draft, name: "Other" }, db);
    const row = {
      bucketId: b.id,
      kind: "contribution" as const,
      amount: 1,
      date: "2026-09-01",
      note: null,
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "",
    };
    for (const id of ["z", "a"])
      store.insertSavingsActivity(db, { ...row, id });
    store.insertSavingsActivity(db, {
      ...row,
      id: "newer",
      createdAt: "2026-09-02T00:00:00Z",
    });
    store.insertSavingsActivity(db, {
      ...row,
      id: "other-bucket",
      bucketId: other.id,
    });
    store.insertSavingsActivity(db, {
      ...row,
      id: "august",
      date: "2026-08-01",
    });
    expect(
      store
        .listSavingsActivities(db, { bucketId: b.id, monthKey: "2026-09" })
        .map((a) => a.id),
    ).toEqual(["newer", "a", "z"]);
  });
  it("guards lifetime balance on all writes with rollback and never changes F02 entries", () => {
    const b = service.createSavingsBucket(
      { ...draft, openingBalance: "0" },
      db,
    );
    const c = service.createSavingsActivity(activity(b.id), db);
    const w = service.createSavingsActivity(
      activity(b.id, "withdrawal", "40"),
      db,
    );
    expect(w.currentBalance).toBe(1000);
    const before = store.listSavingsActivities(db);
    for (const action of [
      () =>
        service.createSavingsActivity(activity(b.id, "withdrawal", "11"), db),
      () => service.updateSavingsActivity(c.activity.id, { amount: "30" }, db),
      () => service.deleteSavingsActivity(c.activity.id, db),
    ])
      expect(action).toThrow(expect.objectContaining({ code: "validation" }));
    expect(store.listSavingsActivities(db)).toEqual(before);
    expect(
      service.updateSavingsActivity(
        c.activity.id,
        { amount: "60", note: "" },
        db,
      ),
    ).toMatchObject({ currentBalance: 2000, activity: { note: null } });
    expect(
      service.deleteSavingsActivity(w.activity.id, db).currentBalance,
    ).toBe(6000);
    const opening = service.createSavingsBucket(
      { ...draft, name: "Opening" },
      db,
    );
    service.createSavingsActivity(
      activity(opening.id, "withdrawal", "100"),
      db,
    );
    expect(() =>
      service.updateSavingsBucket(opening.id, { openingBalance: "99" }, db),
    ).toThrow(
      expect.objectContaining({ code: "validation", field: "openingBalance" }),
    );
    expect(db.prepare("SELECT count(*) AS n FROM entries").get()).toEqual({
      n: 0,
    });
  });
  it("preserves archived history and blocks every archived mutation", () => {
    const b = service.createSavingsBucket(draft, db);
    const a = service.createSavingsActivity(activity(b.id), db);
    service.archiveSavingsBucket(b.id, db);
    const before = store.listSavingsActivities(db);
    for (const action of [
      () => service.updateSavingsBucket(b.id, { name: "Changed" }, db),
      () => service.createSavingsActivity(activity(b.id), db),
      () => service.updateSavingsActivity(a.activity.id, { amount: "60" }, db),
      () => service.deleteSavingsActivity(a.activity.id, db),
    ])
      expect(action).toThrow(expect.objectContaining({ code: "archived" }));
    expect(store.listSavingsActivities(db)).toEqual(before);
    expect(store.listSavingsBuckets(db)).toEqual([]);
    expect(
      store.listSavingsBuckets(db, { includeArchived: true }),
    ).toHaveLength(1);
    expect(() => service.archiveSavingsBucket(b.id, db)).toThrow(
      expect.objectContaining({ code: "invalid_state" }),
    );
    expect(service.restoreSavingsBucket(b.id, db).archivedAt).toBe(null);
    expect(() => service.restoreSavingsBucket(b.id, db)).toThrow(
      expect.objectContaining({ code: "invalid_state" }),
    );
  });
  it("rejects invalid fields, calendar/future dates, unknown IDs and empty patches", () => {
    for (const patch of [
      { name: "" },
      { type: "invalid" },
      { openingBalance: "-1" },
      { targetAmount: "0" },
      { targetMonth: "2026-13" },
      { countsTowardBuffer: "yes" },
      { isDefault: "1" },
    ])
      expect(() =>
        service.createSavingsBucket({ ...draft, ...patch }, db),
      ).toThrow(expect.objectContaining({ code: "validation" }));
    const b = service.createSavingsBucket(draft, db);
    for (const patch of [
      { kind: "income" },
      { amount: "0" },
      { date: "2026-02-31" },
      { date: "2026-11-09" },
    ])
      expect(() =>
        service.createSavingsActivity({ ...activity(b.id), ...patch }, db),
      ).toThrow(expect.objectContaining({ code: "validation" }));
    const a = service.createSavingsActivity(activity(b.id), db);
    expect(() =>
      service.updateSavingsActivity(a.activity.id, { date: "2026-11-09" }, db),
    ).toThrow(expect.objectContaining({ code: "validation" }));
    for (const action of [
      () => service.updateSavingsBucket(b.id, {}, db),
      () => service.updateSavingsActivity(a.activity.id, {}, db),
    ])
      expect(action).toThrow(expect.objectContaining({ code: "validation" }));
    for (const action of [
      () => service.updateSavingsBucket("missing", { name: "X" }, db),
      () => service.createSavingsActivity(activity("missing"), db),
      () => service.deleteSavingsActivity("missing", db),
      () => service.restoreSavingsBucket("missing", db),
    ])
      expect(action).toThrow(expect.objectContaining({ code: "not_found" }));
  });
  it("reads request-time lifetime metrics and month actual expenses with no plan until Phase 03", async () => {
    db.exec(
      "INSERT INTO categories (id,umbrella_id,name,name_key,color,created_at,updated_at) VALUES ('c','expense','Food','food','#7d8ba8','',''); INSERT INTO items (id,category_id,name,name_key,created_at,updated_at) VALUES ('i','c','Rice','rice','',''); INSERT INTO entries VALUES ('e','i',NULL,10000,'2026-09-01',NULL,'','');",
    );
    const entries = db.prepare("SELECT * FROM entries").all();
    const b = service.createSavingsBucket(
      { ...draft, type: "emergency_fund" },
      db,
    );
    service.createSavingsActivity(
      { ...activity(b.id), date: "2026-08-01" },
      db,
    );
    service.createSavingsActivity(activity(b.id), db);
    const archived = service.createSavingsBucket(
      { ...draft, name: "Archived" },
      db,
    );
    service.archiveSavingsBucket(archived.id, db);
    const view = await getSavingsView("2026-09");
    expect(connection).toHaveBeenCalled();
    expect(view).toMatchObject({
      month: "2026-09",
      today: "2026-11-08",
      kpis: {
        hasMonthlyPlan: false,
        fundedStatus: "no_plan",
        monthlyExpensesCentavos: 10000,
        heldInBucketsCentavos: 20050,
        monthlyFundedCentavos: 5000,
        runwayMonths: 2,
      },
    });
    expect(view.activeBuckets[0].activities.map((a) => a.date)).toEqual([
      "2026-09-01",
      "2026-08-01",
    ]);
    expect(view.archivedBuckets).toHaveLength(1);
    expect((await getSavingsView("2026-13")).month).toBe("2026-11");
    expect((await getSavingsView()).month).toBe("2026-11");
    expect(
      store.listSavingsActivities(db, { bucketId: b.id, monthKey: "2026-08" }),
    ).toHaveLength(1);
    expect(db.prepare("SELECT * FROM entries").all()).toEqual(entries);
  });
});

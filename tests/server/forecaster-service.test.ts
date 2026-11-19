// @vitest-environment node

import { afterEach, beforeEach, expect, it } from "vitest";
import { archiveCategory, mergeCategory } from "@/server/categories-service";
import { openDatabase } from "@/server/db/database";
import { seedDemoData } from "@/server/demo";
import * as service from "@/server/forecaster-service";
import { getScenarioById } from "@/server/forecaster-store";

const scenarioInput = {
  name: " Car ",
  shortLabel: " CAR ",
  startMonth: 2,
  drawAmount: 0,
  paletteKey: "teal" as const,
};
const eventInput = {
  name: "Cost",
  type: "recurring" as const,
  monthlyAmount: 100,
};
let db: ReturnType<typeof openDatabase>;

beforeEach(() => {
  db = openDatabase(":memory:");
  seedDemoData(db, { currentDate: "2026-11-18" });
});
afterEach(() => db.close());

it("guards baseline operations", () => {
  const nudge = getScenarioById(db, "b")!.nudges[0];
  for (const mutate of [
    () => service.updateScenario(db, "baseline", { name: "New" }),
    () => service.updateScenario(db, "baseline", { drawAmount: 1 }),
    () => service.createScenarioEvent(db, "baseline", eventInput),
    () => service.upsertScenarioNudge(db, "baseline", nudge),
    () => service.duplicateScenario(db, "baseline"),
    () => service.deleteScenario(db, "baseline"),
  ])
    expect(mutate).toThrow(expect.objectContaining({ code: "invalid_state" }));
});

it("clones children and isolates updates and cascades from other scenarios and actuals", () => {
  const tables = [
    "entries",
    "monthly_budget_plans",
    "monthly_budget_allocations",
    "budget_models",
    "savings_buckets",
    "savings_activities",
  ];
  const snapshot = () =>
    tables.map((table) =>
      db.prepare("SELECT * FROM " + table + " ORDER BY id").all(),
    );
  const actuals = snapshot();
  const original = getScenarioById(db, "a")!;
  const clone = service.duplicateScenario(db, "a");
  expect(clone).toMatchObject({
    name: original.name + " (Copy)",
    shortLabel: original.shortLabel + " (COPY)",
    drawAmount: original.drawAmount,
    paletteKey: original.paletteKey,
  });
  expect(clone.id).not.toBe(original.id);
  expect(clone.events.map((event) => event.monthlyAmount)).toEqual(
    original.events.map((event) => event.monthlyAmount),
  );
  expect(clone.nudges.map((nudge) => nudge.deltaAmount)).toEqual(
    original.nudges.map((nudge) => nudge.deltaAmount),
  );
  expect(
    clone.events.every(
      (event) =>
        event.scenarioId === clone.id &&
        !original.events.some(({ id }) => id === event.id),
    ),
  ).toBe(true);
  expect(
    clone.nudges.every(
      (nudge) =>
        nudge.scenarioId === clone.id &&
        !original.nudges.some(({ id }) => id === nudge.id),
    ),
  ).toBe(true);
  expect(() =>
    service.updateScenarioEvent(db, clone.id, original.events[0].id, {
      monthlyAmount: 500,
    }),
  ).toThrow(expect.objectContaining({ code: "not_found" }));
  service.updateScenarioEvent(db, clone.id, clone.events[0].id, {
    monthlyAmount: 500,
  });
  service.upsertScenarioNudge(db, clone.id, {
    ...clone.nudges[0],
    deltaAmount: 301,
  });
  service.deleteScenario(db, clone.id);
  expect(getScenarioById(db, clone.id)).toBeNull();
  for (const table of ["scenario_events", "scenario_nudges"]) {
    expect(
      db
        .prepare("SELECT id FROM " + table + " WHERE scenario_id = ?")
        .all(clone.id),
    ).toEqual([]);
  }
  expect(getScenarioById(db, "a")).toEqual(original);
  expect(snapshot()).toEqual(actuals);
});

it("validates mutations and protects archived targets", () => {
  const scenario = service.createScenario(db, scenarioInput);
  expect(scenario).toMatchObject({ name: "Car", shortLabel: "CAR" });
  expect(() =>
    service.updateScenario(db, scenario.id, { startMonth: 24 }),
  ).toThrow(
    expect.objectContaining({ code: "validation", field: "startMonth" }),
  );
  expect(() =>
    service.createScenarioEvent(db, scenario.id, {
      ...eventInput,
      monthlyAmount: 0,
    }),
  ).toThrow(
    expect.objectContaining({ code: "validation", field: "monthlyAmount" }),
  );
  const event = service.createScenarioEvent(db, scenario.id, eventInput);
  expect(
    service.updateScenarioEvent(db, scenario.id, event.id, {
      description: "Updated",
    }).description,
  ).toBe("Updated");
  service.deleteScenarioEvent(db, scenario.id, event.id);
  expect(getScenarioById(db, scenario.id)?.events).toEqual([]);
  const category = getScenarioById(db, "b")!.nudges[0];
  const bucket = getScenarioById(db, "a")!.nudges.find(
    (nudge) => nudge.bucketId,
  )!;
  archiveCategory(category.categoryId!, db);
  db.prepare("UPDATE savings_buckets SET archived_at = 'now' WHERE id = ?").run(
    bucket.bucketId,
  );
  for (const nudge of [category, bucket]) {
    expect(() => service.upsertScenarioNudge(db, scenario.id, nudge)).toThrow(
      expect.objectContaining({ code: "archived" }),
    );
  }
});

it("rejects stale nudge writes to a merged category and preserves the re-pointed nudge", () => {
  const source = getScenarioById(db, "b")!.nudges[0];
  const target = getScenarioById(db, "a")!.nudges.find(
    (nudge) => nudge.deltaAmount === -450_000,
  )!;
  mergeCategory(source.categoryId!, target.categoryId!, db);
  const merged = getScenarioById(db, "b")!.nudges;
  expect(merged).toEqual([
    expect.objectContaining({
      ...source,
      categoryId: target.categoryId,
      updatedAt: expect.any(String),
    }),
  ]);
  expect(() =>
    service.upsertScenarioNudge(db, "b", { ...source, deltaAmount: 500 }),
  ).toThrow(expect.objectContaining({ code: "archived" }));
  expect(getScenarioById(db, "b")!.nudges).toEqual(merged);
});

it("allows edits to a duplicate with a maximum-length original name and label", () => {
  const original = service.createScenario(db, {
    ...scenarioInput,
    name: "A".repeat(50),
    shortLabel: "B".repeat(20),
  });
  const clone = service.duplicateScenario(db, original.id);
  expect(clone.name).toBe(original.name + " (Copy)");
  expect(clone.shortLabel).toBe(original.shortLabel + " (COPY)");
  expect(
    service.updateScenario(db, clone.id, { drawAmount: 100 }),
  ).toMatchObject({
    name: clone.name,
    shortLabel: clone.shortLabel,
    drawAmount: 100,
  });
  expect(
    service.updateScenario(db, clone.id, {
      shortLabel: clone.shortLabel,
      drawAmount: 200,
    }),
  ).toMatchObject({ shortLabel: clone.shortLabel, drawAmount: 200 });
  expect(() =>
    service.updateScenario(db, clone.id, { shortLabel: "C".repeat(21) }),
  ).toThrow(
    expect.objectContaining({ code: "validation", field: "shortLabel" }),
  );
});

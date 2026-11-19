import "server-only";

import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type {
  PaletteKey,
  Scenario,
  ScenarioEvent,
  ScenarioNudge,
} from "@/domain/forecaster";
import { timestamp } from "./timestamp";

export type StoredScenario = Scenario & {
  events: ScenarioEvent[];
  nudges: ScenarioNudge[];
};

export type ScenarioFields = Pick<
  Scenario,
  "name" | "shortLabel" | "startMonth" | "drawAmount"
> & {
  paletteKey: PaletteKey;
};

export type EventFields = Pick<
  ScenarioEvent,
  "name" | "type" | "monthlyAmount" | "description"
>;
export type NudgeFields = Pick<
  ScenarioNudge,
  "targetType" | "categoryId" | "bucketId" | "deltaAmount"
>;

const scenarioColumns = `id, name, short_label AS shortLabel, palette_key AS paletteKey,
  start_month AS startMonth, draw_amount AS drawAmount, is_baseline AS isBaseline,
  display_order AS displayOrder, created_at AS createdAt, updated_at AS updatedAt`;
const eventColumns = `id, scenario_id AS scenarioId, name, type, monthly_amount AS monthlyAmount,
  description, created_at AS createdAt, updated_at AS updatedAt`;
const nudgeColumns = `id, scenario_id AS scenarioId, target_type AS targetType,
  category_id AS categoryId, bucket_id AS bucketId, delta_amount AS deltaAmount, updated_at AS updatedAt`;

type ScenarioRow = Omit<Scenario, "isBaseline"> & { isBaseline: 0 | 1 };

function toScenario(row: ScenarioRow): Scenario {
  return { ...row, isBaseline: row.isBaseline === 1 };
}

export function listScenarios(db: Database.Database): StoredScenario[] {
  const rows = db
    .prepare(
      `SELECT ${scenarioColumns} FROM scenarios ORDER BY display_order, created_at, id`,
    )
    .all() as ScenarioRow[];
  const scenarios = rows.map((row): StoredScenario => ({
    ...toScenario(row),
    events: [],
    nudges: [],
  }));
  const byId = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  const events = db
    .prepare(
      `SELECT ${eventColumns} FROM scenario_events ORDER BY created_at, rowid`,
    )
    .all() as ScenarioEvent[];
  const nudges = db
    .prepare(`SELECT ${nudgeColumns} FROM scenario_nudges ORDER BY rowid`)
    .all() as ScenarioNudge[];
  for (const event of events) byId.get(event.scenarioId)?.events.push(event);
  for (const nudge of nudges) byId.get(nudge.scenarioId)?.nudges.push(nudge);
  return scenarios;
}

export function getScenarioById(
  db: Database.Database,
  id: string,
): StoredScenario | null {
  const row = db
    .prepare(`SELECT ${scenarioColumns} FROM scenarios WHERE id = ?`)
    .get(id) as ScenarioRow | undefined;
  if (!row) return null;
  return {
    ...toScenario(row),
    events: db
      .prepare(
        `SELECT ${eventColumns} FROM scenario_events WHERE scenario_id = ? ORDER BY created_at, rowid`,
      )
      .all(id) as ScenarioEvent[],
    nudges: db
      .prepare(
        `SELECT ${nudgeColumns} FROM scenario_nudges WHERE scenario_id = ? ORDER BY rowid`,
      )
      .all(id) as ScenarioNudge[],
  };
}

export function createScenario(
  db: Database.Database,
  input: ScenarioFields,
  id = randomUUID() as string,
  now = timestamp(),
): Scenario {
  const row = db
    .prepare(
      `INSERT INTO scenarios
    (id, name, short_label, palette_key, start_month, draw_amount, display_order, created_at, updated_at)
    VALUES (@id, @name, @shortLabel, @paletteKey, @startMonth, @drawAmount,
      (SELECT COALESCE(MAX(display_order), 0) + 1 FROM scenarios), @now, @now)
    RETURNING ${scenarioColumns}`,
    )
    .get({ ...input, id, now }) as ScenarioRow;
  return toScenario(row);
}

export function updateScenario(
  db: Database.Database,
  id: string,
  fields: ScenarioFields,
): Scenario {
  const row = db
    .prepare(
      `UPDATE scenarios SET name=@name, short_label=@shortLabel,
    palette_key=@paletteKey, start_month=@startMonth, draw_amount=@drawAmount, updated_at=@now
    WHERE id=@id RETURNING ${scenarioColumns}`,
    )
    .get({ ...fields, id, now: timestamp() }) as ScenarioRow;
  return toScenario(row);
}

export function deleteScenario(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM scenarios WHERE id = ?").run(id);
}

export function createScenarioEvent(
  db: Database.Database,
  input: EventFields & { scenarioId: string },
  id = randomUUID() as string,
  now = timestamp(),
): ScenarioEvent {
  return db
    .prepare(
      `INSERT INTO scenario_events
    (id, scenario_id, name, type, monthly_amount, description, created_at, updated_at)
    VALUES (@id, @scenarioId, @name, @type, @monthlyAmount, @description, @now, @now)
    RETURNING ${eventColumns}`,
    )
    .get({ ...input, id, now }) as ScenarioEvent;
}

export function updateScenarioEvent(
  db: Database.Database,
  id: string,
  fields: EventFields,
): ScenarioEvent {
  return db
    .prepare(
      `UPDATE scenario_events SET name=@name, type=@type,
    monthly_amount=@monthlyAmount, description=@description, updated_at=@now
    WHERE id=@id RETURNING ${eventColumns}`,
    )
    .get({ ...fields, id, now: timestamp() }) as ScenarioEvent;
}

export function deleteScenarioEvent(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM scenario_events WHERE id = ?").run(id);
}

export function upsertScenarioNudge(
  db: Database.Database,
  input: NudgeFields & { scenarioId: string },
  id = randomUUID() as string,
  now = timestamp(),
): ScenarioNudge {
  const column = input.targetType === "category" ? "category_id" : "bucket_id";
  return db
    .prepare(
      `INSERT INTO scenario_nudges
    (id, scenario_id, target_type, category_id, bucket_id, delta_amount, updated_at)
    VALUES (@id, @scenarioId, @targetType, @categoryId, @bucketId, @deltaAmount, @now)
    ON CONFLICT(scenario_id, ${column}) WHERE ${column} IS NOT NULL
    DO UPDATE SET delta_amount=excluded.delta_amount, updated_at=excluded.updated_at
    RETURNING ${nudgeColumns}`,
    )
    .get({ ...input, id, now }) as ScenarioNudge;
}

export function mergeCategoryNudges(
  db: Database.Database,
  sourceId: string,
  targetId: string,
  now: string,
): void {
  const sourceNudges = db
    .prepare(
      "SELECT id, scenario_id AS scenarioId, delta_amount AS deltaAmount FROM scenario_nudges WHERE category_id = ?",
    )
    .all(sourceId) as Pick<
    ScenarioNudge,
    "id" | "scenarioId" | "deltaAmount"
  >[];
  const combine = db.prepare(`UPDATE scenario_nudges
    SET delta_amount = delta_amount + @deltaAmount, updated_at = @now
    WHERE scenario_id = @scenarioId AND category_id = @targetId`);
  const remove = db.prepare("DELETE FROM scenario_nudges WHERE id = ?");
  const repoint = db.prepare(
    "UPDATE scenario_nudges SET category_id = ?, updated_at = ? WHERE id = ?",
  );
  for (const nudge of sourceNudges) {
    if (combine.run({ ...nudge, targetId, now }).changes === 1) {
      remove.run(nudge.id);
    } else {
      repoint.run(targetId, now, nudge.id);
    }
  }
}

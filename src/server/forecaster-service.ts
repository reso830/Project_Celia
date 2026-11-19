import "server-only";

import type Database from "better-sqlite3";
import { DomainError } from "@/domain/errors";
import { findCategory } from "./categories-store";
import * as store from "./forecaster-store";
import type {
  EventFields,
  NudgeFields,
  ScenarioFields,
} from "./forecaster-store";
import { findSavingsBucketById } from "./savings-store";

const paletteKeys = new Set(["teal", "purple", "gold", "blue", "slate"]);
const eventTypes = new Set(["financed purchase", "recurring", "seasonal"]);

type EventInput = Omit<EventFields, "description"> & {
  description?: string | null;
};

function validateText(value: string, maxLength: number, field: string): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed || trimmed.length > maxLength) {
    throw new DomainError(
      "validation",
      `Enter 1–${maxLength} characters.`,
      field,
    );
  }
  return trimmed;
}

function validateScenario(
  fields: ScenarioFields,
  unchanged?: Partial<Pick<ScenarioFields, "name" | "shortLabel">>,
): ScenarioFields {
  const name = unchanged?.name ?? validateText(fields.name, 50, "name");
  const shortLabel =
    unchanged?.shortLabel ?? validateText(fields.shortLabel, 20, "shortLabel");
  if (
    !Number.isInteger(fields.startMonth) ||
    fields.startMonth < 0 ||
    fields.startMonth > 23
  ) {
    throw new DomainError(
      "validation",
      "Choose a start month from 0 to 23.",
      "startMonth",
    );
  }
  if (!Number.isSafeInteger(fields.drawAmount) || fields.drawAmount < 0) {
    throw new DomainError(
      "validation",
      "Enter a non-negative amount in centavos.",
      "drawAmount",
    );
  }
  if (!paletteKeys.has(fields.paletteKey)) {
    throw new DomainError(
      "validation",
      "Choose a scenario palette.",
      "paletteKey",
    );
  }
  return { ...fields, name, shortLabel };
}

function validateEvent(fields: EventInput): EventFields {
  const name = validateText(fields.name, 50, "name");
  if (!eventTypes.has(fields.type)) {
    throw new DomainError(
      "validation",
      "Choose a scenario event type.",
      "type",
    );
  }
  if (
    !Number.isSafeInteger(fields.monthlyAmount) ||
    fields.monthlyAmount <= 0
  ) {
    throw new DomainError(
      "validation",
      "Enter a positive amount in centavos.",
      "monthlyAmount",
    );
  }
  const description = fields.description ?? null;
  if (
    description !== null &&
    (typeof description !== "string" || description.length > 200)
  ) {
    throw new DomainError(
      "validation",
      "Use up to 200 characters.",
      "description",
    );
  }
  return { ...fields, name, description };
}

function requireAlternative(
  db: Database.Database,
  id: string,
  baselineMessage: string,
) {
  const scenario = store.getScenarioById(db, id);
  if (!scenario) throw new DomainError("not_found", "Scenario not found.");
  if (scenario.isBaseline || scenario.paletteKey === null) {
    throw new DomainError("invalid_state", baselineMessage);
  }
  return { ...scenario, paletteKey: scenario.paletteKey };
}

function requireEvent(
  db: Database.Database,
  scenarioId: string,
  eventId: string,
) {
  const scenario = requireAlternative(
    db,
    scenarioId,
    "The baseline scenario cannot be modified.",
  );
  const event = scenario.events.find(({ id }) => id === eventId);
  if (!event) throw new DomainError("not_found", "Event not found.");
  return event;
}

export function createScenario(db: Database.Database, input: ScenarioFields) {
  return store.createScenario(db, validateScenario(input));
}

export function updateScenario(
  db: Database.Database,
  id: string,
  updates: Partial<ScenarioFields>,
) {
  const current = requireAlternative(
    db,
    id,
    "The baseline scenario cannot be modified.",
  );
  return store.updateScenario(
    db,
    id,
    validateScenario(
      { ...current, ...updates },
      {
        name: updates.name === undefined ? current.name : undefined,
        shortLabel:
          updates.shortLabel === undefined ||
          updates.shortLabel === current.shortLabel
            ? current.shortLabel
            : undefined,
      },
    ),
  );
}

export function deleteScenario(db: Database.Database, id: string): void {
  requireAlternative(db, id, "The baseline scenario cannot be deleted.");
  store.deleteScenario(db, id);
}

export function duplicateScenario(
  db: Database.Database,
  id: string,
): store.StoredScenario {
  return db
    .transaction(() => {
      const original = requireAlternative(
        db,
        id,
        "The baseline scenario cannot be duplicated.",
      );
      const copy = store.createScenario(db, {
        ...original,
        name: `${original.name} (Copy)`,
        shortLabel: `${original.shortLabel} (COPY)`,
      });
      return {
        ...copy,
        events: original.events.map((event) =>
          store.createScenarioEvent(db, { ...event, scenarioId: copy.id }),
        ),
        nudges: original.nudges.map((nudge) =>
          store.upsertScenarioNudge(db, { ...nudge, scenarioId: copy.id }),
        ),
      };
    })
    .immediate();
}

export function createScenarioEvent(
  db: Database.Database,
  scenarioId: string,
  input: EventInput,
) {
  requireAlternative(
    db,
    scenarioId,
    "Events cannot be added to the baseline scenario.",
  );
  return store.createScenarioEvent(db, { ...validateEvent(input), scenarioId });
}

export function updateScenarioEvent(
  db: Database.Database,
  scenarioId: string,
  eventId: string,
  updates: Partial<EventFields>,
) {
  const event = requireEvent(db, scenarioId, eventId);
  return store.updateScenarioEvent(
    db,
    eventId,
    validateEvent({ ...event, ...updates }),
  );
}

export function deleteScenarioEvent(
  db: Database.Database,
  scenarioId: string,
  eventId: string,
): void {
  requireEvent(db, scenarioId, eventId);
  store.deleteScenarioEvent(db, eventId);
}

export function upsertScenarioNudge(
  db: Database.Database,
  scenarioId: string,
  input: NudgeFields,
) {
  requireAlternative(
    db,
    scenarioId,
    "Budget nudges cannot be applied to the baseline scenario.",
  );
  if (!Number.isSafeInteger(input.deltaAmount)) {
    throw new DomainError(
      "validation",
      "Enter an integer centavo adjustment.",
      "deltaAmount",
    );
  }

  if (
    input.targetType === "category" &&
    input.categoryId &&
    input.bucketId === null
  ) {
    const category = findCategory(db, input.categoryId, {
      includeMerged: true,
    });
    if (
      category &&
      (category.archivedAt !== null || category.mergedIntoCategoryId !== null)
    ) {
      throw new DomainError(
        "archived",
        "Cannot nudge an archived category or bucket.",
      );
    }
    if (category?.umbrella !== "expense") {
      throw new DomainError(
        "validation",
        "Choose an expense category.",
        "categoryId",
      );
    }
  } else if (
    input.targetType === "bucket" &&
    input.bucketId &&
    input.categoryId === null
  ) {
    const bucket = findSavingsBucketById(db, input.bucketId);
    if (bucket?.archivedAt) {
      throw new DomainError(
        "archived",
        "Cannot nudge an archived category or bucket.",
      );
    }
    if (!bucket)
      throw new DomainError(
        "validation",
        "Choose a savings bucket.",
        "bucketId",
      );
  } else {
    throw new DomainError(
      "validation",
      "Choose one expense category or savings bucket.",
      "targetType",
    );
  }
  return store.upsertScenarioNudge(db, { ...input, scenarioId });
}

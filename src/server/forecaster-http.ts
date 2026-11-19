import "server-only";

import { DomainError } from "@/domain/errors";
import type { PaletteKey, ScenarioEventType } from "@/domain/forecaster";

type Guard<T> = (value: unknown) => value is T;
type Fields = Record<string, Guard<unknown>>;
type Body<T extends Fields> = {
  [K in keyof T]: T[K] extends Guard<infer Value> ? Value : never;
};

const string = (value: unknown): value is string => typeof value === "string";
const number = (value: unknown): value is number => typeof value === "number";
const nullableString = (value: unknown): value is string | null =>
  value === null || string(value);

function oneOf<T extends string>(...options: T[]): Guard<T> {
  const allowed = new Set<string>(options);
  return (value): value is T => string(value) && allowed.has(value);
}

export const scenarioFields = {
  name: string,
  shortLabel: string,
  startMonth: number,
  drawAmount: number,
  paletteKey: oneOf<PaletteKey>("teal", "purple", "gold", "blue", "slate"),
};
export const eventFields = {
  name: string,
  type: oneOf<ScenarioEventType>("financed purchase", "recurring", "seasonal"),
  monthlyAmount: number,
};
export const eventDescription = { description: nullableString };
export const nudgeFields = {
  targetType: oneOf("category", "bucket"),
  categoryId: nullableString,
  bucketId: nullableString,
  deltaAmount: number,
};

export async function readForecasterBody<
  Required extends Fields,
  Optional extends Fields,
>(
  request: Request,
  required: Required,
  optional: Optional,
): Promise<Body<Required> & Partial<Body<Optional>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new DomainError("validation", "Body must be valid JSON.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new DomainError("validation", "Body must be a JSON object.");
  }
  const record = body as Record<string, unknown>;
  const fields = new Map(Object.entries({ ...required, ...optional }));
  for (const [field, value] of Object.entries(record)) {
    const check = fields.get(field);
    if (!check)
      throw new DomainError(
        "validation",
        "Body contains an unknown field.",
        field,
      );
    if (!check(value))
      throw new DomainError("validation", "Invalid field value.", field);
  }
  for (const field of Object.keys(required)) {
    if (!Object.hasOwn(record, field)) {
      throw new DomainError(
        "validation",
        "A required field is missing.",
        field,
      );
    }
  }
  return record as Body<Required> & Partial<Body<Optional>>;
}

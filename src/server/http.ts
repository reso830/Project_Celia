import "server-only";

import { DomainError } from "@/domain/errors";

export type FieldSpec = {
  required?: readonly string[];
  optional?: readonly string[];
};

export type ReadBodyResult =
  { body: Record<string, string> } | { response: Response };

function validationResponse(message: string, field?: string) {
  return Response.json(
    { error: { code: "validation", message, ...(field ? { field } : {}) } },
    { status: 400 },
  );
}

export async function readBody(
  request: Request,
  fields: FieldSpec,
): Promise<ReadBodyResult> {
  const rawBody = await request.text();
  let body: unknown = {};

  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return { response: validationResponse("Body must be valid JSON.") };
    }
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { response: validationResponse("Body must be a JSON object.") };
  }

  const record = body as Record<string, unknown>;
  const required = fields.required ?? [];
  const optional = fields.optional ?? [];
  const allowed = new Set([...required, ...optional]);

  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      return {
        response: validationResponse("Body contains an unknown field.", key),
      };
    }
  }

  for (const field of required) {
    if (!(field in record) || typeof record[field] !== "string") {
      return {
        response: validationResponse(
          "A required string field is missing.",
          field,
        ),
      };
    }
  }

  for (const field of optional) {
    if (field in record && typeof record[field] !== "string") {
      return { response: validationResponse("Field must be a string.", field) };
    }
  }

  return { body: record as Record<string, string> };
}

export function errorResponse(error: unknown): Response {
  if (!(error instanceof DomainError)) {
    return Response.json(
      { error: { code: "internal", message: "An unexpected error occurred." } },
      { status: 500 },
    );
  }

  const statusByCode = {
    validation: 400,
    not_found: 404,
    duplicate_name: 409,
    archived: 409,
    umbrella_mismatch: 409,
    same_category: 409,
    invalid_state: 409,
    internal: 500,
  } as const;

  return Response.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.field ? { field: error.field } : {}),
      },
    },
    { status: statusByCode[error.code] },
  );
}

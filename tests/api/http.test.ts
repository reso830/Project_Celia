// @vitest-environment node

import { describe, expect, it } from "vitest";
import { DomainError, type DomainErrorCode } from "@/domain/errors";
import { errorResponse, readBody } from "@/server/http";

async function errorFrom(result: Awaited<ReturnType<typeof readBody>>) {
  if ("response" in result) {
    return result.response.json();
  }

  throw new Error("Expected a validation response");
}

describe("HTTP helpers", () => {
  it.each<[DomainErrorCode, number]>([
    ["validation", 400],
    ["not_found", 404],
    ["duplicate_name", 409],
    ["archived", 409],
    ["umbrella_mismatch", 409],
    ["same_category", 409],
    ["invalid_state", 409],
    ["internal", 500],
  ])("maps %s to %i", async (code, status) => {
    const response = errorResponse(
      new DomainError(code, "A safe message.", "name"),
    );

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({
      error: { code, message: "A safe message.", field: "name" },
    });
  });

  it("does not leak unexpected error messages", async () => {
    const response = errorResponse(new Error("database password"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "internal", message: "An unexpected error occurred." },
    });
  });

  it.each([
    ["malformed JSON", "{"],
    ["array", "[]"],
    ["string", '"x"'],
    ["number", "1"],
    ["null", "null"],
    ["unknown key", '{"other":"x"}'],
  ])("rejects a %s body", async (_, body) => {
    const result = await readBody(
      new Request("http://celia.test", { method: "POST", body }),
      {
        required: ["name"],
      },
    );

    const payload = await errorFrom(result);
    expect(payload.error.code).toBe("validation");
  });

  it.each([
    ["missing", "{}"],
    ["null", '{"name":null}'],
    ["number", '{"name":123}'],
    ["boolean", '{"name":true}'],
    ["array", '{"name":[]}'],
    ["object", '{"name":{}}'],
  ])("rejects a %s required string field", async (_, body) => {
    const result = await readBody(
      new Request("http://celia.test", { method: "POST", body }),
      {
        required: ["name"],
      },
    );

    expect(await errorFrom(result)).toMatchObject({
      error: { code: "validation", field: "name" },
    });
  });

  it.each([
    '{"name":"Ana","color":123}',
    '{"name":"Ana","color":true}',
    '{"name":"Ana","color":[]}',
    '{"name":"Ana","color":{}}',
    '{"name":"Ana","color":null}',
  ])("rejects a non-string optional field", async (body) => {
    const result = await readBody(
      new Request("http://celia.test", { method: "POST", body }),
      { required: ["name"], optional: ["color"] },
    );

    expect(await errorFrom(result)).toMatchObject({
      error: { code: "validation", field: "color" },
    });
  });

  it("accepts empty no-body requests and rejects fields", async () => {
    expect(
      await readBody(new Request("http://celia.test", { method: "POST" }), {}),
    ).toEqual({ body: {} });
    expect(
      await readBody(
        new Request("http://celia.test", { method: "POST", body: "{}" }),
        {},
      ),
    ).toEqual({ body: {} });

    const result = await readBody(
      new Request("http://celia.test", {
        method: "POST",
        body: '{"name":"Ana"}',
      }),
      {},
    );
    expect(await errorFrom(result)).toMatchObject({
      error: { code: "validation", field: "name" },
    });
  });
});

// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PATCH } from "@/app/api/members/[id]/route";
import { POST as archive } from "@/app/api/members/[id]/archive/route";
import { POST as restore } from "@/app/api/members/[id]/restore/route";
import { POST as create } from "@/app/api/members/route";

let directory = "";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function request(body?: string) {
  return new Request("http://celia.test/api/members", {
    method: "POST",
    ...(body === undefined ? {} : { body }),
  });
}

function resetDatabase() {
  const globalState = globalThis as typeof globalThis & {
    __celiaDatabase?: Database.Database;
  };

  globalState.__celiaDatabase?.close();
  delete globalState.__celiaDatabase;
}

beforeEach(() => {
  resetDatabase();
  directory = mkdtempSync(path.join(tmpdir(), "celia-member-routes-"));
  process.env.CELIA_DB_PATH = path.join(directory, "celia.db");
});

afterEach(() => {
  resetDatabase();
  rmSync(directory, { recursive: true, force: true });
  delete process.env.CELIA_DB_PATH;
});

describe("member routes", () => {
  it("creates, renames, archives, and restores a member", async () => {
    const created = await create(request('{"name":"Ana"}'));
    const { member } = (await created.json()) as { member: { id: string } };

    const renamed = await PATCH(
      new Request("http://celia.test", {
        method: "PATCH",
        body: '{"name":"Ana Maria"}',
      }),
      context(member.id),
    );
    const archived = await archive(request(), context(member.id));
    const restored = await restore(request(), context(member.id));

    expect(created.status).toBe(201);
    expect(renamed.status).toBe(200);
    expect(archived.status).toBe(200);
    expect(restored.status).toBe(200);
    expect(await restored.json()).toMatchObject({
      member: { id: member.id, name: "Ana Maria", archivedAt: null },
    });
  });

  it("returns each member-route domain error", async () => {
    const first = await create(request('{"name":"Ana"}'));
    const { member } = (await first.json()) as { member: { id: string } };

    const duplicate = await create(request('{"name":"ana"}'));
    const missing = await PATCH(
      new Request("http://celia.test", {
        method: "PATCH",
        body: '{"name":"Missing"}',
      }),
      context("missing"),
    );
    await archive(request(), context(member.id));
    const archived = await PATCH(
      new Request("http://celia.test", {
        method: "PATCH",
        body: '{"name":"Ana"}',
      }),
      context(member.id),
    );
    const archiveAgain = await archive(request(), context(member.id));
    await restore(request(), context(member.id));
    const restoreAgain = await restore(request(), context(member.id));

    await expect(duplicate.json()).resolves.toMatchObject({
      error: { code: "duplicate_name" },
    });
    await expect(missing.json()).resolves.toMatchObject({
      error: { code: "not_found" },
    });
    await expect(archived.json()).resolves.toMatchObject({
      error: { code: "archived" },
    });
    await expect(archiveAgain.json()).resolves.toMatchObject({
      error: { code: "invalid_state" },
    });
    await expect(restoreAgain.json()).resolves.toMatchObject({
      error: { code: "invalid_state" },
    });
  });

  it.each(["{}", '{"name":null}', '{"name":123}'])(
    "rejects invalid create bodies without persisting data",
    async (body) => {
      const response = await create(request(body));
      const retry = await create(request('{"name":"Ana"}'));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "validation", field: "name" },
      });
      expect(retry.status).toBe(201);
    },
  );

  it.each(["{}", '{"name":null}', '{"name":123}'])(
    "rejects invalid rename bodies without changing the member",
    async (body) => {
      const created = await create(request('{"name":"Ana"}'));
      const { member } = (await created.json()) as { member: { id: string } };
      const response = await PATCH(
        new Request("http://celia.test", { method: "PATCH", body }),
        context(member.id),
      );
      const archiveResponse = await archive(request(), context(member.id));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "validation", field: "name" },
      });
      await expect(archiveResponse.json()).resolves.toMatchObject({
        member: { name: "Ana" },
      });
    },
  );

  it("rejects bodies on archive and restore", async () => {
    const created = await create(request('{"name":"Ana"}'));
    const { member } = (await created.json()) as { member: { id: string } };

    const archiveWithBody = await archive(
      request('{"name":"ignored"}'),
      context(member.id),
    );
    await archive(request(), context(member.id));
    const restoreWithBody = await restore(
      request('{"name":"ignored"}'),
      context(member.id),
    );

    expect(archiveWithBody.status).toBe(400);
    expect(restoreWithBody.status).toBe(400);
  });
});

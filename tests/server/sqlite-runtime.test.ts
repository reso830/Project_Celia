// @vitest-environment node

import Database from "better-sqlite3";
import { afterEach, expect, it } from "vitest";

const databases: Database.Database[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.close();
  }
});

it("loads the native SQLite runtime in memory", () => {
  const database = new Database(":memory:");
  databases.push(database);

  const version = database
    .prepare("select sqlite_version() as version")
    .get() as {
    version: string;
  };

  expect(version.version).toMatch(/^\d+\.\d+\.\d+$/);
});

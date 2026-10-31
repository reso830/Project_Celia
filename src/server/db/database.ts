import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { runMigrations } from "./migrations";

type DatabaseGlobal = typeof globalThis & {
  __celiaDatabase?: Database.Database;
};

const databaseGlobal = globalThis as DatabaseGlobal;

export function openDatabase(databasePath: string): Database.Database {
  if (databasePath !== ":memory:") {
    mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true });
  }

  const connection = new Database(databasePath);
  connection.pragma("foreign_keys = ON");

  if (databasePath !== ":memory:") {
    connection.pragma("journal_mode = WAL");
  }

  runMigrations(connection);
  return connection;
}

export function getDatabase(): Database.Database {
  if (!databaseGlobal.__celiaDatabase) {
    databaseGlobal.__celiaDatabase = openDatabase(
      process.env.CELIA_DB_PATH ?? "./data/celia.db",
    );
  }

  return databaseGlobal.__celiaDatabase;
}

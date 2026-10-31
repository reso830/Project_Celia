import type Database from "better-sqlite3";

export type Migration = {
  version: number;
  migrate: (database: Database.Database) => void;
};

const migrationOne: Migration = {
  version: 1,
  migrate(database) {
    const createdAt = new Date().toISOString();

    database.exec(`
      CREATE TABLE household (
        id TEXT PRIMARY KEY CHECK (id = 'household'),
        currency TEXT NOT NULL CHECK (currency = 'PHP'),
        created_at TEXT NOT NULL
      );

      CREATE TABLE umbrellas (
        id TEXT PRIMARY KEY CHECK (id IN ('income', 'expense', 'savings')),
        sort_order INTEGER NOT NULL
      );

      CREATE TABLE members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL CHECK (length(name) > 0),
        name_key TEXT NOT NULL,
        archived_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (name_key)
      );

      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        umbrella_id TEXT NOT NULL REFERENCES umbrellas(id),
        name TEXT NOT NULL CHECK (length(name) > 0),
        name_key TEXT NOT NULL,
        color TEXT NOT NULL CHECK (color GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'),
        archived_at TEXT,
        merged_into_category_id TEXT REFERENCES categories(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (umbrella_id IN ('income', 'expense'))
      );

      CREATE UNIQUE INDEX categories_umbrella_name_key_active_unique
        ON categories (umbrella_id, name_key)
        WHERE merged_into_category_id IS NULL;

      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL REFERENCES categories(id),
        name TEXT NOT NULL CHECK (length(name) > 0),
        name_key TEXT NOT NULL,
        merged_into_item_id TEXT REFERENCES items(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE UNIQUE INDEX items_category_name_key_active_unique
        ON items (category_id, name_key)
        WHERE merged_into_item_id IS NULL;

      CREATE INDEX items_category_id_index ON items (category_id);
    `);

    database
      .prepare(
        "INSERT INTO household (id, currency, created_at) VALUES (?, ?, ?)",
      )
      .run("household", "PHP", createdAt);
    database
      .prepare("INSERT INTO umbrellas (id, sort_order) VALUES (?, ?)")
      .run("income", 1);
    database
      .prepare("INSERT INTO umbrellas (id, sort_order) VALUES (?, ?)")
      .run("expense", 2);
    database
      .prepare("INSERT INTO umbrellas (id, sort_order) VALUES (?, ?)")
      .run("savings", 3);
  },
};

export const migrations: readonly Migration[] = [migrationOne];

export function runMigrations(database: Database.Database) {
  let version = database.pragma("user_version", { simple: true }) as number;

  for (const migration of migrations) {
    if (migration.version <= version) {
      continue;
    }

    database.transaction(() => {
      migration.migrate(database);
      database.pragma(`user_version = ${migration.version}`);
    })();
    version = migration.version;
  }
}

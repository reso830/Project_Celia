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

const migrationTwo: Migration = {
  version: 2,
  migrate(database) {
    database.exec(
      `CREATE TABLE entries (id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES items(id), owner_member_id TEXT REFERENCES members(id), amount INTEGER NOT NULL CHECK (amount > 0), date TEXT NOT NULL CHECK (length(date) = 10 AND date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'), note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE INDEX entries_date_idx ON entries (date); CREATE INDEX entries_item_id_idx ON entries (item_id); CREATE INDEX entries_owner_member_id_idx ON entries (owner_member_id);`,
    );
  },
};

const migrationThree: Migration = {
  version: 3,
  migrate(database) {
    database.exec(`-- Migration 3: F03 Budget & Savings
CREATE TABLE savings_buckets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) > 0),
  name_key TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('cash_buffer', 'emergency_fund', 'goal', 'sinking_fund')),
  opening_balance INTEGER NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
  target_amount INTEGER CHECK (target_amount IS NULL OR target_amount > 0),
  target_month TEXT CHECK (
    target_month IS NULL OR (
      length(target_month) = 7 AND
      target_month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'
    )
  ),
  description TEXT,
  counts_toward_buffer INTEGER NOT NULL CHECK (counts_toward_buffer IN (0, 1)),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (is_default = 0 OR (type = 'cash_buffer' AND counts_toward_buffer = 1 AND archived_at IS NULL))
);

CREATE UNIQUE INDEX savings_buckets_default_unique
  ON savings_buckets (is_default)
  WHERE is_default = 1;

CREATE TABLE savings_activities (
  id TEXT PRIMARY KEY,
  bucket_id TEXT NOT NULL REFERENCES savings_buckets(id),
  kind TEXT NOT NULL CHECK (kind IN ('contribution', 'withdrawal')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  date TEXT NOT NULL CHECK (
    length(date) = 10 AND
    date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  ),
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX savings_activities_bucket_date_idx
  ON savings_activities (bucket_id, date DESC, created_at DESC, id ASC);

CREATE INDEX savings_activities_date_idx
  ON savings_activities (date);

CREATE TABLE budget_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) > 0),
  name_key TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE budget_model_allocations (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL REFERENCES budget_models(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('category', 'bucket')),
  category_id TEXT REFERENCES categories(id),
  bucket_id TEXT REFERENCES savings_buckets(id),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  updated_at TEXT NOT NULL,
  CHECK (
    (target_type = 'category' AND category_id IS NOT NULL AND bucket_id IS NULL) OR
    (target_type = 'bucket' AND bucket_id IS NOT NULL AND category_id IS NULL)
  )
);

CREATE UNIQUE INDEX budget_model_allocations_category_unique
  ON budget_model_allocations (model_id, category_id)
  WHERE category_id IS NOT NULL;

CREATE UNIQUE INDEX budget_model_allocations_bucket_unique
  ON budget_model_allocations (model_id, bucket_id)
  WHERE bucket_id IS NOT NULL;

CREATE TABLE monthly_budget_plans (
  id TEXT PRIMARY KEY,
  month_key TEXT NOT NULL UNIQUE CHECK (
    length(month_key) = 7 AND
    month_key GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'
  ),
  source_model_id TEXT REFERENCES budget_models(id) ON DELETE SET NULL,
  model_name TEXT NOT NULL CHECK (length(model_name) > 0),
  is_revised INTEGER NOT NULL DEFAULT 0 CHECK (is_revised IN (0, 1)),
  applied_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE monthly_budget_allocations (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES monthly_budget_plans(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('category', 'bucket')),
  category_id TEXT REFERENCES categories(id),
  bucket_id TEXT REFERENCES savings_buckets(id),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  updated_at TEXT NOT NULL,
  CHECK (
    (target_type = 'category' AND category_id IS NOT NULL AND bucket_id IS NULL) OR
    (target_type = 'bucket' AND bucket_id IS NOT NULL AND category_id IS NULL)
  )
);

CREATE UNIQUE INDEX monthly_budget_allocations_category_unique
  ON monthly_budget_allocations (plan_id, category_id)
  WHERE category_id IS NOT NULL;

CREATE UNIQUE INDEX monthly_budget_allocations_bucket_unique
  ON monthly_budget_allocations (plan_id, bucket_id)
  WHERE bucket_id IS NOT NULL;
`);
  },
};

export const migrations: readonly Migration[] = [
  migrationOne,
  migrationTwo,
  migrationThree,
];

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

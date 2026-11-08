# Changelog

## 3.2.0 — 2026-11-08

### Added

- A Savings Buckets workspace at `/savings` with opening balances, optional targets and due months, buffer inclusion, and a protected default Cash Buffer.
- Explicit savings contributions and withdrawals with editable activity history, archive/restore, future-date checks, and protection against negative lifetime balances. Savings activity remains separate from income and expense entries.
- Savings KPIs for lifetime balances, buffer and runway, plus selected-month gross funding and per-bucket shortfalls.
- A Budget Models workspace at `/models` for reusable templates, create/edit/duplicate/delete, inline allocations, income allocation and expense charts, and favourable-positive Budget-vs-Actual comparisons.
- Independent monthly applied snapshots, overwrite confirmations, protected past-month revisions, and historical archived/merged-category comparisons that preserve raw allocations.
- SQLite Migration 3 adds the six savings and budget tables while preserving F01/F02 records.
- Extended `npm run seed` populates four buckets, 36 savings contributions, three reusable models, and 12 applied plans alongside entries across 12 rolling calendar months. Guarded `npm run clear` reports and clears all ten user tables.

## 3.1.0 — 2026-11-07

### Added

- Income and expense entries with Add/Edit modal, custom pickers, keyboard navigation, and delete confirmation.
- A monthly Entries list with type, category and owner filters, search, and date and amount sorting.
- Reusable exact centavo calculations, deterministic sorting, and income, expense and net summaries, including member and shared splits.
- SQLite migration 2 adds entries and indexes while preserving existing data.
- Real entry counts in Move and Merge dialogs, with atomic re-pointing when items are combined.
- `npm run seed` for twelve months of demo data and guarded `npm run clear` tooling.

## 3.0.0 — 2026-10-30

### Added

- The Celia v3 application shell and navigation rail.
- Household member management: add, rename, archive, and restore.
- Categories and items: create, rename, colour, move, merge, archive, and restore.
- Local SQLite persistence with versioned migrations.

### Breaking

- Removed the v2 application and its IndexedDB storage. Existing v2 data is not migrated.

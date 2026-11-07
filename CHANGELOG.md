# Changelog

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

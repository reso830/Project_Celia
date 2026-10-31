# Changelog

## 3.0.0 — 2026-10-30

### Added

- The Celia v3 application shell and navigation rail.
- Household member management: add, rename, archive, and restore.
- Categories and items: create, rename, colour, move, merge, archive, and restore.
- Local SQLite persistence with versioned migrations.

### Breaking

- Removed the v2 application and its IndexedDB storage. Existing v2 data is not migrated.

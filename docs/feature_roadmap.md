# Feature roadmap

| Feature | Status | Brief |
| --- | --- | --- |
| F01 — Core Tracking | ✓ Complete | [Brief](features/v3-001-core-tracking.md) |
| F02 — Entries | ✓ Complete | [Brief](features/v3-002-entries.md) |
| F03 — Budget & Savings | ✓ Complete | [Brief](features/v3-003-budget-and-savings.md) |
| Dashboard (number TBD) | Planned | Brief pending |
| Forecaster (number TBD) | Planned | Brief pending |

Future feature briefs are added under `docs/features/` when their scope is specified.

## F04 planning follow-up

Define the effect of moving an item between categories on historical Budget-vs-Actual.
F01 moves reclassify the item's existing entries, so past actuals follow its current
category while monthly planned allocations remain unchanged. F04 planning should decide
whether to preserve that behavior or introduce historical classification; no behavior
change is included in F03.

# Deviation Ledger: F01 — Core Tracking

Accepted differences from the hi-fi (`reference/Money Tracker Hi-Fi.dc.html` in
`handoff/celia_v3_001.zip`). Each entry was accepted by the user during the Phase 08 visual
review (T090). Anything not listed here should match the hi-fi.

| ID | Area | Hi-fi | Celia | Reason | Accepted |
| --- | --- | --- | --- | --- | --- |
| D1 | Idle rail icons (`src/components/shell/app-rail.tsx`) | `#6f7679` (HF L840) | `#5c6467` (`--color-muted`) | The icons are Unicode text glyphs. `#6f7679` on the rail background `#dcdfdf` is 3.45:1, below the plan's 4.5:1 text-contrast rule. `#5c6467` is 4.51:1. | 2026-10-30, T100 |

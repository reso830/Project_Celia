# Deviation Ledger: F03 — Budget & Savings

Implemented differences from the hi-fi (`reference/Money Tracker Hi-Fi.dc.html` in `handoff/celia_v3_001.zip`) or wireframes. Each entry is subject to acceptance during the Phase 08 (`T071`) visual review. This ledger records implementation differences; final visual fidelity and acceptance remain Phase 08/T071.

| ID | Area | Hi-fi | Celia | Reason | Accepted |
|---|---|---|---|---|---|
| **D1** | `/savings` header (`src/components/savings/savings-header.tsx`) | Header includes a month picker and the global `"+ Add entry"` CTA (`HF#L23-L48`). | Header retains the `MonthPicker` and replaces the global entry CTA with `+ New bucket`. | Spec Clarification #4 and US1 AC1 require month selection for `RUNWAY` / `FUNDED <MON>` and bucket creation from `/savings`. | Accepted (user, 2026-11-09) |
| **D2** | Savings bucket balance calculation (`src/domain/savings-calculations.ts`) | Default `"Cash buffer"` bucket automatically sweeps cumulative monthly unallocated income, and non-default buckets scale by `funded * (mi + 1)` (`HF#L821–L826`). | Bucket balance is a **lifetime current total** (`openingBalance + sum(all contributions) − sum(all withdrawals)`). No automatic unallocated sweep and no month-index balance scaling. | Spec Clarification #2, user decision C4, and Feature Brief §3.1–3.2 require balances to derive strictly from recorded savings activity across all dates. | Accepted (user, 2026-11-09) |
| **D3** | Bucket card actions & modals (`src/components/savings/bucket-card.tsx`, modals, `archived-buckets.tsx`) | Bucket cards are static except for the `buffer` toggle (`HF#L296–L312`). | Cards include `Contribute`, `Withdraw`, `History`, `Edit`, and `Archive` actions, backed by Create/Edit Bucket, Activity, and History modals, plus a collapsible `Archived` section. | Spec Clarifications #4–#5 and US1–US3 require full bucket CRUD, contribution/withdrawal recording, history inspection/editing, and archival. | Accepted (user, 2026-11-09) |
| **D4** | Bucket progress & `FUNDED <MON>` KPI text (`src/components/savings/bucket-card.tsx`, `savings-kpi-row.tsx`) | Targeted bucket shows `"₱balance of ₱target"` on left and `toFixed(0) + "%"` on right (`HF#L306, L1061–L1062`); `FUNDED <MON>` KPI nets across buckets and always shows `"on plan"` when `savingsPlan === 0` (`HF#L1076–L1078`). | Targeted bucket shows `"₱balance of ₱target · ₱remaining left"` and integer floor `Math.floor` `%` (`100%` only when target reached); `FUNDED <MON>` sums per-bucket shortfalls and shows `"no plan for <Mon>"` / `"no savings planned"` in muted text when no savings plan applies. | Spec US1 AC2/AC5, Feature Brief §3.3, and user decision C3 / review C13. | Accepted (user, 2026-11-09) |
| **D5** | `/models` header, left-rail Month's Plan card, & `Make active` / `Re-apply` controls (`src/components/models/models-header.tsx`, `model-list.tsx`, `models-screen.tsx`) | The global header has a month picker and `+ Add entry`; `/models` lists only reusable models in the left rail and treats `active` as a single global boolean (`HF#L317–L334, L640`). | `/models` header includes `MonthPicker` and `+ New model`; left rail adds a selectable **Month's Plan card** at the top above the reusable model cards; right detail pane supports Month's Plan mode (with disabled `"Active"` when unchanged, `"Re-apply template"` when revised/diverged, and `"Unlock to revise past plan"` for past months) and Reusable Model mode (with `Edit`, `Duplicate`, `Make active` / `Re-apply` / `Active`, and `Delete`). | Spec Clarification #6, Brief §3.6, US5 AC1–AC6, and user decisions C2a, C2b, C10. | Accepted (user, 2026-11-09) |
| **D6** | `/models` table columns, all active rows, & `ACTUAL` utilization subtitles (`src/components/models/models-table.tsx`) | Third column is `"3-MO ACTUAL"` using a 3-month rolling average without subtitles; Savings group hides zero-allocation buckets (`HF#L375, L1115–L1123`). | Third column is `"ACTUAL"` showing the selected month's actuals with utilization/remaining subtitles (`"N% used · ₱X remaining"`, `"N% used · ₱X overspent"`, `"₱X short"`), and all active categories and active savings buckets are listed so any `₱0` line can be edited. Zero planned/actual expense utilization is `"—"` only; hidden archived/merged actuals remain in totals with an explanatory tooltip. | Spec US4 AC5, US6 AC1–AC4, and Brief §3.7. | Accepted (user, 2026-11-09) |
| **D7** | Historical `(archived)` / `(merged → Target)` badges & folded comparison (`src/components/models/models-table.tsx`, `src/components/savings/archived-buckets.tsx`) | Prototype has no archived or merged categories or buckets. | Historical monthly plans and reusable models with non-zero archived lines display `(archived)` badges; merged categories in historical monthly plans fold their planned amount into their merge target `T` for accurate B-vs-A (with `T`'s `BUDGET / MO` input editing `T`'s own stored amount and showing a `"₱X effective (+₱Y from Source)"` subtitle) while displaying `"<Source> (merged → <Target>)"` as a read-only reference row. | Constitution Principle V (Historical Integrity), Spec US3 AC5 / US7 AC1–AC4, and review C1 / N1. | Accepted (user, 2026-11-09) |
| **D8** | Confirmation dialogs (`src/components/ui/confirm-dialog.tsx`) | Prototype has no confirmation dialogs for model delete, bucket archive, activity delete, plan overwrite, or past-month plan revision. | Deleting a budget model, deleting a savings activity, archiving a bucket, overwriting an existing monthly plan (`Make active` / `Re-apply`), or unlocking a past month's plan for revision opens a confirmation dialog. | Spec Scope, US2 AC5, US3 AC1, US4 AC3, US5 AC3/AC5, and user decision C10. | Accepted (user, 2026-11-09) |
| **D9** | `/models` `Unallocated` footer `ACTUAL`, `Δ`, & status badges (`src/components/models/models-table.tsx`) | Footer row shows only planned `modelUnalloc` in the second column, leaving the 3rd and 4th columns empty (`HF#L391`). | Footer row displays `"Fully allocated"` / `"Overallocated"` / `"Available to allocate"` (positive surplus) status pill in column 1, signed planned unallocated in column 2, signed `ACTUAL` unallocated (`actualIncome − actualExpenses − actualSavings`) in column 3, and favourable-positive `Δ` (`actualUnallocated − plannedUnallocated`) in column 4. | Spec Scope (`spec.md:58`), US6 AC5, Brief §3.5, and review C11. | Accepted (user, 2026-11-09) |
| **D10** | `"Where the income goes"` overallocated / fully allocated header badge (`src/components/models/income-allocation-bar.tsx`) | Header shows only `"Where the income goes"` and `"₱X planned income"` (`HF#L337–L340`). | Header appends `"· Fully allocated"` when `Unallocated === 0 && Expected Income > 0`, and renders an `"Overallocated by ₱X"` pill badge in status red (`#b0533c` on `#fdf6f3`) when `Unallocated < 0`. | Feature Brief §3.5 and Spec US4 AC7 require clearly identifying overallocated and fully allocated models. | Accepted (user, 2026-11-09) |
| **D11** | Budget Model Create / Edit / Duplicate modal & metadata header (`src/components/models/model-modal.tsx`, `models-screen.tsx`) | Prototype has no modal for `+ New model` or `Duplicate` and does not display or edit a model's description (`HF#L327, L332–L334`). | Clicking `+ New model`, `Edit` (in the detail header), or `Duplicate` opens `ModelModal` for editing the model's `NAME` and optional `DESCRIPTION`, and the detail header displays the model's optional description below its title. | Feature Brief §3.4 and Spec US4 AC2–AC3, AC9 require creating, duplicating, and editing reusable model name and description. | Accepted (user, 2026-11-09) |

## Phase 04 accessibility note — 2026-11-08

Savings shortfall text uses the shared `--savings-warning-ink` token (`#8a6516`) instead of the prototype's `#b9822c` at small text sizes, to satisfy Constitution III/XIII and the required 4.5:1 text contrast (approximately 5.3:1 on white). Amber progress bars retain the supplied prototype color. This is a contrast correction only; funding calculations and amber status semantics are unchanged. Phase 04 screenshots at 1100, 1280 and 1440px were reviewed against the prototype; the final whole-feature acceptance remains Phase 08/T071.


## Phase 05 accessibility note - 2026-11-09

The Expenses percentage label on the allocation bar uses #14181a instead of white on the prototype's #8c8378 segment (approximately 4.8:1 versus 3.7:1). Savings retains white on teal; Unallocated uses the specified #3c4346. Savings shortfall text in the Models table reuses the Phase 04 #8a6516 contrast correction. These text-only contrast corrections remain subject to Phase 08/T071 acceptance.


## Phase 07 implementation sync - 2026-11-09

Reviewed D1-D11 against the implemented headers, bucket/KPI calculations, forms/history,
two-mode Models workspace, charts, allocation table, merge folding and confirmations.
The table now marks implementation separately from acceptance. The Phase 04/05 contrast
corrections remain documented above and await T071; this sync does not grant visual acceptance.


## Phase 08 visual review (T071) - 2026-11-09

Captured `/savings` and `/models` (seeded data) beside the hi-fi at 1100, 1280 and 1440px, plus the bucket, activity (with calendar), history and model modals at 1280px. No horizontal scroll at any width. Layout, card and table structure, type scale, figure font, status colours, charts and badges match the hi-fi except as listed in D1-D11 and below. Status: **reviewed, pending user acceptance**; no entry is marked accepted.

Findings not covered by D1-D11:

- V1. The D1 hi-fi column is inaccurate: the hi-fi `/savings` header already shows a month picker and a global `+ Add entry` CTA. The actual deviation is replacing `+ Add entry` with `+ New bucket` (and `+ New model` on `/models`).
- V2. The `/models` `+ New model` header CTA renders at 16px/400 with larger padding; `/savings` `+ New bucket` and the hi-fi CTA are 13.5px/500.
- V3. The model modal's DESCRIPTION textarea renders 42px tall (the control-height class overrides `--models-description-height: 96px`), so it shows as a cramped single line with scroll arrows.
- V4. `/models` table cells show `₱`-prefixed figures and a zero delta as `+₱0`; the hi-fi uses bare figures and `±0`.
- V5. Seeded buckets share one `created_at`, so `/savings` cards and `/models` Savings rows follow hash-derived IDs (Car, Cash, Insurance, Emergency) rather than the hi-fi order (Cash, Emergency, Car, Insurance).
- V6. `/models` category rows and Budget-vs-actual bars are alphabetical (F01 category ordering) rather than the hi-fi's seed order.
- V7. The footer's `Available to allocate` pill (positive unallocated) is not described in D9, which lists only `Fully allocated` / `Overallocated`.
- V8. At 1100px the `/savings` card footer and the `COUNTED` badge wrap to a second line without overflow.


## Phase 08 findings follow-up - 2026-11-09

- V1 and V7: corrected D1/D5 header descriptions and added the positive-surplus footer pill to D9.
- V2: Models header CTA now uses the same 13.5px/500 typography and padding as the Savings CTA.
- V3: the Models description textarea has only its 96px height utility; the shared 42px input height is removed from that control.
- V5: new demo seeds use deterministically increasing bucket timestamps so the fixture order is Cash buffer, Emergency fund, Car down payment, Insurance. Existing databases are not reordered.
- T070 contrast correction: positive Models group-header deltas use `--models-positive-ink` (#3d7b5a), approximately 4.60:1 on #f4f5f5; body-row green remains unchanged.

Remaining visual differences, pending user acceptance:

- V4: Models table monetary figures retain the shared PHP formatter, including the peso prefix and signed zero (`+₱0`), rather than the prototype's bare figures and `±0`. This keeps explicit currency and the spec's signed planned/actual/delta footer notation consistent across the application.
- V6: categories and chart bars follow F01's alphabetical ordering. The prototype's fixed demo sequence is not a persisted category-order contract; no new category-order model or special demo-only ordering is introduced.
- V8: Savings actions and COUNTED badges may wrap at 1100px to keep every label and action available without clipping or horizontal overflow. This responsive behavior remains subject to T071 acceptance.

The original findings above are retained as review history. This follow-up does not accept deviations on the user's behalf.


## Phase 08 user decisions - 2026-11-09

- V6: **Accepted** by the user as-is. Categories and chart bars keep F01's alphabetical order for F03; no user-defined category ordering is introduced.
- V8: **Resolved** per user decision. `--savings-bucket-columns` now uses `minmax(360px, 1fr)` instead of the prototype's 300px minimum, because F03 cards carry action buttons and the funded line that need about 360px. Bucket cards now show 2 per row at 1100px and 3 per row from about 1245px through 1600px (the prototype shows 4 per row at 1440px). Browser checks at 1100, 1245, 1280, 1440 and 1600px found no in-card wrapping and no horizontal scroll.
- Still pending user acceptance: V4 (peso prefix and `+₱0` in the Models table) and the Phase 04/05 contrast corrections. D1-D11 trace to the approved spec; how to record their acceptance is pending user confirmation.


## Phase 08 final acceptance (T071) - 2026-11-09

The user accepted all remaining items: D1-D11 (traceable to the approved spec), V4 (peso prefix and signed `+₱0` in the Models table), and the Phase 04/05 contrast corrections (`#8a6516` savings shortfall text; ink Expenses percentage label). With V6 accepted and V8 resolved earlier, the F03 visual review is complete.

# Bucket Subcategory Management Design

## Goal

Allow users to add and delete subcategories within a persisted bucket group, while keeping a bucket group available after its final subcategory is removed.

## Data model and persistence

Introduce a `BucketGroup` entity and IndexedDB store. A group has an opaque `id`, a `type` (`income` or `expense`), and a trimmed display `name`. Its normalized `(type, name)` pair is unique.

Existing `Category` records retain their current `type`, `group`, and `name` fields. Since bucket-group rename is out of scope, the category group name cannot drift from its corresponding group record. This avoids a broad category migration while making an empty group representable.

At provider initialization, legacy category-derived groups that have no matching `BucketGroup` are created and persisted before ready state is published. This preserves already persisted buckets. The provider loads bucket groups with the other collections and exposes save/delete-category actions that update both IndexedDB and in-memory state only after the repository operation succeeds.

## Settings behavior

The existing Add bucket form creates a `BucketGroup` and its required first `Category`. Its duplicate check uses the normalized group name plus category type.

Each bucket card in Settings has an `Add subcategory` control and a Delete action beside each listed subcategory. Adding trims input, requires a non-empty name, and rejects a case-insensitive duplicate name in that same type-and-group bucket. It persists a new category and immediately updates the card. Deleting removes only the selected category; the group record and card remain, including when its subcategory list becomes empty. Failure leaves the displayed data unchanged and shows a local error.

Bucket groups with the same name but different types remain distinct. No rename or reordering controls are added.

## Display

`BucketGroupGrid` derives cards from persisted bucket groups rather than categories, then joins matching categories into each card. This ensures empty groups appear in Settings and the Dashboard consistently. The grid receives optional management callbacks so Dashboard stays read-only while Settings supplies the add/delete UI.

## Validation and tests

Tests will cover domain validation for bucket groups; IndexedDB CRUD and legacy initialization; provider state updates after category deletion; and Settings interactions for adding, rejecting blank and duplicate subcategories, deletion, persistence failures, and preserving an empty group after its final subcategory is deleted. Existing bucket creation and display tests will be updated for the new group collection. The full test, lint, typecheck, formatting check, and production build pipeline will be run.

## Scope boundaries

This work does not rename or reorder groups or subcategories, and does not delete bucket groups.

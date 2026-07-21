# Bucket Group Creation Design

## Goal

Let a user create a bucket group in Settings so transactions can later be categorised.

## Model and persistence

Bucket groups are derived from existing `Category` records. Creating a group creates and persists its required first subcategory with the selected category type and group name. No dedicated bucket-group store is needed for this scope.

## User flow

The Buckets section in Settings provides an add form containing:

- Group name
- First subcategory
- Income/Expense type selector

On submission, trimmed required values are validated. The app checks existing categories for a matching normalized group name and the same type. A duplicate is rejected; the same group name under the other type remains valid. A successful submission saves a new category through the category repository and immediately adds the new group to the rendered settings state.

## Errors

Required values and duplicate groups are shown as accessible inline form errors. Repository failures are also surfaced rather than silently discarding the user input.

## Scope boundaries

Editing and color selection remain out of scope. A group necessarily has one initial subcategory; empty groups are not represented.

## Testing

Component tests cover successful creation and persisted state refresh, required fields, duplicate prevention within a type, and allowing the same group name under the alternate type. Existing repository tests continue to cover IndexedDB persistence.

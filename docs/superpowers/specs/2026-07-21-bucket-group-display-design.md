# Bucket Group Display Design

## Goal

Show configured bucket groups on both the Dashboard and Settings pages so users can understand their available income and expense categories.

## Data model and grouping

Bucket groups remain derived from `Category` records; no new persistence model is required. Categories are grouped by a normalized composite key of category type and trimmed, case-insensitive group name. This keeps an income group and an expense group with the same name separate while collecting all of each group's subcategories in one card.

Each rendered group uses the trimmed group name and type from its first category. Its subcategory list contains the names from all categories in that group. The group color is resolved from the configured bucket-color data using the same normalized type-and-group identity. If no color is configured, the UI uses a stable neutral fallback rather than hiding the color indicator.

## Shared presentation

Create one presentational bucket-group grid component for both pages. It receives categories and bucket colors, derives group cards, and owns the empty state. Reusing it ensures grouping, labels, colors, card structure, and responsive behavior stay identical in the Dashboard overview and the Settings page.

Each card displays:

- Group name
- Income or expense type
- Color indicator
- A readable list of its subcategory names

The component is read-only. Editing, adding categories from the card, charts, and color configuration remain out of scope.

## Page behavior

The Dashboard renders the bucket-group grid as its main configured-content view. When no groups exist, it shows a dashboard-specific empty-state message directing the user to Settings to create buckets.

Settings retains the existing bucket creation form, then renders the shared grid underneath it. With no configured categories, it continues to show the bucket empty state in that section.

Both pages obtain ready-state categories and bucket colors through the existing data provider. The existing data-state gate continues to handle loading and provider failures before either page renders the grid.

## Responsive and accessible layout

The group collection uses a one-column grid on small screens and adds columns as width permits. Cards have semantic article boundaries, a heading for the group name, visible type text, and a decorative color swatch paired with a text color label where needed for non-visual access. The subcategories are rendered as a semantic list. Empty states remain visible text inside the associated Buckets section.

## Testing

Component tests will establish that:

- categories group correctly by type and normalized group name;
- a card includes its group name, type, color, and all subcategories;
- income and expense groups sharing a name produce separate cards;
- empty data shows the appropriate empty state;
- Dashboard and Settings both render the shared group display from provider data.

The full verification pipeline will run linting, formatting, TypeScript checks, tests, and the production build.

## Scope boundaries

This work does not add editing, deletion, charting, or new persistence. It relies on the bucket creation capability delivered by CELIA-007 and merely displays its persisted category records.

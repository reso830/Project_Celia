# Settings Page Design

## Purpose

Add a static Settings route where users can view the current empty states for household members and expense buckets. This work establishes the approved prototype's Settings layout without implying that management actions are available yet.

## Route and Layout

- Add a `/settings` route.
- Render the shared application header at the top of the page, using the approved navy palette. The Settings navigation pill is active; Dashboard and Transactions are inactive visual links. The add-transaction control is not included because transaction entry is outside this scope.
- The page background is `#eef0f3`. Content is centered with a maximum width of 1100px and desktop padding of `24px 28px 40px`.
- Use the prototype's flat card treatment: white background, `#d6dae1` one-pixel border, 12px radius, and no shadow.

## Buckets Section

- Render this section first.
- Use a 16px bold heading, `Buckets`, followed by a muted one-line description explaining that bucket groups organize income and expenses.
- Render a white bordered empty-state card with the copy: `No buckets yet.`
- Do not render bucket creation inputs, type toggles, color controls, category chips, or delete controls. Bucket management is explicitly out of scope.

## Household Section

- Separate this section from Buckets with a `#d6dae1` horizontal rule.
- Use a 16px bold heading, `Household`, followed by a muted one-line description explaining that household members can be managed here.
- Render a white bordered card titled `Household Members` and an empty-state message: `No household members yet.`
- Do not render member creation or deletion controls. Member management is explicitly out of scope.

## Responsive Behavior

- Keep the page content single-column at all sizes.
- The header content wraps gracefully on narrow screens; navigation and any header actions never force horizontal scrolling.
- At mobile widths, reduce outer page padding while retaining card padding and readable hierarchy.
- Empty-state cards expand to the available width.

## Data and Behavior

- The page is presentational only and does not consume or mutate member/category data in this increment.
- Empty states are intentionally always shown, matching the application's fresh-install state and the no-CRUD scope.

## Testing and Verification

- Add component-level tests covering the Settings route's Buckets and Household headings, both empty-state messages, and the Household Members card title.
- Run linting, formatting validation, strict type checking, the test suite, and production build.

## Exclusions

- Household member CRUD.
- Bucket group and sub-category CRUD.
- Color picker behavior.
- Transaction creation and Settings-driven data persistence.

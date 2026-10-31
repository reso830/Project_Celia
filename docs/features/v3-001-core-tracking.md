# F01 — Core Tracking

## Summary

Core Tracking establishes the financial structure Celia uses to organize household money.

Users can configure their household, define how income and expenses are classified, and manage the category/item structure that future entries will use.

This feature also establishes the shared application foundation required by later Celia features, but infrastructure and architecture are implementation concerns rather than standalone user-facing functionality.

---

## Goals

F01 should allow a user to:

- Set up and manage household members.
- Organize financial activity under **Income**, **Expenses**, and **Savings**.
- Create and maintain income and expense categories.
- Create items underneath categories.
- Assign a fixed identifying color to each category.
- Preserve historical classifications when categories change.
- Navigate the Celia application using the v3 application shell.
- Persist the core household and classification data needed by later features.

At completion, Celia should have a stable domain foundation onto which Entries, Budget & Savings, Dashboard, and Forecasting can be built.

---

## Core Concepts

### Household

Celia represents the finances of a single household.

The household is the default context for the application. Individual members may own financial activity, but household views aggregate activity across all members.

An owner is optional throughout Celia. When no member is explicitly selected, ownership defaults to **Household**.

### Members

A household can contain multiple named members.

Members are used to attribute income and expenses and later support member-level filtering and reporting.

For each member, Celia should support:

- Add
- Rename
- Remove

Removing a member must not silently destroy historical financial data associated with that member. The implementation must preserve referential and historical integrity.

Roles and permissions between household members are out of scope.

### Financial Umbrellas

Celia has three top-level financial umbrellas:

**Income** — money entering the household.

**Expenses** — money spent by the household.

**Savings** — money deliberately allocated into savings buckets.

These are distinct financial concepts.

Savings must **not** be represented as an expense category. Moving money into or out of a savings bucket must therefore not artificially increase household expenses.

F01 establishes these concepts in the domain model. Full savings-bucket behavior is implemented in F03.

---

## Categories and Items

Income and Expenses use a two-level classification hierarchy:

**Category → Item**

For example:

> Expenses → Transport → Fuel

Categories represent broad classifications. Items provide the actual classification selected when recording financial activity.

Entries ultimately attach to an **item**, not directly to a category.

### Category Properties

A category must contain at least:

- Name
- Umbrella/type
- Identifying color
- Collection of items
- Active/archived state

Category colors represent **identity**, not financial status.

The same category color must therefore be reused consistently anywhere that category appears in Celia, including future charts, tables, chips, and other visualizations.

Green, amber, and red are reserved for status and must not substitute for category identity colors.

### Category Management

The Categories screen must allow users to:

- View Income and Expense categories.
- Create a category.
- Rename a category.
- Change its identifying color.
- Add items.
- Rename items.
- Move an item to another compatible category.
- Merge categories.
- Archive categories.

The UI should follow the supplied Celia v3 prototype.

---

## Moving Items

An item can be moved from one category to another category belonging to the same financial umbrella.

When an item moves:

- The item becomes part of the destination category.
- Existing entries associated with the item follow it.
- Historical financial totals consequently use the item's new classification.

Moving an item must not duplicate or delete its associated entries.

---

## Merging Categories

Users can merge one category into another compatible category.

When Category A is merged into Category B:

- Items belonging to Category A move to Category B.
- Existing entries associated with those items remain intact.
- Category A is removed from active use.
- Category B becomes the surviving category.

A merge must not result in financial entries being deleted.

The user must explicitly choose the destination category before confirming the operation.

---

## Archiving Categories

Categories that are no longer needed can be archived instead of deleted.

An archived category:

- Remains available for historical records.
- Is visibly identified as archived in category management.
- Is excluded from pickers used for creating new financial activity.
- Retains its items and historical relationships.

Archiving therefore prevents future use without rewriting history.

Hard deletion of categories containing historical financial activity is not required.

---

## Household Screen

The Household screen manages the people represented by Celia.

The v3 prototype defines the intended visual structure, including:

- Member list.
- Add member.
- Rename member.
- Remove member.
- Member avatars/initials.
- Income versus outgoing visualization.
- Amount each member keeps.
- Expense-per-member visualization.
- Household defaults.

Some financial figures shown in the prototype depend on functionality implemented in later features.

F01 should establish the screen and member-management behavior without requiring placeholder financial logic to duplicate functionality belonging to Entries, Budget & Savings, or Dashboard.

Where meaningful financial data exists, the screen should consume it through the shared domain model rather than implementing separate calculations.

---

## Application Shell

F01 establishes the common Celia v3 application shell used by all subsequent features.

The navigation contains:

- Dashboard
- Entries
- Categories
- Savings Buckets
- Budget Models
- Forecaster
- Household

The shell and visual system should follow the supplied hi-fi prototype, including its:

- Navigation rail
- Page structure
- Typography
- Spacing
- Surfaces
- Borders
- Interaction states
- Design tokens

The prototype is a **design reference**, not production code. Its inline styling and in-memory state should not dictate the implementation architecture.

Routes belonging to features not yet implemented may exist as non-functional destinations until their respective feature is delivered.

---

## Persistence

Household and classification configuration must survive application reloads.

At minimum, persisted domain data introduced by F01 includes:

- Household
- Members
- Financial umbrellas/types
- Categories
- Items
- Category colors
- Category archival state

The persistence design should anticipate the relationships required by later features without implementing those features prematurely.

In particular, the model must be capable of supporting future relationships with:

- Entries
- Savings buckets
- Budget models
- Forecast scenarios

---

## Shared Financial Conventions

F01 establishes the following Celia-wide conventions.

### Currency

The initial currency is **PHP**.

Monetary values are displayed using the peso symbol and integer grouping:

> ₱119,500

Multi-currency and live foreign exchange are out of scope.

### Ownership

Financial activity can belong to:

- Household
- A specific household member

Household is the default.

### Historical Integrity

Changes to configuration must not unexpectedly destroy historical financial information.

Operations such as archiving, merging, moving, or removing entities should explicitly define what happens to existing relationships.

Prefer preserving historical information over destructive deletion.

---

## UX Requirements

The supplied **Celia v3 hi-fi prototype is the visual source of truth** for implemented screens.

F01 should reproduce the relevant design with high fidelity.

The Merge Category, Archive Category, and Move Item dialogs only have wireframe-level designs. Their structure should follow the wireframes while their visual styling should use the established hi-fi design system.

Important global requirements include:

- Desktop-first layout targeting approximately 1280–1440px widths.
- No horizontal scrolling at widths of 1100px or greater.
- Sora for UI typography.
- JetBrains Mono for monetary figures.
- No drop shadows.
- Separation through borders and surfaces.
- Minimum text contrast of 4.5:1.
- Design values implemented through reusable tokens rather than scattered hard-coded values.

---

## Out of Scope

F01 does **not** implement:

- Financial entry creation or transaction history.
- Entry filtering/search.
- Savings bucket management.
- Budget models.
- Dashboard calculations.
- Forecasting.
- Recurring entries.
- Bank import.
- Multi-currency.
- Live forex.
- Authentication or multi-user accounts.
- Household roles or permissions.
- Custom month start dates.

These belong to later features or future Celia versions.

---

## Acceptance Criteria

F01 is complete when:

1. Celia launches into the v3 application shell and navigation.
2. Core household configuration persists across reloads.
3. A user can add, rename, and remove household members.
4. Household is represented as the default owner context.
5. Income, Expenses, and Savings exist as distinct domain concepts.
6. A user can create and edit Income and Expense categories.
7. Every category has a persistent identifying color.
8. A user can create and rename items within a category.
9. Categories and items maintain the two-level `category → item` hierarchy.
10. A user can move an item between compatible categories without losing associated historical relationships.
11. A user can merge compatible categories without deleting associated historical relationships.
12. A user can archive a category so it remains available historically but cannot be selected for new activity.
13. Category identity colors remain distinct from green/amber/red status semantics.
14. The Categories and Household experiences follow the supplied v3 prototype at the appropriate fidelity.
15. The underlying domain and persistence model provides clean extension points for Entries, Budget & Savings, Dashboard, and Forecaster without implementing those features prematurely.

---

## Implementation Guidance

Keep F01 deliberately small architecturally.

It needs a solid domain and persistence foundation, but Celia does not yet need generalized financial engines, forecasting abstractions, event sourcing, plugin systems, or other infrastructure justified only by hypothetical future requirements.

Model the known relationships cleanly, expose them through straightforward application boundaries, and allow later features to extend the model when their actual requirements arrive.

The next feature, **F02 — Entries**, should be the first major consumer of the structures established here.
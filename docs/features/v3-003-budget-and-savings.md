# Celia v3 — F03: Budget & Savings
**Feature Brief | Accelerated SDD**

## 1. Overview

The Budget & Savings feature enables users to plan how household income is allocated across expenses, savings, and financial goals.

Building upon the household configuration established in F01 and transaction records introduced in F02, this feature adds two complementary capabilities:

- **Budget Models:** Define how household income is intended to be distributed.
- **Savings Buckets:** Organize and track money reserved for specific purposes.

F03 introduces the distinction between planned financial activity and actual financial activity, allowing users to evaluate their financial position against their intentions.

**Primary objective:** Enable users to create realistic household budgets, organize savings goals, and monitor progress without conflating savings with expenses.

## 2. Goals

Users should be able to:

- Create and manage savings buckets for different financial purposes.
- Define savings targets and track progress.
- Record contributions and withdrawals from savings buckets.
- Create and manage reusable budget models.
- Allocate planned amounts to expense categories and savings buckets.
- Apply budget models to specific months.
- Compare budget allocations against actual financial activity.
- Identify unallocated income and budget overruns.
- Preserve historical budgets and savings activity.

The feature should support practical household financial planning without requiring a complex accounting system.

## 3. Functional Scope

### 3.1 Savings Buckets

Savings Buckets represent money intentionally reserved for specific financial purposes.

Examples include:

- Emergency Fund
- Cash Buffer
- Travel Fund
- Vehicle Maintenance
- Large Purchases

A bucket should contain:

| Field | Description |
|---|---|
| Name | Identifies the savings purpose |
| Type | Cash Buffer, Emergency Fund, Goal, or Sinking Fund |
| Target Amount | Desired savings balance, where applicable |
| Current Balance | Amount currently allocated to the bucket |
| Description | Optional details |
| Status | Active or archived |

Bucket types describe the intended purpose and may influence how progress is presented.

#### Bucket Management

Users shall be able to:

- Create a savings bucket.
- Edit its name, type, target, and description.
- View current balance and target progress.
- Archive buckets that are no longer actively used.
- Review historical contributions and withdrawals.

Savings balances must be derived from recorded savings activity rather than maintained as unrelated manually updated totals.

### 3.2 Savings Contributions and Withdrawals

Users shall be able to record money moving into and out of a savings bucket.

Supported operations:

**Contribution:** Increases the amount allocated to a bucket.

**Withdrawal:** Decreases the amount allocated to a bucket.

Each operation should record:

- Bucket
- Amount
- Date
- Operation type
- Optional notes

Savings contributions and withdrawals are distinct from income and expense transactions.

For example, allocating ₱5,000 from available household money into an Emergency Fund should not create an additional ₱5,000 expense.

Withdrawals should not create additional income.

The system must prevent negative bucket balances unless a future requirement explicitly permits them.

### 3.3 Savings Progress

Each bucket should present:

- Current balance
- Target amount, when applicable
- Amount remaining to target
- Percentage of target achieved
- Contribution/withdrawal history

Buckets without a target should display their balance without requiring artificial progress calculations.

Archived buckets should remain visible through historical views but should not accept new activity by default.

### 3.4 Budget Models

A Budget Model defines a reusable plan for distributing household income.

Users shall be able to:

- Create a budget model.
- Name and describe the model.
- Define expected household income.
- Allocate planned amounts to expense categories.
- Allocate planned amounts to savings buckets.
- Edit or duplicate existing models.
- Select a model for a reporting month.
- Review previously applied models.

Budget Models represent financial intentions, not actual transactions.

Creating or applying a model must not automatically generate income, expense, or savings transactions.

### 3.5 Budget Allocations

A budget model shall support planned allocations across two primary destinations:

**Expense Allocations**

Amounts reserved for expense categories such as Housing, Food, Utilities, and Transportation.

**Savings Allocations**

Amounts intended for specific savings buckets.

The system shall calculate the remaining unallocated amount:

**Unallocated = Expected Income − Planned Expenses − Planned Savings**

Users should be able to identify when:

- The model is fully allocated.
- Some income remains unallocated.
- Planned allocations exceed expected income.

Overallocated models should be clearly identified rather than silently adjusted.

### 3.6 Monthly Budget Application

Users shall be able to apply a budget model to a specific calendar month.

Each month may have one active budget plan.

When a model is applied:

- Its planned allocations become the baseline for that month.
- The applied plan retains its own values.
- Subsequent edits to the reusable model must not silently rewrite historical monthly plans.
- Users may explicitly revise the current month's plan.

Historical monthly budgets must remain available for review.

### 3.7 Budget Versus Actual

Celia shall compare monthly planned allocations against recorded financial activity.

For expense categories, the system should display:

- Planned amount
- Actual spending
- Remaining allocation
- Percentage utilized
- Over-budget amount, when applicable

For savings buckets, it should display:

- Planned savings allocation
- Actual contributions
- Remaining planned contribution

Actual expense figures must derive from F02 transactions.

Actual savings contributions must derive from savings activity recorded in F03.

A budget allocation must not be treated as actual spending or an actual savings contribution.

### 3.8 Budget and Savings Visualization

The Budget Models and Savings Buckets screens should follow the supplied Celia v3 prototype.

Relevant visualizations include:

- Budget allocation breakdowns
- Planned versus actual spending
- Savings bucket balances
- Savings goal progress
- Remaining and unallocated amounts
- Budget utilization indicators

Visualizations must reflect authoritative financial data and established calculation rules.

## 4. Domain Rules

### Separation of Financial Concepts

Celia must distinguish:

- **Income:** Money received.
- **Expenses:** Money spent.
- **Savings Activity:** Money allocated to or withdrawn from savings.
- **Budget Allocations:** Planned distribution of money.

Savings activity does not independently change household income or expenses.

Budget allocations do not independently change actual financial balances.

### Financial Precision

All monetary calculations must use exact financial representations established by the project constitution.

Rounding must be deterministic.

### Ownership

F03 uses the household and member model established in F01.

Budget Models are household-level plans.

Savings Buckets belong to the household unless a later specification explicitly introduces member-specific savings ownership.

Individual income and expense records remain attributable to their respective owners.

### Category Relationships

Expense budget allocations reference expense categories established in F01.

Savings allocations reference Savings Buckets established in F03.

Archived categories and buckets must remain identifiable in historical plans.

### Historical Integrity

Changes to reusable budget models must not silently modify previously applied monthly budgets.

Archiving a savings bucket must not delete its activity history.

Changes to category structures must not orphan historical budget records.

### Derived Values

Budget totals, remaining allocations, utilization percentages, and savings progress must be calculated from authoritative records.

Independent copies of calculated totals should not become competing sources of truth.

## 5. UX Requirements

The supplied Celia v3 prototype remains the primary visual and interaction reference.

F03 should implement the relevant:

- Savings Buckets screen
- Budget Models screen
- Bucket creation/editing workflows
- Savings contribution/withdrawal workflows
- Budget model creation/editing workflows
- Monthly model selection
- Budget allocation controls
- Progress and utilization visualizations
- Empty, validation, and error states

The existing Celia design system established in F01 should be reused.

The interface should clearly distinguish planned amounts from actual financial activity.

## 6. Persistence and Integration

F03 extends the persistence model introduced in F01 and F02.

Persisted data should include:

- Savings bucket definitions
- Savings contribution/withdrawal records
- Budget model definitions
- Expense and savings allocations
- Monthly applied budget plans
- Historical budget revisions, where applicable

The implementation must maintain stable relationships with existing household, category, and transaction records.

Budget and savings calculations should be reusable by F04 Dashboard & Reporting and F05 Forecaster without requiring duplicate financial logic.

## 7. Out of Scope

F03 does not implement:

- Automated bank transfers
- Bank account synchronization
- Investment portfolio management
- Interest accrual calculations
- Automated savings recommendations
- AI-generated budgets
- Forecast scenarios
- Debt amortization engines
- Multi-currency budgeting
- Shared household permissions
- Automatic recurring savings transactions
- Advanced dashboard analytics
- Automatic budget rollover between months

These may be addressed by later features or future Celia versions.

## 8. Acceptance Criteria

F03 is complete when:

1. Users can create, edit, and archive savings buckets.
2. Buckets support appropriate types and optional targets.
3. Users can record contributions and withdrawals.
4. Savings balances and progress are calculated accurately.
5. Savings activity does not incorrectly change income or expense totals.
6. Users can create, edit, and duplicate budget models.
7. Models support expected income and allocations to expense categories and savings buckets.
8. Planned, allocated, and unallocated amounts are calculated correctly.
9. Overallocated models are clearly identified.
10. Users can apply a budget model to a selected month.
11. Each month maintains one active budget plan.
12. Historical monthly plans remain stable when reusable models change.
13. Actual spending is derived from F02 transaction records.
14. Actual savings contributions are derived from F03 savings activity.
15. Budget-versus-actual comparisons are accurate.
16. Archived categories and buckets do not break historical financial records.
17. Data persists correctly across application reloads.
18. Relevant validation, empty, and error states are handled.
19. The Savings Buckets and Budget Models experiences follow the supplied Celia v3 prototype.
20. Automated tests cover critical savings calculations, budget allocations, historical integrity, and persistence.

## 9. Implementation Guidance

F03 should remain a single feature brief while allowing the implementation plan to separate work into two logical areas:

**Savings Buckets:** Bucket management, savings activity, balances, and progress.

**Budget Models:** Reusable plans, allocations, monthly application, and actual-versus-budget calculations.

These areas should share established financial primitives and domain conventions without being forced into one generalized financial engine.

Avoid premature forecasting logic, complex accounting infrastructure, or automatic fund movement.

The feature should establish reliable financial planning data that F04 and F05 can consume.

**Expected outcome:** After F03, Celia should support recording household finances, planning monthly budgets, tracking savings goals, and comparing actual activity against financial intentions.
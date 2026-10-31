# Celia v3 — Project Constitution

## Purpose

Celia is a personal household finance application for tracking income, expenses, savings, budgets, and financial projections.

Celia v3 is also an engineering learning project. Development should prioritize maintainable architecture, understandable code, deterministic behavior, and effective AI-assisted development without introducing complexity that does not serve the application.

This constitution defines the principles that apply across all Celia v3 features, specifications, implementation plans, and code.

---

# I. Specification-Driven Development

Celia v3 SHALL be developed using Specification-Driven Development.

The expected flow is:

**Feature Brief → Specification → Implementation Plan → Tasks → Implementation → Verification**

The process MAY be compressed when requirements are straightforward, but implementation must remain traceable to documented requirements.

Specifications exist to remove meaningful ambiguity, not to document every implementation detail.

A specification SHOULD define:

- Expected behavior
- Business rules
- Important states
- Data relationships
- Edge cases
- Acceptance criteria

Implementation details SHOULD remain in implementation plans or code unless they represent an architectural constraint affecting multiple features.

The supplied Celia v3 prototype acts as the primary visual reference. Specifications SHOULD describe behavior the prototype cannot communicate clearly rather than reproducing every visible detail in prose.

---

# II. Accelerated SDD

Celia v3 deliberately uses a lightweight form of SDD.

Documentation SHALL provide enough information for implementation and verification without becoming an objective of its own.

Avoid:

- Excessive decomposition of small features
- Repeating information already established elsewhere
- Specifications for trivial implementation details
- Architecture documents without an architectural decision to record
- Ceremonial documents that do not reduce implementation risk

Related functionality SHOULD be grouped into meaningful vertical features.

Implementation tasks MAY be substantially more granular than feature briefs.

When requirements are sufficiently understood, implementation SHOULD begin rather than extending design discussion indefinitely.

---

# III. Prototype as Visual Source of Truth

The supplied Celia v3 hi-fi prototype is the primary reference for visual design and interaction intent.

Implementation SHOULD reproduce it faithfully unless:

1. The design conflicts with an explicit requirement.
2. The design creates a usability or accessibility problem.
3. Implementation exposes an interaction or state not represented by the prototype.
4. A later approved design supersedes it.

The prototype is **not production code**.

Its:

- component structure
- state management
- inline styling
- data structures
- mock data
- implementation shortcuts

MUST NOT automatically dictate the production architecture.

When the prototype and specification disagree, the specification takes precedence for behavior.

---

# IV. Domain Integrity

Financial correctness is more important than implementation convenience.

Celia SHALL maintain clear distinctions between:

- Income
- Expenses
- Savings
- Budgets
- Actual financial activity
- Planned financial activity
- Forecast financial activity

These concepts MUST NOT be conflated merely because doing so simplifies implementation.

In particular:

**Savings are not expenses.**

Moving money between financial classifications MUST NOT silently create or destroy financial value.

Derived values MUST be reproducible from their underlying data.

Financial calculations SHOULD be deterministic and independently testable.

---

# V. Historical Integrity

Celia SHOULD preserve financial history.

Configuration changes MUST NOT unexpectedly rewrite or destroy historical financial information.

Operations such as:

- Archiving
- Merging
- Moving
- Renaming
- Removing

MUST explicitly define their effect on existing financial relationships.

Prefer archival, reassignment, or explicit migration over destructive deletion when historical financial data exists.

A user must not lose financial history simply because their organizational structure changes.

---

# VI. Single Source of Truth

Each financial concept SHOULD have one authoritative representation.

Derived information SHOULD be calculated from authoritative domain data rather than maintained as independent duplicated state.

For example:

- Dashboard values should derive from financial records.
- Forecast baselines should derive from established financial data.
- Member summaries should derive from ownership information.
- Category totals should derive from item classifications.

Caching MAY be introduced when justified by performance, but cached values must remain reproducible from authoritative data.

---

# VII. Architecture Should Follow Proven Need

Celia SHALL favor the simplest architecture that cleanly supports known requirements.

Do not introduce abstractions solely because they may become useful later.

Avoid premature:

- Microservices
- Event sourcing
- Plugin architectures
- Generic rule engines
- Distributed infrastructure
- Repository layers without useful boundaries
- Complex state-management frameworks
- Generic abstractions with only one implementation

Future features MAY influence sensible data-model boundaries, but they SHOULD NOT require implementing their architecture prematurely.

Prefer deleting unnecessary architecture over adding speculative architecture.

---

# VIII. Clear Boundaries

Business logic SHOULD remain independent from presentation concerns.

Financial calculations MUST NOT depend on UI components.

Persistence concerns SHOULD NOT leak unnecessarily into domain logic.

UI components SHOULD consume domain behavior rather than recreate financial rules locally.

Shared behavior should be extracted when there is demonstrated reuse or a clear domain responsibility—not merely because two pieces of code look similar.

---

# IX. Data Persistence

User-created financial data MUST persist reliably.

Persistence SHOULD support schema evolution as Celia develops.

Data-model changes MUST consider migration of existing data once persistent user data exists.

Development shortcuts that require regularly deleting the user's database SHOULD NOT become the normal migration strategy.

The persistence mechanism MAY evolve during early development, but domain concepts SHOULD remain sufficiently isolated that storage technology does not define application behavior.

---

# X. Financial Precision

Financial values MUST NOT rely on binary floating-point arithmetic where rounding errors can affect monetary correctness.

Money SHOULD use an appropriate exact representation, such as:

- Integer minor units, or
- Fixed-precision decimal values

Rounding behavior MUST be deterministic.

Formatting is a presentation concern and MUST NOT alter stored financial values.

---

# XI. Testing Strategy

Testing effort SHOULD focus on behavior where failure would materially affect the application.

High-priority automated tests include:

- Financial calculations
- Domain rules
- Data transformations
- Historical integrity
- Persistence behavior
- Forecast calculations
- Budget calculations
- Edge cases affecting monetary values

UI tests SHOULD focus on important workflows rather than exhaustive implementation details.

Tests SHOULD verify externally meaningful behavior rather than tightly coupling themselves to internal implementation.

A feature is not considered complete merely because it renders successfully.

---

# XII. Verification Against Specifications

Every implemented feature MUST be verifiable against its specification and acceptance criteria.

Before considering a feature complete:

- Required behavior must work.
- Relevant automated tests must pass.
- Important edge cases must be checked.
- Persistence behavior must be verified.
- The implementation must be compared against the prototype where applicable.
- No known critical regression may remain.

Visual implementation SHOULD receive an explicit visual verification pass rather than relying solely on code inspection.

---

# XIII. Accessibility and Responsive Behavior

Celia is desktop-first but SHOULD remain usable across reasonable desktop and tablet widths.

The implementation MUST avoid unnecessary horizontal scrolling at supported widths.

Interactive controls SHOULD remain keyboard accessible where practical.

Text and interactive elements SHOULD maintain appropriate contrast.

Accessibility improvements that do not materially conflict with the intended design SHOULD take precedence over exact pixel reproduction.

---

# XIV. Design System Consistency

Reusable visual values SHOULD be expressed through shared design tokens.

This includes:

- Typography
- Spacing
- Colors
- Borders
- Radii
- Surfaces
- Interaction states

Category colors represent identity.

Status colors represent meaning.

These concepts MUST remain separate.

Green, amber, and red SHOULD primarily communicate financial or system status rather than arbitrary category identity.

---

# XV. AI-Assisted Development

AI agents are expected participants in Celia's development workflow.

Their output MUST be treated as engineering work requiring verification.

AI-generated code MUST NOT be accepted solely because it:

- Compiles
- Looks plausible
- Passes superficial UI inspection
- Matches a framework convention

Agents SHOULD receive bounded tasks with sufficient specification and context.

Where practical, implementation tasks SHOULD include objective verification criteria so another human or agent can independently validate the result.

Important financial behavior SHOULD be protected by deterministic tests rather than relying on agent interpretation.

---

# XVI. Recoverability

Changes SHOULD be incremental and reviewable.

Implementation SHOULD favor:

- Small coherent commits
- Traceable tasks
- Reversible changes
- Explicit migrations
- Deterministic tooling

Large AI-generated rewrites SHOULD be avoided unless there is a clear reason for them.

When implementation fails, it should be possible to identify the responsible change without reconstructing a large sequence of unrelated modifications.

---

# XVII. Dependencies

Dependencies SHOULD solve meaningful problems.

Before adding a dependency, consider whether:

1. The platform already provides the required capability.
2. The functionality can reasonably be implemented locally.
3. The dependency is actively maintained.
4. Its complexity is proportional to the problem being solved.

Do not recreate mature open-source solutions merely for architectural purity.

Conversely, do not add a library to avoid writing a small amount of straightforward code.

---

# XVIII. Security and Privacy

Financial information is sensitive user data.

Celia SHOULD minimize unnecessary exposure of financial information.

Secrets MUST NOT be committed to source control.

Logs MUST NOT unnecessarily contain sensitive financial information.

Future integrations involving external services MUST explicitly consider what financial data leaves the application.

Local-first or privacy-preserving approaches SHOULD be preferred when they reasonably satisfy the requirement.

---

# XIX. Performance

Celia SHOULD feel immediate during normal household use.

Optimization SHOULD be evidence-driven.

Do not introduce architectural complexity for hypothetical scale.

Celia is a household finance application, not a financial transaction platform processing millions of events.

Correctness and maintainability take priority over speculative scalability.

---

# XX. Definition of Done

A Celia feature is complete when:

1. Its required behavior is implemented.
2. Its acceptance criteria are satisfied.
3. Relevant automated tests pass.
4. Financial and domain rules are verified.
5. Persistence and migrations work where applicable.
6. The UI has been visually checked against the prototype.
7. Important accessibility and responsive behavior have been checked.
8. No known critical defects remain.
9. The implementation does not introduce unjustified architectural complexity.
10. Documentation is updated where the implementation establishes a lasting project-wide decision.

Passing compilation alone does not constitute completion.

---

# XXI. Constitutional Priority

This constitution defines project-wide engineering principles.

When documents conflict, use the following order:

**Constitution → Approved Feature Specification → Feature Brief → Prototype → Implementation Plan → Tasks → Existing Implementation**

A lower-level artifact MAY refine a higher-level artifact but MUST NOT silently contradict it.

If implementation reveals that a constitutional principle or approved requirement is inappropriate, change the governing document explicitly rather than allowing the codebase to become the undocumented source of truth.

---

## Guiding Principle

**Build the simplest Celia that correctly models the financial problem we actually have, preserve the user's financial history, and add complexity only when a real requirement earns it.**
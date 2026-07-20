# Core Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a framework-independent TypeScript domain model for Members, Categories, CategoryType, and PHP Transactions that enforces the approved prototype rules.

**Architecture:** A small `src/domain` module will expose immutable structural types plus factory functions. The factories validate input at the boundary and throw `DomainValidationError` for violations, keeping entities serializable and independent from persistence or UI concerns.

**Tech Stack:** Node.js, TypeScript (strict mode), Vitest.

## Global Constraints

- Use TypeScript with strict compiler settings.
- Amounts are positive safe-integer PHP minor units; never represent direction with an amount sign.
- Income and expense are represented exclusively by `Transaction.type` and `Category.type`.
- Transaction dates use real ISO-8601 date-only values in `yyyy-mm-dd` form.
- A transaction stores `memberId` and `categoryId` strings, without database-backed reference lookup.
- Categories use a non-empty `group` field as their bucket group.
- Transaction currency is always `'PHP'`.
- Do not add persistence, UI, CRUD services, reporting, forecasting, or recurring-rule scheduling.

---

## File Structure

- `package.json`: Node scripts and development dependencies for type-checking and Vitest.
- `tsconfig.json`: strict TypeScript compiler configuration for the source and tests.
- `src/domain/errors.ts`: shared validation-error class.
- `src/domain/category-type.ts`: category/transaction direction union and runtime guard.
- `src/domain/member.ts`: member type and constructor.
- `src/domain/category.ts`: category type and constructor, including bucket group validation.
- `src/domain/transaction.ts`: transaction type and constructor, including currency, amount, and date invariants.
- `src/domain/index.ts`: public domain API surface.
- `tests/domain/member-category.test.ts`: member/category examples and boundary validation.
- `tests/domain/transaction.test.ts`: income/expense examples and transaction invariant validation.

### Task 1: Establish the package and basic domain entities

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/domain/errors.ts`
- Create: `src/domain/category-type.ts`
- Create: `src/domain/member.ts`
- Create: `src/domain/category.ts`
- Create: `src/domain/index.ts`
- Create: `tests/domain/member-category.test.ts`

**Interfaces:**
- Produces: `CategoryType`, `isCategoryType(value: unknown): value is CategoryType`, `Member`, `createMember(input: Member): Readonly<Member>`, `Category`, `createCategory(input: Category): Readonly<Category>`, and `DomainValidationError`.

- [ ] **Step 1: Write the failing entity tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  DomainValidationError,
  createCategory,
  createMember,
  isCategoryType,
} from '../../src/domain/index.js';

describe('members and categories', () => {
  it('creates a member from the prototype fields', () => {
    expect(createMember({ id: 'member-alex', name: 'Alex', color: '#2463eb' })).toEqual({
      id: 'member-alex', name: 'Alex', color: '#2463eb',
    });
  });

  it('creates an expense sub-category within a bucket group', () => {
    expect(createCategory({
      id: 'category-rent', type: 'expense', group: 'Housing', name: 'Rent',
    })).toEqual({ id: 'category-rent', type: 'expense', group: 'Housing', name: 'Rent' });
  });

  it('recognizes exactly the income and expense category types', () => {
    expect(isCategoryType('income')).toBe(true);
    expect(isCategoryType('expense')).toBe(true);
    expect(isCategoryType('transfer')).toBe(false);
  });

  it('rejects a category without a bucket group', () => {
    expect(() => createCategory({
      id: 'category-rent', type: 'expense', group: ' ', name: 'Rent',
    })).toThrow(DomainValidationError);
  });
});
```

- [ ] **Step 2: Run the entity test to verify it fails**

Run: `npm test -- tests/domain/member-category.test.ts`

Expected: Vitest fails because the package and public domain module do not exist.

- [ ] **Step 3: Add the package configuration**

```json
{
  "name": "project-celia",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

Run: `npm install`

- [ ] **Step 4: Implement the basic entities**

```ts
// src/domain/errors.ts
export class DomainValidationError extends Error {
  override readonly name = 'DomainValidationError';
}
```

```ts
// src/domain/category-type.ts
export type CategoryType = 'income' | 'expense';

export function isCategoryType(value: unknown): value is CategoryType {
  return value === 'income' || value === 'expense';
}
```

```ts
// src/domain/member.ts
import { DomainValidationError } from './errors.js';

export interface Member { id: string; name: string; color: string; }

export function createMember(input: Member): Readonly<Member> {
  if (!input.id.trim() || !input.name.trim() || !input.color.trim()) {
    throw new DomainValidationError('Member id, name, and color are required.');
  }
  return Object.freeze({ ...input });
}
```

```ts
// src/domain/category.ts
import type { CategoryType } from './category-type.js';
import { isCategoryType } from './category-type.js';
import { DomainValidationError } from './errors.js';

export interface Category { id: string; type: CategoryType; group: string; name: string; }

export function createCategory(input: Category): Readonly<Category> {
  if (!input.id.trim() || !input.group.trim() || !input.name.trim() || !isCategoryType(input.type)) {
    throw new DomainValidationError('Category id, type, group, and name are required.');
  }
  return Object.freeze({ ...input });
}
```

```ts
// src/domain/index.ts
export * from './category-type.js';
export * from './category.js';
export * from './errors.js';
export * from './member.js';
```

- [ ] **Step 5: Run entity tests and type-checking**

Run: `npm test -- tests/domain/member-category.test.ts && npm run typecheck`

Expected: the four entity assertions pass and TypeScript exits with code 0.

- [ ] **Step 6: Commit the independently testable entity foundation**

```bash
git add package.json package-lock.json tsconfig.json src/domain tests/domain/member-category.test.ts
git commit -m "feat: add member and category domain entities"
```

### Task 2: Add validated PHP transactions

**Files:**
- Create: `src/domain/transaction.ts`
- Modify: `src/domain/index.ts`
- Create: `tests/domain/transaction.test.ts`

**Interfaces:**
- Consumes: `CategoryType`, `isCategoryType`, and `DomainValidationError` from Task 1.
- Produces: `Transaction`, `TransactionInput`, and `createTransaction(input: TransactionInput): Readonly<Transaction>`.

- [ ] **Step 1: Write the failing transaction tests**

```ts
import { describe, expect, it } from 'vitest';
import { DomainValidationError, createTransaction } from '../../src/domain/index.js';

const income = {
  id: 'transaction-salary', date: '2026-07-15', memberId: 'member-alex',
  categoryId: 'category-salary', type: 'income' as const, amount: 125_000,
  description: 'Salary', recurring: true,
};

describe('transactions', () => {
  it('creates an income transaction with a positive PHP minor-unit amount', () => {
    expect(createTransaction(income)).toEqual({ ...income, currency: 'PHP' });
  });

  it('creates an expense transaction without a negative amount', () => {
    expect(createTransaction({
      id: 'transaction-rent', date: '2026-07-01', memberId: 'member-alex',
      categoryId: 'category-rent', type: 'expense', amount: 35_000,
      description: 'July rent', recurring: true,
    })).toMatchObject({ type: 'expense', amount: 35_000, currency: 'PHP' });
  });

  it.each([0, -1, 12.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid minor-unit amount %s',
    (amount) => expect(() => createTransaction({ ...income, amount })).toThrow(DomainValidationError),
  );

  it.each(['2026-2-01', '2026-02-30', '2026/02/01'])(
    'rejects non-ISO or impossible date %s',
    (date) => expect(() => createTransaction({ ...income, date })).toThrow(DomainValidationError),
  );
});
```

- [ ] **Step 2: Run the transaction test to verify it fails**

Run: `npm test -- tests/domain/transaction.test.ts`

Expected: FAIL because `createTransaction` is not exported.

- [ ] **Step 3: Implement transaction creation and export it**

```ts
// src/domain/transaction.ts
import type { CategoryType } from './category-type.js';
import { isCategoryType } from './category-type.js';
import { DomainValidationError } from './errors.js';

export interface TransactionInput {
  id: string;
  date: string;
  memberId: string;
  categoryId: string;
  type: CategoryType;
  amount: number;
  description?: string;
  recurring: boolean;
}

export interface Transaction extends TransactionInput { currency: 'PHP'; }

function isIsoDate(value: string): boolean {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function createTransaction(input: TransactionInput): Readonly<Transaction> {
  if (!input.id.trim() || !input.memberId.trim() || !input.categoryId.trim()) {
    throw new DomainValidationError('Transaction id, memberId, and categoryId are required.');
  }
  if (!isCategoryType(input.type)) throw new DomainValidationError('Transaction type must be income or expense.');
  if (!isIsoDate(input.date)) throw new DomainValidationError('Transaction date must be a real yyyy-mm-dd date.');
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new DomainValidationError('Transaction amount must be a positive safe integer of PHP minor units.');
  }
  return Object.freeze({ ...input, currency: 'PHP' as const });
}
```

```ts
// add to src/domain/index.ts
export * from './transaction.js';
```

- [ ] **Step 4: Run transaction tests and the complete verification pipeline**

Run: `npm test -- tests/domain/transaction.test.ts && npm test && npm run typecheck`

Expected: all transaction tests, the entire Vitest suite, and strict TypeScript type-checking pass with exit code 0.

- [ ] **Step 5: Commit the transaction domain model**

```bash
git add src/domain/index.ts src/domain/transaction.ts tests/domain/transaction.test.ts
git commit -m "feat: add validated PHP transactions"
```

## Plan Self-Review

- Spec coverage: Task 1 provides Member, Category, CategoryType, and bucket groups. Task 2 provides Transaction, ISO dates, PHP-only currency, positive minor units, member/category IDs, and income/expense via `type`. Transaction tests provide explicit income and expense examples.
- Placeholder scan: no unresolved placeholders, deferred implementation notes, or ambiguous error-handling instructions are present.
- Type consistency: Task 2 imports the exact `CategoryType`, `isCategoryType`, and `DomainValidationError` exports introduced in Task 1; the public index exports every planned entity factory.

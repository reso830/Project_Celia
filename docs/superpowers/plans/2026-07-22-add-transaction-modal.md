# Add Transaction Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Let users create, persist, and immediately view income and expense transactions from the Transactions page.

**Architecture:** Extend the existing DataProvider ready state with a transaction save action that writes through TransactionRepository and immutably upserts local state. Keep dialog and form state in TransactionsPage; derive selectors and table rows from provider data, validate before using the existing domain factory, and use a header callback only to open the dialog.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest, Testing Library, IndexedDB.

## Global Constraints

- Persist through the existing IndexedDB transaction repository.
- Date defaults to the local calendar date in yyyy-mm-dd form and remains editable.
- Required fields are Date, Member, Bucket, Subcategory, and a positive PHP amount; Notes and Recurring are optional.
- Expense is the default type; a type change clears selected bucket and subcategory.
- Derive buckets from category group and subcategories from category name, filtered to selected type and bucket.
- Explain the setup requirement and disable Save when no member or matching category exists.
- Do not implement editing, deletion, filtering, or spreadsheet behavior.
- Keep the exact empty-state copy: No transactions match your filters.

---

## File Structure

- src/data/data-provider.tsx — save a transaction and update ready provider state.
- tests/data/data-provider.test.tsx — prove provider persistence and state refresh.
- src/components/app-header.tsx — accept optional Add Transaction callback.
- src/components/transactions-page.tsx — dialog state, validation, form conversion, submission, and rows.
- tests/components/transactions-page.test.tsx — test validation, setup state, persistence, and display.

### Task 1: Persist transactions through the data provider

**Files:**

- Modify: src/data/data-provider.tsx
- Modify: tests/data/data-provider.test.tsx

**Interfaces:**

- Consumes: Transaction and TransactionRepository.save(transaction).
- Produces: ready-state saveTransaction(transaction: Transaction): Promise<void>.

- [ ] **Step 1: Write the failing provider interaction test**

Add this test fixture and probe to tests/data/data-provider.test.tsx:

~~~tsx
const groceryTransaction: Transaction = {
  id: "transaction-grocery",
  date: "2026-07-22",
  memberId: "member-alex",
  categoryId: "category-groceries",
  type: "expense",
  amount: 1_250,
  description: "Weekly groceries",
  recurring: false,
  currency: "PHP",
};

function TransactionSaveProbe() {
  const state = useData();
  if (state.status !== "ready") return <output>{state.status}</output>;
  return <>
    <button type="button" onClick={() => void state.saveTransaction(groceryTransaction)}>
      Save transaction
    </button>
    <output>{"transactions:" + state.transactions.length}</output>
  </>;
}

it("persists a transaction and adds it to ready-state transactions", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  const dataRepositories = repositories({
    transactions: { get: vi.fn(), list: vi.fn().mockResolvedValue([]), save, delete: vi.fn() },
  });
  render(<DataProvider createRepositories={() => dataRepositories}><TransactionSaveProbe /></DataProvider>);
  fireEvent.click(await screen.findByRole("button", { name: "Save transaction" }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(groceryTransaction));
  expect(screen.getByText("transactions:1")).toBeInTheDocument();
});
~~~

- [ ] **Step 2: Run the provider test to verify it fails**

Run: npm test -- tests/data/data-provider.test.tsx

Expected: FAIL because state.saveTransaction is unavailable.

- [ ] **Step 3: Add the ready-state action and immutable upsert**

Add saveTransaction(transaction: Transaction): Promise<void> to the ready DataState variant. Inside initialize, before publishing ready state, add:

~~~ts
const saveTransaction = async (transaction: Transaction) => {
  await repositories.transactions.save(transaction);
  if (!active) return;

  setState((current) =>
    current.status === "ready"
      ? {
          ...current,
          transactions: [
            ...current.transactions.filter(({ id }) => id !== transaction.id),
            transaction,
          ],
        }
      : current,
  );
};
~~~

Include saveTransaction in the ready-state object.

- [ ] **Step 4: Run the provider test to verify it passes**

Run: npm test -- tests/data/data-provider.test.tsx

Expected: PASS including the new transaction persistence test.

- [ ] **Step 5: Commit the provider transaction action**

~~~bash
git add src/data/data-provider.tsx tests/data/data-provider.test.tsx
git commit -m "feat: save transactions through data provider"
~~~

### Task 2: Bind the header and render provider transactions

**Files:**

- Modify: src/components/app-header.tsx
- Modify: src/components/transactions-page.tsx
- Modify: tests/components/transactions-page.test.tsx

**Interfaces:**

- Consumes: useData ready state, members, categories, and transactions.
- Produces: AppHeader prop onAddTransaction?: () => void, dynamic list count and rows.

- [ ] **Step 1: Write a failing provider-backed list test**

Create a DataRepositories test factory whose members.list, categories.list, and transactions.list resolve supplied arrays. Render TransactionsPage inside DataProvider with Alex, category { id: "category-groceries", type: "expense", group: "Groceries", name: "Food" }, and the Task 1 transaction. Assert:

~~~tsx
expect(await screen.findByText("1 transaction")).toBeInTheDocument();
expect(screen.getByRole("cell", { name: "Alex" })).toBeInTheDocument();
expect(screen.getByRole("cell", { name: "Groceries" })).toBeInTheDocument();
expect(screen.getByRole("cell", { name: "Weekly groceries" })).toBeInTheDocument();
expect(screen.getByRole("cell", { name: "₱12.50" })).toBeInTheDocument();
~~~

- [ ] **Step 2: Run the component test to verify the static table fails**

Run: npm test -- tests/components/transactions-page.test.tsx

Expected: FAIL because the page always shows 0 transactions and an empty row.

- [ ] **Step 3: Wire the callback and render dynamic rows**

Add the optional header prop and click handler:

~~~tsx
interface AppHeaderProps {
  activePage: AppPage;
  onAddTransaction?: () => void;
}

<button onClick={onAddTransaction} type="button">
  + Add Transaction
</button>
~~~

In TransactionsPage, use useData, treat non-ready values as empty arrays, and look up member/category labels by ID. Replace the static count and unconditional table row with:

~~~tsx
<p>{" " + transactions.length + " transaction" + (transactions.length === 1 ? "" : "s")}</p>
{transactions.length === 0 ? (
  <tr><td colSpan={columns.length}>No transactions match your filters.</td></tr>
) : transactions.map((transaction) => (
  <tr key={transaction.id}>
    <td>{transaction.date}</td>
    <td>{memberName(transaction.memberId)}</td>
    <td>{category(transaction.categoryId)?.group ?? "Unknown bucket"}</td>
    <td>{transaction.description || "—"}</td>
    <td>{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(transaction.amount / 100)}</td>
    <td>{transaction.recurring ? "Yes" : "No"}</td>
  </tr>
))}
~~~

Pass a temporary no-op onAddTransaction callback in this task; Task 3 replaces it.

- [ ] **Step 4: Run the focused component test to verify it passes**

Run: npm test -- tests/components/transactions-page.test.tsx

Expected: PASS, including the seeded transaction row.

- [ ] **Step 5: Commit the provider-backed list**

~~~bash
git add src/components/app-header.tsx src/components/transactions-page.tsx tests/components/transactions-page.test.tsx
git commit -m "feat: display persisted transactions"
~~~

### Task 3: Add the validated transaction dialog and save flow

**Files:**

- Modify: src/components/transactions-page.tsx
- Modify: tests/components/transactions-page.test.tsx

**Interfaces:**

- Consumes: ready saveTransaction, createTransaction, members, and categories.
- Produces: a dialog named Add Transaction that saves domain transactions and receives immediate provider list updates.

- [ ] **Step 1: Write failing interaction tests**

Use userEvent.setup and the provider repository factory. Add these cases:

~~~tsx
it("shows required-field errors without saving", async () => {
  const user = userEvent.setup();
  const { transactionSave } = renderTransactions({ members: [alex], categories: [groceries] });
  await user.click(await screen.findByRole("button", { name: "+ Add Transaction" }));
  await user.click(screen.getByRole("button", { name: "Save transaction" }));
  expect(screen.getByText("Member is required.")).toBeInTheDocument();
  expect(screen.getByText("Bucket is required.")).toBeInTheDocument();
  expect(screen.getByText("Subcategory is required.")).toBeInTheDocument();
  expect(screen.getByText("Amount is required.")).toBeInTheDocument();
  expect(transactionSave).not.toHaveBeenCalled();
});

it("disables saving when no members exist", async () => {
  const user = userEvent.setup();
  renderTransactions({ members: [], categories: [groceries] });
  await user.click(await screen.findByRole("button", { name: "+ Add Transaction" }));
  expect(screen.getByText("Add a household member in Settings before creating a transaction.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save transaction" })).toBeDisabled();
});
~~~

Add a valid-expense test that chooses Alex, Groceries, Food, enters 12.50, notes Weekly groceries, checks Recurring, and asserts save receives an object matching memberId member-alex, categoryId category-groceries, type expense, amount 1250, description Weekly groceries, recurring true, and currency PHP. Also assert the dialog closes and the notes cell appears.

- [ ] **Step 2: Run the component test to verify dialog cases fail**

Run: npm test -- tests/components/transactions-page.test.tsx

Expected: FAIL because Add Transaction does not open a dialog.

- [ ] **Step 3: Implement dialog state and selectors**

Add isDialogOpen, type (expense initially), form values, errors, submit error, and saving state to TransactionsPage. Derive choices with:

~~~ts
const typedCategories = categories.filter((category) => category.type === type);
const buckets = [...new Set(typedCategories.map((category) => category.group))];
const subcategories = typedCategories.filter((category) => category.group === bucket);
const setupError = members.length === 0
  ? "Add a household member in Settings before creating a transaction."
  : typedCategories.length === 0
    ? "Add an " + type + " category in Settings before creating a transaction."
    : undefined;
~~~

Pass onAddTransaction={() => setIsDialogOpen(true)} to the header. Conditionally render a dialog with aria-modal true and title Add Transaction. Use labelled native Date, Member, Income / Expense, Bucket, Subcategory, Amount, Notes, and Recurring checkbox controls. Reset fields when opening/closing; set date to new Date().toLocaleDateString("en-CA"). Clear bucket/subcategory when type changes. Disable subcategory until a bucket is selected and disable Save when setupError exists or saving is active.

- [ ] **Step 4: Implement validation and domain conversion**

Add this local helper:

~~~ts
function parsePhpAmount(value: string): number | undefined {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return undefined;
  const [pesos, centavos = ""] = value.split(".");
  const amount = Number(pesos) * 100 + Number(centavos.padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : undefined;
}
~~~

On submit, create the exact required messages asserted in Step 1 and do not save if errors exist or setup is unavailable. Otherwise locate the selected category and call createTransaction with crypto.randomUUID, selected date/member/category/type, parsed minor units, optional trimmed notes, and recurring. Await state.saveTransaction(transaction); on success reset and close. On rejection, retain the dialog and show Unable to save this transaction. Please try again.

- [ ] **Step 5: Run the interaction tests to verify they pass**

Run: npm test -- tests/components/transactions-page.test.tsx

Expected: PASS; invalid fields do not persist, setup blocks saving, and valid input saves 1250 minor units then appears in the table.

- [ ] **Step 6: Commit the add-transaction dialog**

~~~bash
git add src/components/transactions-page.tsx tests/components/transactions-page.test.tsx
git commit -m "feat: add transaction modal"
~~~

### Task 4: Verify the full pipeline

**Files:**

- Modify: no source files expected.

**Interfaces:**

- Consumes: the completed transaction creation flow.
- Produces: fresh verification evidence.

- [ ] **Step 1: Check formatting**

Run: npm run format:check

Expected: exit 0 with no formatting differences.

- [ ] **Step 2: Run lint and type checks**

Run: npm run lint; npm run typecheck

Expected: both commands exit 0 without diagnostics.

- [ ] **Step 3: Run all automated tests**

Run: npm test

Expected: exit 0 with all Vitest files passing.

- [ ] **Step 4: Build the application**

Run: npm run build

Expected: exit 0 and the route list includes /transactions.

- [ ] **Step 5: Commit formatting-only changes if required**

~~~bash
git add src/data/data-provider.tsx src/components/app-header.tsx src/components/transactions-page.tsx tests/data/data-provider.test.tsx tests/components/transactions-page.test.tsx
git commit -m "chore: format add transaction flow"
~~~


# Application Data Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize persistent repositories centrally and expose loading, ready, and error states.

**Architecture:** A client `DataProvider` constructs the existing IndexedDB repositories once, concurrently reads all collections, and provides a discriminated state through context. A client state gate in the root layout renders minimal loading/error UI and renders its children only when the complete ready state is available.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, React Testing Library, fake-indexeddb.

## Global Constraints

- Initialize member, category, transaction, and bucket-color repositories together.
- Do not write defaults or sample data.
- A fresh installation reaches ready with empty readonly arrays.
- State is exclusively loading, fully populated ready, or error; partial data is not exposed.
- Render “Unable to load your data. Please try again.” for initialization errors.
- Do not add dashboard behavior, transaction entry, or settings UI.

---

## File Structure

- `src/data/data-provider.tsx`: context, repository factory, startup loading, public state types, and hook.
- `src/data/index.ts`: provider re-export.
- `src/components/data-state-gate.tsx`: visible loading/error boundary.
- `src/app/layout.tsx`: provider and boundary composition.
- `tests/data/data-provider.test.tsx`: startup state tests.
- `tests/components/data-state-gate.test.tsx`: visible state-gate tests.

### Task 1: Add the centralized data provider

**Files:**

- Create: `src/data/data-provider.tsx`
- Modify: `src/data/index.ts`
- Create: `tests/data/data-provider.test.tsx`

**Interfaces:**

- Produces `DataRepositories`, `DataState`, `DataProviderProps`, `DataProvider`, and `useData()`.

- [ ] **Step 1: Write failing provider tests**

```tsx
it("loads an empty installation into ready", async () => {
  render(<DataProvider createRepositories={() => repositories()}><StateProbe /></DataProvider>);
  expect(screen.getByText("loading")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText("ready:0")).toBeInTheDocument());
});

it("loads every persisted collection and exposes repositories", async () => {
  const value = repositories({ members: memberRepository([member]) });
  render(<DataProvider createRepositories={() => value}><StateProbe /></DataProvider>);
  await waitFor(() => expect(screen.getByText("ready:1")).toBeInTheDocument());
  expect(value.members.list).toHaveBeenCalledOnce();
  expect(value.categories.list).toHaveBeenCalledOnce();
  expect(value.transactions.list).toHaveBeenCalledOnce();
  expect(value.bucketColors.list).toHaveBeenCalledOnce();
});

it("publishes an error for an initialization failure", async () => {
  render(<DataProvider createRepositories={() => { throw new Error("IndexedDB unavailable"); }}><StateProbe /></DataProvider>);
  await waitFor(() => expect(screen.getByText("error")).toBeInTheDocument());
});

it("rejects use outside DataProvider", () => {
  expect(() => render(<StateProbe />)).toThrow("useData must be used within a DataProvider.");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/data/data-provider.test.tsx`

Expected: FAIL because `DataProvider` and `useData` do not exist.

- [ ] **Step 3: Implement the minimal provider**

```tsx
export interface DataRepositories {
  members: MemberRepository;
  categories: CategoryRepository;
  transactions: TransactionRepository;
  bucketColors: BucketColorRepository;
}

export type DataState =
  | { status: "loading" }
  | { status: "ready"; repositories: DataRepositories; members: readonly Member[]; categories: readonly Category[]; transactions: readonly Transaction[]; bucketColors: readonly BucketColor[] }
  | { status: "error"; error: Error };

const DataContext = createContext<DataState | undefined>(undefined);

export function DataProvider({ children, createRepositories = createIndexedDbRepositories }: DataProviderProps) {
  const [state, setState] = useState<DataState>({ status: "loading" });
  useEffect(() => {
    try {
      const repositories = createRepositories();
      Promise.all([repositories.members.list(), repositories.categories.list(), repositories.transactions.list(), repositories.bucketColors.list()])
        .then(([members, categories, transactions, bucketColors]) => setState({ status: "ready", repositories, members, categories, transactions, bucketColors }))
        .catch((cause: unknown) => setState({ status: "error", error: cause instanceof Error ? cause : new Error("Unable to initialize data.") }));
    } catch (cause) {
      setState({ status: "error", error: cause instanceof Error ? cause : new Error("Unable to initialize data.") });
    }
  }, [createRepositories]);
  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const state = useContext(DataContext);
  if (!state) throw new Error("useData must be used within a DataProvider.");
  return state;
}
```

`createIndexedDbRepositories()` returns new instances of the four existing `IndexedDb*Repository` classes. Export the provider module from `src/data/index.ts`.

- [ ] **Step 4: Verify the provider test passes**

Run: `npm test -- tests/data/data-provider.test.tsx && npm run typecheck`

Expected: all four tests pass and TypeScript exits 0.

- [ ] **Step 5: Commit the provider**

Run: `git add src/data/data-provider.tsx src/data/index.ts tests/data/data-provider.test.tsx && git commit -m "feat: add application data provider"`

### Task 2: Gate application content on data state

**Files:**

- Create: `src/components/data-state-gate.tsx`
- Modify: `src/app/layout.tsx`
- Create: `tests/components/data-state-gate.test.tsx`

**Interfaces:**

- Consumes `useData(): DataState`.
- Produces `DataStateGate({ children: ReactNode }): ReactNode`.

- [ ] **Step 1: Write failing state-gate tests**

```tsx
it("shows loading before data is ready", () => {
  render(<DataProvider createRepositories={repositories}><DataStateGate><p>Dashboard</p></DataStateGate></DataProvider>);
  expect(screen.getByText("Loading your data…")).toBeInTheDocument();
});

it("renders children after successful initialization", async () => {
  render(<DataProvider createRepositories={repositories}><DataStateGate><p>Dashboard</p></DataStateGate></DataProvider>);
  await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
});

it("shows a minimal error message on failure", async () => {
  render(<DataProvider createRepositories={() => { throw new Error("blocked"); }}><DataStateGate><p>Dashboard</p></DataStateGate></DataProvider>);
  await waitFor(() => expect(screen.getByText("Unable to load your data. Please try again.")).toBeInTheDocument());
  expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/components/data-state-gate.test.tsx`

Expected: FAIL because `DataStateGate` does not exist.

- [ ] **Step 3: Implement and integrate the state gate**

```tsx
export function DataStateGate({ children }: { children: ReactNode }) {
  const state = useData();
  if (state.status === "loading") return <p>Loading your data…</p>;
  if (state.status === "error") return <p role="alert">Unable to load your data. Please try again.</p>;
  return children;
}
```

Mount it in `src/app/layout.tsx` as `<DataProvider><DataStateGate>{children}</DataStateGate></DataProvider>`.

- [ ] **Step 4: Run the complete verification pipeline**

Run: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run build`

Expected: every command exits 0; all Vitest tests pass and Next.js creates a production build.

- [ ] **Step 5: Commit application integration**

Run: `git add src/components/data-state-gate.tsx src/app/layout.tsx tests/components/data-state-gate.test.tsx && git commit -m "feat: initialize application data"`

## Plan Self-Review

- Spec coverage: Task 1 exposes four repositories and complete loading/ready/error states, with empty-installation, persisted-data, and failure tests. Task 2 renders the required minimal error and blocks children until ready.
- Placeholder scan: no unresolved placeholders or deferred handling remain.
- Type consistency: `DataProvider`, `DataRepositories`, and `useData` are defined in Task 1 and consumed under those exact names in Task 2.

# Application Data Provider Design

## Purpose

Expose Celia's persistent repositories through a single application-level React provider so application state starts consistently. The provider owns startup loading and makes the complete state explicit to consuming components.

## Architecture

`DataProvider` is a client component in `src/data`. On mount it creates the IndexedDB-backed member, category, transaction, and bucket-color repositories and loads their persisted records concurrently. It publishes a discriminated `DataState` through React context:

- `loading`: repository creation and record loading are in progress.
- `ready`: every repository and its loaded records are available together.
- `error`: initialization failed and carries the originating `Error`.

The provider never writes records during initialization. A fresh IndexedDB installation therefore transitions from `loading` to `ready` with empty arrays for every data collection.

## Public API

The data module exports:

- `DataProvider`, which accepts `children` and optional repository dependencies for tests.
- `useData()`, which returns the current `DataState` and throws a clear error if called outside the provider.
- `DataRepositories`, grouping `MemberRepository`, `CategoryRepository`, `TransactionRepository`, and `BucketColorRepository`.
- `DataState`, a discriminated union with `status: "loading" | "ready" | "error"`.

The ready state contains `repositories` plus readonly `members`, `categories`, `transactions`, and `bucketColors` arrays. The error state contains the initialization `error`; it exposes no partial repository data.

## Application Integration

The root layout mounts `DataProvider` around its children. A small client-side state gate consumes the provider and renders:

- a minimal loading message while data initializes;
- the existing child content after a successful load;
- “Unable to load your data. Please try again.” when initialization fails.

This state gate deliberately does not add dashboard, transaction-entry, or settings features.

## Error Handling

Repository-construction and list-operation failures are caught by the provider and stored as an `Error` state. The state gate prevents application children from rendering until initialization is ready, so consumers never observe a partially initialized data graph. The original error remains available to any future consumer through `useData()` for diagnostics.

## Testing

Vitest and React Testing Library tests will inject repository dependencies and verify:

- initial loading followed by ready state;
- empty repository lists become a ready state with empty arrays;
- saved IndexedDB records are loaded into the ready state and the concrete repositories are exposed;
- a rejected initialization operation becomes the error state and renders the minimal error message;
- `useData()` rejects use outside its provider.

The full repository test suite, linting, formatting, strict type checking, and production build remain the verification pipeline.

## Exclusions

No sample data, dashboard behavior, transaction entry, settings UI, migrations beyond the existing IndexedDB schema, or data mutation actions are part of this work.

import "fake-indexeddb/auto";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BucketColor } from "@/domain/bucket-color";
import type { Category } from "@/domain/category";
import type { Member } from "@/domain/member";
import type { Transaction } from "@/domain/transaction";
import {
  CELIA_DATABASE_NAME,
  DataProvider,
  IndexedDbMemberRepository,
  type DataRepositories,
  useData,
} from "@/data";

function deleteCeliaDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(CELIA_DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Database deletion was blocked."));
  });
}

function repositories(
  overrides: Partial<DataRepositories> = {},
): DataRepositories {
  return {
    members: {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
    },
    categories: {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
    },
    transactions: {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
    },
    bucketColors: {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
    },
    ...overrides,
  };
}

function StateProbe() {
  const state = useData();

  if (state.status === "ready") {
    return (
      <output>{`ready:${state.members.length}:${state.categories.length}:${state.transactions.length}:${state.bucketColors.length}`}</output>
    );
  }

  return <output>{state.status}</output>;
}

describe("DataProvider", () => {
  beforeEach(async () => {
    await deleteCeliaDatabase();
  });

  afterEach(async () => {
    await deleteCeliaDatabase();
  });

  it("initializes an empty installation into a ready state", async () => {
    render(
      <DataProvider>
        <StateProbe />
      </DataProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("ready:0:0:0:0")).toBeInTheDocument(),
    );
  });

  it("loads persisted records and exposes every repository together", async () => {
    const member: Member = {
      id: "member-alex",
      name: "Alex",
      color: "#2463eb",
    };
    await new IndexedDbMemberRepository().save(member);

    render(
      <DataProvider>
        <StateProbe />
      </DataProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("ready:1:0:0:0")).toBeInTheDocument(),
    );
  });

  it("publishes an error when initialization fails", async () => {
    const failingRepositories = repositories({
      members: {
        get: vi.fn(),
        list: vi.fn().mockRejectedValue(new Error("IndexedDB unavailable")),
        save: vi.fn(),
        delete: vi.fn(),
      },
    });

    render(
      <DataProvider createRepositories={() => failingRepositories}>
        <StateProbe />
      </DataProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("error")).toBeInTheDocument(),
    );
  });

  it("rejects use outside DataProvider", () => {
    expect(() => render(<StateProbe />)).toThrow(
      "useData must be used within a DataProvider.",
    );
  });
});

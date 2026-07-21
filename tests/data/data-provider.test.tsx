import "fake-indexeddb/auto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Category } from "@/domain/category";
import type { Member } from "@/domain/member";
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
    bucketGroups: {
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

const rentCategory: Category = {
  id: "category-rent",
  type: "expense",
  group: "Housing",
  name: "Rent",
};

function CategorySaveProbe() {
  const state = useData();

  if (state.status !== "ready") {
    return <output>{state.status}</output>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void state.saveCategory(rentCategory)}
      >
        Save category
      </button>
      <output>{`categories:${state.categories.length}`}</output>
    </>
  );
}

function CategoryDeleteProbe() {
  const state = useData();

  if (state.status !== "ready") {
    return <output>{state.status}</output>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void state.deleteCategory("category-rent")}
      >
        Delete category
      </button>
      <output>{`categories:${state.categories.length}`}</output>
    </>
  );
}

function BucketColorSaveProbe() {
  const state = useData();

  if (state.status !== "ready") {
    return <output>{state.status}</output>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void state.saveBucketColor("Housing", "#24a6e9")}
      >
        Save bucket color
      </button>
      <output>{`bucket-colors:${state.bucketColors.length}`}</output>
    </>
  );
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

  it("persists a category and adds it to ready-state categories", async () => {
    const saveCategory = vi.fn().mockResolvedValue(undefined);
    const categoryRepositories = repositories({
      categories: {
        get: vi.fn(),
        list: vi.fn().mockResolvedValue([]),
        save: saveCategory,
        delete: vi.fn(),
      },
    });

    render(
      <DataProvider createRepositories={() => categoryRepositories}>
        <CategorySaveProbe />
      </DataProvider>,
    );

    await screen.findByRole("button", { name: "Save category" });
    fireEvent.click(screen.getByRole("button", { name: "Save category" }));

    await waitFor(() =>
      expect(saveCategory).toHaveBeenCalledWith(rentCategory),
    );
    await waitFor(() =>
      expect(screen.getByText("categories:1")).toBeInTheDocument(),
    );
  });

  it("upserts a saved category rather than duplicating its id", async () => {
    const saveCategory = vi.fn().mockResolvedValue(undefined);
    const categoryRepositories = repositories({
      categories: {
        get: vi.fn(),
        list: vi.fn().mockResolvedValue([]),
        save: saveCategory,
        delete: vi.fn(),
      },
    });

    render(
      <DataProvider createRepositories={() => categoryRepositories}>
        <CategorySaveProbe />
      </DataProvider>,
    );

    const saveButton = await screen.findByRole("button", {
      name: "Save category",
    });
    fireEvent.click(saveButton);
    await screen.findByText("categories:1");
    fireEvent.click(saveButton);

    await waitFor(() => expect(saveCategory).toHaveBeenCalledTimes(2));
    expect(screen.getByText("categories:1")).toBeInTheDocument();
  });

  it("backfills and persists a legacy bucket group before publishing ready state", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const bucketGroups: DataRepositories["bucketGroups"] = {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save,
      delete: vi.fn(),
    };
    const categoryRepositories = repositories({
      categories: {
        get: vi.fn(),
        list: vi.fn().mockResolvedValue([rentCategory]),
        save: vi.fn(),
        delete: vi.fn(),
      },
      bucketGroups,
    });

    render(
      <DataProvider createRepositories={() => categoryRepositories}>
        <StateProbe />
      </DataProvider>,
    );

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ type: "expense", name: "Housing" }),
      ),
    );
  });

  it("deletes a persisted category and removes it from ready state", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const categoryRepositories = repositories({
      categories: {
        get: vi.fn(),
        list: vi.fn().mockResolvedValue([rentCategory]),
        save: vi.fn(),
        delete: remove,
      },
    });

    render(
      <DataProvider createRepositories={() => categoryRepositories}>
        <CategoryDeleteProbe />
      </DataProvider>,
    );

    await screen.findByRole("button", { name: "Delete category" });
    fireEvent.click(screen.getByRole("button", { name: "Delete category" }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith("category-rent"));
    await waitFor(() =>
      expect(screen.getByText("categories:0")).toBeInTheDocument(),
    );
  });

  it("persists an expense-specific bucket color and adds it to ready state", async () => {
    const saveBucketColor = vi.fn().mockResolvedValue(undefined);
    const dataRepositories = repositories({
      bucketColors: {
        get: vi.fn(),
        list: vi.fn().mockResolvedValue([]),
        save: saveBucketColor,
        delete: vi.fn(),
      },
    });

    render(
      <DataProvider createRepositories={() => dataRepositories}>
        <BucketColorSaveProbe />
      </DataProvider>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Save bucket color" }),
    );

    await waitFor(() =>
      expect(saveBucketColor).toHaveBeenCalledWith({
        bucket: "expense:housing",
        color: "#24a6e9",
      }),
    );
    expect(screen.getByText("bucket-colors:1")).toBeInTheDocument();
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

    await waitFor(() => expect(screen.getByText("error")).toBeInTheDocument());
  });

  it("rejects use outside DataProvider", () => {
    expect(() => render(<StateProbe />)).toThrow(
      "useData must be used within a DataProvider.",
    );
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataProvider, type DataRepositories } from "@/data";
import { DataStateGate } from "@/components/data-state-gate";

function repositories(): DataRepositories {
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
  };
}

describe("DataStateGate", () => {
  it("shows loading before data is ready", () => {
    const loadingRepositories = repositories();
    loadingRepositories.members.list = () =>
      new Promise<readonly []>(() => undefined);

    render(
      <DataProvider createRepositories={() => loadingRepositories}>
        <DataStateGate>
          <p>Dashboard</p>
        </DataStateGate>
      </DataProvider>,
    );

    expect(screen.getByText("Loading your data…")).toBeInTheDocument();
  });

  it("renders children after successful initialization", async () => {
    render(
      <DataProvider createRepositories={repositories}>
        <DataStateGate>
          <p>Dashboard</p>
        </DataStateGate>
      </DataProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("Dashboard")).toBeInTheDocument(),
    );
  });

  it("shows a minimal error message when initialization fails", async () => {
    const failingRepositories = repositories();
    failingRepositories.members.list = vi.fn().mockRejectedValue(new Error());

    render(
      <DataProvider createRepositories={() => failingRepositories}>
        <DataStateGate>
          <p>Dashboard</p>
        </DataStateGate>
      </DataProvider>,
    );

    await waitFor(() =>
      expect(
        screen.getByText("Unable to load your data. Please try again."),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });
});

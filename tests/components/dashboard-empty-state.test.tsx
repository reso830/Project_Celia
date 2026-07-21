import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { DashboardEmptyState } from "@/components/dashboard-empty-state";
import { DataProvider, type DataRepositories } from "@/data";

function repositories(
  categories: DataRepositories["categories"]["list"] = vi
    .fn()
    .mockResolvedValue([]),
  bucketColors: DataRepositories["bucketColors"]["list"] = vi
    .fn()
    .mockResolvedValue([]),
  bucketGroups: DataRepositories["bucketGroups"]["list"] = vi
    .fn()
    .mockResolvedValue([]),
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
      list: categories,
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
      list: bucketColors,
      save: vi.fn(),
      delete: vi.fn(),
    },
    bucketGroups: {
      get: vi.fn(),
      list: bucketGroups,
      save: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function renderDashboard(dataRepositories = repositories()) {
  return render(
    <DataProvider createRepositories={() => dataRepositories}>
      <DashboardEmptyState />
    </DataProvider>,
  );
}

describe("DashboardEmptyState", () => {
  it("renders the Celia dashboard empty state", async () => {
    renderDashboard();

    expect(
      await screen.findByRole("heading", { name: "Celia" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No bucket groups yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("renders configured bucket groups", async () => {
    renderDashboard(
      repositories(
        vi
          .fn()
          .mockResolvedValue([
            { id: "rent", type: "expense", group: "Housing", name: "Rent" },
          ]),
        vi.fn().mockResolvedValue([{ bucket: "Housing", color: "#2463eb" }]),
        vi
          .fn()
          .mockResolvedValue([
            { id: "expense-housing", type: "expense", name: "Housing" },
          ]),
      ),
    );

    expect(
      await screen.findByRole("article", { name: "Expense Housing" }),
    ).toHaveTextContent("Rent");
    expect(screen.getByText("Color: #2463eb")).toBeInTheDocument();
  });
});

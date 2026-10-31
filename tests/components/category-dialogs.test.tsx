import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CategoriesScreen from "@/components/categories/categories-screen";
import type { CategoryRowData } from "@/components/categories/types";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

const dining = {
  id: "dining",
  umbrella: "expense" as const,
  name: "Dining",
  color: "#7d8ba8" as never,
  archivedAt: null,
  mergedIntoCategoryId: null,
  itemCount: 1,
  archived: false,
  items: [
    {
      id: "coffee",
      categoryId: "dining",
      name: "Coffee",
      mergedIntoItemId: null,
    },
  ],
};
const groceries = {
  ...dining,
  id: "groceries",
  name: "Groceries",
  itemCount: 1,
  items: [
    {
      id: "fruit",
      categoryId: "groceries",
      name: "Coffee",
      mergedIntoItemId: null,
    },
  ],
};
const income = {
  ...dining,
  id: "salary",
  umbrella: "income" as const,
  name: "Salary",
  itemCount: 0,
  items: [],
};
const archivedExpense = {
  ...dining,
  id: "archived-expense",
  name: "Archived expense",
  archived: true,
  archivedAt: "2026-01-01T00:00:00.000Z",
  items: [],
};

function renderScreen(expense: CategoryRowData[] = [dining, groceries]) {
  return render(<CategoriesScreen income={[income]} expense={expense} />);
}

afterEach(() => {
  vi.unstubAllGlobals();
  navigation.refresh.mockReset();
});

describe("category operation dialogs", () => {
  it("requires destinations, filters them, previews combinations, and sends move and merge requests", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    renderScreen([dining, groceries, archivedExpense]);

    await user.click(screen.getByRole("button", { name: "Move" }));
    expect(screen.getByRole("button", { name: "Move item" })).toBeDisabled();
    const movePicker = screen.getByLabelText("Move item to category");
    expect(
      screen.queryByRole("option", { name: "Dining" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Salary" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Archived expense" }),
    ).not.toBeInTheDocument();
    await user.selectOptions(movePicker, "groceries");
    await user.click(screen.getByRole("button", { name: "Move item" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/items/coffee/move",
      expect.objectContaining({ body: '{"targetCategoryId":"groceries"}' }),
    );

    await user.click(screen.getByRole("button", { name: "Merge" }));
    expect(
      screen.getByRole("button", { name: "Merge category" }),
    ).toBeDisabled();
    await user.selectOptions(
      screen.getByLabelText("Merge into category"),
      "groceries",
    );
    expect(screen.getByText("Coffee will be combined.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Merge category" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/categories/dining/merge",
      expect.objectContaining({ body: '{"targetCategoryId":"groceries"}' }),
    );
    expect(
      screen.getByRole("heading", { name: "Groceries" }),
    ).toBeInTheDocument();
  });

  it("keeps a dialog open on conflict", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { message: "Already used." } },
            { status: 409 },
          ),
        ),
    );
    renderScreen();
    await user.click(screen.getByRole("button", { name: "Move" }));
    await user.selectOptions(
      screen.getByLabelText("Move item to category"),
      "groceries",
    );
    await user.click(screen.getByRole("button", { name: "Move item" }));
    expect(screen.getByText("Already used.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Move item" })).toBeVisible();
  });

  it("does not make a request when a move is cancelled", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderScreen();
    await user.click(screen.getByRole("button", { name: "Move" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("archives and restores, and makes archived edit affordances unavailable", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = renderScreen();
    await user.click(screen.getByRole("button", { name: "Archive" }));
    expect(screen.getByText(/Nothing is deleted/)).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Archive" })[1]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/categories/dining/archive",
      expect.any(Object),
    );

    const archived = {
      ...dining,
      archived: true,
      archivedAt: "2026-01-01T00:00:00.000Z",
    };
    rerender(
      <CategoriesScreen income={[income]} expense={[archived, groceries]} />,
    );
    expect(screen.getByText("ARCHIVED")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit Dining" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Merge" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Restore" }));
    await user.click(screen.getAllByRole("button", { name: "Restore" })[1]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/categories/dining/restore",
      expect.any(Object),
    );
  });

  it("styles Archive like Merge and keeps a disabled Merge distinct", () => {
    const { rerender } = renderScreen();
    // HF L252: 6px 11px padding, 8px apart.
    const padding = ["px-[11px]", "py-[var(--space-1-5)]"];
    const neutral = [
      "border-celia-border",
      "text-celia-muted",
      "hover:bg-celia-surface-subtle",
      ...padding,
    ];
    const archive = screen.getByRole("button", { name: "Archive" });
    const merge = screen.getByRole("button", { name: "Merge" });
    expect(archive).toHaveClass(...neutral);
    expect(archive.className).not.toMatch(/status-red/);
    expect(merge).toHaveClass(...neutral);
    expect(archive.parentElement).toBe(merge.parentElement);
    expect(archive.parentElement).toHaveClass("flex", "gap-[var(--space-2)]");

    const archived = {
      ...dining,
      archived: true,
      archivedAt: "2026-01-01T00:00:00.000Z",
    };
    rerender(
      <CategoriesScreen income={[income]} expense={[archived, groceries]} />,
    );
    const disabledMerge = screen.getByRole("button", { name: "Merge" });
    expect(disabledMerge).toBeDisabled();
    expect(disabledMerge).toHaveClass(
      "disabled:cursor-not-allowed",
      "disabled:border-celia-border-subtle",
      "disabled:bg-celia-surface-subtle",
    );
    const restore = screen.getByRole("button", { name: "Restore" });
    expect(restore).toHaveClass("text-celia-accent", ...padding);
    expect(restore.parentElement).toBe(disabledMerge.parentElement);
  });

  it("explains when no other active destination exists", async () => {
    const user = userEvent.setup();
    renderScreen([dining]);
    await user.click(screen.getByRole("button", { name: "Move" }));
    expect(
      screen.getAllByText("No other active Expense category"),
    ).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Move item" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Merge" }));
    expect(
      screen.getByRole("button", { name: "Merge category" }),
    ).toBeDisabled();
  });
});

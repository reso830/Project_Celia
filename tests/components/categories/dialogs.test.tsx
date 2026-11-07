import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MoveItemDialog from "@/components/categories/move-item-dialog";
import MergeCategoryDialog from "@/components/categories/merge-category-dialog";
import type { CategoryRowData } from "@/components/categories/types";
import type { HexColor } from "@/domain/color";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const category: CategoryRowData = {
  id: "dining",
  umbrella: "expense" as const,
  name: "Dining",
  color: "#7d8ba8" as HexColor,
  archivedAt: null,
  mergedIntoCategoryId: null,
  itemCount: 1,
  entryCount: 3,
  archived: false,
  items: [
    {
      id: "coffee",
      categoryId: "dining",
      name: "Coffee",
      mergedIntoItemId: null,
      entryCount: 1,
    },
  ],
};

describe("category entry-count dialogs", () => {
  it("shows a singular real entry count when moving an item", () => {
    render(
      <MoveItemDialog
        item={category.items[0]}
        category={category}
        categories={[category]}
        open
        onClose={() => undefined}
      />,
    );

    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "All 1 entry under Coffee move with it.",
      ),
    ).toBeInTheDocument();
  });

  it("pluralizes the real entry count when moving an item", () => {
    render(
      <MoveItemDialog
        item={{ ...category.items[0], entryCount: 2 }}
        category={category}
        categories={[category]}
        open
        onClose={() => undefined}
      />,
    );

    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "All 2 entries under Coffee move with it.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the category's real entry count when merging", () => {
    render(
      <MergeCategoryDialog
        category={category}
        categories={[category]}
        open
        onClose={() => undefined}
        onMerged={() => undefined}
      />,
    );

    expect(
      screen.getByText("What moves: 1 item and 3 entries."),
    ).toBeInTheDocument();
  });

  it("singularizes the real entry count when merging", () => {
    render(
      <MergeCategoryDialog
        category={{ ...category, entryCount: 1 }}
        categories={[category]}
        open
        onClose={() => undefined}
        onMerged={() => undefined}
      />,
    );

    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent === "What moves: 1 item and 1 entry.",
      ),
    ).toBeInTheDocument();
  });
});

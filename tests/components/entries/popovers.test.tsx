import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CategoryPopover from "@/components/entries/popovers/category-popover";
import ItemPopover from "@/components/entries/popovers/item-popover";
import CalendarPopover from "@/components/entries/popovers/calendar-popover";
import { usePopoverManager } from "@/components/entries/popovers/use-popover-manager";

it("keeps a single popover open and closes it on outside press", () => {
  const { result } = renderHook(() => usePopoverManager());
  act(() => result.current.toggle("date"));
  expect(result.current.formMenu).toBe("date");
  act(() => result.current.toggle("cat"));
  expect(result.current.formMenu).toBe("cat");
  fireEvent.mouseDown(document.body);
  expect(result.current.formMenu).toBeNull();
  act(() => result.current.toggle("item"));
  act(() => result.current.toggle("item"));
  expect(result.current.formMenu).toBeNull();
});

describe("CategoryPopover", () => {
  it("moves with arrow keys and selects the focused option with Enter", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CategoryPopover
        selectedId="food"
        onSelect={onSelect}
        categories={[
          {
            id: "food",
            umbrella: "expense",
            name: "Food",
            color: "#7d8ba8" as never,
            archived: false,
            items: [],
          },
          {
            id: "travel",
            umbrella: "expense",
            name: "Travel",
            color: "#7d8ba8" as never,
            archived: false,
            items: [],
          },
        ]}
      />,
    );

    screen.getByRole("option", { name: "Food" }).focus();
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "travel" }),
    );
  });
});

it("navigates item options with arrows and Enter", async () => {
  const user = userEvent.setup();
  const select = vi.fn();
  render(
    <ItemPopover
      items={[
        { id: "a", name: "Apple" },
        { id: "b", name: "Bread" },
      ]}
      selectedId="a"
      onSelect={select}
    />,
  );
  await user.keyboard("{ArrowDown}{Enter}");
  expect(select).toHaveBeenCalledWith({ id: "b", name: "Bread" });
});

it("explains when categories or items are unavailable", () => {
  const { rerender } = render(
    <CategoryPopover categories={[]} selectedId="" onSelect={vi.fn()} />,
  );
  expect(
    screen.getByText(
      "No categories available. Create a category first in Categories.",
    ),
  ).toBeVisible();
  rerender(<ItemPopover items={[]} selectedId="" onSelect={vi.fn()} />);
  expect(
    screen.getByText("No items in this category. Add items in Categories."),
  ).toBeVisible();
});

it("keeps a day tabbable after month navigation and supports arrow selection", async () => {
  const user = userEvent.setup();
  const select = vi.fn();
  const { container } = render(
    <CalendarPopover value="2026-11-04" onSelect={select} />,
  );
  const next = screen.getByRole("button", { name: "Next calendar month" });
  await user.click(next);
  await user.click(next);
  await user.click(next);
  expect(next).toHaveFocus();
  expect(
    container.querySelectorAll('[data-calendar-day][tabindex="0"]'),
  ).toHaveLength(1);
  await user.tab();
  await user.keyboard("{ArrowRight}{Enter}");
  expect(select).toHaveBeenCalledWith("2027-02-02");
});

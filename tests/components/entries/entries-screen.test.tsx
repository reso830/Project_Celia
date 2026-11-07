import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import EntriesScreen from "@/components/entries/entries-screen";
import type { EntriesViewData } from "@/server/entries-read";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const view: EntriesViewData = {
  month: "2026-11",
  entries: [
    {
      id: "entry-1",
      itemId: "item-1",
      ownerMemberId: null,
      amount: 1200,
      date: "2026-11-04",
      note: null,
      createdAt: "2026-11-04T00:00:00.000Z",
      updatedAt: "2026-11-04T00:00:00.000Z",
      type: "expense",
      itemName: "Market",
      categoryId: "category-1",
      categoryName: "Food",
      categoryColor: "#7d8ba8" as never,
      categoryArchived: false,
      ownerName: "Household",
      isHousehold: true,
      ownerArchived: false,
    },
    {
      id: "entry-2",
      itemId: "item-2",
      ownerMemberId: "member-1",
      amount: 5000,
      date: "2026-11-05",
      note: "November salary",
      createdAt: "2026-11-05T00:00:00.000Z",
      updatedAt: "2026-11-05T00:00:00.000Z",
      type: "income",
      itemName: "Salary",
      categoryId: "category-2",
      categoryName: "Food",
      categoryColor: "#7d8ba8" as never,
      categoryArchived: false,
      ownerName: "Ana",
      isHousehold: false,
      ownerArchived: false,
    },
    {
      id: "entry-3",
      itemId: "item-3",
      ownerMemberId: "member-2",
      amount: 800,
      date: "2026-11-06",
      note: "Coffee run",
      createdAt: "2026-11-06T00:00:00.000Z",
      updatedAt: "2026-11-06T00:00:00.000Z",
      type: "expense",
      itemName: "Coffee",
      categoryId: "category-1",
      categoryName: "Food",
      categoryColor: "#7d8ba8" as never,
      categoryArchived: false,
      ownerName: "Ben",
      isHousehold: false,
      ownerArchived: false,
    },
  ],
  categories: [
    {
      id: "category-1",
      umbrella: "expense",
      name: "Food",
      color: "#7d8ba8" as never,
      archived: false,
      items: [{ id: "item-1", name: "Market" }],
    },
    {
      id: "category-2",
      umbrella: "income",
      name: "Food",
      color: "#7d8ba8" as never,
      archived: false,
      items: [],
    },
  ],
  members: [
    { id: "member-1", name: "Ana" },
    { id: "member-2", name: "Ben" },
  ],
  archivedCategories: [],
  archivedMembers: [],
  defaults: { owner: "Household", currency: "PHP" },
};

describe("EntriesScreen", () => {
  it("moves focus to the table when a refreshed edit removes the focused row", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const { rerender } = render(<EntriesScreen {...view} />);
    await user.type(
      screen.getByRole("textbox", { name: "Search entries" }),
      "Market",
    );
    const edit = screen.getByRole("button", { name: "Edit entry Market" });
    await user.click(edit);
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(edit).toHaveFocus());
    rerender(
      <EntriesScreen
        {...view}
        entries={view.entries.map((entry) =>
          entry.id === "entry-1" ? { ...entry, itemName: "Renamed" } : entry,
        )}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Edit entry Market" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Entries" })).toHaveFocus();
  });

  it("does not steal focus if a refreshed edit removes a row after the user moved on", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const { rerender } = render(<EntriesScreen {...view} />);
    await user.type(
      screen.getByRole("textbox", { name: "Search entries" }),
      "Market",
    );
    const edit = screen.getByRole("button", { name: "Edit entry Market" });
    await user.click(edit);
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(edit).toHaveFocus());
    const search = screen.getByRole("textbox", { name: "Search entries" });
    await user.click(search);
    rerender(
      <EntriesScreen
        {...view}
        entries={view.entries.map((entry) =>
          entry.id === "entry-1" ? { ...entry, itemName: "Renamed" } : entry,
        )}
      />,
    );
    expect(search).toHaveFocus();
  });
  it("renders the header and entries", () => {
    render(<EntriesScreen {...view} />);
    expect(
      screen.getByRole("heading", { name: "Entries" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Market")).toBeInTheDocument();
  });

  it("pushes the adjacent month into the entries URL", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);

    await user.click(screen.getByRole("button", { name: "Next month" }));

    expect(navigation.push).toHaveBeenCalledWith("/entries?month=2026-12");
  });

  it("uses accessible chip filters and the teal add-entry action", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Household ▾" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "All categories ▾" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Add entry" })).toHaveClass(
      "bg-celia-accent",
      "hover:bg-celia-accent-dark",
    );
    const ownerChip = screen.getByRole("button", { name: "Household ▾" });
    expect(ownerChip).not.toHaveAttribute("aria-haspopup");
    expect(ownerChip).not.toHaveClass("text-celia-accent");

    await user.click(ownerChip);
    expect(
      screen.getByRole("group", { name: "Owner filter options" }),
    ).toHaveTextContent("Ana");
    screen.getByRole("button", { name: "Ana" }).focus();
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("group", { name: "Owner filter options" }),
    ).not.toBeInTheDocument();
    expect(ownerChip).toHaveFocus();

    await user.click(ownerChip);
    screen.getByRole("button", { name: "Ben" }).focus();
    await user.keyboard("{Enter}");
    expect(
      screen.queryByRole("group", { name: "Owner filter options" }),
    ).not.toBeInTheDocument();
    expect(ownerChip).toHaveFocus();

    await user.click(ownerChip);
    screen.getByRole("button", { name: "Ben" }).focus();
    await user.tab();
    expect(
      screen.queryByRole("group", { name: "Owner filter options" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ben ▾" }));
    await user.click(screen.getByRole("button", { name: "All categories ▾" }));
    expect(
      screen.getByRole("group", { name: "Category filter options" }),
    ).toHaveTextContent("Expense · Food");
    expect(
      screen.getByRole("group", { name: "Category filter options" }),
    ).toHaveTextContent("Income · Food");
  });

  it("opens an add-entry dialog with the amount field focused", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);

    await user.click(screen.getByRole("button", { name: "+ Add entry" }));

    expect(screen.getByRole("dialog", { name: "Add entry" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveFocus();
  });

  it("keeps entry saving disabled for a zero amount with its specific validation message", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);

    await user.click(screen.getByRole("button", { name: "+ Add entry" }));
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "0");

    expect(screen.getByText("Enter an amount above zero.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Save & add another" }),
    ).toBeDisabled();
  });

  it("keeps an option available for Safari-style mouse activation", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);
    const ownerChip = screen.getByRole("button", { name: "Household ▾" });

    await user.click(ownerChip);
    const ana = screen.getByRole("button", { name: "Ana" });
    fireEvent.pointerDown(ana);
    fireEvent.blur(ownerChip, { relatedTarget: null });
    fireEvent.pointerUp(ana);

    expect(
      screen.getByRole("group", { name: "Owner filter options" }),
    ).toBeInTheDocument();
    await user.click(ana);
    expect(ownerChip).toHaveFocus();
  });

  it("clears a pointer interaction that ends outside the menu", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);
    const ownerChip = screen.getByRole("button", { name: "Household ▾" });

    await user.click(ownerChip);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Ana" }));
    fireEvent.pointerUp(document.body);
    fireEvent.blur(ownerChip, { relatedTarget: document.body });

    expect(
      screen.queryByRole("group", { name: "Owner filter options" }),
    ).not.toBeInTheDocument();
  });

  it("clears a closed chip pointer interaction before keyboard menu navigation", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);
    const ownerChip = screen.getByRole("button", { name: "Household ▾" });

    ownerChip.focus();
    fireEvent.pointerDown(ownerChip);
    fireEvent.pointerUp(document.body);
    await user.keyboard("{Enter}");
    screen.getByRole("button", { name: "Ben" }).focus();
    await user.tab();

    expect(
      screen.queryByRole("group", { name: "Owner filter options" }),
    ).not.toBeInTheDocument();
  });

  it("filters entries immediately by type, search, category, and owner", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);

    await user.click(screen.getByRole("button", { name: "Income" }));
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.queryByText("Market")).not.toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Entry summaries" }),
    ).toHaveTextContent("Entries 1");
    expect(
      screen.getByRole("group", { name: "Entry summaries" }),
    ).toHaveTextContent("Income ₱50");

    await user.click(screen.getByRole("button", { name: "All" }));
    await user.type(
      screen.getByPlaceholderText("Search notes and items…"),
      "coffee",
    );
    expect(screen.getByText("Coffee")).toBeInTheDocument();
    expect(screen.queryByText("Salary")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Search notes and items…"));
    await user.click(screen.getByRole("button", { name: "Household ▾" }));
    await user.click(screen.getByRole("button", { name: "Ana" }));
    expect(screen.getByText("Market")).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.queryByText("Coffee")).not.toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Entry summaries" }),
    ).toHaveTextContent("Entries 2");
    expect(screen.getByText("₱50 own · ₱0 shared")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All categories ▾" }));
    await user.click(screen.getByRole("button", { name: "Income · Food" }));
    await user.click(screen.getByRole("button", { name: "Income" }));
    await user.type(
      screen.getByPlaceholderText("Search notes and items…"),
      "salary",
    );
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.queryByText("Market")).not.toBeInTheDocument();
  });

  it("trims category-name search and updates the listed row count", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);

    await user.type(
      screen.getByPlaceholderText("Search notes and items…"),
      " food ",
    );

    expect(screen.getAllByRole("row").slice(1)).toHaveLength(3);
    expect(
      screen.getByRole("group", { name: "Entry summaries" }),
    ).toHaveTextContent("Entries 3");
  });

  it("exposes named filter and summary groups", () => {
    render(<EntriesScreen {...view} />);

    expect(
      screen.getByRole("group", { name: "Entry filters" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Entry type" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Entry summaries" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Search entries" }),
    ).toHaveAttribute("type", "text");
  });

  it("uses non-color selected styles for filter chips and menu options", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);

    await user.click(screen.getByRole("button", { name: "Household ▾" }));
    await user.click(screen.getByRole("button", { name: "Ana" }));
    const ownerChip = screen.getByRole("button", { name: "Ana ▾" });
    expect(ownerChip).toHaveClass(
      "border-celia-filter-selected",
      "text-celia-accent-dark",
    );
    expect(ownerChip).not.toHaveClass("font-medium");
    await user.click(ownerChip);
    expect(screen.getByRole("button", { name: "Ana" })).toHaveClass(
      "bg-celia-menu-selected",
      "font-medium",
      "text-celia-ink",
    );

    await user.click(screen.getByRole("button", { name: "All categories ▾" }));
    await user.click(screen.getByRole("button", { name: "Income · Food" }));
    const categoryChip = screen.getByRole("button", {
      name: "Income · Food ▾",
    });
    expect(categoryChip).toHaveClass(
      "border-celia-filter-selected",
      "text-celia-accent-dark",
    );
    expect(categoryChip).not.toHaveClass("font-medium");
    await user.click(categoryChip);
    expect(screen.getByRole("button", { name: "Income · Food" })).toHaveClass(
      "text-celia-accent-dark",
      "font-medium",
    );

    await user.click(screen.getByRole("button", { name: "Expense" }));
    expect(screen.getByRole("button", { name: "Expense" })).toHaveClass(
      "font-medium",
    );
  });

  it("keeps filters selected when the Entries screen receives a new month", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<EntriesScreen {...view} />);

    await user.click(screen.getByRole("button", { name: "Household ▾" }));
    await user.click(screen.getByRole("button", { name: "Ana" }));
    rerender(<EntriesScreen {...view} month="2026-12" entries={[]} />);

    expect(screen.getByRole("button", { name: "Ana ▾" })).toBeInTheDocument();
  });

  it("renders the month empty state", () => {
    render(<EntriesScreen {...view} entries={[]} />);
    expect(
      screen.getByText("No entries recorded for this month.").parentElement,
    ).toHaveClass(
      "px-[var(--space-5)]",
      "py-[34px]",
      "text-[length:var(--font-size-body)]",
    );
  });

  it("renders the filter empty state when search has no match", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);

    await user.type(
      screen.getByPlaceholderText("Search notes and items…"),
      "no matching entry",
    );

    expect(
      screen.getByText("No entries match these filters."),
    ).toBeInTheDocument();
  });

  it("keeps the amount sort when a search temporarily has no matches", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);

    await user.click(screen.getByRole("button", { name: "Sort by amount" }));
    expect(
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.dataset.entryId),
    ).toEqual(["entry-2", "entry-1", "entry-3"]);

    const search = screen.getByPlaceholderText("Search notes and items…");
    await user.type(search, "no match");
    expect(
      screen.getByText("No entries match these filters."),
    ).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Entries" })).toBeInTheDocument();

    await user.clear(search);
    expect(
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.dataset.entryId),
    ).toEqual(["entry-2", "entry-1", "entry-3"]);
  });

  it("opens a delete confirmation containing the entry details and can cancel", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);

    await user.click(
      screen.getByRole("button", { name: "Delete entry Market" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Delete entry" }),
    ).toHaveTextContent("Nov 04");
    expect(
      screen.getByRole("dialog", { name: "Delete entry" }),
    ).toHaveTextContent("Market");
    expect(
      screen.getByRole("dialog", { name: "Delete entry" }),
    ).toHaveTextContent("−₱12");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByRole("dialog", { name: "Delete entry" }),
    ).not.toBeInTheDocument();
  });

  it("shows deletion feedback and refreshes after a successful delete", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<EntriesScreen {...view} />);

    await user.click(
      screen.getByRole("button", { name: "Delete entry Market" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete entry" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/entries/entry-1", {
        method: "DELETE",
      }),
    );
    expect(navigation.refresh).toHaveBeenCalledOnce();
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent(
      "Entry deleted",
    );
  });

  it("moves focus to the next delete action after deleting a row", async () => {
    const user = userEvent.setup();
    const originalFocus = HTMLButtonElement.prototype.focus;
    const focus = vi
      .spyOn(HTMLButtonElement.prototype, "focus")
      .mockImplementation(function (this: HTMLButtonElement) {
        if (this.getAttribute("aria-label") === "Delete entry Salary") {
          expect(document.querySelector("dialog")).not.toHaveAttribute("open");
        }
        originalFocus.call(this);
      });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(<EntriesScreen {...view} />);

    await user.click(
      screen.getByRole("button", { name: "Delete entry Coffee" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete entry" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Delete entry Salary" }),
      ).toHaveFocus(),
    );
    expect(focus).toHaveBeenCalled();
  });

  it("reports and refreshes a stale deletion", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { code: "not_found", message: "Entry not found." },
        }),
      }),
    );
    render(<EntriesScreen {...view} />);

    await user.click(
      screen.getByRole("button", { name: "Delete entry Market" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete entry" }));

    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
    expect(screen.getByRole("alert", { hidden: true })).toHaveTextContent(
      "Entry not found.",
    );
  });

  it("restores focus after closing a stale delete dialog", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { code: "not_found", message: "Entry not found." },
        }),
      }),
    );
    render(<EntriesScreen {...view} />);

    await user.click(
      screen.getByRole("button", { name: "Delete entry Coffee" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete entry" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Delete entry Salary" }),
      ).toHaveFocus(),
    );
  });
});

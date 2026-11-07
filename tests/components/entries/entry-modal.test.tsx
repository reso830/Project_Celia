import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import EntriesScreen from "@/components/entries/entries-screen";
import type { EntriesViewData } from "@/server/entries-read";
import { StrictMode } from "react";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

const view: EntriesViewData = {
  month: "2026-11",
  entries: [
    {
      id: "entry-1",
      itemId: "item-1",
      ownerMemberId: null,
      amount: 1200,
      date: "2026-11-04",
      note: "Old note",
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
      name: "Salary",
      color: "#7d8ba8" as never,
      archived: false,
      items: [{ id: "item-2", name: "Paycheck" }],
    },
  ],
  members: [{ id: "member-1", name: "Ana" }],
  archivedCategories: [],
  archivedMembers: [],
  defaults: { owner: "Household", currency: "PHP" },
};

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("EntryModal", () => {
  it("returns focus to the opener under Strict Mode", async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <EntriesScreen {...view} />
      </StrictMode>,
    );
    const opener = screen.getByRole("button", { name: "+ Add entry" });
    await user.click(opener);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("closes the native dialog before restoring edit focus on save under Strict Mode", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(
      <StrictMode>
        <EntriesScreen {...view} />
      </StrictMode>,
    );
    const opener = screen.getByRole("button", { name: "Edit entry Market" });
    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Edit entry" });
    const focus = vi.spyOn(opener, "focus").mockImplementation(() => {
      expect(dialog).not.toHaveAttribute("open");
      HTMLElement.prototype.focus.call(opener);
    });
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(opener).toHaveFocus());
    expect(focus).toHaveBeenCalled();
    focus.mockRestore();
  });

  it("explains missing categories without opening a picker", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} categories={[]} />);
    await user.click(screen.getByRole("button", { name: "+ Add entry" }));
    expect(
      screen.getByText(
        "No categories available. Create a category first in Categories.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Save" }),
    ).toHaveAccessibleDescription(
      "No categories available. Create a category first in Categories.",
    );
  });

  it("explains a category with no items without opening a picker", async () => {
    const user = userEvent.setup();
    render(
      <EntriesScreen
        {...view}
        categories={[{ ...view.categories[0], items: [] }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "+ Add entry" }));
    expect(
      screen.getByText("No items in this category. Add items in Categories."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Save" }),
    ).toHaveAccessibleDescription(
      "No items in this category. Add items in Categories.",
    );
  });
  it("posts a valid new entry and announces its category", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<EntriesScreen {...view} />);
    await user.click(screen.getByRole("button", { name: "+ Add entry" }));
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "12.50");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/entries",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      type: "expense",
      amount: "12.50",
      itemId: "item-1",
      ownerMemberId: "",
      note: "",
    });
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent(
      "₱12.50 added to Food",
    );
  });

  it("keeps selections and clears amount and note after save and add another", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(<EntriesScreen {...view} />);
    await user.click(screen.getByRole("button", { name: "+ Add entry" }));
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "12");
    await user.type(screen.getByRole("textbox", { name: "Note" }), "Lunch");
    await user.click(
      screen.getByRole("button", { name: "Save & add another" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Amount" })).toHaveValue(""),
    );
    expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("");
    expect(screen.getByRole("dialog", { name: "Add entry" })).toBeVisible();
  });

  it("prefills an edit and PATCHes without offering add another", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<EntriesScreen {...view} />);
    await user.click(screen.getByRole("button", { name: "Edit entry Market" }));
    expect(screen.getByRole("dialog", { name: "Edit entry" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveValue("12");
    expect(
      screen.queryByRole("button", { name: "Save & add another" }),
    ).not.toBeInTheDocument();
    await user.clear(screen.getByRole("textbox", { name: "Amount" }));
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "18");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/entries/entry-1",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent(
      "Entry updated",
    );
  });

  it("keeps one custom popover open and lets Escape close it before the modal", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);
    await user.click(screen.getByRole("button", { name: "+ Add entry" }));
    const dialog = screen.getByRole("dialog", { name: "Add entry" });
    await user.click(
      within(dialog).getByRole("button", { name: /CATEGORY Food/ }),
    );
    expect(
      screen.getByRole("listbox", { name: "Category options" }),
    ).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: /ITEM Market/ }),
    );
    expect(
      screen.queryByRole("listbox", { name: "Category options" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("listbox", { name: "Item options" })).toBeVisible();
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("listbox", { name: "Item options" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Add entry" })).toBeVisible();
  });

  it.each([
    ["0", "Enter an amount above zero."],
    ["-5", "Amount must be a positive number with at most two decimal places."],
    [
      "10.999",
      "Amount must be a positive number with at most two decimal places.",
    ],
    [
      "9999999999999",
      "Amount exceeds maximum allowed limit (₱999,999,999.99).",
    ],
  ])("shows the specific error for %s", async (input, message) => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);
    await user.click(screen.getByRole("button", { name: "+ Add entry" }));
    await user.type(screen.getByRole("textbox", { name: "Amount" }), input);
    expect(screen.getByText(message)).toBeVisible();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("submits on Enter and preserves note newlines", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<EntriesScreen {...view} />);
    await user.click(screen.getByRole("button", { name: "+ Add entry" }));
    await user.type(
      screen.getByRole("textbox", { name: "Note" }),
      "First{Enter}Second",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Amount" }),
      "12{Enter}",
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).note).toBe(
      "First\nSecond",
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "+ Add entry" })).toHaveFocus(),
    );
  });

  it("preserves the draft after a failed save", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<EntriesScreen {...view} />);
    await user.click(screen.getByRole("button", { name: "+ Add entry" }));
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "12.34");
    await user.type(screen.getByRole("textbox", { name: "Note" }), "Draft");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveValue(
      "12.34",
    );
    expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("Draft");
  });

  it("disables both save actions while a request is pending", async () => {
    const user = userEvent.setup();
    let resolve!: (response: { ok: boolean }) => void;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<EntriesScreen {...view} />);
    await user.click(screen.getByRole("button", { name: "+ Add entry" }));
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "12");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Save & add another" }),
    ).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledOnce();
    resolve({ ok: true });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Add entry" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("switches item with type and recovers a stale edit", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: { code: "not_found", message: "Entry not found." },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<EntriesScreen {...view} />);
    await user.click(screen.getByRole("button", { name: "Edit entry Market" }));
    const dialog = screen.getByRole("dialog", { name: "Edit entry" });
    await user.click(within(dialog).getByRole("button", { name: "Income" }));
    expect(
      within(dialog).getByRole("button", { name: /ITEM Paycheck/ }),
    ).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalled());
    expect(
      screen.queryByRole("dialog", { name: "Edit entry" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("alert", { hidden: true })).toHaveTextContent(
      "Entry not found.",
    );
  });

  it("keeps drafts on card clicks, closes popovers on outside clicks, and restores focus on cancel", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);
    const opener = screen.getByRole("button", { name: "+ Add entry" });
    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Add entry" });
    await user.type(
      within(dialog).getByRole("textbox", { name: "Amount" }),
      "12",
    );
    await user.click(within(dialog).getByText("Add entry"));
    expect(dialog).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: /CATEGORY Food/ }),
    );
    await user.click(within(dialog).getByRole("textbox", { name: "Note" }));
    expect(
      screen.queryByRole("listbox", { name: "Category options" }),
    ).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("selects a populated category when the first has no items", async () => {
    const user = userEvent.setup();
    render(
      <EntriesScreen
        {...view}
        categories={[
          { ...view.categories[0], id: "empty", name: "Empty", items: [] },
          ...view.categories,
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "+ Add entry" }));
    expect(screen.getByRole("button", { name: /CATEGORY Food/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /ITEM Market/ })).toBeVisible();
  });

  it("retains the current archived category and item when the active type is clicked", async () => {
    const user = userEvent.setup();
    const archived = {
      ...view.categories[0],
      archived: true,
      items: [...view.categories[0].items, { id: "other", name: "Other" }],
    };
    render(
      <EntriesScreen
        {...view}
        entries={[{ ...view.entries[0], categoryArchived: true }]}
        categories={view.categories.slice(1)}
        archivedCategories={[archived]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit entry Market" }));
    const dialog = screen.getByRole("dialog", { name: "Edit entry" });
    await user.click(within(dialog).getByRole("button", { name: "Expense" }));
    expect(
      within(dialog).getByRole("button", {
        name: /CATEGORY Food \(archived\)/,
      }),
    ).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: /ITEM Market/ }),
    );
    expect(screen.getByRole("option", { name: "Market" })).toBeVisible();
    expect(
      screen.queryByRole("option", { name: "Other" }),
    ).not.toBeInTheDocument();
  });

  it("restores edit focus after saving and keeps the live region mounted", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(<EntriesScreen {...view} />);
    const edit = screen.getByRole("button", { name: "Edit entry Market" });
    await user.click(edit);
    const dialog = screen.getByRole("dialog", { name: "Edit entry" });
    expect(within(dialog).getByRole("status")).toBeEmptyDOMElement();
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(edit).toHaveFocus());
  });

  it("returns focus to the picker after Escape and selection", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);
    await user.click(screen.getByRole("button", { name: "+ Add entry" }));
    const trigger = screen.getByRole("button", { name: /CATEGORY Food/ });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    await user.click(trigger);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes the modal on a native Escape cancel and restores its opener", async () => {
    const user = userEvent.setup();
    render(<EntriesScreen {...view} />);
    const opener = screen.getByRole("button", { name: "+ Add entry" });
    await user.click(opener);
    fireEvent(
      screen.getByRole("dialog", { name: "Add entry" }),
      new Event("cancel", { bubbles: true, cancelable: true }),
    );
    expect(
      screen.queryByRole("dialog", { name: "Add entry" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(opener).toHaveFocus());
  });
});

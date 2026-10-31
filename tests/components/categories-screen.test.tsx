import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CategoriesScreen from "@/components/categories/categories-screen";
const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
const rent = {
  id: "rent",
  umbrella: "expense" as const,
  name: "Rent",
  color: "#7d8ba8" as never,
  archivedAt: null,
  mergedIntoCategoryId: null,
  itemCount: 1,
  archived: false,
  items: [
    {
      id: "apartment",
      categoryId: "rent",
      name: "Apartment",
      mergedIntoItemId: null,
    },
  ],
};
const salary = {
  ...rent,
  id: "salary",
  umbrella: "income" as const,
  name: "Salary",
  itemCount: 0,
  items: [],
};
function renderScreen(
  props: Partial<React.ComponentProps<typeof CategoriesScreen>> = {},
) {
  return render(
    <CategoriesScreen income={[salary]} expense={[rent]} {...props} />,
  );
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  navigation.refresh.mockReset();
});
describe("Categories screen", () => {
  it("shows expense before income, counts, selection, square swatches, and no figures", async () => {
    const user = userEvent.setup();
    renderScreen();
    expect(
      screen
        .getByRole("button", { name: /EXPENSE/ })
        .compareDocumentPosition(
          screen.getByRole("button", { name: /INCOME/ }),
        ),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getAllByText("1 category")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Rent" })).toBeInTheDocument();
    expect(screen.getByText("No entries yet.")).toBeInTheDocument();
    expect(screen.queryByText(/₱/)).not.toBeInTheDocument();
    await user.click(screen.getByText("Salary"));
    expect(screen.getByRole("heading", { name: "Salary" })).toBeInTheDocument();
  });

  it("uses the singular group count only for one category", () => {
    const { rerender } = renderScreen({
      expense: [rent, { ...rent, id: "food", name: "Food" }],
    });
    const count = (group: RegExp, text: string) =>
      within(screen.getByRole("button", { name: group })).getByText(text);
    expect(count(/EXPENSE/, "2 categories")).toBeInTheDocument();
    expect(count(/INCOME/, "1 category")).toBeInTheDocument();
    rerender(<CategoriesScreen income={[]} expense={[rent]} />);
    expect(count(/EXPENSE/, "1 category")).toBeInTheDocument();
    expect(count(/INCOME/, "0 categories")).toBeInTheDocument();
  });

  it("labels the summary with the short month", () => {
    // October, so the short and long month names differ.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 30));
    renderScreen();
    const label = (month: "short" | "long") =>
      new Intl.DateTimeFormat("en-US", { month, year: "numeric" }).format(
        new Date(),
      );
    expect(screen.getByText(`${label("short")} spend`)).toBeInTheDocument();
    expect(
      screen.queryByText(`${label("long")} spend`),
    ).not.toBeInTheDocument();
  });

  it("selects categories from the keyboard", async () => {
    const user = userEvent.setup();
    renderScreen();
    const salary = screen.getByRole("button", { name: "Salary" });
    salary.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "Salary" })).toBeInTheDocument();
  });

  it("falls back to the first category after refreshed props remove the selection", async () => {
    const { rerender } = renderScreen();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Salary" }));
    rerender(<CategoriesScreen income={[]} expense={[rent]} />);
    expect(screen.getByRole("heading", { name: "Rent" })).toBeInTheDocument();
  });
  it("creates, renames, recolours, and adds items", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    renderScreen();
    await user.click(screen.getByText("+ add expense category"));
    await user.type(
      screen.getByLabelText("New expense category"),
      "Groceries{Enter}",
    );
    await user.click(screen.getByRole("button", { name: "Edit Rent" }));
    await user.type(screen.getByLabelText("Rename Rent"), " Home{Enter}");
    await user.click(
      screen.getByRole("button", { name: "Change colour for Rent" }),
    );
    const hex = screen.getByLabelText("Hex colour");
    await user.clear(hex);
    await user.type(hex, "#AABBCC");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByText("+ add item"));
    await user.type(screen.getByLabelText("New item name"), "Lease{Enter}");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/categories",
      expect.objectContaining({
        body: '{"umbrella":"expense","name":"Groceries"}',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/categories/rent",
      expect.objectContaining({ body: '{"name":"Rent Home"}' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/categories/rent",
      expect.objectContaining({ body: '{"color":"#aabbcc"}' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/categories/rent/items",
      expect.objectContaining({ body: '{"name":"Lease"}' }),
    );
  });
  it("disables colour save for invalid hex and shows empty states", async () => {
    const user = userEvent.setup();
    renderScreen({ income: [], expense: [] });
    expect(
      screen.getByText("Create a category to get started."),
    ).toBeInTheDocument();
    renderScreen();
    await user.click(
      screen.getByRole("button", { name: "Change colour for Rent" }),
    );
    const hex = screen.getByLabelText("Hex colour");
    await user.clear(hex);
    await user.type(hex, "nope");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("lets a valid colour be saved again after a failed request", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { error: { code: "internal", message: "Try again." } },
          { status: 500 },
        ),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    renderScreen();
    await user.click(
      screen.getByRole("button", { name: "Change colour for Rent" }),
    );
    const picker = screen.getByRole("dialog", {
      name: "Change category colour",
    });
    const hex = within(picker).getByLabelText("Hex colour");
    await user.clear(hex);
    await user.type(hex, "#AABBCC");
    await user.click(within(picker).getByRole("button", { name: "Save" }));
    expect(within(picker).getByText("Try again.")).toBeInTheDocument();
    const save = within(picker).getByRole("button", { name: "Save" });
    expect(save).toBeEnabled();
    await user.click(save);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(picker).not.toBeInTheDocument();
  });

  it("drops an unfinished item draft when another category is selected", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const groceries = {
      ...rent,
      id: "groceries",
      name: "Groceries",
      itemCount: 0,
      items: [],
    };
    const { rerender } = renderScreen({ expense: [rent, groceries] });
    await user.click(screen.getByText("+ add item"));
    await user.type(screen.getByLabelText("New item name"), "Lease");
    await user.click(screen.getByRole("button", { name: "Groceries" }));
    expect(screen.queryByLabelText("New item name")).not.toBeInTheDocument();
    await user.click(screen.getByText("+ add item"));
    expect(screen.getByLabelText("New item name")).toHaveValue("");

    // A category archived while its draft is open shows no editable input.
    rerender(
      <CategoriesScreen
        income={[salary]}
        expense={[
          rent,
          {
            ...groceries,
            archived: true,
            archivedAt: "2026-01-01T00:00:00.000Z",
          },
        ]}
      />,
    );
    expect(screen.queryByLabelText("New item name")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ add item" })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows duplicate errors without changing names and supports item rename cancellation", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { code: "duplicate_name", message: "Already used." } },
            { status: 409 },
          ),
        ),
    );
    renderScreen();
    await user.click(screen.getByRole("button", { name: "Edit Rent" }));
    const categoryInput = screen.getByLabelText("Rename Rent");
    await user.clear(categoryInput);
    await user.type(categoryInput, "Home{Enter}");
    expect(screen.getByText("Already used.")).toBeInTheDocument();
    expect(categoryInput).toHaveValue("Rent");
    await user.click(screen.getByRole("button", { name: "Apartment" }));
    const itemInput = screen.getByLabelText("Rename Apartment");
    await user.type(itemInput, " Lease{Escape}");
    expect(
      screen.getByRole("button", { name: "Apartment" }),
    ).toBeInTheDocument();
  });

  it("keeps swatches square and closes the colour picker with Escape or outside click", async () => {
    const user = userEvent.setup();
    renderScreen();
    const swatch = screen.getByRole("button", {
      name: "Change colour for Rent",
    });
    expect(swatch).toHaveClass("rounded-celia-swatch");
    await user.click(swatch);
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Change category colour" }),
    ).not.toBeInTheDocument();
    expect(swatch).toHaveFocus();
    await user.click(swatch);
    await user.click(document.body);
    expect(
      screen.queryByRole("dialog", { name: "Change category colour" }),
    ).not.toBeInTheDocument();
  });

  it("keeps Tab inside the colour picker and still closes it with Escape", async () => {
    const user = userEvent.setup();
    renderScreen();
    const swatch = screen.getByRole("button", {
      name: "Change colour for Rent",
    });
    await user.click(swatch);
    const picker = screen.getByRole("dialog", {
      name: "Change category colour",
    });
    const first = within(picker).getByLabelText("Colour picker");
    const last = within(picker).getByRole("button", { name: "Save" });
    expect(first).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab();
    expect(within(picker).getByLabelText("Hex colour")).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(picker).not.toBeInTheDocument();
    expect(swatch).toHaveFocus();
  });

  it("moves focus itself on every Tab in the colour picker", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(
      screen.getByRole("button", { name: "Change colour for Rent" }),
    );
    const picker = screen.getByRole("dialog", {
      name: "Change category colour",
    });
    const first = within(picker).getByLabelText("Colour picker");
    const hex = within(picker).getByLabelText("Hex colour");
    const cancel = within(picker).getByRole("button", { name: "Cancel" });
    const save = within(picker).getByRole("button", { name: "Save" });
    // fireEvent has no default action, so focus moves only if the trap moves
    // it. The trap must not rely on the browser's own Tab order, which skips
    // buttons on some platforms (macOS Safari) and would leave the popover.
    const tab = (shiftKey = false) =>
      fireEvent.keyDown(document.activeElement as Element, {
        key: "Tab",
        shiftKey,
      });
    expect(first).toHaveFocus();
    for (const control of [hex, cancel, save, first]) {
      expect(tab()).toBe(false);
      expect(control).toHaveFocus();
    }
    for (const control of [save, cancel, hex, first]) {
      expect(tab(true)).toBe(false);
      expect(control).toHaveFocus();
    }
  });

  it("skips a disabled Save and recovers focus that falls out of the colour picker", async () => {
    const user = userEvent.setup();
    renderScreen();
    const swatch = screen.getByRole("button", {
      name: "Change colour for Rent",
    });
    await user.click(swatch);
    const picker = screen.getByRole("dialog", {
      name: "Change category colour",
    });
    const first = within(picker).getByLabelText("Colour picker");
    const hex = within(picker).getByLabelText("Hex colour");
    await user.clear(hex);
    await user.type(hex, "nope");
    expect(within(picker).getByRole("button", { name: "Save" })).toBeDisabled();
    await user.tab();
    expect(
      within(picker).getByRole("button", { name: "Cancel" }),
    ).toHaveFocus();
    await user.tab();
    expect(first).toHaveFocus();
    // Focus can still land on <body>, for example when a focused control
    // becomes disabled; Tab and Escape must keep working from there.
    first.blur();
    await user.tab();
    expect(first).toHaveFocus();
    first.blur();
    await user.keyboard("{Escape}");
    expect(picker).not.toBeInTheDocument();
    expect(swatch).toHaveFocus();
  });
});

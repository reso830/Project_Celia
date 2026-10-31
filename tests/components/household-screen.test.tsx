import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import HouseholdScreen from "@/components/household/household-screen";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

const defaults = { owner: "Household", currency: "PHP" };
const ana = { id: "ana", name: "Ana", archivedAt: null };
const bea = { id: "bea", name: "Bea", archivedAt: null };
const miguel = {
  id: "miguel",
  name: "Miguel",
  archivedAt: "2026-09-28T00:00:00.000Z",
};

function renderScreen(
  props: Partial<React.ComponentProps<typeof HouseholdScreen>> = {},
) {
  return render(
    <HouseholdScreen
      members={[]}
      archivedMembers={[]}
      defaults={defaults}
      {...props}
    />,
  );
}

afterEach(() => {
  cleanup();
  navigation.refresh.mockReset();
  vi.unstubAllGlobals();
});

describe("Household screen", () => {
  it("shows the empty-member CTA, empty financial panels, and defaults", () => {
    renderScreen();

    expect(
      screen.getByRole("button", { name: "+ Add member" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("No entries yet.")).toHaveLength(1);
    expect(screen.getByText("New entries owned by")).toBeInTheDocument();
    expect(
      screen.getByText("Household", { selector: "dd" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Currency")).toBeInTheDocument();
    expect(screen.getByText("PHP")).toBeInTheDocument();
    expect(screen.getByText("Active model")).toBeInTheDocument();
    expect(screen.getByText("Not set")).toBeInTheDocument();
    expect(screen.queryByText(/₱/)).not.toBeInTheDocument();
  });

  it("validates a blank member name before sending a request", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderScreen();

    await user.click(screen.getByRole("button", { name: "+ Add member" }));
    await user.type(screen.getByLabelText("New member name"), " {Enter}");

    expect(screen.getByText("Name is required.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows empty financial cells for each member", () => {
    renderScreen({ members: [ana] });

    expect(screen.getAllByText("No entries yet.")).toHaveLength(3);
  });

  it("adds and renames members with Enter", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    renderScreen({ members: [ana] });

    await user.click(screen.getByRole("button", { name: "+ Add member" }));
    const addInput = screen.getByLabelText("New member name");
    await user.type(addInput, "Bea{Enter}");
    await user.click(screen.getByRole("button", { name: "Edit Ana" }));
    const renameInput = screen.getByLabelText("Rename Ana");
    await user.clear(renameInput);
    await user.type(renameInput, "Ana Maria{Enter}");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/members",
      expect.objectContaining({ method: "POST", body: '{"name":"Bea"}' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/members/ana",
      expect.objectContaining({
        method: "PATCH",
        body: '{"name":"Ana Maria"}',
      }),
    );
    expect(navigation.refresh).toHaveBeenCalledTimes(2);
  });

  it("cancels a rename with Escape and keeps the displayed name", async () => {
    const user = userEvent.setup();
    renderScreen({ members: [ana] });

    await user.click(screen.getByRole("button", { name: "Edit Ana" }));
    await user.type(screen.getByLabelText("Rename Ana"), " Maria{Escape}");

    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.queryByLabelText("Rename Ana")).not.toBeInTheDocument();
  });

  it("archives and restores members through confirmation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    renderScreen({ members: [ana], archivedMembers: [miguel] });

    await user.click(screen.getByRole("button", { name: "Remove Ana" }));
    await user.click(screen.getByRole("button", { name: "Archive member" }));
    await user.click(screen.getByText("Archived members (1)"));
    await user.click(screen.getByRole("button", { name: "Restore Miguel" }));
    await user.click(screen.getByRole("button", { name: "Restore member" }));

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/members/ana/archive",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/members/miguel/restore",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows a 409 inline error without replacing the displayed member", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              code: "duplicate_name",
              message: "A member already has that name.",
            },
          },
          { status: 409 },
        ),
      ),
    );
    renderScreen({ members: [ana] });

    await user.click(screen.getByRole("button", { name: "Edit Ana" }));
    const input = screen.getByLabelText("Rename Ana");
    await user.clear(input);
    await user.type(input, "Bea{Enter}");

    expect(
      screen.getByText("A member already has that name."),
    ).toBeInTheDocument();
    expect(input).toHaveValue("Ana");
  });

  it("shows an inline error for a failed network mutation", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    renderScreen({ members: [ana] });

    await user.click(screen.getByRole("button", { name: "Edit Ana" }));
    const input = screen.getByLabelText("Rename Ana");
    await user.clear(input);
    await user.type(input, "Bea{Enter}");

    expect(
      screen.getByText("Unable to save changes. Please try again."),
    ).toBeInTheDocument();
    expect(input).toHaveValue("Ana");
  });

  it("counts active members only", () => {
    renderScreen({ members: [ana], archivedMembers: [miguel] });

    expect(screen.getByText("1 member")).toBeInTheDocument();
  });

  it.each([
    ["0 members", []],
    ["1 member", [ana]],
    ["2 members", [ana, bea]],
  ])("shows %s in the members header", (label, members) => {
    renderScreen({ members });

    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

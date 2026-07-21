import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { DataStateGate } from "@/components/data-state-gate";
import { SettingsPage } from "@/components/settings-page";
import { DataProvider, type DataRepositories } from "@/data";
import type { MemberRepository } from "@/data/member-repository";

function repositories(members: MemberRepository): DataRepositories {
  return {
    members,
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

function renderSettings(
  memberRepository: DataRepositories["members"] = {
    get: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  },
) {
  return render(
    <DataProvider createRepositories={() => repositories(memberRepository)}>
      <DataStateGate>
        <SettingsPage />
      </DataStateGate>
    </DataProvider>,
  );
}

describe("SettingsPage", () => {
  it("renders the buckets and household empty states", async () => {
    renderSettings();

    expect(
      await screen.findByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("heading", { name: "Buckets" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No buckets yet.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Household" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Household Members" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No household members yet.")).toBeInTheDocument();
  });

  it("adds a trimmed member and persists it", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    renderSettings({
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save,
      delete: vi.fn(),
    });

    await user.type(await screen.findByLabelText("Member name"), "  Alex  ");
    await user.click(await screen.findByRole("button", { name: "Add member" }));

    expect(await screen.findByText("Alex")).toBeInTheDocument();
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Alex" }),
    );
  });

  it("shows validation errors for blank and duplicate names", async () => {
    const user = userEvent.setup();
    renderSettings({
      get: vi.fn(),
      list: vi
        .fn()
        .mockResolvedValue([{ id: "alex", name: "Alex", color: "#2463eb" }]),
      save: vi.fn(),
      delete: vi.fn(),
    });

    await user.click(await screen.findByRole("button", { name: "Add member" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a household member name.",
    );

    await user.type(screen.getByLabelText("Member name"), "alex");
    await user.click(screen.getByRole("button", { name: "Add member" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "That household member already exists.",
    );
  });

  it("deletes a member from the persisted list", async () => {
    const user = userEvent.setup();
    const remove = vi.fn().mockResolvedValue(undefined);
    renderSettings({
      get: vi.fn(),
      list: vi
        .fn()
        .mockResolvedValue([{ id: "alex", name: "Alex", color: "#2463eb" }]),
      save: vi.fn(),
      delete: remove,
    });

    await user.click(
      await screen.findByRole("button", { name: "Delete Alex" }),
    );

    expect(remove).toHaveBeenCalledWith("alex");
    expect(screen.queryByText("Alex")).not.toBeInTheDocument();
    expect(screen.getByText("No household members yet.")).toBeInTheDocument();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { DataStateGate } from "@/components/data-state-gate";
import { SettingsPage } from "@/components/settings-page";
import { DataProvider, type DataRepositories } from "@/data";
import type { MemberRepository } from "@/data/member-repository";

const defaultMemberRepository: MemberRepository = {
  get: vi.fn(),
  list: vi.fn().mockResolvedValue([]),
  save: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
};

function repositories(
  members: MemberRepository = defaultMemberRepository,
  categories: DataRepositories["categories"] = {
    get: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    save: vi.fn(),
    delete: vi.fn(),
  },
  bucketGroups: DataRepositories["bucketGroups"] = {
    get: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    save: vi.fn(),
    delete: vi.fn(),
  },
): DataRepositories {
  return {
    members,
    categories,
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
    bucketGroups,
  };
}

function renderSettings(
  memberRepository:
    DataRepositories["members"] | DataRepositories = defaultMemberRepository,
  categories?: DataRepositories["categories"],
  bucketGroups?: DataRepositories["bucketGroups"],
) {
  const dataRepositories =
    "members" in memberRepository
      ? memberRepository
      : repositories(memberRepository, categories, bucketGroups);

  return render(
    <DataProvider createRepositories={() => dataRepositories}>
      <DataStateGate>
        <SettingsPage />
      </DataStateGate>
    </DataProvider>,
  );
}

describe("SettingsPage", () => {
  it("creates an expense Housing bucket with Rent as its first subcategory", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    renderSettings(undefined, {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save,
      delete: vi.fn(),
    });

    await user.type(await screen.findByLabelText("Group name"), " Housing ");
    await user.type(screen.getByLabelText("First subcategory"), " Rent ");
    await user.click(screen.getByRole("button", { name: "Add bucket" }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "expense",
          group: "Housing",
          name: "Rent",
        }),
      ),
    );
    expect(
      screen.getByRole("heading", { name: "Housing" }),
    ).toBeInTheDocument();
  });

  it("alerts when the bucket form is blank", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(await screen.findByRole("button", { name: "Add bucket" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Group name and first subcategory are required.",
    );
  });

  it("rejects a case-insensitive duplicate expense bucket name", async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    renderSettings(undefined, {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([
        {
          id: "housing-rent",
          type: "expense",
          group: "Housing",
          name: "Rent",
        },
      ]),
      save,
      delete: vi.fn(),
    });

    await user.type(await screen.findByLabelText("Group name"), "housing");
    await user.type(screen.getByLabelText("First subcategory"), "Mortgage");
    await user.click(screen.getByRole("button", { name: "Add bucket" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "An expense bucket named Housing already exists.",
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("allows income and expense buckets to share a group name", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    renderSettings(undefined, {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([
        {
          id: "housing-rent",
          type: "expense",
          group: "Housing",
          name: "Rent",
        },
      ]),
      save,
      delete: vi.fn(),
    });

    await user.type(await screen.findByLabelText("Group name"), "Housing");
    await user.type(screen.getByLabelText("First subcategory"), "Salary");
    await user.selectOptions(screen.getByLabelText("Type"), "income");
    await user.click(screen.getByRole("button", { name: "Add bucket" }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "income",
          group: "Housing",
          name: "Salary",
        }),
      ),
    );
  });

  it("prevents a second bucket save while the first save is pending", async () => {
    const dataRepositories = repositories();
    let resolveSave: (() => void) | undefined;
    dataRepositories.categories.save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    renderSettings(dataRepositories);

    fireEvent.change(await screen.findByLabelText("Group name"), {
      target: { value: "Housing" },
    });
    fireEvent.change(screen.getByLabelText("First subcategory"), {
      target: { value: "Rent" },
    });
    const addBucket = screen.getByRole("button", { name: "Add bucket" });
    fireEvent.click(addBucket);
    await waitFor(() =>
      expect(dataRepositories.categories.save).toHaveBeenCalledTimes(1),
    );
    fireEvent.click(addBucket);

    expect(dataRepositories.categories.save).toHaveBeenCalledTimes(1);
    expect(addBucket).toBeDisabled();

    resolveSave?.();

    await waitFor(() => expect(addBucket).not.toBeDisabled());
  });

  it("keeps the bucket form values and shows an error when saving fails", async () => {
    const user = userEvent.setup();
    const dataRepositories = repositories();
    dataRepositories.categories.save = vi
      .fn()
      .mockRejectedValue(new Error("IndexedDB unavailable"));
    renderSettings(dataRepositories);

    await user.type(await screen.findByLabelText("Group name"), "Housing");
    await user.type(screen.getByLabelText("First subcategory"), "Rent");
    await user.click(screen.getByRole("button", { name: "Add bucket" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to save this bucket. Please try again.",
    );
    expect(screen.getByLabelText("Group name")).toHaveValue("Housing");
    expect(screen.getByLabelText("First subcategory")).toHaveValue("Rent");
  });

  it("renders an existing bucket group", async () => {
    const dataRepositories = repositories();
    dataRepositories.categories.list = vi
      .fn()
      .mockResolvedValue([
        { id: "housing-rent", type: "expense", group: "Housing", name: "Rent" },
      ]);
    renderSettings(dataRepositories);

    expect(
      await screen.findByRole("heading", { name: "Housing" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Housing" }).parentElement,
    ).toHaveTextContent("Expense");
    expect(screen.queryByText("No buckets yet.")).not.toBeInTheDocument();
  });

  it("renders every saved subcategory in one configured bucket card", async () => {
    renderSettings(undefined, {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([
        { id: "rent", type: "expense", group: "Housing", name: "Rent" },
        { id: "power", type: "expense", group: "housing", name: "Power" },
      ]),
      save: vi.fn(),
      delete: vi.fn(),
    });

    const card = await screen.findByRole("article", {
      name: "Expense Housing",
    });
    expect(card).toHaveTextContent("Rent");
    expect(card).toHaveTextContent("Power");
  });

  it("adds a trimmed subcategory to a persisted bucket group", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    renderSettings(
      undefined,
      {
        get: vi.fn(),
        list: vi
          .fn()
          .mockResolvedValue([
            { id: "rent", type: "expense", group: "Housing", name: "Rent" },
          ]),
        save,
        delete: vi.fn(),
      },
      {
        get: vi.fn(),
        list: vi
          .fn()
          .mockResolvedValue([
            { id: "expense-housing", type: "expense", name: "Housing" },
          ]),
        save: vi.fn(),
        delete: vi.fn(),
      },
    );

    await user.type(
      await screen.findByLabelText("Add subcategory to Housing"),
      " Power ",
    );
    await user.click(screen.getByRole("button", { name: "Add subcategory" }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "expense",
          group: "Housing",
          name: "Power",
        }),
      ),
    );
  });

  it("rejects blank and duplicate subcategory names", async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    renderSettings(
      undefined,
      {
        get: vi.fn(),
        list: vi
          .fn()
          .mockResolvedValue([
            { id: "rent", type: "expense", group: "Housing", name: "Rent" },
          ]),
        save,
        delete: vi.fn(),
      },
      {
        get: vi.fn(),
        list: vi
          .fn()
          .mockResolvedValue([
            { id: "expense-housing", type: "expense", name: "Housing" },
          ]),
        save: vi.fn(),
        delete: vi.fn(),
      },
    );

    const input = await screen.findByLabelText("Add subcategory to Housing");
    await user.click(screen.getByRole("button", { name: "Add subcategory" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a subcategory name.",
    );
    await user.type(input, "rent");
    await user.click(screen.getByRole("button", { name: "Add subcategory" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "That subcategory already exists in Housing.",
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("deletes the final subcategory but retains its bucket group", async () => {
    const user = userEvent.setup();
    const remove = vi.fn().mockResolvedValue(undefined);
    renderSettings(
      undefined,
      {
        get: vi.fn(),
        list: vi
          .fn()
          .mockResolvedValue([
            { id: "rent", type: "expense", group: "Housing", name: "Rent" },
          ]),
        save: vi.fn(),
        delete: remove,
      },
      {
        get: vi.fn(),
        list: vi
          .fn()
          .mockResolvedValue([
            { id: "expense-housing", type: "expense", name: "Housing" },
          ]),
        save: vi.fn(),
        delete: vi.fn(),
      },
    );

    await user.click(
      await screen.findByRole("button", { name: "Delete Rent" }),
    );

    await waitFor(() => expect(remove).toHaveBeenCalledWith("rent"));
    expect(
      screen.getByRole("article", { name: "Expense Housing" }),
    ).toHaveTextContent("No subcategories yet.");
  });

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

  it("keeps member changes when the settings page remounts", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    const memberRepository = {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save,
      delete: vi.fn(),
    };
    const createRepositories = () => repositories(memberRepository);
    const view = render(
      <DataProvider createRepositories={createRepositories}>
        <DataStateGate>
          <SettingsPage />
        </DataStateGate>
      </DataProvider>,
    );

    await user.type(await screen.findByLabelText("Member name"), "Alex");
    await user.click(await screen.findByRole("button", { name: "Add member" }));
    await screen.findByText("Alex");

    view.rerender(
      <DataProvider createRepositories={createRepositories}>
        <DataStateGate>
          <p>Elsewhere</p>
        </DataStateGate>
      </DataProvider>,
    );
    view.rerender(
      <DataProvider createRepositories={createRepositories}>
        <DataStateGate>
          <SettingsPage />
        </DataStateGate>
      </DataProvider>,
    );

    expect(await screen.findByText("Alex")).toBeInTheDocument();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("reuses a released color before duplicating one", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    renderSettings({
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([
        { id: "alex", name: "Alex", color: "#2463eb" },
        { id: "blair", name: "Blair", color: "#9333ea" },
        { id: "casey", name: "Casey", color: "#db2777" },
        { id: "drew", name: "Drew", color: "#0f766e" },
      ]),
      save,
      delete: vi.fn().mockResolvedValue(undefined),
    });

    await user.click(
      await screen.findByRole("button", { name: "Delete Blair" }),
    );
    await user.type(await screen.findByLabelText("Member name"), "Ellis");
    await user.click(await screen.findByRole("button", { name: "Add member" }));

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ color: "#9333ea" }),
    );
  });
});

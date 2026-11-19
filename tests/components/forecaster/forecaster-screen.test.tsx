import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ForecasterError from "@/app/(shell)/forecaster/error";
import ForecasterLoading from "@/app/(shell)/forecaster/loading";
import { ForecasterScreen } from "@/components/forecaster/forecaster-screen";
import type {
  ForecasterViewData,
  ScenarioWithRelations,
} from "@/domain/forecaster";
import {
  calculate24MonthOutlook,
  calculateScenarioMetrics,
} from "@/domain/forecaster-calculations";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const baseline: ScenarioWithRelations = {
  id: "baseline",
  name: "Baseline 2026",
  shortLabel: "BASELINE",
  paletteKey: null,
  isBaseline: true,
  startMonth: 0,
  drawAmount: 0,
  displayOrder: 0,
  createdAt: "",
  updatedAt: "",
  events: [],
  nudges: [],
};
const scenarioA: ScenarioWithRelations = {
  ...baseline,
  id: "a",
  name: "A · Buy now",
  shortLabel: "A",
  paletteKey: "teal",
  isBaseline: false,
  displayOrder: 1,
  startMonth: 5,
  drawAmount: 9_850_000,
};
const scenarioB: ScenarioWithRelations = {
  ...scenarioA,
  id: "b",
  name: "B · Wait",
  shortLabel: "B",
  paletteKey: "purple",
  displayOrder: 2,
  drawAmount: 0,
};
const baselineMetrics: ForecasterViewData["baselineMetrics"] = {
  planId: "applied",
  modelName: baseline.name,
  monthlyIncome: 11_950_000,
  monthlyExpense: 7_900_000,
  monthlySavings: 2_000_000,
  monthlyUnallocated: 2_050_000,
  startingBuffer: 46_600_000,
  runwayMonths: 5.9,
  verdict: { tier: "Tight but doable", statusTone: "warning" },
};
const scenarios = [baseline, scenarioA, scenarioB];
const data: ForecasterViewData = {
  baselineName: baseline.name,
  appliedMonthKey: "2026-11",
  hasAppliedPlan: true,
  activeScenarioId: "baseline",
  scenarios,
  baselineMetrics,
  nudgeTargets: [
    {
      targetType: "category",
      categoryId: "groceries",
      bucketId: null,
      name: "Groceries",
      isArchived: false,
      baseAllocation: 2_000_000,
    },
  ],
  selectedMetrics: calculateScenarioMetrics(baselineMetrics, baseline),
  comparisonMetrics: scenarios.map((scenario) =>
    calculateScenarioMetrics(baselineMetrics, scenario),
  ),
  outlook: calculate24MonthOutlook(
    baselineMetrics.monthlyUnallocated,
    scenarios,
    "2026-11",
  ),
};
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  window.history.replaceState(null, "", "/forecaster");
  fetchMock.mockReset();
  refresh.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

it("renders baseline details, follows selection, and updates the URL and plot emphasis", async () => {
  const user = userEvent.setup();
  const { container } = render(<ForecasterScreen data={data} />);
  expect(
    screen.getByText("No events — this is the baseline."),
  ).toBeInTheDocument();
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(container.querySelectorAll(".rounded-t-\\[2px\\]")).toHaveLength(24);
  expect(screen.getByRole("button", { name: baseline.name })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await user.click(screen.getByRole("button", { name: scenarioA.name }));
  expect(screen.getByRole("button", { name: scenarioA.name })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(window.location.search).toBe("?scenario=a");
  expect(screen.getByText("₱98,500 drawn from the buffer")).toBeInTheDocument();
  const lines = container.querySelectorAll("polyline");
  expect(lines[0]).toHaveAttribute("opacity", "1");
  expect(lines[1]).toHaveAttribute("opacity", "0.35");
  window.history.replaceState(null, "", "/forecaster?scenario=baseline");
  fireEvent.popState(window);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: baseline.name })).toHaveAttribute(
      "aria-pressed",
      "true",
    ),
  );
});

it("renders the empty state, loading skeleton, and route retry", async () => {
  const user = userEvent.setup();
  const retry = vi.fn();
  const { rerender } = render(
    <ForecasterScreen data={{ ...data, hasAppliedPlan: false }} />,
  );
  expect(
    screen.getByText("No budget applied for November 2026."),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /budget model/i })).toHaveAttribute(
    "href",
    "/models",
  );
  rerender(<ForecasterLoading />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading forecaster");
  rerender(
    <ForecasterError error={new Error("private detail")} retry={retry} />,
  );
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledOnce();
});

it("keeps the newer optimistic change and flushes queued PUTs before switching", async () => {
  const user = userEvent.setup();
  const responses: ((response: Response) => void)[] = [];
  fetchMock.mockImplementation(
    () => new Promise((resolve) => responses.push(resolve)),
  );
  render(<ForecasterScreen data={data} />);
  await user.click(screen.getByRole("button", { name: scenarioA.name }));
  const decrease = screen.getByRole("button", {
    name: "Decrease Groceries allocation",
  });
  await user.click(decrease);
  await user.click(decrease);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: scenarioB.name }));
  expect(
    screen.getByText("Saving budget changes before switching…"),
  ).toBeInTheDocument();
  expect(window.location.search).toBe("?scenario=a");
  await act(async () =>
    responses[0](
      Response.json({ error: { message: "Write failed" } }, { status: 409 }),
    ),
  );
  expect(screen.getByText("+₱1,000 freed")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    "/api/scenarios/a/nudges",
    expect.objectContaining({
      method: "PUT",
      body: expect.stringContaining('"deltaAmount":-100000'),
    }),
  );
  expect(screen.getByText("Write failed")).toHaveAttribute("role", "alert");
  await act(async () => responses[1](Response.json({})));
  await waitFor(() => expect(window.location.search).toBe("?scenario=b"));
  expect(screen.getByRole("button", { name: scenarioB.name })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

it("saves and deletes events through the modal", async () => {
  const user = userEvent.setup();
  const event = {
    id: "event-1",
    scenarioId: "a",
    name: "Insurance",
    type: "seasonal",
    monthlyAmount: 80_050,
    description: null,
  };
  fetchMock
    .mockResolvedValueOnce(Response.json(event, { status: 201 }))
    .mockResolvedValueOnce(Response.json({ success: true }));
  render(<ForecasterScreen data={data} />);
  await user.click(screen.getByRole("button", { name: scenarioA.name }));
  await user.click(screen.getByRole("button", { name: "+ add event" }));
  expect(screen.getByRole("dialog", { name: "Add event" })).toBeInTheDocument();
  await user.type(screen.getByLabelText("Event name"), "Insurance");
  await user.selectOptions(screen.getByLabelText("Event type"), "seasonal");
  expect(screen.getByText(/monthly equivalent/i)).toBeInTheDocument();
  await user.type(screen.getByLabelText("Monthly amount (₱)"), "0");
  await user.click(screen.getByRole("button", { name: "Save event" }));
  expect(screen.getByRole("alert")).toHaveTextContent(/above zero/i);
  expect(fetchMock).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText("Monthly amount (₱)"));
  await user.type(screen.getByLabelText("Monthly amount (₱)"), "800.50");
  await user.click(screen.getByRole("button", { name: "Save event" }));
  expect(await screen.findByText("−₱800.50/mo")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenNthCalledWith(
    1,
    "/api/scenarios/a/events",
    expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"monthlyAmount":80050'),
    }),
  );
  await user.click(screen.getByRole("button", { name: "Edit Insurance" }));
  await user.click(screen.getByRole("button", { name: "Delete event" }));
  expect(screen.getByText("Delete “Insurance”?")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole("button", { name: "Confirm delete" }));
  expect(await screen.findByText("No events yet.")).toBeInTheDocument();
});

it("creates and duplicates scenarios, and closes the modal on native cancel", async () => {
  const user = userEvent.setup();
  const created = {
    ...scenarioA,
    id: "new",
    name: "New car",
    shortLabel: "NEW",
    startMonth: 0,
    drawAmount: 0,
  };
  const copy = { ...created, id: "copy", name: "New car (Copy)" };
  fetchMock
    .mockResolvedValueOnce(Response.json(created, { status: 201 }))
    .mockResolvedValueOnce(Response.json(copy, { status: 201 }))
    .mockResolvedValueOnce(Response.json({ ...copy, name: "Revised car" }))
    .mockResolvedValueOnce(Response.json({ success: true }));
  render(<ForecasterScreen data={data} />);
  await user.click(screen.getByRole("button", { name: "+ scenario" }));
  fireEvent(
    screen.getByRole("dialog", { name: "Create scenario" }),
    new Event("cancel", { cancelable: true }),
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "+ scenario" }));
  await user.type(screen.getByLabelText("Name", { exact: true }), "New car");
  await user.type(screen.getByLabelText("Short label"), "new");
  await user.click(screen.getByRole("radio", { name: /slate/i }));
  expect(screen.getByRole("radio", { name: /slate/i })).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Save scenario" }));
  expect(
    await screen.findByRole("button", { name: "New car" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(refresh).toHaveBeenCalled();
  expect(fetchMock).toHaveBeenNthCalledWith(
    1,
    "/api/scenarios",
    expect.objectContaining({
      body: expect.stringMatching(/"shortLabel":"NEW".*"paletteKey":"slate"/),
    }),
  );
  await user.click(screen.getByRole("button", { name: "Scenario settings" }));
  await user.click(screen.getByRole("button", { name: "Duplicate" }));
  expect(
    await screen.findByRole("button", { name: "New car (Copy)" }),
  ).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "Scenario settings" }));
  const name = screen.getByLabelText("Name", { exact: true });
  await user.clear(name);
  await user.type(name, "Revised car");
  await user.click(screen.getByRole("button", { name: "Save scenario" }));
  expect(
    await screen.findByRole("button", { name: "Revised car" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Scenario settings" }));
  await user.click(screen.getByRole("button", { name: "Delete scenario" }));
  expect(
    screen.getByText(/events and budget nudges will also be deleted/i),
  ).toBeInTheDocument();
  const confirmation = screen.getByRole("dialog", { name: "Delete scenario?" });
  fireEvent(confirmation, new Event("cancel", { cancelable: true }));
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(
    screen.getByRole("dialog", { name: "Edit scenario" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Delete scenario" }));
  await user.click(screen.getByRole("button", { name: "Confirm delete" }));
  expect(
    await screen.findByText("No events — this is the baseline."),
  ).toBeInTheDocument();
  expect(window.location.search).toBe("?scenario=baseline");
});

it("applies fresh server scenarios and selection on same-page navigation", async () => {
  const user = userEvent.setup();
  const { rerender } = render(<ForecasterScreen data={data} />);
  await user.click(screen.getByRole("button", { name: scenarioA.name }));
  window.history.replaceState(null, "", "/forecaster");
  rerender(
    <ForecasterScreen
      data={{
        ...data,
        scenarios: [
          baseline,
          { ...scenarioA, name: "Refreshed loan" },
          scenarioB,
        ],
      }}
    />,
  );
  expect(screen.getByRole("button", { name: baseline.name })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    screen.getByRole("button", { name: "Refreshed loan" }),
  ).toBeInTheDocument();
  expect(window.location.search).toBe("");
  window.history.replaceState(null, "", "/forecaster?scenario=bad");
  rerender(<ForecasterScreen data={{ ...data }} />);
  expect(window.location.search).toBe("?scenario=baseline");
});

it("validates scenario text, integer start month, and draw before sending a request", async () => {
  const user = userEvent.setup();
  render(<ForecasterScreen data={data} />);
  await user.click(screen.getByRole("button", { name: "+ scenario" }));
  const save = screen.getByRole("button", { name: "Save scenario" });
  const name = screen.getByLabelText("Name", { exact: true });
  const label = screen.getByLabelText("Short label");
  const start = screen.getByLabelText("Start month offset");
  const draw = screen.getByLabelText("Draw amount (₱)");
  for (const value of [" ", "x".repeat(51)]) {
    fireEvent.change(name, { target: { value } });
    await user.click(save);
    expect(screen.getByRole("alert")).toHaveTextContent("1–50");
  }
  fireEvent.change(name, { target: { value: "Car" } });
  await user.click(save);
  expect(screen.getByRole("alert")).toHaveTextContent("1–20");
  fireEvent.change(label, { target: { value: "car" } });
  for (const value of ["24", "-1", "1.5"]) {
    fireEvent.change(start, { target: { value } });
    await user.click(save);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "start month from 0 to 23",
    );
  }
  fireEvent.change(start, { target: { value: "23" } });
  for (const value of ["-1", "bad"]) {
    fireEvent.change(draw, { target: { value } });
    await user.click(save);
    expect(screen.getByRole("alert")).toHaveTextContent(/non-negative/);
  }
  expect(fetchMock).not.toHaveBeenCalled();
});

it("keeps an event and its confirmation open after a network failure", async () => {
  const user = userEvent.setup();
  const event = {
    id: "event",
    scenarioId: "a",
    name: "Insurance",
    type: "recurring" as const,
    monthlyAmount: 100,
    description: null,
    updatedAt: "",
    createdAt: "",
  };
  fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  render(
    <ForecasterScreen
      data={{
        ...data,
        activeScenarioId: "a",
        scenarios: [baseline, { ...scenarioA, events: [event] }],
      }}
    />,
  );
  await user.click(screen.getByRole("button", { name: "+ add event" }));
  await user.click(screen.getByRole("button", { name: "Save event" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Enter an event name.");
  expect(fetchMock).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Close Add event" }));
  await user.click(screen.getByRole("button", { name: "Edit Insurance" }));
  await user.click(screen.getByRole("button", { name: "Delete event" }));
  await user.click(screen.getByRole("button", { name: "Confirm delete" }));
  expect(
    await screen.findByText("Unable to reach Celia. Please try again."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("dialog", { name: "Delete event?" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Edit Insurance" }),
  ).toBeInTheDocument();
});

it("omits an unchanged long copy name and label when saving other settings", async () => {
  const user = userEvent.setup();
  const copy = {
    ...scenarioA,
    name: `${"x".repeat(50)} (Copy)`,
    shortLabel: `${"X".repeat(20)} (COPY)`,
  };
  fetchMock.mockResolvedValueOnce(Response.json(copy));
  render(
    <ForecasterScreen
      data={{ ...data, activeScenarioId: "a", scenarios: [baseline, copy] }}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Scenario settings" }));
  await user.click(screen.getByRole("button", { name: "Save scenario" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
  expect(body).not.toHaveProperty("name");
  expect(body).not.toHaveProperty("shortLabel");
});

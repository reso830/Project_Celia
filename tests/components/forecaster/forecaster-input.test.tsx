import { createRef } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import {
  BudgetNudgesCard,
  type BudgetNudgesHandle,
} from "@/components/forecaster/budget-nudges-card";
import { ScenarioChips } from "@/components/forecaster/scenario-chips";
import { WhatChangesCard } from "@/components/forecaster/what-changes-card";
import type {
  ForecasterNudgeTarget,
  ScenarioWithRelations,
} from "@/domain/forecaster";

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
const loan: ScenarioWithRelations = {
  ...baseline,
  id: "a",
  name: "A · Buy now",
  shortLabel: "A · LOAN",
  paletteKey: "teal",
  isBaseline: false,
  displayOrder: 1,
  events: [
    {
      id: "event",
      scenarioId: "a",
      name: "Insurance",
      type: "seasonal",
      monthlyAmount: 80_000,
      description: null,
      createdAt: "",
      updatedAt: "",
    },
  ],
};
const groceries: ForecasterNudgeTarget = {
  targetType: "category",
  categoryId: "groceries",
  bucketId: null,
  name: "Groceries",
  isArchived: false,
  baseAllocation: 100_000,
};

it("selects and creates scenarios with native keyboard controls", async () => {
  const user = userEvent.setup();
  const select = vi.fn();
  const create = vi.fn();
  render(
    <ScenarioChips
      scenarios={[baseline, loan]}
      activeScenarioId="baseline"
      onSelectScenario={select}
      onCreateScenario={create}
    />,
  );
  expect(screen.getByRole("button", { name: baseline.name })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await user.tab();
  await user.tab();
  await user.keyboard("{Enter}");
  expect(select).toHaveBeenCalledWith("a");
  await user.tab();
  await user.keyboard(" ");
  expect(create).toHaveBeenCalledOnce();
});

it("shows event costs, opens event actions, and protects the baseline", async () => {
  const user = userEvent.setup();
  const edit = vi.fn();
  const add = vi.fn();
  const { rerender } = render(
    <WhatChangesCard scenario={loan} onEditEvent={edit} onAddEvent={add} />,
  );
  expect(screen.getByText("1 event")).toBeInTheDocument();
  expect(screen.getByText("−₱800/mo")).toBeInTheDocument();
  expect(screen.getByText("−₱800")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Edit Insurance" }));
  expect(edit).toHaveBeenCalledWith(loan.events[0]);
  await user.click(screen.getByRole("button", { name: "+ add event" }));
  expect(add).toHaveBeenCalledOnce();
  rerender(
    <WhatChangesCard scenario={baseline} onEditEvent={edit} onAddEvent={add} />,
  );
  expect(
    screen.getByText("No events — this is the baseline."),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "+ add event" }),
  ).not.toBeInTheDocument();
});

it("queues edits, preserves the newest draft on interim failure, and rolls back a terminal failure", async () => {
  const user = userEvent.setup();
  const ref = createRef<BudgetNudgesHandle>();
  const finish: { resolve: () => void; reject: (error: Error) => void }[] = [];
  const save = vi.fn(
    () =>
      new Promise<void>((resolve, reject) => finish.push({ resolve, reject })),
  );
  const onError = vi.fn();
  const onChange = vi.fn();
  render(
    <BudgetNudgesCard
      ref={ref}
      scenario={loan}
      targets={[groceries]}
      onSaveNudge={save}
      onNudgeChange={onChange}
      onSaveError={onError}
    />,
  );
  const plus = screen.getByRole("button", {
    name: "Increase Groceries allocation",
  });
  await user.click(plus);
  await user.click(plus);
  expect(save).toHaveBeenCalledTimes(1);
  expect(screen.getByText("−₱1,000 funded")).toBeInTheDocument();
  const flushed = vi.fn();
  const flush = ref.current!.flushPendingSaves().then(flushed);
  await act(async () => finish[0].reject(new Error("Could not save")));
  expect(save).toHaveBeenNthCalledWith(
    2,
    "a",
    expect.objectContaining({ categoryId: "groceries", deltaAmount: 100_000 }),
  );
  expect(screen.getByText("−₱1,000 funded")).toBeInTheDocument();
  expect(flushed).not.toHaveBeenCalled();
  await act(async () => finish[1].resolve());
  await flush;
  expect(flushed).toHaveBeenCalledOnce();
  await user.click(plus);
  await act(async () => finish[2].reject(new Error("Could not save again")));
  expect(onError).toHaveBeenCalledTimes(2);
  expect(onChange).toHaveBeenLastCalledWith(
    "a",
    expect.objectContaining({ deltaAmount: 100_000 }),
  );
  await waitFor(() =>
    expect(screen.getByText("−₱1,000 funded")).toBeInTheDocument(),
  );
});

it("combines saved nudge-only targets and disables archived or baseline controls", () => {
  const saved = {
    ...loan,
    nudges: [
      {
        id: "nudge",
        scenarioId: "a",
        targetType: "bucket" as const,
        categoryId: null,
        bucketId: "cash",
        deltaAmount: 50_000,
        updatedAt: "",
        targetName: "Cash",
        isArchived: true,
        baseAllocation: 0,
        adjustedAllocation: 50_000,
        freedAmount: -50_000,
      },
    ],
  };
  const props = {
    targets: [groceries],
    onSaveNudge: vi.fn(),
    onSaveError: vi.fn(),
  };
  const { rerender } = render(<BudgetNudgesCard {...props} scenario={saved} />);
  expect(screen.getByText("(archived)")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Increase Cash allocation" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Increase Groceries allocation" }),
  ).toBeEnabled();
  rerender(<BudgetNudgesCard {...props} scenario={baseline} />);
  expect(screen.queryByText("Cash")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Increase Groceries allocation" }),
  ).toBeDisabled();
});

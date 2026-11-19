"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/form-dialog";
import PageHeader from "@/components/shell/page-header";
import Toast from "@/components/ui/toast";
import type {
  ForecasterViewData,
  Scenario,
  ScenarioEvent,
  ScenarioNudge,
  ScenarioNudgeDerived,
  ScenarioWithRelations,
} from "@/domain/forecaster";
import {
  calculate24MonthOutlook,
  calculateScenarioMetrics,
  deriveNudgeAmounts,
} from "@/domain/forecaster-calculations";
import {
  BudgetNudgesCard,
  type BudgetNudgeInput,
  type BudgetNudgesHandle,
} from "./budget-nudges-card";
import { EventModal } from "./event-modal";
import { OutlookChart } from "./outlook-chart";
import { forecastCard } from "./presentation";
import { ScenarioChips } from "./scenario-chips";
import { ScenarioComparisonTable } from "./scenario-comparison-table";
import { ScenarioHeroCards } from "./scenario-hero-cards";
import { ScenarioModal } from "./scenario-modal";
import { WhatChangesCard } from "./what-changes-card";

type Modal =
  | { kind: "scenario"; scenario?: ScenarioWithRelations }
  | { kind: "event"; scenarioId: string; event?: ScenarioEvent };

const scenarioEndpoint = "/api/scenarios";
const scenarioPath = (id: string) =>
  `${scenarioEndpoint}/${encodeURIComponent(id)}`;
const monthFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Unable to save changes. Please try again.";

async function mutate<T>(
  url: string,
  method: string,
  body?: object,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal: AbortSignal.timeout(15_000),
      ...(body && {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    });
  } catch {
    throw new Error("Unable to reach Celia. Please try again.");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      payload?.error?.message ?? "Unable to save changes. Please try again.",
    );
  }
  return response.json().catch(() => {
    throw new Error("Unable to read the server response. Please try again.");
  }) as Promise<T>;
}

function updateScenarioUrl(id: string, replace = false) {
  const url = new URL(window.location.href);
  url.searchParams.set("scenario", id);
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}

function matchesTarget(a: BudgetNudgeInput, b: BudgetNudgeInput) {
  return (
    a.targetType === b.targetType &&
    a.categoryId === b.categoryId &&
    a.bucketId === b.bucketId
  );
}

function deriveNudge(
  data: ForecasterViewData,
  scenario: ScenarioWithRelations,
  input: BudgetNudgeInput,
  saved?: ScenarioNudge,
): ScenarioNudgeDerived | null {
  const prior = scenario.nudges.find((nudge) => matchesTarget(nudge, input));
  const target = data.nudgeTargets.find(
    (target) =>
      target.targetType === input.targetType &&
      target.categoryId === input.categoryId &&
      target.bucketId === input.bucketId,
  );
  if (!target && !prior) return null;
  const baseAllocation = target?.baseAllocation ?? prior!.baseAllocation;
  return {
    ...input,
    id:
      saved?.id ??
      prior?.id ??
      `${scenario.id}:${input.targetType}:${input.categoryId ?? input.bucketId}`,
    scenarioId: saved?.scenarioId ?? scenario.id,
    updatedAt: saved?.updatedAt ?? prior?.updatedAt ?? "",
    targetName: target?.name ?? prior!.targetName,
    isArchived: target?.isArchived ?? prior!.isArchived,
    baseAllocation,
    ...deriveNudgeAmounts(baseAllocation, input.deltaAmount),
  };
}

export function ForecasterScreen({ data }: { data: ForecasterViewData }) {
  const router = useRouter();
  const [scenarios, setScenarios] = useState(data.scenarios);
  const [activeId, setActiveId] = useState(data.activeScenarioId);
  const [snapshot, setSnapshot] = useState({ data, revision: 0 });
  const [switching, setSwitching] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [modal, setModal] = useState<Modal | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    kind: "success" | "error";
  } | null>(null);
  const queue = useRef<BudgetNudgesHandle>(null);
  const switchSequence = useRef(0);
  const dismissToast = useCallback(() => setToast(null), []);
  if (snapshot.data !== data) {
    setSnapshot({ data, revision: snapshot.revision + 1 });
    setScenarios(data.scenarios);
    setActiveId(data.activeScenarioId);
    setSwitching(false);
    setModal(null);
  }
  const scenario = scenarios.find(({ id }) => id === activeId) ?? scenarios[0];

  const selectScenario = useCallback(
    async (requestedId: string | null, syncUrl: boolean) => {
      const sequence = ++switchSequence.current;
      setSwitching(true);
      await queue.current?.flushPendingSaves();
      if (sequence !== switchSequence.current) return;
      const id =
        scenarios.find((item) => item.id === requestedId)?.id ?? "baseline";
      setActiveId(id);
      setSwitching(false);
      if (syncUrl) updateScenarioUrl(id);
      else if (requestedId !== null && requestedId !== id)
        updateScenarioUrl(id, true);
    },
    [scenarios],
  );

  useEffect(() => {
    switchSequence.current++;
    if (!data.hasAppliedPlan) return;
    const requested = new URLSearchParams(window.location.search).getAll(
      "scenario",
    );
    if (
      requested.length > 1 ||
      (requested.length === 1 &&
        !data.scenarios.some(({ id }) => id === requested[0]))
    ) {
      updateScenarioUrl(data.activeScenarioId, true);
    }
  }, [data]);

  useEffect(() => {
    const onPopState = () => {
      void selectScenario(
        new URLSearchParams(window.location.search).get("scenario"),
        false,
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [selectScenario]);

  function finish(message: string) {
    setModal(null);
    setToast({ message, kind: "success" });
    startRefresh(() => router.refresh());
  }

  function selectAfterMutation(id: string, replace = false) {
    switchSequence.current++;
    setSwitching(false);
    setActiveId(id);
    updateScenarioUrl(id, replace);
  }

  function changeNudge(
    id: string,
    input: BudgetNudgeInput,
    saved?: ScenarioNudge,
  ) {
    setScenarios((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const nudge = deriveNudge(data, item, input, saved);
        if (!nudge) return item;
        const index = item.nudges.findIndex((prior) =>
          matchesTarget(prior, input),
        );
        const nudges = [...item.nudges];
        if (index < 0) nudges.push(nudge);
        else nudges[index] = nudge;
        return { ...item, nudges };
      }),
    );
  }

  async function saveNudge(id: string, input: BudgetNudgeInput) {
    const saved = await mutate<ScenarioNudge>(
      `${scenarioPath(id)}/nudges`,
      "PUT",
      input,
    );
    // Keep the latest optimistic delta when an earlier save finishes.
    setScenarios((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              nudges: item.nudges.map((nudge) =>
                matchesTarget(nudge, input)
                  ? {
                      ...nudge,
                      id: saved.id ?? nudge.id,
                      updatedAt: saved.updatedAt ?? nudge.updatedAt,
                    }
                  : nudge,
              ),
            }
          : item,
      ),
    );
  }

  if (!data.hasAppliedPlan || !scenario) {
    const month = monthFormat.format(
      new Date(`${data.appliedMonthKey}-01T00:00:00Z`),
    );
    return (
      <>
        <PageHeader title="Forecaster" />
        <section className={forecastCard}>
          <h2 className="font-semibold">No budget applied for {month}.</h2>
          <Link
            href="/models"
            className="mt-2 inline-block text-celia-accent underline"
          >
            Open budget models
          </Link>
        </section>
      </>
    );
  }

  const comparisonMetrics = scenarios.map((item) =>
    calculateScenarioMetrics(data.baselineMetrics, item),
  );
  const selectedMetrics = comparisonMetrics.find(
    ({ scenarioId }) => scenarioId === scenario.id,
  )!;
  const outlook = calculate24MonthOutlook(
    data.baselineMetrics.monthlyUnallocated,
    scenarios,
    data.appliedMonthKey,
  );

  return (
    <>
      <PageHeader title="Forecaster" />
      {(switching || refreshing) && (
        <p role="status" className="mb-2 text-sm text-celia-muted">
          {switching
            ? "Saving budget changes before switching…"
            : "Refreshing forecast…"}
        </p>
      )}
      <fieldset className="min-w-0" disabled={refreshing || switching}>
        <ScenarioChips
          scenarios={scenarios}
          activeScenarioId={scenario.id}
          onSelectScenario={(id) => {
            if (id !== scenario.id) void selectScenario(id, true);
          }}
          onCreateScenario={() => setModal({ kind: "scenario" })}
        />
        <div className="grid min-w-0 items-start gap-3.5 min-[1100px]:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
          <div className="grid min-w-0 gap-3.5">
            <WhatChangesCard
              scenario={scenario}
              onAddEvent={() =>
                setModal({ kind: "event", scenarioId: scenario.id })
              }
              onEditEvent={(event) =>
                setModal({ kind: "event", scenarioId: scenario.id, event })
              }
            />
            <BudgetNudgesCard
              key={`${snapshot.revision}:${scenario.id}`}
              ref={queue}
              scenario={scenario}
              targets={data.nudgeTargets}
              onSaveNudge={saveNudge}
              onNudgeChange={changeNudge}
              onSaveError={(error) =>
                setToast({ message: errorMessage(error), kind: "error" })
              }
            />
          </div>
          <div className="grid min-w-0 gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="min-w-0 text-lg font-semibold wrap-anywhere">
                {scenario.name}
              </h2>
              {!scenario.isBaseline && (
                <button
                  type="button"
                  className={`${buttonClass} text-xs`}
                  onClick={() => setModal({ kind: "scenario", scenario })}
                >
                  Scenario settings
                </button>
              )}
            </div>
            <ScenarioHeroCards
              metrics={selectedMetrics}
              baselineRunway={data.baselineMetrics.runwayMonths}
            />
            <OutlookChart
              outlook={outlook}
              scenarios={scenarios}
              comparisonMetrics={comparisonMetrics}
              activeScenarioId={scenario.id}
            />
            <ScenarioComparisonTable
              scenarios={scenarios}
              comparisonMetrics={comparisonMetrics}
            />
          </div>
        </div>
      </fieldset>
      {modal?.kind === "scenario" && (
        <ScenarioModal
          scenario={modal.scenario}
          onClose={() => setModal(null)}
          onSave={async (fields) => {
            await queue.current?.flushPendingSaves();
            const editing = modal.scenario;
            const result = await mutate<Scenario>(
              editing ? scenarioPath(editing.id) : scenarioEndpoint,
              editing ? "PATCH" : "POST",
              fields,
            );
            if (editing) {
              setScenarios((current) =>
                current.map((item) =>
                  item.id === editing.id ? { ...item, ...result } : item,
                ),
              );
            } else {
              setScenarios((current) => [
                ...current,
                { ...result, events: [], nudges: [] },
              ]);
              selectAfterMutation(result.id);
            }
            finish(editing ? "Scenario updated." : "Scenario created.");
          }}
          onDuplicate={async () => {
            const source = modal.scenario;
            if (!source) return;
            await queue.current?.flushPendingSaves();
            const result = await mutate<
              Scenario & { events: ScenarioEvent[]; nudges: ScenarioNudge[] }
            >(`${scenarioPath(source.id)}/duplicate`, "POST");
            setScenarios((current) => {
              const original =
                current.find(({ id }) => id === source.id) ?? source;
              const nudges = result.nudges.flatMap(
                (nudge) => deriveNudge(data, original, nudge, nudge) ?? [],
              );
              return [...current, { ...result, nudges }];
            });
            selectAfterMutation(result.id);
            finish("Scenario duplicated.");
          }}
          onDelete={async () => {
            const deleting = modal.scenario;
            if (!deleting) return;
            await queue.current?.flushPendingSaves();
            await mutate(scenarioPath(deleting.id), "DELETE");
            setScenarios((current) =>
              current.filter(({ id }) => id !== deleting.id),
            );
            selectAfterMutation("baseline", true);
            finish("Scenario deleted.");
          }}
        />
      )}
      {modal?.kind === "event" && (
        <EventModal
          event={modal.event}
          onClose={() => setModal(null)}
          onSave={async (fields) => {
            await queue.current?.flushPendingSaves();
            const editing = modal.event;
            const url = `${scenarioPath(modal.scenarioId)}/events`;
            const result = await mutate<ScenarioEvent>(
              editing ? `${url}/${encodeURIComponent(editing.id)}` : url,
              editing ? "PATCH" : "POST",
              fields,
            );
            setScenarios((current) =>
              current.map((item) =>
                item.id === modal.scenarioId
                  ? {
                      ...item,
                      events: editing
                        ? item.events.map((event) =>
                            event.id === editing.id ? result : event,
                          )
                        : [...item.events, result],
                    }
                  : item,
              ),
            );
            finish(editing ? "Event updated." : "Event added.");
          }}
          onDelete={async () => {
            const deleting = modal.event;
            if (!deleting) return;
            await queue.current?.flushPendingSaves();
            await mutate(
              `${scenarioPath(modal.scenarioId)}/events/${encodeURIComponent(deleting.id)}`,
              "DELETE",
            );
            setScenarios((current) =>
              current.map((item) =>
                item.id === modal.scenarioId
                  ? {
                      ...item,
                      events: item.events.filter(
                        ({ id }) => id !== deleting.id,
                      ),
                    }
                  : item,
              ),
            );
            finish("Event deleted.");
          }}
        />
      )}
      <Toast
        message={toast?.message ?? null}
        kind={toast?.kind}
        onDismiss={dismissToast}
      />
    </>
  );
}

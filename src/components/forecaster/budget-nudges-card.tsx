"use client";

import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { formatCentavos } from "@/domain/amount";
import type {
  ForecasterNudgeTarget,
  ScenarioNudge,
  ScenarioWithRelations,
} from "@/domain/forecaster";
import {
  calculateNudgeFillPercent,
  deriveNudgeAmounts,
  stepCategoryNudge,
} from "@/domain/forecaster-calculations";
import {
  forecastCard,
  nonNegativeUnallocated,
  verdictStyle,
} from "./presentation";

export type BudgetNudgeInput = Pick<
  ScenarioNudge,
  "targetType" | "categoryId" | "bucketId" | "deltaAmount"
>;
export type BudgetNudgesHandle = { flushPendingSaves: () => Promise<void> };

type BudgetRow = ForecasterNudgeTarget & { deltaAmount: number };
type SaveQueue = {
  confirmedDelta: number;
  latestDelta: number;
  revision: number;
  tail: Promise<void>;
};

function targetKey(
  target: Pick<ScenarioNudge, "targetType" | "categoryId" | "bucketId">,
) {
  return `${target.targetType}:${target.categoryId ?? target.bucketId}`;
}

function budgetRows(
  targets: readonly ForecasterNudgeTarget[],
  nudges: ScenarioWithRelations["nudges"],
) {
  const rows = new Map<string, BudgetRow>(
    targets.map((target) => [targetKey(target), { ...target, deltaAmount: 0 }]),
  );
  for (const nudge of nudges) {
    const key = targetKey(nudge);
    const existing = rows.get(key);
    const shared = existing ?? {
      name: nudge.targetName,
      isArchived: nudge.isArchived,
      baseAllocation: nudge.baseAllocation,
    };
    const target =
      nudge.categoryId !== null
        ? {
            targetType: "category" as const,
            categoryId: nudge.categoryId,
            bucketId: null,
          }
        : {
            targetType: "bucket" as const,
            categoryId: null,
            bucketId: nudge.bucketId!,
          };
    rows.set(key, { ...shared, ...target, deltaAmount: nudge.deltaAmount });
  }
  return [...rows.values()];
}

const stepper =
  "grid size-5 shrink-0 cursor-pointer place-items-center rounded-[6px] border border-celia-border text-xs hover:bg-celia-surface-subtle disabled:cursor-default disabled:opacity-50";

export function BudgetNudgesCard({
  ref,
  scenario,
  targets,
  onSaveNudge,
  onNudgeChange,
  onSaveError,
}: {
  ref?: Ref<BudgetNudgesHandle>;
  scenario: ScenarioWithRelations;
  targets: readonly ForecasterNudgeTarget[];
  onSaveNudge: (scenarioId: string, input: BudgetNudgeInput) => Promise<void>;
  onNudgeChange?: (scenarioId: string, input: BudgetNudgeInput) => void;
  onSaveError: (error: unknown) => void;
}) {
  const queues = useRef(new Map<string, SaveQueue>());
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const rows = budgetRows(targets, scenario.nudges);

  useImperativeHandle(
    ref,
    () => ({
      async flushPendingSaves() {
        while (queues.current.size > 0) {
          await Promise.all(
            [...queues.current.values()].map(({ tail }) => tail),
          );
        }
      },
    }),
    [],
  );

  function step(row: BudgetRow, direction: 1 | -1) {
    const scenarioId = scenario.id;
    const key = `${scenarioId}:${targetKey(row)}`;
    const active = queues.current.get(key);
    const previousDelta = drafts[key] ?? row.deltaAmount;
    const current = deriveNudgeAmounts(
      row.baseAllocation,
      active?.latestDelta ?? previousDelta,
    );
    const { nextDelta, nextAllocation } = stepCategoryNudge(
      row.baseAllocation,
      current.adjustedAllocation,
      direction,
    );
    if (nextAllocation === current.adjustedAllocation) return;
    const input = {
      targetType: row.targetType,
      categoryId: row.categoryId,
      bucketId: row.bucketId,
      deltaAmount: nextDelta,
    };
    const queue = active ?? {
      confirmedDelta: previousDelta,
      latestDelta: previousDelta,
      revision: 0,
      tail: Promise.resolve(),
    };
    const revision = ++queue.revision;
    queue.latestDelta = nextDelta;
    queues.current.set(key, queue);
    queue.tail = queue.tail.then(async () => {
      try {
        await onSaveNudge(scenarioId, input);
        queue.confirmedDelta = nextDelta;
      } catch (error) {
        if (queue.revision === revision) {
          const deltaAmount = queue.confirmedDelta;
          setDrafts((currentDrafts) => ({
            ...currentDrafts,
            [key]: deltaAmount,
          }));
          onNudgeChange?.(scenarioId, { ...input, deltaAmount });
        }
        onSaveError(error);
      } finally {
        if (queue.revision === revision) queues.current.delete(key);
      }
    });
    setDrafts((currentDrafts) => ({ ...currentDrafts, [key]: nextDelta }));
    onNudgeChange?.(scenarioId, input);
  }

  return (
    <section className={forecastCard}>
      <h2 className="text-[15.5px] font-semibold">Nudge the budget</h2>
      <p className="mt-0.5 mb-3 text-[12.5px] text-celia-muted">
        Use − or + to rebalance. “Freed” is money released.
      </p>
      <div className="flex flex-col gap-[13px] text-[13px]">
        {rows.map((row) => {
          const key = `${scenario.id}:${targetKey(row)}`;
          const { adjustedAllocation, freedAmount } = deriveNudgeAmounts(
            row.baseAllocation,
            drafts[key] ?? row.deltaAmount,
          );
          const funded = freedAmount < 0;
          const fill = calculateNudgeFillPercent(
            row.baseAllocation,
            adjustedAllocation,
          );
          const disabled = scenario.isBaseline || row.isArchived;
          return (
            <div key={key}>
              <p className="mb-0.5 text-[10.5px] tracking-[.06em] text-celia-muted">
                {row.targetType === "category" ? "EXPENSES" : "SAVINGS"}
              </p>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 wrap-anywhere">
                  {row.name}
                  {row.isArchived && (
                    <span className="ml-1 text-celia-muted">(archived)</span>
                  )}
                </span>
                <div className="flex shrink-0 items-center gap-[7px]">
                  <span
                    className={`font-celia-figure text-xs ${funded ? "" : nonNegativeUnallocated}`}
                    style={
                      funded ? { color: verdictStyle.warning.color } : undefined
                    }
                  >
                    {formatCentavos(adjustedAllocation)}{" "}
                    <span>
                      {formatCentavos(freedAmount, {
                        signed: freedAmount !== 0,
                      })}{" "}
                      {funded ? "funded" : "freed"}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={stepper}
                    aria-label={`Decrease ${row.name} allocation`}
                    disabled={disabled || adjustedAllocation === 0}
                    onClick={() => step(row, -1)}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className={stepper}
                    aria-label={`Increase ${row.name} allocation`}
                    disabled={disabled}
                    onClick={() => step(row, 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <div aria-hidden="true" className="relative h-[18px]">
                <div className="absolute inset-x-0 top-2 h-[3px] rounded-sm bg-celia-border-subtle" />
                <div
                  className={`absolute top-2 left-0 h-[3px] rounded-sm ${funded ? "bg-[var(--color-status-amber-gauge)]" : "bg-celia-accent"}`}
                  style={{ width: `${fill}%` }}
                />
                <div
                  className="absolute top-1/2 size-4 -translate-1/2 rounded-full border-2 border-celia-ink bg-celia-surface"
                  style={{ left: `${fill}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

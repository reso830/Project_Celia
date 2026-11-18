"use client";

import { formatCentavos } from "@/domain/amount";
import type { BudgetTrendData } from "@/domain/dashboard";

function formatMonthLabel(monthKey: string, long = false) {
  return new Intl.DateTimeFormat("en-US", {
    month: long ? "long" : "short",
    ...(long ? { year: "numeric" as const } : {}),
    timeZone: "UTC",
  }).format(new Date(`${monthKey}-15T12:00:00Z`));
}

export default function BudgetTrendChart({
  data,
  onRangeChange,
  onMonthChange,
  householdBudget = false,
  modelName,
}: {
  data: BudgetTrendData;
  onRangeChange: (range: 6 | 12) => void;
  onMonthChange: (month: string) => void;
  householdBudget?: boolean;
  modelName?: string;
}) {
  const hasPlan = data.bars.some((bar) => bar.isSelected && !bar.isUnbudgeted);
  const empty = data.bars.every((bar) => bar.actualExpensesCentavos === 0);
  return (
    <section
      aria-label="Actual vs budget"
      className="flex min-w-0 flex-col rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-4-5)]"
    >
      <div className="mb-[var(--space-3-5)] flex min-h-8 flex-wrap items-center justify-between gap-[var(--space-3)]">
        <h2 className="text-[length:var(--font-size-card-title)] font-semibold">
          Actual vs budget
        </h2>
        <div
          role="group"
          aria-label="Trend range"
          className="flex rounded-[8px] bg-celia-segmented-track p-[3px] text-[12px]"
        >
          {([6, 12] as const).map((range) => (
            <button
              type="button"
              key={range}
              aria-pressed={data.range === range}
              onClick={() => onRangeChange(range)}
              className={`rounded-[6px] px-[var(--space-2-5)] py-[var(--space-1-5)] focus-visible:outline-2 focus-visible:outline-celia-accent ${data.range === range ? "bg-celia-surface font-medium text-celia-ink" : "text-celia-muted"}`}
            >
              {range} mo
            </button>
          ))}
        </div>
      </div>
      {data.isApplicable ? (
        <>
          <div className="relative min-h-[210px] flex-1 border-b border-[var(--color-rail-border)]">
            {empty && (
              <p className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-[length:var(--font-size-secondary)] text-celia-muted">
                No spending recorded for this period
              </p>
            )}
            <div className="absolute inset-0 flex items-end gap-[var(--space-3-5)] px-[var(--space-2-5)]">
              {data.bars.map((bar) => (
                <button
                  type="button"
                  key={bar.monthKey}
                  aria-label={`${formatMonthLabel(bar.monthKey, true)} · ${formatCentavos(bar.actualExpensesCentavos)}${bar.isUnbudgeted ? " · No plan applied" : bar.isOverspent ? " · Over budget" : ""}`}
                  aria-pressed={bar.isSelected}
                  onClick={() => onMonthChange(bar.monthKey)}
                  className="flex h-full min-w-0 flex-1 items-end justify-center focus-visible:outline-2 focus-visible:outline-celia-accent"
                >
                  <span
                    aria-hidden="true"
                    className="block w-full max-w-[46px] rounded-t-[6px]"
                    style={{
                      height: `${bar.heightRatio * 100}%`,
                      backgroundColor: bar.isSelected
                        ? "var(--color-accent)"
                        : bar.isOverspent
                          ? "#e8d3cb"
                          : "#d3d7d8",
                    }}
                  />
                </button>
              ))}
            </div>
            {hasPlan && (
              <div
                aria-label="Selected month budget reference"
                className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-celia-hero"
                style={{ bottom: `${data.budgetLineRatio * 100}%` }}
              />
            )}
          </div>
          <div
            aria-hidden="true"
            className="flex gap-[var(--space-3-5)] px-[var(--space-2-5)] pt-[var(--space-2)] text-[11.5px] text-celia-muted"
          >
            {data.bars.map((bar) => (
              <span
                key={bar.monthKey}
                className={`min-w-0 flex-1 text-center ${bar.isSelected ? "font-medium text-celia-ink" : ""}`}
              >
                {formatMonthLabel(bar.monthKey)}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-[var(--space-4)] pt-[var(--space-2-5)] text-[12px] text-celia-ink-secondary">
            <span className="flex items-center gap-[var(--space-1-75)]">
              <span
                aria-hidden="true"
                className="h-[11px] w-[13px] rounded-[2px] bg-celia-accent"
              />
              actual expense
            </span>
            {hasPlan ? (
              <span className="flex items-center gap-[var(--space-1-75)]">
                <span
                  aria-hidden="true"
                  className="w-5 border-t-2 border-dashed border-celia-hero"
                />
                {householdBudget ? "budget (household)" : "budget"}
                {modelName ? ` · ${modelName}` : ""} ·{" "}
                {formatCentavos(data.budgetCentavos)}
              </span>
            ) : (
              <span>No plan applied</span>
            )}
          </div>
        </>
      ) : (
        <p className="grid min-h-[260px] place-items-center text-center text-[length:var(--font-size-secondary)] text-celia-muted">
          Expense trend not applicable to income categories
        </p>
      )}
    </section>
  );
}

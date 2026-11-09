"use client";
import type { ModelsViewData } from "@/server/models-read";
import { formatCentavos as money } from "@/domain/amount";
export function monthLabel(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}
// lifted from prototype CSS: HF L319-L328 and L1083-L1097 card styles; selected-month plan section recreated manually per D5.
export default function ModelList({
  data,
  selected,
  onSelect,
  onNew,
}: {
  data: ModelsViewData;
  selected: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const summary = (s: ModelsViewData["models"][number]["summary"]) => (
    <div className="mt-[var(--space-2)] font-celia-figure text-[length:var(--font-size-table-figure)] leading-[var(--models-summary-line-height)] text-celia-muted">
      <div>
        {money(s.plannedExpensesCentavos)} exp {"\u00b7"}{" "}
        {money(s.plannedSavingsCentavos)} sav
      </div>
      <div>
        unallocated{" "}
        {money(s.unallocatedCentavos, { signed: s.unallocatedCentavos < 0 })}/mo
      </div>
    </div>
  );
  const cls = (id: string) =>
    `w-full rounded-celia-summary border p-[var(--models-card-padding)] text-left ${selected === id ? "border-celia-accent bg-celia-surface" : "border-celia-border bg-celia-surface"}`;
  return (
    <aside className="space-y-[var(--space-5)]">
      <section>
        <h2 className="mb-[var(--space-3)] text-[length:var(--font-size-caps)] tracking-[var(--models-caps-spacing)] text-celia-muted">
          SELECTED MONTH PLAN
        </h2>
        {data.appliedPlan ? (
          <button
            className={cls("plan")}
            aria-label="Select monthly plan"
            onClick={() => onSelect("plan")}
          >
            <div className="flex justify-between gap-[var(--space-2)] font-semibold">
              {monthLabel(data.month)} plan{" "}
              <span className="rounded-full bg-celia-accent-tint px-[var(--space-2)] py-[var(--models-badge-padding-y)] text-[length:var(--models-caption-font)] font-medium tracking-[var(--models-label-spacing)] text-celia-accent-dark">
                ACTIVE
              </span>
            </div>
            <p className="mt-[var(--space-1)] text-[length:var(--font-size-table-figure)] text-celia-muted">
              From {data.appliedPlan.modelName}
              {data.appliedPlan.isRevised ? " · Revised" : ""}
            </p>
            {summary(data.appliedPlan.summary)}
          </button>
        ) : (
          <div className="rounded-celia-summary border border-dashed border-celia-border p-[var(--space-4)] text-celia-muted">
            No plan for {monthLabel(data.month)}. Apply a model to start.
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-[var(--space-3)] text-[length:var(--font-size-caps)] tracking-[var(--models-caps-spacing)] text-celia-muted">
          REUSABLE MODELS
        </h2>
        <div className="space-y-[var(--space-3)]">
          {data.models.map((model) => (
            <button
              key={model.id}
              aria-label={`Select model ${model.name}`}
              onClick={() => onSelect(model.id)}
              className={cls(model.id)}
            >
              <div className="flex justify-between gap-[var(--space-2)] text-[length:var(--models-card-name-font)] font-semibold">
                {model.name}
                {model.badge && (
                  <span className="rounded-full bg-celia-accent-tint px-[var(--space-2)] py-[var(--models-badge-padding-y)] text-[length:var(--models-caption-font)] font-medium tracking-[var(--models-label-spacing)] text-celia-accent-dark">
                    {model.badge}
                  </span>
                )}
              </div>
              {summary(model.summary)}
            </button>
          ))}
          <button
            onClick={onNew}
            className="w-full rounded-celia-summary border border-dashed border-celia-border p-[var(--space-4)] text-celia-muted"
          >
            + New model
          </button>
        </div>
      </section>
    </aside>
  );
}

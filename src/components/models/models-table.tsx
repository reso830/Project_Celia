"use client";
import { useState } from "react";
import { formatCentavos as money } from "@/domain/amount";
import type {
  BudgetComparisonRow as Row,
  BudgetSummaryTotals,
  VarianceTone,
} from "@/domain/budget-calculations";
export const rowKey = (r: Row) => `${r.targetType}:${r.targetId}`;
export const toneClass = (tone: VarianceTone) =>
  ({
    green: "text-celia-status-green",
    red: "text-celia-status-red",
    amber: "text-[color:var(--savings-warning-ink)]",
    muted: "text-celia-muted",
  })[tone];
type Props = {
  rows: Row[];
  summary: BudgetSummaryTotals;
  planMode: boolean;
  drafts: Record<string, string>;
  errors: Record<string, string>;
  pending: boolean;
  savingRows?: Record<string, boolean>;
  locked: boolean;
  onDraft: (row: Row, value: string) => void;
  onCommit: (row: Row, value?: string) => void;
  onRevert: (row: Row) => void;
};
const grid =
  "grid grid-cols-[var(--models-table-columns)] items-center gap-[var(--space-2-5)]";
// lifted from prototype CSS: HF L375-L391 and L1098-L1144 table/group/input styles; historical merge, utilization and footer additions recreated manually per D6, D7 and D9.
export default function ModelsTable({
  rows,
  summary: s,
  planMode,
  drafts,
  errors,
  pending,
  savingRows = {},
  locked,
  onDraft,
  onCommit,
  onRevert,
}: Props) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  return (
    <div className="mt-[var(--space-5)] text-[length:var(--font-size-body)]">
      <div
        className={`${grid} border-b border-celia-border px-[var(--space-3)] pb-[var(--space-2)] text-[length:var(--font-size-caps)] tracking-[var(--models-label-spacing)] text-celia-muted`}
      >
        <span>CATEGORY</span>
        <span>BUDGET / MO</span>
        <span>ACTUAL</span>
        <span>{"\u0394"}</span>
      </div>
      {(
        [
          ["income", "Income"],
          ["expense", "Expenses"],
          ["savings", "Savings"],
        ] as const
      ).map(([umbrella, label]) => {
        const all = rows.filter((r) => r.umbrella === umbrella),
          totals = all.filter((r) => !r.isFoldedIntoMergeTarget),
          sum = (key: "plannedCentavos" | "actualCentavos" | "deltaCentavos") =>
            totals.reduce((n, r) => n + r[key], 0),
          closed = collapsed.includes(umbrella);
        return (
          <section
            key={umbrella}
            className="mt-[var(--space-2)] overflow-hidden rounded-celia-control-compact border border-[var(--color-border-subtle)]"
          >
            <button
              className={`${grid} w-full border-b border-[var(--color-border-subtle)] bg-celia-surface-subtle px-[var(--space-3)] py-[var(--space-2-5)] text-left font-semibold`}
              aria-label={`Toggle ${label}`}
              aria-expanded={!closed}
              onClick={() =>
                setCollapsed(
                  closed
                    ? collapsed.filter((x) => x !== umbrella)
                    : [...collapsed, umbrella],
                )
              }
            >
              <span>
                {closed ? "\u25b8" : "\u25be"} {label}
              </span>
              <span className="font-celia-figure text-[length:var(--font-size-table-figure)]">
                {money(sum("plannedCentavos"))}
              </span>
              <span
                className="font-celia-figure text-[length:var(--font-size-table-figure)]"
                title={
                  !planMode &&
                  all.some(
                    (r) =>
                      (r.merged ||
                        (r.archived && r.rawPlannedCentavos === 0)) &&
                      r.actualCentavos > 0,
                  )
                    ? "Includes actual activity for hidden archived or merged categories."
                    : undefined
                }
              >
                {money(sum("actualCentavos"))}
              </span>
              <span
                className={`font-celia-figure text-[length:var(--font-size-table-figure)] ${sum("deltaCentavos") > 0 ? "text-[color:var(--models-positive-ink)]" : toneClass(sum("deltaCentavos") < 0 ? (umbrella === "savings" ? "amber" : "red") : "muted")}`}
              >
                {money(sum("deltaCentavos"), { signed: true })}
              </span>
            </button>
            {!closed &&
              all
                .filter(
                  (r) =>
                    planMode ||
                    (!r.merged && (!r.archived || r.rawPlannedCentavos > 0)),
                )
                .map((r) => {
                  const key = rowKey(r),
                    reference = r.isFoldedIntoMergeTarget,
                    inactive = r.archived || r.merged,
                    error = errors[key];
                  return (
                    <div
                      key={key}
                      className={`${grid} border-b border-[var(--color-row-divider)] px-[var(--space-3)] py-[var(--space-2-5)]`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-[var(--space-2)]">
                          <i
                            className={
                              r.targetType === "bucket"
                                ? "hidden"
                                : "h-[var(--models-swatch-size)] w-[var(--models-swatch-size)] shrink-0 rounded-celia-swatch"
                            }
                            style={{
                              background: r.color ?? "var(--color-accent)",
                            }}
                          />
                          <span>
                            {r.name}
                            {reference
                              ? ` (merged \u2192 ${r.mergedIntoCategoryName})`
                              : r.archived
                                ? " (archived)"
                                : ""}
                          </span>
                        </div>
                        {inactive && r.rawPlannedCentavos > 0 && (
                          <button
                            className="mt-[var(--space-1)] text-[length:var(--font-size-caps)] text-celia-accent disabled:text-celia-muted"
                            disabled={pending || savingRows[key] || locked}
                            aria-label={`Zero out ${r.name}`}
                            onClick={() => {
                              onDraft(r, "0");
                              onCommit(r, "0");
                            }}
                          >
                            Zero out
                          </button>
                        )}
                      </div>
                      <div>
                        <input
                          aria-label={`${r.name} budget per month`}
                          aria-invalid={!!error}
                          aria-busy={!!savingRows[key]}
                          value={
                            drafts[key] ??
                            money(r.rawPlannedCentavos, { prefix: "" })
                          }
                          disabled={
                            pending || savingRows[key] || locked || inactive
                          }
                          onChange={(e) => onDraft(r, e.target.value)}
                          onBlur={() => onCommit(r)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              onCommit(r);
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              onRevert(r);
                            }
                          }}
                          className={`w-full min-w-0 rounded-celia-bar border border-celia-border px-[var(--models-input-padding-x)] py-[var(--models-input-padding-y)] font-celia-figure text-[length:var(--font-size-table-figure)] outline-celia-accent disabled:border-transparent disabled:text-celia-muted aria-invalid:border-celia-status-red ${r.tone === "red" ? "border-[var(--models-deficit-border)] bg-[var(--color-status-red-tint)]" : r.tone === "amber" ? "border-[var(--models-shortfall-border)] bg-[var(--color-savings-warning-tint)]" : "bg-celia-surface"}`}
                        />
                        {r.mergedSources.length > 0 && (
                          <p className="mt-[var(--space-1)] text-[length:var(--models-caption-font)] text-celia-muted">
                            {money(r.plannedCentavos)} effective (+
                            {money(
                              r.plannedCentavos - r.rawPlannedCentavos,
                            )}{" "}
                            from{" "}
                            {r.mergedSources
                              .map((x) => x.categoryName)
                              .join(", ")}
                            )
                          </p>
                        )}
                        {error && (
                          <p
                            role="alert"
                            className="mt-[var(--space-1)] text-[length:var(--models-caption-font)] text-celia-status-red"
                          >
                            {error}
                          </p>
                        )}
                      </div>
                      <div className="min-w-0 font-celia-figure text-[length:var(--font-size-table-figure)]">
                        {reference
                          ? `\u2192 ${r.mergedIntoCategoryName}`
                          : money(r.actualCentavos)}
                        {!reference && r.umbrella === "expense" && (
                          <p className="mt-[var(--space-1)] whitespace-nowrap font-celia-ui text-[length:var(--models-caption-font)] text-celia-muted">
                            {r.utilizationPercent === null &&
                            !r.isOverspentZeroBudget
                              ? "\u2014"
                              : `${r.isOverspentZeroBudget ? "Overspent" : `${r.utilizationPercent}% used`} \u00b7 ${money(r.overspentCentavos || r.remainingCentavos)} ${r.overspentCentavos ? "overspent" : "remaining"}`}
                          </p>
                        )}
                        {!reference &&
                          r.umbrella === "savings" &&
                          r.deltaCentavos < 0 && (
                            <p className="mt-[var(--space-1)] font-celia-ui text-[length:var(--models-caption-font)] text-[color:var(--savings-warning-ink)]">
                              {money(-r.deltaCentavos)} short
                            </p>
                          )}
                      </div>
                      <span
                        className={`font-celia-figure text-[length:var(--font-size-table-figure)] ${r.umbrella === "expense" && !reference ? "self-start" : ""} ${toneClass(r.tone)}`}
                      >
                        {reference
                          ? "\u2014"
                          : money(r.deltaCentavos, { signed: true })}
                      </span>
                    </div>
                  );
                })}
          </section>
        );
      })}
      <footer
        className={`${grid} mt-[var(--space-2-5)] border-t border-celia-border px-[var(--space-3)] pt-[var(--space-3-5)] font-semibold`}
      >
        <span>
          Unallocated{" "}
          <small className="mt-[var(--space-1)] block w-fit rounded-full bg-celia-surface-subtle px-[var(--space-2)] py-[var(--models-badge-padding-y)] text-[length:var(--models-caption-font)] font-normal text-celia-muted">
            {s.isOverallocated
              ? "Overallocated"
              : s.isFullyAllocated
                ? "Fully allocated"
                : "Available to allocate"}
          </small>
        </span>
        <span
          aria-label="Unallocated planned"
          className={`font-celia-figure text-[length:var(--font-size-table-figure)] ${s.unallocatedCentavos < 0 ? "text-celia-status-red" : s.unallocatedCentavos > 0 ? "text-celia-accent" : "text-celia-ink-secondary"}`}
        >
          {money(s.unallocatedCentavos, { signed: true })}
        </span>
        <span
          aria-label="Unallocated actual"
          className="font-celia-figure text-[length:var(--font-size-table-figure)]"
        >
          {money(s.actualUnallocatedCentavos, { signed: true })}
        </span>
        <span
          aria-label="Unallocated delta"
          className={`font-celia-figure text-[length:var(--font-size-table-figure)] ${toneClass(s.unallocatedDeltaTone)}`}
        >
          {money(s.unallocatedDeltaCentavos, { signed: true })}
        </span>
      </footer>
    </div>
  );
}

import { formatCentavos as money } from "@/domain/amount";
import type { BudgetSummaryTotals } from "@/domain/budget-calculations";
// lifted from prototype CSS: HF L336-L347 and L1156-L1168 bar/card styles; status badges per D10 and contrast correction in deviations.md.
export default function IncomeAllocationBar({
  summary: s,
}: {
  summary: BudgetSummaryTotals;
}) {
  return (
    <section className="rounded-celia-summary border border-[var(--color-border-subtle)] bg-celia-surface-subtle p-[var(--models-allocation-padding)]">
      <div className="mb-[var(--space-3)] flex flex-wrap items-baseline justify-between gap-[var(--space-2)]">
        <h3 className="font-semibold">Where the income goes</h3>
        <span className="font-celia-figure text-[length:var(--font-size-table-figure)] text-celia-muted">
          {money(s.expectedIncomeCentavos)} planned income
          {s.isFullyAllocated ? " \u00b7 Fully allocated" : ""}
        </span>
      </div>
      {s.isOverallocated ? (
        <p className="mb-[var(--space-2)] w-fit rounded-full bg-[var(--color-status-red-tint)] px-[var(--space-2)] py-[var(--space-1)] text-[length:var(--font-size-table-figure)] text-celia-status-red">
          Overallocated by {money(-s.unallocatedCentavos)}
        </p>
      ) : null}
      <div
        className="flex h-[var(--models-allocation-height)] overflow-hidden rounded-celia-bar bg-celia-border"
        aria-label="Planned income allocation"
      >
        {s.segments.map((x) => (
          <div
            key={x.key}
            title={`${x.label} \u00b7 ${money(x.amountCentavos)}`}
            style={{
              width: `${x.widthPercent}%`,
              background: x.color,
              color:
                x.key === "unallocated"
                  ? "var(--color-ink-secondary)"
                  : x.key === "expenses"
                    ? "var(--color-ink)"
                    : "white",
            }}
            className="flex items-center justify-center overflow-hidden font-celia-figure text-[length:var(--font-size-caps)] font-bold"
          >
            {x.widthPercent > 8 ? `${x.displayPercent}%` : null}
          </div>
        ))}
      </div>
      <div className="mt-[var(--space-3)] flex flex-wrap gap-[var(--space-4)] text-[length:var(--font-size-caps)] text-celia-muted">
        {s.segments.map((x) => (
          <span key={x.key} className="flex items-center gap-[var(--space-2)]">
            <i
              className="h-[var(--models-legend-swatch-size)] w-[var(--models-legend-swatch-size)] rounded-celia-swatch"
              style={{ background: x.color }}
            />
            {x.label}
          </span>
        ))}
      </div>
    </section>
  );
}

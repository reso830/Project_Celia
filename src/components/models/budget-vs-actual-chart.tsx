import {
  calculateDivergingBars,
  type BudgetComparisonRow,
} from "@/domain/budget-calculations";
import { formatCentavos as money } from "@/domain/amount";
// lifted from prototype CSS: HF L354-L372 and L1170-L1180 diverging plot, zero line, labels and category bars.
export default function BudgetVsActualChart({
  rows,
}: {
  rows: BudgetComparisonRow[];
}) {
  const bars = calculateDivergingBars(rows);
  return (
    <section className="min-w-0 rounded-celia-summary border border-[var(--color-border-subtle)] bg-celia-surface-subtle p-[var(--space-3-5)]">
      <h3 className="font-semibold">Budget vs actual ({"\u0394"})</h3>
      <div className="relative mt-[var(--space-3)] pl-[var(--space-5)]">
        <span className="absolute left-0 top-[var(--space-4)] text-[length:var(--models-axis-font)] text-celia-muted [writing-mode:vertical-rl] rotate-180">
          SURPLUS
        </span>
        <span className="absolute bottom-[calc(var(--space-4)*2)] left-0 text-[length:var(--models-axis-font)] text-celia-status-red [writing-mode:vertical-rl] rotate-180">
          DEFICIT
        </span>
        <div className="relative flex min-h-[var(--models-plot-min-height)] h-[var(--models-chart-size)] justify-around gap-[var(--space-2)] border-b border-celia-border">
          <div className="absolute inset-x-0 top-1/2 border-t border-celia-ink" />
          {bars.map((b) => (
            <div
              key={b.targetId}
              title={`${b.label}: ${money(b.deltaCentavos, { signed: true })}`}
              className="relative h-[var(--models-chart-size)] flex-1"
            >
              <div
                className="absolute left-1/2 w-[var(--models-chart-bar-width)] -translate-x-1/2 rounded-t-[var(--radius-swatch)]"
                style={{
                  bottom: "50%",
                  height: b.upBar,
                  background: b.color ?? undefined,
                }}
              />
              <div
                className="absolute left-1/2 w-[var(--models-chart-bar-width)] -translate-x-1/2 rounded-b-[var(--radius-swatch)]"
                style={{
                  top: "50%",
                  height: b.downBar,
                  background: b.color ?? undefined,
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-[var(--space-2)] flex justify-around gap-[var(--space-2)]">
          {bars.map((b) => (
            <span
              key={b.targetId}
              className={`min-w-0 flex-1 truncate text-center text-[length:var(--models-chart-label-font)] ${b.deltaCentavos < 0 ? "text-celia-status-red" : "text-celia-muted"}`}
              title={b.label}
            >
              {b.label.slice(0, 4)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

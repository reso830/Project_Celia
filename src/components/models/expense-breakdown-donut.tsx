import {
  calculateExpenseMixStops,
  type BudgetComparisonRow,
} from "@/domain/budget-calculations";
import { formatCentavos as money } from "@/domain/amount";
// lifted from prototype CSS: HF L350-L353 and L1149-L1155 conic ring/card styles; explicit empty label recreated manually per US4 AC8.
export default function ExpenseBreakdownDonut({
  rows,
}: {
  rows: BudgetComparisonRow[];
}) {
  const stops = calculateExpenseMixStops(rows),
    total = rows
      .filter((r) => r.umbrella === "expense" && !r.isFoldedIntoMergeTarget)
      .reduce((n, r) => n + r.plannedCentavos, 0);
  return (
    <section className="rounded-celia-summary border border-[var(--color-border-subtle)] bg-celia-surface-subtle p-[var(--space-3-5)]">
      <h3 className="font-semibold">Expense breakdown</h3>
      <div
        className="mx-auto my-[var(--space-4)] flex h-[var(--models-chart-size)] w-[var(--models-chart-size)] items-center justify-center rounded-full"
        role="img"
        aria-label={`Planned expenses ${money(total)}`}
        style={{
          background: stops.length
            ? `conic-gradient(${stops.map((x) => `${x.color} ${x.startPercent}% ${x.endPercent}%`).join(",")})`
            : "var(--color-border)",
        }}
      >
        <div className="flex h-[var(--models-donut-hole)] w-[var(--models-donut-hole)] flex-col items-center justify-center rounded-full bg-celia-surface-subtle">
          {total === 0 && (
            <span className="px-[var(--space-2)] text-center text-[length:var(--font-size-caps)] text-celia-muted">
              No planned expenses
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

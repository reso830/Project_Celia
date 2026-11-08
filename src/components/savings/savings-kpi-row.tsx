import type { SavingsKpiSummary } from "@/domain/savings-calculations";
import { formatCentavos } from "@/domain/amount";
export function monthShort(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
  });
}
// lifted from prototype CSS: HF L269-L293 KPI card typography, spacing and borders; funding status text recreated manually per D4.
export default function SavingsKpiRow({
  kpis,
  month,
}: {
  kpis: SavingsKpiSummary;
  month: string;
}) {
  const short = monthShort(month);
  const status = kpis.fundedStatus;
  const note =
    status === "short"
      ? `${formatCentavos(kpis.monthlyShortfallCentavos)} short`
      : status === "on_plan"
        ? "on plan"
        : status === "no_savings_planned"
          ? "no savings planned"
          : `no plan for ${short}`;
  const cards = [
    {
      label: "HELD IN BUCKETS",
      value: formatCentavos(kpis.heldInBucketsCentavos),
      note: `${kpis.activeBucketCount} ${kpis.activeBucketCount === 1 ? "bucket" : "buckets"}`,
    },
    {
      label: "SAVINGS BUFFER",
      value: formatCentavos(kpis.savingsBufferCentavos),
      note: "counted buckets only",
    },
    {
      label: "RUNWAY",
      value:
        kpis.runwayMonths === null
          ? "\u2014"
          : `${kpis.runwayMonths.toFixed(1)} mo`,
      note: "buffer \u00f7 monthly expenses",
    },
    {
      label: `FUNDED ${short.toUpperCase()}`,
      value: formatCentavos(kpis.monthlyFundedCentavos),
      note,
    },
  ];
  return (
    <div className="mb-[var(--space-4)] grid grid-cols-[var(--savings-kpi-columns)] gap-[var(--space-3-5)]">
      {cards.map((c, i) => (
        <section
          key={c.label}
          aria-label={c.label}
          className="min-w-0 rounded-celia-card border border-celia-border bg-celia-surface px-[var(--space-4-5)] py-[var(--space-4)]"
        >
          <div className="text-[length:var(--font-size-edit-icon)] font-medium tracking-[var(--savings-caps-spacing)] text-celia-muted">
            {c.label}
          </div>
          <div className="mt-[var(--space-1-75)] mb-[var(--space-1)] font-celia-figure text-[length:var(--font-size-kpi-figure)] font-bold">
            {c.value}
          </div>
          <p
            className={`text-[length:var(--font-size-secondary)] ${i === 3 && status === "short" ? "text-[color:var(--savings-warning-ink)]" : i === 3 && status === "on_plan" ? "text-celia-status-green" : "text-celia-muted"}`}
          >
            {c.note}
          </p>
        </section>
      ))}
    </div>
  );
}

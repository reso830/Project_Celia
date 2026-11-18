import { formatCentavos } from "@/domain/amount";
import type { DashboardKpisData } from "@/domain/dashboard";

export default function SecondaryKpiGrid({
  data,
  hasMonthlyPlan,
  householdSavings = false,
}: {
  data: DashboardKpisData;
  hasMonthlyPlan: boolean;
  householdSavings?: boolean;
}) {
  const metrics = [
    {
      label: "INCOME",
      history: data.history.map((month) => month.incomeCentavos),
      amount: data.incomeCentavos,
      delta: data.incomeDeltaCentavos,
      subtitle: "",
    },
    {
      label: "EXPENSES",
      history: data.history.map((month) => month.expensesCentavos),
      amount: data.expensesCentavos,
      delta: data.expensesDeltaCentavos,
      subtitle: "",
    },
    {
      label: "SAVINGS",
      history: data.history.map((month) => month.savingsCentavos),
      amount: data.savingsCentavos,
      delta: data.savingsDeltaCentavos,
      subtitle: householdSavings ? "Household savings" : "",
    },
    {
      label: "UNALLOCATED",
      history: data.history.map((month) => month.unallocatedCentavos),
      amount: data.unallocatedCentavos,
      delta: data.unallocatedDeltaCentavos,
      subtitle:
        data.unallocatedScope === "member"
          ? "Member net"
          : data.unallocatedScope === "household"
            ? "Household net"
            : "Unallocated",
    },
  ];
  return (
    <div className="grid min-w-0 grid-cols-2 gap-[var(--space-3-5)]">
      {metrics.map((metric) => {
        const deltaText =
          metric.delta === null
            ? !hasMonthlyPlan && metric.amount !== null
              ? "No plan applied"
              : ""
            : metric.label === "EXPENSES"
              ? `${formatCentavos(Math.abs(metric.delta))} ${metric.delta < 0 ? "overspent" : "unspent"}`
              : `${formatCentavos(metric.delta, { signed: true })} vs plan`;
        const deltaColor =
          metric.delta === null
            ? "text-celia-muted"
            : metric.delta >= 0
              ? "text-celia-status-green"
              : metric.label === "SAVINGS"
                ? "text-[var(--savings-warning-ink)]"
                : "text-celia-status-red";
        return (
          <section
            key={metric.label}
            aria-label={metric.label}
            className="flex min-w-0 items-center justify-between gap-[var(--space-3)] rounded-celia-card border border-celia-border bg-celia-surface px-[var(--space-4)] py-[var(--space-3-5)]"
          >
            <div className="flex min-w-0 flex-col justify-between gap-[var(--space-4-5)] self-stretch">
              <h2 className="text-[length:var(--font-size-caps)] font-medium tracking-[0.07em] text-celia-muted">
                {metric.label}
              </h2>
              <div>
                <p
                  className={`break-words font-celia-figure text-[length:var(--font-size-kpi-figure)] font-bold tracking-[-0.025em] ${metric.label === "UNALLOCATED" && metric.amount !== null ? (metric.amount < 0 ? "text-celia-status-red" : "text-celia-accent") : "text-celia-ink"}`}
                >
                  {metric.amount === null
                    ? "—"
                    : formatCentavos(metric.amount, {
                        signed: metric.label === "UNALLOCATED",
                      })}
                </p>
                {metric.amount !== null && metric.subtitle && (
                  <p className="text-[length:var(--font-size-caps)] text-celia-muted">
                    {metric.subtitle}
                  </p>
                )}
                {deltaText && (
                  <p
                    className={`text-[length:var(--font-size-caps)] ${deltaColor}`}
                  >
                    {deltaText}
                  </p>
                )}
              </div>
            </div>
            {metric.amount !== null && (
              <KpiTrend label={metric.label} values={metric.history} />
            )}
          </section>
        );
      })}
    </div>
  );
}

function KpiTrend({
  label,
  values,
}: {
  label: string;
  values: readonly (number | null)[];
}) {
  const series = values.filter((value): value is number => value !== null);
  const min = Math.min(...series),
    max = Math.max(...series);
  const points =
    series.length > 1
      ? series
          .map(
            (value, i) =>
              `${4 + (i / (series.length - 1)) * 92},${27 - ((value - min) / (max - min || 1)) * 24}`,
          )
          .join(" ")
      : "4,27 96,27";
  const color =
    label === "UNALLOCATED" ? "var(--color-accent)" : "var(--color-muted)";
  return (
    <svg
      role="img"
      aria-label={`${label} monthly trend`}
      width="88"
      height="30"
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      className="shrink-0"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

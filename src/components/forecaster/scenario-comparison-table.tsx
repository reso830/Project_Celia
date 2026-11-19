import { formatCentavos } from "@/domain/amount";
import type { Scenario, ScenarioMetrics } from "@/domain/forecaster";
import {
  forecastCard,
  formatForecastAmount,
  formatRunway,
  verdictStyle,
} from "./presentation";

const rows = [
  {
    label: "Monthly expense",
    value: (metric: ScenarioMetrics) => formatCentavos(metric.monthlyExpense),
  },
  {
    label: "Unallocated",
    value: (metric: ScenarioMetrics) =>
      formatCentavos(metric.monthlyUnallocated, { signed: true }),
  },
  {
    label: "Drawn from buffer",
    value: (metric: ScenarioMetrics) =>
      metric.drawnFromBuffer === 0
        ? "—"
        : formatCentavos(metric.drawnFromBuffer),
  },
  {
    label: "Buffer after",
    value: (metric: ScenarioMetrics) =>
      formatForecastAmount(metric.bufferAfter),
  },
  {
    label: "Runway",
    value: (metric: ScenarioMetrics) => formatRunway(metric.runwayMonths),
  },
];
const pinned =
  "sticky left-0 z-10 w-[120px] bg-celia-surface pr-2.5 text-left font-normal whitespace-nowrap";

export function ScenarioComparisonTable({
  scenarios,
  comparisonMetrics,
}: {
  scenarios: readonly Scenario[];
  comparisonMetrics: readonly ScenarioMetrics[];
}) {
  const metricsById = new Map(
    comparisonMetrics.map((metric) => [metric.scenarioId, metric]),
  );
  const columns = scenarios.map((scenario) => ({
    scenario,
    metric: metricsById.get(scenario.id),
  }));
  return (
    <section className={forecastCard}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-[15.5px] font-semibold">Scenarios side by side</h2>
        <p className="text-[11.5px] text-celia-muted">
          runway = buffer ÷ monthly expense
        </p>
      </div>
      <div
        role="region"
        aria-label="Scenario comparison"
        tabIndex={0}
        className="overflow-x-auto"
      >
        <table
          aria-label="Scenarios side by side"
          className="w-full border-separate border-spacing-0 text-left"
          style={{ minWidth: Math.max(520, 120 + columns.length * 100) }}
        >
          <thead>
            <tr className="text-[11px] tracking-[.06em] text-celia-muted">
              <td className={`${pinned} border-b border-celia-border pb-2`} />
              {columns.map(({ scenario }) => (
                <th
                  key={scenario.id}
                  scope="col"
                  className="border-b border-celia-border pb-2 pr-2.5 font-medium"
                  title={scenario.name}
                >
                  {scenario.shortLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, value }) => (
              <tr key={label}>
                <th
                  scope="row"
                  className={`${pinned} border-b border-celia-row-divider py-[9px] text-[13.5px]`}
                >
                  {label}
                </th>
                {columns.map(({ scenario, metric }) => (
                  <td
                    key={scenario.id}
                    className="border-b border-celia-row-divider py-[9px] pr-2.5 font-celia-figure text-xs whitespace-nowrap"
                  >
                    {metric ? value(metric) : "—"}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="text-xs">
              <th
                scope="row"
                className={`${pinned} pt-3 pb-0.5 text-celia-muted`}
              >
                Verdict
              </th>
              {columns.map(({ scenario, metric }) => (
                <td key={scenario.id} className="pt-3 pr-2.5 pb-0.5">
                  {metric ? (
                    <span
                      className="inline-block rounded-[20px] border px-2.5 py-1 text-center whitespace-nowrap"
                      style={verdictStyle[metric.verdict.statusTone]}
                    >
                      {metric.verdict.tier}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

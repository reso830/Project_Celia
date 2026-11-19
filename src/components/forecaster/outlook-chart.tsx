import type {
  OutlookData,
  Scenario,
  ScenarioMetrics,
} from "@/domain/forecaster";
import {
  baselineBarFill,
  forecastCard,
  formatForecastAmount,
  scenarioStroke,
} from "./presentation";

const chartWidth = 720;
const chartHeight = 210;
const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function monthLabel(monthKey: string) {
  return monthFormatter.format(new Date(`${monthKey}-01T00:00:00Z`));
}

export function OutlookChart({
  outlook,
  scenarios,
  comparisonMetrics,
  activeScenarioId,
}: {
  outlook: OutlookData;
  scenarios: readonly Scenario[];
  comparisonMetrics: readonly ScenarioMetrics[];
  activeScenarioId: string;
}) {
  const { bars, polylines, milestones, zeroRuleRatio } = outlook;
  const negative = bars[0]?.isNegative ?? false;
  const zeroPercent = zeroRuleRatio * 100;
  const linesById = new Map(polylines.map((line) => [line.scenarioId, line]));
  const metricsById = new Map(
    comparisonMetrics.map((metric) => [metric.scenarioId, metric]),
  );
  const alternatives = scenarios.filter((scenario) =>
    linesById.has(scenario.id),
  );

  return (
    <figure className={forecastCard}>
      <figcaption className="mb-3.5 text-[15.5px] font-semibold">
        24-month outlook
      </figcaption>
      <div className="sr-only">
        {bars[0] && (
          <p>
            Baseline unallocated is{" "}
            {formatForecastAmount(bars[0].unallocatedCentavos)} per month.
          </p>
        )}
        {alternatives.map((scenario) => {
          const month = bars[scenario.startMonth]?.monthKey;
          const metric = metricsById.get(scenario.id);
          return (
            month &&
            metric && (
              <p key={scenario.id}>
                {scenario.name}{" "}
                {scenario.startMonth === 0
                  ? "starts in"
                  : "follows the baseline before"}{" "}
                {monthLabel(month)} and projects{" "}
                {formatForecastAmount(metric.monthlyUnallocated)} per month from
                then on.
              </p>
            )
          );
        })}
      </div>
      <div
        aria-hidden="true"
        className="relative h-[210px] border-b border-celia-rail-border"
      >
        <div
          className={`absolute inset-x-0 flex gap-[3px] ${negative ? "items-start" : "items-end"}`}
          style={{
            top: negative ? `${zeroPercent}%` : 0,
            height: `${negative ? 100 - zeroPercent : zeroPercent}%`,
          }}
        >
          {bars.map((bar) => (
            <div
              key={bar.monthIndex}
              className={`min-w-0 flex-1 ${baselineBarFill} ${negative ? "rounded-b-[2px]" : "rounded-t-[2px]"}`}
              style={{ height: `${bar.heightRatioInContainer * 100}%` }}
            />
          ))}
        </div>
        <div
          className="absolute inset-x-0 border-t border-celia-ink"
          style={{ top: `${zeroPercent}%` }}
        />
        <svg
          viewBox="0 0 720 210"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {alternatives.map((scenario) => {
            const line = linesById.get(scenario.id)!;
            const stroke = scenarioStroke(scenario.paletteKey);
            return (
              <polyline
                key={scenario.id}
                points={line.points
                  .map(({ x, y }) => `${x * chartWidth},${y * chartHeight}`)
                  .join(" ")}
                fill="none"
                stroke={stroke.color}
                strokeWidth={2.5}
                strokeDasharray={stroke.dash}
                vectorEffect="non-scaling-stroke"
                opacity={activeScenarioId === scenario.id ? 1 : 0.35}
              />
            );
          })}
        </svg>
      </div>
      <div className="flex justify-between gap-2 pt-[7px] text-[11.5px] text-celia-muted">
        {milestones.map(({ index, monthKey }) => (
          <span key={index}>{monthLabel(monthKey)}</span>
        ))}
      </div>
      <ul
        aria-hidden="true"
        className="mt-[9px] flex flex-wrap gap-3.5 border-t border-celia-border-subtle pt-[11px] text-[11.5px] text-celia-ink-secondary"
      >
        <li className="flex items-center gap-1.5">
          <span className={`h-2.5 w-3 rounded-[2px] ${baselineBarFill}`} />
          baseline unallocated
        </li>
        {alternatives.map((scenario) => {
          const stroke = scenarioStroke(scenario.paletteKey);
          return (
            <li key={scenario.id} className="flex items-center gap-1.5">
              <svg width="18" height="4">
                <line
                  x1="0"
                  y1="2"
                  x2="18"
                  y2="2"
                  stroke={stroke.color}
                  strokeWidth="2"
                  strokeDasharray={stroke.dash}
                />
              </svg>
              {scenario.shortLabel}
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

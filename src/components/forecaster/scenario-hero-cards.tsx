import { formatCentavos } from "@/domain/amount";
import type { ScenarioMetrics } from "@/domain/forecaster";
import {
  forecastCard,
  formatRunway,
  nonNegativeUnallocated,
  verdictStyle,
} from "./presentation";

const card = `${forecastCard} px-[18px] py-4`;
const title = "text-[11.5px] font-medium tracking-[.07em] text-celia-muted";
const figure =
  "mt-1.5 mb-[3px] font-celia-figure text-2xl font-bold wrap-anywhere";
const subtitle = "text-[12.5px] text-celia-muted";

export function ScenarioHeroCards({
  metrics,
  baselineRunway,
}: {
  metrics: ScenarioMetrics;
  baselineRunway: number | null;
}) {
  const style = verdictStyle[metrics.verdict.statusTone];
  return (
    <dl className="grid min-w-0 gap-3 min-[1100px]:grid-cols-3">
      <div className={card} style={style}>
        <dt className={title}>VERDICT</dt>
        <dd className="mt-1.5 mb-[3px] text-[19px] font-semibold">
          {metrics.verdict.tier}
        </dd>
        <dd className={subtitle}>24-month horizon</dd>
      </div>
      <div className={card}>
        <dt className={title}>RUNWAY</dt>
        <dd className={figure}>{formatRunway(metrics.runwayMonths)}</dd>
        <dd className={subtitle}>
          {metrics.scenarioId === "baseline"
            ? "baseline runway"
            : `from ${formatRunway(baselineRunway)}`}
        </dd>
      </div>
      <div className={card}>
        <dt className={title}>MONTHLY UNALLOCATED</dt>
        <dd
          className={`${figure} ${metrics.monthlyUnallocated < 0 ? "text-celia-status-red" : nonNegativeUnallocated}`}
        >
          {formatCentavos(metrics.monthlyUnallocated, { signed: true })}
        </dd>
        <dd className={subtitle}>
          {metrics.drawnFromBuffer === 0
            ? "buffer untouched"
            : `${formatCentavos(metrics.drawnFromBuffer)} drawn from the buffer`}
        </dd>
      </div>
    </dl>
  );
}

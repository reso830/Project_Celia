import { formatCentavos } from "@/domain/amount";
import type { SavingsBufferHeroData } from "@/domain/dashboard";

export default function SavingsBufferHero({
  data,
}: {
  data: SavingsBufferHeroData;
}) {
  const points =
    data.sparklinePoints.length > 1
      ? data.sparklinePoints
          .map((point) => `${point.x * 120},${44 - point.y * 36}`)
          .join(" ")
      : data.sparklinePoints.length === 1
        ? `0,${44 - data.sparklinePoints[0].y * 36} 120,${44 - data.sparklinePoints[0].y * 36}`
        : "0,44 120,44";
  return (
    <section
      aria-label="Savings buffer"
      className="flex min-w-0 items-center justify-between gap-[var(--space-4)] rounded-celia-card bg-celia-hero p-[var(--space-5)]"
    >
      <div className="flex min-w-0 flex-col justify-between gap-[var(--space-4-5)] self-stretch">
        <h2 className="text-[length:var(--font-size-caps)] font-medium tracking-[0.07em] text-celia-muted-on-dark">
          SAVINGS BUFFER
        </h2>
        <div>
          <p className="break-words font-celia-figure text-[length:var(--font-size-hero-figure)] leading-none font-bold tracking-[-0.03em] text-celia-surface">
            {formatCentavos(data.bufferCentavos)}
          </p>
          <p className="mt-[var(--space-2)] text-[15px] font-semibold text-[#ced4d5]">
            {data.runwayMonths === null
              ? "Runway —"
              : `${data.runwayMonths.toFixed(1)} months runway`}
          </p>
          {data.isHouseholdScope && (
            <p className="mt-[var(--space-1)] text-[length:var(--font-size-caps)] text-celia-muted-on-dark">
              Household buffer · Household runway
            </p>
          )}
        </div>
      </div>
      <svg
        aria-label="Historical household buffer trend"
        role="img"
        viewBox="0 0 120 48"
        preserveAspectRatio="none"
        className="block h-11 w-auto max-w-[120px] min-w-0 flex-1 overflow-hidden"
      >
        <polyline
          points={points}
          fill="none"
          stroke="#8fd0c9"
          strokeWidth="3.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </section>
  );
}

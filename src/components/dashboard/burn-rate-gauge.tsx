import type { BurnRateData } from "@/domain/dashboard";

export function gaugeArcPath(ratio: number): string {
  const fraction = Math.max(0, Math.min(1, ratio));
  if (fraction === 0) return "";
  const angle = ((135 + fraction * 270) * Math.PI) / 180;
  return `M 46.26 153.74 A 76 76 0 ${fraction > 2 / 3 ? 1 : 0} 1 ${(100 + 76 * Math.cos(angle)).toFixed(2)} ${(100 + 76 * Math.sin(angle)).toFixed(2)}`;
}

export default function BurnRateGauge({
  data,
  monthKey,
  householdScope = false,
  scopeLabel,
}: {
  data: BurnRateData;
  monthKey: string;
  householdScope?: boolean;
  scopeLabel?: string;
}) {
  const subtitles = {
    no_plan: "No plan applied",
    zero_budget_zero_spend: "Zero budget · ₱0 spent",
    zero_budget_overspent: "No budget allocated",
    income_category: "Income category selected",
    under_pace: "Under pace",
    on_pace: "On pace",
    over_pace: "Over pace",
  };
  const subtitle = subtitles[data.state];
  const centerText =
    data.state === "zero_budget_overspent"
      ? "Overspent"
      : data.utilizationPercent === null
        ? "—"
        : `${data.utilizationPercent}%`;
  const month = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${monthKey}-15T12:00:00Z`))
    .toUpperCase();
  const stroke =
    data.statusTone === "favourable"
      ? "var(--color-status-green)"
      : data.statusTone === "warning"
        ? "var(--color-status-amber-gauge)"
        : data.statusTone === "critical"
          ? "var(--color-status-red)"
          : "var(--color-muted)";
  return (
    <section
      aria-label="Burn rate"
      className="flex min-w-0 flex-col rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-4-5)]"
    >
      <h2 className="flex min-h-8 items-center text-[length:var(--font-size-card-title)] font-semibold">
        Burn rate
      </h2>
      {(scopeLabel || householdScope) && (
        <p className="text-[length:var(--font-size-caps)] text-celia-muted">
          {scopeLabel ?? "Household burn rate"}
        </p>
      )}
      <div className="grid flex-1 place-items-center pt-[var(--space-2-5)] pb-[2px]">
        <div className="relative w-full max-w-[340px]">
          <div className="absolute inset-x-0 top-[40%] text-center">
            <p
              className={`font-celia-figure leading-[1.05] font-bold tracking-[-0.02em] ${centerText === "Overspent" ? "text-[24px]" : "text-[42px]"}`}
            >
              {centerText}
            </p>
            <p className="mt-[var(--space-1)] text-[length:var(--font-size-secondary)] text-celia-muted">
              {month}
            </p>
          </div>
          <svg
            role="img"
            aria-label={`Burn rate ${centerText} · ${subtitle}`}
            viewBox="0 0 200 182"
            className="block w-full"
          >
            <path
              d="M46.26 153.74 A76 76 0 0 1 121.96 27.24"
              fill="none"
              stroke="var(--color-status-green)"
              strokeWidth="5"
            />
            <path
              d="M125.00 28.22 A76 76 0 0 1 171.77 75.00"
              fill="none"
              stroke="var(--color-status-amber-gauge)"
              strokeWidth="5"
            />
            <path
              d="M172.75 78.04 A76 76 0 0 1 153.74 153.74"
              fill="none"
              stroke="var(--color-status-red)"
              strokeWidth="5"
            />
            {data.arcRatio > 0 && (
              <path
                d={gaugeArcPath(data.arcRatio)}
                fill="none"
                stroke={stroke}
                strokeWidth="18"
              />
            )}
            <line
              x1="43.43"
              y1="156.57"
              x2="36.66"
              y2="163.34"
              stroke="var(--color-border)"
            />
            <line
              x1="156.57"
              y1="43.43"
              x2="163.34"
              y2="36.66"
              stroke="var(--color-border)"
            />
            <line
              x1="156.57"
              y1="156.57"
              x2="163.34"
              y2="163.34"
              stroke="var(--color-border)"
            />
            <text
              x="30"
              y="176"
              textAnchor="middle"
              fontFamily="var(--font-figure)"
              fontSize="9.5"
              fill="var(--color-muted)"
            >
              0%
            </text>
            <text
              x="172"
              y="30"
              textAnchor="middle"
              fontFamily="var(--font-figure)"
              fontSize="9.5"
              fill="var(--color-muted)"
            >
              100%
            </text>
            <text
              x="170"
              y="176"
              textAnchor="middle"
              fontFamily="var(--font-figure)"
              fontSize="9.5"
              fill="var(--color-muted)"
            >
              150%
            </text>
          </svg>
        </div>
      </div>
      <p className="text-center text-[length:var(--font-size-secondary)] text-celia-muted">
        {subtitle}
      </p>
    </section>
  );
}

import { formatCentavos } from "@/domain/amount";
import type { GoalHighlightData } from "@/domain/dashboard";
export default function GoalHighlightCard({
  data,
  householdScope = false,
}: {
  data: GoalHighlightData;
  householdScope?: boolean;
}) {
  const ratio = Math.max(0, Math.min(1, data.progressRatio));
  const percent = Math.round(ratio * 100);
  const note =
    data.status === "funded"
      ? "Funded — ready to draw"
      : data.status === "on_track" && data.monthsToTarget !== null
        ? `At ${formatCentavos(data.currentMonthFundedCentavos)}/mo → ${data.monthsToTarget} months to target`
        : `No contributions this month · ${formatCentavos(data.remainingCentavos)} left`;
  return (
    <section
      aria-label="Goal progress"
      className="flex min-w-0 items-center gap-[var(--space-4)] rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-4-5)]"
    >
      {!data.hasGoal ? (
        <div>
          <h2 className="text-[length:var(--font-size-card-title)] font-semibold">
            Goal progress
          </h2>
          <p className="mt-2 text-[length:var(--font-size-body)] text-celia-muted">
            No active savings goals
          </p>
        </div>
      ) : (
        <>
          <div className="relative h-[104px] w-[104px] shrink-0">
            <svg
              role="img"
              aria-label={`Goal progress ${percent}%`}
              viewBox="0 0 104 104"
              className="h-full w-full"
            >
              <circle
                cx="52"
                cy="52"
                r="44.5"
                fill="none"
                stroke="var(--color-border-subtle)"
                strokeWidth="15"
              />
              <circle
                data-progress
                cx="52"
                cy="52"
                r="44.5"
                fill="none"
                stroke={
                  data.statusTone === "favourable"
                    ? "var(--color-status-green)"
                    : "var(--color-status-amber)"
                }
                strokeWidth="15"
                pathLength="100"
                strokeDasharray={`${ratio * 100} 100`}
                transform="rotate(-90 52 52)"
              />
            </svg>
            <span
              aria-hidden="true"
              className="absolute inset-0 grid place-items-center font-celia-figure text-[17px] font-bold"
            >
              {percent}%
            </span>
          </div>
          <div className="min-w-0">
            {householdScope && (
              <p className="text-[length:var(--font-size-caps)] text-celia-muted">
                Household goal
              </p>
            )}
            <h2 className="text-[15px] font-semibold break-words">
              {data.name}
            </h2>
            <p className="my-[5px] font-celia-figure text-[13px] break-words text-celia-ink-secondary">
              {formatCentavos(data.currentBalanceCentavos)} /{" "}
              {data.targetAmountCentavos === null
                ? "—"
                : formatCentavos(data.targetAmountCentavos)}
            </p>
            <p
              className={`text-[length:var(--font-size-secondary)] leading-[1.45] ${data.status === "funded" ? "text-celia-status-green" : "text-[var(--savings-warning-ink)]"}`}
            >
              {note}
            </p>
          </div>
        </>
      )}
    </section>
  );
}

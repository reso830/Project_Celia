import { formatCentavos } from "@/domain/amount";
import type { UpcomingCommitmentsData } from "@/domain/dashboard";
function formatMonthLabel(monthKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${monthKey}-15T12:00:00Z`));
}
export default function UpcomingCommitmentsCard({
  data,
  householdScope = false,
}: {
  data: UpcomingCommitmentsData;
  householdScope?: boolean;
}) {
  return (
    <section
      aria-label="Upcoming commitments"
      className="min-w-0 rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-4-5)]"
    >
      <h2 className="mb-[var(--space-3)] text-[length:var(--font-size-card-title)] font-semibold">
        Upcoming commitments
      </h2>
      {householdScope && (
        <p className="mb-2 text-[length:var(--font-size-caps)] text-celia-muted">
          Household commitments
        </p>
      )}
      {data.commitments.length === 0 ? (
        <p className="text-[length:var(--font-size-body)] text-celia-muted">
          No upcoming commitments
        </p>
      ) : (
        <ul className="text-[length:var(--font-size-body)]">
          {data.commitments.map((item) => (
            <li
              key={item.bucketId}
              className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-2-5)] gap-y-1 border-b border-celia-row-divider py-[9px]"
            >
              <span className="min-w-0 break-words">
                {item.name}{" "}
                <span className="text-[length:var(--font-size-secondary)] text-celia-muted">
                  ·{" "}
                  <time dateTime={item.targetMonth}>
                    {formatMonthLabel(item.targetMonth)}
                  </time>
                </span>
              </span>
              <span
                className={`shrink-0 font-celia-figure text-[length:var(--font-size-table-figure)] ${item.isFunded ? "text-celia-status-green" : "text-celia-ink-secondary"}`}
              >
                {formatCentavos(item.remainingCentavos)} left
                {item.isFunded ? " · Funded" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

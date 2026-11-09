import { formatCentavos } from "@/domain/amount";
import { formatBucketTypeSubtitle } from "@/domain/savings";
import type { BucketDerivedMetrics } from "@/domain/savings-calculations";
import { monthShort } from "./savings-kpi-row";
// lifted from prototype CSS: HF L296-L312 bucket card, progress and switch styles; activity and management actions recreated manually per D3.
export default function BucketCard({
  metrics,
  month,
  pending,
  onAction,
  onToggle,
}: {
  metrics: BucketDerivedMetrics;
  month: string;
  pending: boolean;
  onAction: (
    action: "contribution" | "withdrawal" | "history" | "edit" | "archive",
  ) => void;
  onToggle: () => void;
}) {
  const m = metrics,
    b = m.bucket,
    target = b.targetAmount;
  const actions = [
    ["Contribute", "contribution"],
    ["Withdraw", "withdrawal"],
    ["History", "history"],
    ["Edit", "edit"],
    ["Archive", "archive"],
  ] as const;
  return (
    <article
      aria-label={b.name}
      className={`min-w-0 rounded-celia-card border bg-celia-surface p-[var(--space-4-5)] ${b.countsTowardBuffer ? "border-celia-filter-selected" : "border-celia-border"}`}
    >
      <div className="mb-[var(--space-3)] flex items-start justify-between gap-[var(--space-3)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            <h2 className="break-words text-[length:var(--font-size-card-title)] font-semibold">
              {b.name}
            </h2>
            {b.countsTowardBuffer && (
              <span className="rounded-celia-pill bg-celia-accent-tint px-[var(--space-2)] py-[var(--savings-switch-inset)] text-[length:var(--savings-badge-font)] font-medium tracking-wider text-celia-accent-dark">
                {b.isDefault ? "DEFAULT" : "COUNTED"}
              </span>
            )}
          </div>
          <p className="mt-[var(--savings-switch-inset)] text-[length:var(--font-size-secondary)] text-celia-muted">
            {formatBucketTypeSubtitle(b)}
          </p>
          {b.description && (
            <p className="mt-[var(--space-1)] break-words text-[length:var(--font-size-secondary)] text-celia-muted">
              {b.description}
            </p>
          )}
        </div>
        <strong className="shrink-0 font-celia-figure text-[length:var(--savings-card-figure)]">
          {formatCentavos(m.currentBalanceCentavos)}
        </strong>
      </div>
      <div className="mb-[var(--space-item-header-bottom)] h-[var(--savings-bar-height)] overflow-hidden rounded-[var(--savings-bar-radius)] bg-celia-border-subtle">
        <div
          className={`h-full rounded-[var(--savings-bar-radius)] ${target === null ? "bg-celia-accent" : m.currentBalanceCentavos >= target ? "bg-celia-status-green" : "bg-celia-status-amber"}`}
          style={{ width: `${m.progressBarPercent}%` }}
        />
      </div>
      <div className="mb-[var(--space-row-y)] flex justify-between gap-[var(--space-2)] text-[length:var(--font-size-secondary)] text-celia-muted">
        <span>
          {target === null
            ? "no target"
            : `${formatCentavos(m.currentBalanceCentavos)} of ${formatCentavos(target)} \u00b7 ${formatCentavos(m.remainingToTargetCentavos ?? 0)} left`}
        </span>
        <span className="shrink-0">
          {m.progressPercent === null ? "open-ended" : `${m.progressPercent}%`}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)] border-t border-celia-border-subtle pt-[var(--space-3)]">
        <div className="text-[length:var(--font-size-control)]">
          <span className="text-celia-muted">Funded {monthShort(month)} </span>
          <b
            className={`font-celia-figure ${m.monthlyShortfallCentavos > 0 ? "text-[color:var(--savings-warning-ink)]" : ""}`}
          >
            {formatCentavos(m.monthlyContributionsCentavos)}
            {m.plannedMonthlyCentavos > 0
              ? ` of ${formatCentavos(m.plannedMonthlyCentavos)}`
              : ""}
          </b>
        </div>
        <button
          type="button"
          role="switch"
          aria-label={`${b.name} buffer`}
          aria-checked={b.countsTowardBuffer}
          disabled={pending || b.isDefault}
          onClick={onToggle}
          title={
            b.isDefault
              ? "The default Cash Buffer always counts toward the buffer."
              : "Counts toward the savings buffer"
          }
          className="flex items-center gap-[var(--space-2)] text-[length:var(--font-size-secondary)] text-celia-muted disabled:cursor-default"
        >
          buffer
          <span
            className={`relative inline-block h-[var(--savings-switch-height)] w-[var(--savings-switch-width)] rounded-celia-pill ${b.countsTowardBuffer ? "bg-celia-accent" : "bg-celia-umbrella-unallocated"}`}
          >
            <span
              className={`absolute top-[var(--savings-switch-inset)] h-[var(--savings-switch-knob)] w-[var(--savings-switch-knob)] rounded-full bg-celia-surface ${b.countsTowardBuffer ? "left-[var(--savings-switch-on-left)]" : "left-[var(--savings-switch-inset)]"}`}
            />
          </span>
        </button>
      </div>
      <div className="mt-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]">
        {actions.map(([label, action]) => (
          <button
            key={action}
            type="button"
            disabled={pending}
            onClick={() => onAction(action)}
            className={`rounded-celia-action border border-celia-border px-[var(--space-2)] py-[var(--space-1)] text-[length:var(--font-size-secondary)] hover:bg-celia-surface-subtle disabled:text-celia-muted ${action === "archive" ? "text-celia-status-red" : "text-celia-ink-secondary"}`}
          >
            {label}
          </button>
        ))}
      </div>
    </article>
  );
}

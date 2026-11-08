export default function SavingsLoading() {
  return (
    <div role="status" aria-label="Loading savings">
      <span className="sr-only">Loading savings</span>
      <div aria-hidden="true" className="animate-pulse">
        <div className="mb-[var(--header-margin-bottom)] h-[var(--header-min-height)] w-1/3 rounded-celia-control bg-celia-border" />
        <div className="mb-[var(--space-4)] grid grid-cols-[var(--savings-kpi-columns)] gap-[var(--space-3-5)]">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-4-5)]"
            >
              <div className="mb-[var(--space-3)] h-[var(--savings-card-figure)] w-1/2 bg-celia-border" />
              <div className="h-[var(--header-min-height)] bg-celia-surface-subtle" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[var(--savings-bucket-columns)] gap-[var(--space-3-5)]">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-4-5)]"
            >
              <div className="h-[var(--header-min-height)] bg-celia-surface-subtle" />
              <div className="mt-[var(--space-5)] h-[var(--header-min-height)] bg-celia-surface-subtle" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

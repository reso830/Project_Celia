export default function EntriesLoading() {
  return (
    <div
      role="status"
      aria-label="Loading entries"
      className="animate-pulse motion-reduce:animate-none"
    >
      <div className="mb-[var(--header-margin-bottom)] flex min-h-[var(--header-min-height)] items-center justify-between gap-[var(--space-4)]">
        <div className="h-9 w-32 rounded-celia-control bg-celia-surface-subtle" />
        <div className="flex gap-[var(--space-2)]">
          <div className="h-8 w-24 rounded-celia-control bg-celia-surface-subtle" />
          <div className="h-8 w-32 rounded-celia-control bg-celia-surface-subtle" />
          <div className="h-8 w-28 rounded-celia-control bg-celia-surface-subtle" />
        </div>
      </div>
      <div className="mb-[var(--space-4)] flex gap-[var(--space-2)]">
        <div className="h-7 w-20 rounded-celia-control bg-celia-surface-subtle" />
        <div className="h-7 w-28 rounded-celia-control bg-celia-surface-subtle" />
      </div>
      <div className="rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-5)]">
        <div className="mb-[var(--space-3)] h-4 w-full bg-celia-surface-subtle" />
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-12 border-t border-celia-row-divider bg-celia-surface-subtle/50"
          />
        ))}
      </div>
    </div>
  );
}

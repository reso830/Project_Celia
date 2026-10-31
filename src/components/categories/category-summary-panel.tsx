import EmptyState from "@/components/ui/empty-state";
export default function CategorySummaryPanel() {
  const label = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date());
  // lifted from prototype CSS
  return (
    <section className="mb-[var(--space-4)] grid grid-cols-[minmax(0,1fr)_170px] items-center gap-[var(--space-4-5)] rounded-celia-summary border border-celia-border-subtle bg-celia-surface-subtle px-[var(--space-4)] py-[var(--space-3-5)]">
      <div>
        <p className="text-[length:var(--font-size-control)] text-celia-muted">
          {label} spend
        </p>
        <EmptyState />
      </div>
    </section>
  );
}

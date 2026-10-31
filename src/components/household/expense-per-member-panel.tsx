import EmptyState from "@/components/ui/empty-state";
export default function ExpensePerMemberPanel() {
  // lifted from prototype CSS
  return (
    <section className="rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-4-5)]">
      <h2 className="mb-[var(--space-3-5)] text-[length:var(--font-size-card-title)] font-semibold">
        Expense per member
      </h2>
      <div className="flex h-[180px] items-center border-b border-celia-rail-border">
        <EmptyState />
      </div>
    </section>
  );
}

export default function DefaultsPanel({
  defaults,
}: {
  defaults: { owner: string; currency: string };
}) {
  // lifted from prototype CSS
  return (
    <section className="rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-4-5)]">
      <h2 className="mb-[var(--space-3-5)] text-[length:var(--font-size-card-title)] font-semibold">
        Defaults
      </h2>
      <dl className="space-y-[var(--space-3)] text-[length:var(--font-size-body)]">
        <div className="flex items-center justify-between gap-[var(--space-3)]">
          <dt>New entries owned by</dt>
          <dd className="rounded-celia-action border border-celia-border px-[var(--space-3)] py-[var(--space-1-5)] text-[length:var(--font-size-secondary)] text-celia-ink-secondary">
            {defaults.owner}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-[var(--space-3)]">
          <dt>Currency</dt>
          <dd className="rounded-celia-action border border-celia-border px-[var(--space-3)] py-[var(--space-1-5)] text-[length:var(--font-size-secondary)] text-celia-ink-secondary">
            {defaults.currency}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-[var(--space-3)]">
          <dt>Active model</dt>
          <dd className="rounded-celia-action border border-celia-border px-[var(--space-3)] py-[var(--space-1-5)] text-[length:var(--font-size-secondary)] text-celia-ink-secondary">
            Not set
          </dd>
        </div>
      </dl>
      <p className="mt-[var(--space-3-5)] border-t border-celia-border-subtle pt-[var(--space-3)] text-[length:var(--font-size-secondary)] text-celia-muted">
        <strong className="font-semibold text-celia-ink">
          Later, not now.
        </strong>{" "}
        Live forex, recurring entries, bank import, custom month start.
      </p>
    </section>
  );
}

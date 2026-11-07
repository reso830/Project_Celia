"use client";

export default function EntriesError({
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <section
      role="alert"
      className="rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-5)]"
    >
      <h2 className="font-semibold text-celia-ink">
        Entries could not be loaded.
      </h2>
      <p className="mt-[var(--space-2)] text-celia-muted">
        Try again to reload your entries.
      </p>
      <button
        type="button"
        onClick={retry}
        className="mt-[var(--space-4)] rounded-celia-action bg-celia-ink px-[var(--space-3)] py-[var(--space-2)] text-celia-surface"
      >
        Try again
      </button>
    </section>
  );
}

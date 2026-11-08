"use client";
export default function ModelsError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <section className="rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-5)]">
      <h1 className="text-[length:var(--font-size-card-title)] font-semibold">
        Unable to load budget models
      </h1>
      <p className="my-[var(--space-3)] text-celia-muted">Please try again.</p>
      <button
        type="button"
        onClick={retry}
        className="rounded-celia-control border border-celia-border px-[var(--space-3)] py-[var(--space-2)]"
      >
        Try again
      </button>
    </section>
  );
}

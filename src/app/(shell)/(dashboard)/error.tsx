"use client";

import PageHeader from "@/components/shell/page-header";

export default function DashboardError({ retry }: { retry: () => void }) {
  return (
    <>
      <PageHeader title="Dashboard" />
      <section className="rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-5)]">
        <h2
          role="alert"
          className="text-[length:var(--font-size-card-title)] font-semibold"
        >
          Could not load the dashboard
        </h2>
        <button
          type="button"
          onClick={retry}
          className="mt-[var(--space-3)] rounded-celia-control-compact bg-celia-accent px-[var(--space-4)] py-[var(--space-1-75)] text-celia-surface hover:bg-celia-accent-dark"
        >
          Try again
        </button>
      </section>
    </>
  );
}

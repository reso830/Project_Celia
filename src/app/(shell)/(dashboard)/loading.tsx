import PageHeader from "@/components/shell/page-header";

const card =
  "min-w-0 rounded-celia-card border border-celia-border bg-celia-surface-subtle";

export default function DashboardLoading() {
  return (
    <>
      <PageHeader title="Dashboard" />
      <div role="status">
        <span className="sr-only">Loading dashboard</span>
        <div
          aria-hidden="true"
          className="grid gap-[var(--space-3-5)] motion-safe:animate-pulse"
        >
          <div className="grid gap-[var(--space-3-5)] lg:grid-cols-[minmax(0,35fr)_minmax(0,65fr)]">
            <div className={`${card} min-h-56`} />
            <div className="grid grid-cols-2 gap-[var(--space-3-5)]">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className={`${card} min-h-24`} />
              ))}
            </div>
          </div>
          <div className="grid gap-[var(--space-3-5)] lg:grid-cols-[minmax(0,35fr)_minmax(0,65fr)]">
            <div className={`${card} min-h-80`} />
            <div className={`${card} min-h-80`} />
          </div>
          <div className="grid gap-[var(--space-3-5)] lg:grid-cols-2">
            <div className={`${card} min-h-64`} />
            <div className={`${card} min-h-64`} />
          </div>
          <div className="grid gap-[var(--space-3-5)] lg:grid-cols-2">
            <div className={`${card} min-h-36`} />
            <div className={`${card} min-h-36`} />
          </div>
        </div>
      </div>
    </>
  );
}

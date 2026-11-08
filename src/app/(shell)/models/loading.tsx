export default function ModelsLoading() {
  return (
    <section
      role="status"
      aria-label="Loading budget models"
      className="animate-pulse"
    >
      <span className="sr-only">Loading budget models...</span>
      <div className="mb-6 h-10 w-64 rounded-celia-control bg-celia-border" />
      <div className="grid grid-cols-[minmax(200px,25%)_minmax(0,1fr)] gap-4">
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 rounded-celia-summary bg-celia-border"
            />
          ))}
        </div>
        <div className="h-[640px] rounded-celia-card border border-celia-border bg-celia-surface p-5">
          <div className="mb-5 h-24 rounded-celia-summary bg-celia-surface-subtle" />
          <div className="mb-5 h-60 rounded-celia-summary bg-celia-surface-subtle" />
          <div className="h-48 rounded-celia-summary bg-celia-surface-subtle" />
        </div>
      </div>
    </section>
  );
}

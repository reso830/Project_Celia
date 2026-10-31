export default function EmptyState({
  children = "No entries yet.",
}: {
  children?: string;
}) {
  return (
    <p className="text-[length:var(--font-size-secondary)] text-celia-muted">
      {children}
    </p>
  );
}

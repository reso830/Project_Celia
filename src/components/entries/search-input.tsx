"use client";

export default function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    // lifted from prototype CSS
    <input
      type="text"
      aria-label="Search entries"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search notes and items…"
      className="min-w-[180px] flex-1 rounded-celia-control-compact border border-celia-border bg-celia-surface px-[13px] py-[var(--space-2)] text-[length:var(--font-size-control)] text-celia-ink placeholder:text-celia-muted"
    />
  );
}

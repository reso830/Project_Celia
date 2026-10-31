"use client";

import { useState } from "react";

export default function MonthPicker() {
  const [month, setMonth] = useState(() => new Date());
  const label = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(month);
  const changeMonth = (offset: number) =>
    setMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );

  // lifted from prototype CSS; the label is box-content because the
  // prototype has no border-box reset, so its 88px min-width excludes padding
  return (
    <div className="flex overflow-hidden rounded-celia-control-compact border border-celia-border bg-celia-surface">
      <button
        aria-label="Previous month"
        type="button"
        onClick={() => changeMonth(-1)}
        className="px-[var(--space-3)] py-[var(--space-1-75)] text-[length:var(--font-size-control)] text-celia-muted hover:bg-celia-surface-subtle"
      >
        ◀
      </button>
      <span className="box-content min-w-[88px] border-x border-celia-border px-[var(--space-3-5)] py-[var(--space-1-75)] text-center text-[length:var(--font-size-control)] font-medium">
        {label}
      </span>
      <button
        aria-label="Next month"
        type="button"
        onClick={() => changeMonth(1)}
        className="px-[var(--space-3)] py-[var(--space-1-75)] text-[length:var(--font-size-control)] text-celia-muted hover:bg-celia-surface-subtle"
      >
        ▶
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";

function toDate(month: string) {
  const [year, number] = month.split("-").map(Number);
  return new Date(year, number - 1, 1);
}

function toMonthKey(month: Date) {
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
}

export default function MonthPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (month: string) => void;
}) {
  const [uncontrolled, setUncontrolled] = useState(() =>
    toMonthKey(new Date()),
  );
  const monthKey = value ?? uncontrolled;
  const month = toDate(monthKey);
  const label = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(month);
  const changeMonth = (offset: number) => {
    const next = toMonthKey(
      new Date(month.getFullYear(), month.getMonth() + offset, 1),
    );
    if (value === undefined) setUncontrolled(next);
    onChange?.(next);
  };

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

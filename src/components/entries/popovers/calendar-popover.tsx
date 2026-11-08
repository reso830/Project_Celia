"use client";

import { useEffect, useMemo, useState } from "react";

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function CalendarPopover({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (value: string) => void;
}) {
  const [month, setMonth] = useState(
    () => new Date(toDate(value).getFullYear(), toDate(value).getMonth(), 1),
  );
  const [focusedDate, setFocusedDate] = useState(value);
  useEffect(() => {
    document
      .querySelector<HTMLButtonElement>(`[data-calendar-day="${value}"]`)
      ?.focus();
  }, [value]); // Focus the selected day only when opening.
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [month]);
  const title = month.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  // lifted from prototype CSS (HF L565-L572, L720-L734)
  return (
    <div
      role="dialog"
      aria-label="Choose date"
      className="w-full p-[var(--space-3)]"
    >
      <div className="mb-[var(--space-2)] flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous calendar month"
          onClick={() => {
            const next = new Date(month.getFullYear(), month.getMonth() - 1, 1);
            setMonth(next);
            setFocusedDate(dateKey(next));
          }}
        >
          ◀
        </button>
        <strong>{title}</strong>
        <button
          type="button"
          aria-label="Next calendar month"
          onClick={() => {
            const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
            setMonth(next);
            setFocusedDate(dateKey(next));
          }}
        >
          ▶
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[length:var(--font-size-secondary)] text-celia-muted">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <span key={index}>{day}</span>
        ))}
      </div>
      <div
        className="grid grid-cols-7"
        onKeyDown={(event) => {
          const movement: Record<string, number> = {
            ArrowLeft: -1,
            ArrowRight: 1,
            ArrowUp: -7,
            ArrowDown: 7,
          };
          if (event.key === "Enter") {
            event.preventDefault();
            onSelect(focusedDate);
            return;
          }
          if (!(event.key in movement)) return;
          event.preventDefault();
          const next = toDate(focusedDate);
          next.setDate(next.getDate() + movement[event.key]);
          const nextKey = dateKey(next);
          setFocusedDate(nextKey);
          setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
          requestAnimationFrame(() =>
            document
              .querySelector<HTMLButtonElement>(
                `[data-calendar-day="${nextKey}"]`,
              )
              ?.focus(),
          );
        }}
      >
        {days.map((day) => {
          const key = dateKey(day);
          const selected = key === value;
          if (day.getMonth() !== month.getMonth()) return <span key={key} />;
          return (
            <button
              data-calendar-day={key}
              key={key}
              type="button"
              tabIndex={key === focusedDate ? 0 : -1}
              onFocus={() => setFocusedDate(key)}
              onClick={() => onSelect(key)}
              className={`grid h-[32px] w-full place-items-center rounded-celia-option font-celia-figure ${selected ? "bg-celia-accent-dark font-bold text-celia-surface" : "text-celia-ink"}`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import type { EntryType } from "@/domain/entry";

type FilterType = EntryType | "all";

export default function TypeFilter({
  value,
  onChange,
}: {
  value: FilterType;
  onChange: (value: FilterType) => void;
}) {
  return (
    // recreated manually: type filter not represented in prototype header (spec clarification)
    <div
      role="group"
      className="flex overflow-hidden rounded-celia-pill border border-celia-border bg-celia-surface"
      aria-label="Entry type"
    >
      {(["all", "expense", "income"] as const).map((type) => {
        const selected = value === type;
        return (
          <button
            key={type}
            type="button"
            aria-pressed={selected}
            className={`px-[var(--space-3-5)] py-[var(--space-1-75)] text-[length:var(--font-size-control)] ${
              selected
                ? "bg-celia-accent-tint font-medium text-celia-accent-dark"
                : "text-celia-muted hover:bg-celia-surface-subtle"
            }`}
            onClick={() => onChange(type)}
          >
            {type === "all" ? "All" : type[0].toUpperCase() + type.slice(1)}
          </button>
        );
      })}
    </div>
  );
}

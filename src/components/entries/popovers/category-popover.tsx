"use client";

import { useEffect, useRef, useState } from "react";
import type { EntriesCategory } from "@/server/entries-read";

export default function CategoryPopover({
  categories,
  selectedId,
  onSelect,
}: {
  categories: readonly EntriesCategory[];
  selectedId: string;
  onSelect: (category: EntriesCategory) => void;
}) {
  const [focusedIndex, setFocusedIndex] = useState(() =>
    Math.max(
      0,
      categories.findIndex((category) => category.id === selectedId),
    ),
  );
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => optionRefs.current[focusedIndex]?.focus(), [focusedIndex]);
  if (!categories.length) {
    return (
      <p className="p-[var(--space-3)] text-celia-muted">
        No categories available. Create a category first in Categories.
      </p>
    );
  }
  // lifted from prototype CSS (HF L576-L580, L741-L747)
  return (
    <div
      role="listbox"
      aria-label="Category options"
      onKeyDown={(event) => {
        if (
          event.key !== "ArrowDown" &&
          event.key !== "ArrowUp" &&
          event.key !== "Enter"
        )
          return;
        event.preventDefault();
        if (event.key === "Enter") {
          onSelect(categories[focusedIndex]);
          return;
        }
        const next =
          (focusedIndex +
            (event.key === "ArrowDown" ? 1 : categories.length - 1)) %
          categories.length;
        setFocusedIndex(next);
        optionRefs.current[next]?.focus();
      }}
      className="max-h-[240px] overflow-auto p-[4px]"
    >
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          role="option"
          ref={(node) => {
            optionRefs.current[categories.indexOf(category)] = node;
          }}
          tabIndex={category.id === selectedId ? 0 : -1}
          onFocus={() => setFocusedIndex(categories.indexOf(category))}
          aria-selected={category.id === selectedId}
          onClick={() => onSelect(category)}
          className={`flex w-full items-center gap-[var(--space-2)] px-[10px] py-[var(--space-2)] text-left text-[13.5px] ${
            category.id === selectedId
              ? "rounded-celia-option bg-celia-accent-tint font-medium text-celia-accent-dark"
              : "rounded-celia-option text-celia-ink hover:bg-celia-surface-subtle"
          }`}
        >
          <span
            aria-hidden="true"
            className="size-[11px] rounded-celia-swatch"
            style={{ backgroundColor: category.color }}
          />
          {category.name}
          {category.archived ? " (archived)" : ""}
        </button>
      ))}
    </div>
  );
}

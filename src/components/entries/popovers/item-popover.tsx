"use client";

import { useEffect, useRef, useState } from "react";
export type ItemOption = { id: string; name: string };

export default function ItemPopover({
  items,
  selectedId,
  onSelect,
}: {
  items: readonly ItemOption[];
  selectedId: string;
  onSelect: (item: ItemOption) => void;
}) {
  const [focusedIndex, setFocusedIndex] = useState(() =>
    Math.max(
      0,
      items.findIndex((item) => item.id === selectedId),
    ),
  );
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => optionRefs.current[focusedIndex]?.focus(), [focusedIndex]);
  if (!items.length) {
    return (
      <p className="p-[var(--space-3)] text-celia-muted">
        No items in this category. Add items in Categories.
      </p>
    );
  }
  // lifted from prototype CSS (HF L583-L588, L748-L752)
  return (
    <div
      role="listbox"
      aria-label="Item options"
      onKeyDown={(event) => {
        if (
          event.key !== "ArrowDown" &&
          event.key !== "ArrowUp" &&
          event.key !== "Enter"
        )
          return;
        event.preventDefault();
        if (event.key === "Enter") {
          onSelect(items[focusedIndex]);
          return;
        }
        const next =
          (focusedIndex + (event.key === "ArrowDown" ? 1 : items.length - 1)) %
          items.length;
        setFocusedIndex(next);
        optionRefs.current[next]?.focus();
      }}
      className="max-h-[240px] overflow-auto p-[4px]"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="option"
          ref={(node) => {
            optionRefs.current[items.indexOf(item)] = node;
          }}
          tabIndex={item.id === selectedId ? 0 : -1}
          onFocus={() => setFocusedIndex(items.indexOf(item))}
          aria-selected={item.id === selectedId}
          onClick={() => onSelect(item)}
          className={`block w-full px-[10px] py-[var(--space-2)] text-left text-[13.5px] ${
            item.id === selectedId
              ? "rounded-celia-option bg-celia-accent-tint font-medium text-celia-accent-dark"
              : "rounded-celia-option text-celia-ink hover:bg-celia-surface-subtle"
          }`}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
}

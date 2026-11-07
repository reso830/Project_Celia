import { useLayoutEffect, useRef } from "react";
import type { EntryWithDetails } from "@/domain/entry";
import { formatEntryAmount, formatEntryDate } from "./entry-display";

export default function EntryRow({
  entry,
  memberFiltered,
  onEdit,
  onDelete,
}: {
  entry: EntryWithDetails;
  memberFiltered: boolean;
  onEdit?: (entry: EntryWithDetails) => void;
  onDelete: (entry: EntryWithDetails) => void;
}) {
  const amount = formatEntryAmount(entry, { prefix: "" });
  const rowRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const row = rowRef.current;
    return () => {
      if (row?.contains(document.activeElement)) {
        row.closest<HTMLElement>('[role="table"]')?.focus();
      }
    };
  }, []);

  // lifted from prototype CSS
  return (
    <div
      role="row"
      ref={rowRef}
      data-entry-id={entry.id}
      className="grid grid-cols-[78px_minmax(0,34%)_minmax(0,1fr)_minmax(0,0.8fr)_100px_58px] items-center gap-[var(--space-2-5)] border-b border-celia-row-divider px-[var(--space-5)] py-[11px] text-[length:var(--font-size-body)] hover:bg-celia-surface-subtle"
    >
      <span
        role="cell"
        className="font-celia-figure text-[length:var(--font-size-table-figure)] text-celia-muted"
      >
        {formatEntryDate(entry.date)}
      </span>
      <span role="cell" className="min-w-0 truncate text-celia-ink">
        {entry.itemName}
      </span>
      <span
        role="cell"
        className="flex min-w-0 items-center gap-[var(--space-2)]"
      >
        <span
          aria-hidden="true"
          className="size-[10px] shrink-0 rounded-celia-swatch"
          style={{ backgroundColor: entry.categoryColor }}
        />
        <span className="truncate text-[length:var(--font-size-control)]">
          {entry.categoryName}
          {entry.categoryArchived ? " (archived)" : ""}
        </span>
      </span>
      <span
        role="cell"
        className="flex items-center gap-[var(--space-1-5)] text-[length:var(--font-size-control)] text-celia-ink-secondary"
      >
        <span>
          {entry.ownerName}
          {entry.ownerArchived ? " (archived)" : ""}
        </span>
        {memberFiltered && entry.isHousehold ? (
          <span className="rounded-celia-option bg-celia-surface-subtle px-[var(--space-1-5)] py-[var(--space-1)] text-[length:var(--font-size-item-count)] text-celia-muted">
            Shared
          </span>
        ) : null}
      </span>
      <span
        role="cell"
        className={`text-right font-celia-figure text-[length:var(--font-size-table-figure)] ${
          entry.type === "income" ? "text-celia-status-green" : "text-celia-ink"
        }`}
      >
        {amount}
      </span>
      <span role="cell" className="flex justify-end gap-[var(--space-1)]">
        <button
          type="button"
          aria-label={`Edit entry ${entry.itemName}`}
          onClick={() => onEdit?.(entry)}
          className="grid size-[22px] place-items-center rounded-[6px] text-[length:12px] text-celia-muted hover:bg-celia-accent-tint hover:text-celia-accent-dark"
        >
          ✎
        </button>
        <button
          type="button"
          aria-label={`Delete entry ${entry.itemName}`}
          onClick={() => onDelete(entry)}
          className="grid size-[22px] place-items-center rounded-[6px] text-[length:12px] text-celia-muted hover:bg-celia-status-red hover:text-celia-surface"
        >
          ✕
        </button>
      </span>
    </div>
  );
}

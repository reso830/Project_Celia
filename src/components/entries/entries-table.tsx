"use client";

import { useEffect, useRef, useState } from "react";
import { sortEntries } from "@/domain/entry-calculations";
import type { EntryWithDetails } from "@/domain/entry";
import EntryRow from "./entry-row";

type SortField = "date" | "amount";
type SortDirection = "asc" | "desc";

export default function EntriesTable({
  entries,
  ownerId,
  onEdit,
  onDelete,
  emptyMessage,
  focusEntryId,
  onFocusRestored,
}: {
  entries: readonly EntryWithDetails[];
  ownerId: string | "all";
  onEdit?: (entry: EntryWithDetails) => void;
  onDelete: (entry: EntryWithDetails, focusEntryId: string | null) => void;
  emptyMessage?: string | null;
  focusEntryId?: string | null;
  onFocusRestored?: () => void;
}) {
  const [sort, setSort] = useState<{
    field: SortField;
    direction: SortDirection;
  }>({ field: "date", direction: "desc" });
  const sortedEntries = sortEntries(entries, sort.field, sort.direction);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusEntryId === undefined) return;
    const nextAction = focusEntryId
      ? tableRef.current?.querySelector<HTMLButtonElement>(
          `[data-entry-id="${focusEntryId}"] button[aria-label^="Delete entry"]`,
        )
      : null;
    (nextAction ?? tableRef.current)?.focus();
    onFocusRestored?.();
  }, [focusEntryId, onFocusRestored, sortedEntries]);

  function toggleSort(field: SortField) {
    setSort((current) => ({
      field,
      direction:
        current.field === field && current.direction === "desc"
          ? "asc"
          : "desc",
    }));
  }

  const dateChevron =
    sort.field === "date" ? (sort.direction === "asc" ? "▲" : "▼") : "";
  const amountChevron =
    sort.field === "amount" ? (sort.direction === "asc" ? "▲" : "▼") : "";

  // lifted from prototype CSS
  return (
    <div
      role="table"
      ref={tableRef}
      tabIndex={-1}
      aria-label="Entries"
      className="overflow-hidden rounded-celia-card border border-celia-border bg-celia-surface"
    >
      <div
        role="row"
        className="grid grid-cols-[78px_minmax(0,34%)_minmax(0,1fr)_minmax(0,0.8fr)_100px_58px] gap-[var(--space-2-5)] border-b border-celia-border bg-celia-surface-subtle px-[var(--space-5)] py-[var(--space-3)] text-[length:var(--font-size-caps)] font-medium tracking-[0.06em] text-celia-muted"
      >
        <span
          role="columnheader"
          aria-sort={
            sort.field === "date"
              ? sort.direction === "asc"
                ? "ascending"
                : "descending"
              : undefined
          }
        >
          <button
            type="button"
            aria-label="Sort by date"
            onClick={() => toggleSort("date")}
            className="flex items-center gap-[var(--space-1)] hover:text-celia-accent-dark"
          >
            DATE{" "}
            {dateChevron ? (
              <span className="text-[8px] text-celia-accent-dark">
                {dateChevron}
              </span>
            ) : null}
          </button>
        </span>
        <span role="columnheader">ITEM</span>
        <span role="columnheader">CATEGORY</span>
        <span role="columnheader">OWNER</span>
        <span
          role="columnheader"
          className="text-right"
          aria-sort={
            sort.field === "amount"
              ? sort.direction === "asc"
                ? "ascending"
                : "descending"
              : undefined
          }
        >
          <button
            type="button"
            aria-label="Sort by amount"
            onClick={() => toggleSort("amount")}
            className="ml-auto flex items-center gap-[var(--space-1)] hover:text-celia-accent-dark"
          >
            AMOUNT{" "}
            {amountChevron ? (
              <span className="text-[8px] text-celia-accent-dark">
                {amountChevron}
              </span>
            ) : null}
          </button>
        </span>
        <span role="columnheader" aria-label="Actions" />
      </div>
      {sortedEntries.length ? (
        sortedEntries.map((entry, index) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            memberFiltered={ownerId !== "all"}
            onEdit={onEdit}
            onDelete={(deletedEntry) =>
              onDelete(
                deletedEntry,
                sortedEntries[index + 1]?.id ??
                  sortedEntries[index - 1]?.id ??
                  null,
              )
            }
          />
        ))
      ) : emptyMessage ? (
        <div
          role="row"
          className="px-[var(--space-5)] py-[34px] text-center text-[length:var(--font-size-body)] text-celia-muted"
        >
          <span role="cell">{emptyMessage}</span>
        </div>
      ) : null}
    </div>
  );
}

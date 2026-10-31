"use client";
import { useState } from "react";
import type { Item } from "@/domain/item";
import { useMutation } from "@/components/ui/use-mutation";
import MoveItemDialog from "./move-item-dialog";
import type { CategoryRowData } from "./types";

export default function ItemRow({
  item,
  category,
  categories,
}: {
  item: Item;
  category: CategoryRowData;
  categories: CategoryRowData[];
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [error, setError] = useState("");
  const [moveOpen, setMoveOpen] = useState(false);
  const { run, pending } = useMutation();
  async function save() {
    if (pending) return;
    const result = await run(`/api/items/${item.id}`, "PATCH", { name });
    if (result) {
      setError(result.message);
      setName(item.name);
    } else setEditing(false);
  }
  // recreated manually: wireframe-only rename interaction
  return (
    <div className="grid grid-cols-[minmax(120px,1fr)_56px_92px_52px] items-center gap-[var(--space-2-5)] border-b border-celia-row-divider py-[11px] text-[length:var(--font-size-body)]">
      <div className="min-w-0">
        {editing && !category.archived ? (
          <input
            aria-label={`Rename ${item.name}`}
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void save();
              if (event.key === "Escape") {
                setName(item.name);
                setEditing(false);
              }
            }}
            className="w-full rounded-celia-control border border-celia-border px-[var(--space-1)]"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={category.archived}
            aria-describedby={
              category.archived ? "archived-items-reason" : undefined
            }
            title={
              category.archived
                ? "Restore this category before renaming items."
                : undefined
            }
            className="truncate text-left"
          >
            {item.name}
          </button>
        )}
        {error ? (
          <p
            role="alert"
            className="text-[length:var(--font-size-secondary)] text-celia-status-red"
          >
            {error}
          </p>
        ) : null}
      </div>
      <span className="font-celia-figure text-[length:var(--font-size-table-figure)] text-celia-muted">
        —
      </span>
      <span className="font-celia-figure text-[length:var(--font-size-table-figure)]">
        —
      </span>
      <button
        type="button"
        onClick={() => setMoveOpen(true)}
        disabled={category.archived}
        aria-describedby={
          category.archived ? "archived-items-reason" : undefined
        }
        title={
          category.archived
            ? "Restore this category before moving items."
            : undefined
        }
        className="text-[length:var(--font-size-secondary)] text-celia-accent disabled:cursor-not-allowed disabled:text-celia-muted"
      >
        Move
      </button>
      <MoveItemDialog
        item={item}
        category={category}
        categories={categories}
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
      />
    </div>
  );
}

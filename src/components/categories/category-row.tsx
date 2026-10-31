"use client";
import { useCallback, useRef, useState } from "react";
import { useMutation } from "@/components/ui/use-mutation";
import ColorPicker from "./color-picker";
import type { CategoryRowData } from "./types";
export default function CategoryRow({
  category,
  selected,
  onSelect,
}: {
  category: CategoryRowData;
  selected: boolean;
  onSelect: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState("");
  const swatchRef = useRef<HTMLButtonElement>(null);
  const { run, pending } = useMutation();
  const closePicker = useCallback(() => {
    setPicker(false);
    swatchRef.current?.focus();
  }, []);
  async function save() {
    if (pending) return;
    const result = await run(`/api/categories/${category.id}`, "PATCH", {
      name,
    });
    if (result) {
      setError(result.message);
      setName(category.name);
    } else setEditing(false);
  }
  return (
    // lifted from prototype CSS
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-between gap-[var(--space-2-5)] border-b border-celia-row-divider px-[var(--space-4)] py-[11px] text-[length:var(--font-size-body)] ${selected ? "bg-celia-category-selected" : "hover:bg-celia-surface-subtle"}`}
    >
      <div className="flex min-w-0 items-center gap-[9px]">
        {category.archived ? (
          <span
            className="size-[11px] shrink-0 rounded-celia-swatch"
            style={{ backgroundColor: category.color }}
          />
        ) : (
          <button
            ref={swatchRef}
            type="button"
            aria-label={`Change colour for ${category.name}`}
            onClick={(event) => {
              event.stopPropagation();
              setPicker((open) => !open);
            }}
            className="size-[11px] shrink-0 rounded-celia-swatch"
            style={{ backgroundColor: category.color }}
          />
        )}
        {editing ? (
          <input
            aria-label={`Rename ${category.name}`}
            autoFocus
            value={name}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void save();
              if (event.key === "Escape") {
                setName(category.name);
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 rounded-celia-control border border-celia-border px-[var(--space-1)]"
          />
        ) : (
          <>
            <button
              type="button"
              aria-current={selected ? "page" : undefined}
              onClick={onSelect}
              className="truncate text-left"
            >
              {category.name}
            </button>
            {category.archived ? (
              /* recreated manually: hi-fi has no archived state */
              <span className="text-[length:var(--font-size-caps)] tracking-[.06em] text-celia-muted">
                ARCHIVED
              </span>
            ) : (
              <button
                type="button"
                aria-label={`Edit ${category.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setEditing(true);
                }}
                className="opacity-0 text-[length:var(--font-size-edit-icon)] text-celia-muted group-hover:opacity-100 focus-visible:opacity-100"
              >
                ✎
              </button>
            )}
          </>
        )}
      </div>
      <span className="shrink-0 text-[length:var(--font-size-item-count)] text-celia-muted">
        {category.itemCount} {category.itemCount === 1 ? "item" : "items"}
      </span>
      {error ? (
        <p
          role="alert"
          className="absolute bottom-0 text-[length:var(--font-size-secondary)] text-celia-status-red"
        >
          {error}
        </p>
      ) : null}
      {picker ? (
        <ColorPicker category={category} onClose={closePicker} />
      ) : null}
    </div>
  );
}

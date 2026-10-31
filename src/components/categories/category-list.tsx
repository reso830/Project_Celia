"use client";
import { useState } from "react";
import type { ClassifiableUmbrella } from "@/domain/umbrella";
import AddCategory from "./add-category";
import CategoryRow from "./category-row";
import type { CategoryRowData } from "./types";
export default function CategoryList({
  income,
  expense,
  selectedId,
  onSelect,
}: {
  income: CategoryRowData[];
  expense: CategoryRowData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState<Record<ClassifiableUmbrella, boolean>>({
    income: true,
    expense: true,
  });
  function group(umbrella: ClassifiableUmbrella, rows: CategoryRowData[]) {
    return (
      <div>
        <button
          type="button"
          onClick={() =>
            setOpen((value) => ({ ...value, [umbrella]: !value[umbrella] }))
          }
          className="flex w-full justify-between border-b border-celia-border bg-celia-surface-subtle px-[var(--space-4)] py-[11px] text-[length:var(--font-size-caps)] font-medium tracking-[.06em] text-celia-muted"
        >
          <span>
            {open[umbrella] ? "▾" : "▸"} {umbrella.toUpperCase()}
          </span>
          <span>
            {rows.length} {rows.length === 1 ? "category" : "categories"}
          </span>
        </button>
        {open[umbrella] ? (
          <>
            {rows.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                selected={category.id === selectedId}
                onSelect={() => onSelect(category.id)}
              />
            ))}
            <AddCategory umbrella={umbrella} />
          </>
        ) : null}
      </div>
    );
  }
  return (
    // lifted from prototype CSS, except the corners. recreated manually: HF L235
    // clips with overflow:hidden, which would also clip the colour picker. So
    // the card's first element (EXPENSE header) and last element ("+ add income
    // category", or the INCOME header while collapsed) take the inner radius,
    // and the last one drops any bottom border that would double the card's.
    <aside className="max-w-[340px] rounded-celia-card border border-celia-border bg-celia-surface [&>:first-child>:first-child]:rounded-t-[calc(var(--radius-card)-1px)] [&>:last-child>:last-child]:rounded-b-[calc(var(--radius-card)-1px)] [&>:last-child>:last-child]:border-b-0">
      {group("expense", expense)}
      {group("income", income)}
    </aside>
  );
}

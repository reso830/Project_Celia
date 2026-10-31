"use client";
import { useState } from "react";
import CategoryDetailHeader from "./category-detail-header";
import CategoryList from "./category-list";
import CategorySummaryPanel from "./category-summary-panel";
import ItemsTable from "./items-table";
import type { CategoryRowData } from "./types";
export default function CategoriesScreen({
  income,
  expense,
}: {
  income: CategoryRowData[];
  expense: CategoryRowData[];
}) {
  const categories = [...expense, ...income];
  const [selectedId, setSelectedId] = useState<string | null>(
    categories[0]?.id ?? null,
  );
  const selected =
    categories.find((category) => category.id === selectedId) ??
    categories[0] ??
    null;
  return (
    // lifted from prototype CSS
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-[var(--space-4)]">
      <CategoryList
        income={income}
        expense={expense}
        selectedId={selected?.id ?? null}
        onSelect={setSelectedId}
      />
      <section className="min-w-0 rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-5)]">
        {selected ? (
          <>
            <CategoryDetailHeader
              category={selected}
              categories={categories}
              onMerged={setSelectedId}
            />
            <CategorySummaryPanel />
            <ItemsTable category={selected} categories={categories} />
          </>
        ) : (
          <p className="text-celia-muted">Create a category to get started.</p>
        )}
      </section>
    </div>
  );
}

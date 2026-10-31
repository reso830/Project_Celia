"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { useMutation } from "@/components/ui/use-mutation";
import ArchiveCategoryDialog from "./archive-category-dialog";
import MergeCategoryDialog from "./merge-category-dialog";
import type { CategoryRowData } from "./types";

export default function CategoryDetailHeader({
  category,
  categories,
  onMerged,
}: {
  category: CategoryRowData;
  categories: CategoryRowData[];
  onMerged: (id: string) => void;
}) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [error, setError] = useState("");
  const { run, pending } = useMutation();

  async function restore() {
    const result = await run(`/api/categories/${category.id}/restore`, "POST");
    if (result) setError(result.message);
    else setRestoreOpen(false);
  }

  // lifted from prototype CSS: HF L250-252
  return (
    <>
      <header className="mb-[var(--space-4)] flex items-start justify-between gap-[var(--space-3-5)]">
        <div className="flex items-center gap-[11px]">
          <span
            className="size-[18px] rounded-celia-detail-swatch"
            style={{ backgroundColor: category.color }}
          />
          <h2 className="text-[length:var(--font-size-modal-title)] font-semibold">
            {category.name}
          </h2>
        </div>
        <div className="flex gap-[var(--space-2)]">
          {/* recreated manually: the hi-fi has no disabled Merge. Its text is
              already muted, so the subtle fill and border set it apart */}
          <button
            type="button"
            onClick={() => setMergeOpen(true)}
            disabled={category.archived}
            title={
              category.archived
                ? "Restore this category before merging."
                : undefined
            }
            aria-describedby={
              category.archived ? "category-archived-reason" : undefined
            }
            className="rounded-celia-action border border-celia-border px-[11px] py-[var(--space-1-5)] text-[length:var(--font-size-secondary)] text-celia-muted hover:bg-celia-surface-subtle disabled:cursor-not-allowed disabled:border-celia-border-subtle disabled:bg-celia-surface-subtle"
          >
            Merge
          </button>
          {category.archived ? (
            /* recreated manually: archived categories use Restore instead of
               Archive, in the accent colour with the same size as Merge */
            <button
              type="button"
              onClick={() => {
                setError("");
                setRestoreOpen(true);
              }}
              className="rounded-celia-action border border-celia-accent px-[11px] py-[var(--space-1-5)] text-[length:var(--font-size-secondary)] text-celia-accent"
            >
              Restore
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setArchiveOpen(true)}
              className="rounded-celia-action border border-celia-border px-[11px] py-[var(--space-1-5)] text-[length:var(--font-size-secondary)] text-celia-muted hover:bg-celia-surface-subtle"
            >
              Archive
            </button>
          )}
        </div>
      </header>
      {category.archived ? (
        <p
          id="category-archived-reason"
          className="mb-[var(--space-3)] text-[length:var(--font-size-secondary)] text-celia-muted"
        >
          This category is archived. Restore it to edit or move its items.
        </p>
      ) : null}
      <MergeCategoryDialog
        category={category}
        categories={categories}
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        onMerged={onMerged}
      />
      <ArchiveCategoryDialog
        category={category}
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
      />
      <ConfirmDialog
        open={restoreOpen}
        title="Restore category"
        confirmLabel="Restore"
        onCancel={() => setRestoreOpen(false)}
        onConfirm={() => void restore()}
        pending={pending}
        error={error}
      >
        Restore <strong className="text-celia-ink">{category.name}</strong> so
        it can be used again.
      </ConfirmDialog>
    </>
  );
}

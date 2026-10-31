"use client";

import { useMemo, useState } from "react";
import { nameKey } from "@/domain/names";
import { useMutation } from "@/components/ui/use-mutation";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import type { CategoryRowData } from "./types";

export default function MergeCategoryDialog({
  category,
  categories,
  open,
  onClose,
  onMerged,
}: {
  category: CategoryRowData;
  categories: CategoryRowData[];
  open: boolean;
  onClose: () => void;
  onMerged: (id: string) => void;
}) {
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [error, setError] = useState("");
  const { run, pending } = useMutation();
  const targets = useMemo(
    () =>
      categories.filter(
        (candidate) =>
          candidate.id !== category.id &&
          candidate.umbrella === category.umbrella &&
          !candidate.archived,
      ),
    [categories, category.id, category.umbrella],
  );
  const target = targets.find((candidate) => candidate.id === targetCategoryId);
  const combined = target
    ? category.items.filter((item) =>
        target.items.some(
          (candidate) => nameKey(candidate.name) === nameKey(item.name),
        ),
      )
    : [];
  const emptyReason = `No other active ${category.umbrella === "income" ? "Income" : "Expense"} category`;

  function close() {
    setTargetCategoryId("");
    setError("");
    onClose();
  }

  async function merge() {
    if (!targetCategoryId) return;
    const result = await run(`/api/categories/${category.id}/merge`, "POST", {
      targetCategoryId,
    });
    if (result) setError(result.message);
    else {
      onMerged(targetCategoryId);
      close();
    }
  }

  // recreated manually: wireframe-only merge dialog
  return (
    <ConfirmDialog
      open={open}
      title="Merge category"
      confirmLabel="Merge category"
      onCancel={close}
      onConfirm={() => void merge()}
      pending={pending}
      confirmDisabled={!targetCategoryId || !targets.length}
      error={error}
    >
      <p>Entries and items move to the surviving category.</p>
      <div className="mt-[var(--space-4)] grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] items-end gap-[var(--space-2-5)]">
        <div>
          <p className="mb-[var(--space-1)] text-[length:var(--font-size-caps)] text-celia-muted">
            MERGE THIS
          </p>
          <p className="rounded-celia-action border border-celia-border px-[var(--space-2-5)] py-[var(--space-2)] text-celia-ink">
            {category.name}
          </p>
        </div>
        <span className="pb-[var(--space-2)] text-center text-celia-muted">
          →
        </span>
        <label className="block">
          <span className="mb-[var(--space-1)] block text-[length:var(--font-size-caps)] text-celia-muted">
            INTO
          </span>
          <select
            aria-label="Merge into category"
            value={targetCategoryId}
            onChange={(event) => setTargetCategoryId(event.target.value)}
            disabled={!targets.length}
            className="w-full rounded-celia-action border border-celia-border bg-celia-surface px-[var(--space-2)] py-[var(--space-2)] text-celia-ink"
          >
            <option value="">Choose category</option>
            {targets.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-[var(--space-3)]">
        What moves: {category.itemCount}{" "}
        {category.itemCount === 1 ? "item" : "items"} and 0 entries.
      </p>
      {combined.length ? (
        <p className="mt-[var(--space-2)]">
          {combined.map((item) => item.name).join(", ")} will be combined.
        </p>
      ) : null}
      {!targets.length ? (
        <p className="mt-[var(--space-2)]">{emptyReason}</p>
      ) : null}
      <p className="mt-[var(--space-2)] font-medium text-celia-ink">
        Can&apos;t be undone.
      </p>
    </ConfirmDialog>
  );
}

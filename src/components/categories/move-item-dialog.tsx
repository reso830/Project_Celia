"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@/components/ui/use-mutation";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import type { Item } from "@/domain/item";
import type { CategoryRowData } from "./types";

export default function MoveItemDialog({
  item,
  category,
  categories,
  open,
  onClose,
}: {
  item: Item;
  category: CategoryRowData;
  categories: CategoryRowData[];
  open: boolean;
  onClose: () => void;
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
  const emptyReason = `No other active ${category.umbrella === "income" ? "Income" : "Expense"} category`;

  function close() {
    setTargetCategoryId("");
    setError("");
    onClose();
  }

  async function move() {
    if (!targetCategoryId) return;
    const result = await run(`/api/items/${item.id}/move`, "POST", {
      targetCategoryId,
    });
    if (result) setError(result.message);
    else close();
  }

  // recreated manually: wireframe-only, styled with T007 tokens
  return (
    <ConfirmDialog
      open={open}
      title="Move item"
      confirmLabel="Move item"
      onCancel={close}
      onConfirm={() => void move()}
      pending={pending}
      confirmDisabled={!targetCategoryId || !targets.length}
      error={error}
    >
      <p>
        All 0 entries under{" "}
        <strong className="text-celia-ink">{item.name}</strong> move with it.
      </p>
      <div className="mt-[var(--space-4)] grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] items-end gap-[var(--space-2-5)]">
        <div>
          <p className="mb-[var(--space-1)] text-[length:var(--font-size-caps)] text-celia-muted">
            FROM
          </p>
          <p className="rounded-celia-action border border-celia-border-subtle bg-celia-surface-subtle px-[var(--space-2-5)] py-[var(--space-2)] text-celia-ink">
            {category.name}
          </p>
        </div>
        <span className="pb-[var(--space-2)] text-center text-celia-muted">
          →
        </span>
        <label className="block">
          <span className="mb-[var(--space-1)] block text-[length:var(--font-size-caps)] text-celia-muted">
            TO
          </span>
          <select
            aria-label="Move item to category"
            value={targetCategoryId}
            onChange={(event) => setTargetCategoryId(event.target.value)}
            disabled={!targets.length}
            className="w-full rounded-celia-action border border-celia-border bg-celia-surface px-[var(--space-2)] py-[var(--space-2)] text-celia-ink"
          >
            <option value="">Choose category</option>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!targets.length ? (
        <p className="mt-[var(--space-2)]">{emptyReason}</p>
      ) : null}
    </ConfirmDialog>
  );
}

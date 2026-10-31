"use client";

import { useState } from "react";
import { useMutation } from "@/components/ui/use-mutation";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import type { CategoryRowData } from "./types";

export default function ArchiveCategoryDialog({
  category,
  open,
  onClose,
}: {
  category: CategoryRowData;
  open: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const { run, pending } = useMutation();

  function close() {
    setError("");
    onClose();
  }

  async function archive() {
    const result = await run(`/api/categories/${category.id}/archive`, "POST");
    if (result) setError(result.message);
    else close();
  }

  // recreated manually: wireframe-only archive dialog
  return (
    <ConfirmDialog
      open={open}
      title="Archive category"
      confirmLabel="Archive"
      onCancel={close}
      onConfirm={() => void archive()}
      pending={pending}
      error={error}
      variant="danger"
    >
      <p>
        Hides <strong className="text-celia-ink">{category.name}</strong> from
        pickers. Nothing is deleted.
      </p>
      <ul className="mt-[var(--space-3)] space-y-[var(--space-1-5)] rounded-celia-action border border-celia-border-subtle bg-celia-surface-subtle p-[var(--space-3)] text-[length:var(--font-size-secondary)]">
        <li>✓ Past entries keep their amounts, dates and category.</li>
        <li>✓ History and charts stay unchanged.</li>
        <li>✓ You can restore this category later.</li>
      </ul>
    </ConfirmDialog>
  );
}

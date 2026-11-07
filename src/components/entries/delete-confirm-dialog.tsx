"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { useMutation } from "@/components/ui/use-mutation";
import type { EntryWithDetails } from "@/domain/entry";
import { formatEntryAmount, formatEntryDate } from "./entry-display";

export default function DeleteConfirmDialog({
  entry,
  onClose,
  onDeleted,
  onStale,
}: {
  entry: EntryWithDetails | null;
  onClose: () => void;
  onDeleted: () => void;
  onStale: (message: string) => void;
}) {
  const { run, pending } = useMutation();
  const [error, setError] = useState("");

  function close() {
    setError("");
    onClose();
  }

  async function remove() {
    if (!entry) return;
    const result = await run(`/api/entries/${entry.id}`, "DELETE");
    if (!result) {
      onDeleted();
      close();
      return;
    }
    if (result.code === "not_found") {
      onStale(result.message);
      close();
      return;
    }
    setError(result.message);
  }

  // recreated manually: prototype deleted immediately without confirmation (brief requires confirmation)
  return (
    <ConfirmDialog
      open={Boolean(entry)}
      title="Delete entry"
      confirmLabel="Delete entry"
      onCancel={close}
      onConfirm={() => void remove()}
      pending={pending}
      error={error}
      variant="danger"
    >
      <p>Delete this entry permanently?</p>
      <dl className="mt-[var(--space-3)] grid grid-cols-[auto_1fr] gap-x-[var(--space-3)] gap-y-[var(--space-1-5)] rounded-celia-action border border-celia-border-subtle bg-celia-surface-subtle p-[var(--space-3)] text-[length:var(--font-size-secondary)]">
        <dt>Date</dt>
        <dd className="text-celia-ink">
          {entry ? formatEntryDate(entry.date) : ""}
        </dd>
        <dt>Item</dt>
        <dd className="text-celia-ink">{entry?.itemName}</dd>
        <dt>Amount</dt>
        <dd className="font-celia-figure text-celia-ink">
          {entry ? formatEntryAmount(entry) : ""}
        </dd>
      </dl>
    </ConfirmDialog>
  );
}

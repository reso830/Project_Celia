"use client";
import { useState } from "react";
import { validateName } from "@/domain/names";
import { useMutation } from "@/components/ui/use-mutation";
export default function AddItem({
  categoryId,
  disabled = false,
  disabledReasonId,
}: {
  categoryId: string;
  disabled?: boolean;
  disabledReasonId?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const { run, pending } = useMutation();
  async function save() {
    if (pending) return;
    try {
      validateName(name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Name is required.");
      return;
    }
    const result = await run(`/api/categories/${categoryId}/items`, "POST", {
      name,
    });
    if (result) setError(result.message);
    else {
      setName("");
      setAdding(false);
    }
  }
  // recreated manually: wireframe-only add-item state
  return adding && !disabled ? (
    <div className="py-[var(--space-2)]">
      <input
        aria-label="New item name"
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void save();
          if (event.key === "Escape") {
            setName("");
            setError("");
            setAdding(false);
          }
        }}
        className="w-full rounded-celia-control border border-celia-border px-[var(--space-2)] py-[var(--space-1)]"
      />
      {error ? (
        <p role="alert" className="text-celia-status-red">
          {error}
        </p>
      ) : null}
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setAdding(true)}
      disabled={disabled}
      aria-describedby={disabledReasonId}
      title={
        disabled ? "Restore this category before adding items." : undefined
      }
      className="py-[var(--space-2)] text-[length:var(--font-size-control)] text-celia-accent disabled:cursor-not-allowed disabled:text-celia-muted"
    >
      + add item
    </button>
  );
}

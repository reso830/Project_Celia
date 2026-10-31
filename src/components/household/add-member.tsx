"use client";

import { useState } from "react";
import { validateName } from "@/domain/names";
import { useMutation } from "@/components/ui/use-mutation";

export default function AddMember({ onCancel }: { onCancel: () => void }) {
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
    const result = await run("/api/members", "POST", { name });
    if (result) {
      setError(result.message);
      return;
    }
    onCancel();
  }
  // recreated manually: the hi-fi has no add state
  return (
    <div className="border-b border-celia-row-divider p-[var(--space-3)]">
      <label className="sr-only" htmlFor="new-member-name">
        New member name
      </label>
      <div className="flex gap-[var(--space-2)]">
        <input
          id="new-member-name"
          aria-label="New member name"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void save();
            if (event.key === "Escape") onCancel();
          }}
          className="min-w-0 flex-1 rounded-celia-control border border-celia-border px-[var(--space-3)] py-[var(--space-2)]"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => void save()}
          className="rounded-celia-action bg-celia-accent px-[var(--space-3)] py-[var(--space-2)] text-celia-surface"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-celia-action border border-celia-border px-[var(--space-3)] py-[var(--space-2)]"
        >
          Cancel
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-[var(--space-2)] text-celia-status-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}

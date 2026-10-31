"use client";
import { useState } from "react";
import { validateName } from "@/domain/names";
import { useMutation } from "@/components/ui/use-mutation";
import type { ClassifiableUmbrella } from "@/domain/umbrella";
export default function AddCategory({
  umbrella,
}: {
  umbrella: ClassifiableUmbrella;
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
    const result = await run("/api/categories", "POST", { umbrella, name });
    if (result) setError(result.message);
    else {
      setName("");
      setAdding(false);
    }
  }
  if (!adding)
    // recreated manually: hi-fi has no create control
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="w-full px-[var(--space-4)] py-[var(--space-2)] text-left text-[length:var(--font-size-control)] text-celia-accent"
      >
        + add {umbrella} category
      </button>
    );
  return (
    <div className="p-[var(--space-2)]">
      <input
        aria-label={`New ${umbrella} category`}
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
  );
}

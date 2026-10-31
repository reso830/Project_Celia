"use client";

import { useState } from "react";
import type { Member } from "@/domain/member";
import { useMutation } from "@/components/ui/use-mutation";
import EmptyState from "@/components/ui/empty-state";

export default function MemberRow({
  member,
  onRemove,
}: {
  member: Member;
  onRemove: (member: Member) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.name);
  const [error, setError] = useState("");
  const { run, pending } = useMutation();
  async function save() {
    if (pending) return;
    const result = await run(`/api/members/${member.id}`, "PATCH", { name });
    if (result) {
      setError(result.message);
      setName(member.name);
      return;
    }
    setEditing(false);
  }
  const cancel = () => {
    setName(member.name);
    setError("");
    setEditing(false);
  };
  // lifted from prototype CSS
  return (
    <div className="grid [grid-template-columns:var(--household-member-columns)] items-center gap-[var(--space-3)] border-b border-celia-row-divider px-[var(--space-4-5)] py-[var(--space-row-y)] text-[length:var(--font-size-body)]">
      <div className="group flex min-w-0 items-center gap-[var(--space-2-5)]">
        <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-celia-segmented-track text-[length:var(--font-size-secondary)] font-semibold">
          {Array.from(member.name)[0]}
        </span>
        {editing ? (
          <div className="min-w-0 flex-1">
            <input
              aria-label={`Rename ${member.name}`}
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void save();
                if (event.key === "Escape") cancel();
              }}
              className="w-full rounded-celia-control border border-celia-border px-[var(--space-2)] py-[var(--space-1)]"
            />
            {error ? (
              <p
                role="alert"
                className="text-[length:var(--font-size-secondary)] text-celia-status-red"
              >
                {error}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <span className="truncate group-hover:text-celia-accent">
              {member.name}
            </span>
            <button
              type="button"
              aria-label={`Edit ${member.name}`}
              onClick={() => setEditing(true)}
              className="opacity-0 text-[length:var(--font-size-edit-icon)] text-celia-muted transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              ✎
            </button>
          </>
        )}
      </div>
      <EmptyState />
      <EmptyState />
      <button
        type="button"
        aria-label={`Remove ${member.name}`}
        onClick={() => onRemove(member)}
        className="justify-self-end rounded-celia-option px-[var(--space-2-5)] py-[var(--space-1)] text-[length:var(--font-size-control)] text-celia-status-red hover:bg-celia-status-red hover:text-celia-surface"
      >
        Remove
      </button>
    </div>
  );
}

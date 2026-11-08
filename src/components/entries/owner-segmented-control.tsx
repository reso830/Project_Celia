"use client";

import type { EntriesMember } from "@/server/entries-read";

export default function OwnerSegmentedControl({
  members,
  value,
  onChange,
}: {
  members: readonly EntriesMember[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  // lifted from prototype CSS (HF L589-L593, L808, L1357-L1359)
  return (
    <fieldset>
      <legend className="mb-[5px] text-[11.5px] font-medium tracking-[0.06em] text-celia-muted">
        OWNER
      </legend>
      <div
        role="group"
        aria-label="Entry owner"
        className="flex flex-wrap gap-[3px] rounded-celia-control-compact bg-celia-segmented-track p-[3px]"
      >
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={`flex-1 rounded-celia-option px-[var(--space-3-5)] py-[var(--space-1-5)] text-[13px] ${value === null ? "bg-celia-surface font-medium text-celia-ink" : "text-celia-muted"}`}
        >
          Household
        </button>
        {members.map((member) => (
          <button
            key={member.id}
            type="button"
            aria-pressed={value === member.id}
            onClick={() => onChange(member.id)}
            className={`flex-1 rounded-celia-option px-[var(--space-3-5)] py-[var(--space-1-5)] text-[13px] ${value === member.id ? "bg-celia-surface font-medium text-celia-ink" : "text-celia-muted"}`}
          >
            {member.name}
            {member.archived ? " (archived)" : ""}
          </button>
        ))}
      </div>
      <p className="mt-[var(--space-1-5)] text-[length:var(--font-size-secondary)] text-celia-muted">
        Optional — stays with the household unless you pick a member.
      </p>
    </fieldset>
  );
}

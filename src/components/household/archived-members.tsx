"use client";
import { useState } from "react";
import type { Member } from "@/domain/member";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { useMutation } from "@/components/ui/use-mutation";
export default function ArchivedMembers({ members }: { members: Member[] }) {
  const [restoring, setRestoring] = useState<Member | null>(null);
  const { run, pending } = useMutation();
  const [error, setError] = useState("");
  if (!members.length) return null;
  function close() {
    setError("");
    setRestoring(null);
  }

  async function confirm() {
    if (!restoring) return;
    const result = await run(`/api/members/${restoring.id}/restore`, "POST");
    if (result) {
      setError(result.message);
      return;
    }
    close();
  }

  // recreated manually: no hi-fi archived-members state
  return (
    <>
      <details className="rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-4)]">
        <summary className="cursor-pointer font-medium">
          Archived members ({members.length})
        </summary>
        <ul className="mt-[var(--space-3)] space-y-[var(--space-2)]">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between">
              <span>{member.name}</span>
              <button
                type="button"
                aria-label={`Restore ${member.name}`}
                onClick={() => {
                  setError("");
                  setRestoring(member);
                }}
                className="rounded-celia-action border border-celia-border px-[var(--space-3)] py-[var(--space-1)]"
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      </details>
      <ConfirmDialog
        open={Boolean(restoring)}
        title="Restore member"
        confirmLabel="Restore member"
        onCancel={close}
        onConfirm={() => void confirm()}
        pending={pending}
        error={error}
      >
        <p>{restoring?.name} will be restored to active members.</p>
      </ConfirmDialog>
    </>
  );
}

"use client";
import type { Member } from "@/domain/member";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { useMutation } from "@/components/ui/use-mutation";
import { useState } from "react";
export default function RemoveMemberDialog({
  member,
  onClose,
}: {
  member: Member | null;
  onClose: () => void;
}) {
  const { run, pending } = useMutation();
  const [error, setError] = useState("");
  function close() {
    setError("");
    onClose();
  }

  async function confirm() {
    if (!member) return;
    const result = await run(`/api/members/${member.id}/archive`, "POST");
    if (result) {
      setError(result.message);
      return;
    }
    close();
  }

  // recreated manually: wireframe-only design, styled with T007 tokens
  return (
    <ConfirmDialog
      open={Boolean(member)}
      title="Remove member"
      confirmLabel="Archive member"
      onCancel={close}
      onConfirm={() => void confirm()}
      pending={pending}
      error={error}
      variant="danger"
    >
      <p>
        {member?.name} will be archived. Their history is kept and they can be
        restored later.
      </p>
    </ConfirmDialog>
  );
}

"use client";

import { useRef, useState, type ReactNode } from "react";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import {
  FormDialog,
  buttonClass,
  primaryClass,
} from "@/components/ui/form-dialog";

export function ForecasterMutationDialog({
  title,
  children,
  onClose,
  onSave,
  saveLabel,
  actions = [],
  deletion,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSave: () => Promise<void>;
  saveLabel: string;
  actions?: { label: string; run: () => Promise<void> }[];
  deletion?: {
    kind: "scenario" | "event";
    name: string;
    run: () => Promise<void>;
  };
}) {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const close = () => {
    if (!busy.current) onClose();
  };

  async function run(action: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      await action();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save changes. Please try again.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <FormDialog title={title} onClose={close}>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void run(onSave);
          }}
        >
          <fieldset disabled={pending} className="min-w-0 space-y-4">
            {children}
          </fieldset>
          {error && !confirming && (
            <p role="alert" className="mt-3 text-celia-status-red">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {deletion && (
              <button
                type="button"
                disabled={pending}
                className={`${buttonClass} text-celia-status-red`}
                onClick={() => {
                  setError("");
                  setConfirming(true);
                }}
              >
                Delete {deletion.kind}
              </button>
            )}
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                disabled={pending}
                className={buttonClass}
                onClick={() => void run(action.run)}
              >
                {action.label}
              </button>
            ))}
            <button
              type="button"
              className={buttonClass}
              disabled={pending}
              onClick={close}
            >
              Cancel
            </button>
            <button type="submit" className={primaryClass} disabled={pending}>
              {saveLabel}
            </button>
          </div>
        </form>
      </FormDialog>
      {deletion && (
        <ConfirmDialog
          open={confirming}
          title={`Delete ${deletion.kind}?`}
          confirmLabel="Confirm delete"
          pending={pending}
          error={confirming ? error : undefined}
          variant="danger"
          onCancel={() => {
            setError("");
            setConfirming(false);
          }}
          onConfirm={() => void run(deletion.run)}
        >
          <p>Delete “{deletion.name}”?</p>
          {deletion.kind === "scenario" && (
            <p className="mt-2">
              Its events and budget nudges will also be deleted.
            </p>
          )}
        </ConfirmDialog>
      )}
    </>
  );
}

"use client";

import { useEffect, useId, useRef } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
  confirmDisabled?: boolean;
  error?: string;
  variant?: "default" | "danger";
};

export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onCancel,
  onConfirm,
  pending = false,
  confirmDisabled = false,
  error,
  variant = "default",
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      triggerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      if (typeof dialog.showModal === "function" && !dialog.open) {
        dialog.showModal();
      }
      return;
    }

    if (dialog.open && typeof dialog.close === "function") {
      dialog.close();
    }
  }, [open]);

  function close() {
    dialogRef.current?.close();
    onCancel();
    triggerRef.current?.focus();
  }

  // recreated manually: wireframe-only dialog structure; the scrim (HF L551),
  // the close glyph size and baseline alignment (HF L554) and the disabled
  // confirm style (HF L1375) are lifted from prototype CSS. m-auto restores
  // the centring that preflight removes, and the dialog sets its own font
  // size so it looks the same wherever it is mounted.
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className="m-auto w-full max-w-[var(--dialog-width)] rounded-celia-modal border border-celia-border bg-celia-surface p-[var(--space-5)] text-[length:var(--font-size-body)] text-celia-ink backdrop:bg-celia-modal-scrim"
    >
      <div className="mb-[var(--space-3)] flex items-baseline justify-between gap-[var(--space-3)]">
        <h2
          id={titleId}
          className="text-[length:var(--font-size-modal-title)] font-semibold"
        >
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close dialog"
          onClick={close}
          className="text-[length:var(--font-size-modal-close)] text-celia-muted"
        >
          ✕
        </button>
      </div>
      <div className="text-celia-ink-secondary">{children}</div>
      {error ? (
        <p
          role="alert"
          className="mt-[var(--space-3)] text-[length:var(--font-size-secondary)] text-celia-status-red"
        >
          {error}
        </p>
      ) : null}
      <div className="mt-[var(--space-5)] flex justify-end gap-[var(--space-2)]">
        <button
          type="button"
          onClick={close}
          disabled={pending}
          className="rounded-celia-action border border-celia-border px-[var(--space-3)] py-[var(--space-2)] disabled:cursor-default"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending || confirmDisabled}
          className={`rounded-celia-action border px-[var(--space-3)] py-[var(--space-2)] text-celia-surface disabled:cursor-default disabled:border-celia-border disabled:bg-celia-surface-subtle disabled:text-celia-muted ${
            variant === "danger"
              ? "border-celia-status-red bg-celia-status-red"
              : "border-celia-accent bg-celia-accent"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

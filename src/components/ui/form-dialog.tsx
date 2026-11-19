"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export const inputClass =
  "mt-[var(--space-1-5)] h-[var(--savings-control-height)] w-full rounded-celia-control-compact border border-celia-border bg-celia-surface px-[var(--space-3)] text-[length:var(--font-size-body)] text-celia-ink tracking-normal outline-celia-accent aria-invalid:border-celia-status-red aria-invalid:bg-[var(--color-status-red-tint)] disabled:bg-celia-surface-subtle disabled:text-celia-muted";
export const labelClass =
  "block text-[length:var(--font-size-edit-icon)] font-medium tracking-[0.06em] text-celia-muted";
export const buttonClass =
  "rounded-celia-control-compact border border-celia-border px-[var(--space-3-5)] py-[var(--space-2-5)] disabled:bg-celia-surface-subtle disabled:text-celia-muted";
export const primaryClass =
  buttonClass +
  " border-celia-accent bg-celia-accent text-celia-surface disabled:border-celia-border";
// recreated manually: native dialog behavior with HF L550-L602 shell sizing and scrim.
export function FormDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    dialog?.querySelector<HTMLInputElement>("input:not([disabled])")?.focus();
    return () => {
      trigger?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[calc(100vh-var(--savings-dialog-padding)*2)] w-full max-w-[var(--savings-dialog-width)] overflow-y-auto rounded-celia-modal border border-celia-border bg-celia-surface p-[var(--savings-dialog-padding)] text-[length:var(--font-size-body)] text-celia-ink backdrop:bg-celia-modal-scrim"
    >
      <div className="mb-[var(--space-4-5)] flex items-baseline justify-between gap-[var(--space-3)]">
        <h2
          id={id}
          className="text-[length:var(--font-size-modal-title)] font-semibold"
        >
          {title}
        </h2>
        <button
          type="button"
          aria-label={`Close ${title}`}
          onClick={onClose}
          className="text-[length:var(--font-size-modal-close)] text-celia-muted"
        >
          {"\u2715"}
        </button>
      </div>
      {children}
    </dialog>
  );
}

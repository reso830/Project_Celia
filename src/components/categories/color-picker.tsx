"use client";
import { useEffect, useRef, useState } from "react";
import { parseHexColor } from "@/domain/color";
import { useMutation } from "@/components/ui/use-mutation";
// Save depends on the colour itself, not on the error message, so a valid
// colour can be retried after a failed request.
function isHexColor(value: string) {
  try {
    parseHexColor(value);
    return true;
  } catch {
    return false;
  }
}
export default function ColorPicker({
  category,
  onClose,
}: {
  category: { id: string; color: string };
  onClose: () => void;
}) {
  const [color, setColor] = useState(category.color);
  const [error, setError] = useState("");
  const { run, pending } = useMutation();
  const popoverRef = useRef<HTMLDivElement>(null);
  const hexRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    hexRef.current?.focus();
    const outside = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) onClose();
    };
    // Every Tab moves focus to the next enabled control, wrapping at either
    // end. The browser's own Tab order is never used, because some platforms
    // skip buttons by default (macOS Safari) and would leave the popover.
    // Keys are handled on the document, so Escape and Tab still work if focus
    // has fallen out of the popover, for example onto <body> when a focused
    // control is disabled.
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !popoverRef.current) return;
      const controls = Array.from(
        popoverRef.current.querySelectorAll<HTMLElement>(
          "input:not(:disabled), button:not(:disabled)",
        ),
      );
      const index = controls.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey
        ? controls.at(index <= 0 ? -1 : index - 1)
        : controls[(index + 1) % controls.length];
      event.preventDefault();
      next?.focus();
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", keydown);
    };
  }, [onClose]);
  function change(value: string) {
    setColor(value);
    try {
      parseHexColor(value);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Enter a six-digit hex colour.",
      );
    }
  }
  async function save() {
    try {
      const hex = parseHexColor(color);
      const result = await run(`/api/categories/${category.id}`, "PATCH", {
        color: hex,
      });
      if (result) setError(result.message);
      else onClose();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Enter a six-digit hex colour.",
      );
    }
  }
  return (
    // recreated manually: no hi-fi design for the picker
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      aria-label="Change category colour"
      tabIndex={-1}
      onClick={(event) => event.stopPropagation()}
      className="absolute z-10 mt-[var(--space-2)] rounded-celia-popover border border-celia-border bg-celia-surface p-[var(--space-3)]"
    >
      <div className="flex items-center gap-[var(--space-2)]">
        <input
          ref={hexRef}
          aria-label="Colour picker"
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#000000"}
          onChange={(event) => change(event.target.value)}
        />
        <input
          aria-label="Hex colour"
          value={color}
          onChange={(event) => change(event.target.value)}
          className="w-24 rounded-celia-control border border-celia-border px-[var(--space-2)] py-[var(--space-1)]"
        />
      </div>
      {error ? (
        <p
          role="alert"
          className="mt-[var(--space-2)] text-[length:var(--font-size-secondary)] text-celia-status-red"
        >
          {error}
        </p>
      ) : null}
      <div className="mt-[var(--space-3)] flex justify-end gap-[var(--space-2)]">
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!isHexColor(color) || pending}
          onClick={() => void save()}
          className="rounded-celia-action bg-celia-accent px-[var(--space-2)] py-[var(--space-1)] text-celia-surface"
        >
          Save
        </button>
      </div>
    </div>
  );
}

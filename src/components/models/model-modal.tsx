"use client";
import { useRef, useState } from "react";
import {
  SavingsDialog,
  inputClass,
  labelClass,
  buttonClass,
  primaryClass,
  type SaveForm,
} from "@/components/savings/bucket-modal";
import { nameKey, validateName } from "@/domain/names";
type Model = { id: string; name: string; description: string | null };
// recreated manually: model metadata form uses HF L550-L602 modal/control tokens per D11.
export default function ModelModal({
  mode,
  model,
  models,
  onClose,
  onSave,
}: {
  mode: "new" | "edit" | "duplicate";
  model?: Model;
  models: Model[];
  onClose: () => void;
  onSave: SaveForm;
}) {
  let copy = `${model?.name} (Copy)`,
    n = 2;
  while (models.some((m) => nameKey(m.name) === nameKey(copy)))
    copy = `${model?.name} (Copy ${n++})`;
  const [name, setName] = useState(
      mode === "new" ? "" : mode === "duplicate" ? copy : model!.name,
    ),
    [description, setDescription] = useState(model?.description ?? ""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  let validation = "";
  try {
    validateName(name);
    if (
      models.some(
        (m) =>
          m.id !== (mode === "edit" ? model?.id : undefined) &&
          nameKey(m.name) === nameKey(name),
      )
    )
      validation = "A model with this name already exists.";
  } catch {
    validation = "Name is required.";
  }
  return (
    <SavingsDialog
      title={
        mode === "new"
          ? "New model"
          : mode === "edit"
            ? "Edit model"
            : "Duplicate model"
      }
      onClose={() => {
        if (!lock.current) onClose();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (lock.current || validation) return;
          lock.current = true;
          setPending(true);
          try {
            const result = await onSave({
              name: validateName(name),
              description,
            });
            if (result) setError(result.message);
          } finally {
            lock.current = false;
            setPending(false);
          }
        }}
      >
        <label className={labelClass}>
          NAME
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            disabled={pending}
          />
        </label>
        {validation && (
          <p className="mt-[var(--space-1)] text-[length:var(--font-size-table-figure)] text-celia-muted">
            {validation}
          </p>
        )}
        <label className={`${labelClass} mt-[var(--space-4)]`}>
          DESCRIPTION
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClass.replace("h-[var(--savings-control-height)]", "h-[var(--models-description-height)]")} py-[var(--space-3)]`}
            disabled={pending}
          />
        </label>
        {error && (
          <p role="alert" className="mt-[var(--space-3)] text-celia-status-red">
            {error}
          </p>
        )}
        <div className="mt-[var(--space-5)] flex justify-end gap-[var(--space-2)]">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className={buttonClass}
          >
            Cancel
          </button>
          <button disabled={pending || !!validation} className={primaryClass}>
            Save model
          </button>
        </div>
      </form>
    </SavingsDialog>
  );
}

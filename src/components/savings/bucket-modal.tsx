"use client";
import { useRef, useState } from "react";
import {
  formatCentavos,
  parseAndValidateNonNegativeAmount,
  parseOptionalPositiveAmount,
} from "@/domain/amount";
import { validateName } from "@/domain/names";
import { isValidMonthKey } from "@/domain/month";
import {
  defaultCountsTowardBuffer,
  type BucketType,
  type SavingsBucket,
} from "@/domain/savings";
import {
  FormDialog as SavingsDialog,
  buttonClass,
  inputClass,
  labelClass,
  primaryClass,
} from "@/components/ui/form-dialog";
import type { MutationError } from "@/components/ui/use-mutation";
export type SaveForm = (
  body: Record<string, string>,
) => Promise<MutationError | undefined>;
// lifted from prototype CSS: HF L550-L602 shared modal controls, caps labels and button styles.
export {
  FormDialog as SavingsDialog,
  buttonClass,
  inputClass,
  labelClass,
  primaryClass,
} from "@/components/ui/form-dialog";
// recreated manually: bucket form and shared dialog shell use HF L550-L602 modal/control tokens per D3.
export default function BucketModal({
  bucket,
  currentBalance,
  onClose,
  onSave,
}: {
  bucket?: SavingsBucket;
  currentBalance?: number;
  onClose: () => void;
  onSave: SaveForm;
}) {
  const [name, setName] = useState(bucket?.name ?? ""),
    [type, setType] = useState<BucketType>(bucket?.type ?? "goal"),
    [opening, setOpening] = useState(
      bucket ? formatCentavos(bucket.openingBalance, { prefix: "" }) : "0",
    ),
    [target, setTarget] = useState(
      bucket?.targetAmount
        ? formatCentavos(bucket.targetAmount, { prefix: "" })
        : "",
    ),
    [month, setMonth] = useState(bucket?.targetMonth ?? ""),
    [description, setDescription] = useState(bucket?.description ?? ""),
    [counted, setCounted] = useState(bucket?.countsTowardBuffer ?? false),
    [isDefault, setDefault] = useState(bucket?.isDefault ?? false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const lock = useRef(false);
  const op = parseAndValidateNonNegativeAmount(opening, "openingBalance"),
    tp = parseOptionalPositiveAmount(target);
  let validation = "";
  try {
    validateName(name);
  } catch {
    validation = "Name is required.";
  }
  if (!op.ok) validation = op.error;
  else if (
    bucket &&
    currentBalance !== undefined &&
    currentBalance - bucket.openingBalance + op.centavos < 0
  )
    validation = "Bucket balance cannot be negative.";
  if (!tp.ok) validation = tp.error;
  if (month && !isValidMonthKey(month))
    validation = "Enter a valid month (YYYY-MM).";
  async function submit() {
    if (validation || lock.current) return;
    lock.current = true;
    setPending(true);
    try {
      const result = await onSave({
        name,
        type,
        openingBalance: opening,
        targetAmount: target,
        targetMonth: month,
        description,
        countsTowardBuffer: String(isDefault || counted),
        isDefault: String(isDefault),
      });
      if (result) setError(result.message);
      else onClose();
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <SavingsDialog
      title={bucket ? "Edit bucket" : "New bucket"}
      onClose={() => {
        if (!lock.current) onClose();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-[var(--space-4-5)]"
      >
        <label className={labelClass}>
          NAME
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className={labelClass}>
          TYPE
          <select
            className={inputClass}
            value={type}
            disabled={bucket?.isDefault || pending}
            onChange={(e) => {
              const next = e.target.value as BucketType;
              setType(next);
              setCounted(defaultCountsTowardBuffer(next));
              setDefault(false);
              if (next !== "goal" && next !== "sinking_fund") setMonth("");
            }}
          >
            {(
              [
                ["cash_buffer", "Cash Buffer"],
                ["emergency_fund", "Emergency Fund"],
                ["goal", "Goal"],
                ["sinking_fund", "Sinking Fund"],
              ] as const
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-[var(--space-3)]">
          <label className={labelClass}>
            OPENING BALANCE (PHP)
            <input
              className={`${inputClass} font-celia-figure`}
              inputMode="decimal"
              aria-invalid={!op.ok}
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            TARGET AMOUNT (PHP)
            <input
              className={`${inputClass} font-celia-figure`}
              inputMode="decimal"
              aria-invalid={!tp.ok}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
        </div>
        {(type === "goal" || type === "sinking_fund") && (
          <label className={labelClass}>
            TARGET / DUE MONTH
            <input
              className={inputClass}
              type="month"
              aria-invalid={!!month && !isValidMonthKey(month)}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
        )}
        <label className={labelClass}>
          DESCRIPTION
          <input
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={isDefault || counted}
          disabled={pending || isDefault}
          onClick={() => setCounted(!counted)}
          className="flex w-full items-center justify-between gap-[var(--space-2)] disabled:cursor-default"
        >
          <span className={labelClass}>COUNTS TOWARD BUFFER</span>
          <span
            className={`relative inline-block h-[var(--savings-switch-height)] w-[var(--savings-switch-width)] shrink-0 rounded-celia-pill ${isDefault || counted ? "bg-celia-accent" : "bg-celia-umbrella-unallocated"}`}
          >
            <span
              className={`absolute top-[var(--savings-switch-inset)] h-[var(--savings-switch-knob)] w-[var(--savings-switch-knob)] rounded-full bg-celia-surface ${isDefault || counted ? "left-[var(--savings-switch-on-left)]" : "left-[var(--savings-switch-inset)]"}`}
            />
          </span>
        </button>
        {type === "cash_buffer" && (
          <label className="flex items-center gap-[var(--space-2)]">
            <input
              type="checkbox"
              checked={isDefault}
              disabled={pending || bucket?.isDefault}
              onChange={(e) => setDefault(e.target.checked)}
            />
            DEFAULT CASH BUFFER
          </label>
        )}
        {bucket?.isDefault && (
          <p className="text-celia-muted">
            Designate another Cash Buffer bucket as default first.
          </p>
        )}
        {(error || (name && validation)) && (
          <p role="alert" className="text-celia-status-red">
            {error || validation}
          </p>
        )}
        <div className="flex justify-end gap-[var(--space-2)]">
          <button
            type="button"
            disabled={pending}
            className={buttonClass}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={primaryClass}
            disabled={pending || !!validation}
          >
            Save bucket
          </button>
        </div>
      </form>
    </SavingsDialog>
  );
}

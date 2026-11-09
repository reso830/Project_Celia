"use client";
import { useRef, useState } from "react";
import { formatCentavos, parseAndValidateAmount } from "@/domain/amount";
import {
  validateActivityDate,
  type SavingsActivity,
  type SavingsActivityKind,
} from "@/domain/savings";
import type { BucketDerivedMetrics } from "@/domain/savings-calculations";
import CalendarPopover from "@/components/entries/popovers/calendar-popover";
import {
  SavingsDialog,
  inputClass,
  labelClass,
  buttonClass,
  primaryClass,
  type SaveForm,
} from "./bucket-modal";
// recreated manually: savings activity form uses HF L550-L602 modal/control tokens and F02 calendar per D3.
export default function ActivityModal({
  metrics,
  kind: initialKind,
  activity,
  today,
  onClose,
  onSave,
}: {
  metrics: BucketDerivedMetrics;
  kind: SavingsActivityKind;
  activity?: SavingsActivity;
  today: string;
  onClose: () => void;
  onSave: SaveForm;
}) {
  const [kind, setKind] = useState(activity?.kind ?? initialKind),
    [amount, setAmount] = useState(
      activity ? formatCentavos(activity.amount, { prefix: "" }) : "",
    ),
    [date, setDate] = useState(activity?.date ?? today),
    [note, setNote] = useState(activity?.note ?? ""),
    [calendar, setCalendar] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const lock = useRef(false),
    dateRef = useRef<HTMLButtonElement>(null);
  const parsed = parseAndValidateAmount(amount),
    dateResult = validateActivityDate(date, today);
  const before =
    metrics.currentBalanceCentavos -
    (activity
      ? activity.kind === "contribution"
        ? activity.amount
        : -activity.amount
      : 0);
  const projected = parsed.ok
    ? before + (kind === "contribution" ? parsed.centavos : -parsed.centavos)
    : metrics.currentBalanceCentavos;
  const validation = !parsed.ok
    ? parsed.error
    : !dateResult.ok
      ? dateResult.error
      : projected < 0
        ? "Bucket balance cannot be negative."
        : "";
  async function submit() {
    if (validation || lock.current) return;
    lock.current = true;
    setPending(true);
    try {
      const result = await onSave({
        kind,
        amount,
        date,
        note,
        ...(activity ? {} : { bucketId: metrics.bucket.id }),
      });
      if (result) setError(result.message);
      else onClose();
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  function closeCalendar() {
    setCalendar(false);
    dateRef.current?.focus();
  }
  return (
    <SavingsDialog
      title={
        activity
          ? "Edit savings activity"
          : kind === "contribution"
            ? "Contribute to bucket"
            : "Withdraw from bucket"
      }
      onClose={() => {
        if (!lock.current) onClose();
      }}
    >
      <p className="mb-[var(--space-4)] text-celia-muted">
        {metrics.bucket.name} {"\u00b7"} Current balance{" "}
        <span className="font-celia-figure">
          {formatCentavos(metrics.currentBalanceCentavos)}
        </span>
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-[var(--space-4-5)]"
      >
        <div className="flex gap-[var(--space-1)] rounded-celia-control-compact bg-celia-segmented-track p-[var(--space-1)]">
          {(["contribution", "withdrawal"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              disabled={pending}
              className={`flex-1 rounded-celia-option px-[var(--space-3)] py-[var(--space-2)] ${kind === k ? "bg-celia-surface font-medium" : "text-celia-muted"}`}
            >
              {k === "contribution" ? "Contribution" : "Withdrawal"}
            </button>
          ))}
        </div>
        <label className={labelClass}>
          AMOUNT (PHP)
          <input
            className={`${inputClass} font-celia-figure`}
            inputMode="decimal"
            aria-invalid={!!amount && (!parsed.ok || projected < 0)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <div
          className="relative"
          onKeyDown={(e) => {
            if (calendar && e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              closeCalendar();
            }
          }}
        >
          <span className={labelClass}>DATE</span>
          <button
            ref={dateRef}
            type="button"
            aria-label={`DATE ${date}`}
            aria-expanded={calendar}
            onClick={() => setCalendar(!calendar)}
            className={`${inputClass} text-left font-celia-figure`}
          >
            {date}
          </button>
          {calendar && (
            <div className="mt-[var(--space-1)] rounded-celia-popover border border-celia-border bg-celia-surface">
              <CalendarPopover
                value={date}
                maxDate={today}
                onSelect={(value) => {
                  if (value <= today) {
                    setDate(value);
                    closeCalendar();
                  }
                }}
              />
            </div>
          )}
        </div>
        <label className={labelClass}>
          NOTE
          <input
            className={inputClass}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <p className="text-celia-muted">
          Projected balance:{" "}
          <strong className="font-celia-figure text-celia-ink">
            {formatCentavos(projected, { signed: projected < 0 })}
          </strong>
        </p>
        {(error || (amount && validation)) && (
          <p role="alert" className="text-celia-status-red">
            {error || validation}
          </p>
        )}
        <div className="flex justify-end gap-[var(--space-2)]">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className={buttonClass}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !!validation}
            className={primaryClass}
          >
            Save activity
          </button>
        </div>
      </form>
    </SavingsDialog>
  );
}

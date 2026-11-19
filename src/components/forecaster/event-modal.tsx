"use client";

import { useId, useState } from "react";
import { inputClass, labelClass } from "@/components/ui/form-dialog";
import { formatCentavos, parseAndValidateAmount } from "@/domain/amount";
import type { ScenarioEvent, ScenarioEventType } from "@/domain/forecaster";
import { ForecasterMutationDialog } from "./mutation-dialog";

type EventFields = Pick<
  ScenarioEvent,
  "name" | "type" | "monthlyAmount" | "description"
>;
const types: ScenarioEventType[] = [
  "financed purchase",
  "recurring",
  "seasonal",
];

export function EventModal({
  event,
  onClose,
  onSave,
  onDelete,
}: {
  event?: ScenarioEvent;
  onClose: () => void;
  onSave: (fields: EventFields) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [name, setName] = useState(event?.name ?? "");
  const [type, setType] = useState(event?.type ?? "recurring");
  const [amount, setAmount] = useState(
    event ? formatCentavos(event.monthlyAmount, { prefix: "" }) : "",
  );
  const [description, setDescription] = useState(event?.description ?? "");
  const seasonalHelp = useId();

  async function save() {
    const cleanedName = name.trim();
    if (!cleanedName) throw new Error("Enter an event name.");
    const parsed = parseAndValidateAmount(amount);
    if (!parsed.ok) throw new Error(parsed.error);
    await onSave({
      name: cleanedName,
      type,
      monthlyAmount: parsed.centavos,
      description: description.trim() || null,
    });
  }

  return (
    <ForecasterMutationDialog
      title={event ? "Edit event" : "Add event"}
      onClose={onClose}
      onSave={save}
      saveLabel="Save event"
      deletion={
        event ? { kind: "event", name: event.name, run: onDelete } : undefined
      }
    >
      <label className={labelClass}>
        Event name
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          required
        />
      </label>
      <label className={labelClass}>
        Event type
        <select
          className={inputClass}
          value={type}
          onChange={(e) => setType(e.target.value as ScenarioEventType)}
          aria-describedby={type === "seasonal" ? seasonalHelp : undefined}
        >
          {types.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      {type === "seasonal" && (
        <p id={seasonalHelp} className="text-xs text-celia-muted">
          Use the flat monthly equivalent of the cost. A ₱9,600 annual cost is
          ₱800 per month.
        </p>
      )}
      <label className={labelClass}>
        Monthly amount (₱)
        <input
          className={inputClass}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </label>
      <label className={labelClass}>
        Description
        <textarea
          className={`${inputClass} min-h-18 py-2`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
        />
      </label>
    </ForecasterMutationDialog>
  );
}

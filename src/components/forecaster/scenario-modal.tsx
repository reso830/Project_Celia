"use client";

import { useState } from "react";
import { inputClass, labelClass } from "@/components/ui/form-dialog";
import {
  formatCentavos,
  parseAndValidateNonNegativeAmount,
} from "@/domain/amount";
import type { PaletteKey, Scenario } from "@/domain/forecaster";
import { ForecasterMutationDialog } from "./mutation-dialog";
import { scenarioStroke } from "./presentation";

type ScenarioFields = Pick<
  Scenario,
  "name" | "shortLabel" | "startMonth" | "drawAmount"
> & { paletteKey: PaletteKey };
const palettes: PaletteKey[] = ["teal", "purple", "gold", "blue", "slate"];

export function ScenarioModal({
  scenario,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
}: {
  scenario?: Scenario;
  onClose: () => void;
  onSave: (fields: Partial<ScenarioFields>) => Promise<void>;
  onDelete: () => Promise<void>;
  onDuplicate: () => Promise<void>;
}) {
  const [name, setName] = useState(scenario?.name ?? "");
  const [shortLabel, setShortLabel] = useState(scenario?.shortLabel ?? "");
  const [startMonth, setStartMonth] = useState(
    String(scenario?.startMonth ?? 0),
  );
  const [draw, setDraw] = useState(
    formatCentavos(scenario?.drawAmount ?? 0, { prefix: "" }),
  );
  const [paletteKey, setPaletteKey] = useState(scenario?.paletteKey ?? "teal");

  async function save() {
    const cleanedName = name.trim();
    const nameChanged = cleanedName !== scenario?.name;
    if (nameChanged && (!cleanedName || cleanedName.length > 50)) {
      throw new Error("Enter a scenario name of 1–50 characters.");
    }
    const label = shortLabel.trim().toUpperCase();
    const labelChanged = shortLabel !== scenario?.shortLabel;
    if (labelChanged && (!label || label.length > 20))
      throw new Error("Enter a short label of 1–20 characters.");
    const month = Number(startMonth);
    if (!/^\d+$/.test(startMonth) || month > 23)
      throw new Error("Enter a start month from 0 to 23.");
    const amount = parseAndValidateNonNegativeAmount(draw, "drawAmount");
    if (!amount.ok) throw new Error(amount.error);
    await onSave({
      ...(nameChanged ? { name: cleanedName } : {}),
      ...(labelChanged ? { shortLabel: label } : {}),
      startMonth: month,
      drawAmount: amount.centavos,
      paletteKey,
    });
  }

  return (
    <ForecasterMutationDialog
      title={scenario ? "Edit scenario" : "Create scenario"}
      onClose={onClose}
      onSave={save}
      saveLabel="Save scenario"
      actions={
        scenario && !scenario.isBaseline
          ? [{ label: "Duplicate", run: onDuplicate }]
          : []
      }
      deletion={
        scenario && !scenario.isBaseline
          ? { kind: "scenario", name: scenario.name, run: onDelete }
          : undefined
      }
    >
      <label className={labelClass}>
        Name
        <input
          className={inputClass}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </label>
      <label className={labelClass}>
        Short label
        <input
          className={inputClass}
          value={shortLabel}
          onChange={(event) => setShortLabel(event.target.value)}
          maxLength={20}
          required
        />
      </label>
      <label className={labelClass}>
        Start month offset
        <input
          type="number"
          min={0}
          max={23}
          step={1}
          className={inputClass}
          value={startMonth}
          onChange={(event) => setStartMonth(event.target.value)}
          required
        />
      </label>
      <label className={labelClass}>
        Draw amount (₱)
        <input
          className={inputClass}
          inputMode="decimal"
          value={draw}
          onChange={(event) => setDraw(event.target.value)}
        />
      </label>
      <fieldset>
        <legend className={labelClass}>Palette</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {palettes.map((palette) => (
            <label key={palette}>
              <input
                type="radio"
                name="scenarioPalette"
                className="peer sr-only"
                checked={paletteKey === palette}
                onChange={() => setPaletteKey(palette)}
              />
              <span className="flex items-center gap-1.5 rounded-celia-control border border-celia-border px-2 py-1 capitalize peer-checked:border-celia-accent peer-checked:bg-celia-accent-tint peer-focus-visible:outline-2 peer-focus-visible:outline-celia-accent">
                <span
                  aria-hidden="true"
                  className="size-3 rounded-full"
                  style={{ backgroundColor: scenarioStroke(palette).color }}
                />
                {palette}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </ForecasterMutationDialog>
  );
}

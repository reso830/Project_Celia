import type { Scenario } from "@/domain/forecaster";
import { scenarioStroke } from "./presentation";

const chip =
  "max-w-full cursor-pointer rounded-[9px] border px-[15px] py-2 text-[13px] wrap-anywhere";

export function ScenarioChips({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onCreateScenario,
}: {
  scenarios: readonly Scenario[];
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
  onCreateScenario: () => void;
}) {
  return (
    <div
      role="group"
      aria-label="Forecast scenarios"
      className="mb-4 flex flex-wrap gap-[9px]"
    >
      {scenarios.map((scenario) => {
        const active = scenario.id === activeScenarioId;
        const { color, tint, ink } = scenarioStroke(scenario.paletteKey);
        return (
          <button
            key={scenario.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelectScenario(scenario.id)}
            className={`${chip} ${active ? "font-medium" : "border-celia-border bg-celia-surface text-celia-ink-secondary hover:bg-celia-surface-subtle"}`}
            style={
              active
                ? { borderColor: color, backgroundColor: tint, color: ink }
                : undefined
            }
          >
            {scenario.name}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onCreateScenario}
        className={`${chip} border-dashed border-[#c4c9c9] text-celia-muted hover:bg-celia-surface-subtle`}
      >
        + scenario
      </button>
    </div>
  );
}

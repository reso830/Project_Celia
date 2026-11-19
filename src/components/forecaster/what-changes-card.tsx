import { formatCentavos } from "@/domain/amount";
import type { ScenarioEvent, ScenarioWithRelations } from "@/domain/forecaster";
import { forecastCard, formatForecastAmount } from "./presentation";

export function WhatChangesCard({
  scenario,
  onEditEvent,
  onAddEvent,
}: {
  scenario: ScenarioWithRelations;
  onEditEvent: (event: ScenarioEvent) => void;
  onAddEvent: () => void;
}) {
  const events = scenario.events;
  const monthlyCost = events.reduce(
    (total, event) => total + event.monthlyAmount,
    0,
  );
  return (
    <section className={forecastCard}>
      <div className="mb-0.5 flex items-baseline justify-between gap-2">
        <h2 className="text-[15.5px] font-semibold">What changes</h2>
        <span className="text-xs text-celia-muted">
          {events.length} {events.length === 1 ? "event" : "events"}
        </span>
      </div>
      {events.length > 0 && (
        <p className="mb-3 text-[12.5px] text-celia-muted">
          click an event to edit it
        </p>
      )}
      <div className="flex flex-col gap-2">
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            aria-label={`Edit ${event.name}`}
            onClick={() => onEditEvent(event)}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-[9px] border border-celia-border px-3 py-2.5 text-left hover:bg-celia-surface-subtle"
          >
            <span className="min-w-0 wrap-anywhere">
              <span className="block text-[13.5px]">{event.name}</span>
              <span className="block text-[11.5px] text-celia-muted">
                {event.type}
              </span>
            </span>
            <span className="flex-none font-celia-figure text-xs">
              {formatCentavos(-event.monthlyAmount, { signed: true })}/mo
            </span>
          </button>
        ))}
        {events.length === 0 && (
          <p className="text-[12.5px] text-celia-muted">
            {scenario.isBaseline
              ? "No events — this is the baseline."
              : "No events yet."}
          </p>
        )}
        {!scenario.isBaseline && (
          <button
            type="button"
            onClick={onAddEvent}
            className="cursor-pointer rounded-[9px] border border-dashed border-[#c4c9c9] p-2.5 text-center text-[13px] text-celia-accent hover:bg-celia-surface-subtle"
          >
            + add event
          </button>
        )}
      </div>
      <div className="mt-3 flex justify-between gap-2 border-t border-celia-border-subtle pt-3 text-[13.5px]">
        <span>Net monthly impact</span>
        <span className="font-celia-figure font-bold text-celia-status-red">
          {formatForecastAmount(-monthlyCost)}
        </span>
      </div>
    </section>
  );
}

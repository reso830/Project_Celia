"use client";

import PageHeader from "@/components/shell/page-header";
import { forecastCard } from "@/components/forecaster/presentation";

export default function ForecasterError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <>
      <PageHeader title="Forecaster" />
      <section className={forecastCard}>
        <h2 className="font-semibold">Unable to load the forecaster</h2>
        <button
          type="button"
          onClick={retry}
          className="mt-3 rounded-celia-control border border-celia-border px-3 py-2"
        >
          Try again
        </button>
      </section>
    </>
  );
}

import PageHeader from "@/components/shell/page-header";
import { forecastCard } from "@/components/forecaster/presentation";

export default function ForecasterLoading() {
  return (
    <>
      <PageHeader title="Forecaster" />
      <div role="status">
        <span className="sr-only">Loading forecaster</span>
        <div aria-hidden="true" className="motion-safe:animate-pulse">
          <div className="mb-4 flex gap-2">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="h-8 w-24 rounded-celia-control bg-celia-border-subtle"
              />
            ))}
          </div>
          <div className="grid min-w-0 gap-3.5 min-[1100px]:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
            <div className="space-y-3.5">
              <div className={`${forecastCard} h-48`} />
              <div className={`${forecastCard} h-56`} />
            </div>
            <div className="space-y-3.5">
              <div className="grid gap-3 min-[1100px]:grid-cols-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className={`${forecastCard} h-24`} />
                ))}
              </div>
              <div className={`${forecastCard} h-72`} />
              <div className={`${forecastCard} h-48`} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

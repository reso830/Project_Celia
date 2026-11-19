import { formatCentavos } from "@/domain/amount";
import type { ForecastStatusTone, PaletteKey } from "@/domain/forecaster";

export const forecastCard =
  "min-w-0 rounded-[14px] border border-celia-border bg-celia-surface p-[18px]";
export const baselineBarFill = "bg-[#dfe3e3]";
export const nonNegativeUnallocated = "text-[#2c6647]";

export const verdictStyle = {
  favourable: {
    color: "#2c6647",
    backgroundColor: "#f1f7f3",
    borderColor: "#bcd7c8",
  },
  warning: {
    color: "#8a6516",
    backgroundColor: "#fdf9f0",
    borderColor: "#e6d4a8",
  },
  critical: {
    color: "#8a3b28",
    backgroundColor: "#fdf6f3",
    borderColor: "#e3c1b7",
  },
} satisfies Record<
  ForecastStatusTone,
  { color: string; backgroundColor: string; borderColor: string }
>;

const strokes = {
  teal: { color: "#2f7d78", dash: undefined, tint: "#e4efee", ink: "#26686a" },
  purple: { color: "#7c6f9a", dash: "6 4", tint: "#efecf6", ink: "#5f5480" },
  gold: { color: "#a17c3f", dash: "2 4", tint: "#f6f0e4", ink: "#7a5c22" },
  blue: { color: "#2563eb", dash: "8 4 2 4", tint: "#eff6ff", ink: "#1d4ed8" },
  slate: { color: "#7d8ba8", dash: "4 4", tint: "#eef1f5", ink: "#43526e" },
} satisfies Record<
  PaletteKey,
  { color: string; dash?: string; tint: string; ink: string }
>;

export function scenarioStroke(paletteKey: PaletteKey | null) {
  return paletteKey === null
    ? { color: "#3a4145", dash: undefined, tint: "#e8eaea", ink: "#14181a" }
    : strokes[paletteKey];
}

export function formatRunway(months: number | null) {
  return months === null ? "—" : `${Math.max(0, months).toFixed(1)} mo`;
}

export function formatForecastAmount(amount: number) {
  return formatCentavos(amount, { signed: amount < 0 });
}

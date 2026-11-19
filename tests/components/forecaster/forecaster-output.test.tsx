import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { OutlookChart } from "@/components/forecaster/outlook-chart";
import { ScenarioComparisonTable } from "@/components/forecaster/scenario-comparison-table";
import { ScenarioHeroCards } from "@/components/forecaster/scenario-hero-cards";
import type {
  OutlookData,
  Scenario,
  ScenarioMetrics,
} from "@/domain/forecaster";

const baseline: Scenario = {
  id: "baseline",
  name: "Baseline 2026",
  shortLabel: "BASELINE",
  isBaseline: true,
  paletteKey: null,
  startMonth: 0,
  drawAmount: 0,
  displayOrder: 0,
  createdAt: "",
  updatedAt: "",
};
const loan: Scenario = {
  ...baseline,
  id: "a",
  name: "A · Buy now, 5-yr loan",
  shortLabel: "A · LOAN NOW",
  isBaseline: false,
  paletteKey: "teal",
  startMonth: 5,
  displayOrder: 1,
};
const cash: Scenario = {
  ...loan,
  id: "c",
  name: "C · Pay cash",
  shortLabel: "C · CASH",
  paletteKey: "gold",
  displayOrder: 2,
};
const baselineMetrics: ScenarioMetrics = {
  scenarioId: "baseline",
  monthlyExpense: 7_900_000,
  monthlyUnallocated: 2_050_000,
  drawnFromBuffer: 0,
  bufferAfter: 46_600_000,
  runwayMonths: 5.9,
  verdict: { tier: "Tight but doable", statusTone: "warning" },
};
const loanMetrics: ScenarioMetrics = {
  scenarioId: "a",
  monthlyExpense: 9_693_000,
  monthlyUnallocated: -243_000,
  drawnFromBuffer: 9_850_000,
  bufferAfter: 36_750_000,
  runwayMonths: 3.8,
  verdict: { tier: "Risky buffer", statusTone: "critical" },
};
const cashMetrics: ScenarioMetrics = {
  ...loanMetrics,
  scenarioId: "c",
  monthlyExpense: 8_420_000,
  monthlyUnallocated: 1_530_000,
  drawnFromBuffer: 51_850_000,
  bufferAfter: -5_250_000,
  runwayMonths: 0,
};
const scenarios = [baseline, loan, cash];
const metrics = [baselineMetrics, loanMetrics, cashMetrics];

it("shows scenario figures, runway comparison, and buffer draw", () => {
  const { rerender } = render(
    <ScenarioHeroCards metrics={loanMetrics} baselineRunway={5.9} />,
  );
  expect(screen.getByText("Risky buffer").closest("div")).toHaveStyle({
    color: "#8a3b28",
    backgroundColor: "#fdf6f3",
    borderColor: "#e3c1b7",
  });
  expect(screen.getByText("3.8 mo")).toBeInTheDocument();
  expect(screen.getByText("from 5.9 mo")).toBeInTheDocument();
  expect(screen.getByText("−₱2,430")).toHaveClass("text-celia-status-red");
  expect(screen.getByText("₱98,500 drawn from the buffer")).toBeInTheDocument();
  rerender(
    <ScenarioHeroCards
      metrics={{ ...baselineMetrics, runwayMonths: null }}
      baselineRunway={null}
    />,
  );
  expect(screen.getByText("—")).toBeInTheDocument();
  expect(screen.getByText("baseline runway")).toBeInTheDocument();
  expect(screen.getByText("buffer untouched")).toBeInTheDocument();
  expect(screen.getByText("Tight but doable").closest("div")).toHaveStyle({
    color: "#8a6516",
    backgroundColor: "#fdf9f0",
    borderColor: "#e6d4a8",
  });
  expect(screen.getByText("+₱20,500")).toHaveClass("text-[#2c6647]");
});

it("maps chart coordinates and dims alternative lines when the baseline is selected", () => {
  const outlook: OutlookData = {
    zeroRuleRatio: 0.5,
    bars: Array.from({ length: 24 }, (_, monthIndex) => ({
      monthIndex,
      monthKey: "2026-11",
      isNegative: true,
      unallocatedCentavos: -100,
      heightRatioInContainer: 0.8,
    })),
    polylines: [loan, cash].map(({ id }) => ({
      scenarioId: id,
      points: [
        { x: 0, y: 0.75 },
        { x: 1, y: 0.25 },
      ],
    })),
    milestones: [
      { index: 0, monthKey: "2026-11" },
      { index: 23, monthKey: "2028-10" },
    ],
  };
  const props = { outlook, scenarios, comparisonMetrics: metrics };
  const { container, rerender } = render(
    <OutlookChart {...props} activeScenarioId="a" />,
  );
  const lines = container.querySelectorAll("polyline");
  expect(lines[0]).toHaveAttribute("points", "0,157.5 720,52.5");
  expect(lines[0]).toHaveAttribute("opacity", "1");
  expect(lines[1]).toHaveAttribute("opacity", "0.35");
  expect(lines[1]).toHaveAttribute("stroke-dasharray", "2 4");
  const negativeBars = container.querySelectorAll('[style*="height: 80%"]');
  expect(negativeBars).toHaveLength(24);
  const negativeRegion = negativeBars[0].parentElement;
  expect(negativeRegion).toHaveStyle({ top: "50%", height: "50%" });
  expect(negativeRegion).toHaveClass("items-start");
  expect(negativeRegion?.nextElementSibling).toHaveStyle({ top: "50%" });
  expect(screen.getByText("Nov 2026")).toBeInTheDocument();
  expect(screen.getByText("Oct 2028")).toBeInTheDocument();
  expect(
    screen.getByText(/baseline unallocated is −₱1 per month/i),
  ).toBeInTheDocument();
  rerender(<OutlookChart {...props} activeScenarioId="baseline" />);
  for (const line of container.querySelectorAll("polyline")) {
    expect(line).toHaveAttribute("opacity", "0.35");
  }
  rerender(
    <OutlookChart
      {...props}
      outlook={{
        ...outlook,
        zeroRuleRatio: 0.6,
        bars: outlook.bars.map((bar) => ({
          ...bar,
          isNegative: false,
          unallocatedCentavos: 100,
        })),
      }}
      activeScenarioId="baseline"
    />,
  );
  const positiveBars = container.querySelectorAll('[style*="height: 80%"]');
  expect(positiveBars).toHaveLength(24);
  const positiveRegion = positiveBars[0].parentElement;
  expect(positiveRegion).toHaveStyle({ top: "0px", height: "60%" });
  expect(positiveRegion).toHaveClass("items-end");
  expect(positiveRegion?.nextElementSibling).toHaveStyle({ top: "60%" });
});

it("describes month-zero projections and draws the documented custom dashes", () => {
  const customScenarios = [
    { ...loan, paletteKey: "blue" as const, startMonth: 0 },
    { ...cash, paletteKey: "slate" as const, startMonth: 1 },
  ];
  const { container } = render(
    <OutlookChart
      outlook={{
        zeroRuleRatio: 0.5,
        bars: ["2026-11", "2026-12"].map((monthKey, monthIndex) => ({
          monthIndex,
          monthKey,
          isNegative: false,
          unallocatedCentavos: 0,
          heightRatioInContainer: 0,
        })),
        polylines: customScenarios.map(({ id }) => ({
          scenarioId: id,
          points: [{ x: 0, y: 0.5 }],
        })),
        milestones: [],
      }}
      scenarios={customScenarios}
      comparisonMetrics={metrics}
      activeScenarioId="a"
    />,
  );
  expect(
    screen.getByText(/starts in Nov 2026 and projects −₱2,430/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/follows the baseline before Dec 2026/),
  ).toBeInTheDocument();
  const lines = container.querySelectorAll("polyline");
  expect(lines[0]).toHaveAttribute("stroke-dasharray", "8 4 2 4");
  expect(lines[1]).toHaveAttribute("stroke-dasharray", "4 4");
});

it("renders accessible comparison rows and finite runway values", () => {
  render(
    <ScenarioComparisonTable
      scenarios={scenarios}
      comparisonMetrics={metrics}
    />,
  );
  const table = screen.getByRole("table", { name: "Scenarios side by side" });
  const expense = within(table).getByRole("row", { name: /monthly expense/i });
  expect(within(expense).getByText("₱96,930")).toBeInTheDocument();
  const drawn = within(table).getByRole("row", { name: /drawn from buffer/i });
  expect(within(drawn).getAllByRole("cell")[0]).toHaveTextContent("—");
  expect(within(table).getByText("−₱52,500")).toBeInTheDocument();
  expect(within(table).getByText("0.0 mo")).toBeInTheDocument();
  expect(within(table).getAllByText("Risky buffer")).toHaveLength(2);
});

import { render, screen } from "@testing-library/react";
import { ForecastPlaceholder } from "@/components/forecast-placeholder";

describe("ForecastPlaceholder", () => {
  it("renders the prototype roadmap callout", () => {
    render(<ForecastPlaceholder />);

    const callout = screen.getByRole("complementary", {
      name: "Forecast roadmap",
    });

    expect(callout).toHaveTextContent("Coming soon —");
    expect(callout).toHaveTextContent(
      "forecasting projected balances from your recurring income and expenses.",
    );
    expect(callout).toHaveClass("border-dashed", "border-[#c3ccd6]");
  });
});

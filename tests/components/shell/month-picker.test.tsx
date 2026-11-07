import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import MonthPicker from "@/components/shell/month-picker";

describe("MonthPicker", () => {
  it("reports adjacent month keys when controlled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MonthPicker value="2026-11" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Next month" }));
    await user.click(screen.getByRole("button", { name: "Previous month" }));

    expect(onChange).toHaveBeenNthCalledWith(1, "2026-12");
    expect(onChange).toHaveBeenNthCalledWith(2, "2026-10");
  });
});

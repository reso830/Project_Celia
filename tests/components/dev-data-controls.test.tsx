import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DevDataControls } from "@/app/dev/data/dev-data-controls";

describe("DevDataControls", () => {
  it("requires confirmation before replacing local data", async () => {
    const user = userEvent.setup();
    const populate = vi.fn().mockResolvedValue(undefined);

    render(
      <DevDataControls
        clear={vi.fn()}
        populate={populate}
        referenceDate="2026-07-22"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Populate dummy data" }),
    );
    expect(populate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm populate" }));

    await waitFor(() => expect(populate).toHaveBeenCalledWith("2026-07-22"));
    expect(screen.getByText("Dummy data populated.")).toBeInTheDocument();
  });

  it("reports a failed clear operation", async () => {
    const user = userEvent.setup();

    render(
      <DevDataControls
        clear={vi.fn().mockRejectedValue(new Error("Database unavailable"))}
        populate={vi.fn()}
        referenceDate="2026-07-22"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Clear local data" }));
    await user.click(screen.getByRole("button", { name: "Confirm clear" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to clear local data.",
    );
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EntriesError from "@/app/(shell)/entries/error";
import EntriesLoading from "@/app/(shell)/entries/loading";

describe("entries route boundaries", () => {
  it("renders loading structure", () => {
    render(<EntriesLoading />);
    const loading = screen.getByRole("status", { name: "Loading entries" });
    expect(loading).toBeInTheDocument();
    expect(loading.firstElementChild).toHaveClass(
      "min-h-[var(--header-min-height)]",
    );
  });

  it("retries an entries load failure", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(
      <EntriesError error={new Error("Database unavailable")} retry={retry} />,
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

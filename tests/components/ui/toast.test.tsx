import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Toast from "@/components/ui/toast";

describe("Toast", () => {
  it("announces a message then dismisses it after 2200 milliseconds", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="Entry deleted" onDismiss={onDismiss} />);

    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent(
      "Entry deleted",
    );
    vi.advanceTimersByTime(2199);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});

import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BucketModal from "@/components/savings/bucket-modal";
import ActivityModal from "@/components/savings/activity-modal";
import { calculateBucketMetrics } from "@/domain/savings-calculations";
const bucket = {
  id: "b",
  name: "Cash",
  nameKey: "cash",
  type: "cash_buffer" as const,
  openingBalance: 10000,
  targetAmount: null,
  targetMonth: null,
  description: null,
  countsTowardBuffer: true,
  isDefault: true,
  archivedAt: null,
  createdAt: "",
  updatedAt: "",
};
const metrics = calculateBucketMetrics(bucket, [], "2026-11", 0);
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("Savings modals", () => {
  it("validates bucket fields, optional targets and default locks", () => {
    const { unmount } = render(
      <BucketModal bucket={bucket} onClose={vi.fn()} onSave={vi.fn()} />,
    );
    expect(screen.getByLabelText("TYPE")).toBeDisabled();
    expect(screen.getByLabelText("DEFAULT CASH BUFFER")).toBeDisabled();
    expect(
      screen.getByRole("switch", { name: "COUNTS TOWARD BUFFER" }),
    ).toBeDisabled();
    unmount();
    render(<BucketModal onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Save bucket" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("NAME"), {
      target: { value: "Travel" },
    });
    fireEvent.change(screen.getByLabelText("TARGET AMOUNT (PHP)"), {
      target: { value: "0" },
    });
    expect(screen.getByRole("button", { name: "Save bucket" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("TARGET AMOUNT (PHP)"), {
      target: { value: "100" },
    });
    expect(screen.getByRole("button", { name: "Save bucket" })).toBeEnabled();
  });
  it("renders spaced caps labels and saves the buffer switch value", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { unmount } = render(<BucketModal onClose={vi.fn()} onSave={save} />);
    const name = screen.getByLabelText("NAME");
    expect(name.closest("label")).toHaveClass("tracking-[0.06em]");
    for (const label of [
      "TYPE",
      "OPENING BALANCE (PHP)",
      "TARGET AMOUNT (PHP)",
      "TARGET / DUE MONTH",
      "DESCRIPTION",
    ])
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    fireEvent.change(name, { target: { value: "Travel" } });
    const toggle = screen.getByRole("switch", { name: "COUNTS TOWARD BUFFER" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Save bucket" }));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ countsTowardBuffer: "true" }),
      ),
    );
    unmount();
    render(
      <ActivityModal
        metrics={metrics}
        kind="contribution"
        today="2026-11-08"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("AMOUNT (PHP)").closest("label")).toHaveClass(
      "tracking-[0.06em]",
    );
    expect(screen.getByLabelText("NOTE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^DATE / })).toBeInTheDocument();
  });
  it("keeps bucket draft on server error and prevents duplicate submission", async () => {
    let finish!: (v: { code: string; message: string }) => void;
    const save = vi.fn(
      () =>
        new Promise<{ code: string; message: string }>((resolve) => {
          finish = resolve;
        }),
    );
    render(<BucketModal onClose={vi.fn()} onSave={save} />);
    fireEvent.change(screen.getByLabelText("NAME"), {
      target: { value: "Travel" },
    });
    const button = screen.getByRole("button", { name: "Save bucket" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(save).toHaveBeenCalledTimes(1);
    finish({ code: "duplicate_name", message: "Already exists." });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Already exists."),
    );
    expect(screen.getByLabelText("NAME")).toHaveValue("Travel");
  });
  it("blocks negative withdrawal, disables future calendar dates and previews the balance", () => {
    render(
      <ActivityModal
        metrics={metrics}
        kind="withdrawal"
        today="2026-11-08"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("AMOUNT (PHP)"), {
      target: { value: "101" },
    });
    expect(
      screen.getByText("Bucket balance cannot be negative."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save activity" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("AMOUNT (PHP)"), {
      target: { value: "40" },
    });
    expect(screen.getByText(/Current balance/)).toHaveTextContent(
      "Cash \u00b7 Current balance",
    );
    expect(screen.getByText(/Projected balance/)).toHaveTextContent("\u20b160");
    fireEvent.click(screen.getByRole("button", { name: /DATE/ }));
    expect(screen.getByRole("button", { name: "9" })).toBeDisabled();
  });
  it("blocks deleting or editing a contribution that would make balance negative", () => {
    const m = { ...metrics, currentBalanceCentavos: 1000 };
    const activity = {
      id: "a",
      bucketId: "b",
      kind: "contribution" as const,
      amount: 5000,
      date: "2026-11-01",
      note: null,
      createdAt: "",
      updatedAt: "",
    };
    render(
      <ActivityModal
        metrics={m}
        kind="contribution"
        activity={activity}
        today="2026-11-08"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("AMOUNT (PHP)"), {
      target: { value: "1" },
    });
    expect(
      screen.getByRole("button", { name: "Save activity" }),
    ).toBeDisabled();
  });
  it("prevents activity double-submit and preserves draft on failure", async () => {
    let finish!: (v: { code: string; message: string }) => void;
    const save = vi.fn(
      () =>
        new Promise<{ code: string; message: string }>((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <ActivityModal
        metrics={metrics}
        kind="contribution"
        today="2026-11-08"
        onClose={vi.fn()}
        onSave={save}
      />,
    );
    fireEvent.change(screen.getByLabelText("AMOUNT (PHP)"), {
      target: { value: "25" },
    });
    const button = screen.getByRole("button", { name: "Save activity" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(save).toHaveBeenCalledTimes(1);
    finish({ code: "internal", message: "Try later." });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Try later."),
    );
    expect(screen.getByLabelText("AMOUNT (PHP)")).toHaveValue("25");
  });
});

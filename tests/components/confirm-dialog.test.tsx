import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ConfirmDialog from "@/components/ui/confirm-dialog";

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <ConfirmDialog
        open={open}
        title="Confirm action"
        confirmLabel="Confirm"
        onCancel={() => setOpen(false)}
        onConfirm={() => undefined}
      >
        <p>Dialog content</p>
      </ConfirmDialog>
    </>
  );
}

const disabledConfirmClasses = [
  "disabled:cursor-default",
  "disabled:border-celia-border",
  "disabled:bg-celia-surface-subtle",
  "disabled:text-celia-muted",
];

function renderMoveDialog(
  props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {},
) {
  return render(
    <ConfirmDialog
      open
      title="Move item"
      confirmLabel="Move item"
      onCancel={() => undefined}
      onConfirm={() => undefined}
      {...props}
    >
      <p>Dialog content</p>
    </ConfirmDialog>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("ConfirmDialog", () => {
  it("opens through showModal and returns focus to its trigger when cancelled", async () => {
    const user = userEvent.setup();
    const showModal = vi
      .spyOn(HTMLDialogElement.prototype, "showModal")
      .mockImplementation(function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      });
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });

    await user.click(trigger);
    expect(showModal).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Close dialog" }));

    expect(trigger).toHaveFocus();
  });

  it("cancels with Escape and returns focus to its trigger", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });

    await user.click(trigger);
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { cancelable: true }),
    );

    expect(trigger).toHaveFocus();
  });

  it("uses a distinct label id for each mounted dialog", () => {
    render(
      <>
        <ConfirmDialog
          open={false}
          title="Remove member"
          confirmLabel="Archive member"
          onCancel={() => undefined}
          onConfirm={() => undefined}
        >
          <p>Archive this member.</p>
        </ConfirmDialog>
        <ConfirmDialog
          open={false}
          title="Restore member"
          confirmLabel="Restore member"
          onCancel={() => undefined}
          onConfirm={() => undefined}
        >
          <p>Restore this member.</p>
        </ConfirmDialog>
      </>,
    );

    const dialogs = screen.getAllByRole("dialog", { hidden: true });
    const titleIds = dialogs.map((dialog) =>
      dialog.getAttribute("aria-labelledby"),
    );

    expect(new Set(titleIds).size).toBe(2);
  });

  it("centres itself over the scrim and sets its own body font size", () => {
    renderMoveDialog();

    expect(screen.getByRole("dialog", { name: "Move item" })).toHaveClass(
      "m-auto",
      "text-[length:var(--font-size-body)]",
      "backdrop:bg-celia-modal-scrim",
    );
    expect(screen.getByRole("heading", { name: "Move item" })).toHaveClass(
      "text-[length:var(--font-size-modal-title)]",
    );
  });

  it("gives the close glyph its own size instead of the body size", () => {
    renderMoveDialog();

    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveClass(
      "text-[length:var(--font-size-modal-close)]",
      "text-celia-muted",
    );
  });

  it("disables the confirm button and gives it the disabled styling", () => {
    renderMoveDialog({ confirmDisabled: true });

    const confirm = screen.getByRole("button", { name: "Move item" });
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveClass(...disabledConfirmClasses);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it.each([
    ["default", "bg-celia-accent"],
    ["danger", "bg-celia-status-red"],
  ] as const)(
    "gives the %s confirm button the same disabled styling while pending",
    (variant, enabledFill) => {
      renderMoveDialog({ variant, pending: true });

      const confirm = screen.getByRole("button", { name: "Move item" });
      const cancel = screen.getByRole("button", { name: "Cancel" });
      expect(confirm).toBeDisabled();
      expect(confirm).toHaveClass(enabledFill, ...disabledConfirmClasses);
      expect(cancel).toBeDisabled();
      expect(cancel).toHaveClass("disabled:cursor-default");
    },
  );
});

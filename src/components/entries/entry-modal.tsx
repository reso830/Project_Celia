"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatCentavos, parseAndValidateAmount } from "@/domain/amount";
import { useMutation } from "@/components/ui/use-mutation";
import type { EntryType, EntryWithDetails } from "@/domain/entry";
import type { EntriesCategory, EntriesMember } from "@/server/entries-read";
import OwnerSegmentedControl from "./owner-segmented-control";
import CalendarPopover from "./popovers/calendar-popover";
import CategoryPopover from "./popovers/category-popover";
import ItemPopover from "./popovers/item-popover";
import { usePopoverManager } from "./popovers/use-popover-manager";

type Props = {
  open: boolean;
  categories: readonly EntriesCategory[];
  members: readonly EntriesMember[];
  entry?: EntryWithDetails | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  onStale: (message: string) => void;
  liveMessage?: string;
};

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function choices(categories: readonly EntriesCategory[], type: EntryType) {
  return categories.filter((category) => category.umbrella === type);
}

export default function EntryModal({
  open,
  categories,
  members,
  entry,
  onClose,
  onSaved,
  onStale,
  liveMessage,
}: Props) {
  const { run, pending } = useMutation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const popoverTriggerRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const missingSelectionId = useId();
  const dateLabelId = useId();
  const dateTriggerId = useId();
  const categoryLabelId = useId();
  const categoryTriggerId = useId();
  const itemLabelId = useId();
  const itemTriggerId = useId();
  const { formMenu, toggle, close: closePopovers } = usePopoverManager();
  const initialType = entry?.type ?? "expense";
  const initialCategory = entry
    ? categories.find((category) => category.id === entry.categoryId)
    : (choices(categories, initialType).find(
        (category) => category.items.length,
      ) ?? choices(categories, initialType)[0]);
  const [type, setType] = useState<EntryType>(initialType);
  const [amount, setAmount] = useState(
    entry ? formatCentavos(entry.amount, { prefix: "" }) : "",
  );
  const [date, setDate] = useState(entry?.date ?? today());
  const [categoryId, setCategoryId] = useState(
    entry?.categoryId ?? initialCategory?.id ?? "",
  );
  const [itemId, setItemId] = useState(
    entry?.itemId ?? initialCategory?.items[0]?.id ?? "",
  );
  const [ownerMemberId, setOwnerMemberId] = useState<string | null>(
    entry?.ownerMemberId ?? null,
  );
  const [note, setNote] = useState(entry?.note ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open) return;
    if (!dialog.open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      dialog.showModal();
    }
    amountRef.current?.focus();
  }, [open]);

  const availableCategories = choices(categories, type).filter(
    (category) => !category.archived || category.id === categoryId,
  );
  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );
  const selectedItem = selectedCategory?.items.find(
    (item) => item.id === itemId,
  );
  const amountResult = parseAndValidateAmount(amount);
  const amountError = amount ? (amountResult.ok ? "" : amountResult.error) : "";
  const canSave = amountResult.ok && Boolean(selectedItem) && !pending;
  const missingSelectionMessage = !selectedCategory
    ? "No categories available. Create a category first in Categories."
    : !selectedItem
      ? "No items in this category. Add items in Categories."
      : "";

  function switchType(nextType: EntryType) {
    if (nextType === type) return;
    const nextCategory =
      choices(categories, nextType).find((category) => category.items.length) ??
      choices(categories, nextType)[0];
    setType(nextType);
    setCategoryId(nextCategory?.id ?? "");
    setItemId(nextCategory?.items[0]?.id ?? "");
    closePopovers();
  }

  async function submit(addAnother: boolean) {
    if (!canSave || !amountResult.ok) return;
    setError("");
    const body = (
      entry
        ? { amount, date, itemId, ownerMemberId: ownerMemberId ?? "", note }
        : {
            type,
            amount,
            date,
            itemId,
            ownerMemberId: ownerMemberId ?? "",
            note,
          }
    ) as Record<string, string>;
    const result = await run(
      entry ? `/api/entries/${entry.id}` : "/api/entries",
      entry ? "PATCH" : "POST",
      body,
    );
    if (!result) {
      if (entry) {
        onSaved("Entry updated");
        finishClose(date.slice(0, 7) !== entry.date.slice(0, 7));
      } else {
        onSaved(
          `${formatCentavos(amountResult.centavos)} added to ${selectedCategory?.name ?? "category"}`,
        );
        if (addAnother) {
          setAmount("");
          setNote("");
          requestAnimationFrame(() => amountRef.current?.focus());
        } else finishClose();
      }
      return;
    }
    if (entry && result.code === "not_found") {
      onStale(result.message);
      finishClose(true);
      return;
    }
    setError(result.message);
  }

  function finishClose(focusTable = false) {
    closePopovers();
    dialogRef.current?.close();
    onClose();
    requestAnimationFrame(() => {
      const opener = returnFocusRef.current;
      if (!focusTable && opener?.isConnected) opener.focus();
      else
        document
          .querySelector<HTMLElement>('[role="table"][aria-label="Entries"]')
          ?.focus();
    });
  }

  function close() {
    if (!pending) finishClose();
  }

  function togglePopover(
    menu: Exclude<typeof formMenu, null>,
    trigger: HTMLButtonElement,
  ) {
    popoverTriggerRef.current = trigger;
    toggle(menu);
  }

  function closePopoverAndRestoreFocus() {
    closePopovers();
    requestAnimationFrame(() => popoverTriggerRef.current?.focus());
  }

  // lifted from prototype CSS (HF L550-L603, L1350-L1376)
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (formMenu) closePopoverAndRestoreFocus();
        else close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="m-auto w-full max-w-[568px] rounded-celia-modal bg-celia-surface p-0 text-[13px] text-celia-ink backdrop:bg-celia-modal-scrim"
    >
      <div
        className="p-[24px]"
        onKeyDown={(event) => {
          if (event.key === "Escape" && formMenu) {
            event.preventDefault();
            closePopoverAndRestoreFocus();
          }
          if (event.key === "Tab" && formMenu) closePopovers();
        }}
      >
        <div className="flex items-baseline justify-between">
          <h2
            id={titleId}
            className="text-[length:var(--font-size-modal-title)] font-semibold"
          >
            {entry ? "Edit entry" : "Add entry"}
          </h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={close}
            className="text-[length:var(--font-size-modal-close)] text-celia-muted"
          >
            ✕
          </button>
        </div>
        {error ? (
          <p role="alert" className="mt-[var(--space-3)] text-celia-status-red">
            {error}
          </p>
        ) : null}
        <p role="status" className="sr-only">
          {liveMessage ?? ""}
        </p>
        <fieldset className="mt-[var(--space-4-5)]">
          <legend className="sr-only">Type</legend>
          <div className="flex gap-[3px] rounded-celia-control-compact bg-celia-segmented-track p-[3px] text-[13px]">
            <button
              type="button"
              aria-pressed={type === "expense"}
              onClick={() => switchType("expense")}
              className={
                type === "expense"
                  ? "flex-1 rounded-celia-option bg-celia-surface px-[var(--space-3-5)] py-[var(--space-1-5)] font-medium"
                  : "flex-1 px-[var(--space-3-5)] py-[var(--space-1-5)]"
              }
            >
              Expense
            </button>
            <button
              type="button"
              aria-pressed={type === "income"}
              onClick={() => switchType("income")}
              className={
                type === "income"
                  ? "flex-1 rounded-celia-option bg-celia-surface px-[var(--space-3-5)] py-[var(--space-1-5)] font-medium"
                  : "flex-1 px-[var(--space-3-5)] py-[var(--space-1-5)]"
              }
            >
              Income
            </button>
          </div>
        </fieldset>
        <div className="mt-[var(--space-5)] grid grid-cols-2 gap-[var(--space-3)]">
          <label className="block min-w-0">
            <span className="mb-[5px] block text-[11.5px] font-medium tracking-[0.06em] text-celia-muted">
              AMOUNT (PHP)
            </span>
            <input
              ref={amountRef}
              aria-label="Amount"
              aria-invalid={Boolean(amountError)}
              aria-describedby={amountError ? "entry-amount-error" : undefined}
              placeholder="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submit(false);
                }
              }}
              className={
                amountError
                  ? "h-[42px] w-full rounded-celia-control border border-celia-status-red bg-[var(--color-status-red-tint)] px-[var(--space-3)] font-celia-figure text-[16px]"
                  : "h-[42px] w-full rounded-celia-control border border-celia-border px-[var(--space-3)] font-celia-figure text-[16px]"
              }
            />
            {amountError ? (
              <span id="entry-amount-error" className="text-celia-status-red">
                {amountError}
              </span>
            ) : null}
          </label>
          <div className="relative" data-entry-popover>
            <span
              id={dateLabelId}
              className="mb-[5px] block text-[11.5px] font-medium tracking-[0.06em] text-celia-muted"
            >
              DATE
            </span>
            <button
              type="button"
              id={dateTriggerId}
              aria-labelledby={`${dateLabelId} ${dateTriggerId}`}
              aria-haspopup="dialog"
              aria-expanded={formMenu === "date"}
              onClick={(event) => togglePopover("date", event.currentTarget)}
              className="flex h-[42px] w-full items-center justify-between rounded-celia-control border border-celia-border px-[var(--space-3)] text-left text-[14px]"
            >
              {new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              <span aria-hidden="true">▾</span>
            </button>
            {formMenu === "date" ? (
              <div className="absolute z-20 mt-[4px] w-full rounded-celia-popover border border-celia-border bg-celia-surface">
                <CalendarPopover
                  value={date}
                  onSelect={(value) => {
                    setDate(value);
                    closePopoverAndRestoreFocus();
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-[var(--space-4-5)] grid grid-cols-2 gap-[var(--space-3)]">
          <div className="relative" data-entry-popover>
            <span
              id={categoryLabelId}
              className="mb-[5px] block text-[11.5px] font-medium tracking-[0.06em] text-celia-muted"
            >
              CATEGORY
            </span>
            <button
              type="button"
              id={categoryTriggerId}
              aria-labelledby={`${categoryLabelId} ${categoryTriggerId}`}
              aria-haspopup="listbox"
              aria-expanded={formMenu === "cat"}
              onClick={(event) => togglePopover("cat", event.currentTarget)}
              className="flex h-[42px] w-full items-center gap-[var(--space-2)] rounded-celia-control border border-celia-border px-[var(--space-3)] text-left text-[14px]"
            >
              {selectedCategory ? (
                <>
                  <span
                    aria-hidden="true"
                    className="size-[11px] rounded-celia-swatch"
                    style={{ backgroundColor: selectedCategory.color }}
                  />
                  {selectedCategory.name}
                  {selectedCategory.archived ? " (archived)" : ""}
                  <span className="ml-auto" aria-hidden="true">
                    ▾
                  </span>
                </>
              ) : (
                <>
                  Choose category{" "}
                  <span className="ml-auto" aria-hidden="true">
                    ▾
                  </span>
                </>
              )}
            </button>
            {formMenu === "cat" ? (
              <div className="absolute z-20 mt-[4px] w-full rounded-celia-popover border border-celia-border bg-celia-surface">
                <CategoryPopover
                  categories={availableCategories}
                  selectedId={categoryId}
                  onSelect={(category) => {
                    setCategoryId(category.id);
                    setItemId(category.items[0]?.id ?? "");
                    closePopoverAndRestoreFocus();
                  }}
                />
              </div>
            ) : null}
          </div>
          <div className="relative" data-entry-popover>
            <span
              id={itemLabelId}
              className="mb-[5px] block text-[11.5px] font-medium tracking-[0.06em] text-celia-muted"
            >
              ITEM
            </span>
            <button
              type="button"
              id={itemTriggerId}
              aria-labelledby={`${itemLabelId} ${itemTriggerId}`}
              aria-haspopup="listbox"
              aria-expanded={formMenu === "item"}
              onClick={(event) => togglePopover("item", event.currentTarget)}
              className="flex h-[42px] w-full items-center justify-between rounded-celia-control border border-celia-border px-[var(--space-3)] text-left text-[14px]"
            >
              <>
                {selectedItem?.name ?? "Choose item"}
                <span aria-hidden="true">▾</span>
              </>
            </button>
            {formMenu === "item" ? (
              <div className="absolute z-20 mt-[4px] w-full rounded-celia-popover border border-celia-border bg-celia-surface">
                <ItemPopover
                  items={
                    selectedCategory?.archived
                      ? selectedItem
                        ? [selectedItem]
                        : []
                      : (selectedCategory?.items ?? [])
                  }
                  selectedId={itemId}
                  onSelect={(item) => {
                    setItemId(item.id);
                    closePopoverAndRestoreFocus();
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
        <p
          id={missingSelectionId}
          aria-live="polite"
          className={
            missingSelectionMessage
              ? "mt-[var(--space-2)] text-[length:var(--font-size-secondary)] text-celia-muted"
              : "sr-only"
          }
        >
          {missingSelectionMessage}
        </p>
        <div className="mt-[var(--space-4-5)]">
          <OwnerSegmentedControl
            members={members.filter(
              (member) => !member.archived || member.id === ownerMemberId,
            )}
            value={ownerMemberId}
            onChange={setOwnerMemberId}
          />
        </div>
        <label className="mt-[var(--space-4-5)] grid gap-[5px]">
          <span className="text-[11.5px] font-medium tracking-[0.06em] text-celia-muted">
            NOTE
          </span>
          <textarea
            aria-label="Note"
            rows={3}
            placeholder="Optional"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="rounded-celia-control border border-celia-border p-[var(--space-3)]"
          />
        </label>
        <div className="mt-[var(--space-5)] flex justify-end gap-[var(--space-2)] border-t border-celia-border pt-[var(--space-4)]">
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="rounded-celia-control-compact border border-celia-border px-[15px] py-[10px] text-[13.5px] text-celia-muted"
          >
            Cancel
          </button>
          {!entry ? (
            <button
              type="button"
              disabled={!canSave}
              aria-describedby={
                missingSelectionMessage ? missingSelectionId : undefined
              }
              onClick={() => void submit(true)}
              className="rounded-celia-control-compact border border-celia-border px-[15px] py-[10px] text-[13.5px] text-celia-ink-secondary disabled:border-celia-border disabled:bg-celia-surface-subtle disabled:text-celia-muted"
            >
              Save & add another
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canSave}
            aria-describedby={
              missingSelectionMessage ? missingSelectionId : undefined
            }
            onClick={() => void submit(false)}
            className="rounded-celia-control-compact border border-celia-accent bg-celia-accent px-[var(--space-5)] py-[10px] text-[13.5px] font-medium text-celia-surface disabled:border-celia-border disabled:bg-celia-surface-subtle disabled:text-celia-muted"
          >
            Save
          </button>
        </div>
      </div>
    </dialog>
  );
}

"use client";

import { useEffect, useRef, useState, type FocusEvent } from "react";
import MonthPicker from "@/components/shell/month-picker";
import PageHeader from "@/components/shell/page-header";
import type {
  DashboardFilterState,
  DashboardViewData,
} from "@/domain/dashboard";

export default function DashboardHeader({
  filter,
  categories,
  members,
  onFilterChange,
  onAddEntry,
}: {
  filter: DashboardFilterState;
  members: DashboardViewData["filterMembers"];
  categories: DashboardViewData["filterCategories"];
  onFilterChange: (patch: Partial<DashboardFilterState>) => void;
  onAddEntry: () => void;
}) {
  const ownerId = filter.memberFilter,
    categoryId = filter.categoryId;
  const [menu, setMenu] = useState<"owner" | "category" | null>(null);
  const ownerMenuRef = useRef<HTMLDivElement>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const ownerOptionsRef = useRef<HTMLDivElement>(null);
  const categoryOptionsRef = useRef<HTMLDivElement>(null);
  const ownerChipRef = useRef<HTMLButtonElement>(null);
  const categoryChipRef = useRef<HTMLButtonElement>(null);
  const ownerPointerInsideRef = useRef(false);
  const categoryPointerInsideRef = useRef(false);
  const chipClass =
    "rounded-celia-control-compact border border-celia-border bg-celia-surface px-[13px] py-[var(--space-1-75)] text-[length:var(--font-size-control)] text-celia-muted hover:bg-celia-surface-subtle";
  const selectedChipClass =
    "rounded-celia-control-compact border border-celia-filter-selected bg-celia-accent-tint px-[13px] py-[var(--space-1-75)] text-[length:var(--font-size-control)] text-celia-accent-dark";

  function closeMenuAndRestoreFocus(menuName: "owner" | "category") {
    setMenu(null);
    (menuName === "owner" ? ownerChipRef : categoryChipRef).current?.focus();
  }

  function closeWhenFocusLeaves(
    event: FocusEvent<HTMLDivElement>,
    menuName: "owner" | "category",
  ) {
    const pointerInsideRef =
      menuName === "owner" ? ownerPointerInsideRef : categoryPointerInsideRef;
    if (
      event.currentTarget.contains(event.relatedTarget) ||
      pointerInsideRef.current
    ) {
      return;
    }
    setMenu((current) => (current === menuName ? null : current));
  }

  function setPointerInside(menuName: "owner" | "category", value: boolean) {
    (menuName === "owner"
      ? ownerPointerInsideRef
      : categoryPointerInsideRef
    ).current = value;
  }

  useEffect(() => {
    const resetPointerState = () => {
      ownerPointerInsideRef.current = false;
      categoryPointerInsideRef.current = false;
    };

    document.addEventListener("pointerup", resetPointerState);
    document.addEventListener("pointercancel", resetPointerState);
    return () => {
      document.removeEventListener("pointerup", resetPointerState);
      document.removeEventListener("pointercancel", resetPointerState);
    };
  }, []);

  useEffect(() => {
    if (!menu) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const menuRef = menu === "owner" ? ownerMenuRef : categoryMenuRef;
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const optionsRef =
        menu === "owner" ? ownerOptionsRef : categoryOptionsRef;
      if (optionsRef.current?.contains(document.activeElement)) {
        closeMenuAndRestoreFocus(menu);
      } else {
        setMenu(null);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu]);

  const ownerOptions = [
    { id: "all", name: "All members" },
    { id: "household", name: "Household" },
    ...members.map((member) => ({ id: member.id, name: member.name })),
  ];
  const categoryNameCounts = new Map<string, number>();
  for (const category of categories) {
    categoryNameCounts.set(
      category.name,
      (categoryNameCounts.get(category.name) ?? 0) + 1,
    );
  }
  const categoryOptions = [
    { id: "all", name: "All categories" },
    ...categories.map((category) => ({
      id: category.id,
      name:
        categoryNameCounts.get(category.name) === 1
          ? category.name
          : `${category.umbrella === "income" ? "Income" : "Expense"} · ${category.name}`,
    })),
  ];
  const ownerLabel =
    ownerOptions.find((option) => option.id === ownerId)?.name ?? "All members";
  const categoryLabel =
    categoryOptions.find((option) => option.id === categoryId)?.name ??
    "All categories";

  return (
    <PageHeader
      title="Dashboard"
      actions={
        <>
          <div
            ref={ownerMenuRef}
            className="relative"
            onBlur={(event) => closeWhenFocusLeaves(event, "owner")}
            onPointerDownCapture={() => setPointerInside("owner", true)}
            onPointerUpCapture={() => setPointerInside("owner", false)}
            onPointerCancelCapture={() => setPointerInside("owner", false)}
          >
            <button
              ref={ownerChipRef}
              type="button"
              aria-controls="dashboard-owner-options"
              aria-expanded={menu === "owner"}
              onClick={() => setMenu(menu === "owner" ? null : "owner")}
              className={ownerId === "all" ? chipClass : selectedChipClass}
            >
              {`${ownerLabel} ▾`}
            </button>
            {menu === "owner" ? (
              <div
                ref={ownerOptionsRef}
                id="dashboard-owner-options"
                role="group"
                aria-label="Owner filter options"
                className="absolute z-20 mt-[5px] min-w-[150px] overflow-hidden rounded-celia-popover border border-celia-border bg-celia-surface p-0"
              >
                {ownerOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      option.id === ownerId
                        ? "block w-full bg-celia-menu-selected px-[var(--space-3-5)] py-[var(--space-2)] text-left text-[length:var(--font-size-control)] font-medium text-celia-ink"
                        : "block w-full px-[var(--space-3-5)] py-[var(--space-2)] text-left text-[length:var(--font-size-control)] text-celia-ink-secondary hover:bg-celia-surface-subtle"
                    }
                    onClick={() => {
                      onFilterChange({ memberFilter: option.id });
                      closeMenuAndRestoreFocus("owner");
                    }}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div
            ref={categoryMenuRef}
            className="relative"
            onBlur={(event) => closeWhenFocusLeaves(event, "category")}
            onPointerDownCapture={() => setPointerInside("category", true)}
            onPointerUpCapture={() => setPointerInside("category", false)}
            onPointerCancelCapture={() => setPointerInside("category", false)}
          >
            <button
              ref={categoryChipRef}
              type="button"
              aria-controls="dashboard-category-options"
              aria-expanded={menu === "category"}
              onClick={() => setMenu(menu === "category" ? null : "category")}
              className={categoryId === "all" ? chipClass : selectedChipClass}
            >
              {`${categoryLabel} ▾`}
            </button>
            {menu === "category" ? (
              <div
                ref={categoryOptionsRef}
                id="dashboard-category-options"
                role="group"
                aria-label="Category filter options"
                className="absolute z-20 mt-[5px] max-h-[280px] min-w-[180px] overflow-auto rounded-celia-popover border border-celia-border bg-celia-surface p-0"
              >
                {categoryOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      option.id === categoryId
                        ? "block w-full bg-celia-accent-tint px-[13px] py-[var(--space-2)] text-left text-[length:var(--font-size-control)] font-medium text-celia-accent-dark"
                        : "block w-full px-[13px] py-[var(--space-2)] text-left text-[length:var(--font-size-control)] text-celia-ink-secondary hover:bg-celia-surface-subtle"
                    }
                    onClick={() => {
                      onFilterChange({ categoryId: option.id });
                      closeMenuAndRestoreFocus("category");
                    }}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <MonthPicker
            value={filter.monthKey}
            onChange={(monthKey) => onFilterChange({ monthKey })}
          />
          <button
            type="button"
            onClick={onAddEntry}
            className="rounded-celia-control-compact border border-celia-accent bg-celia-accent px-[var(--space-4)] py-[var(--space-1-75)] text-[length:var(--font-size-control)] font-medium text-celia-surface hover:bg-celia-accent-dark"
          >
            + Add entry
          </button>
        </>
      }
    />
  );
}

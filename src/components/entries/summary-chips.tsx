"use client";

import { formatCentavos } from "@/domain/amount";
import {
  calculateMemberSummary,
  calculateTotals,
} from "@/domain/entry-calculations";
import type { EntryWithDetails } from "@/domain/entry";

function MoneyChip({
  label,
  total,
  own,
  shared,
}: {
  label: "Expense" | "Income" | "Net";
  total: number;
  own?: number;
  shared?: number;
}) {
  const signed = label === "Net";
  const totalText = formatCentavos(total, { signed });
  return (
    <span className="rounded-celia-pill border border-celia-border bg-celia-surface px-[var(--space-3-5)] py-[var(--space-1-75)] text-[length:var(--font-size-control)] text-celia-ink">
      <span>{`${label} `}</span>
      <b className="font-celia-figure font-bold">{totalText}</b>
      {own !== undefined && shared !== undefined ? (
        <span className="block text-celia-muted">
          {`${formatCentavos(own, { signed })} own · ${formatCentavos(shared, { signed })} shared`}
        </span>
      ) : null}
    </span>
  );
}

export default function SummaryChips({
  entries,
  ownerId,
}: {
  entries: readonly EntryWithDetails[];
  ownerId: string | "all";
}) {
  const totals = calculateTotals(entries);
  const memberSummary =
    ownerId === "all" ? null : calculateMemberSummary(entries, ownerId);

  return (
    // lifted from prototype CSS
    <div
      role="group"
      className="flex flex-wrap gap-[var(--space-2-5)]"
      aria-label="Entry summaries"
    >
      <span className="rounded-celia-pill border border-celia-border bg-celia-surface px-[var(--space-3-5)] py-[var(--space-1-75)] text-[length:var(--font-size-control)] text-celia-ink">
        <span>Entries </span>
        <b className="font-celia-figure font-bold">{totals.count}</b>
      </span>
      <MoneyChip
        label="Expense"
        total={totals.expenseCentavos}
        own={memberSummary?.ownExpenseCentavos}
        shared={memberSummary?.sharedExpenseCentavos}
      />
      <MoneyChip
        label="Income"
        total={totals.incomeCentavos}
        own={memberSummary?.ownIncomeCentavos}
        shared={memberSummary?.sharedIncomeCentavos}
      />
      <MoneyChip
        label="Net"
        total={totals.netCentavos}
        own={memberSummary?.ownNetCentavos}
        shared={memberSummary?.sharedNetCentavos}
      />
    </div>
  );
}

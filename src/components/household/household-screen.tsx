"use client";
import { useState } from "react";
import type { Member } from "@/domain/member";
import MonthPicker from "@/components/shell/month-picker";
import PageHeader from "@/components/shell/page-header";
import ArchivedMembers from "./archived-members";
import DefaultsPanel from "./defaults-panel";
import ExpensePerMemberPanel from "./expense-per-member-panel";
import MembersTable from "./members-table";
import RemoveMemberDialog from "./remove-member-dialog";
type HouseholdScreenProps = {
  members: Member[];
  archivedMembers: Member[];
  defaults: { owner: string; currency: string };
};
export default function HouseholdScreen({
  members,
  archivedMembers,
  defaults,
}: HouseholdScreenProps) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);

  // lifted from prototype CSS
  return (
    <>
      <PageHeader
        title="Household"
        actions={
          <>
            <MonthPicker />
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="rounded-celia-control-compact border border-celia-accent bg-celia-accent px-[var(--space-4)] py-[var(--space-1-75)] text-[length:var(--font-size-control)] font-medium text-celia-surface hover:bg-celia-accent-dark"
            >
              + Add member
            </button>
          </>
        }
      />
      <div className="flex flex-col gap-[var(--space-3-5)]">
        <MembersTable
          members={members}
          adding={adding}
          onAddCancel={() => setAdding(false)}
          onRemove={setRemoving}
        />
        <ArchivedMembers members={archivedMembers} />
        <div className="grid grid-cols-[minmax(0,65fr)_minmax(0,35fr)] items-start gap-[var(--space-3-5)]">
          <ExpensePerMemberPanel />
          <DefaultsPanel defaults={defaults} />
        </div>
      </div>
      <RemoveMemberDialog member={removing} onClose={() => setRemoving(null)} />
    </>
  );
}

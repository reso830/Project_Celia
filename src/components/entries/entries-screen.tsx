"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { filterEntries } from "@/domain/entry-calculations";
import type { EntryType, EntryWithDetails } from "@/domain/entry";
import type { EntriesViewData } from "@/server/entries-read";
import DeleteConfirmDialog from "./delete-confirm-dialog";
import EntriesHeader from "./entries-header";
import EntriesTable from "./entries-table";
import EntryModal from "./entry-modal";
import SearchInput from "./search-input";
import SummaryChips from "./summary-chips";
import TypeFilter from "./type-filter";
import Toast from "@/components/ui/toast";

export default function EntriesScreen(
  view: EntriesViewData & {
    initialCategoryId?: string;
    initialOwnerId?: string;
  },
) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<EntryType | "all">("all");
  const [categoryId, setCategoryId] = useState<string | "all">(
    view.initialCategoryId ?? "all",
  );
  const [ownerId, setOwnerId] = useState<string | "all">(
    view.initialOwnerId ?? "all",
  );
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editedEntry, setEditedEntry] = useState<EntryWithDetails | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<{
    entry: EntryWithDetails;
    focusEntryId: string | null;
  } | null>(null);
  const [deleteFocusId, setDeleteFocusId] = useState<string | null>();
  const [deletedEntryIds, setDeletedEntryIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [feedback, setFeedback] = useState<
    { kind: "success" | "error"; message: string } | undefined
  >();
  const dismissFeedback = useCallback(() => setFeedback(undefined), []);
  const currentEntries = view.entries.filter(
    (entry) => !deletedEntryIds.has(entry.id),
  );
  const entries = filterEntries(currentEntries, {
    monthKey: view.month,
    search,
    type,
    categoryId,
    ownerId,
  });
  const message =
    currentEntries.length === 0
      ? "No entries recorded for this month."
      : entries.length === 0
        ? "No entries match these filters."
        : null;
  // lifted from prototype CSS
  return (
    <section>
      <EntriesHeader
        month={view.month}
        categories={view.categories}
        members={view.members}
        categoryId={categoryId}
        ownerId={ownerId}
        onCategoryChange={setCategoryId}
        onOwnerChange={setOwnerId}
        onAddEntry={() => setEntryModalOpen(true)}
      />
      <div
        role="group"
        className="mb-[var(--space-3-5)] flex flex-wrap items-center gap-[var(--space-2-5)]"
        aria-label="Entry filters"
      >
        <TypeFilter value={type} onChange={setType} />
        <SummaryChips entries={entries} ownerId={ownerId} />
        <SearchInput value={search} onChange={setSearch} />
      </div>
      <Toast
        message={feedback?.message ?? null}
        kind={feedback?.kind}
        onDismiss={dismissFeedback}
      />
      {/* This order matters: close the native dialog before EntriesTable restores focus. */}
      <DeleteConfirmDialog
        entry={deleteRequest?.entry ?? null}
        onClose={() => setDeleteRequest(null)}
        onDeleted={() => {
          if (!deleteRequest) return;
          setDeletedEntryIds((ids) => new Set(ids).add(deleteRequest.entry.id));
          setDeleteFocusId(deleteRequest.focusEntryId);
          setFeedback({ kind: "success", message: "Entry deleted" });
        }}
        onStale={(message) => {
          setDeleteFocusId(deleteRequest?.focusEntryId ?? null);
          setFeedback({ kind: "error", message });
          router.refresh();
        }}
      />
      {entryModalOpen ? (
        <EntryModal
          open
          categories={
            editedEntry
              ? [...view.categories, ...view.archivedCategories]
              : view.categories
          }
          members={
            editedEntry
              ? [...view.members, ...view.archivedMembers]
              : view.members
          }
          entry={editedEntry}
          onClose={() => {
            setEntryModalOpen(false);
            setEditedEntry(null);
          }}
          onSaved={(message) => setFeedback({ kind: "success", message })}
          onStale={(message) => {
            setFeedback({ kind: "error", message });
            router.refresh();
          }}
          liveMessage={feedback?.message}
        />
      ) : null}
      <EntriesTable
        entries={entries}
        ownerId={ownerId}
        emptyMessage={message}
        focusEntryId={deleteFocusId}
        onFocusRestored={() => setDeleteFocusId(undefined)}
        onDelete={(entry, focusEntryId) => {
          setDeleteRequest({ entry, focusEntryId });
        }}
        onEdit={(entry) => {
          setEditedEntry(entry);
          setEntryModalOpen(true);
        }}
      />
    </section>
  );
}

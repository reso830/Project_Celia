"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SavingsViewData } from "@/server/savings-read";
import { useMutation } from "@/components/ui/use-mutation";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import Toast from "@/components/ui/toast";
import EmptyState from "@/components/ui/empty-state";
import SavingsHeader from "./savings-header";
import SavingsKpiRow from "./savings-kpi-row";
import BucketCard from "./bucket-card";
import BucketModal from "./bucket-modal";
import ActivityModal from "./activity-modal";
import BucketHistoryModal from "./bucket-history-modal";
import ArchivedBuckets from "./archived-buckets";
type Modal = {
  kind: "new" | "edit" | "contribution" | "withdrawal" | "history";
  id?: string;
};
// recreated manually: HF L269-L312 savings layout with activity/archive confirmations per D3.
export default function SavingsScreen({ data }: { data: SavingsViewData }) {
  const router = useRouter(),
    { run, pending } = useMutation(),
    lock = useRef(false);
  const [modal, setModal] = useState<Modal | null>(null),
    [archiving, setArchiving] = useState<string | null>(null),
    [archiveError, setArchiveError] = useState(""),
    [toast, setToast] = useState<{
      message: string;
      kind: "success" | "error";
    } | null>(null);
  const selected = [...data.activeBuckets, ...data.archivedBuckets].find(
      (b) => b.bucket.id === modal?.id,
    ),
    archiveBucket = data.activeBuckets.find((b) => b.bucket.id === archiving);
  async function mutate(
    url: string,
    method: string,
    body?: Record<string, string>,
  ) {
    if (lock.current)
      return { code: "pending", message: "A change is already being saved." };
    lock.current = true;
    try {
      const result = await run(url, method, body);
      if (result?.code === "not_found") {
        setModal(null);
        setArchiving(null);
        setToast({ message: result.message, kind: "error" });
        router.refresh();
      } else if (!result)
        setToast({ message: "Changes saved", kind: "success" });
      return result;
    } finally {
      lock.current = false;
    }
  }
  async function archive() {
    if (!archiving) return;
    const result = await mutate(
      `/api/savings/buckets/${archiving}/archive`,
      "POST",
    );
    if (result) setArchiveError(result.message);
    else setArchiving(null);
  }
  return (
    <>
      <SavingsHeader
        month={data.month}
        onNew={() => setModal({ kind: "new" })}
      />
      <SavingsKpiRow month={data.month} kpis={data.kpis} />
      {data.activeBuckets.length ? (
        <div className="grid grid-cols-[var(--savings-bucket-columns)] gap-[var(--space-3-5)]">
          {data.activeBuckets.map((m) => (
            <BucketCard
              key={m.bucket.id}
              metrics={m}
              month={data.month}
              pending={pending}
              onToggle={() => {
                void mutate(`/api/savings/buckets/${m.bucket.id}`, "PATCH", {
                  countsTowardBuffer: String(!m.bucket.countsTowardBuffer),
                }).then((error) => {
                  if (error)
                    setToast({ message: error.message, kind: "error" });
                });
              }}
              onAction={(action) => {
                if (action === "archive") {
                  setArchiveError("");
                  setArchiving(m.bucket.id);
                } else setModal({ kind: action, id: m.bucket.id });
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState>
          No savings buckets yet. Create a bucket to start tracking your
          savings.
        </EmptyState>
      )}
      <ArchivedBuckets
        buckets={data.archivedBuckets}
        pending={pending}
        onHistory={(id) => setModal({ kind: "history", id })}
        onRestore={(id) => {
          void mutate(`/api/savings/buckets/${id}/restore`, "POST").then(
            (error) => {
              if (error) setToast({ message: error.message, kind: "error" });
            },
          );
        }}
      />
      {(modal?.kind === "new" || (modal?.kind === "edit" && selected)) && (
        <BucketModal
          key={modal.id ?? "new"}
          bucket={selected?.bucket}
          currentBalance={selected?.currentBalanceCentavos}
          onClose={() => setModal(null)}
          onSave={(body) =>
            mutate(
              modal.kind === "new"
                ? "/api/savings/buckets"
                : `/api/savings/buckets/${modal.id}`,
              modal.kind === "new" ? "POST" : "PATCH",
              body,
            )
          }
        />
      )}
      {(modal?.kind === "contribution" || modal?.kind === "withdrawal") &&
        selected && (
          <ActivityModal
            key={`${modal.kind}:${modal.id}`}
            metrics={selected}
            kind={modal.kind}
            today={data.today}
            onClose={() => setModal(null)}
            onSave={(body) => mutate("/api/savings/activities", "POST", body)}
          />
        )}
      {modal?.kind === "history" && selected && (
        <BucketHistoryModal
          metrics={selected}
          today={data.today}
          onClose={() => setModal(null)}
          mutate={mutate}
        />
      )}
      <ConfirmDialog
        open={!!archiveBucket}
        title="Archive savings bucket"
        confirmLabel="Archive bucket"
        variant="danger"
        pending={pending}
        error={archiveError}
        onCancel={() => {
          if (!pending) setArchiving(null);
        }}
        onConfirm={() => void archive()}
      >
        <p>
          Archive {archiveBucket?.bucket.name}? History is preserved and new
          activity is disabled.
        </p>
      </ConfirmDialog>
      <Toast
        message={toast?.message ?? null}
        kind={toast?.kind}
        onDismiss={() => setToast(null)}
      />
    </>
  );
}

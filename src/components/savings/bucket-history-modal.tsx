"use client";
import { useState, useRef } from "react";
import type { SavingsViewData } from "@/server/savings-read";
import type { SavingsActivity } from "@/domain/savings";
import type { MutationError } from "@/components/ui/use-mutation";
import { formatCentavos } from "@/domain/amount";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { SavingsDialog, buttonClass } from "./bucket-modal";
import ActivityModal from "./activity-modal";
type Metrics = SavingsViewData["activeBuckets"][number];
// recreated manually: history, edit and delete controls use HF L550-L602 modal tokens per D3.
export default function BucketHistoryModal({
  metrics,
  today,
  onClose,
  mutate,
}: {
  metrics: Metrics;
  today: string;
  onClose: () => void;
  mutate: (
    url: string,
    method: string,
    body?: Record<string, string>,
  ) => Promise<MutationError | undefined>;
}) {
  const [editing, setEditing] = useState<SavingsActivity | null>(null),
    [deleting, setDeleting] = useState<SavingsActivity | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const archived = metrics.bucket.archivedAt !== null;
  const deletionInvalid =
    deleting?.kind === "contribution" &&
    metrics.currentBalanceCentavos - deleting.amount < 0;
  async function remove() {
    if (!deleting || deletionInvalid || lock.current) return;
    lock.current = true;
    setPending(true);
    try {
      const result = await mutate(
        `/api/savings/activities/${deleting.id}`,
        "DELETE",
      );
      if (result) setError(result.message);
      else setDeleting(null);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <>
      <SavingsDialog
        title={`${metrics.bucket.name} history`}
        onClose={() => {
          if (!pending) onClose();
        }}
      >
        <div className="mb-[var(--space-4)] flex flex-wrap justify-between gap-[var(--space-2)] text-celia-muted">
          <span>
            Opening balance{" "}
            <b className="font-celia-figure text-celia-ink">
              {formatCentavos(metrics.bucket.openingBalance)}
            </b>
          </span>
          <span>
            Current balance{" "}
            <b className="font-celia-figure text-celia-ink">
              {formatCentavos(metrics.currentBalanceCentavos)}
            </b>
          </span>
        </div>
        {archived && (
          <p className="mb-[var(--space-3)] text-celia-muted">
            Archived bucket {"\u00b7"} read-only history
          </p>
        )}
        {!metrics.activities.length && (
          <p className="text-celia-muted">No savings activity yet.</p>
        )}
        <ul>
          {metrics.activities.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-[var(--space-3)] border-t border-celia-row-divider py-[var(--space-3)]"
            >
              <div className="min-w-0 flex-1">
                <div>
                  {a.date} {"\u00b7"}{" "}
                  {a.kind === "contribution" ? "Contribution" : "Withdrawal"}
                </div>
                {a.note && (
                  <p className="mt-[var(--space-1)] break-words text-[length:var(--font-size-secondary)] text-celia-muted">
                    {a.note}
                  </p>
                )}
              </div>
              <b
                className={`font-celia-figure ${a.kind === "contribution" ? "text-celia-status-green" : "text-celia-ink"}`}
              >
                {a.kind === "contribution" ? "+" : "\u2212"}
                {formatCentavos(a.amount)}
              </b>
              {!archived && (
                <div className="flex gap-[var(--space-2)]">
                  <button
                    className={buttonClass}
                    type="button"
                    aria-label={`Edit activity ${a.date}`}
                    onClick={() => setEditing(a)}
                  >
                    {"\u270e"}
                  </button>
                  <button
                    className={`${buttonClass} text-celia-status-red`}
                    type="button"
                    aria-label={`Delete activity ${a.date}`}
                    onClick={() => {
                      setError("");
                      setDeleting(a);
                    }}
                  >
                    {"\u2715"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </SavingsDialog>
      {editing && !archived && (
        <ActivityModal
          key={editing.id}
          metrics={metrics}
          kind={editing.kind}
          activity={editing}
          today={today}
          onClose={() => setEditing(null)}
          onSave={(body) =>
            mutate(`/api/savings/activities/${editing.id}`, "PATCH", body)
          }
        />
      )}
      <ConfirmDialog
        open={!!deleting && !archived}
        title="Delete savings activity"
        confirmLabel="Delete activity"
        variant="danger"
        pending={pending}
        confirmDisabled={!!deletionInvalid}
        error={
          deletionInvalid
            ? "Deleting this contribution would make the bucket balance negative."
            : error
        }
        onCancel={() => {
          if (!pending) setDeleting(null);
        }}
        onConfirm={() => void remove()}
      >
        <p>
          Delete {deleting ? formatCentavos(deleting.amount) : ""} recorded on{" "}
          {deleting?.date}?
        </p>
      </ConfirmDialog>
    </>
  );
}

import type { SavingsViewData } from "@/server/savings-read";
import { formatCentavos } from "@/domain/amount";
import { buttonClass } from "./bucket-modal";
// recreated manually: archived bucket disclosure and restore actions use shared HF bucket card tokens per D3.
export default function ArchivedBuckets({
  buckets,
  pending,
  onHistory,
  onRestore,
}: {
  buckets: SavingsViewData["archivedBuckets"];
  pending: boolean;
  onHistory: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  if (!buckets.length) return null;
  return (
    <details className="mt-[var(--space-4)] rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-4)]">
      <summary className="cursor-pointer font-medium">
        Archived ({buckets.length})
      </summary>
      <ul className="mt-[var(--space-3)] space-y-[var(--space-3)]">
        {buckets.map((m) => (
          <li
            key={m.bucket.id}
            className="flex flex-wrap items-center justify-between gap-[var(--space-3)]"
          >
            <span>
              {m.bucket.name}{" "}
              <span className="text-celia-muted">(archived)</span>{" "}
              <b className="font-celia-figure">
                {formatCentavos(m.currentBalanceCentavos)}
              </b>
            </span>
            <div className="flex gap-[var(--space-2)]">
              <button
                type="button"
                className={buttonClass}
                aria-label={`History for ${m.bucket.name}`}
                onClick={() => onHistory(m.bucket.id)}
              >
                History
              </button>
              <button
                type="button"
                className={buttonClass}
                aria-label={`Restore ${m.bucket.name}`}
                disabled={pending}
                onClick={() => onRestore(m.bucket.id)}
              >
                Restore
              </button>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}

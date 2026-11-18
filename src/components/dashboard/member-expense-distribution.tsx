"use client";
import { formatCentavos } from "@/domain/amount";
import type { MemberDistributionData } from "@/domain/dashboard";
export default function MemberExpenseDistribution({
  data,
  onMemberChange,
}: {
  data: MemberDistributionData;
  onMemberChange: (memberId: string) => void;
}) {
  return (
    <section
      aria-label="Expense per member"
      className="min-w-0 rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-4-5)]"
    >
      <h2 className="mb-[var(--space-3-5)] text-[length:var(--font-size-card-title)] font-semibold">
        Expense per member
      </h2>
      {!data.isApplicable ? (
        <p className="text-[length:var(--font-size-body)] text-celia-muted">
          Expense distribution not applicable to income categories
        </p>
      ) : data.rows.length === 0 || data.maxSpendCentavos === 0 ? (
        <p className="text-[length:var(--font-size-body)] text-celia-muted">
          No spending recorded for this month
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-[13px] text-[length:var(--font-size-body)]">
            {data.rows.map((row) => {
              const content = (
                <>
                  <span className="mb-[5px] flex items-baseline justify-between gap-2">
                    <span className="min-w-0 break-words">
                      {row.name}{" "}
                      {row.isArchived && (
                        <span className="text-[length:var(--font-size-caps)] text-celia-muted">
                          (archived)
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-celia-figure text-[length:var(--font-size-table-figure)]">
                      {formatCentavos(row.totalSpentCentavos)}
                    </span>
                  </span>
                  <span className="flex h-[11px] overflow-hidden rounded-[6px] bg-celia-border-subtle">
                    {row.segments.map((segment) => (
                      <span
                        key={segment.categoryId}
                        title={`${segment.categoryName}: ${formatCentavos(segment.amountCentavos)}`}
                        className="h-full"
                        style={{
                          width: `${segment.widthRatio * 100}%`,
                          backgroundColor: segment.color,
                        }}
                      >
                        <span className="sr-only">
                          {segment.categoryName}:{" "}
                          {formatCentavos(segment.amountCentavos)}
                        </span>
                      </span>
                    ))}
                  </span>
                </>
              );
              const style = `block w-full rounded-[4px] text-left ${row.isSelected ? "bg-celia-accent-tint outline-2 outline-celia-filter-selected" : ""}`;
              return row.isClickable ? (
                <button
                  key={row.memberId}
                  type="button"
                  aria-pressed={row.isSelected}
                  onClick={() =>
                    onMemberChange(row.isSelected ? "all" : row.memberId)
                  }
                  className={`${style} cursor-pointer hover:bg-celia-surface-subtle focus-visible:outline-2 focus-visible:outline-celia-accent`}
                >
                  {content}
                </button>
              ) : (
                <div key={row.memberId} className={style}>
                  {content}
                </div>
              );
            })}
          </div>
          <div className="mt-[var(--space-3-5)] flex flex-wrap gap-x-[var(--space-3-5)] gap-y-[9px] border-t border-celia-border-subtle pt-[var(--space-3)] text-[11.5px] text-celia-ink-secondary">
            {data.legendSwatches.map((swatch, i) => (
              <span key={i} className="flex items-center gap-[6px]">
                <span
                  aria-hidden="true"
                  className="h-[10px] w-[10px] rounded-[3px]"
                  style={{ backgroundColor: swatch.color }}
                />
                {swatch.name}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

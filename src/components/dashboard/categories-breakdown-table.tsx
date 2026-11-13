import Link from "next/link";
import { formatCentavos } from "@/domain/amount";
import type { CategoriesTableData } from "@/domain/dashboard";

export default function CategoriesBreakdownTable({
  data,
  monthKey,
  memberFilter = "all",
  hasMonthlyPlan,
}: {
  data: CategoriesTableData;
  monthKey: string;
  memberFilter?: string;
  hasMonthlyPlan: boolean;
}) {
  const money = (amount: number) => formatCentavos(amount);
  const deltaClass = (amount: number) =>
    amount > 0
      ? "text-celia-status-green"
      : amount < 0
        ? "text-celia-status-red"
        : "text-celia-muted";
  return (
    <section
      aria-label="Categories"
      className="min-w-0 overflow-hidden rounded-celia-card border border-celia-border bg-celia-surface"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-[var(--space-5)] pt-[17px] pb-[var(--space-3-5)]">
        <h2 className="text-[length:var(--font-size-card-title)] font-semibold">
          Categories
        </h2>
        <p className="text-[length:var(--font-size-secondary)] text-celia-muted">
          ↺ remaining this month
        </p>
        {!hasMonthlyPlan && (
          <p className="w-full text-[length:var(--font-size-secondary)] text-celia-muted">
            No plan applied
          </p>
        )}
        {memberFilter !== "all" && (
          <p className="w-full text-[length:var(--font-size-caps)] text-celia-muted">
            Household budgets
          </p>
        )}
      </div>
      {!data.isApplicable || data.rows.length === 0 ? (
        <p className="px-[var(--space-5)] pb-[var(--space-5)] text-[length:var(--font-size-body)] text-celia-muted">
          {data.isApplicable
            ? "No spending or budget this month"
            : "No expense categories match filter"}
        </p>
      ) : (
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col style={{ width: "31.6%" }} />
            <col style={{ width: "19.8%" }} />
            <col style={{ width: "17.8%" }} />
            <col style={{ width: "14.9%" }} />
            <col style={{ width: "15.9%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-celia-border text-[length:var(--font-size-caps)] tracking-[0.06em] text-celia-muted">
              {["CATEGORY", "SPENT", "USED", "Δ", "↺"].map((heading, i) => (
                <th
                  key={heading}
                  scope="col"
                  className={`pb-[9px] pr-2 font-medium ${i === 0 ? "pl-[var(--space-4)]" : ""}`}
                  title={
                    heading === "↺"
                      ? "Remaining this month"
                      : heading === "Δ"
                        ? "Budget minus spent"
                        : undefined
                  }
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => {
              const params = new URLSearchParams({
                month: monthKey,
                category: row.categoryId,
              });
              if (memberFilter !== "all") params.set("owner", memberFilter);
              const tone =
                row.progressTone === "critical"
                  ? "var(--color-status-red)"
                  : row.progressTone === "favourable"
                    ? "var(--color-status-green)"
                    : row.progressTone === "warning"
                      ? "var(--color-status-amber)"
                      : "var(--color-muted)";
              return (
                <tr
                  key={row.categoryId}
                  className={`relative border-b border-celia-row-divider text-[length:var(--font-size-body)] ${row.isClickable ? "hover:bg-celia-surface-subtle" : ""}`}
                >
                  <th
                    scope="row"
                    className="py-[var(--space-3)] pr-2 pl-[var(--space-4)] font-normal"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-[10px] w-[10px] shrink-0 rounded-[3px]"
                        style={{ backgroundColor: row.color }}
                      />
                      <div className="min-w-0">
                        {row.isClickable ? (
                          <Link
                            href={`/entries?${params}`}
                            className="block truncate after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-celia-accent"
                            title={row.name}
                          >
                            {row.name}
                          </Link>
                        ) : (
                          <span className="block truncate" title={row.name}>
                            {row.name}
                          </span>
                        )}
                        {row.isArchived && (
                          <span className="text-[length:var(--font-size-caps)] text-celia-muted">
                            (archived)
                          </span>
                        )}
                      </div>
                    </div>
                  </th>
                  <td className="py-[var(--space-3)] pr-2 font-celia-figure text-[length:var(--font-size-table-figure)] break-words">
                    <span className="block">{money(row.spentCentavos)}</span>
                    <span className="block text-[10.5px] text-celia-muted">
                      of {hasMonthlyPlan ? money(row.budgetCentavos) : "—"}
                    </span>
                  </td>
                  <td className="pr-2">
                    {hasMonthlyPlan && (
                      <>
                        <div
                          role="progressbar"
                          aria-label={`${row.name} budget used`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(row.progressRatio * 100)}
                          aria-valuetext={
                            row.budgetCentavos === 0
                              ? "No budget allocated"
                              : `${Math.round((row.spentCentavos / row.budgetCentavos) * 100)}% used`
                          }
                          className="h-[7px] overflow-hidden rounded-[4px] bg-celia-border-subtle"
                        >
                          <div
                            className="h-full"
                            style={{
                              width: `${row.progressRatio * 100}%`,
                              backgroundColor: tone,
                            }}
                          />
                        </div>
                        <span className="sr-only">
                          {row.deltaCentavos < 0
                            ? "Over budget"
                            : row.deltaCentavos === 0
                              ? "At budget"
                              : "Within budget"}
                        </span>
                      </>
                    )}
                  </td>
                  <td
                    className={`pr-2 font-celia-figure text-[length:var(--font-size-table-figure)] break-words ${deltaClass(row.deltaCentavos)}`}
                  >
                    {hasMonthlyPlan
                      ? formatCentavos(row.deltaCentavos, { signed: true })
                      : "—"}
                  </td>
                  <td
                    className={`pr-[var(--space-4)] font-celia-figure text-[length:var(--font-size-table-figure)] break-words ${hasMonthlyPlan && (row.rolloverCentavos ?? 0) > 0 ? "text-celia-status-green" : "text-celia-muted"}`}
                  >
                    {hasMonthlyPlan && row.rolloverCentavos !== null
                      ? money(row.rolloverCentavos)
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-celia-surface-subtle text-[length:var(--font-size-body)] font-semibold">
              <th scope="row" className="py-[13px] pl-[var(--space-4)]">
                Total
              </th>
              <td className="py-[13px] pr-2 font-celia-figure text-[length:var(--font-size-table-figure)] break-words">
                <span className="block">{money(data.totalSpentCentavos)}</span>
                <span className="block text-[10.5px] font-normal text-celia-muted">
                  of {hasMonthlyPlan ? money(data.totalBudgetCentavos) : "—"}
                </span>
              </td>
              <td />
              <td
                className={`pr-2 font-celia-figure text-[length:var(--font-size-table-figure)] break-words ${deltaClass(data.totalDeltaCentavos)}`}
              >
                {hasMonthlyPlan
                  ? formatCentavos(data.totalDeltaCentavos, { signed: true })
                  : "—"}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  );
}

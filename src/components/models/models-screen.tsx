"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ModelsViewData } from "@/server/models-read";
import {
  calculateBudgetComparisonRows,
  calculateBudgetSummary,
  type BudgetComparisonRow,
} from "@/domain/budget-calculations";
import { parseAndValidateNonNegativeAmount } from "@/domain/amount";
import type { MutationError } from "@/components/ui/use-mutation";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import Toast from "@/components/ui/toast";
import ModelsHeader from "./models-header";
import ModelList, { monthLabel } from "./model-list";
import ModelModal from "./model-modal";
import ModelsTable, { rowKey } from "./models-table";
import IncomeAllocationBar from "./income-allocation-bar";
import ExpenseBreakdownDonut from "./expense-breakdown-donut";
import BudgetVsActualChart from "./budget-vs-actual-chart";
import { buttonClass } from "@/components/savings/bucket-modal";
type Model = ModelsViewData["models"][number];
type Mutate = (
  url: string,
  method: string,
  body?: Record<string, string>,
  allocation?: boolean,
) => Promise<{ error?: MutationError; id?: string }>;
// recreated manually: HF L318-L391 workspace layout with template/snapshot modes and confirmations per D5-D11.
export default function ModelsScreen({ data }: { data: ModelsViewData }) {
  return <Workspace key={data.month} data={data} />;
}
function Workspace({ data }: { data: ModelsViewData }) {
  const router = useRouter(),
    [selection, setSelection] = useState(
      data.appliedPlan ? "plan" : (data.models[0]?.id ?? ""),
    ),
    [unlocked, setUnlocked] = useState(false),
    [modal, setModal] = useState<{
      mode: "new" | "edit" | "duplicate";
      model?: Model;
    } | null>(null),
    [confirm, setConfirm] = useState<{
      kind: "apply" | "delete" | "unlock";
      id?: string;
    } | null>(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState<{
      message: string;
      kind: "error" | "success";
    } | null>(null),
    [pending, setPending] = useState(false);
  const guard = useRef(false);
  const planMode = selection === "plan" && !!data.appliedPlan,
    model = data.models.find((m) => m.id === selection) ?? data.models[0],
    selected = planMode ? data.appliedPlan : model,
    locked = planMode && data.month < data.currentMonth && !unlocked;
  const mutate: Mutate = async (url, method, body, allocation = false) => {
    if (!allocation && guard.current)
      return {
        error: { code: "pending", message: "A change is already being saved." },
      };
    if (!allocation) {
      guard.current = true;
      setPending(true);
    }
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = await response.json();
      if (!response.ok) {
        const problem: MutationError = result.error ?? {
          code: "internal",
          message: "Unable to save. Please try again.",
        };
        if (problem.code === "not_found") {
          setModal(null);
          setConfirm(null);
          setToast({ message: problem.message, kind: "error" });
          router.refresh();
        }
        return { error: problem };
      }
      router.refresh();
      setToast({ message: "Saved.", kind: "success" });
      return { id: result.model?.id };
    } catch {
      return {
        error: {
          code: "internal",
          message: "Unable to save. Please try again.",
        },
      };
    } finally {
      if (!allocation) {
        guard.current = false;
        setPending(false);
      }
    }
  };
  function apply(id: string) {
    setError("");
    if (data.appliedPlan || data.month < data.currentMonth)
      setConfirm({ kind: "apply", id });
    else void performApply(id);
  }
  async function performApply(id: string) {
    const result = await mutate(`/api/models/${id}/apply`, "POST", {
      monthKey: data.month,
    });
    if (result.error) setError(result.error.message);
    else {
      setSelection("plan");
      setConfirm(null);
      setUnlocked(false);
    }
  }
  return (
    <>
      <ModelsHeader
        month={data.month}
        onNew={() => setModal({ mode: "new" })}
      />
      <div className="grid grid-cols-[var(--models-workspace-columns)] items-start gap-[var(--space-4)] text-[length:var(--font-size-body)]">
        <ModelList
          data={data}
          selected={planMode ? "plan" : (model?.id ?? "")}
          onSelect={(id) => {
            setSelection(id);
            setError("");
          }}
          onNew={() => setModal({ mode: "new" })}
        />
        <section className="min-w-0 rounded-celia-card border border-celia-border bg-celia-surface p-[var(--space-5)]">
          {selected ? (
            <>
              <div className="mb-[var(--space-5)] flex flex-wrap items-start justify-between gap-[var(--space-3)]">
                <div>
                  <h2 className="text-[length:var(--font-size-modal-title)] font-semibold">
                    {planMode ? `${monthLabel(data.month)} plan` : model?.name}
                  </h2>
                  <p className="mt-[var(--space-1)] text-[length:var(--font-size-table-figure)] text-celia-muted">
                    {planMode
                      ? `From ${data.appliedPlan!.modelName}${data.appliedPlan!.isRevised ? " · Revised" : ""}`
                      : (model?.description ?? "Reusable monthly budget model")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-[var(--space-2)] text-[length:var(--font-size-table-figure)]">
                  {planMode ? (
                    <>
                      {locked && (
                        <button
                          className={buttonClass}
                          onClick={() => setConfirm({ kind: "unlock" })}
                        >
                          Unlock to revise past plan
                        </button>
                      )}
                      {data.appliedPlan!.sourceModelId &&
                        (data.appliedPlan!.isRevised ||
                          data.appliedPlan!.hasTemplateDiverged) && (
                          <button
                            disabled={pending}
                            className={buttonClass}
                            onClick={() =>
                              apply(data.appliedPlan!.sourceModelId!)
                            }
                          >
                            Re-apply template
                          </button>
                        )}
                      {!data.appliedPlan!.isRevised &&
                        !data.appliedPlan!.hasTemplateDiverged && (
                          <button className={buttonClass} disabled>
                            Active
                          </button>
                        )}
                    </>
                  ) : (
                    model && (
                      <>
                        <button
                          className={buttonClass}
                          disabled={pending}
                          onClick={() => setModal({ mode: "edit", model })}
                        >
                          Edit
                        </button>
                        <button
                          className={buttonClass}
                          disabled={pending}
                          onClick={() => setModal({ mode: "duplicate", model })}
                        >
                          Duplicate
                        </button>
                        <button
                          className={buttonClass}
                          disabled={
                            pending ||
                            (!!data.appliedPlan && model.badge === "ACTIVE")
                          }
                          onClick={() => apply(model.id)}
                        >
                          {!!data.appliedPlan && model.badge === "ACTIVE"
                            ? "Active"
                            : model.badge === "REVISED" ||
                                model.badge === "DIVERGED"
                              ? "Re-apply"
                              : "Make active"}
                        </button>
                        <button
                          className={buttonClass}
                          disabled={pending}
                          onClick={() => {
                            setError("");
                            setConfirm({ kind: "delete", id: model.id });
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>
              {error && !confirm && (
                <p
                  role="alert"
                  className="mb-[var(--space-3)] text-celia-status-red"
                >
                  {error}
                </p>
              )}
              <Editor
                key={planMode ? "plan" : model?.id}
                data={data}
                selected={selected}
                planMode={planMode}
                locked={locked}
                pending={pending}
                mutate={mutate}
                endpoint={
                  planMode
                    ? `/api/monthly-plans/${data.month}`
                    : `/api/models/${model!.id}`
                }
              />
            </>
          ) : (
            <p className="py-[calc(var(--space-3)*4)] text-center text-celia-muted">
              No budget models yet. Create a model to plan your income, expenses
              and savings.
            </p>
          )}
        </section>
      </div>
      {modal && (
        <ModelModal
          {...modal}
          models={data.models}
          onClose={() => setModal(null)}
          onSave={async (body) => {
            const result = await mutate(
              modal.mode === "new"
                ? "/api/models"
                : `/api/models/${modal.model!.id}${modal.mode === "duplicate" ? "/duplicate" : ""}`,
              modal.mode === "edit" ? "PATCH" : "POST",
              body,
            );
            if (result.error) return result.error;
            setModal(null);
            if (result.id) setSelection(result.id);
          }}
        />
      )}
      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.kind === "unlock"
            ? "Revise past plan"
            : confirm?.kind === "delete"
              ? "Delete budget model"
              : "Apply budget model"
        }
        confirmLabel={
          confirm?.kind === "unlock"
            ? "Unlock plan"
            : confirm?.kind === "delete"
              ? "Delete model"
              : "Apply model"
        }
        variant={confirm?.kind === "delete" ? "danger" : "default"}
        pending={pending}
        error={error}
        onCancel={() => {
          setConfirm(null);
          setError("");
        }}
        onConfirm={() => {
          if (confirm?.kind === "unlock") {
            setUnlocked(true);
            setConfirm(null);
          } else if (confirm?.kind === "apply") void performApply(confirm.id!);
          else if (confirm?.kind === "delete")
            void mutate(`/api/models/${confirm.id}`, "DELETE").then(
              (result) => {
                if (result.error) setError(result.error.message);
                else {
                  setConfirm(null);
                  setSelection(
                    data.appliedPlan
                      ? "plan"
                      : (data.models.find((m) => m.id !== confirm.id)?.id ??
                          ""),
                  );
                }
              },
            );
        }}
      >
        {confirm?.kind === "unlock"
          ? "Changes will revise this past month\u2019s saved plan."
          : confirm?.kind === "delete"
            ? "Delete this reusable model? Existing monthly plans will be preserved."
            : data.appliedPlan
              ? "This replaces the month\u2019s saved allocations and any revisions with the selected template."
              : "Apply this model to a past month?"}
      </ConfirmDialog>
      <Toast
        message={toast?.message ?? null}
        kind={toast?.kind}
        onDismiss={() => setToast(null)}
      />
    </>
  );
}
function Editor({
  data,
  selected,
  planMode,
  locked,
  pending,
  mutate,
  endpoint,
}: {
  data: ModelsViewData;
  selected: Pick<Model, "allocationsByCategory" | "allocationsByBucket">;
  planMode: boolean;
  locked: boolean;
  pending: boolean;
  mutate: Mutate;
  endpoint: string;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({}),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [saved, setSaved] = useState<
      Record<string, { value: string; centavos: number }>
    >({}),
    [previousSelection, setPreviousSelection] = useState(selected),
    [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
  const inFlight = useRef(new Set<string>());
  if (previousSelection !== selected) {
    setPreviousSelection(selected);
    const acknowledged = Object.entries(saved)
      .filter(([key, savedRow]) => {
        const [type, id] = key.split(":");
        return (
          ((type === "category"
            ? selected.allocationsByCategory
            : selected.allocationsByBucket)[id] ?? 0) === savedRow.centavos
        );
      })
      .map(([key]) => key);
    if (acknowledged.length) {
      setDrafts((current) =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([key, value]) =>
              !acknowledged.includes(key) || value !== saved[key].value,
          ),
        ),
      );
      setSaved((current) =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([key]) => !acknowledged.includes(key),
          ),
        ),
      );
    }
  }
  const categories = { ...selected.allocationsByCategory },
    buckets = { ...selected.allocationsByBucket };
  for (const [key, value] of Object.entries(drafts)) {
    const parsed = parseAndValidateNonNegativeAmount(value);
    if (parsed.ok) {
      const [type, id] = key.split(":");
      (type === "category" ? categories : buckets)[id] = parsed.centavos;
    }
  }
  const rows = calculateBudgetComparisonRows({
      categories: data.categories,
      buckets: data.buckets,
      plannedByCategory: categories,
      plannedByBucket: buckets,
      foldMergedCategories: planMode,
    }),
    effective = rows.filter((r) => !r.isFoldedIntoMergeTarget),
    values = (umbrella: string) =>
      effective
        .filter((r) => r.umbrella === umbrella)
        .map((r) => r.plannedCentavos),
    actual = (umbrella: string) =>
      effective
        .filter((r) => r.umbrella === umbrella)
        .reduce((n, r) => n + r.actualCentavos, 0),
    summary = calculateBudgetSummary({
      incomeAllocations: values("income"),
      expenseAllocations: values("expense"),
      savingsAllocations: values("savings"),
      actualIncomeCentavos: actual("income"),
      actualExpensesCentavos: actual("expense"),
      actualSavingsCentavos: actual("savings"),
    });
  function draft(row: BudgetComparisonRow, value: string) {
    const key = rowKey(row),
      parsed = parseAndValidateNonNegativeAmount(value);
    setDrafts((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: parsed.ok ? "" : parsed.error }));
  }
  async function commit(row: BudgetComparisonRow, override?: string) {
    const key = rowKey(row),
      value = override ?? drafts[key];
    if (value === undefined || locked || pending || inFlight.current.has(key))
      return;
    const parsed = parseAndValidateNonNegativeAmount(value);
    if (!parsed.ok) return;
    const base =
      (row.targetType === "category"
        ? selected.allocationsByCategory
        : selected.allocationsByBucket)[row.targetId] ?? 0;
    if (parsed.centavos === (saved[key]?.centavos ?? base)) return;
    inFlight.current.add(key);
    setSavingRows((current) => ({ ...current, [key]: true }));
    setSaved((current) => ({
      ...current,
      [key]: { value, centavos: parsed.centavos },
    }));
    const result = await mutate(
      endpoint,
      "PATCH",
      {
        targetType: row.targetType,
        targetId: row.targetId,
        amount: value,
      },
      true,
    );
    inFlight.current.delete(key);
    setSavingRows((current) => ({ ...current, [key]: false }));
    if (result.error) {
      setSaved((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setErrors((e) => ({ ...e, [key]: result.error!.message }));
    }
  }
  return (
    <>
      <IncomeAllocationBar summary={summary} />
      <div className="mt-[var(--space-3-5)] grid grid-cols-[var(--models-chart-columns)] gap-[var(--space-3-5)]">
        <ExpenseBreakdownDonut rows={rows} />
        <BudgetVsActualChart rows={rows} />
      </div>
      <ModelsTable
        rows={rows}
        summary={summary}
        planMode={planMode}
        drafts={drafts}
        errors={errors}
        pending={pending}
        savingRows={savingRows}
        locked={locked}
        onDraft={draft}
        onCommit={(r, v) => void commit(r, v)}
        onRevert={(r) => {
          const key = rowKey(r);
          setDrafts((d) => {
            const next = { ...d };
            if (saved[key]) next[key] = saved[key].value;
            else delete next[key];
            return next;
          });
          setErrors((e) => ({ ...e, [key]: "" }));
        }}
      />
    </>
  );
}

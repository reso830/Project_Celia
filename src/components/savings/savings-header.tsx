"use client";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shell/page-header";
import MonthPicker from "@/components/shell/month-picker";
// recreated manually: HF L23-L48 header tokens with month selection and New bucket per D1.
export default function SavingsHeader({
  month,
  onNew,
}: {
  month: string;
  onNew: () => void;
}) {
  const router = useRouter();
  return (
    <PageHeader
      title="Savings buckets"
      actions={
        <>
          <MonthPicker
            value={month}
            onChange={(m) => router.push(`/savings?month=${m}`)}
          />
          <button
            type="button"
            onClick={onNew}
            className="rounded-celia-control-compact bg-celia-accent px-[var(--space-4-5)] py-[var(--space-3)] text-[length:var(--font-size-body)] font-medium text-celia-surface"
          >
            + New bucket
          </button>
        </>
      }
    />
  );
}

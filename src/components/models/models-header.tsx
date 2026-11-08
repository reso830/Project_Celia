"use client";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shell/page-header";
import MonthPicker from "@/components/shell/month-picker";
// recreated manually: HF L23-L48 header tokens with month selection and New model per D5.
export default function ModelsHeader({
  month,
  onNew,
}: {
  month: string;
  onNew: () => void;
}) {
  const router = useRouter();
  return (
    <PageHeader
      title="Budget models"
      actions={
        <>
          <MonthPicker
            value={month}
            onChange={(m) => router.push(`/models?month=${m}`)}
          />
          <button
            className="rounded-celia-control-compact bg-celia-accent px-[var(--space-5)] py-[var(--space-3)] text-celia-surface"
            onClick={onNew}
          >
            + New model
          </button>
        </>
      }
    />
  );
}

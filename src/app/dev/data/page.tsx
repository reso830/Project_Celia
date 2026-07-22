import { notFound } from "next/navigation";
import { DevDataControls } from "./dev-data-controls";

export const dynamic = "force-dynamic";

export default function DevelopmentDataPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#eef0f3] px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-[720px]">
        <DevDataControls />
      </div>
    </main>
  );
}

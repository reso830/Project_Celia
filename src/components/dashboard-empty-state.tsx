import { AppHeader } from "@/components/app-header";

export function DashboardEmptyState() {
  return (
    <main className="min-h-screen bg-[#eef0f3] px-4 py-6 sm:px-6 lg:px-7">
      <div className="mx-auto w-full max-w-[1100px]">
        <AppHeader activePage="dashboard" />
        <section
          aria-labelledby="celia-title"
          className="flex min-h-[calc(100vh-9rem)] flex-col justify-center space-y-3"
        >
          <p className="text-sm font-medium text-slate-500">
            Expense tracking, made simple
          </p>
          <h1
            id="celia-title"
            className="text-4xl font-semibold tracking-tight text-slate-950"
          >
            Celia
          </h1>
          <p className="text-lg text-slate-700">No expenses yet</p>
          <p className="max-w-xl text-sm leading-6 text-slate-500">
            Your dashboard is ready for the budgeting tools you add next.
          </p>
        </section>
      </div>
    </main>
  );
}

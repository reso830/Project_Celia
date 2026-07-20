export function DashboardEmptyState() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12">
      <section aria-labelledby="celia-title" className="space-y-3">
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
    </main>
  );
}

import { AppHeader } from "@/components/app-header";

export function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#eef0f3] px-4 py-6 sm:px-6 lg:px-7 lg:pb-10">
      <div className="mx-auto w-full max-w-[1100px]">
        <AppHeader activePage="settings" />

        <section className="mt-6 space-y-6">
          <h1 className="text-2xl font-semibold text-[#16213f]">Settings</h1>

          <section aria-labelledby="buckets-heading">
            <h2
              id="buckets-heading"
              className="text-base font-bold text-[#16213f]"
            >
              Buckets
            </h2>
            <p className="mt-1 text-sm text-[#6b7686]">
              Organize your income and expenses into bucket groups.
            </p>
            <div className="mt-4 rounded-xl border border-[#d6dae1] bg-white p-5 text-sm text-[#8a93a3]">
              No buckets yet.
            </div>
          </section>

          <hr className="border-[#d6dae1]" />

          <section aria-labelledby="household-heading">
            <h2
              id="household-heading"
              className="text-base font-bold text-[#16213f]"
            >
              Household
            </h2>
            <p className="mt-1 text-sm text-[#6b7686]">
              Manage the members of your household.
            </p>
            <div className="mt-4 rounded-xl border border-[#d6dae1] bg-white p-5">
              <h3 className="text-sm font-semibold text-[#16213f]">
                Household Members
              </h3>
              <p className="mt-3 text-sm text-[#8a93a3]">
                No household members yet.
              </p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

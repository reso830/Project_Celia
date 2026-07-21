"use client";

import { AppHeader } from "@/components/app-header";
import { useData } from "@/data";

const columns = [
  "Date",
  "Member",
  "Bucket",
  "Description",
  "Amount",
  "Recurring",
];

export function TransactionsPage() {
  const state = useData();
  const members = state.status === "ready" ? state.members : [];
  const categories = state.status === "ready" ? state.categories : [];
  const transactions = state.status === "ready" ? state.transactions : [];

  function memberName(memberId: string): string {
    return (
      members.find((member) => member.id === memberId)?.name ??
      "Unknown member"
    );
  }

  function categoryName(categoryId: string): string {
    return (
      categories.find((category) => category.id === categoryId)?.group ??
      "Unknown bucket"
    );
  }

  return (
    <main className="min-h-screen bg-[#eef0f3] px-4 py-6 sm:px-6 lg:px-7">
      <div className="mx-auto w-full max-w-[1400px]">
        <AppHeader activePage="transactions" />
        <section aria-labelledby="transactions-title" className="mt-6">
          <h1
            className="text-3xl font-semibold tracking-tight text-[#16213f]"
            id="transactions-title"
          >
            Transactions
          </h1>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              className="rounded-lg border border-[#d6dae1] bg-white px-3 py-2 text-sm font-semibold text-[#16213f]"
              type="button"
            >
              Household (All)
            </button>
            <div
              aria-label="Transaction view"
              className="flex rounded-lg bg-[#e2e6eb] p-1"
            >
              <button
                aria-pressed="true"
                className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-[#12213d]"
                type="button"
              >
                List
              </button>
              <button
                aria-pressed="false"
                className="rounded-md px-3 py-1.5 text-sm font-semibold text-[#3a4459]"
                type="button"
              >
                Spreadsheet
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="min-w-[220px] flex-1 text-sm font-medium text-[#3a4459]">
              Search transactions
              <input
                aria-label="Search transactions"
                className="mt-1 w-full rounded-lg border border-[#d6dae1] bg-white px-3 py-2 text-[#16213f]"
                placeholder="Search descriptions"
                type="search"
              />
            </label>
            <label className="text-sm font-medium text-[#3a4459]">
              Transaction type
              <select
                aria-label="Transaction type"
                className="mt-1 block rounded-lg border border-[#d6dae1] bg-white px-3 py-2 text-[#16213f]"
                defaultValue="all"
              >
                <option value="all">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </label>
            <p className="pb-2 text-sm text-[#6b7686]">
              {transactions.length} transaction
              {transactions.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[#d6dae1] bg-white">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-[#f4f5f7] text-xs font-semibold uppercase tracking-wide text-[#6b7686]">
                <tr>
                  {columns.map((column) => (
                    <th className="px-4 py-3" key={column} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-12 text-center text-[#8a93a3]"
                      colSpan={columns.length}
                    >
                      No transactions match your filters.
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr
                      className="border-t border-[#e5e7eb]"
                      key={transaction.id}
                    >
                      <td className="px-4 py-3">{transaction.date}</td>
                      <td className="px-4 py-3">
                        {memberName(transaction.memberId)}
                      </td>
                      <td className="px-4 py-3">
                        {categoryName(transaction.categoryId)}
                      </td>
                      <td className="px-4 py-3">
                        {transaction.description || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {new Intl.NumberFormat("en-PH", {
                          style: "currency",
                          currency: "PHP",
                        }).format(transaction.amount / 100)}
                      </td>
                      <td className="px-4 py-3">
                        {transaction.recurring ? "Yes" : "No"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

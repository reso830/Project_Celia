import { Fragment } from "react";
import type { Transaction } from "@/domain";

const columns = [
  "Date",
  "Member",
  "Bucket",
  "Description",
  "Income",
  "Expense",
  "Recurring",
];

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

type TransactionSpreadsheetProps = {
  transactions: readonly Transaction[];
  memberName: (memberId: string) => string;
  bucketName: (categoryId: string) => string;
};

type TransactionMonthGroup = {
  key: string;
  label: string;
  transactions: readonly Transaction[];
  income: number;
  expense: number;
};

function formatAmount(amount: number): string {
  return currencyFormatter.format(amount / 100);
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);

  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1)));
}

export function groupTransactionsByMonth(
  transactions: readonly Transaction[],
): readonly TransactionMonthGroup[] {
  const groups = new Map<
    string,
    { transactions: Transaction[]; income: number; expense: number }
  >();

  for (const transaction of [...transactions].sort((a, b) =>
    b.date.localeCompare(a.date),
  )) {
    const key = transaction.date.slice(0, 7);
    const group = groups.get(key) ?? {
      transactions: [],
      income: 0,
      expense: 0,
    };

    group.transactions.push(transaction);
    if (transaction.type === "income") {
      group.income += transaction.amount;
    } else {
      group.expense += transaction.amount;
    }
    groups.set(key, group);
  }

  return [...groups].map(([key, group]) => ({
    key,
    label: monthLabel(key),
    ...group,
  }));
}

export function TransactionSpreadsheet({
  transactions,
  memberName,
  bucketName,
}: TransactionSpreadsheetProps) {
  const monthGroups = groupTransactionsByMonth(transactions);

  return (
    <table className="w-full min-w-[900px] border-collapse text-left text-sm">
      <thead className="bg-[#e9edf2] text-xs font-semibold uppercase tracking-wide text-[#526174]">
        <tr>
          {columns.map((column) => (
            <th
              className="border border-[#d6dae1] px-3 py-2.5"
              key={column}
              scope="col"
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {monthGroups.length === 0 ? (
          <tr>
            <td
              className="border border-[#d6dae1] px-4 py-12 text-center text-[#8a93a3]"
              colSpan={columns.length}
            >
              No transactions match your filters.
            </td>
          </tr>
        ) : (
          monthGroups.map((group) => (
            <Fragment key={group.key}>
              <tr className="bg-[#f4f5f7] text-[#16213f]">
                <th
                  className="border border-[#d6dae1] px-3 py-2.5 font-semibold"
                  colSpan={columns.length}
                  scope="row"
                >
                  {group.label}
                </th>
              </tr>
              {group.transactions.map((transaction) => (
                <tr className="bg-white" key={transaction.id}>
                  <td className="border border-[#d6dae1] px-3 py-2.5">
                    {transaction.date}
                  </td>
                  <td className="border border-[#d6dae1] px-3 py-2.5">
                    {memberName(transaction.memberId)}
                  </td>
                  <td className="border border-[#d6dae1] px-3 py-2.5">
                    {bucketName(transaction.categoryId)}
                  </td>
                  <td className="border border-[#d6dae1] px-3 py-2.5">
                    {transaction.description || "—"}
                  </td>
                  <td className="border border-[#d6dae1] px-3 py-2.5 text-right tabular-nums">
                    {transaction.type === "income"
                      ? formatAmount(transaction.amount)
                      : ""}
                  </td>
                  <td className="border border-[#d6dae1] px-3 py-2.5 text-right tabular-nums">
                    {transaction.type === "expense"
                      ? formatAmount(transaction.amount)
                      : ""}
                  </td>
                  <td className="border border-[#d6dae1] px-3 py-2.5">
                    {transaction.recurring ? "Yes" : "No"}
                  </td>
                </tr>
              ))}
              <tr className="bg-[#f7f9fb] font-semibold text-[#16213f]">
                <th
                  className="border border-[#d6dae1] px-3 py-2.5"
                  colSpan={4}
                  scope="row"
                >
                  Monthly total · Net{" "}
                  {formatAmount(group.income - group.expense)}
                </th>
                <td className="border border-[#d6dae1] px-3 py-2.5 text-right tabular-nums">
                  {formatAmount(group.income)}
                </td>
                <td className="border border-[#d6dae1] px-3 py-2.5 text-right tabular-nums">
                  {formatAmount(group.expense)}
                </td>
                <td className="border border-[#d6dae1] px-3 py-2.5" />
              </tr>
            </Fragment>
          ))
        )}
      </tbody>
    </table>
  );
}

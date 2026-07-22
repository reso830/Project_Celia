import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { Category, Member, Transaction } from "@/domain";

const columns = [
  "Date",
  "Member",
  "Bucket",
  "Description",
  "Income",
  "Expense",
  "Recurring",
  "Actions",
];

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

type EditableColumn =
  "date" | "memberId" | "categoryId" | "description" | "amount" | "recurring";

type ActiveCell = {
  transactionId: string;
  column: EditableColumn;
};

type TransactionSpreadsheetProps = {
  transactions: readonly Transaction[];
  memberName: (memberId: string) => string;
  bucketName: (categoryId: string) => string;
  members?: readonly Member[];
  categories?: readonly Category[];
  onSave?: (transaction: Transaction) => Promise<void>;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
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

function formatDraftAmount(amount: number): string {
  return (amount / 100).toFixed(2);
}

function parsePhpAmount(value: string): number | undefined {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    return undefined;
  }

  const [pesos, centavos = ""] = value.split(".");
  const amount = Number(pesos) * 100 + Number(centavos.padEnd(2, "0"));

  return Number.isSafeInteger(amount) && amount > 0 ? amount : undefined;
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

function cellKey(transactionId: string, column: EditableColumn): string {
  return transactionId + ":" + column;
}

function displayValue(
  transaction: Transaction,
  column: EditableColumn,
  memberName: (memberId: string) => string,
  bucketName: (categoryId: string) => string,
): string {
  switch (column) {
    case "date":
      return transaction.date;
    case "memberId":
      return memberName(transaction.memberId);
    case "categoryId":
      return bucketName(transaction.categoryId);
    case "description":
      return transaction.description || "—";
    case "amount":
      return formatAmount(transaction.amount);
    case "recurring":
      return transaction.recurring ? "Yes" : "No";
  }
}

export function TransactionSpreadsheet({
  transactions,
  memberName,
  bucketName,
  members = [],
  categories = [],
  onSave = async () => undefined,
  onEdit = () => undefined,
  onDelete = () => undefined,
}: TransactionSpreadsheetProps) {
  const monthGroups = useMemo(
    () => groupTransactionsByMonth(transactions),
    [transactions],
  );
  const [activeCell, setActiveCell] = useState<ActiveCell>();
  const [draft, setDraft] = useState<string | boolean>("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const displayRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const editorRef = useRef<HTMLElement | null>(null);

  const orderedTransactions = useMemo(
    () => monthGroups.flatMap((group) => group.transactions),
    [monthGroups],
  );

  useEffect(() => {
    editorRef.current?.focus();
  }, [activeCell]);

  function editableColumns(
    transaction: Transaction,
  ): readonly EditableColumn[] {
    return [
      "date",
      "memberId",
      "categoryId",
      "description",
      "amount",
      "recurring",
    ].filter(
      (column) =>
        column !== "amount" ||
        transaction.type === "income" ||
        transaction.type === "expense",
    ) as readonly EditableColumn[];
  }

  function startEditing(transaction: Transaction, column: EditableColumn) {
    setSaveError("");
    setActiveCell({ transactionId: transaction.id, column });
    setDraft(
      column === "amount"
        ? formatDraftAmount(transaction.amount)
        : column === "recurring"
          ? transaction.recurring
          : (transaction[column] ?? ""),
    );
  }

  function focusCell(transactionId: string, column: EditableColumn) {
    window.setTimeout(() => {
      displayRefs.current[cellKey(transactionId, column)]?.focus();
    });
  }

  function cancelEditing() {
    if (!activeCell) {
      return;
    }

    const { transactionId, column } = activeCell;
    setActiveCell(undefined);
    setSaveError("");
    focusCell(transactionId, column);
  }

  async function saveEditing(direction: "down" | "forward" | "backward") {
    if (!activeCell || isSaving) {
      return;
    }

    const transaction = transactions.find(
      ({ id }) => id === activeCell.transactionId,
    );
    if (!transaction) {
      return;
    }

    let updated: Transaction;
    if (activeCell.column === "amount") {
      const amount = parsePhpAmount(String(draft));
      if (!amount) {
        setSaveError("Enter a positive amount with up to two decimal places.");
        return;
      }
      updated = { ...transaction, amount };
    } else if (activeCell.column === "description") {
      updated = {
        ...transaction,
        description: String(draft).trim() || undefined,
      };
    } else {
      updated = { ...transaction, [activeCell.column]: draft } as Transaction;
    }

    setIsSaving(true);
    setSaveError("");
    try {
      await onSave(updated);
      const sourceIndex = orderedTransactions.findIndex(
        ({ id }) => id === transaction.id,
      );
      const columnsForRow = editableColumns(transaction);
      const columnIndex = columnsForRow.indexOf(activeCell.column);
      let target: ActiveCell | undefined;

      if (direction === "down") {
        const next = orderedTransactions[sourceIndex + 1];
        if (next)
          target = { transactionId: next.id, column: activeCell.column };
      } else {
        const flattened = orderedTransactions.flatMap((entry) =>
          editableColumns(entry).map((column) => ({
            transactionId: entry.id,
            column,
          })),
        );
        const index = flattened.findIndex(
          (entry) =>
            entry.transactionId === transaction.id &&
            entry.column === activeCell.column,
        );
        target = flattened[index + (direction === "forward" ? 1 : -1)];
      }

      setActiveCell(undefined);
      if (target) {
        focusCell(target.transactionId, target.column);
      } else {
        focusCell(transaction.id, columnsForRow[columnIndex]);
      }
    } catch {
      setSaveError("Unable to save this cell. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditorKeyDown(
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    } else if (event.key === "Enter") {
      event.preventDefault();
      void saveEditing("down");
    } else if (event.key === "Tab") {
      event.preventDefault();
      void saveEditing(event.shiftKey ? "backward" : "forward");
    }
  }

  function renderCell(transaction: Transaction, column: EditableColumn) {
    const active =
      activeCell?.transactionId === transaction.id &&
      activeCell.column === column;
    const label =
      (column === "memberId"
        ? "Member"
        : column === "categoryId"
          ? "Bucket"
          : column === "amount"
            ? transaction.type === "income"
              ? "Income"
              : "Expense"
            : column[0].toUpperCase() + column.slice(1)) +
      ": " +
      displayValue(transaction, column, memberName, bucketName);
    const baseClass =
      "w-full rounded px-1 text-left outline-offset-2 focus:outline focus:outline-2 focus:outline-[#2463eb]";

    if (!active) {
      return (
        <button
          aria-label={label}
          className={baseClass}
          onDoubleClick={() => startEditing(transaction, column)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              startEditing(transaction, column);
            }
          }}
          ref={(element) => {
            displayRefs.current[cellKey(transaction.id, column)] = element;
          }}
          type="button"
        >
          {displayValue(transaction, column, memberName, bucketName)}
        </button>
      );
    }

    const editorClass =
      "w-full rounded border border-[#2463eb] bg-white px-2 py-1 text-[#16213f]";
    const editorProps = {
      "aria-label": label.split(":")[0],
      className: editorClass,
      disabled: isSaving,
      onKeyDown: handleEditorKeyDown,
    };

    if (column === "date") {
      return (
        <input
          {...editorProps}
          onChange={(event) => setDraft(event.target.value)}
          ref={(element) => {
            editorRef.current = element;
          }}
          type="date"
          value={String(draft)}
        />
      );
    }
    if (column === "memberId") {
      return (
        <select
          {...editorProps}
          onChange={(event) => setDraft(event.target.value)}
          ref={(element) => {
            editorRef.current = element;
          }}
          value={String(draft)}
        >
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      );
    }
    if (column === "categoryId") {
      return (
        <select
          {...editorProps}
          onChange={(event) => setDraft(event.target.value)}
          ref={(element) => {
            editorRef.current = element;
          }}
          value={String(draft)}
        >
          {categories
            .filter((category) => category.type === transaction.type)
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.group}
              </option>
            ))}
        </select>
      );
    }
    if (column === "recurring") {
      return (
        <input
          aria-label="Recurring"
          checked={Boolean(draft)}
          className="h-4 w-4"
          disabled={isSaving}
          onChange={(event) => setDraft(event.target.checked)}
          onKeyDown={handleEditorKeyDown}
          ref={(element) => {
            editorRef.current = element;
          }}
          type="checkbox"
        />
      );
    }
    return (
      <input
        {...editorProps}
        inputMode={column === "amount" ? "decimal" : undefined}
        onChange={(event) => setDraft(event.target.value)}
        ref={(element) => {
          editorRef.current = element;
        }}
        value={String(draft)}
      />
    );
  }

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
                    {renderCell(transaction, "date")}
                  </td>
                  <td className="border border-[#d6dae1] px-3 py-2.5">
                    {renderCell(transaction, "memberId")}
                  </td>
                  <td className="border border-[#d6dae1] px-3 py-2.5">
                    {renderCell(transaction, "categoryId")}
                  </td>
                  <td className="border border-[#d6dae1] px-3 py-2.5">
                    {renderCell(transaction, "description")}
                  </td>
                  <td className="border border-[#d6dae1] px-3 py-2.5 text-right tabular-nums">
                    {transaction.type === "income"
                      ? renderCell(transaction, "amount")
                      : ""}
                  </td>
                  <td className="border border-[#d6dae1] px-3 py-2.5 text-right tabular-nums">
                    {transaction.type === "expense"
                      ? renderCell(transaction, "amount")
                      : ""}
                  </td>
                  <td className="border border-[#d6dae1] px-3 py-2.5">
                    {renderCell(transaction, "recurring")}
                  </td>
                  <td className="border border-[#d6dae1] px-3 py-2.5">
                    <div className="flex gap-2">
                      <button
                        aria-label={
                          "Edit " +
                          (transaction.description ||
                            bucketName(transaction.categoryId))
                        }
                        className="font-semibold text-[#16213f]"
                        onClick={() => onEdit(transaction)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        aria-label={
                          "Delete " +
                          (transaction.description ||
                            bucketName(transaction.categoryId))
                        }
                        className="font-semibold text-[#b42318]"
                        onClick={() => onDelete(transaction)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                    {activeCell?.transactionId === transaction.id &&
                    saveError ? (
                      <p className="mt-1 text-xs text-[#b42318]" role="alert">
                        {saveError}
                      </p>
                    ) : null}
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
                <td className="border border-[#d6dae1] px-3 py-2.5" />
              </tr>
            </Fragment>
          ))
        )}
      </tbody>
    </table>
  );
}

"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { AppHeader } from "@/components/app-header";
import { TransactionSpreadsheet } from "@/components/transaction-spreadsheet";
import { useData } from "@/data";
import { createTransaction, type CategoryType } from "@/domain";

const columns = [
  "Date",
  "Member",
  "Bucket",
  "Description",
  "Amount",
  "Recurring",
];

type FormErrors = Partial<
  Record<"date" | "member" | "bucket" | "subcategory" | "amount", string>
>;

type TransactionView = "list" | "spreadsheet";

function today(): string {
  return new Date().toLocaleDateString("en-CA");
}

function parsePhpAmount(value: string): number | undefined {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    return undefined;
  }

  const [pesos, centavos = ""] = value.split(".");
  const amount = Number(pesos) * 100 + Number(centavos.padEnd(2, "0"));

  return Number.isSafeInteger(amount) && amount > 0 ? amount : undefined;
}

export function TransactionsPage() {
  const state = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [view, setView] = useState<TransactionView>("list");
  const [date, setDate] = useState(today);
  const [memberId, setMemberId] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [bucket, setBucket] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isSavingRef = useRef(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const members = state.status === "ready" ? state.members : [];
  const categories = state.status === "ready" ? state.categories : [];
  const transactions = state.status === "ready" ? state.transactions : [];
  const typedCategories = categories.filter(
    (category) => category.type === type,
  );
  const buckets = [
    ...new Set(typedCategories.map((category) => category.group)),
  ];
  const subcategories = typedCategories.filter(
    (category) => category.group === bucket,
  );
  const setupError =
    members.length === 0
      ? "Add a household member in Settings before creating a transaction."
      : typedCategories.length === 0
        ? `Add an ${type} category in Settings before creating a transaction.`
        : undefined;

  function resetForm() {
    setDate(today());
    setMemberId("");
    setType("expense");
    setBucket("");
    setCategoryId("");
    setAmount("");
    setNotes("");
    setRecurring(false);
    setErrors({});
    setSubmitError("");
  }

  function openDialog() {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    resetForm();
    setIsDialogOpen(true);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    resetForm();
  }

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    dateInputRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, [isDialogOpen]);

  function trapDialogFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
    );
    if (!focusable?.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function saveTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingRef.current) {
      return;
    }

    const parsedAmount = parsePhpAmount(amount);
    const nextErrors: FormErrors = {};

    if (!date) nextErrors.date = "Date is required.";
    if (!memberId) nextErrors.member = "Member is required.";
    if (!bucket) nextErrors.bucket = "Bucket is required.";
    if (!categoryId) nextErrors.subcategory = "Subcategory is required.";
    if (!parsedAmount) nextErrors.amount = "Amount is required.";

    setErrors(nextErrors);
    setSubmitError("");

    if (
      !parsedAmount ||
      Object.keys(nextErrors).length > 0 ||
      setupError ||
      state.status !== "ready"
    ) {
      return;
    }

    const category = subcategories.find((entry) => entry.id === categoryId);
    if (!category) {
      setErrors({ subcategory: "Subcategory is required." });
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await state.saveTransaction(
        createTransaction({
          id: crypto.randomUUID(),
          date,
          memberId,
          categoryId: category.id,
          type,
          amount: parsedAmount,
          description: notes.trim() || undefined,
          recurring,
        }),
      );
      closeDialog();
    } catch {
      setSubmitError("Unable to save this transaction. Please try again.");
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  function memberName(memberId: string): string {
    return (
      members.find((member) => member.id === memberId)?.name ?? "Unknown member"
    );
  }

  function bucketName(categoryId: string): string {
    return (
      categories.find((category) => category.id === categoryId)?.group ??
      "Unknown bucket"
    );
  }

  return (
    <main className="min-h-screen bg-[#eef0f3] px-4 py-6 sm:px-6 lg:px-7">
      <div className="mx-auto w-full max-w-[1400px]">
        <AppHeader activePage="transactions" onAddTransaction={openDialog} />
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
                aria-pressed={view === "list"}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  view === "list" ? "bg-white text-[#12213d]" : "text-[#3a4459]"
                }`}
                onClick={() => setView("list")}
                type="button"
              >
                List
              </button>
              <button
                aria-pressed={view === "spreadsheet"}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  view === "spreadsheet"
                    ? "bg-white text-[#12213d]"
                    : "text-[#3a4459]"
                }`}
                onClick={() => setView("spreadsheet")}
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
          {view === "spreadsheet" ? (
            <div
              className="mt-4 overflow-x-auto rounded-xl border border-[#d6dae1] bg-white"
              data-testid="transaction-spreadsheet-scroll"
            >
              <TransactionSpreadsheet
                bucketName={bucketName}
                memberName={memberName}
                transactions={transactions}
              />
            </div>
          ) : (
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
                          {bucketName(transaction.categoryId)}
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
          )}
        </section>
        {isDialogOpen ? (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-[#12213d]/40 p-4">
            <div
              aria-labelledby="add-transaction-title"
              aria-modal="true"
              className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl"
              onKeyDown={trapDialogFocus}
              ref={dialogRef}
              role="dialog"
            >
              <div className="flex items-center justify-between gap-4">
                <h2
                  className="text-xl font-semibold text-[#16213f]"
                  id="add-transaction-title"
                >
                  Add Transaction
                </h2>
                <button
                  aria-label="Close"
                  className="text-[#3a4459]"
                  onClick={closeDialog}
                  type="button"
                >
                  ×
                </button>
              </div>
              <form className="mt-5 space-y-4" onSubmit={saveTransaction}>
                {setupError ? (
                  <p className="rounded-lg bg-[#fff4e5] p-3 text-sm text-[#7a4b00]">
                    {setupError}
                  </p>
                ) : null}
                {submitError ? (
                  <p className="rounded-lg bg-[#fef2f2] p-3 text-sm text-[#b42318]">
                    {submitError}
                  </p>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-[#3a4459]">
                    Date
                    <input
                      className="mt-1 w-full rounded-lg border border-[#d6dae1] px-3 py-2"
                      onChange={(event) => setDate(event.target.value)}
                      ref={dateInputRef}
                      type="date"
                      value={date}
                    />
                    {errors.date ? (
                      <span className="mt-1 block text-sm text-[#b42318]">
                        {errors.date}
                      </span>
                    ) : null}
                  </label>
                  <label className="text-sm font-medium text-[#3a4459]">
                    Member
                    <select
                      className="mt-1 w-full rounded-lg border border-[#d6dae1] px-3 py-2"
                      onChange={(event) => setMemberId(event.target.value)}
                      value={memberId}
                    >
                      <option value="">Select member</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                    {errors.member ? (
                      <span className="mt-1 block text-sm text-[#b42318]">
                        {errors.member}
                      </span>
                    ) : null}
                  </label>
                  <label className="text-sm font-medium text-[#3a4459]">
                    Income / Expense
                    <select
                      className="mt-1 w-full rounded-lg border border-[#d6dae1] px-3 py-2"
                      onChange={(event) => {
                        setType(event.target.value as CategoryType);
                        setBucket("");
                        setCategoryId("");
                      }}
                      value={type}
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-[#3a4459]">
                    Bucket
                    <select
                      className="mt-1 w-full rounded-lg border border-[#d6dae1] px-3 py-2"
                      onChange={(event) => {
                        setBucket(event.target.value);
                        setCategoryId("");
                      }}
                      value={bucket}
                    >
                      <option value="">Select bucket</option>
                      {buckets.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                    {errors.bucket ? (
                      <span className="mt-1 block text-sm text-[#b42318]">
                        {errors.bucket}
                      </span>
                    ) : null}
                  </label>
                  <label className="text-sm font-medium text-[#3a4459]">
                    Subcategory
                    <select
                      className="mt-1 w-full rounded-lg border border-[#d6dae1] px-3 py-2 disabled:bg-[#f4f5f7]"
                      disabled={!bucket}
                      onChange={(event) => setCategoryId(event.target.value)}
                      value={categoryId}
                    >
                      <option value="">Select subcategory</option>
                      {subcategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {errors.subcategory ? (
                      <span className="mt-1 block text-sm text-[#b42318]">
                        {errors.subcategory}
                      </span>
                    ) : null}
                  </label>
                  <label className="text-sm font-medium text-[#3a4459]">
                    Amount
                    <input
                      className="mt-1 w-full rounded-lg border border-[#d6dae1] px-3 py-2"
                      inputMode="decimal"
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="0.00"
                      value={amount}
                    />
                    {errors.amount ? (
                      <span className="mt-1 block text-sm text-[#b42318]">
                        {errors.amount}
                      </span>
                    ) : null}
                  </label>
                </div>
                <label className="block text-sm font-medium text-[#3a4459]">
                  Notes
                  <textarea
                    className="mt-1 w-full rounded-lg border border-[#d6dae1] px-3 py-2"
                    onChange={(event) => setNotes(event.target.value)}
                    value={notes}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-[#3a4459]">
                  <input
                    checked={recurring}
                    onChange={(event) => setRecurring(event.target.checked)}
                    type="checkbox"
                  />
                  Recurring
                </label>
                <div className="flex justify-end gap-3">
                  <button
                    className="rounded-lg border border-[#d6dae1] px-3 py-2 text-sm font-semibold text-[#3a4459]"
                    onClick={closeDialog}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-lg bg-[#12213d] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    disabled={Boolean(setupError) || isSaving}
                    type="submit"
                  >
                    Save transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

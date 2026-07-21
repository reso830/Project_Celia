"use client";

import { type FormEvent, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { createCategory, type CategoryType } from "@/domain";
import { createMember, type Member } from "@/domain/member";
import { useData, useDataActions } from "@/data";

const memberColors = ["#2463eb", "#9333ea", "#db2777", "#0f766e"];

function createMemberId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `member-${Date.now()}`;
}

function hasMatchingName(members: readonly Member[], name: string): boolean {
  return members.some(
    (member) => member.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
  );
}

function nextMemberColor(members: readonly Member[]): string {
  return (
    memberColors.find(
      (color) => !members.some((member) => member.color === color),
    ) ?? memberColors[members.length % memberColors.length]
  );
}

export function SettingsPage() {
  const data = useData();
  const { deleteMember: removeMember, saveMember } = useDataActions();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [bucketError, setBucketError] = useState("");
  const members = data.status === "ready" ? data.members : [];
  const categories = data.status === "ready" ? data.categories : [];
  const groups = Array.from(
    new Map(
      categories.map((category) => [
        `${category.type}:${category.group.trim().toLocaleLowerCase()}`,
        category,
      ]),
    ).values(),
  );

  async function addBucket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const group = groupName.trim();
    const categoryName = subcategory.trim();

    if (!group || !categoryName) {
      setBucketError("Group name and first subcategory are required.");
      return;
    }

    const duplicate = categories.find(
      (category) =>
        category.type === type &&
        category.group.trim().toLocaleLowerCase() === group.toLocaleLowerCase(),
    );

    if (duplicate) {
      setBucketError(
        `An ${type} bucket named ${duplicate.group.trim()} already exists.`,
      );
      return;
    }

    if (data.status !== "ready") {
      return;
    }

    try {
      await data.saveCategory(
        createCategory({
          id: crypto.randomUUID(),
          type,
          group,
          name: categoryName,
        }),
      );
      setGroupName("");
      setSubcategory("");
      setBucketError("");
    } catch {
      setBucketError("Unable to save this bucket. Please try again.");
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();

    if (!normalizedName) {
      setError("Enter a household member name.");
      return;
    }

    if (hasMatchingName(members, normalizedName)) {
      setError("That household member already exists.");
      return;
    }

    if (data.status !== "ready") {
      return;
    }

    const member = createMember({
      id: createMemberId(),
      name: normalizedName,
      color: nextMemberColor(members),
    });

    setIsSaving(true);
    setError(undefined);
    try {
      await saveMember(member);
      setName("");
    } catch {
      setError("Unable to save this household member. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteMember(member: Member) {
    if (data.status !== "ready") {
      return;
    }

    setError(undefined);
    try {
      await removeMember(member.id);
    } catch {
      setError("Unable to delete this household member. Please try again.");
    }
  }

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
            <form
              className="mt-4 rounded-xl border border-[#d6dae1] bg-white p-5"
              onSubmit={addBucket}
            >
              <h3 className="text-sm font-semibold text-[#16213f]">
                Add bucket
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <label className="grid gap-1 text-sm font-medium text-[#16213f]">
                  Group name
                  <input
                    className="rounded-md border border-[#b7bfca] px-3 py-2"
                    onChange={(event) => setGroupName(event.target.value)}
                    value={groupName}
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-[#16213f]">
                  First subcategory
                  <input
                    className="rounded-md border border-[#b7bfca] px-3 py-2"
                    onChange={(event) => setSubcategory(event.target.value)}
                    value={subcategory}
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-[#16213f]">
                  Type
                  <select
                    className="rounded-md border border-[#b7bfca] px-3 py-2"
                    onChange={(event) =>
                      setType(event.target.value as CategoryType)
                    }
                    value={type}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </label>
              </div>
              {bucketError ? (
                <p className="mt-3 text-sm text-red-700" role="alert">
                  {bucketError}
                </p>
              ) : null}
              <button
                className="mt-4 rounded-md bg-[#16213f] px-4 py-2 text-sm font-semibold text-white"
                type="submit"
              >
                Add bucket
              </button>
            </form>
            {groups.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {groups.map((category) => (
                  <article
                    className="rounded-xl border border-[#d6dae1] bg-white p-5"
                    key={`${category.type}:${category.group.trim().toLocaleLowerCase()}`}
                  >
                    <h3 className="text-sm font-semibold text-[#16213f]">
                      {category.group.trim()}
                    </h3>
                    <p className="mt-1 text-sm text-[#6b7686]">
                      {category.type === "expense" ? "Expense" : "Income"}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-[#d6dae1] bg-white p-5 text-sm text-[#8a93a3]">
                No buckets yet.
              </div>
            )}
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
              <form
                className="mt-4 flex flex-col gap-3 sm:flex-row"
                onSubmit={addMember}
              >
                <label className="sr-only" htmlFor="member-name">
                  Member name
                </label>
                <input
                  id="member-name"
                  className="min-w-0 flex-1 rounded-lg border border-[#b9c1cd] px-3 py-2 text-sm text-[#16213f] outline-none focus:border-[#2463eb] focus:ring-2 focus:ring-[#2463eb]/20"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Member name"
                  disabled={isSaving}
                />
                <button
                  className="rounded-lg bg-[#2463eb] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  disabled={isSaving}
                >
                  Add member
                </button>
              </form>
              {error ? (
                <p className="mt-3 text-sm text-[#b42318]" role="alert">
                  {error}
                </p>
              ) : null}
              {members.length === 0 ? (
                <p className="mt-3 text-sm text-[#8a93a3]">
                  No household members yet.
                </p>
              ) : (
                <ul
                  className="mt-4 divide-y divide-[#e4e7ec]"
                  aria-label="Household members"
                >
                  {members.map((member) => (
                    <li
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      key={member.id}
                    >
                      <span className="flex items-center gap-3 text-sm font-medium text-[#16213f]">
                        <span
                          aria-hidden="true"
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: member.color }}
                        />
                        {member.name}
                      </span>
                      <button
                        className="text-sm font-medium text-[#b42318] hover:underline"
                        type="button"
                        onClick={() => void deleteMember(member)}
                      >
                        Delete {member.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

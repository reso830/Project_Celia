import { describe, expect, it } from "vitest";
import {
  calculateMemberSummary,
  calculateTotals,
  filterEntries,
  sortEntries,
} from "@/domain/entry-calculations";

const entries = [
  {
    id: "b",
    itemId: "i",
    ownerMemberId: null,
    amount: 105,
    date: "2026-09-02",
    note: "Market",
    createdAt: "2026-01-02T00:00:00Z",
    updatedAt: "",
    type: "expense" as const,
    itemName: "Food",
    categoryId: "c",
    categoryName: "Groceries",
    categoryColor: "#000000" as never,
    categoryArchived: false,
    ownerName: "Household",
    isHousehold: true,
    ownerArchived: false,
  },
  {
    id: "miguel",
    itemId: "i",
    ownerMemberId: "miguel",
    amount: 999,
    date: "2026-09-03",
    note: null,
    createdAt: "2026-01-03T00:00:00Z",
    updatedAt: "",
    type: "expense" as const,
    itemName: "Fuel",
    categoryId: "c",
    categoryName: "Groceries",
    categoryColor: "#000000" as never,
    categoryArchived: false,
    ownerName: "Miguel",
    isHousehold: false,
    ownerArchived: false,
  },
  {
    id: "a",
    itemId: "i",
    ownerMemberId: "ana",
    amount: 200,
    date: "2026-09-02",
    note: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "",
    type: "income" as const,
    itemName: "Salary",
    categoryId: "c2",
    categoryName: "Work",
    categoryColor: "#000000" as never,
    categoryArchived: false,
    ownerName: "Ana",
    isHousehold: false,
    ownerArchived: false,
  },
];
describe("entry calculations", () => {
  it("filters member entries with household entries and totals exact cents", () => {
    const filtered = filterEntries(entries, {
      monthKey: "2026-09",
      ownerId: "ana",
      search: "",
    });
    expect(filtered).toHaveLength(2);
    expect(calculateTotals(filtered)).toMatchObject({
      incomeCentavos: 200,
      expenseCentavos: 105,
      netCentavos: 95,
    });
  });
  it("sorts equal primary keys by newest creation then id", () =>
    expect(
      sortEntries(entries, "date", "desc").map((entry) => entry.id),
    ).toEqual(["miguel", "b", "a"]));
  it("combines type category and case-insensitive text filters", () =>
    expect(
      filterEntries(entries, {
        monthKey: "2026-09",
        type: "expense",
        categoryId: "c",
        search: "market",
      }).map((entry) => entry.id),
    ).toEqual(["b"]));
  it("splits member and shared totals", () =>
    expect(calculateMemberSummary(entries, "ana")).toMatchObject({
      count: 3,
      incomeCentavos: 200,
      expenseCentavos: 105,
      netCentavos: 95,
      ownIncomeCentavos: 200,
      ownExpenseCentavos: 0,
      ownNetCentavos: 200,
      sharedIncomeCentavos: 0,
      sharedExpenseCentavos: 105,
      sharedNetCentavos: -105,
    }));
  it("sorts amounts ascending and resolves equal creation by id", () =>
    expect(
      sortEntries(
        [
          { ...entries[0], id: "z", amount: 200, createdAt: "x" },
          { ...entries[1], id: "a", amount: 200, createdAt: "x" },
        ],
        "amount",
        "asc",
      ).map((entry) => entry.id),
    ).toEqual(["a", "z"]));
});

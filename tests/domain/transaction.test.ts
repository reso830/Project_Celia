import { describe, expect, it } from "vitest";
import {
  DomainValidationError,
  createTransaction,
} from "../../src/domain/index.js";

const income = {
  id: "transaction-salary",
  date: "2026-07-15",
  memberId: "member-alex",
  categoryId: "category-salary",
  type: "income" as const,
  amount: 125_000,
  description: "Salary",
  recurring: true,
};

describe("transactions", () => {
  it("creates an income transaction with a positive PHP minor-unit amount", () => {
    expect(createTransaction(income)).toEqual({ ...income, currency: "PHP" });
  });

  it("creates an expense transaction without a negative amount", () => {
    expect(
      createTransaction({
        id: "transaction-rent",
        date: "2026-07-01",
        memberId: "member-alex",
        categoryId: "category-rent",
        type: "expense",
        amount: 35_000,
        description: "July rent",
        recurring: true,
      }),
    ).toMatchObject({ type: "expense", amount: 35_000, currency: "PHP" });
  });

  it.each([
    0,
    -1,
    12.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])("rejects invalid minor-unit amount %s", (amount) =>
    expect(() => createTransaction({ ...income, amount })).toThrow(
      DomainValidationError,
    ),
  );

  it.each(["2026-2-01", "2026-02-30", "2026/02/01"])(
    "rejects non-ISO or impossible date %s",
    (date) =>
      expect(() => createTransaction({ ...income, date })).toThrow(
        DomainValidationError,
      ),
  );
});

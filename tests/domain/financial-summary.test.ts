import { describe, expect, it } from "vitest";
import { calculateFinancialSummary, type Transaction } from "@/domain";

const income: Transaction = {
  id: "salary",
  date: "2026-07-01",
  memberId: "alex",
  categoryId: "salary",
  type: "income",
  amount: 500_000,
  recurring: false,
  currency: "PHP",
};

const expense: Transaction = {
  id: "groceries",
  date: "2026-07-02",
  memberId: "alex",
  categoryId: "food",
  type: "expense",
  amount: 125_000,
  recurring: false,
  currency: "PHP",
};

describe("calculateFinancialSummary", () => {
  it("derives income, positive expenses, net, and savings rate", () => {
    expect(calculateFinancialSummary([income, expense])).toEqual({
      income: 500_000,
      expenses: 125_000,
      net: 375_000,
      savingsRate: 75,
    });
  });

  it("returns zero savings rate when there is no income", () => {
    expect(calculateFinancialSummary([expense])).toEqual({
      income: 0,
      expenses: 125_000,
      net: -125_000,
      savingsRate: 0,
    });
  });

  it("returns zero values for no transactions", () => {
    expect(calculateFinancialSummary([])).toEqual({
      income: 0,
      expenses: 0,
      net: 0,
      savingsRate: 0,
    });
  });
});

import { describe, expect, it } from "vitest";
import { createDummyDataset } from "@/data/dummy-data";

describe("createDummyDataset", () => {
  it("returns the same dataset for a fixed reference date", () => {
    expect(createDummyDataset({ referenceDate: "2026-07-22" })).toEqual(
      createDummyDataset({ referenceDate: "2026-07-22" }),
    );
  });

  it("creates valid records across seven months", () => {
    const dataset = createDummyDataset({ referenceDate: "2026-07-22" });
    const memberIds = new Set(dataset.members.map(({ id }) => id));
    const categoryIds = new Set(dataset.categories.map(({ id }) => id));

    expect(dataset.members.map(({ name }) => name)).toEqual(["Alex", "Sam"]);
    expect(dataset.transactions.length).toBeGreaterThanOrEqual(80);
    expect(dataset.transactions.length).toBeLessThanOrEqual(120);
    expect(dataset.transactions.map(({ date }) => date)).toEqual(
      expect.arrayContaining(["2026-01-01", "2026-07-01"]),
    );
    expect(
      dataset.transactions.every(({ memberId }) => memberIds.has(memberId)),
    ).toBe(true);
    expect(
      dataset.transactions.every(({ categoryId }) =>
        categoryIds.has(categoryId),
      ),
    ).toBe(true);
    expect(
      dataset.transactions.every(
        ({ amount }) => Number.isSafeInteger(amount) && amount > 0,
      ),
    ).toBe(true);
    expect(dataset.transactions.some(({ recurring }) => recurring)).toBe(true);
    expect(dataset.transactions.some(({ recurring }) => !recurring)).toBe(true);
  });

  it("derives every transaction month from its reference date", () => {
    const dataset = createDummyDataset({ referenceDate: "2024-02-01" });

    expect(dataset.transactions.map(({ date }) => date)).toEqual(
      expect.arrayContaining(["2023-08-01", "2024-02-01"]),
    );
    expect(
      dataset.transactions.every(
        ({ date }) => date >= "2023-08-01" && date <= "2024-02-01",
      ),
    ).toBe(true);
  });

  it("omits current-month transactions scheduled after the reference day", () => {
    const transactions = createDummyDataset({
      referenceDate: "2026-07-03",
    }).transactions.filter(({ date }) => date.startsWith("2026-07-"));

    expect(transactions.map(({ date }) => date)).not.toContain("2026-07-03");
    expect(transactions).toHaveLength(3);
  });
});

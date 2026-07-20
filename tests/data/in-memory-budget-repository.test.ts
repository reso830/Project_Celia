import { InMemoryBudgetRepository } from "@/data/in-memory-budget-repository";
import type { Transaction } from "@/domain/transaction";

const rent: Transaction = {
  id: "rent",
  description: "Rent",
  category: "Housing",
  amountMinor: -2500000,
  currency: "TWD",
  occurredOn: "2026-07-01",
};

describe("InMemoryBudgetRepository", () => {
  it("starts empty without seed data", async () => {
    await expect(
      new InMemoryBudgetRepository().listTransactions(),
    ).resolves.toEqual([]);
  });

  it("returns a saved transaction", async () => {
    const repository = new InMemoryBudgetRepository();

    await repository.saveTransaction(rent);

    await expect(repository.listTransactions()).resolves.toEqual([rent]);
  });
});

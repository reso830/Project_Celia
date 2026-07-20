import { InMemoryBudgetRepository } from "@/data/in-memory-budget-repository";
import type { Transaction } from "@/domain/transaction";

const rent: Transaction = {
  id: "rent",
  date: "2026-07-01",
  memberId: "member-alex",
  categoryId: "category-rent",
  type: "expense",
  description: "Rent",
  amount: 2500000,
  recurring: true,
  currency: "PHP",
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

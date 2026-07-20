import type { Transaction } from "@/domain/transaction";
import type { BudgetRepository } from "./budget-repository";

export class InMemoryBudgetRepository implements BudgetRepository {
  private readonly transactions: Transaction[];

  constructor(seedTransactions: readonly Transaction[] = []) {
    this.transactions = [...seedTransactions];
  }

  async listTransactions(): Promise<readonly Transaction[]> {
    return [...this.transactions];
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    this.transactions.push(transaction);
  }
}

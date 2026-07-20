import type { Transaction } from "@/domain/transaction";

export interface BudgetRepository {
  listTransactions(): Promise<readonly Transaction[]>;
  saveTransaction(transaction: Transaction): Promise<void>;
}

import type { Transaction } from "@/domain/transaction";

export interface TransactionRepository {
  get(id: string): Promise<Transaction | undefined>;
  list(): Promise<readonly Transaction[]>;
  save(transaction: Transaction): Promise<void>;
  delete(id: string): Promise<void>;
}

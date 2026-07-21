import type { Transaction } from "@/domain/transaction";
import { CELIA_STORES } from "./celia-database";
import {
  type DatabaseOpener,
  IndexedDbRepository,
} from "./indexed-db-repository";
import type { TransactionRepository } from "./transaction-repository";

export class IndexedDbTransactionRepository
  extends IndexedDbRepository<Transaction>
  implements TransactionRepository
{
  constructor(databaseOpener?: DatabaseOpener) {
    super(CELIA_STORES.transactions, databaseOpener);
  }
}

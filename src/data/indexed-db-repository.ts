import { openCeliaDatabase } from "./celia-database";

export type DatabaseOpener = () => Promise<IDBDatabase>;

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(
        transaction.error ?? new Error("IndexedDB transaction was aborted."),
      );
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
  });
}

/**
 * Base implementation for object stores whose records use a string key.
 * Each method opens and closes its own database connection so callers do not
 * need to manage IndexedDB lifecycle details.
 */
export class IndexedDbRepository<TEntity> {
  constructor(
    private readonly storeName: string,
    private readonly databaseOpener: DatabaseOpener = openCeliaDatabase,
  ) {}

  async get(id: string): Promise<TEntity | undefined> {
    return this.withStore("readonly", async (store) =>
      requestResult(store.get(id) as IDBRequest<TEntity | undefined>),
    );
  }

  async list(): Promise<readonly TEntity[]> {
    return this.withStore("readonly", async (store) =>
      requestResult(store.getAll() as IDBRequest<TEntity[]>),
    );
  }

  async save(entity: TEntity): Promise<void> {
    await this.withStore("readwrite", async (store) => {
      await requestResult(store.put(entity));
    });
  }

  async delete(id: string): Promise<void> {
    await this.withStore("readwrite", async (store) => {
      await requestResult(store.delete(id));
    });
  }

  private async withStore<TResult>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => Promise<TResult>,
  ): Promise<TResult> {
    const database = await this.databaseOpener();

    try {
      const transaction = database.transaction(this.storeName, mode);
      const result = await action(transaction.objectStore(this.storeName));
      await transactionComplete(transaction);
      return result;
    } finally {
      database.close();
    }
  }
}

import { CELIA_STORES, openCeliaDatabase } from "@/data/celia-database";
import type { DatabaseOpener } from "@/data/indexed-db-repository";
import { createDummyDataset } from "./create-dummy-dataset";

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Database transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Database transaction was aborted."));
  });
}

function requestFailureAborts(transaction: IDBTransaction, request: IDBRequest): void {
  request.onerror = () => {
    transaction.abort();
  };
}

async function replaceAll(
  writeRecords: (stores: Record<keyof typeof CELIA_STORES, IDBObjectStore>) => void,
  databaseOpener: DatabaseOpener,
): Promise<void> {
  const database = await databaseOpener();
  const storeNames = Object.values(CELIA_STORES);

  try {
    const transaction = database.transaction(storeNames, "readwrite");
    const stores = Object.fromEntries(
      Object.entries(CELIA_STORES).map(([key, name]) => [key, transaction.objectStore(name)]),
    ) as Record<keyof typeof CELIA_STORES, IDBObjectStore>;

    for (const store of Object.values(stores)) {
      requestFailureAborts(transaction, store.clear());
    }

    writeRecords(stores);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
}

export interface ReplaceWithDummyDataOptions {
  referenceDate: string;
  databaseOpener?: DatabaseOpener;
}

export async function replaceWithDummyData({
  referenceDate,
  databaseOpener = openCeliaDatabase,
}: ReplaceWithDummyDataOptions): Promise<void> {
  const dataset = createDummyDataset({ referenceDate });

  await replaceAll((stores) => {
    const records = [
      [stores.members, dataset.members],
      [stores.bucketGroups, dataset.bucketGroups],
      [stores.categories, dataset.categories],
      [stores.bucketColorOverrides, dataset.bucketColors],
      [stores.transactions, dataset.transactions],
    ] as const;

    for (const [store, entities] of records) {
      for (const entity of entities) {
        requestFailureAborts(store.transaction!, store.put(entity));
      }
    }
  }, databaseOpener);
}

export async function clearCeliaData(
  databaseOpener: DatabaseOpener = openCeliaDatabase,
): Promise<void> {
  await replaceAll(() => undefined, databaseOpener);
}

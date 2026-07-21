/**
 * The versioned IndexedDB schema owned by Celia.  Keeping the store names and
 * key paths here gives future repository adapters a single migration boundary.
 */
export const CELIA_DATABASE_NAME = "celia";
export const CELIA_DATABASE_VERSION = 1;

export const CELIA_STORES = {
  members: "members",
  categories: "categories",
  transactions: "transactions",
  bucketColorOverrides: "bucket-color-overrides",
} as const;

const storeDefinitions: readonly [string, IDBObjectStoreParameters][] = [
  [CELIA_STORES.members, { keyPath: "id" }],
  [CELIA_STORES.categories, { keyPath: "id" }],
  [CELIA_STORES.transactions, { keyPath: "id" }],
  [CELIA_STORES.bucketColorOverrides, { keyPath: "bucket" }],
];

/** Opens Celia's local database and creates any stores missing from its schema. */
export function openCeliaDatabase(
  databaseFactory: IDBFactory | undefined = globalThis.indexedDB,
): Promise<IDBDatabase> {
  if (!databaseFactory) {
    return Promise.reject(
      new Error("IndexedDB is not available in this environment."),
    );
  }

  return new Promise((resolve, reject) => {
    const request = databaseFactory.open(
      CELIA_DATABASE_NAME,
      CELIA_DATABASE_VERSION,
    );

    request.onupgradeneeded = () => {
      const database = request.result;

      for (const [name, options] of storeDefinitions) {
        if (!database.objectStoreNames.contains(name)) {
          database.createObjectStore(name, options);
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

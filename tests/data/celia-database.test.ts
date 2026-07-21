import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CELIA_DATABASE_NAME,
  CELIA_DATABASE_VERSION,
  CELIA_STORES,
  openCeliaDatabase,
} from "@/data/celia-database";

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteCeliaDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(CELIA_DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Database deletion was blocked."));
  });
}

describe("Celia IndexedDB schema", () => {
  beforeEach(async () => {
    await deleteCeliaDatabase();
  });

  afterEach(async () => {
    await deleteCeliaDatabase();
  });

  it("initializes a versioned database with every required store", async () => {
    const database = await openCeliaDatabase();

    expect(database.version).toBe(CELIA_DATABASE_VERSION);
    expect([...database.objectStoreNames]).toEqual([
      CELIA_STORES.bucketColorOverrides,
      CELIA_STORES.bucketGroups,
      CELIA_STORES.categories,
      CELIA_STORES.members,
      CELIA_STORES.transactions,
    ]);

    database.close();
  });

  it("opens an empty database correctly", async () => {
    const database = await openCeliaDatabase();
    const transaction = database.transaction(
      CELIA_STORES.transactions,
      "readonly",
    );

    await expect(
      requestResult(transaction.objectStore(CELIA_STORES.transactions).count()),
    ).resolves.toBe(0);

    database.close();
  });

  it("retains records when the database is reopened", async () => {
    const database = await openCeliaDatabase();
    const write = database.transaction(CELIA_STORES.members, "readwrite");

    await requestResult(
      write.objectStore(CELIA_STORES.members).put({
        id: "member-alex",
        name: "Alex",
        color: "#2463eb",
      }),
    );
    database.close();

    const reopenedDatabase = await openCeliaDatabase();
    const read = reopenedDatabase.transaction(CELIA_STORES.members, "readonly");

    await expect(
      requestResult(read.objectStore(CELIA_STORES.members).get("member-alex")),
    ).resolves.toEqual({
      id: "member-alex",
      name: "Alex",
      color: "#2463eb",
    });

    reopenedDatabase.close();
  });
});

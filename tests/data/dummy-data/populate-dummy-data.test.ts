import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDummyDataset, clearCeliaData, replaceWithDummyData } from "@/data/dummy-data";
import {
  CELIA_DATABASE_NAME,
  IndexedDbBucketColorRepository,
  IndexedDbBucketGroupRepository,
  IndexedDbCategoryRepository,
  IndexedDbMemberRepository,
  IndexedDbTransactionRepository,
} from "@/data";

function deleteCeliaDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(CELIA_DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function sortedById<TEntity extends { id: string }>(entities: readonly TEntity[]): TEntity[] {
  return [...entities].sort(({ id: left }, { id: right }) => left.localeCompare(right));
}

function sortedByBucket<TEntity extends { bucket: string }>(entities: readonly TEntity[]): TEntity[] {
  return [...entities].sort(({ bucket: left }, { bucket: right }) => left.localeCompare(right));
}

describe("dummy data population", () => {
  beforeEach(deleteCeliaDatabase);
  afterEach(deleteCeliaDatabase);

  it("replaces all existing records with the generated dataset", async () => {
    await new IndexedDbMemberRepository().save({
      id: "old-member",
      name: "Old member",
      color: "#000000",
    });

    await replaceWithDummyData({ referenceDate: "2026-07-22" });

    const dataset = createDummyDataset({ referenceDate: "2026-07-22" });
    await expect(new IndexedDbMemberRepository().get("old-member")).resolves.toBeUndefined();
    await expect(new IndexedDbMemberRepository().list()).resolves.toEqual(sortedById(dataset.members));
    await expect(new IndexedDbBucketGroupRepository().list()).resolves.toEqual(sortedById(dataset.bucketGroups));
    await expect(new IndexedDbCategoryRepository().list()).resolves.toEqual(sortedById(dataset.categories));
    await expect(new IndexedDbBucketColorRepository().list()).resolves.toEqual(sortedByBucket(dataset.bucketColors));
    await expect(new IndexedDbTransactionRepository().list()).resolves.toEqual(sortedById(dataset.transactions));
  });

  it("clears every Celia store", async () => {
    await replaceWithDummyData({ referenceDate: "2026-07-22" });
    await clearCeliaData();

    await expect(new IndexedDbMemberRepository().list()).resolves.toEqual([]);
    await expect(new IndexedDbBucketGroupRepository().list()).resolves.toEqual([]);
    await expect(new IndexedDbCategoryRepository().list()).resolves.toEqual([]);
    await expect(new IndexedDbBucketColorRepository().list()).resolves.toEqual([]);
    await expect(new IndexedDbTransactionRepository().list()).resolves.toEqual([]);
  });
});

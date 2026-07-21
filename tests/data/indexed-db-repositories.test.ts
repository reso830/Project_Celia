import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BucketColor } from "@/domain/bucket-color";
import type { BucketGroup } from "@/domain/bucket-group";
import type { Category } from "@/domain/category";
import type { Member } from "@/domain/member";
import type { Transaction } from "@/domain/transaction";
import {
  CELIA_DATABASE_NAME,
  IndexedDbBucketColorRepository,
  IndexedDbBucketGroupRepository,
  IndexedDbCategoryRepository,
  IndexedDbMemberRepository,
  IndexedDbTransactionRepository,
  openCeliaDatabase,
} from "@/data";
import type { Repository } from "@/data/repository";

function deleteCeliaDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(CELIA_DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Database deletion was blocked."));
  });
}

function verifiesCrud<TEntity extends object>(
  name: string,
  createRepository: () => Repository<TEntity>,
  id: string,
  original: TEntity,
  updated: TEntity,
) {
  describe(name, () => {
    it("creates, reads, lists, updates, and deletes records", async () => {
      const repository = createRepository();

      await expect(repository.list()).resolves.toEqual([]);

      await repository.save(original);
      await expect(repository.get(id)).resolves.toEqual(original);
      await expect(repository.list()).resolves.toEqual([original]);

      await repository.save(updated);
      await expect(repository.get(id)).resolves.toEqual(updated);
      await expect(repository.list()).resolves.toEqual([updated]);

      await repository.delete(id);
      await expect(repository.get(id)).resolves.toBeUndefined();
      await expect(repository.list()).resolves.toEqual([]);
    });
  });
}

describe("IndexedDB repositories", () => {
  beforeEach(async () => {
    await deleteCeliaDatabase();
  });

  afterEach(async () => {
    await deleteCeliaDatabase();
  });

  verifiesCrud<Member>(
    "members",
    () => new IndexedDbMemberRepository(openCeliaDatabase),
    "member-alex",
    { id: "member-alex", name: "Alex", color: "#2463eb" },
    { id: "member-alex", name: "Alexandra", color: "#9333ea" },
  );

  verifiesCrud<Category>(
    "categories",
    () => new IndexedDbCategoryRepository(openCeliaDatabase),
    "category-rent",
    {
      id: "category-rent",
      type: "expense",
      group: "Housing",
      name: "Rent",
    },
    {
      id: "category-rent",
      type: "expense",
      group: "Home",
      name: "Monthly rent",
    },
  );

  verifiesCrud<Transaction>(
    "transactions",
    () => new IndexedDbTransactionRepository(openCeliaDatabase),
    "transaction-rent",
    {
      id: "transaction-rent",
      date: "2026-07-01",
      memberId: "member-alex",
      categoryId: "category-rent",
      type: "expense",
      amount: 2500000,
      recurring: true,
      currency: "PHP",
    },
    {
      id: "transaction-rent",
      date: "2026-07-01",
      memberId: "member-alex",
      categoryId: "category-rent",
      type: "expense",
      amount: 2600000,
      description: "Rent increase",
      recurring: true,
      currency: "PHP",
    },
  );

  verifiesCrud<BucketColor>(
    "bucket colors",
    () => new IndexedDbBucketColorRepository(openCeliaDatabase),
    "Housing",
    { bucket: "Housing", color: "#0ea5e9" },
    { bucket: "Housing", color: "#0284c7" },
  );

  verifiesCrud<BucketGroup>(
    "bucket groups",
    () => new IndexedDbBucketGroupRepository(openCeliaDatabase),
    "bucket-housing",
    { id: "bucket-housing", type: "expense", name: "Housing" },
    { id: "bucket-housing", type: "expense", name: "Home" },
  );
});

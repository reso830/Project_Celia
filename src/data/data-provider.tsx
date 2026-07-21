"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { BucketColor } from "@/domain/bucket-color";
import { createBucketGroup, type BucketGroup } from "@/domain/bucket-group";
import type { Category } from "@/domain/category";
import type { Member } from "@/domain/member";
import type { Transaction } from "@/domain/transaction";
import type { BucketColorRepository } from "./bucket-color-repository";
import type { BucketGroupRepository } from "./bucket-group-repository";
import type { CategoryRepository } from "./category-repository";
import { IndexedDbBucketColorRepository } from "./indexed-db-bucket-color-repository";
import { IndexedDbBucketGroupRepository } from "./indexed-db-bucket-group-repository";
import { IndexedDbCategoryRepository } from "./indexed-db-category-repository";
import { IndexedDbMemberRepository } from "./indexed-db-member-repository";
import { IndexedDbTransactionRepository } from "./indexed-db-transaction-repository";
import type { MemberRepository } from "./member-repository";
import type { TransactionRepository } from "./transaction-repository";

export interface DataRepositories {
  members: MemberRepository;
  categories: CategoryRepository;
  transactions: TransactionRepository;
  bucketColors: BucketColorRepository;
  bucketGroups: BucketGroupRepository;
}

export type DataState =
  | { status: "loading" }
  | {
      status: "ready";
      repositories: DataRepositories;
      members: readonly Member[];
      categories: readonly Category[];
      transactions: readonly Transaction[];
      bucketColors: readonly BucketColor[];
      bucketGroups: readonly BucketGroup[];
      saveCategory(category: Category): Promise<void>;
      saveBucketGroup(bucketGroup: BucketGroup): Promise<void>;
      deleteBucketGroup(id: string): Promise<void>;
      deleteCategory(id: string): Promise<void>;
    }
  | { status: "error"; error: Error };

export interface DataProviderProps {
  children: ReactNode;
  createRepositories?: () => DataRepositories;
}

const DataContext = createContext<DataState | undefined>(undefined);

export interface DataActions {
  saveMember(member: Member): Promise<void>;
  deleteMember(id: string): Promise<void>;
}

const DataActionsContext = createContext<DataActions | undefined>(undefined);

function createIndexedDbRepositories(): DataRepositories {
  return {
    members: new IndexedDbMemberRepository(),
    categories: new IndexedDbCategoryRepository(),
    transactions: new IndexedDbTransactionRepository(),
    bucketColors: new IndexedDbBucketColorRepository(),
    bucketGroups: new IndexedDbBucketGroupRepository(),
  };
}

function toError(cause: unknown): Error {
  return cause instanceof Error
    ? cause
    : new Error("Unable to initialize application data.");
}

function bucketGroupKey(type: string, name: string): string {
  return `${type}:${name.trim().toLocaleLowerCase()}`;
}

export function DataProvider({
  children,
  createRepositories = createIndexedDbRepositories,
}: DataProviderProps) {
  const [state, setState] = useState<DataState>({ status: "loading" });
  const repositoriesRef = useRef<DataRepositories | undefined>(undefined);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const repositories = createRepositories();
        repositoriesRef.current = repositories;
        const [members, categories, transactions, bucketColors, bucketGroups] =
          await Promise.all([
            repositories.members.list(),
            repositories.categories.list(),
            repositories.transactions.list(),
            repositories.bucketColors.list(),
            repositories.bucketGroups.list(),
          ]);

        const persistedKeys = new Set(
          bucketGroups.map(({ type, name }) => bucketGroupKey(type, name)),
        );
        const legacyGroups = categories.reduce<BucketGroup[]>(
          (groups, category) => {
            const key = bucketGroupKey(category.type, category.group);
            if (persistedKeys.has(key)) {
              return groups;
            }

            persistedKeys.add(key);
            groups.push(
              createBucketGroup({
                id: crypto.randomUUID(),
                type: category.type,
                name: category.group,
              }),
            );
            return groups;
          },
          [],
        );

        await Promise.all(
          legacyGroups.map((bucketGroup) =>
            repositories.bucketGroups.save(bucketGroup),
          ),
        );

        const saveCategory = async (category: Category) => {
          await repositories.categories.save(category);

          if (!active) {
            return;
          }

          setState((current) =>
            current.status === "ready"
              ? {
                  ...current,
                  categories: [
                    ...current.categories.filter(
                      ({ id }) => id !== category.id,
                    ),
                    category,
                  ],
                }
              : current,
          );
        };

        const saveBucketGroup = async (bucketGroup: BucketGroup) => {
          await repositories.bucketGroups.save(bucketGroup);

          if (!active) {
            return;
          }

          setState((current) =>
            current.status === "ready"
              ? {
                  ...current,
                  bucketGroups: [
                    ...current.bucketGroups.filter(
                      ({ id }) => id !== bucketGroup.id,
                    ),
                    bucketGroup,
                  ],
                }
              : current,
          );
        };

        const deleteCategory = async (id: string) => {
          await repositories.categories.delete(id);

          if (!active) {
            return;
          }

          setState((current) =>
            current.status === "ready"
              ? {
                  ...current,
                  categories: current.categories.filter(
                    (category) => category.id !== id,
                  ),
                }
              : current,
          );
        };

        const deleteBucketGroup = async (id: string) => {
          await repositories.bucketGroups.delete(id);

          if (!active) {
            return;
          }

          setState((current) =>
            current.status === "ready"
              ? {
                  ...current,
                  bucketGroups: current.bucketGroups.filter(
                    (bucketGroup) => bucketGroup.id !== id,
                  ),
                }
              : current,
          );
        };

        if (active) {
          setState({
            status: "ready",
            repositories,
            members,
            categories,
            transactions,
            bucketColors,
            bucketGroups: [...bucketGroups, ...legacyGroups],
            saveCategory,
            saveBucketGroup,
            deleteBucketGroup,
            deleteCategory,
          });
        }
      } catch (cause) {
        if (active) {
          setState({ status: "error", error: toError(cause) });
        }
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [createRepositories]);

  async function saveMember(member: Member): Promise<void> {
    const repositories = repositoriesRef.current;
    if (!repositories) {
      throw new Error("Application data is not ready.");
    }

    await repositories.members.save(member);
    setState((current) => {
      if (current.status !== "ready") {
        return current;
      }

      return {
        ...current,
        members: [
          ...current.members.filter(({ id }) => id !== member.id),
          member,
        ],
      };
    });
  }

  async function deleteMember(id: string): Promise<void> {
    const repositories = repositoriesRef.current;
    if (!repositories) {
      throw new Error("Application data is not ready.");
    }

    await repositories.members.delete(id);
    setState((current) => {
      if (current.status !== "ready") {
        return current;
      }

      return {
        ...current,
        members: current.members.filter((member) => member.id !== id),
      };
    });
  }

  const actions: DataActions = { saveMember, deleteMember };

  return (
    <DataActionsContext.Provider value={actions}>
      <DataContext.Provider value={state}>{children}</DataContext.Provider>
    </DataActionsContext.Provider>
  );
}

export function useData(): DataState {
  const state = useContext(DataContext);

  if (!state) {
    throw new Error("useData must be used within a DataProvider.");
  }

  return state;
}

export function useDataActions(): DataActions {
  const actions = useContext(DataActionsContext);

  if (!actions) {
    throw new Error("useDataActions must be used within a DataProvider.");
  }

  return actions;
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { BucketColor } from "@/domain/bucket-color";
import type { Category } from "@/domain/category";
import type { Member } from "@/domain/member";
import type { Transaction } from "@/domain/transaction";
import type { BucketColorRepository } from "./bucket-color-repository";
import type { CategoryRepository } from "./category-repository";
import { IndexedDbBucketColorRepository } from "./indexed-db-bucket-color-repository";
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
    }
  | { status: "error"; error: Error };

export interface DataProviderProps {
  children: ReactNode;
  createRepositories?: () => DataRepositories;
}

const DataContext = createContext<DataState | undefined>(undefined);

function createIndexedDbRepositories(): DataRepositories {
  return {
    members: new IndexedDbMemberRepository(),
    categories: new IndexedDbCategoryRepository(),
    transactions: new IndexedDbTransactionRepository(),
    bucketColors: new IndexedDbBucketColorRepository(),
  };
}

function toError(cause: unknown): Error {
  return cause instanceof Error
    ? cause
    : new Error("Unable to initialize application data.");
}

export function DataProvider({
  children,
  createRepositories = createIndexedDbRepositories,
}: DataProviderProps) {
  const [state, setState] = useState<DataState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const repositories = createRepositories();
        const [members, categories, transactions, bucketColors] =
          await Promise.all([
            repositories.members.list(),
            repositories.categories.list(),
            repositories.transactions.list(),
            repositories.bucketColors.list(),
          ]);

        if (active) {
          setState({
            status: "ready",
            repositories,
            members,
            categories,
            transactions,
            bucketColors,
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

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
}

export function useData(): DataState {
  const state = useContext(DataContext);

  if (!state) {
    throw new Error("useData must be used within a DataProvider.");
  }

  return state;
}

import { isCategoryType, type CategoryType } from "./category-type";
import { DomainValidationError } from "./errors";

export interface TransactionInput {
  id: string;
  date: string;
  memberId: string;
  categoryId: string;
  type: CategoryType;
  amount: number;
  description?: string;
  recurring: boolean;
}

export interface Transaction extends TransactionInput {
  currency: "PHP";
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function createTransaction(
  input: TransactionInput,
): Readonly<Transaction> {
  if (!input.id.trim() || !input.memberId.trim() || !input.categoryId.trim()) {
    throw new DomainValidationError(
      "Transaction id, memberId, and categoryId are required.",
    );
  }

  if (!isCategoryType(input.type)) {
    throw new DomainValidationError(
      "Transaction type must be income or expense.",
    );
  }

  if (!isIsoDate(input.date)) {
    throw new DomainValidationError(
      "Transaction date must be a real yyyy-mm-dd date.",
    );
  }

  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new DomainValidationError(
      "Transaction amount must be a positive safe integer of PHP minor units.",
    );
  }

  return Object.freeze({ ...input, currency: "PHP" as const });
}

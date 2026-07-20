export type CategoryType = 'income' | 'expense';

export function isCategoryType(value: unknown): value is CategoryType {
  return value === 'income' || value === 'expense';
}

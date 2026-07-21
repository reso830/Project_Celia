import { isCategoryType, type CategoryType } from "./category-type";
import { DomainValidationError } from "./errors";

export interface Category {
  id: string;
  type: CategoryType;
  group: string;
  name: string;
}

export function createCategory(input: Category): Readonly<Category> {
  if (!input.id.trim() || !input.group.trim() || !input.name.trim()) {
    throw new DomainValidationError(
      "Category id, group, and name are required.",
    );
  }

  if (!isCategoryType(input.type)) {
    throw new DomainValidationError("Category type must be income or expense.");
  }

  return Object.freeze({ ...input });
}

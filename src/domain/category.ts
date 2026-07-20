import { isCategoryType, type CategoryType } from './category-type.js';
import { DomainValidationError } from './errors.js';

export interface Category {
  id: string;
  type: CategoryType;
  group: string;
  name: string;
}

export function createCategory(input: Category): Readonly<Category> {
  if (!input.id.trim() || !input.group.trim() || !input.name.trim() || !isCategoryType(input.type)) {
    throw new DomainValidationError('Category id, type, group, and name are required.');
  }

  return Object.freeze({ ...input });
}

import type { Category } from "@/domain/category";

export interface CategoryRepository {
  get(id: string): Promise<Category | undefined>;
  list(): Promise<readonly Category[]>;
  save(category: Category): Promise<void>;
  delete(id: string): Promise<void>;
}

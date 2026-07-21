import type { Category } from "@/domain/category";
import { CELIA_STORES } from "./celia-database";
import {
  type DatabaseOpener,
  IndexedDbRepository,
} from "./indexed-db-repository";
import type { CategoryRepository } from "./category-repository";

export class IndexedDbCategoryRepository
  extends IndexedDbRepository<Category>
  implements CategoryRepository
{
  constructor(databaseOpener?: DatabaseOpener) {
    super(CELIA_STORES.categories, databaseOpener);
  }
}

import type { Category } from "@/domain/category";
import type { Item } from "@/domain/item";
export type CategoryRowData = Category & {
  items: Item[];
  itemCount: number;
  archived: boolean;
};

import type { Category } from "@/domain/category";
import type { Item } from "@/domain/item";

export type CategoryItemData = Item & {
  entryCount: number;
};

export type CategoryRowData = Category & {
  items: CategoryItemData[];
  itemCount: number;
  entryCount: number;
  archived: boolean;
};

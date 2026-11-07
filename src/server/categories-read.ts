import "server-only";

import { connection } from "next/server";
import { getDatabase } from "./db/database";
import { listCategories, listItems } from "./categories-store";
import { countEntriesByCategory, countEntriesByItem } from "./entries-store";

export async function getCategoriesView() {
  await connection();
  const database = getDatabase();
  const categories = listCategories(database);
  const rows = categories.map((category) => {
    const items = listItems(database, category.id).map((item) => ({
      ...item,
      entryCount: countEntriesByItem(database, item.id),
    }));
    return {
      ...category,
      items,
      itemCount: items.length,
      entryCount: countEntriesByCategory(database, category.id),
      archived: category.archivedAt !== null,
    };
  });
  return {
    income: rows.filter((category) => category.umbrella === "income"),
    expense: rows.filter((category) => category.umbrella === "expense"),
  };
}

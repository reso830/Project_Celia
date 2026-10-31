import "server-only";

import { connection } from "next/server";
import { getDatabase } from "./db/database";
import { listCategories, listItems } from "./categories-store";

export async function getCategoriesView() {
  await connection();
  const categories = listCategories(getDatabase());
  const rows = categories.map((category) => {
    const items = listItems(getDatabase(), category.id);
    return {
      ...category,
      items,
      itemCount: items.length,
      archived: category.archivedAt !== null,
    };
  });
  return {
    income: rows.filter((category) => category.umbrella === "income"),
    expense: rows.filter((category) => category.umbrella === "expense"),
  };
}

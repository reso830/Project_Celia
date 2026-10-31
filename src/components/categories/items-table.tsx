import AddItem from "./add-item";
import ItemRow from "./item-row";
import type { CategoryRowData } from "./types";
export default function ItemsTable({
  category,
  categories,
}: {
  category: CategoryRowData;
  categories: CategoryRowData[];
}) {
  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(
    new Date(),
  );
  // lifted from prototype CSS
  return (
    <section>
      <div className="grid grid-cols-[minmax(120px,1fr)_56px_92px_52px] gap-[var(--space-2-5)] border-b border-celia-border pb-[var(--space-item-header-bottom)] text-[length:var(--font-size-caps)] font-medium tracking-[.06em] text-celia-muted">
        <span>ITEM</span>
        <span>ENTRIES</span>
        <span>{month}</span>
        <span>MOVE</span>
      </div>
      {category.items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          category={category}
          categories={categories}
        />
      ))}
      {category.archived ? (
        <p id="archived-items-reason" className="sr-only">
          Restore this category before editing, moving, or adding items.
        </p>
      ) : null}
      <AddItem
        categoryId={category.id}
        disabled={category.archived}
        disabledReasonId={
          category.archived ? "archived-items-reason" : undefined
        }
      />
    </section>
  );
}

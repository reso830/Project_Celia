import { useState } from "react";
import type { BucketColor, BucketGroup, Category } from "@/domain";

interface BucketGroupGridProps {
  categories: readonly Category[];
  bucketGroups: readonly BucketGroup[];
  bucketColors: readonly BucketColor[];
  emptyMessage: string;
  onAddSubcategory?: (
    bucketGroup: BucketGroup,
    name: string,
  ) => Promise<boolean>;
  onDeleteSubcategory?: (category: Category) => Promise<void>;
}

const fallbackColor = "#8a93a3";

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function BucketGroupGrid({
  categories,
  bucketGroups,
  bucketColors,
  emptyMessage,
  onAddSubcategory,
  onDeleteSubcategory,
}: BucketGroupGridProps) {
  const [subcategoryNames, setSubcategoryNames] = useState<Record<string, string>>(
    {},
  );
  const colors = new Map(
    bucketColors.map(({ bucket, color }) => [normalize(bucket), color]),
  );
  if (!bucketGroups.length) {
    return (
      <div className="mt-4 rounded-xl border border-[#d6dae1] bg-white p-5 text-sm text-[#8a93a3]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {bucketGroups.map((bucketGroup) => {
        const group = categories.filter(
          (category) =>
            category.type === bucketGroup.type &&
            normalize(category.group) === normalize(bucketGroup.name),
        );
        const name = bucketGroup.name.trim();
        const type = bucketGroup.type === "expense" ? "Expense" : "Income";
        const color = colors.get(normalize(bucketGroup.name)) ?? fallbackColor;

        return (
          <article
            aria-label={`${type} ${name}`}
            className="rounded-xl border border-[#d6dae1] bg-white p-5"
            key={bucketGroup.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#16213f]">{name}</h3>
                <p className="mt-1 text-sm text-[#6b7686]">{type}</p>
              </div>
              <span className="flex items-center gap-2 text-xs text-[#6b7686]">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                Color: {color}
              </span>
            </div>
            {group.length ? (
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[#16213f]">
                {group.map((category) => (
                  <li className="flex items-center justify-between gap-2" key={category.id}>
                    <span>{category.name}</span>
                    {onDeleteSubcategory ? (
                      <button
                        className="text-sm font-medium text-[#b42318] hover:underline"
                        onClick={() => void onDeleteSubcategory(category)}
                        type="button"
                      >
                        Delete {category.name}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[#8a93a3]">No subcategories yet.</p>
            )}
            {onAddSubcategory ? (
              <div className="mt-4 flex gap-2">
                <label className="sr-only" htmlFor={`subcategory-${bucketGroup.id}`}>
                  Add subcategory to {name}
                </label>
                <input
                  className="min-w-0 flex-1 rounded-md border border-[#b7bfca] px-3 py-2 text-sm"
                  id={`subcategory-${bucketGroup.id}`}
                  onChange={(event) =>
                    setSubcategoryNames((current) => ({
                      ...current,
                      [bucketGroup.id]: event.target.value,
                    }))
                  }
                  value={subcategoryNames[bucketGroup.id] ?? ""}
                />
                <button
                  className="rounded-md bg-[#16213f] px-3 py-2 text-sm font-semibold text-white"
                  onClick={() => {
                    void onAddSubcategory(
                      bucketGroup,
                      subcategoryNames[bucketGroup.id] ?? "",
                    ).then((saved) => {
                      if (saved) {
                        setSubcategoryNames((current) => ({
                          ...current,
                          [bucketGroup.id]: "",
                        }));
                      }
                    });
                  }}
                  type="button"
                >
                  Add subcategory
                </button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

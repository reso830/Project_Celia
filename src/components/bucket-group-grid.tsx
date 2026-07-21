import type { BucketColor, Category } from "@/domain";

interface BucketGroupGridProps {
  categories: readonly Category[];
  bucketColors: readonly BucketColor[];
  emptyMessage: string;
}

const fallbackColor = "#8a93a3";

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function BucketGroupGrid({
  categories,
  bucketColors,
  emptyMessage,
}: BucketGroupGridProps) {
  const colors = new Map(
    bucketColors.map(({ bucket, color }) => [normalize(bucket), color]),
  );
  const groups = Array.from(
    categories.reduce((grouped, category) => {
      const key = `${category.type}:${normalize(category.group)}`;
      const current = grouped.get(key) ?? [];
      grouped.set(key, [...current, category]);
      return grouped;
    }, new Map<string, readonly Category[]>()),
  );

  if (!groups.length) {
    return (
      <div className="mt-4 rounded-xl border border-[#d6dae1] bg-white p-5 text-sm text-[#8a93a3]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map(([key, group]) => {
        const first = group[0];
        const name = first.group.trim();
        const type = first.type === "expense" ? "Expense" : "Income";
        const color = colors.get(normalize(first.group)) ?? fallbackColor;

        return (
          <article
            aria-label={`${type} ${name}`}
            className="rounded-xl border border-[#d6dae1] bg-white p-5"
            key={key}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#16213f]">
                  {name}
                </h3>
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
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[#16213f]">
              {group.map((category) => (
                <li key={category.id}>{category.name}</li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

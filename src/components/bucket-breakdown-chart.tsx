import {
  expenseBucketColorKey,
  type BucketBreakdown,
  type BucketColor,
} from "@/domain";

interface BucketBreakdownChartProps {
  breakdown: readonly BucketBreakdown[];
  bucketColors: readonly BucketColor[];
}

const fallbackColor = "#8a93a3";
const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function BucketBreakdownChart({
  breakdown,
  bucketColors,
}: BucketBreakdownChartProps) {
  if (!breakdown.length) {
    return (
      <section
        aria-labelledby="bucket-breakdown-title"
        className="mt-6 rounded-xl border border-[#d6dae1] bg-white p-5"
      >
        <h2
          className="text-base font-bold text-[#16213f]"
          id="bucket-breakdown-title"
        >
          Spending by bucket
        </h2>
        <p className="mt-3 text-sm text-[#8a93a3]">
          No expense transactions yet.
        </p>
      </section>
    );
  }

  const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const colors = new Map(
    bucketColors.map(({ bucket, color }) => [normalize(bucket), color]),
  );
  let offset = 0;

  return (
    <section
      aria-labelledby="bucket-breakdown-title"
      className="mt-6 rounded-xl border border-[#d6dae1] bg-white p-5"
    >
      <h2
        className="text-base font-bold text-[#16213f]"
        id="bucket-breakdown-title"
      >
        Spending by bucket
      </h2>
      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center">
        <svg
          aria-label="Expense breakdown"
          className="mx-auto h-48 w-48 shrink-0"
          role="img"
          viewBox="0 0 120 120"
        >
          <circle
            cx="60"
            cy="60"
            fill="none"
            r="40"
            stroke="#eef0f3"
            strokeWidth="20"
          />
          {breakdown.map(({ bucket, amount }) => {
            const percentage = (amount / total) * 100;
            const color =
              colors.get(normalize(expenseBucketColorKey(bucket))) ??
              colors.get(normalize(bucket)) ??
              fallbackColor;
            const slice = (
              <circle
                cx="60"
                cy="60"
                data-testid={`bucket-slice-${bucket}`}
                fill="none"
                key={bucket}
                pathLength="100"
                r="40"
                stroke={color}
                strokeDasharray={`${percentage} ${100 - percentage}`}
                strokeDashoffset={-offset}
                strokeWidth="20"
                transform="rotate(-90 60 60)"
              />
            );
            offset += percentage;
            return slice;
          })}
          <text
            fill="#16213f"
            fontSize="12"
            fontWeight="600"
            textAnchor="middle"
            x="60"
            y="57"
          >
            Expenses
          </text>
          <text
            fill="#6b7686"
            fontSize="10"
            textAnchor="middle"
            x="60"
            y="71"
          >
            {currencyFormatter.format(total / 100)}
          </text>
        </svg>
        <ul className="min-w-0 flex-1 space-y-3">
          {breakdown.map(({ bucket, amount }) => {
            const percentage = Math.round((amount / total) * 100);
            const color =
              colors.get(normalize(expenseBucketColorKey(bucket))) ??
              colors.get(normalize(bucket)) ??
              fallbackColor;

            return (
              <li className="flex items-center justify-between gap-3" key={bucket}>
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-[#16213f]">
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate">{bucket}</span>
                </span>
                <span className="shrink-0 text-sm text-[#6b7686]">
                  {currencyFormatter.format(amount / 100)} · {percentage}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

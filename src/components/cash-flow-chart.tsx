import type { Transaction } from "@/domain/transaction";

export interface CashFlowPoint {
  date: string;
  movement: number;
  balance: number;
}

export function cashFlowPoints(
  transactions: readonly Transaction[],
): readonly CashFlowPoint[] {
  const movements = new Map<string, number>();

  for (const transaction of transactions) {
    const amount =
      transaction.type === "income" ? transaction.amount : -transaction.amount;
    movements.set(
      transaction.date,
      (movements.get(transaction.date) ?? 0) + amount,
    );
  }

  let balance = 0;
  return [...movements.entries()]
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([date, movement]) => {
      balance += movement;
      return { date, movement, balance };
    });
}

function formatPhp(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount / 100);
}

export function CashFlowChart({
  transactions,
}: {
  transactions: readonly Transaction[];
}) {
  const points = cashFlowPoints(transactions);

  if (!points.length) {
    return (
      <section aria-labelledby="cash-flow-title" className="mt-6">
        <h2 id="cash-flow-title" className="text-base font-bold text-[#16213f]">
          Cash flow
        </h2>
        <p className="mt-4 rounded-xl border border-[#d6dae1] bg-white p-5 text-sm text-[#8a93a3]">
          No cash flow data yet.
        </p>
      </section>
    );
  }

  const balances = points.map(({ balance }) => balance);
  const minimum = Math.min(...balances, 0);
  const maximum = Math.max(...balances, 0);
  const range = maximum - minimum || 1;
  const width = 600;
  const height = 200;
  const line = points
    .map((point, index) => {
      const x =
        points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - ((point.balance - minimum) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section aria-labelledby="cash-flow-title" className="mt-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="cash-flow-title" className="text-base font-bold text-[#16213f]">
          Cash flow
        </h2>
        <p className="text-sm font-semibold text-[#16213f]">
          {formatPhp(points.at(-1)!.balance)}
        </p>
      </div>
      <svg
        aria-label="Cash flow"
        className="mt-4 h-52 w-full rounded-xl border border-[#d6dae1] bg-white p-4"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <polyline fill="none" points={line} stroke="#2463eb" strokeWidth="4" />
      </svg>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6b7686]">
        {points.map((point) => (
          <li key={point.date}>
            {point.date}: {formatPhp(point.balance)}
          </li>
        ))}
      </ul>
    </section>
  );
}

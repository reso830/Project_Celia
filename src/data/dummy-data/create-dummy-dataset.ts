import {
  createBucketColor,
  createBucketGroup,
  createCategory,
  createMember,
  createTransaction,
  expenseBucketColorKey,
  type BucketColor,
  type BucketGroup,
  type Category,
  type Member,
  type Transaction,
} from "@/domain";

export interface DummyDataset {
  members: readonly Member[];
  bucketGroups: readonly BucketGroup[];
  categories: readonly Category[];
  bucketColors: readonly BucketColor[];
  transactions: readonly Transaction[];
}

export interface CreateDummyDatasetOptions {
  referenceDate: string;
}

const incomeGroups = {
  Employment: ["Salary", "Bonus"],
  "Other Income": ["Freelance", "Reimbursement", "Interest"],
} as const;

const expenseGroups = {
  Housing: ["Rent", "Electricity", "Water", "Internet"],
  Food: ["Groceries", "Dining Out", "Coffee"],
  Transportation: ["Fuel", "Public Transport", "Parking", "Ride Hailing"],
  Household: ["Supplies", "Maintenance", "Furniture"],
  Personal: ["Shopping", "Entertainment", "Healthcare", "Subscriptions"],
} as const;

const expenseColors: Record<keyof typeof expenseGroups, string> = {
  Housing: "#0ea5e9",
  Food: "#f97316",
  Transportation: "#8b5cf6",
  Household: "#14b8a6",
  Personal: "#ec4899",
};

function dateParts(referenceDate: string): {
  year: number;
  month: number;
  day: number;
} {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
    throw new Error("referenceDate must use yyyy-mm-dd.");
  }

  const [year, month, day] = referenceDate.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("referenceDate must be a real date.");
  }

  return { year, month, day };
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthSequence(
  referenceDate: string,
): readonly { year: number; month: number; current: boolean; day: number }[] {
  const { year, month, day } = dateParts(referenceDate);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (6 - index), 1));
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      current: index === 6,
      day,
    };
  });
}

function categoryId(
  type: "income" | "expense",
  group: string,
  name: string,
): string {
  return `${type}-${group}-${name}`.toLocaleLowerCase().replaceAll(" ", "-");
}

export function createDummyDataset({
  referenceDate,
}: CreateDummyDatasetOptions): DummyDataset {
  const members = [
    createMember({ id: "member-alex", name: "Alex", color: "#2463eb" }),
    createMember({ id: "member-sam", name: "Sam", color: "#9333ea" }),
  ];
  const bucketGroups = [
    ...Object.keys(incomeGroups).map((name) =>
      createBucketGroup({
        id: `income-${name}`.toLocaleLowerCase().replaceAll(" ", "-"),
        type: "income",
        name,
      }),
    ),
    ...Object.keys(expenseGroups).map((name) =>
      createBucketGroup({
        id: `expense-${name}`.toLocaleLowerCase(),
        type: "expense",
        name,
      }),
    ),
  ];
  const categories = [
    ...Object.entries(incomeGroups).flatMap(([group, names]) =>
      names.map((name) =>
        createCategory({
          id: categoryId("income", group, name),
          type: "income",
          group,
          name,
        }),
      ),
    ),
    ...Object.entries(expenseGroups).flatMap(([group, names]) =>
      names.map((name) =>
        createCategory({
          id: categoryId("expense", group, name),
          type: "expense",
          group,
          name,
        }),
      ),
    ),
  ];
  const bucketColors = Object.entries(expenseColors).map(([bucket, color]) =>
    createBucketColor({ bucket: expenseBucketColorKey(bucket), color }),
  );
  const transactions: Transaction[] = [];
  const add = (
    monthKey: string,
    day: number,
    maxDay: number,
    memberId: string,
    type: "income" | "expense",
    group: string,
    name: string,
    amount: number,
    recurring: boolean,
    description: string,
  ) => {
    const [year, month] = monthKey.split("-").map(Number);
    transactions.push(
      createTransaction({
        id: `transaction-${monthKey}-${name}-${memberId}-${transactions.length + 1}`
          .toLocaleLowerCase()
          .replaceAll(" ", "-"),
        date: isoDate(year, month, Math.min(day, maxDay)),
        memberId,
        categoryId: categoryId(type, group, name),
        type,
        amount,
        recurring,
        description,
      }),
    );
  };

  const months = monthSequence(referenceDate);
  months.forEach(({ year, month, current, day }, index) => {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const maxDay = current ? day : 28;
    add(
      key,
      1,
      maxDay,
      "member-alex",
      "income",
      "Employment",
      "Salary",
      85_000_00,
      true,
      "Alex salary",
    );
    add(
      key,
      1,
      maxDay,
      "member-sam",
      "income",
      "Employment",
      "Salary",
      72_000_00,
      true,
      "Sam salary",
    );
    add(
      key,
      2,
      maxDay,
      "member-alex",
      "expense",
      "Housing",
      "Rent",
      25_000_00,
      true,
      "Monthly rent",
    );
    add(
      key,
      5,
      maxDay,
      "member-sam",
      "expense",
      "Housing",
      "Electricity",
      3_200_00 + index * 10_00,
      true,
      "Electricity bill",
    );
    add(
      key,
      7,
      maxDay,
      "member-alex",
      "expense",
      "Housing",
      "Water",
      900_00,
      true,
      "Water bill",
    );
    add(
      key,
      9,
      maxDay,
      "member-sam",
      "expense",
      "Housing",
      "Internet",
      1_899_00,
      true,
      "Internet bill",
    );
    [11, 18, 25].forEach((groceryDay, groceryIndex) =>
      add(
        key,
        groceryDay,
        maxDay,
        groceryIndex % 2 ? "member-sam" : "member-alex",
        "expense",
        "Food",
        "Groceries",
        1_450_00 + groceryIndex * 180_00 + index * 20_00,
        false,
        "Weekly groceries",
      ),
    );
    add(
      key,
      13,
      maxDay,
      "member-sam",
      "expense",
      "Food",
      "Dining Out",
      1_150_00 + index * 30_00,
      false,
      "Dinner out",
    );
    add(
      key,
      16,
      maxDay,
      "member-alex",
      "expense",
      "Food",
      "Coffee",
      220_00 + index * 10_00,
      false,
      "Coffee catch-up",
    );
    add(
      key,
      20,
      maxDay,
      index % 2 ? "member-sam" : "member-alex",
      "expense",
      "Transportation",
      index % 2 ? "Public Transport" : "Fuel",
      1_300_00 + index * 50_00,
      false,
      "Transport",
    );
    add(
      key,
      22,
      maxDay,
      "member-sam",
      "expense",
      "Personal",
      "Subscriptions",
      549_00,
      true,
      "Streaming subscription",
    );
    const extras: readonly [string, string, number, string][] = [
      ["Household", "Supplies", 780_00, "Household supplies"],
      ["Personal", "Shopping", 1_200_00, "Personal shopping"],
      ["Personal", "Entertainment", 950_00, "Weekend entertainment"],
      ["Personal", "Healthcare", 1_500_00, "Healthcare"],
      ["Transportation", "Parking", 300_00, "Parking"],
      ["Transportation", "Ride Hailing", 430_00, "Ride hailing"],
      ["Household", "Maintenance", 2_100_00, "Home maintenance"],
    ];
    const [group, name, amount, description] = extras[index];
    add(
      key,
      27,
      maxDay,
      index % 2 ? "member-alex" : "member-sam",
      "expense",
      group,
      name,
      amount,
      false,
      description,
    );
  });

  const keyFor = (index: number) => {
    const { year, month } = months[index];
    return `${year}-${String(month).padStart(2, "0")}`;
  };
  add(
    keyFor(2),
    15,
    28,
    "member-sam",
    "income",
    "Employment",
    "Bonus",
    12_500_00,
    false,
    "Performance bonus",
  );
  add(
    keyFor(3),
    17,
    28,
    "member-alex",
    "income",
    "Other Income",
    "Freelance",
    8_400_00,
    false,
    "Freelance design work",
  );
  add(
    keyFor(4),
    12,
    28,
    "member-sam",
    "income",
    "Other Income",
    "Reimbursement",
    2_750_00,
    false,
    "Work reimbursement",
  );
  add(
    keyFor(5),
    26,
    28,
    "member-alex",
    "income",
    "Other Income",
    "Interest",
    320_00,
    false,
    "Savings interest",
  );
  add(
    keyFor(4),
    24,
    28,
    "member-alex",
    "expense",
    "Household",
    "Furniture",
    45_000_00,
    false,
    "Dining table",
  );

  return { members, bucketGroups, categories, bucketColors, transactions };
}

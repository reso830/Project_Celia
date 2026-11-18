import DashboardScreen from "@/components/dashboard/dashboard-screen";
import { getDashboardView } from "@/server/dashboard-read";

type QueryValue = string | string[] | undefined;

function singleValue(value: QueryValue) {
  return typeof value === "string" ? value : undefined;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: QueryValue;
    member?: QueryValue;
    category?: QueryValue;
    range?: QueryValue;
  }>;
}) {
  const { month, member, category, range } = await searchParams;
  const data = await getDashboardView({
    month: singleValue(month),
    memberFilter: singleValue(member),
    categoryId: singleValue(category),
    range: range === "12" ? 12 : 6,
  });
  return <DashboardScreen data={data} />;
}

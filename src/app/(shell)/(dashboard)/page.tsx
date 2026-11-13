import DashboardScreen from "@/components/dashboard/dashboard-screen";
import { getDashboardView } from "@/server/dashboard-read";

function singleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const { month, member, category, range } = await searchParams;
  const data = await getDashboardView({
    month: singleValue(month),
    memberFilter: singleValue(member),
    categoryId: singleValue(category),
    range: range === "12" ? 12 : 6,
  });
  return <DashboardScreen data={data} />;
}

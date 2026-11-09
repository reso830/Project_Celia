import SavingsScreen from "@/components/savings/savings-screen";
import { getSavingsView } from "@/server/savings-read";
export default async function SavingsBucketsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return <SavingsScreen data={await getSavingsView(month)} />;
}

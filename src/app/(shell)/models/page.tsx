import ModelsScreen from "@/components/models/models-screen";
import { getModelsView } from "@/server/models-read";
export default async function BudgetModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return <ModelsScreen data={await getModelsView(month)} />;
}

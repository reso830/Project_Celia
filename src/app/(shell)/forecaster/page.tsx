import { ForecasterScreen } from "@/components/forecaster/forecaster-screen";
import { getForecasterView } from "@/server/forecaster-read";

export default async function ForecasterPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string | string[] }>;
}) {
  const { scenario } = await searchParams;
  return (
    <ForecasterScreen
      data={await getForecasterView(
        typeof scenario === "string" ? scenario : undefined,
      )}
    />
  );
}

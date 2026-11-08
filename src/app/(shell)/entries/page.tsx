import EntriesScreen from "@/components/entries/entries-screen";
import { getEntriesView } from "@/server/entries-read";

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  return <EntriesScreen {...await getEntriesView(month)} />;
}

import EntriesScreen from "@/components/entries/entries-screen";
import { getEntriesView } from "@/server/entries-read";

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    category?: string;
    owner?: string;
    member?: string;
  }>;
}) {
  const { month, category, owner, member } = await searchParams;
  const view = await getEntriesView(month);
  const candidate = owner || member;
  const initialOwnerId =
    candidate === "household" || view.members.some((m) => m.id === candidate)
      ? candidate
      : "all";
  const initialCategoryId = view.categories.some((c) => c.id === category)
    ? category
    : "all";
  return (
    <EntriesScreen
      {...view}
      initialCategoryId={initialCategoryId}
      initialOwnerId={initialOwnerId}
    />
  );
}

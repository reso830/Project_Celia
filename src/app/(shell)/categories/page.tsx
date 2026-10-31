import CategoriesScreen from "@/components/categories/categories-screen";
import PageHeader from "@/components/shell/page-header";
import { getCategoriesView } from "@/server/categories-read";
export default async function CategoriesPage() {
  const view = await getCategoriesView();
  return (
    <>
      <PageHeader title="Categories & items" />
      <CategoriesScreen {...view} />
    </>
  );
}

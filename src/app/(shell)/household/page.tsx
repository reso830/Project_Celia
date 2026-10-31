import HouseholdScreen from "@/components/household/household-screen";
import { getHouseholdView } from "@/server/members-read";

export default async function HouseholdPage() {
  return <HouseholdScreen {...await getHouseholdView()} />;
}

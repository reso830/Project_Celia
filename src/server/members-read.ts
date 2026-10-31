import "server-only";

import { connection } from "next/server";
import { getDatabase } from "./db/database";
import { listMembers } from "./members-store";

export async function getHouseholdView() {
  await connection();

  const members = listMembers(getDatabase());
  return {
    members: members.filter((member) => member.archivedAt === null),
    archivedMembers: members.filter((member) => member.archivedAt !== null),
    defaults: { owner: "Household", currency: "PHP" },
  };
}

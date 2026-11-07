import { getDatabase } from "../src/server/db/database";
import { clearAllData, getClearSummary } from "../src/server/demo";

try {
  const database = getDatabase();
  if (process.argv.slice(2).includes("--yes")) {
    console.log("Cleared:", clearAllData(database));
  } else {
    console.log("Dry run; no records deleted:", getClearSummary(database));
    console.log("Run npm run clear -- --yes to delete these records.");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

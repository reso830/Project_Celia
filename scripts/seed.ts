import { getDatabase } from "../src/server/db/database";
import { seedDemoData } from "../src/server/demo";

try {
  console.log("Seeded:", seedDemoData(getDatabase()));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

import { getDatabase } from "../src/server/db/database";
import { seedDemoData } from "../src/server/demo";

try {
  const summary = seedDemoData(getDatabase());
  console.log("Seeded:", summary);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

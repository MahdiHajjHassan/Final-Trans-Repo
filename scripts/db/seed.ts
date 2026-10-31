import "dotenv/config";
import { loadConfig } from "../../src/backend/config/env";
import { createDb } from "../../src/backend/database/db";
import { seedDatabase } from "../../src/backend/database/seed";

const config = loadConfig(process.env);
const db = await createDb(config.databaseUrl);
try {
  const result = await seedDatabase(db, config);
  console.log(result.created ? "Created initial administrator." : "Existing accounts preserved.");
} finally {
  await db.$disconnect();
}

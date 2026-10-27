import "dotenv/config";
import { loadConfig } from "../src/server/config";
import { createDb } from "../src/server/db";
import { seedDatabase } from "../src/server/seed";

const config = loadConfig(process.env);
const db = await createDb(config.databaseUrl);
try {
  const result = await seedDatabase(db, config);
  console.log(result.created ? "Created initial administrator." : "Existing accounts preserved.");
} finally { await db.$disconnect(); }

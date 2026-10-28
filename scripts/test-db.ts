import { createDb } from "../src/server/db";
import { loadConfig } from "../src/server/config";
import { seedDatabase } from "../src/server/seed";
import { hashPassword } from "../src/server/auth/password";
const supplied = process.argv[process.argv.indexOf("--project") + 1],
  project = process.env.TICTACTOE_E2E_PROJECT;
const origin = new URL(process.env.APP_ORIGIN ?? "https://invalid");
if (
  !project ||
  !/^tictactoe-e2e-[a-z0-9-]+$/.test(project) ||
  supplied !== project ||
  origin.hostname !== "localhost" ||
  Number(origin.port) < 1024 ||
  process.env.DATABASE_URL !== "file:/data/tictactoe.db"
)
  throw new Error("Refusing reset outside the explicitly isolated test container");
const config = loadConfig(process.env),
  db = await createDb(config.databaseUrl);
try {
  await db.$transaction([
    db.gameMove.deleteMany(),
    db.game.deleteMany(),
    db.session.deleteMany(),
    db.rateLimitBucket.deleteMany(),
    db.user.deleteMany(),
  ]);
  await seedDatabase(db, config);
  const passwordHash = await hashPassword(config.adminPassword);
  await db.user.createMany({
    data: [
      { email: "member-a@example.test", displayName: "Member A", passwordHash },
      { email: "member-b@example.test", displayName: "Member B", passwordHash },
    ],
  });
  console.log("Reset only the guarded isolated game database with three demonstration accounts.");
} finally {
  await db.$disconnect();
}

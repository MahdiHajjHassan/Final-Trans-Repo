import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getDb } from "./db";

// The current schema uses Prisma model/field names directly (no @map/@@map).
// Generated scalar enums keep this check aligned with every application model.
const requiredSchema = Object.values(Prisma.ModelName).map((table) => ({
  table,
  columns: Object.values(
    Prisma[`${table}ScalarFieldEnum` as keyof typeof Prisma] as Record<string, string>,
  ),
}));

export async function readiness(db?: PrismaClient): Promise<{ status: "ok"; database: "ok" }> {
  const database = db ?? (await getDb());
  const columns = await database.$queryRaw<
    Array<{ tableName: string; columnName: string }>
  >(Prisma.sql`
    SELECT m.name AS tableName, p.name AS columnName
    FROM sqlite_master m JOIN pragma_table_info(m.name) p
    WHERE m.type = 'table' AND m.name IN (${Prisma.join(requiredSchema.map(({ table }) => table))})
  `);
  const present = new Set(columns.map(({ tableName, columnName }) => `${tableName}.${columnName}`));
  if (
    requiredSchema.some(({ table, columns }) =>
      columns.some((column) => !present.has(`${table}.${column}`)),
    )
  )
    throw new Error("Database migrations are not applied");
  return { status: "ok", database: "ok" };
}

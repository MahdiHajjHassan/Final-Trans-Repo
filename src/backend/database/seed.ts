import type { PrismaClient } from "@/generated/prisma/client";
import { hashPassword } from "../modules/auth/password";
export type SeedInput = { adminEmail: string; adminPassword: string };
export async function seedDatabase(
  db: PrismaClient,
  input: SeedInput,
): Promise<{ created: boolean }> {
  if ((await db.user.count()) !== 0) return { created: false };
  const passwordHash = await hashPassword(input.adminPassword);
  return db.$transaction(async (tx) => {
    if ((await tx.user.count()) !== 0) return { created: false };
    await tx.user.create({
      data: { email: input.adminEmail, displayName: "Administrator", passwordHash, role: "ADMIN" },
    });
    return { created: true };
  });
}

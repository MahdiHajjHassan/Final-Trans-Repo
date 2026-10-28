import { randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import type { PrismaClient } from "@/generated/prisma/client";
import type { Actor, Role } from "@/shared/auth";

export async function seedUser(
  db: PrismaClient,
  input: { role?: Role; email?: string; displayName?: string; password?: string } = {},
): Promise<{ actor: Actor; email: string; password: string }> {
  const email = input.email ?? `${randomUUID()}@example.test`;
  const password = input.password ?? "taskboard-test-only-password-42";
  const user = await db.user.create({
    data: {
      email,
      displayName: input.displayName ?? "Test member",
      role: input.role ?? "MEMBER",
      passwordHash: await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
    },
  });
  return { actor: { id: user.id, role: user.role }, email, password };
}

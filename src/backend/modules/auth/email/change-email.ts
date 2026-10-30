import type { PrismaClient } from "@/generated/prisma/client";
import { emailSchema } from "@/shared/auth-validation";
import { parseInput } from "../../../common/validation";
import { DomainError } from "../../../common/errors";
import { withWriteRetry } from "../../../database/write-retry";

// Server-console recovery only. Changing an address never asserts that the new mailbox is owned.
export async function setAccountEmail(
  db: PrismaClient,
  currentEmail: string,
  newEmail: string,
): Promise<void> {
  const current = parseInput(emailSchema, currentEmail);
  const next = parseInput(emailSchema, newEmail);
  if (current === next) throw new DomainError("CONFLICT");
  await withWriteRetry(() =>
    db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { email: current } });
      if (!user) throw new DomainError("NOT_FOUND");
      if (await tx.user.findUnique({ where: { email: next } })) throw new DomainError("CONFLICT");
      await tx.user.update({
        where: { id: user.id },
        data: { email: next, emailVerifiedAt: null },
      });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.emailChallenge.deleteMany({
        where: { OR: [{ userId: user.id }, { email: current }, { email: next }] },
      });
    }),
  );
}

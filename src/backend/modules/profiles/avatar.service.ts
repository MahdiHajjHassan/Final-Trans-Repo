import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PrismaClient } from "@/generated/prisma/client";
import type { Actor } from "@/shared/auth";
import { currentActor } from "../auth/session.guard";
import { DomainError } from "../../common/errors";
import { createRateLimiter } from "../../common/security/rate-limit";
import { withWriteRetry } from "../../database/write-retry";
import { parseInput } from "../../common/validation";
import { publicProfile, publicProfileSelect } from "./profile-view";
import { profileId } from "./profiles.service";
import { normalizeAvatar } from "./avatar-image";

// A single image lives with its account in the existing persistent database.
export function createAvatarService(db: PrismaClient) {
  const consume = createRateLimiter(db);
  async function limit(actor: Actor | null) {
    await currentActor(db, actor);
    const q = await consume("avatar", actor!.id, 5, 900);
    if (!q.allowed) throw new DomainError("RATE_LIMITED", undefined, q.retryAfterSeconds);
  }
  return {
    async put(actor: Actor | null, bytes: Uint8Array, contentType: string) {
      await limit(actor);
      const data = await normalizeAvatar(bytes, contentType);
      return withWriteRetry(() =>
        db.$transaction(async (tx) => {
          const user = await currentActor(tx, actor);
          await tx.userAvatar.upsert({
            where: { userId: user.id },
            create: { userId: user.id, data },
            update: { data, revision: { increment: 1 } },
          });
          return publicProfile(
            await tx.user.findUniqueOrThrow({
              where: { id: user.id },
              select: publicProfileSelect,
            }),
          );
        }),
      );
    },
    async remove(actor: Actor | null) {
      await limit(actor);
      return withWriteRetry(() =>
        db.$transaction(async (tx) => {
          const user = await currentActor(tx, actor);
          await tx.userAvatar.deleteMany({ where: { userId: user.id } });
          return publicProfile(
            await tx.user.findUniqueOrThrow({
              where: { id: user.id },
              select: publicProfileSelect,
            }),
          );
        }),
      );
    },
    async read(actor: Actor | null, rawId: string) {
      const id = parseInput(profileId, rawId);
      const result = await db.$transaction(async (tx) => {
        await currentActor(tx, actor);
        if (!(await tx.user.findUnique({ where: { id }, select: { id: true } })))
          throw new DomainError("NOT_FOUND");
        return tx.userAvatar.findUnique({ where: { userId: id }, select: { data: true } });
      });
      if (result)
        return { bytes: Uint8Array.from(result.data), contentType: "image/webp" as const };
      return {
        bytes: Uint8Array.from(await readFile(join(process.cwd(), "public/default-avatar.svg"))),
        contentType: "image/svg+xml" as const,
      };
    },
  };
}
export type AvatarService = ReturnType<typeof createAvatarService>;

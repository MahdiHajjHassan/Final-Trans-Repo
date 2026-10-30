import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import type { Actor } from "@/shared/auth";
import { currentActor } from "../auth/session.guard";
import { DomainError } from "../../common/errors";
import { parseInput } from "../../common/validation";
import { publicProfile, publicProfileSelect } from "./profile-view";

export const profileId = z.uuid().transform((id) => id.toLowerCase());
const search = z
  .object({
    q: z.string().trim().min(2).max(60),
    page: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .strict();

// Signed-in discovery searches public names rather than the administrator's private fields.
export function createProfileService(db: PrismaClient) {
  return {
    async read(actor: Actor | null, rawId: string) {
      const id = parseInput(profileId, rawId);
      return db.$transaction(async (tx) => {
        await currentActor(tx, actor);
        const user = await tx.user.findUnique({ where: { id }, select: publicProfileSelect });
        if (!user) throw new DomainError("NOT_FOUND");
        return publicProfile(user);
      });
    },
    async search(actor: Actor | null, input: unknown) {
      const query = parseInput(search, input);
      return db.$transaction(async (tx) => {
        await currentActor(tx, actor);
        const where = { displayName: { contains: query.q } };
        const items = await tx.user.findMany({
          where,
          select: publicProfileSelect,
          orderBy: [{ displayName: "asc" }, { id: "asc" }],
          take: 25,
          skip: (query.page - 1) * 25,
        });
        return {
          items: items.map(publicProfile),
          total: await tx.user.count({ where }),
          page: query.page,
          pageSize: 25 as const,
        };
      });
    },
  };
}

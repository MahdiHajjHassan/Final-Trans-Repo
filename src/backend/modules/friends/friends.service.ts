import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { Actor } from "@/shared/auth";
import type { FriendshipDTO, FriendList, Relationship } from "@/shared/friends";
import { currentActor } from "../auth/session.guard";
import { onlineAt } from "../presence/presence.service";
import { publicProfile, publicProfileSelect } from "../profiles/profile-view";
import { profileId } from "../profiles/profiles.service";
import { DomainError } from "../../common/errors";
import { parseInput } from "../../common/validation";
import { createRateLimiter } from "../../common/security/rate-limit";
import { withWriteRetry } from "../../database/write-retry";

const include = {
  userA: { select: publicProfileSelect },
  userB: { select: publicProfileSelect },
} satisfies Prisma.FriendshipInclude;
type Record = Prisma.FriendshipGetPayload<{ include: typeof include }>;
const listSchema = z
  .object({
    kind: z.enum(["accepted", "incoming", "outgoing"]).default("accepted"),
    page: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .strict();

// Every operation rechecks the caller; a canonical pair prevents reverse duplicates.
export function createFriendService(db: PrismaClient, options: { now?: () => Date } = {}) {
  const now = options.now ?? (() => new Date()),
    consume = createRateLimiter(db, now);
  async function charge(actor: Actor | null) {
    await currentActor(db, actor);
    const q = await consume("friend-action", actor!.id, 30, 60);
    if (!q.allowed) throw new DomainError("RATE_LIMITED", undefined, q.retryAfterSeconds);
  }
  async function dto(
    tx: Prisma.TransactionClient,
    row: Record,
    viewer: string,
  ): Promise<FriendshipDTO> {
    const other = row.userAId === viewer ? row.userB : row.userA;
    return {
      id: row.id,
      status: row.status,
      requestedById: row.requestedById,
      profile: publicProfile(other),
      online: row.status === "ACCEPTED" ? await onlineAt(tx, other.id, now()) : null,
    };
  }
  async function owned(tx: Prisma.TransactionClient, actor: Actor | null, rawId: string) {
    const user = await currentActor(tx, actor),
      id = parseInput(profileId, rawId);
    const row = await tx.friendship.findUnique({ where: { id }, include });
    if (!row) throw new DomainError("NOT_FOUND");
    if (row.userAId !== user.id && row.userBId !== user.id) throw new DomainError("FORBIDDEN");
    return { user, row };
  }
  return {
    async request(actor: Actor | null, rawId: string): Promise<FriendshipDTO> {
      const id = parseInput(profileId, rawId);
      await charge(actor);
      return withWriteRetry(() =>
        db.$transaction(async (tx) => {
          const user = await currentActor(tx, actor);
          if (id === user.id) throw new DomainError("CONFLICT");
          if (!(await tx.user.findUnique({ where: { id }, select: { id: true } })))
            throw new DomainError("NOT_FOUND");
          const [userAId, userBId] = [id, user.id].sort(),
            where = { userAId_userBId: { userAId, userBId } };
          const prior = await tx.friendship.findUnique({ where, include });
          const row =
            prior ??
            (await tx.friendship.create({
              data: { userAId, userBId, requestedById: user.id },
              include,
            }));
          return dto(tx, row, user.id);
        }),
      );
    },
    async accept(actor: Actor | null, id: string): Promise<FriendshipDTO> {
      await charge(actor);
      return withWriteRetry(() =>
        db.$transaction(async (tx) => {
          const { row, user } = await owned(tx, actor, id);
          if (row.requestedById === user.id) throw new DomainError("FORBIDDEN");
          return dto(
            tx,
            await tx.friendship.update({
              where: { id: row.id },
              data: { status: "ACCEPTED" },
              include,
            }),
            user.id,
          );
        }),
      );
    },
    async remove(actor: Actor | null, id: string): Promise<void> {
      await charge(actor);
      await withWriteRetry(() =>
        db.$transaction(async (tx) => {
          const { row } = await owned(tx, actor, id);
          await tx.friendship.delete({ where: { id: row.id } });
        }),
      );
    },
    async list(actor: Actor | null, input: unknown = {}): Promise<FriendList> {
      const query = parseInput(listSchema, input);
      return db.$transaction(async (tx) => {
        const user = await currentActor(tx, actor);
        const membership = { OR: [{ userAId: user.id }, { userBId: user.id }] };
        const where: Prisma.FriendshipWhereInput = {
          ...membership,
          status: query.kind === "accepted" ? "ACCEPTED" : "PENDING",
          ...(query.kind === "outgoing"
            ? { requestedById: user.id }
            : query.kind === "incoming"
              ? { NOT: { requestedById: user.id } }
              : {}),
        };
        const rows = await tx.friendship.findMany({
          where,
          include,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: 25,
          skip: (query.page - 1) * 25,
        });
        return {
          items: await Promise.all(rows.map((row) => dto(tx, row, user.id))),
          total: await tx.friendship.count({ where }),
          page: query.page,
          pageSize: 25,
        };
      });
    },
    async relationship(
      actor: Actor | null,
      rawId: string,
    ): Promise<{ relationship: Relationship; online: boolean | null }> {
      const id = parseInput(profileId, rawId);
      return db.$transaction(async (tx) => {
        const user = await currentActor(tx, actor);
        if (user.id === id) return { relationship: "SELF", online: await onlineAt(tx, id, now()) };
        if (!(await tx.user.findUnique({ where: { id }, select: { id: true } })))
          throw new DomainError("NOT_FOUND");
        const [userAId, userBId] = [id, user.id].sort();
        const row = await tx.friendship.findUnique({
          where: { userAId_userBId: { userAId, userBId } },
        });
        if (!row) return { relationship: "NONE", online: null };
        if (row.status === "ACCEPTED")
          return { relationship: "FRIEND", online: await onlineAt(tx, id, now()) };
        return {
          relationship: row.requestedById === user.id ? "OUTGOING" : "INCOMING",
          online: null,
        };
      });
    },
  };
}
export type FriendService = ReturnType<typeof createFriendService>;

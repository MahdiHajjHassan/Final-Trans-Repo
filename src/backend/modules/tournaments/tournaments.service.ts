import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { Actor } from "@/shared/auth";
import type { TournamentDTO, TournamentList } from "@/shared/tournaments";
import { currentActor } from "../auth/session.guard";
import { profileId } from "../profiles/profiles.service";
import { DomainError } from "../../common/errors";
import { parseInput } from "../../common/validation";
import { createRateLimiter } from "../../common/security/rate-limit";
import { invitation } from "../../common/security/invitation";
import { withWriteRetry } from "../../database/write-retry";
import {
  tournamentCreate,
  tournamentJoin,
  tournamentRevision,
  tournamentList,
} from "./dto/tournament.schema";
import { tournamentInclude, tournamentDto, type TournamentRecord } from "./tournament-view";

export function createTournamentService(db: PrismaClient, options: { code?: () => string } = {}) {
  const consume = createRateLimiter(db);
  async function limit(actor: Actor | null, scope: string, count: number) {
    await currentActor(db, actor);
    const q = await consume(scope, actor!.id, count, 60);
    if (!q.allowed) throw new DomainError("RATE_LIMITED", undefined, q.retryAfterSeconds);
  }
  async function record(tx: Prisma.TransactionClient, actor: Actor | null, rawId: string) {
    const user = await currentActor(tx, actor),
      id = parseInput(profileId, rawId);
    const row = await tx.tournament.findUnique({ where: { id }, include: tournamentInclude });
    if (!row) throw new DomainError("NOT_FOUND");
    if (row.hostId !== user.id && !row.entries.some((e) => e.userId === user.id))
      throw new DomainError("FORBIDDEN");
    return { row, user };
  }
  async function reload(tx: Prisma.TransactionClient, id: string, viewer: string) {
    return tournamentDto(
      await tx.tournament.findUniqueOrThrow({ where: { id }, include: tournamentInclude }),
      viewer,
    );
  }
  async function claim(
    tx: Prisma.TransactionClient,
    row: TournamentRecord,
    extra: Prisma.TournamentUpdateManyMutationInput = {},
  ) {
    const changed = await tx.tournament.updateMany({
      where: { id: row.id, version: row.version },
      data: { ...extra, version: { increment: 1 } },
    });
    if (changed.count !== 1) throw new DomainError("CONFLICT");
  }
  function revision(row: TournamentRecord, expected: number) {
    if (row.status !== "LOBBY" || row.version !== expected) throw new DomainError("CONFLICT");
  }
  return {
    async create(actor: Actor | null, input: unknown): Promise<TournamentDTO> {
      parseInput(tournamentCreate, input);
      await limit(actor, "tournament-create", 5);
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          return await withWriteRetry(() =>
            db.$transaction(async (tx) => {
              const user = await currentActor(tx, actor);
              const row = await tx.tournament.create({
                data: {
                  hostId: user.id,
                  joinCode: (options.code ?? invitation)(),
                  entries: { create: { slot: 1, userId: user.id } },
                },
                include: tournamentInclude,
              });
              return tournamentDto(row, user.id);
            }),
          );
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002")
            throw error;
          if (attempt === 4) throw new DomainError("CONFLICT");
        }
      }
      throw new DomainError("CONFLICT");
    },
    async join(actor: Actor | null, input: unknown): Promise<TournamentDTO> {
      const query = parseInput(tournamentJoin, input);
      await limit(actor, "tournament-join", 20);
      return withWriteRetry(() =>
        db.$transaction(async (tx) => {
          const user = await currentActor(tx, actor);
          const row = await tx.tournament.findUnique({
            where: { joinCode: query.code },
            include: tournamentInclude,
          });
          if (!row) throw new DomainError("NOT_FOUND");
          if (row.entries.some((e) => e.userId === user.id)) return tournamentDto(row, user.id);
          if (row.status !== "LOBBY" || row.entries.length >= 4) throw new DomainError("CONFLICT");
          const slot = [1, 2, 3, 4].find((s) => !row.entries.some((e) => e.slot === s))!;
          await claim(tx, row);
          await tx.tournamentEntry.create({
            data: { tournamentId: row.id, userId: user.id, slot },
          });
          return reload(tx, row.id, user.id);
        }),
      );
    },
    async read(actor: Actor | null, id: string): Promise<TournamentDTO> {
      return db.$transaction(async (tx) => {
        const { row, user } = await record(tx, actor, id);
        return tournamentDto(row, user.id);
      });
    },
    async listMine(actor: Actor | null, input: unknown = {}): Promise<TournamentList> {
      const query = parseInput(tournamentList, input);
      return db.$transaction(async (tx) => {
        const user = await currentActor(tx, actor),
          where = { entries: { some: { userId: user.id } } };
        const rows = await tx.tournament.findMany({
          where,
          include: tournamentInclude,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 10,
          skip: (query.page - 1) * 10,
        });
        return {
          items: rows.map((row) => tournamentDto(row, user.id)),
          total: await tx.tournament.count({ where }),
          page: query.page,
          pageSize: 10,
        };
      });
    },
    async start(actor: Actor | null, id: string, input: unknown): Promise<TournamentDTO> {
      const query = parseInput(tournamentRevision, input);
      await limit(actor, "tournament-lobby", 30);
      return withWriteRetry(() =>
        db.$transaction(async (tx) => {
          const { row, user } = await record(tx, actor, id);
          if (row.hostId !== user.id) throw new DomainError("FORBIDDEN");
          revision(row, query.expectedVersion);
          if (row.entries.length !== 4 || row.entries.some((e) => !e.userId))
            throw new DomainError("CONFLICT");
          for (const entry of row.entries) {
            try {
              await currentActor(tx, { id: entry.userId!, role: "MEMBER" });
            } catch {
              throw new DomainError("CONFLICT", { players: ["unavailable"] });
            }
          }
          await claim(tx, row, { status: "RUNNING" });
          for (let index = 0; index < 2; index++) {
            const a = row.entries[index * 2],
              b = row.entries[index * 2 + 1];
            const match = await tx.tournamentMatch.create({
              data: {
                tournamentId: row.id,
                slot: index === 0 ? "SF1" : "SF2",
                entryAId: a.id,
                entryBId: b.id,
                status: "ACTIVE",
                attempt: 1,
              },
            });
            await tx.game.create({
              data: {
                mode: "HUMAN",
                status: "ACTIVE",
                xId: a.userId,
                oId: b.userId,
                tournamentMatchId: match.id,
                tournamentAttempt: 1,
              },
            });
          }
          await tx.tournamentMatch.create({ data: { tournamentId: row.id, slot: "FINAL" } });
          return reload(tx, row.id, user.id);
        }),
      );
    },
    async leave(actor: Actor | null, id: string, input: unknown): Promise<void> {
      const query = parseInput(tournamentRevision, input);
      await limit(actor, "tournament-lobby", 30);
      await withWriteRetry(() =>
        db.$transaction(async (tx) => {
          const { row, user } = await record(tx, actor, id);
          revision(row, query.expectedVersion);
          if (row.hostId === user.id) throw new DomainError("CONFLICT");
          await claim(tx, row);
          await tx.tournamentEntry.deleteMany({ where: { tournamentId: row.id, userId: user.id } });
        }),
      );
    },
    async cancel(actor: Actor | null, id: string, input: unknown): Promise<TournamentDTO> {
      const query = parseInput(tournamentRevision, input);
      await limit(actor, "tournament-lobby", 30);
      return withWriteRetry(() =>
        db.$transaction(async (tx) => {
          const { row, user } = await record(tx, actor, id);
          if (row.hostId !== user.id) throw new DomainError("FORBIDDEN");
          revision(row, query.expectedVersion);
          await claim(tx, row, { status: "CANCELLED", finishedAt: new Date() });
          return reload(tx, row.id, user.id);
        }),
      );
    },
  };
}
export type TournamentService = ReturnType<typeof createTournamentService>;

import { z } from "zod";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { Actor } from "@/shared/auth";
import { displayNameSchema } from "@/shared/auth-validation";
import { currentActor } from "../auth/policy";
import { withWriteRetry } from "../db-write";
import { DomainError } from "../errors";
import { parseInput } from "../validation";
import {registerSchema} from "../auth/schema";
import {hashPassword} from "../auth/password";
import {createRateLimiter} from "../security/rate-limit";

const select = { id: true, email: true, displayName: true, role: true, createdAt: true } satisfies Prisma.UserSelect;
const patchSchema = z.object({ displayName: displayNameSchema.optional(), role: z.enum(["MEMBER", "ADMIN"]).optional() }).strict().refine((value) => Object.values(value).some((item) => item !== undefined));
const querySchema = z.object({ q: z.string().trim().max(100).optional(), page: z.coerce.number().int().min(1).max(100000).default(1) }).strict();
const idSchema = z.uuid().transform((id) => id.toLowerCase());
const createSchema=registerSchema.extend({role:z.enum(["MEMBER","ADMIN"]).default("MEMBER")});
async function administrator(tx: Prisma.TransactionClient, actor: Actor | null) {
  const current = await currentActor(tx, actor);
  if (current.role !== "ADMIN") throw new DomainError("FORBIDDEN");
  return current;
}
function dto(user: Prisma.UserGetPayload<{ select: typeof select }>) { return { ...user, createdAt: user.createdAt.toISOString() }; }
export function parseUserQuery(input: URLSearchParams) {
  if (new Set(input.keys()).size !== [...input.keys()].length) throw new DomainError("VALIDATION", { query: ["duplicate"] });
  return parseInput(querySchema, Object.fromEntries(input));
}
export function createUserService(db: PrismaClient, options: { publish?: (id: string, version: number) => void } = {}) {
  return {
    async createUser(actor:Actor|null,input:unknown){
      const data=parseInput(createSchema,input);
      await administrator(db,actor);
      const limit=await createRateLimiter(db)("admin-create",actor!.id,10,60);
      if(!limit.allowed)throw new DomainError("RATE_LIMITED",undefined,limit.retryAfterSeconds);
      const passwordHash=await hashPassword(data.password);
      try{
        return await withWriteRetry(()=>db.$transaction(async tx=>{
          await administrator(tx,actor);
          return dto(await tx.user.create({data:{email:data.email,displayName:data.displayName,role:data.role,passwordHash},select}));
        }));
      }catch(error){
        if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")throw new DomainError("CONFLICT",{email:["unavailable"]});
        throw error;
      }
    },
    async listUsers(actor: Actor | null, input: unknown = {}) {
      const query = parseInput(querySchema, input);
      return db.$transaction(async (tx) => {
        await administrator(tx, actor);
        const where: Prisma.UserWhereInput = query.q ? { OR: [{ email: { contains: query.q } }, { displayName: { contains: query.q } }] } : {};
        const items = await tx.user.findMany({ where, select, orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip: (query.page - 1) * 25, take: 25 });
        return { items: items.map(dto), total: await tx.user.count({ where }), page: query.page, pageSize: 25 as const };
      });
    },
    async updateUser(actor: Actor | null, rawId: string, input: unknown) {
      const id = parseInput(idSchema, rawId); const data = parseInput(patchSchema, input);
      return withWriteRetry(() => db.$transaction(async (tx) => {
        await administrator(tx, actor);
        const target = await tx.user.findUnique({ where: { id }, select: { role: true } });
        if (!target) throw new DomainError("NOT_FOUND");
        if (target.role === "ADMIN" && data.role === "MEMBER" && await tx.user.count({ where: { role: "ADMIN" } }) <= 1) throw new DomainError("CONFLICT", { role: ["last_admin"] });
        const user = await tx.user.update({ where: { id }, data, select });
        return dto(user);
      }));
    },
    async deleteUser(actor: Actor | null, rawId: string): Promise<void> {
      const id = parseInput(idSchema, rawId);
      const changed = await withWriteRetry(() => db.$transaction(async (tx) => {
        await administrator(tx, actor);
        const target = await tx.user.findUnique({ where: { id }, select: { role: true, displayName: true } });
        if (!target) throw new DomainError("NOT_FOUND");
        if (target.role === "ADMIN" && await tx.user.count({ where: { role: "ADMIN" } }) <= 1) throw new DomainError("CONFLICT", { role: ["last_admin"] });
        const games = await tx.game.findMany({ where: { OR: [{xId:id},{oId:id}] } });
        for (const game of games) await tx.game.update({where:{id:game.id},data:{
          ...(game.status==="WAITING"||game.status==="ACTIVE"?{
          status:game.status==="WAITING"?"CANCELLED":"FINISHED",turn:null,
          winner:game.status==="WAITING"?null:game.xId===id?"O":"X",
          reason:game.status==="WAITING"?null:"ACCOUNT_DELETED",
          finishedAt:new Date()}:{}),version:{increment:1},
        }});
        await tx.user.delete({ where: { id } });
        return games.map(game=>({id:game.id,version:game.version+1}));
      }));
      for (const game of changed) options.publish?.(game.id,game.version);
    },
  };
}

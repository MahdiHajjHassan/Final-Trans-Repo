import { afterEach, expect, test } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
async function fixture() {
  const { db, url, close } = await createTestDb(); cleanup.push(close);
  const { createUserService } = await import("@/server/users/service");
  const admin = await seedUser(db, { role: "ADMIN" }); const member = await seedUser(db);
  return { db, url, users: createUserService(db), admin: admin.actor, member: member.actor };
}

test("admin creates validated member/admin accounts with hashed passwords; current role and uniqueness are enforced",async()=>{
  const {db,users,admin,member}=await fixture();
  const input={email:" NEW@example.test ",displayName:" New player ",password:"private-test-password",role:"MEMBER"};
  await expect(users.createUser(member,input)).rejects.toMatchObject({code:"FORBIDDEN"});
  await expect(users.createUser({...member,role:"ADMIN"},input)).rejects.toMatchObject({code:"FORBIDDEN"});
  const created=await users.createUser(admin,input);
  expect(created).toMatchObject({email:"new@example.test",displayName:"New player",role:"MEMBER"});
  expect(created).not.toHaveProperty("passwordHash");
  const saved=await db.user.findUniqueOrThrow({where:{id:created.id}});
  const {verifyPassword}=await import("@/server/auth/password");
  expect(await verifyPassword(saved.passwordHash,input.password)).toBe(true);
  expect(saved.passwordHash).not.toBe(input.password);
  await expect(users.createUser(admin,input)).rejects.toMatchObject({code:"CONFLICT"});
  for(const patch of [{password:"short"},{email:"bad"},{role:"OWNER"},{extra:"injected"}])await expect(users.createUser(admin,{...input,...patch})).rejects.toMatchObject({code:"VALIDATION"});
  expect(await users.createUser(admin,{...input,email:"second@example.test",role:"ADMIN"})).toMatchObject({role:"ADMIN"});
});
test("admin can list/update roles; member and forged/demoted admin are forbidden", async () => {
  const { db, users, admin, member } = await fixture();
  await expect(users.listUsers(member)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(users.updateUser({ ...member, role: "ADMIN" }, member.id, { role: "ADMIN" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  const result = await users.listUsers(admin);
  expect(result.total).toBe(2); expect(result.items[0]).not.toHaveProperty("passwordHash");
  expect(await users.updateUser(admin, member.id, { role: "ADMIN", displayName: "Promoted" })).toMatchObject({ role: "ADMIN", displayName: "Promoted" });
  await db.user.update({ where: { id: admin.id }, data: { role: "MEMBER" } });
  await expect(users.listUsers(admin)).rejects.toMatchObject({ code: "FORBIDDEN" });
});
test("last admin cannot be deleted/demoted and privileged or empty patches are rejected", async () => {
  const { db, users, admin } = await fixture();
  await expect(users.deleteUser(admin, admin.id)).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(users.updateUser(admin, admin.id, { role: "MEMBER" })).rejects.toMatchObject({ code: "CONFLICT" });
  for (const patch of [{}, { email: "changed@example.test" }, { passwordHash: "forged" }, { displayName: " " }]) await expect(users.updateUser(admin, admin.id, patch)).rejects.toMatchObject({ code: "VALIDATION" });
  expect(await db.user.count({ where: { role: "ADMIN" } })).toBe(1);
});
test("deleting a member revokes sessions and preserves anonymized games and other players", async () => {
  const { db, users, admin, member } = await fixture();
  const { createSessionToken } = await import("@/server/auth/session");
  await createSessionToken(db, member.id, new Date());
  await db.game.create({data:{mode:"AI",xId:member.id,status:"ACTIVE"}});
  await db.game.create({data:{mode:"AI",xId:admin.id,status:"ACTIVE"}});
  await users.deleteUser(admin, member.id);
  expect(await db.session.count({ where: { userId: member.id } })).toBe(0);
  expect(await db.game.count({where:{xId:member.id}})).toBe(0);
  expect(await db.game.count({where:{xId:admin.id}})).toBe(1);
  expect(await db.game.count()).toBe(2);
});
test("competing administrators using separate connections cannot remove the final admin", async () => {
  const { db, url, users, admin } = await fixture(); const other = await seedUser(db, { role: "ADMIN" });
  const { createDb } = await import("@/server/db"); const secondDb = await createDb(url); cleanup.push(() => secondDb.$disconnect());
  const { createUserService } = await import("@/server/users/service"); const second = createUserService(secondDb);
  const outcomes = await Promise.allSettled([users.updateUser(admin, admin.id, { role: "MEMBER" }), second.deleteUser(other.actor, other.actor.id)]);
  expect(outcomes.filter((item) => item.status === "fulfilled")).toHaveLength(1);
  expect(await db.user.count({ where: { role: "ADMIN" } })).toBe(1);
});

test.each(["\ud800", "\udc00"])("admin updates reject malformed names %j without changing the user", async (displayName) => {
  const { db, users, admin, member } = await fixture();
  await expect(users.updateUser(admin, member.id, { displayName })).rejects.toMatchObject({ code: "VALIDATION" });
  expect((await db.user.findUniqueOrThrow({ where: { id: member.id } })).displayName).toBe("Test member");
});

test.each([{ displayName: "Invalid\ud800" }, { password: "correct-password-\ud800" }])("admin account creation rejects malformed fields %j", async (invalid) => {
  const { db, users, admin } = await fixture();
  await expect(users.createUser(admin, { email: "new@example.test", displayName: "Valid name", password: "correct-password-for-tests", ...invalid })).rejects.toMatchObject({ code: "VALIDATION" });
  expect(await db.user.count()).toBe(2);
});

test("admin mutations resolve valid uppercase user identifiers", async () => {
  const { db, users, admin, member } = await fixture();
  const id = "cccccccc-dddd-4eee-8fff-aaaaaaaaaaaa";
  await db.user.update({ where: { id: member.id }, data: { id } });
  await expect(users.updateUser(admin, id.toUpperCase(), { displayName: "Renamed" })).resolves.toMatchObject({ id, displayName: "Renamed" });
  await users.deleteUser(admin, id.toUpperCase());
  expect(await db.user.findUnique({ where: { id } })).toBeNull();
});

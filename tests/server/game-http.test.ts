import { test,expect } from "vitest";
import { createTestDb } from "../helpers/db";
import { seedUser } from "../helpers/fixtures";
import { createAuthService } from "@/server/auth/service";
import { createSessionToken } from "@/server/auth/session";
import { sessionCookieName } from "@/server/auth/policy";
import { createGameService } from "@/server/games/service";
import { createGameHandlers } from "@/server/games/http";
test("HTTPS game handlers enforce origin, session, bounded inputs and version conflicts",async()=>{
  const f=await createTestDb();
  try{
    const user=await seedUser(f.db), session=await createSessionToken(f.db,user.actor.id,new Date());
    const handlers=createGameHandlers(createGameService(f.db,{random:()=>0}),createAuthService(f.db),{appOrigin:"https://localhost"});
    function request(data:unknown,origin="https://localhost",signed=true) {return new Request("https://localhost/api/games",{method:"POST",headers:{"Content-Type":"application/json",Origin:origin,...(signed?{Cookie:sessionCookieName+"="+session.token}:{})},body:JSON.stringify(data)});}
    expect((await handlers.create(request({mode:"AI"},"https://attacker.example"))).status).toBe(403);
    expect((await handlers.create(request({mode:"AI"},"https://localhost",false))).status).toBe(401);
    expect((await handlers.create(request({mode:"AI",winner:"X"}))).status).toBe(400);
    const created=await handlers.create(request({mode:"AI"}));expect(created.status).toBe(201);
    const {data}=await created.json();
    const moved=await handlers.move(request({cell:0,expectedVersion:1}),data.game.id);expect(moved.status).toBe(200);
    expect((await handlers.move(request({cell:1,expectedVersion:1}),data.game.id)).status).toBe(409);
    const response=await moved.json();expect(response.data.cells[4]).toBe("O");
    expect(JSON.stringify(response)).not.toContain(user.email);
  }finally{await f.close();}
});

import type { AuthService } from "../auth/service";
import { requestActor } from "../auth/policy";
import type { ServerConfig } from "../config";
import { DomainError } from "../errors";
import { handleApi,jsonData } from "../api/http";
import { readJson,requireSameOrigin } from "../security/origin";
import type { GameService } from "./service";
export function createGameHandlers(games:GameService,auth:AuthService,config:Pick<ServerConfig,"appOrigin">) {
  const actor=(request:Request)=>requestActor(request,auth);
  async function body(request:Request){requireSameOrigin(request,config.appOrigin);return readJson(request);}
  return {
    create:(request:Request)=>handleApi(async()=>{const input=await body(request);return jsonData(await games.create(await actor(request),input),201);}),
    join:(request:Request)=>handleApi(async()=>{const input=await body(request);return jsonData(await games.join(await actor(request),input));}),
    read:(request:Request,id:string)=>handleApi(async()=>jsonData(await games.read(await actor(request),id))),
    list:(request:Request)=>handleApi(async()=>{
      const params=new URL(request.url).searchParams;
      if(new Set(params.keys()).size!==[...params.keys()].length)throw new DomainError("VALIDATION");
      return jsonData(await games.listMine(await actor(request),Object.fromEntries(params)));
    }),
    move:(request:Request,id:string)=>handleApi(async()=>{const input=await body(request);return jsonData(await games.move(await actor(request),id,input));}),
    resign:(request:Request,id:string)=>handleApi(async()=>{const input=await body(request);return jsonData(await games.resign(await actor(request),id,input));}),
    cancel:(request:Request,id:string)=>handleApi(async()=>{const input=await body(request);return jsonData(await games.cancel(await actor(request),id,input));}),
  };
}

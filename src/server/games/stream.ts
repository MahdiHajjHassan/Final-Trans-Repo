import type { AuthService } from "../auth/service";
import { readSessionToken } from "../auth/policy";
import { DomainError } from "../errors";
import type { GameService } from "./service";
import { gameEvents, type createGameEvents } from "./events";
export async function createGameStream(request:Request,id:string,dependencies:{auth:AuthService;games:GameService;events?:ReturnType<typeof createGameEvents>}) {
  const {auth,games}=dependencies,events=dependencies.events??gameEvents;
  const token=readSessionToken(request),actor=await auth.resolveSession(token);
  if(!actor)throw new DomainError("UNAUTHENTICATED");
  const canonicalId=(await games.read(actor,id)).game.id;
  const release=events.acquire(actor.id),encoder=new TextEncoder();
  let closed=false,seen=0,unsubscribe:()=>void=()=>{},interval:ReturnType<typeof setInterval>|undefined;
  let controller:ReadableStreamDefaultController<Uint8Array>;
  function finish() {
    if(closed)return;closed=true;unsubscribe();release();clearInterval(interval);
    request.signal.removeEventListener("abort",finish);
    try{controller?.close();}catch{}
  }
  function send(text:string) {if(!closed)controller.enqueue(encoder.encode(text));}
  let queue=Promise.resolve();
  function refresh() {
    queue=queue.then(async()=>{
      if(closed)return;
      const current=await auth.resolveSession(token);
      if(closed)return;
      if(!current)throw new DomainError("UNAUTHENTICATED");
      const {game}=await games.read(current,canonicalId);
      if(closed)return;
      if(game.version>seen){seen=game.version;send("id: "+game.version+"\nevent: state\ndata: "+JSON.stringify(game)+"\nretry: 2000\n\n");}
      else send(": heartbeat\n\n");
    }).catch(error=>{
      if(closed)return;
      const code=error instanceof DomainError?error.code:"INTERNAL";
      send("event: "+(["UNAUTHENTICATED","FORBIDDEN"].includes(code)?"access-lost":"reconnect")+"\ndata: "+JSON.stringify({code})+"\n\n");
      finish();
    });
  }
  const stream=new ReadableStream<Uint8Array>({
    start(value){controller=value;unsubscribe=events.subscribe(canonicalId,refresh);interval=setInterval(refresh,15000);request.signal.addEventListener("abort",finish,{once:true});if(request.signal.aborted)finish();else refresh();},
    cancel(){finish();},
  });
  return new Response(stream,{headers:{"Content-Type":"text/event-stream","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}

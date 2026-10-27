import "dotenv/config";
import {request} from "node:https";
import {readFile} from "node:fs/promises";
export const origin=process.env.APP_ORIGIN??"https://localhost";
if(new URL(origin).protocol!=="https:")throw new Error("Game smoke requires HTTPS");
const ca=await readFile(process.env.TICTACTOE_CA_FILE??"local-certs/root.crt");
export function call(path,{method="GET",body,cookie}={}){
  const encoded=body===undefined?undefined:JSON.stringify(body);
  return new Promise((resolve,reject)=>{
    const req=request(new URL(path,origin),{method,ca,rejectUnauthorized:true,timeout:10000,headers:{
      Origin:origin,...(encoded?{"Content-Type":"application/json","Content-Length":Buffer.byteLength(encoded)}:{}),...(cookie?{Cookie:cookie}:{})
    }},res=>{
      let text="";res.on("data",chunk=>text+=chunk);
      res.on("end",()=>{try{resolve({status:res.statusCode,headers:res.headers,data:text?JSON.parse(text).data:undefined});}catch{reject(new Error("Invalid response; body omitted"));}});
    });
    req.on("error",reject);req.on("timeout",()=>req.destroy(new Error("Verified HTTPS request timed out")));req.end(encoded);
  });
}
export async function login(credentials){
  const result=await call("/api/auth/login",{method:"POST",body:credentials});
  if(result.status!==200)throw new Error("Smoke sign-in failed; credentials omitted");
  const cookie=result.headers["set-cookie"]?.[0]?.split(";")[0];
  if(!cookie)throw new Error("Session cookie missing");
  return {cookie,account:result.data};
}

import {readFileSync,existsSync} from "node:fs";
import {parse} from "dotenv";
export function redactLog(text,files=[".env",".env.e2e"]){
  for(const file of files)if(existsSync(file)){
    const values=parse(readFileSync(file));
    for(const key of ["ADMIN_PASSWORD","PUBLIC_API_KEY"])if(values[key])text=text.split(values[key]).join("[REDACTED]");
  }
  return text.replace(/\b[a-f0-9]{40,128}\b/gi,"[REDACTED]").replace(/\$argon2[^\s"']+/g,"[REDACTED HASH]");
}
if(process.argv[1]?.endsWith("report.mjs")){
  const file=process.argv[2];if(!file)throw new Error("Pass a local log path");
  console.log(redactLog(readFileSync(file,"utf8")).split(/\r?\n/).slice(-Number(process.argv[3]??50)).join("\n"));
}

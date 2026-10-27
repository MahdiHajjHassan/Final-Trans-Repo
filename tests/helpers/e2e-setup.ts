import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { request } from "node:https";
import { testSettings, runTestCommand, composeArgs } from "./e2e-environment";

export default async function setup() {
  let settings = testSettings();
  if (!existsSync(settings.envFile)) runTestCommand("node", ["--", "scripts/setup.mjs", "--env-file", settings.envFile, "--port", String(settings.port)]);
  settings = testSettings();
  if (settings.values.APP_ORIGIN !== `https://localhost:${settings.port}` || settings.values.HTTPS_PORT !== String(settings.port)) throw new Error("Test environment URL/port mismatch; normal environment is never overwritten");
  const image = process.env.TICTACTOE_E2E_IMAGE;
  if (image) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/.test(image)) throw new Error("Invalid local test image name");
    runTestCommand("docker", ["tag", image, `${settings.project}-app`]);
  }
  runTestCommand("docker", composeArgs(["up", image ? "--no-build" : "--build", "-d", "--force-recreate", "--wait"]));
  mkdirSync("local-certs", { recursive: true });
  const certificate = resolve(`local-certs/${settings.project}.crt`);
  // Read through exec: some Linux Docker hosts refuse `compose cp` from a container with read-only bind mounts.
  writeFileSync(certificate, runTestCommand("docker", composeArgs(["exec", "-T", "proxy", "cat", "/data/caddy/pki/authorities/local/root.crt"])));
  // APIRequestContext runs in Node workers, which need the same public CA at startup.
  const bundle=resolve(`local-certs/${settings.project}-node.pem`);
  const previous=process.env.NODE_EXTRA_CA_CERTS;
  writeFileSync(bundle,(previous&&existsSync(previous)?readFileSync(previous,"utf8")+"\n":"")+readFileSync(certificate,"utf8"));
  process.env.NODE_EXTRA_CA_CERTS=bundle;
  await new Promise<void>((done, reject) => {
    const req = request(`${settings.values.APP_ORIGIN}/api/health`, { ca: readFileSync(certificate), rejectUnauthorized: true, timeout: 10000 }, (res) => {
      let body = ""; res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => { if (res.statusCode === 200 && body === '{"status":"ok","database":"ok"}') done(); else reject(new Error("Test HTTPS readiness failed")); });
    });
    req.on("error", reject); req.on("timeout", () => req.destroy(new Error("Test TLS timeout"))); req.end();
  });
  if(process.platform==="win32"){
    const trustCommand="$ca=[System.Security.Cryptography.X509Certificates.X509Certificate2]::new($env:TICTACTOE_E2E_CERT); $target='Cert:\\CurrentUser\\Root\\'+$ca.Thumbprint; if(-not(Test-Path -LiteralPath $target)){Import-Certificate -FilePath $env:TICTACTOE_E2E_CERT -CertStoreLocation Cert:\\CurrentUser\\Root | Out-Null}; if(-not(Test-Path -LiteralPath $target)){throw 'Public test CA trust was not accepted'}";
    const trustEnv={...process.env};
    for(const key of Object.keys(trustEnv))if(key.toLowerCase()==="psmodulepath")delete trustEnv[key];
    trustEnv.PSModulePath=resolve(process.env.SystemRoot!,"System32/WindowsPowerShell/v1.0/Modules");
    const trusted=spawnSync("powershell.exe",["-NoProfile","-NonInteractive","-Command",trustCommand],{encoding:"utf8",env:{...trustEnv,TICTACTOE_E2E_CERT:certificate}});
    if(trusted.status!==0)throw new Error("Cannot trust the isolated test instance public CA: "+(trusted.stderr??""));
  }
  console.log("Isolated game test application ready; real CA chain/hostname verified and browser TLS validation enabled.");
}

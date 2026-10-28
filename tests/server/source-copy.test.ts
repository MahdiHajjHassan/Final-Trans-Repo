import {test,expect} from "vitest";
import {mkdtemp,writeFile,readFile,mkdir,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";

test("working-source export includes uncommitted additions and edits, omits deletions and ignored credentials",async()=>{
  const root=await mkdtemp(join(tmpdir(),"game-source-test-"));
  const source=join(root,"source"),target=join(root,"copy");await mkdir(source);
  spawnSync("git",["init","-q",source]);
  await writeFile(join(source,".gitignore"),".env\nnode_modules/\n");
  await writeFile(join(source,"edited.ts"),"old");
  await writeFile(join(source,"deleted.ts"),"gone");
  spawnSync("git",["-C",source,"add","."]);
  await writeFile(join(source,"edited.ts"),"changed\n");
  await writeFile(join(source,"new.ts"),"new\n");
  await writeFile(join(source,".env"),"ADMIN_PASSWORD=private-fixture\n");
  const {unlink}=await import("node:fs/promises");await unlink(join(source,"deleted.ts"));
  const {copyWorkingSource,sourceFiles}=await import("../../scripts/lib/source.mjs");
  const manifest=await copyWorkingSource(source,target);
  expect(await readFile(join(target,"edited.ts"),"utf8")).toBe("changed\n");
  expect(await readFile(join(target,"new.ts"),"utf8")).toBe("new\n");
  expect(manifest.files.map((f:{path:string})=>f.path).sort()).toEqual([".gitignore","edited.ts","new.ts"]);
  expect(await sourceFiles(target)).toEqual(manifest.files.map((f:{path:string})=>f.path));
  await writeFile(join(target,"new.ts"),"tampered");
  await expect(sourceFiles(target)).rejects.toThrow(/integrity/i);
});

test("working-source export handles a tracked route directory replaced by a static file",async()=>{
  const root=await mkdtemp(join(tmpdir(),"game-static-source-test-"));
  const source=join(root,"source"),target=join(root,"copy");
  try{
    await mkdir(join(source,"icon"),{recursive:true});
    spawnSync("git",["init","-q",source]);
    await writeFile(join(source,"icon","route.ts"),"old route");
    spawnSync("git",["-C",source,"add","."]);
    await rm(join(source,"icon"),{recursive:true});
    const bytes=Buffer.from([0,0,1,0,1,0]);
    await writeFile(join(source,"icon"),bytes);
    const {copyWorkingSource,sourceFiles}=await import("../../scripts/lib/source.mjs");
    const manifest=await copyWorkingSource(source,target);
    expect(manifest.files.map((f:{path:string})=>f.path)).toEqual(["icon"]);
    expect(await readFile(join(target,"icon"))).toEqual(bytes);
    expect(await sourceFiles(target)).toEqual(["icon"]);
  }finally{await rm(root,{recursive:true,force:true});}
});

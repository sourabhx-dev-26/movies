import assert from "node:assert/strict";
import { readFileSync,writeFileSync,mkdirSync,readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import ts from "typescript";
import { generateKeyPair,exportJWK,SignJWT } from "jose";

const directory=path.resolve(".sites-runtime/checks");mkdirSync(directory,{recursive:true});
for(const name of ["config","validation","server-auth"]){
  const source=readFileSync(`lib/${name}.ts`,"utf8");
  const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace('from "./config"','from "./config.mjs"').replace(/^import siteConfig from .*;$/m,`const siteConfig=${readFileSync("lib/site-config.json","utf8")};`);
  writeFileSync(path.join(directory,`${name}.mjs`),output);
}
const {movieInput,driveIdFromLink,indiaDay,elapsedDays}=await import(pathToFileURL(path.join(directory,"validation.mjs")));
const valid={title:"A film",watchUrl:"https://example.com/watch",driveFileId:"abcdefghijklmno",published:1};
assert(movieInput.safeParse(valid).success);
for(const watchUrl of ["javascript:alert(1)","data:text/html,hi","https://user:pass@example.com"]){assert(!movieInput.safeParse({...valid,watchUrl}).success);}
assert(!movieInput.safeParse({...valid,title:"   "}).success);
assert(!movieInput.safeParse({...valid,driveFileId:"../private"}).success);
assert.equal(driveIdFromLink("https://drive.google.com/file/d/abcdefghijklmno/view"),valid.driveFileId);
assert.equal(driveIdFromLink("https://evil.example/file/d/abcdefghijklmno/view"),"");
assert.equal(indiaDay(new Date("2026-10-04T18:29:59Z")),"2026-10-04");
assert.equal(indiaDay(new Date("2026-10-04T18:30:00Z")),"2026-10-05");
assert.equal(elapsedDays("2026-10-01","2026-10-05"),5);
console.log("PASS: Watch-link validation, Drive-link validation, Indian midnight and average day range");

const {privateKey,publicKey}=await generateKeyPair("RS256");const jwk=await exportJWK(publicKey);jwk.kid="test-key";jwk.alg="RS256";jwk.use="sig";
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>String(url).includes("service_accounts/v1/jwk/securetoken")?Response.json({keys:[jwk]},{headers:{"Cache-Control":"public,max-age=3600"}}):realFetch(url,options);
const {requireAdmin,requireSameOrigin}=await import(pathToFileURL(path.join(directory,"server-auth.mjs")));
async function token(overrides={},options={}){
  return new SignJWT({email:"anuj8160507@gmail.com",email_verified:true,...overrides}).setProtectedHeader({alg:"RS256",kid:"test-key"}).setSubject("admin-test-uid").setIssuedAt().setIssuer("https://securetoken.google.com/movies-788c7").setAudience(options.audience||"movies-788c7").setExpirationTime(options.expiration||"5m").sign(privateKey);
}
const request=jwt=>new Request("https://movies.example/api/movies",{headers:jwt?{Authorization:`Bearer ${jwt}`}:{}});
assert.equal((await requireAdmin(request(await token()))).sub,"admin-test-uid");
await assert.rejects(()=>requireAdmin(request()),error=>error.status===401);
await assert.rejects(async()=>requireAdmin(request(await token({email:"other@example.com"}))),error=>error.status===403);
await assert.rejects(async()=>requireAdmin(request(await token({email_verified:false}))),error=>error.status===403);
await assert.rejects(async()=>requireAdmin(request(await token({}, {audience:"other-project"}))),error=>error.status===401);
await assert.rejects(async()=>requireAdmin(request(await token({}, {expiration:Math.floor(Date.now()/1000)-60}))),error=>error.status===401);
const correct=await token();const segments=correct.split(".");segments[2]=(segments[2][0]==="A"?"B":"A")+segments[2].slice(1);
await assert.rejects(()=>requireAdmin(request(segments.join("."))),error=>error.status===401);
assert.throws(()=>requireSameOrigin(new Request("https://movies.example/api/movies",{headers:{Origin:"https://evil.example"}})),error=>error.status===403);
requireSameOrigin(new Request("https://movies.example/api/movies",{headers:{Origin:"https://movies.example"}}));
requireSameOrigin(new Request("https://movies.example/api/movies",{headers:{Origin:"https://movies-for-you-admin.rrbgroupd9155.chatgpt.site"}}));
console.log("PASS: signed admin identity; rejected missing, forged, expired, wrong-project, unverified and non-admin identities; rejected cross-origin writes");
globalThis.fetch=realFetch;

const sqlFiles=readdirSync("drizzle").filter(name=>name.endsWith(".sql"));assert(sqlFiles.length,"Generate the schema migrations before verification.");
const db=new DatabaseSync(":memory:");for(const file of sqlFiles)db.exec(readFileSync(`drizzle/${file}`,"utf8"));
function visit(id,day){db.exec("BEGIN");try{db.prepare("INSERT OR IGNORE INTO visit_sessions (id,day) VALUES (?,?)").run(`${day}:${id}`,day);db.prepare("INSERT INTO daily_visits (day,visits) SELECT ?,1 WHERE changes()=1 ON CONFLICT(day) DO UPDATE SET visits=visits+1").run(day);db.exec("COMMIT");}catch(e){db.exec("ROLLBACK");throw e;}}
visit("browser-1","2026-10-04");visit("browser-1","2026-10-04");visit("browser-2","2026-10-04");visit("browser-1","2026-10-05");
assert.equal(db.prepare("SELECT visits FROM daily_visits WHERE day=?").get("2026-10-04").visits,2);
assert.equal(db.prepare("SELECT visits FROM daily_visits WHERE day=?").get("2026-10-05").visits,1);
assert.equal(db.prepare("SELECT SUM(visits) AS total FROM daily_visits").get().total,3);
db.close();console.log("PASS: real SQLite migrations, refresh deduplication, new visitors and midnight counting");

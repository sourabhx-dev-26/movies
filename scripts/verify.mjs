import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import ts from "typescript";
import { build } from "esbuild";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { MemoryFirestore } from "./test-firestore.mjs";

const directory=path.resolve(".local/checks");mkdirSync(directory,{recursive:true});
for(const name of ["config","validation","server-auth","firestore-store"]){
  const source=readFileSync("lib/"+name+".ts","utf8");
  const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from "\.\/(config|types|validation|server-auth)"/g,'from "./$1.mjs"').replace(/^import siteConfig from .*;$/m,"const siteConfig="+readFileSync("lib/site-config.json","utf8")+";");
  writeFileSync(path.join(directory,name+".mjs"),output);
}
const validation=await import(pathToFileURL(path.join(directory,"validation.mjs")));
const valid={title:"A film",watchUrl:"https://example.com/watch",driveFileId:"abcdefghijklmno",published:1};
assert(validation.movieInput.safeParse(valid).success);
for(const watchUrl of ["javascript:alert(1)","data:text/html,hi","https://user:pass@example.com"])assert(!validation.movieInput.safeParse({...valid,watchUrl}).success);
assert.equal(validation.driveIdFromLink("https://drive.google.com/file/d/abcdefghijklmno/view"),valid.driveFileId);
assert.equal(validation.driveIdFromLink("https://evil.example/file/d/abcdefghijklmno/view"),"");
assert.equal(validation.indiaDay(new Date("2026-10-04T18:29:59Z")),"2026-10-04");
assert.equal(validation.indiaDay(new Date("2026-10-04T18:30:00Z")),"2026-10-05");

const {publicKey,privateKey}=await generateKeyPair("RS256");
const jwk=await exportJWK(publicKey);jwk.kid="test-key";jwk.alg="RS256";
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
  if(String(url).includes("service_accounts/v1/jwk/securetoken"))return Response.json({keys:[jwk]},{headers:{"Cache-Control":"public,max-age=3600"}});
  if(String(url).includes("www.googleapis.com/drive/v3/files/"))return new Response(new Uint8Array([1,2,3]),{headers:{"Content-Type":"image/png"}});
  throw new Error("Unexpected external request in local verification");
};
try{
  const {requireAdmin,requireSameOrigin}=await import(pathToFileURL(path.join(directory,"server-auth.mjs")));
  async function token(overrides={},options={}){
    return new SignJWT({email:"anuj8160507@gmail.com",email_verified:true,firebase:{sign_in_provider:"password"},...overrides}).setProtectedHeader({alg:"RS256",kid:"test-key"}).setSubject("admin-test-uid").setIssuedAt().setIssuer("https://securetoken.google.com/movies-788c7").setAudience(options.audience||"movies-788c7").setExpirationTime(options.expiration||"5m").sign(privateKey);
  }
  const request=jwt=>new Request("https://movies.example/api/movies",{headers:jwt?{Authorization:"Bearer "+jwt}:{}});
  const validToken=await token();
  assert.equal((await requireAdmin(request(validToken))).sub,"admin-test-uid");
  await assert.rejects(()=>requireAdmin(request()),error=>error.status===401);
  for(const [claim,status]of [[{email:"other@example.com"},403],[{email_verified:false},403],[{firebase:{sign_in_provider:"google.com"}},401],[{firebase:undefined},401]]){
    await assert.rejects(async()=>requireAdmin(request(await token(claim))),error=>error.status===status);
  }
  await assert.rejects(async()=>requireAdmin(request(await token({},{audience:"other-project"}))),error=>error.status===401);
  await assert.rejects(async()=>requireAdmin(request(await token({},{expiration:Math.floor(Date.now()/1000)-60}))),error=>error.status===401);
  const parts=validToken.split(".");parts[2]=(parts[2][0]==="A"?"B":"A")+parts[2].slice(1);
  await assert.rejects(()=>requireAdmin(request(parts.join("."))),error=>error.status===401);
  assert.throws(()=>requireSameOrigin(new Request("https://movies.example/api/movies",{headers:{Origin:"https://evil.example"}})),error=>error.status===403);
  requireSameOrigin(new Request("https://movies.example/api/movies",{headers:{Origin:"https://movies.example"}}));
  console.log("PASS: safe links, India day boundaries, verified password-only admin identity; Google, forged, expired and wrong-account tokens rejected");

  const {createMovieStore}=await import(pathToFileURL(path.join(directory,"firestore-store.mjs")));
  const db=new MemoryFirestore(),store=createMovieStore(db);
  const visible=await store.createMovie(valid),hidden=await store.createMovie({...valid,title:"Hidden",published:0});
  assert.equal((await store.listMovies(false)).length,1);
  assert.equal((await store.listMovies(true)).length,2);
  const createdAt=(await store.getMovie(visible)).createdAt;
  await store.updateMovie(visible,{...valid,title:"Updated",published:0});
  assert.equal((await store.getMovie(visible)).createdAt,createdAt);
  assert.equal((await store.listMovies(false)).length,0);
  await store.deleteMovie(hidden);
  await assert.rejects(()=>store.updateMovie(hidden,valid),error=>error.status===404);
  await assert.rejects(()=>store.deleteMovie(hidden),error=>error.status===404);
  await store.updateMovie(visible,valid);
  await Promise.all(Array.from({length:10},()=>store.recordVisit("browser-1","2026-10-04")));
  await store.recordVisit("browser-2","2026-10-04");
  await store.recordVisit("browser-1","2026-10-05");
  const stats=await store.stats(new Date("2026-10-05T10:00:00Z"));
  assert.equal(stats.total,3);assert.equal(stats.today,1);assert.equal(stats.average,1.5);assert.equal(stats.daily.length,30);
  assert.equal((await store.stats(new Date("2026-10-06T10:00:00Z"))).average,1);
  db.records.set("visit_sessions/old",{day:"2026-01-01"});
  await store.pruneSessions(new Date("2026-10-05T10:00:00Z"));
  assert(!db.records.has("visit_sessions/old"));assert.equal((await store.stats(new Date("2026-10-05T10:00:00Z"))).total,3);
  const fullDb=new MemoryFirestore(),fullStore=createMovieStore(fullDb);
  for(let i=0;i<199;i++)fullDb.records.set("movies/seed-"+i,{...valid,createdAt:i,updatedAt:i});
  const competing=await Promise.allSettled([fullStore.createMovie(valid),fullStore.createMovie(valid)]);
  assert.equal(competing.filter(result=>result.status==="fulfilled").length,1);
  assert.equal(competing.find(result=>result.status==="rejected").reason.status,400);
  assert.equal((await fullStore.listMovies(true)).length,200);
  await fullStore.deleteMovie(competing.find(result=>result.status==="fulfilled").value);
  await fullStore.createMovie(valid);
  console.log("PASS: Firestore store mock — visibility, CRUD, atomic 200-movie cap, concurrent visit deduplication, day rollover, averages and cleanup");

  globalThis.__TEST_STORE__=store;
  await build({entryPoints:["lib/server.ts"],outfile:path.join(directory,"routes.mjs"),bundle:true,format:"esm",platform:"node",packages:"external",plugins:[{name:"test-database",setup(builder){builder.onLoad({filter:/[\\/]lib[\\/]database\.ts$/},()=>({contents:"export function database(){return globalThis.__TEST_STORE__;}",loader:"js"}));}}]});
  const {handleApiRequest}=await import(pathToFileURL(path.join(directory,"routes.mjs")));
  const config=JSON.parse(readFileSync("lib/site-config.json","utf8"));
  const admin=config.role==="admin",base=admin?"https://admin.example":"https://movies.example";
  const api=(route,method="GET",body,authenticated=true,extra={})=>new Request(base+route,{method,headers:{...(method!=="GET"?{Origin:base}:{}),...(authenticated?{Authorization:"Bearer "+validToken}:{}),"Content-Type":"application/json",...extra},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal((await handleApiRequest(api("/api/movies?admin=1","GET",undefined,false))).status,401);
  assert.equal((await handleApiRequest(api("/api/movies","GET",undefined,true,{Origin:"https://evil.example"}))).status,403);
  const catalog=await handleApiRequest(api("/api/entry?route=movies"));
  assert.equal(catalog.status,200);assert.equal((await catalog.json()).movies.length,1);
  if(admin){
    assert.equal((await handleApiRequest(api("/api/stats","GET",undefined,false))).status,401);
    assert.equal((await handleApiRequest(api("/api/movies","POST",valid,false))).status,401);
    assert.equal((await handleApiRequest(api("/api/movies","POST",{...valid,watchUrl:"javascript:alert(1)"}))).status,400);
    const saved=await handleApiRequest(api("/api/movies","POST",valid));
    assert.equal(saved.status,201);const id=(await saved.json()).id;
    assert.equal((await handleApiRequest(api("/api/movies/"+id,"PUT",{...valid,published:0}))).status,200);
    assert.equal((await handleApiRequest(api("/api/movies/"+id,"DELETE"))).status,200);
    assert.equal((await handleApiRequest(api("/api/stats"))).status,200);
  }else{
    assert.equal((await handleApiRequest(api("/api/movies","POST",valid))).status,404);
    assert.equal((await handleApiRequest(api("/api/stats"))).status,404);
    const visit=await handleApiRequest(api("/api/visit","POST",undefined,false,{"User-Agent":"BrowserTest"}));
    assert.equal(visit.status,204);
    const cookie=visit.headers.get("set-cookie");assert.match(cookie,/HttpOnly/);
    const before=(await store.stats()).total;
    assert.equal((await handleApiRequest(api("/api/visit","POST",undefined,false,{"User-Agent":"BrowserTest",Cookie:cookie.split(";")[0]}))).status,204);
    assert.equal((await store.stats()).total,before);
  }
  assert.equal((await handleApiRequest(api("/api/poster/"+visible,"GET",undefined,false))).status,200);
  await store.updateMovie(visible,{...valid,published:0});
  assert.equal((await handleApiRequest(api("/api/poster/"+visible,"GET",undefined,false))).status,401);
  console.log("PASS: "+config.role+" API routes, token enforcement, origin protection, request validation, poster authorization and session cookie");
  const vercel=JSON.parse(readFileSync("vercel.json","utf8"));assert.equal(vercel.framework,null);assert.equal(vercel.outputDirectory,"dist/public");
  for(const file of readdirSync("dist/public").filter(name=>name.endsWith(".js"))){
    const source=readFileSync("dist/public/"+file,"utf8");
    assert(!source.includes("private_key"));assert(!source.includes("FIREBASE_SERVICE_ACCOUNT_JSON"));assert(!source.includes("firebase-admin"));
  }
  console.log("PASS: Vercel configuration and browser bundle excludes server credentials");
}finally{globalThis.fetch=realFetch;delete globalThis.__TEST_STORE__;}

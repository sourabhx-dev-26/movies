import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync,readFileSync,readdirSync } from "node:fs";
import { build } from "esbuild";
mkdirSync(".sites-runtime",{recursive:true});
const config=JSON.parse(readFileSync("lib/site-config.json","utf8"));const port=config.role==="admin"?5174:5173;
const sqlite=new DatabaseSync(".sites-runtime/preview.sqlite");
sqlite.exec("CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY)");
for(const file of (config.role==="admin"?[]:readdirSync("drizzle").filter(name=>name.endsWith(".sql")))){if(!sqlite.prepare("SELECT name FROM _local_migrations WHERE name=?").get(file)){sqlite.exec(readFileSync(`drizzle/${file}`,"utf8"));sqlite.prepare("INSERT INTO _local_migrations (name) VALUES (?)").run(file);}}
class Statement{
  constructor(sql,parameters=[]){this.sql=sql;this.parameters=parameters;}
  bind(...parameters){return new Statement(this.sql,parameters);}
  async first(){return sqlite.prepare(this.sql).get(...this.parameters)||null;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.parameters)};}
  runSync(){const result=sqlite.prepare(this.sql).run(...this.parameters);return {success:true,meta:{changes:Number(result.changes)}};}
  async run(){return this.runSync();}
}
globalThis.__MFY_ENV__={DB:{prepare(sql){return new Statement(sql);},async batch(statements){sqlite.exec("BEGIN");try{const results=statements.map(statement=>statement.runSync());sqlite.exec("COMMIT");return results;}catch(error){sqlite.exec("ROLLBACK");throw error;}}}};
await build({entryPoints:["worker.ts"],outfile:".sites-runtime/preview-worker.mjs",bundle:true,format:"esm",platform:"node",target:"es2022",plugins:[{name:"local-cloudflare",setup(builder){builder.onResolve({filter:/^cloudflare:workers$/},()=>({path:"local-env",namespace:"mfy"}));builder.onLoad({filter:/.*/,namespace:"mfy"},()=>({contents:"export const env=globalThis.__MFY_ENV__;",loader:"js"}));}}]});
const worker=(await import("../.sites-runtime/preview-worker.mjs")).default;
createServer(async(incoming,outgoing)=>{
  try{
    const body=[];for await(const chunk of incoming)body.push(chunk);
    const request=new Request(`http://127.0.0.1:${port}${incoming.url}`,{method:incoming.method,headers:incoming.headers,...(!["GET","HEAD"].includes(incoming.method)?{body:Buffer.concat(body)}:{})});
    const response=await worker.fetch(request);
    outgoing.writeHead(response.status,Object.fromEntries(response.headers));outgoing.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){console.error(error);outgoing.writeHead(500);outgoing.end("Local preview unavailable");}
}).listen(port,"127.0.0.1",()=>console.log(`Local: http://127.0.0.1:${port}`));

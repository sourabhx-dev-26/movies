import { build } from "esbuild";
import { mkdirSync,readFileSync,writeFileSync,readdirSync,copyFileSync,unlinkSync } from "node:fs";
import path from "node:path";
mkdirSync(".sites-runtime/browser",{recursive:true});mkdirSync("dist/server",{recursive:true});mkdirSync("dist/.openai",{recursive:true});
for(const file of readdirSync(".sites-runtime/browser"))unlinkSync(path.join(".sites-runtime/browser",file));
const config=JSON.parse(readFileSync("lib/site-config.json","utf8"));
await build({entryPoints:{app:config.role==="admin"?"components/admin-entry.tsx":"components/browser-entry.tsx"},outdir:".sites-runtime/browser",bundle:true,splitting:true,format:"esm",platform:"browser",target:"es2022",jsx:"automatic",minify:true,chunkNames:"chunk-[hash]",tsconfig:"tsconfig.json"});
const assets={};
function asset(url,file,type){assets[url]={type,data:readFileSync(file).toString("base64")};}
for(const file of readdirSync(".sites-runtime/browser").filter(name=>name.endsWith(".js")))asset(`/${file}`,path.join(".sites-runtime/browser",file),"text/javascript; charset=utf-8");
for(const file of ["logo.png","favicon.png","apple-touch-icon.png"])asset(`/${file}`,`public/${file}`,"image/png");
assets["/styles.css"]={type:"text/css; charset=utf-8",data:Buffer.from(readFileSync("app/globals.css","utf8").replace('@import "tailwindcss";','')).toString("base64")};
writeFileSync(".sites-runtime/assets.generated.ts",`export const assets: Record<string,{type:string;data:string}> = ${JSON.stringify(assets)};`);
await build({entryPoints:["worker.ts"],outfile:"dist/server/index.js",bundle:true,format:"esm",platform:"neutral",target:"es2022",minify:true,external:["cloudflare:workers"],tsconfig:"tsconfig.json"});
copyFileSync(".openai/hosting.json","dist/.openai/hosting.json");
console.log("Built movie page, admin panel, API and embedded assets for Sites hosting.");

import { build } from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
const config = JSON.parse(readFileSync("lib/site-config.json", "utf8"));
const publicUrl = new URL(process.env.MOVIES_PUBLIC_URL || config.publicUrl);
if (!["https:", "http:"].includes(publicUrl.protocol) || publicUrl.username || publicUrl.password || publicUrl.pathname !== "/" || publicUrl.search || publicUrl.hash) throw new Error("MOVIES_PUBLIC_URL must be a website origin without a path.");
if (publicUrl.protocol === "http:" && !["localhost", "127.0.0.1"].includes(publicUrl.hostname)) throw new Error("Use HTTPS for your public domain.");
mkdirSync("dist/public", { recursive: true });
await build({
  entryPoints: { app: config.role === "admin" ? "components/admin-entry.tsx" : "components/browser-entry.tsx" },
  outdir: "dist/public", bundle: true, splitting: true, format: "esm", platform: "browser",
  target: "es2022", jsx: "automatic", minify: true, chunkNames: "chunk-[hash]", tsconfig: "tsconfig.json",
  define: { __MFY_PUBLIC_URL__: JSON.stringify(publicUrl.origin), __MFY_DRIVE_CLIENT_ID__: JSON.stringify(process.env.GOOGLE_DRIVE_CLIENT_ID || "") },
});
await build({ entryPoints: ["lib/server.ts"], outfile: "dist/server.mjs", bundle: true, format: "esm", platform: "node", target: "node22", packages: "external", tsconfig: "tsconfig.json" });
for (const file of ["logo.png", "favicon.png", "apple-touch-icon.png"]) copyFileSync("public/" + file, "dist/public/" + file);
writeFileSync("dist/public/styles.css", readFileSync("app/globals.css", "utf8").replace('@import "tailwindcss";', ""));
const admin = config.role === "admin";
writeFileSync("dist/public/index.html", `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${admin ? "Admin — Movies for You" : "Movies for You — Find your next watch"}</title>${admin ? '<meta name="robots" content="noindex,nofollow">' : ""}<link rel="icon" href="/favicon.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="stylesheet" href="/styles.css"></head><body><div id="app"><p role="status" style="padding:40px">Loading Movies for You…</p></div><noscript><p>This website needs JavaScript.</p></noscript><script type="module" src="/app.js"></script></body></html>`);
console.log("Built " + config.role + " frontend and Firestore API. Nothing was published.");

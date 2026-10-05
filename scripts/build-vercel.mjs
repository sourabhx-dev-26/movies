import { build } from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const config = JSON.parse(readFileSync("lib/site-config.json", "utf8"));
const publicUrl = new URL(process.env.MOVIES_PUBLIC_URL || config.publicUrl);
if (publicUrl.protocol !== "https:" || publicUrl.username || publicUrl.password || publicUrl.pathname !== "/" || publicUrl.search || publicUrl.hash) {
  throw new Error("MOVIES_PUBLIC_URL must be an HTTPS website origin, without a path.");
}
const output = "vercel-dist";
mkdirSync(output, { recursive: true });
await build({
  entryPoints: { app: config.role === "admin" ? "components/admin-entry.tsx" : "components/browser-entry.tsx" },
  outdir: output, bundle: true, splitting: true, format: "esm", platform: "browser",
  target: "es2022", jsx: "automatic", minify: true, chunkNames: "chunk-[hash]",
  tsconfig: "tsconfig.json",
  define: { __MFY_VERCEL__: "true", __MFY_PUBLIC_URL__: JSON.stringify(publicUrl.origin) },
});
for (const name of ["logo.png", "favicon.png", "apple-touch-icon.png"]) {
  copyFileSync("public/" + name, output + "/" + name);
}
writeFileSync(output + "/styles.css", readFileSync("app/globals.css", "utf8").replace('@import "tailwindcss";', ""));
const admin = config.role === "admin";
writeFileSync(output + "/index.html", `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${admin ? "Admin — Movies for You" : "Movies for You — Find your next watch"}</title><meta name="description" content="Find a movie, follow its Watch link, and join Movies for You on Telegram for new additions.">${admin ? '<meta name="robots" content="noindex,nofollow">' : ""}<link rel="icon" href="/favicon.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="stylesheet" href="/styles.css"></head><body><div id="app"><p role="status" style="padding:40px">Loading Movies for You…</p></div><noscript><p>This website needs JavaScript to display movies and manage the collection.</p></noscript><script type="module" src="/app.js"></script></body></html>`);
console.log("Built " + config.role + " frontend for Vercel in " + output);


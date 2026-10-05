import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import bridge from "../api/bridge.js";
import config from "../lib/site-config.json" with { type: "json" };

const deployment = JSON.parse(readFileSync("vercel.json", "utf8"));
assert.equal(deployment.framework, null);
assert.equal(deployment.outputDirectory, "vercel-dist");
assert.equal(deployment.buildCommand, "npm run build:vercel");
for (const asset of ["index.html", "app.js", "styles.css", "logo.png", "favicon.png"]) {
  assert(existsSync("vercel-dist/" + asset), "Missing Vercel asset: " + asset);
}
const html = readFileSync("vercel-dist/index.html", "utf8");
assert.equal(html.includes("noindex,nofollow"), config.role === "admin");
assert(!html.includes(".next"));
const originalFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (url, options) => {
  calls.push({ url: new URL(url), ...options });
  const path = new URL(url).pathname;
  if (path === "/api/visit") return new Response(null, {
    status: 204, headers: { "Set-Cookie": "mfy_visit=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa; Max-Age=1800; HttpOnly; Path=/; SameSite=Lax; Secure" },
  });
  if (path.startsWith("/api/poster/")) return new Response(new Uint8Array([1, 2, 3]), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": config.adminUrl },
  });
  // A forged token is passed to the actual backend for validation, never trusted by the relay.
  if (options.headers.get("authorization") === "Bearer forged") {
    return Response.json({ error: "Your session expired. Sign in again." }, { status: 401 });
  }
  return Response.json({ movies: [], received: options.body ? new TextDecoder().decode(options.body) : null }, { headers: { "Cache-Control": "no-store" } });
};
const host = "https://new-domain.example";
const admin = config.role === "admin";
const request = (path, options = {}) => new Request(host + path, options);
try {
  const before = calls.length;
  assert.equal((await bridge.fetch(request("/api/bridge?route=movies", { headers: { Origin: "https://evil.example" } }))).status, 403);
  assert.equal((await bridge.fetch(request("/api/bridge?route=movies", { headers: { "Sec-Fetch-Site": "cross-site" } }))).status, 403);
  assert.equal(calls.length, before);
  for (const route of ["../stats", "https://evil.example", "movies/id/extra", "unknown"]) {
    assert.equal((await bridge.fetch(request("/api/bridge?route=" + encodeURIComponent(route)))).status, 404);
  }
  assert.equal((await bridge.fetch(request("/api/bridge?route=movies", { method: "POST" }))).status, 403);
  assert.equal((await bridge.fetch(request("/api/bridge?route=movies", { method: "PATCH", headers: { Origin: host } }))).status, 405);
  assert.equal((await bridge.fetch(request("/api/bridge?route=movies&admin=1"))).status, 401);
  const catalog = await bridge.fetch(request("/api/bridge?route=movies", {
    headers: { ...(admin ? { Authorization: "Bearer test-token" } : {}), Origin: host },
  }));
  assert.equal(catalog.status, 200);
  const catalogCall = calls.at(-1);
  assert.equal(catalogCall.url.origin, new URL(config.publicUrl).origin);
  assert.equal(catalogCall.url.pathname, "/api/movies");
  assert.equal(catalogCall.url.searchParams.get("admin"), admin ? "1" : null);
  assert.equal(catalogCall.headers.get("origin"), admin ? config.adminUrl : new URL(config.publicUrl).origin);
  assert.equal(catalog.headers.get("cache-control"), "no-store");
  assert.equal((await bridge.fetch(request("/api/movies", { headers: { Authorization: "Bearer forged" } }))).status, 401);
  const poster = await bridge.fetch(request("/api/bridge?route=poster/test-id&v=123"));
  assert.equal(poster.status, 200);
  assert.equal(poster.headers.get("content-type"), "image/png");
  assert.equal(poster.headers.get("access-control-allow-origin"), null);
  assert.deepEqual([...new Uint8Array(await poster.arrayBuffer())], [1, 2, 3]);
  assert.equal(calls.at(-1).url.searchParams.get("v"), "123");
  if (admin) {
    assert.equal((await bridge.fetch(request("/api/stats"))).status, 401);
    const body = JSON.stringify({ title: "Test movie", watchUrl: "https://example.com/watch", driveFileId: "test-image-id", published: 1 });
    const saved = await bridge.fetch(request("/api/bridge?route=movies", {
      method: "POST", headers: { Origin: host, Authorization: "Bearer test-token", "Content-Type": "application/json" }, body,
    }));
    assert.equal((await saved.json()).received, body);
    assert.equal(calls.at(-1).headers.get("authorization"), "Bearer test-token");
    for (const method of ["PUT", "DELETE"]) {
      assert.equal((await bridge.fetch(request("/api/movies/test-id", { method, headers: { Origin: host, Authorization: "Bearer test-token" } }))).status, 200);
    }
    assert.equal((await bridge.fetch(request("/api/movies", {
      method: "POST", headers: { Origin: host, Authorization: "Bearer test-token" }, body: "x".repeat(10001),
    }))).status, 413);
  } else {
    const visit = await bridge.fetch(request("/api/visit", {
      method: "POST", headers: { Origin: host, Cookie: "other=private; mfy_visit=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa; another=secret", "User-Agent": "TestBrowser" },
    }));
    assert.equal(visit.status, 204);
    assert.match(visit.headers.get("set-cookie"), /^mfy_visit=.*HttpOnly.*Secure$/);
    assert.equal(calls.at(-1).headers.get("cookie"), "mfy_visit=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    assert.equal(calls.at(-1).headers.get("user-agent"), "TestBrowser");
    assert.equal((await bridge.fetch(request("/api/stats"))).status, 404);
    assert.equal((await bridge.fetch(request("/api/movies", { method: "POST", headers: { Origin: host, Authorization: "Bearer test-token" } }))).status, 404);
  }
  globalThis.fetch = async () => { throw new Error("offline"); };
  assert.equal((await bridge.fetch(request("/api/poster/test-id"))).status, 503);
  globalThis.fetch = async () => new Response(null, { status: 302, headers: { Location: "https://evil.example" } });
  assert.equal((await bridge.fetch(request("/api/poster/test-id"))).status, 502);
  console.log("PASS: " + config.role + " Vercel output, API routing, origin checks, protected routes, token forwarding, poster bytes and error handling" + (!admin ? ", visitor cookies" : ", movie writes"));
} finally {
  globalThis.fetch = originalFetch;
}


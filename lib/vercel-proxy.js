import siteConfig from "./site-config.json" with { type: "json" };

function error(status, message) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

// The existing backend remains the source of truth and verifies Firebase tokens.
// This relay keeps browser requests on the new website's own domain.
export async function proxyRequest(request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if ((origin && origin !== url.origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return error(403, "Origin is not allowed.");
  }
  const method = request.method;
  if (!["GET", "POST", "PUT", "DELETE"].includes(method)) {
    return error(405, "Method not allowed.");
  }
  if (method !== "GET" && !origin) return error(403, "This request must come from this website.");
  const rawRoute = url.pathname === "/api/bridge" ? url.searchParams.get("route") : url.pathname.slice(5);
  if (!rawRoute) return error(404, "Route not found.");
  const catalog = rawRoute === "movies";
  const movie = /^movies\/[a-zA-Z0-9_-]{1,200}$/.test(rawRoute);
  const poster = /^poster\/[a-zA-Z0-9_-]{1,200}$/.test(rawRoute);
  const stats = rawRoute === "stats";
  const visit = rawRoute === "visit";
  const admin = siteConfig.role === "admin";
  const allowed = admin
    ? (catalog && ["GET", "POST"].includes(method)) || (movie && ["PUT", "DELETE"].includes(method)) || ((poster || stats) && method === "GET")
    : ((catalog || poster) && method === "GET") || (visit && method === "POST");
  if (!allowed) return error(404, "Route not found.");
  const needsAuth = stats || (catalog && (admin || url.searchParams.get("admin") === "1")) || movie;
  const authorization = request.headers.get("authorization");
  if (needsAuth && !/^Bearer .+$/i.test(authorization || "")) return error(401, "Sign in to manage movies.");
  let body;
  if (method !== "GET") {
    if (Number(request.headers.get("content-length") || 0) > 10000) return error(413, "This request is too large.");
    body = await request.arrayBuffer();
    if (body.byteLength > 10000) return error(413, "This request is too large.");
  }
  const upstreamUrl = new URL("/api/" + rawRoute, siteConfig.publicUrl);
  for (const name of ["admin", "v"]) {
    const value = url.searchParams.get(name);
    if (value !== null) upstreamUrl.searchParams.set(name, value);
  }
  if (admin && catalog && method === "GET") upstreamUrl.searchParams.set("admin", "1");
  const headers = new Headers({ Origin: admin ? siteConfig.adminUrl : new URL(siteConfig.publicUrl).origin });
  for (const name of ["authorization", "content-type", "user-agent"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const session = request.headers.get("cookie")?.match(/(?:^|;\s*)(mfy_visit=[a-f0-9-]{36})(?:;|$)/)?.[1];
  if (visit && session) headers.set("Cookie", session);
  try {
    const response = await fetch(upstreamUrl, {
      method, headers, ...(body ? { body } : {}), redirect: "manual",
      signal: AbortSignal.timeout(20000),
    });
    if (response.status >= 300 && response.status < 400) return error(502, "The movie service redirected unexpectedly.");
    const outgoing = new Headers();
    for (const name of ["content-type", "cache-control", "x-content-type-options"]) {
      const value = response.headers.get(name);
      if (value) outgoing.set(name, value);
    }
    if (!outgoing.has("cache-control")) outgoing.set("Cache-Control", "no-store");
    if (visit) {
      const cookie = response.headers.get("set-cookie");
      if (cookie?.startsWith("mfy_visit=")) outgoing.set("Set-Cookie", cookie);
    }
    return new Response(response.body, { status: response.status, headers: outgoing });
  } catch {
    return error(503, "The movie service is temporarily unavailable. Please try again.");
  }
}


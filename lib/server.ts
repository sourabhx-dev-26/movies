import * as catalog from "../app/api/movies/route";
import * as movie from "../app/api/movies/[id]/route";
import * as poster from "../app/api/poster/[id]/route";
import * as visits from "../app/api/visit/route";
import * as stats from "../app/api/stats/route";
import { SITE_ROLE } from "./config";
import { trustedOrigin } from "./server-auth";

export async function handleApiRequest(request: Request) {
  const url = new URL(request.url);
  const route = url.pathname === "/api/entry" ? "/api/" + (url.searchParams.get("route") || "") : url.pathname;
  const method = request.method, origin = request.headers.get("origin");
  if ((origin && !trustedOrigin(request, origin)) || request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "Origin is not allowed." }, { status: 403 });
  }
  if (method === "OPTIONS") return new Response(null, { status: 204 });
  const admin = SITE_ROLE === "admin";
  if (route === "/api/movies") {
    if (method === "GET") return catalog.GET(request);
    if (admin && method === "POST") return catalog.POST(request);
  }
  const id = route.match(/^\/api\/movies\/([a-zA-Z0-9_-]{1,200})$/)?.[1];
  if (admin && id) {
    const context = { params: Promise.resolve({ id }) };
    if (method === "PUT") return movie.PUT(request, context);
    if (method === "DELETE") return movie.DELETE(request, context);
  }
  const posterId = route.match(/^\/api\/poster\/([a-zA-Z0-9_-]{1,200})$/)?.[1];
  if (posterId && method === "GET") return poster.GET(request, { params: Promise.resolve({ id: posterId }) });
  if (!admin && route === "/api/visit" && method === "POST") return visits.POST(request);
  if (admin && route === "/api/stats" && method === "GET") return stats.GET(request);
  return Response.json({ error: "Route or method not available." }, { status: 404, headers: { "Cache-Control": "no-store" } });
}


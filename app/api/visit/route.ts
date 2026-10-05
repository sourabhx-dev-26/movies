import { database } from "../../../lib/database";
import { apiError, requireSameOrigin } from "../../../lib/server-auth";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (/bot|crawler|spider|headless/i.test(request.headers.get("user-agent") || "")) return new Response(null, { status: 204 });
    const existing = request.headers.get("cookie")?.match(/(?:^|;\s*)mfy_visit=([a-f0-9-]{36})(?:;|$)/)?.[1];
    const id = existing || crypto.randomUUID();
    await database().recordVisit(id);
    return new Response(null, { status: 204, headers: {
      "Cache-Control": "no-store",
      ...(!existing ? { "Set-Cookie": `mfy_visit=${id}; Max-Age=1800; HttpOnly; Path=/; SameSite=Lax${new URL(request.url).protocol === "https:" ? "; Secure" : ""}` } : {}),
    } });
  } catch (error) { return apiError(error); }
}

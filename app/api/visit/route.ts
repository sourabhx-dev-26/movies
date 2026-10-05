import { database } from "@/lib/database";
import { apiError, requireSameOrigin } from "@/lib/server-auth";
import { indiaDay } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (/bot|crawler|spider|headless/i.test(request.headers.get("user-agent") || "")) return new Response(null, { status: 204 });
    const existing = request.headers.get("cookie")?.match(/(?:^|;\s*)mfy_visit=([a-f0-9-]{36})(?:;|$)/)?.[1];
    const id = existing || crypto.randomUUID(); const day = indiaDay(); const db = database();
    // D1 batch is transactional. changes() refers to the previous INSERT, so refreshes do not increment again.
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO visit_sessions (id,day) VALUES (?,?)").bind(`${day}:${id}`,day),
      db.prepare("INSERT INTO daily_visits (day,visits) SELECT ?,1 WHERE changes()=1 ON CONFLICT(day) DO UPDATE SET visits=visits+1").bind(day),
      db.prepare("DELETE FROM visit_sessions WHERE day < ?").bind(indiaDay(new Date(Date.now()-31*86_400_000))),
    ]);
    return new Response(null, { status: 204, headers: {
      "Cache-Control": "no-store",
      ...(!existing ? { "Set-Cookie": `mfy_visit=${id}; Max-Age=1800; HttpOnly; Path=/; SameSite=Lax${new URL(request.url).protocol === "https:" ? "; Secure" : ""}` } : {}),
    } });
  } catch (error) { return apiError(error); }
}

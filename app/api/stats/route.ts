import { database } from "@/lib/database";
import { apiError, requireAdmin } from "@/lib/server-auth";
import { elapsedDays, indiaDay } from "@/lib/validation";
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = database();
    const totals = await db.prepare("SELECT SUM(visits) AS total, MIN(day) AS firstDay FROM daily_visits").first<{ total: number | null; firstDay: string | null }>();
    const { results: recent } = await db.prepare("SELECT day, visits FROM daily_visits WHERE day >= ? ORDER BY day DESC").bind(indiaDay(new Date(Date.now()-29*86_400_000))).all<{ day: string; visits: number }>();
    const today = indiaDay(); const total = totals?.total || 0;
    const days = totals?.firstDay ? elapsedDays(totals.firstDay, today) : 0;
    const daily = Array.from({ length: 30 }, (_, i) => {
      const day = indiaDay(new Date(Date.now()-i*86_400_000));
      return { day, visits: recent.find(row => row.day === day)?.visits || 0 };
    });
    return Response.json({ today: daily[0].visits, total, average: days ? Math.round(total/days*10)/10 : 0, days, daily }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

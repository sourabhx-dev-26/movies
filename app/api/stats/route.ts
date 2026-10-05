import { database } from "../../../lib/database";
import { apiError, requireAdmin } from "../../../lib/server-auth";
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const stats = await database().stats();
    await database().pruneSessions();
    return Response.json(stats, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

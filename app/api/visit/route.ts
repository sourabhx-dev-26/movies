import { database } from "../../../lib/database";
import { apiError, HttpError, readJson, requireSameOrigin } from "../../../lib/server-auth";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (/bot|crawler|spider|headless/i.test(request.headers.get("user-agent") || "")) return new Response(null, { status: 204 });
    const input = await readJson(request);
    const id = input?.eventId;
    if (typeof id !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) throw new HttpError(400, "A valid page-view identifier is required.");
    await database().recordVisit(id);
    return new Response(null, { status: 204, headers: {
      "Cache-Control": "no-store",
    } });
  } catch (error) { return apiError(error); }
}

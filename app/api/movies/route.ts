import { database } from "../../../lib/database";
import { apiError, requireAdmin, requireSameOrigin, HttpError, readJson } from "../../../lib/server-auth";
import { movieInput } from "../../../lib/validation";
import { SITE_ROLE } from "../../../lib/config";
export async function GET(request: Request) {
  try {
    const admin = SITE_ROLE === "admin" || new URL(request.url).searchParams.get("admin") === "1";
    if (admin) await requireAdmin(request);
    const movies = await database().listMovies(admin);
    return Response.json({ movies }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request); await requireAdmin(request);
    const parsed = movieInput.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const id = await database().createMovie(parsed.data);
    return Response.json({ id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

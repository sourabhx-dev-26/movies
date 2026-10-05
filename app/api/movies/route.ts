import { database, MOVIE_COLUMNS } from "@/lib/database";
import { apiError, requireAdmin, requireSameOrigin, HttpError, readJson } from "@/lib/server-auth";
import { movieInput } from "@/lib/validation";
export async function GET(request: Request) {
  try {
    const admin = new URL(request.url).searchParams.get("admin") === "1";
    if (admin) await requireAdmin(request);
    const { results } = await database().prepare(`SELECT ${MOVIE_COLUMNS} FROM movies ${admin ? "" : "WHERE published = 1"} ORDER BY created_at DESC, id DESC LIMIT 200`).all();
    return Response.json({ movies: results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request); await requireAdmin(request);
    const parsed = movieInput.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const count = await database().prepare("SELECT COUNT(*) AS count FROM movies").first<{ count: number }>();
    if (count && count.count >= 200) throw new HttpError(400, "The catalog holds up to 200 movies. Remove an old movie before adding another.");
    const { title, watchUrl, driveFileId, published } = parsed.data;
    const id = crypto.randomUUID(); const now = Date.now();
    await database().prepare("INSERT INTO movies (id,title,watch_url,drive_file_id,published,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").bind(id,title,watchUrl,driveFileId,published,now,now).run();
    return Response.json({ id }, { status: 201 });
  } catch (error) { return apiError(error); }
}

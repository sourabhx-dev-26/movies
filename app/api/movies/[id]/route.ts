import { database } from "@/lib/database";
import { apiError, requireAdmin, requireSameOrigin, HttpError, readJson } from "@/lib/server-auth";
import { movieInput } from "@/lib/validation";
type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  try {
    requireSameOrigin(request); await requireAdmin(request);
    const { id } = await context.params;
    const parsed = movieInput.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    const { title, watchUrl, driveFileId, published } = parsed.data;
    const result = await database().prepare("UPDATE movies SET title=?,watch_url=?,drive_file_id=?,published=?,updated_at=? WHERE id=?").bind(title,watchUrl,driveFileId,published,Date.now(),id).run();
    if (!result.meta.changes) throw new HttpError(404, "Movie not found.");
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request); await requireAdmin(request);
    const { id } = await context.params;
    const result = await database().prepare("DELETE FROM movies WHERE id=?").bind(id).run();
    if (!result.meta.changes) throw new HttpError(404, "Movie not found.");
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

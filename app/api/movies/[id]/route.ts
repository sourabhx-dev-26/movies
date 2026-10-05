import { database } from "../../../../lib/database";
import { apiError, requireAdmin, requireSameOrigin, HttpError, readJson } from "../../../../lib/server-auth";
import { movieInput } from "../../../../lib/validation";
type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  try {
    requireSameOrigin(request); await requireAdmin(request);
    const parsed = movieInput.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0].message);
    await database().updateMovie((await context.params).id, parsed.data);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request); await requireAdmin(request);
    await database().deleteMovie((await context.params).id);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

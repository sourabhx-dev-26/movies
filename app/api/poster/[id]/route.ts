import { database } from "../../../../lib/database";
import { downloadPoster } from "../../../../lib/poster-download";
import { apiError, HttpError, requireAdmin } from "../../../../lib/server-auth";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const movie = await database().getMovie(id);
    if (!movie) throw new HttpError(404, "Poster not found.");
    if (!movie.published) await requireAdmin(request);
    const image=await downloadPoster(movie.driveFileId);
    return new Response(image, { headers: {
      "Content-Type": image.type, "Cache-Control": movie.published ? "public, max-age=3600, s-maxage=86400" : "no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return apiError(error); }
}

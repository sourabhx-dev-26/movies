import { database } from "@/lib/database";
import { firebaseConfig } from "@/lib/config";
import { apiError, HttpError, requireAdmin } from "@/lib/server-auth";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const movie = await database().prepare("SELECT drive_file_id AS driveFileId, published FROM movies WHERE id=?").bind(id).first<{ driveFileId: string; published: number }>();
    if (!movie) throw new HttpError(404, "Poster not found.");
    if (!movie.published) await requireAdmin(request);
    const upstream = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(movie.driveFileId)}?alt=media&key=${firebaseConfig.apiKey}`, { signal: AbortSignal.timeout(12000) });
    if (!upstream.ok) throw new HttpError(502, "The Drive poster is unavailable. Check public sharing and Google Drive API access.");
    const type = (upstream.headers.get("content-type") || "").split(";")[0];
    if (!["image/jpeg", "image/png", "image/webp"].includes(type)) throw new HttpError(415, "This Drive file is not a supported image.");
    const limit = 4*1024*1024;
    if (Number(upstream.headers.get("content-length")) > limit) throw new HttpError(413, "Poster image is too large.");
    const reader = upstream.body?.getReader(); if (!reader) throw new HttpError(502, "Poster unavailable.");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw new HttpError(413, "Poster image is too large."); }
      chunks.push(value);
    }
    return new Response(new Blob(chunks as BlobPart[], { type }), { headers: {
      "Content-Type": type, "Cache-Control": movie.published ? "public, max-age=3600" : "no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return apiError(error); }
}

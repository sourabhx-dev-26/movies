import { env } from "cloudflare:workers";
export function database() {
  if (!env.DB) throw new Error("Database binding unavailable");
  return env.DB;
}
export const MOVIE_COLUMNS = "id, title, watch_url AS watchUrl, drive_file_id AS driveFileId, published, created_at AS createdAt, updated_at AS updatedAt";

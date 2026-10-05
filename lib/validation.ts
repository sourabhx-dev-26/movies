import { z } from "zod";

export const movieInput = z.object({
  title: z.string().trim().min(1, "Enter a movie title.").max(160),
  watchUrl: z.string().trim().max(2048).url("Enter a valid Watch link.").refine(value => {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  }, "Watch links must start with https:// or http://."),
  driveFileId: z.string().regex(/^[a-zA-Z0-9_-]{10,200}$/, "Use a valid Google Drive image link."),
  published: z.number().int().min(0).max(1),
});

export function driveIdFromLink(value: string): string {
  try {
    const url = new URL(value);
    if (url.hostname !== "drive.google.com") return "";
    const id = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] || url.searchParams.get("id") || "";
    return /^[a-zA-Z0-9_-]{10,200}$/.test(id) ? id : "";
  } catch { return ""; }
}

export function indiaDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function elapsedDays(firstDay: string, lastDay: string) {
  return Math.max(1, Math.round((Date.parse(lastDay) - Date.parse(firstDay)) / 86_400_000) + 1);
}

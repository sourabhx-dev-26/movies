export async function readApiResponse<T>(response: Response): Promise<T> {
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new Error(response.status >= 500 ? "The movie API failed to start. Check Vercel runtime logs, then redeploy the corrected code." : "The server returned an unexpected response. Please try again."); }
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data ? (data as { error?: unknown }).error : undefined;
    throw new Error(typeof message === "string" ? message : "Request failed. Please try again.");
  }
  return data as T;
}

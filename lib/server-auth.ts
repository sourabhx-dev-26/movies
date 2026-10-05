import { createRemoteJWKSet, jwtVerify } from "jose";
import { ADMIN_EMAIL, firebaseConfig } from "./config";

const keys = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || !trustedOrigin(request,origin)) throw new HttpError(403, "This request must come from the movie website or its admin website.");
}
export function trustedOrigin(request:Request,origin:string){
  const url=new URL(request.url);
  return origin===url.origin;
}
export async function requireAdmin(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, "Sign in to manage movies.");
  let payload;
  try {
    ({ payload } = await jwtVerify(token, keys, {
      algorithms: ["RS256"], audience: firebaseConfig.projectId,
      issuer: `https://securetoken.google.com/${firebaseConfig.projectId}`,
    }));
    if (!payload.sub || payload.sub.length > 128 || !payload.iat || payload.iat > Date.now() / 1000 || !payload.exp) throw new Error("Invalid identity");
  } catch { throw new HttpError(401, "Your session expired. Sign in again."); }
  if (payload.email_verified !== true || typeof payload.email !== "string" || payload.email.toLowerCase() !== ADMIN_EMAIL) {
    throw new HttpError(403, "Only the verified admin email can access this panel.");
  }
  if ((payload.firebase as {sign_in_provider?:string}|undefined)?.sign_in_provider !== "password") throw new HttpError(401, "Sign in with your admin email and password.");
  return payload;
}
export function apiError(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  console.error("Movies API failed", error);
  return Response.json({ error: "The service is temporarily unavailable. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
export async function readJson(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 10_000) throw new HttpError(413, "This request is too large.");
  const text = await request.text();
  if (text.length > 10_000) throw new HttpError(413, "This request is too large.");
  try { return JSON.parse(text); } catch { throw new HttpError(400, "Invalid request."); }
}

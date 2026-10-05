import { ADMIN_EMAIL, DRIVE_CLIENT_ID } from "./config";
type TokenResponse = { access_token?: string; expires_in?: number; error?: string };
type GoogleIdentity = { accounts: { oauth2: {
  initTokenClient(options: { client_id: string; scope: string; hint: string; callback: (response: TokenResponse) => void; error_callback: (error: {type?: string}) => void }): { requestAccessToken(options: {prompt: string}): void };
  revoke(token: string, callback: () => void): void;
} } };
declare global { interface Window { google?: GoogleIdentity; } }
let loading: Promise<void> | undefined;
export function prepareDrive() {
  if (!DRIVE_CLIENT_ID) return Promise.resolve();
  if (window.google?.accounts.oauth2) return Promise.resolve();
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => { loading = undefined; script.remove(); reject(new Error("Google Drive could not load. Check your connection and try again.")); };
    document.head.appendChild(script);
  });
  return loading;
}
export async function connectDriveAccount() {
  if (!DRIVE_CLIENT_ID) throw new Error("Set GOOGLE_DRIVE_CLIENT_ID in the admin project's environment and rebuild to enable Drive uploads. You can still paste a public Drive image link.");
  await prepareDrive();
  const oauth = window.google?.accounts.oauth2;
  if (!oauth) throw new Error("Google Drive is unavailable. Try again.");
  const result = await new Promise<{token: string; expires: number}>((resolve, reject) => {
    const client = oauth.initTokenClient({
      client_id: DRIVE_CLIENT_ID, scope: "https://www.googleapis.com/auth/drive.file", hint: ADMIN_EMAIL,
      callback: response => {
        if (response.error || !response.access_token) { reject(new Error("Drive permission was not granted. Try again.")); return; }
        resolve({ token: response.access_token, expires: Date.now() + Math.max(0, (Number(response.expires_in) || 3600) - 60) * 1000 });
      },
      error_callback: error => reject(new Error(error.type === "popup_closed" ? "Drive connection was cancelled." : "Allow popups for this website to connect Google Drive.")),
    });
    client.requestAccessToken({prompt: "consent select_account"});
  });
  const response = await fetch("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)", {headers:{Authorization:"Bearer " + result.token},signal:AbortSignal.timeout(10000)});
  const data = await response.json() as {user?:{emailAddress?:string}};
  if (!response.ok || data.user?.emailAddress?.toLowerCase() !== ADMIN_EMAIL) {
    oauth.revoke(result.token, () => {});
    throw new Error("Connect Google Drive with " + ADMIN_EMAIL + ".");
  }
  return result;
}


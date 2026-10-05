import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { firebaseConfig } from "./config";
import { HttpError } from "./server-auth";
import { createMovieStore } from "./firestore-store";

let store: ReturnType<typeof createMovieStore> | undefined;
export function database() {
  if (store) return store;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new HttpError(503, "Set FIREBASE_SERVICE_ACCOUNT_JSON in this project's server environment to connect Firestore.");
  let account;
  try {
    account = JSON.parse(raw);
    if (account.project_id !== firebaseConfig.projectId || !account.client_email || !account.private_key) throw new Error("Wrong project or missing credentials");
    account.private_key = account.private_key.replace(/\\n/g, "\n");
  } catch { throw new HttpError(503, "The Firebase server credential is invalid or belongs to a different project."); }
  const name = "movies-for-you-server";
  const app = getApps().find(app => app.name === name) || initializeApp({ credential: cert(account), projectId: firebaseConfig.projectId }, name);
  const db = getFirestore(app);
  db.settings({ preferRest: true });
  store = createMovieStore(db);
  return store;
}

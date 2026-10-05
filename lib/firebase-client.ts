import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { firebaseConfig } from "./config";
export const auth = getAuth(getApps().length ? getApp() : initializeApp(firebaseConfig));
export function googleProvider(withDrive = false) {
  const provider = new GoogleAuthProvider();
  if (withDrive) provider.addScope("https://www.googleapis.com/auth/drive.file");
  provider.setCustomParameters({ prompt: withDrive ? "consent select_account" : "select_account" });
  return provider;
}

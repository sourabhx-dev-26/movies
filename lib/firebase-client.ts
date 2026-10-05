import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "./config";
export const auth = getAuth(getApps().length ? getApp() : initializeApp(firebaseConfig));

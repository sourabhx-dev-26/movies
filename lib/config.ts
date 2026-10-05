import siteConfig from "./site-config.json";
declare const __MFY_PUBLIC_URL__: string;
declare const __MFY_DRIVE_CLIENT_ID__: string;
export const SITE_ROLE = siteConfig.role;
export const PUBLIC_SITE_URL = typeof __MFY_PUBLIC_URL__ === "undefined" ? siteConfig.publicUrl : __MFY_PUBLIC_URL__;
export const DRIVE_CLIENT_ID = typeof __MFY_DRIVE_CLIENT_ID__ === "undefined" ? "" : __MFY_DRIVE_CLIENT_ID__;
export const firebaseConfig = {
  apiKey: "AIzaSyD861lOa66C-aILcQT5RTpKFHUMI7k7k10",
  authDomain: "movies-788c7.firebaseapp.com",
  projectId: "movies-788c7",
  storageBucket: "movies-788c7.firebasestorage.app",
  messagingSenderId: "913208597578",
  appId: "1:913208597578:web:bad981216107944f3c5ab3",
};
export const TELEGRAM_URL = "https://t.me/+sJUxZiJyB7w5Yzk1";
export const ADMIN_EMAIL = "anuj8160507@gmail.com";

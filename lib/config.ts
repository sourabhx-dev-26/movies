import siteConfig from "./site-config.json";
export const SITE_ROLE = siteConfig.role;
declare const __MFY_VERCEL__: boolean;
declare const __MFY_PUBLIC_URL__: string;
export const VERCEL_FRONTEND = typeof __MFY_VERCEL__ !== "undefined" && __MFY_VERCEL__;
export const PUBLIC_SITE_URL = typeof __MFY_PUBLIC_URL__ === "undefined" ? siteConfig.publicUrl : __MFY_PUBLIC_URL__;
export const ADMIN_SITE_URL = siteConfig.adminUrl;
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

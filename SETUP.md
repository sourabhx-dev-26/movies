# Movies for You — account setup

The website code is complete. Google account setup is required before admin sign-in and poster uploads work. No Firebase Storage, Firestore, Cloud Functions, or billing upgrade is used by this website.

## 1. Enable Firebase Google sign-in

Open https://console.firebase.google.com/project/movies-788c7/authentication/providers and click Get started if shown. Enable the Google provider, choose the support email, and save.

Under Authentication → Settings → Authorized domains, add **movies-for-you-admin.rrbgroupd9155.chatgpt.site** (without https:// or a path). For local development, also add 127.0.0.1 and localhost. The public movie website and admin website are hosted separately.

Admin access is restricted on the server to a verified Firebase token for **anuj8160507@gmail.com**. Visitors do not need to sign in. Do not send anyone your Google password or a service-account key.

## 2. Enable Google Drive

Open https://console.cloud.google.com/apis/library/drive.googleapis.com?project=movies-788c7 and click Enable. Use the same Google Cloud project as Firebase. No separate OAuth client is needed: the app uses Firebase’s Google provider with an additional Drive permission.

In Google Auth Platform / OAuth consent screen, configure the app name and support email. Under Data Access, add https://www.googleapis.com/auth/drive.file. If the OAuth app is in testing, add anuj8160507@gmail.com as a test user. This permission lets the website manage files it creates, rather than all your existing Drive files.

The poster proxy reads public Drive images using the provided Firebase web API key. If you see API_KEY_SERVICE_BLOCKED, open https://console.cloud.google.com/apis/credentials?project=movies-788c7, find that web API key, and add Google Drive API to its permitted APIs while retaining the Firebase APIs. Server requests do not send browser referrers; a browser-referrer-restricted key needs a separate server-compatible key for the poster proxy. Never add a service-account credential to browser code.

## 3. Add the first movie

1. Open the separate admin website: https://movies-for-you-admin.rrbgroupd9155.chatgpt.site/ . The public movie website has no `/admin` page.
2. Sign in with anuj8160507@gmail.com.
3. Click Add movie, then enter its title and Watch URL.
4. Click Connect Google Drive and use the same admin account.
5. Choose a JPG, PNG, or WebP image, leave Publish on home page checked, and click Save movie.

The browser compresses the image to at most 1200 pixels on its longest side, uploads it to **Movies for You - Posters** in your Drive, and makes that poster readable by anyone with its link. Images remain in Drive. The website stores only titles, Watch URLs, Drive file IDs, publication status, and visit counters in its hosted database.

Alternatively, upload a poster manually to Drive, change Share → General access to Anyone with the link, and paste its Drive file sharing URL into the editor. Use a JPG, PNG, or WebP smaller than 4 MB. Drive links that require a resource key are not supported; re-upload the image through this app instead.

Only uploaded posters become public; the folder and unrelated Drive files stay private. Hiding or deleting a movie removes it from the catalog but leaves its Drive image intact. Remove unwanted images manually in Drive.

## Visits and limits

Visits are estimated 30-minute browser sessions on the home page, not verified unique people. Refreshes with the same cookie count once, and known bots are filtered. Days follow Asia/Kolkata. Total counts are retained; daily history shows 30 days. The average includes all calendar days since the first recorded visit, including zero-visit days. No IP addresses or fingerprinting data are stored. Automated requests or disabled cookies can distort these counts.

The catalog supports up to 200 movies. Drive storage and API quotas still apply, and Drive is not a dedicated image CDN; heavy traffic may cause temporary image failures. If a poster fails to load, its Watch button remains usable. Sites provides the website hosting and database; the source is in this workspace. Firebase Authentication and Drive use your existing Google project and account, with no paid Firebase image storage configured.

## Checks and local development

Install dependencies with npm install --legacy-peer-deps. Run npm run db:generate after schema changes, npm run dev for development, and npm run build for production. The local preview applies generated migrations to a workspace SQLite database automatically; production D1 migrations are applied during Sites publishing. The production build is a small Worker with bundled React pages and embedded logo assets. Authentication and Drive upload require your real Google setup and cannot be verified end to end until you enable these services and sign in.

Official references: https://firebase.google.com/docs/auth/web/google-signin · https://developers.google.com/workspace/drive/api/guides/manage-uploads · https://developers.google.com/workspace/drive/api/guides/api-specific-auth

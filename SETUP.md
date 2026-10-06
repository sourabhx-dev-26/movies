# Movies for You — redeployment setup

The two projects remain separate. The public project contains the movie page and search. The admin project contains the email/password login, movie editor and statistics. Both APIs use the same Firestore database in movies-788c7. No old hosted backend is used.

No deployment or GitHub push has been performed. Publishing requires the owner's explicit instruction.

## 1. Enable password login

In Firebase Authentication > Sign-in method, enable Email/Password (the password option, not email-link sign-in). Disable the Google sign-in provider if previously enabled.

Under Users, create anuj8160507@gmail.com with a password you choose. If the account already exists, use the admin form's Forgot password action to set/reset its password. The email is prefilled and read-only in the login form. No public signup form is provided.

On first login, an unverified account receives a verification email and is signed out. Open that email, verify it, then log in again. Only a verified token for the admin email using the password provider is accepted by the server.

Add your admin hostname under Authentication > Settings > Authorized domains. Passwords are managed by Firebase and are never stored in either source folder.

Reference: https://firebase.google.com/docs/auth/web/password-auth

## 2. Prepare Firestore and its server credentials

Use the Firestore Standard edition default database in the existing project. If it already exists, keep it. IMPORTANT: replace the earlier deny-all rules with the complete contents of firestore.rules, then click Publish. Live snapshots require this change. Visitors may read only published movies; the verified password admin may read all movies and the analytics summary. Browser writes and all other reads remain denied. The backend uses the Firebase Admin SDK and verifies admin identity before protected operations.

Open Firebase > Project settings > Service accounts > Generate new private key. Keep the downloaded JSON outside both repositories. In both Vercel projects, add the following server environment variable:

FIREBASE_SERVICE_ACCOUNT_JSON = the complete contents of that JSON file

Select Production, and Preview too if you intend to use preview deployments. The key must belong to movies-788c7. Do not prefix this variable with VITE_ or NEXT_PUBLIC_. Do not paste the key into frontend code or GitHub.

The service account must have access to Firestore. The API creates movies, metadata/catalog, analytics/summary, daily_visits and visit_sessions as needed; no manual collection creation is required. Movie changes appear through Firestore snapshots, with a 10-second API fallback when snapshots are unavailable. Catalog JSON and admin responses are not cached. The counter measures page views: every load, refresh, new tab and browser-back restoration creates a new event ID; retries use the same ID and count once. Historical counts are preserved. Known bots are filtered. Daily totals use Asia/Kolkata, and averages include zero-visit days. Stats refresh after summary changes, every 15 seconds while visible, on focus and on manual Refresh. Old event records remain stored for retry deduplication; no paid TTL service is enabled. Network failures, browser blocking and free-tier limits can prevent recording, so this is a page-view counter rather than a guarantee of exact visitor identity.

References: https://firebase.google.com/docs/admin/setup and https://firebase.google.com/docs/firestore/security/get-started

## 3. Connect Google Drive separately

Google Drive authorization is independent of the admin login. Firebase Google sign-in is not used.

Enable Google Drive API. Configure the OAuth consent screen for Movies for You, External audience, and add anuj8160507@gmail.com as a test user while Testing. Under Data access, add only:

https://www.googleapis.com/auth/drive.file

In Google Cloud > Google Auth Platform > Clients, use/create a Web application OAuth client. Add the full admin origins, including https://your-admin-domain and its production vercel.app origin, under Authorized JavaScript origins. For local testing, also add http://127.0.0.1:5174. The token flow does not require an OAuth redirect route in this application.

In the admin Vercel project's environment, add:

GOOGLE_DRIVE_CLIENT_ID = that Web application's client ID

This client ID is public browser configuration, not a client secret. The app checks that Drive belongs to anuj8160507@gmail.com. Drive access tokens stay in memory and expire. An absent client ID does not prevent login or using a manually uploaded, publicly shared Drive image link.

Poster downloads first try Drive's public thumbnail URL, then the Drive API and a public download URL. The thumbnail and public download paths are best-effort fallbacks and may be blocked by Google. Only supported image responses up to 4 MB are accepted; HTML/login pages are rejected. Public sharing is still required. The API path uses GOOGLE_DRIVE_API_KEY when set, otherwise the existing Firebase web API key. Set a server-compatible key restricted to Google Drive API in both Vercel projects if the API fallback needs it. Retain restrictions on the browser key. This server key is not included in browser JavaScript. Uploaded posters are compressed, stored in Movies for You - Posters, then shared as Anyone with the link - Viewer. Connect Drive from Add movie using the admin Google account. Drive tokens stay in memory, so reconnect after a reload or expiry. A private, deleted or wrong file cannot be repaired by the public website: correct sharing/link in Drive or replace the movie's poster. The public card offers Retry poster after sharing is corrected.

Reference: https://developers.google.com/identity/oauth2/web/guides/use-token-model

## 4. Configure Vercel

Create/use two separate Vercel projects connected to the two GitHub repositories. Configure both:

| Setting | Value |
| --- | --- |
| Framework | Other |
| Root directory | Empty |
| Build command | npm run build |
| Output directory | dist/public |
| Install command | npm ci |
| Node.js | 24.x |

vercel.json declares the build and API routing. The Node API at api/entry.js loads the compiled dist/server.mjs bundle, which is explicitly included in the function. The backend uses Firestore directly and stays outside the static output.

In the admin project, also set MOVIES_PUBLIC_URL to the public HTTPS origin, without a path. This controls the logo and View website links. No cross-site API URL is required: each browser uses its own project's /api routes. Redeploy after changing environment variables.

## 5. Push manually when ready

Public:
```powershell
cd C:\Users\soura\moviesforyou\site
git add -A
git commit -m "Use Firestore and prepare public movie search"
git push origin main
```

Admin:
```powershell
cd C:\Users\soura\moviesforyou\admin-site
git add -A
git commit -m "Use Firestore and email password admin login"
git push origin main
```

If these GitHub repositories are already connected to Vercel, a push can trigger a deployment. Set the required environments first, or pause Git deployments until you want to publish.

## 6. Final live check

Log in with the prefilled email and your password. If requested, verify the email once. Add a movie using a public Drive link or Connect Google Drive, publish it and check its poster, search match and Watch link on the public site. Verify hide/edit/delete and statistics. Real Firebase login, Firestore access and Drive upload remain dependent on your account configuration and need this live check.

Admin authentication now uses session storage: a reload preserves login without flashing the login form, while closing the tab ends its session. An inactivity timer signs out after 30 minutes, clearing Drive tokens and unsaved editor data. Pointer, keyboard and scroll activity reset the timer; automatic stats updates do not. A tab returning from sleep checks expiry before allowing continued use. Sessions and activity timestamps are preserved through reloads. Live account sessions still need to be checked after deployment.

Do not enable public Firestore writes, commit passwords or service-account files, request full Drive access, or enable paid Firebase Storage/Cloud Functions for this app. Images remain in Google Drive. Firestore and hosting quotas still apply.

## Local development

Copy .env.example to .env in each project and supply the server credential. Add GOOGLE_DRIVE_CLIENT_ID and MOVIES_PUBLIC_URL in the admin project as needed. Start with npm run dev. The public preview uses 127.0.0.1:5173 and the admin uses 127.0.0.1:5174. These local processes never publish.

The earlier SQLite file, if any, remains in the ignored data folder and has not been automatically uploaded. Firestore starts with its own records. Build and automated checks use local mocks and do not mutate your cloud account.

# Movies for You

Separate public and admin React projects with Node APIs. Movie metadata and visit statistics use Firebase Firestore; posters use Google Drive. The public page includes title search. Admin login uses Firebase Email/Password with the email prefilled.

No old hosting dependency is present. No website is published by any npm script.

See SETUP.md for the required Firebase account, server environment variables, Drive authorization and Vercel settings.

- npm install: install dependencies.
- npm run build: compile frontend assets to dist/public and the local API to dist/server.mjs.
- npm run typecheck: check TypeScript.
- npm run check: validate authentication and Firestore store behavior using local mocks.
- npm run dev: build and run locally, reading .env if present.
- npm start: run an existing build locally.

Use Node.js 22.13 or newer. The public preview uses 127.0.0.1:5173, the admin preview 127.0.0.1:5174. They share Firestore but each uses its own API. Firestore credentials belong only in server environments, never browser code.

Publish firestore.rules to enable read-only live snapshots: visitors may read published movies, and the verified password admin may read all movies and the analytics summary. Browser writes remain denied; the authenticated server SDK performs writes. Keep both GitHub repositories separate.

The counter now measures page views, including every reload in the same browser. Retry requests for one page view count once. Admin sessions restore across reloads and sign out after 30 minutes of inactivity. Movies update through Firestore snapshots, with an API fallback when live reads are unavailable. Stats refresh automatically and have a separate manual refresh action. Poster cards are wider and respect reduced-motion preferences.

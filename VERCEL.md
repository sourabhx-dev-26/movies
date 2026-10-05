# Vercel deployment

These are separate GitHub repositories and separate Vercel projects.

| Website | Repository | Local folder |
| --- | --- | --- |
| Public | sourabhx-dev-26/movies | C:/Users/soura/moviesforyou/site |
| Admin | sourabhx-dev-26/movieadmin | C:/Users/soura/moviesforyou/admin-site |

## Fix the missing .next error

The old build targets Cloudflare Workers, rather than Next.js. Vercel now has its own static frontend build plus a Node API relay. Do not point Vercel at dist/server or .next.

Push these updated files to the relevant GitHub repository before deploying. For both Vercel projects, under Settings > Build and Deployment, use:

- Framework Preset: Other
- Root Directory: leave empty (each repository already contains one site at its root)
- Build Command: npm run build:vercel
- Output Directory: vercel-dist
- Install Command: npm install --legacy-peer-deps
- Node.js Version: 24.x

The included vercel.json also sets the framework, build, install, output and API routing. Redeploy after pushing.

## Domain and Google setup order

1. Deploy the public and admin repositories as separate Vercel projects.
2. Add your public domain to the public project and your admin subdomain to the admin project under Settings > Domains. Use the exact DNS records Vercel displays.
3. In the admin project's Environment Variables, set MOVIES_PUBLIC_URL to your public HTTPS origin (for example https://your-domain.example, without a path). This controls the logo and View website links. Redeploy the admin project after changing it.
4. Enable Firebase Authentication's Google provider. Add the admin hostname (without https://) under Authentication > Settings > Authorized domains. Add the admin project's production vercel.app hostname too if you will use it to sign in.
5. Configure Google Auth Platform: External audience, Movies for You branding, your support email, and anuj8160507@gmail.com as a test user while in Testing. Enable Google Drive API and add only https://www.googleapis.com/auth/drive.file under Data access.
6. Allow Google Drive API in the existing Firebase web key's API restrictions, retaining the required Firebase APIs. If the key has Website application restrictions, retain them and use a separate server-compatible key for the existing poster backend; that change needs backend configuration.
7. Open your new admin URL, sign in with anuj8160507@gmail.com, connect Drive and publish a movie. Verify its poster and Watch button on your public URL.

Most of these are console settings, so they do not require a code push. After a GitHub repository is connected to Vercel, subsequent pushes to its production branch trigger deployment.

## Existing backend

The catalog, administration APIs, poster downloads and visit counters still use the existing Movies for You backend and hosted database at https://movies-for-you.rrbgroupd9155.chatgpt.site. Keep that backend published. This change deploys the two frontends on Vercel; it does not migrate the database into Firebase or Vercel.

Each Vercel project uses its own /api endpoint. The relay checks the browser origin, sends Firebase authorization to the backend unchanged, and preserves the visitor cookie on the public domain. The backend still verifies the admin email and signed Firebase token for every protected operation. Adding custom domains does not require a backend CORS change.

Poster uploads still go directly from the admin browser to Google Drive. No image files or Drive tokens are stored on Vercel. The public Vercel site contains no admin page.

## Local checks

Run npm run build:vercel, npm run check:vercel, and npx tsc --noEmit.
The original npm run build remains available for the existing Sites backend.


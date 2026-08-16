# Haven Space

Haven Space is a boarding house platform for boarders, landlords, and admins.

## Stack

| Layer    | Technology                                   |
| -------- | -------------------------------------------- |
| Frontend | TanStack Start (React) on Cloudflare Workers |
| API      | TypeScript Cloudflare Worker with Hono       |
| Database | Cloudflare D1                                |
| Uploads  | UploadThing                                  |
| Tooling  | Bun, Wrangler, ESLint, Prettier              |

## Backend Status

The PHP `functions/` backend has been removed. The active API lives in [workers/api](./workers/api).

Payments and messages are intentionally deferred for now. The Worker returns `501 FEATURE_DEFERRED` for those route groups until they are implemented.

## Setup

Install dependencies:

```bash
bun install
bun install --cwd workers/api
bun install --cwd apps/web
```

Run the Worker API locally:

```bash
bun run cf:api:dev
```

The local API default is `http://localhost:8000`.

Run the TanStack Start frontend locally:

```bash
bun run web:dev
```

The local frontend URL is `http://localhost:3000`.

Apply D1 migrations:

```bash
cd workers/api
bunx wrangler d1 migrations apply haven-space --local
bunx wrangler d1 migrations apply haven-space --remote
```

Required Worker secrets:

```bash
cd workers/api
bunx wrangler secret put JWT_SECRET --env=""
bunx wrangler secret put GOOGLE_CLIENT_ID --env=""
bunx wrangler secret put GOOGLE_CLIENT_SECRET --env=""
bunx wrangler secret put UPLOADTHING_TOKEN --env=""
```

For Google auth, register both callback URLs as **Authorized redirect URIs** on the OAuth client
(`608119021847-prh01e77aid25pk175jd7o8pcm7ngequ.apps.googleusercontent.com`) in Google Cloud
Console → APIs & Services → Credentials:

```text
https://haven-space-api.floresaybaez574.workers.dev/api/auth/google/callback
http://localhost:8000/api/auth/google/callback
```

## Frontend API URL

The frontend defaults to:

- local: `http://localhost:8000`
- production: `https://haven-space-api.floresaybaez574.workers.dev` (set as the `API_BASE_URL` var in `apps/web/wrangler.jsonc`)

Override it without editing files:

```text
?apiBaseUrl=https://your-worker-url.example
```

The override is saved in `localStorage.havenSpaceApiBaseUrl`.

## CORS

The API Worker's `ALLOWED_ORIGINS` (or `APP_ORIGIN`) must include the frontend's origin so browser requests are accepted:

- local frontend: `http://localhost:3000`
- production frontend: the web Worker's origin (e.g. `https://haven-space-web.<account>.workers.dev`, or a custom domain if one is added)

## Legacy Design Reference (`client/`)

The `client/` folder holds the legacy vanilla HTML/CSS/JS frontend. It is kept as the design
reference: the TanStack homepage and FAQ were rebuilt to match it. The homepage was aligned as
follows:

- Removed the border and shadow around the `main.png` app preview image.
- Removed the "Voices / Real Stories, Real Impact" testimonials section (kept on Our Story, which still carries it in the reference).
- Restyled the FAQ section (light-gray `#f8f9fa` background, left-aligned header with pill badge, underline category tabs, card-style accordion items) to match the reference.

Preview the reference locally:

```bash
bun run client:dev
```

The reference is served at `http://localhost:8788` (redirects to `views/public/index.html`).

## Scripts

| Command                    | Description                                 |
| -------------------------- | ------------------------------------------- |
| `bun run client:dev`       | Serve the legacy `/client` design reference |
| `bun run cf:api:dev`       | Run the Worker API locally                  |
| `bun run cf:api:test`      | Run Worker API tests                        |
| `bun run cf:api:typecheck` | Typecheck Worker API code                   |
| `bun run cf:api:deploy`    | Deploy the production Worker                |
| `bun run web:dev`          | Run the TanStack Start frontend locally     |
| `bun run web:test`         | Run frontend tests                          |
| `bun run web:typecheck`    | Typecheck frontend code                     |
| `bun run web:build`        | Build the frontend output                   |
| `bun run web:deploy`       | Deploy the frontend Worker                  |
| `bun run deploy`           | Deploy Worker API and frontend              |
| `bun run format`           | Format files with Prettier                  |

## Production Deploy

Deploy the full Cloudflare stack:

```bash
bun run deploy
```

The production frontend is served by the `haven-space-web` Worker (see `apps/web/wrangler.jsonc`). Add the frontend origin to the API Worker's `ALLOWED_ORIGINS`/`APP_ORIGIN` as described under CORS above.

## Deferred Work

- Implement payments in the Worker.
- Implement messages in the Worker.
- Add production email delivery for password reset codes.
- Run a final browser/prod smoke pass when ready.

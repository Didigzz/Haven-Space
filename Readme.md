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

For Google auth, register the Worker callback URL in Google Cloud, for example:

```text
https://haven-space-api.floresaybaez574.workers.dev/api/auth/google/callback
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

## Scripts

| Command                    | Description                             |
| -------------------------- | --------------------------------------- |
| `bun run cf:api:dev`       | Run the Worker API locally              |
| `bun run cf:api:test`      | Run Worker API tests                    |
| `bun run cf:api:typecheck` | Typecheck Worker API code               |
| `bun run cf:api:deploy`    | Deploy the production Worker            |
| `bun run web:dev`          | Run the TanStack Start frontend locally |
| `bun run web:test`         | Run frontend tests                      |
| `bun run web:typecheck`    | Typecheck frontend code                 |
| `bun run web:build`        | Build the frontend output               |
| `bun run web:deploy`       | Deploy the frontend Worker              |
| `bun run deploy`           | Deploy Worker API and frontend          |
| `bun run format`           | Format files with Prettier              |

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

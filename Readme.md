# Haven Space

Haven Space is a boarding house platform for boarders, landlords, and admins.

## Stack

| Layer    | Technology                             |
| -------- | -------------------------------------- |
| Frontend | Cloudflare Pages static site           |
| API      | TypeScript Cloudflare Worker with Hono |
| Database | Cloudflare D1                          |
| Uploads  | UploadThing                            |
| Tooling  | Bun, Wrangler, ESLint, Prettier        |

## Backend Status

The PHP `functions/` backend has been removed. The active API lives in [workers/api](./workers/api).

Payments and messages are intentionally deferred for now. The Worker returns `501 FEATURE_DEFERRED` for those route groups until they are implemented.

## Setup

Install dependencies:

```bash
bun install
bun install --cwd workers/api
```

Run the Worker API locally:

```bash
bun run cf:api:dev
```

The local API default is `http://localhost:8000`.

Run the Cloudflare Pages frontend locally:

```bash
bun run dev
```

The local Pages URL is `http://localhost:8788`.

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
- production: `https://haven-space-api.floresaybaez574.workers.dev`

Override it without editing files:

```text
?apiBaseUrl=https://your-worker-url.example
```

The override is saved in `localStorage.havenSpaceApiBaseUrl`.

## Scripts

| Command                    | Description                  |
| -------------------------- | ---------------------------- |
| `bun run cf:api:dev`       | Run the Worker locally       |
| `bun run cf:api:test`      | Run Worker tests             |
| `bun run cf:api:typecheck` | Typecheck Worker code        |
| `bun run cf:api:deploy`    | Deploy the production Worker |
| `bun run cf:pages:dev`     | Run Cloudflare Pages locally |
| `bun run cf:pages:deploy`  | Deploy Cloudflare Pages      |
| `bun run deploy`           | Deploy Worker and Pages      |
| `bun run build`            | Build static frontend output |
| `bun run lint`             | Lint frontend JavaScript     |
| `bun run format`           | Format files with Prettier   |

## Production Deploy

Create the Pages project once if it does not exist yet:

```bash
bun run cf:pages:create
```

Deploy the full Cloudflare stack:

```bash
bun run deploy
```

The expected production frontend is `https://haven-space.pages.dev`. In Cloudflare Pages, set the project production branch to `main`.

## Deferred Work

- Implement payments in the Worker.
- Implement messages in the Worker.
- Add production email delivery for password reset codes.
- Run a final browser/prod smoke pass when ready.

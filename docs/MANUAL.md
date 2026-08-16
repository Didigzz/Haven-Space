# Haven Space Setup Manual

## Prerequisites

| Requirement        | Notes                                        |
| ------------------ | -------------------------------------------- |
| Bun                | JavaScript package manager and task runner   |
| Cloudflare account | Required for remote Worker and D1 deployment |
| Wrangler login     | Run `bunx wrangler login` if needed          |

## Install

```bash
bun install
bun install --cwd workers/api
bun install --cwd apps/web
```

## Local API

Run the Cloudflare Worker locally:

```bash
bun run cf:api:dev
```

The local API runs at `http://localhost:8000`.

## D1

Apply migrations locally:

```bash
cd workers/api
bunx wrangler d1 migrations apply haven-space --local
```

Apply migrations remotely:

```bash
cd workers/api
bunx wrangler d1 migrations apply haven-space --remote
```

## Secrets

```bash
cd workers/api
bunx wrangler secret put JWT_SECRET --env=""
bunx wrangler secret put UPLOADTHING_TOKEN --env=""
```

## Cloudflare Pages Frontend

The TanStack Start frontend (`apps/web`) is built by Vite + `@cloudflare/vite-plugin` in
Worker mode, then `scripts/build-pages.mjs` assembles the Cloudflare Pages "advanced mode"
bundle into `apps/web/dist/pages/` (`_worker.js` + static assets + `_routes.json`).

Build the Pages bundle locally:

```bash
bun run web:build
bun run pages:build
```

Deploy the production Pages site (`haven-space`, `https://haven-space.pages.dev`):

```bash
bun run web:deploy
```

or the whole stack (API Worker + Pages frontend):

```bash
bun run deploy
```

Git auto-deployments on the `haven-space` Pages project are **disabled** — the production
branch is `main`, but deploys only happen via CI (`.github/workflows/deploy.yml`: typechecks +
API tests, then `wrangler pages deploy` on push to `main`; preview deployments on pull
requests) or manually with the commands above. CI needs the `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` repository secrets.

The Pages project's git build settings (build command
`bun install --cwd apps/web && bun run --cwd apps/web build && bun scripts/build-pages.mjs`,
output dir `apps/web/dist/pages`) are configured so that any git-triggered or dashboard build
also produces the correct `_worker.js` + assets deployment.

After changing `APP_ORIGIN` in `workers/api/wrangler.jsonc`, redeploy the Worker:

```bash
bun run cf:api:deploy
```

The frontend defaults to the Worker API:

- local: `http://localhost:8000`
- production: `https://haven-space-api.floresaybaez574.workers.dev`

You can override the API URL with:

```text
?apiBaseUrl=https://your-worker-url.example
```

## Verification

```bash
bun run cf:api:typecheck
bun run cf:api:test
cd workers/api
bunx wrangler deploy --dry-run --env=""
```

Payment and message routes are deferred and currently return `501 FEATURE_DEFERRED`.

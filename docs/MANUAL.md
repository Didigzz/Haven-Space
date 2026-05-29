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
```

## Local API

Run the Cloudflare Worker locally:

```bash
bun run cf:api:dev
```

The local API runs at `http://localhost:8787`.

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

Build and serve the Cloudflare Pages output locally:

```bash
bun run cf:pages:dev
```

Deploy the production Pages site:

```bash
bun run cf:pages:create
bun run cf:pages:deploy
```

In Cloudflare Pages, keep the `haven-space` production branch set to `main`.

After changing `APP_ORIGIN` in `workers/api/wrangler.jsonc`, redeploy the Worker:

```bash
bun run cf:api:deploy
```

The frontend defaults to the Worker API:

- local: `http://localhost:8787`
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

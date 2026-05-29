# Haven Space Cloudflare API

TypeScript Cloudflare Worker replacement for the existing PHP API.

This package is intentionally side-by-side with `functions/` while endpoints are migrated in small groups. Do not delete a PHP endpoint until its Worker route has tests and the frontend route group has been checked against the Worker.

## Commands

Run from the repo root:

```bash
bun run cf:api:typecheck
bun run cf:api:test
bun run cf:api:dev
```

Run a Cloudflare bundle validation from this directory:

```bash
bunx wrangler deploy --dry-run --env=""
```

Deploy production after Cloudflare authentication is configured:

```bash
bun run cf:api:deploy
```

## Secrets

Copy `.dev.vars.example` to `.dev.vars` for local values. Keep real secrets out of git.

Protected routes that accept PHP JWTs require the same `JWT_SECRET` as the PHP backend:

```bash
bunx wrangler secret put JWT_SECRET
```

## Current Routes

- `GET /api/test`
- `GET /test`
- `GET /api/health`
- `POST /auth/check-email`
- `GET /api/rooms/popular-locations`
- `GET /api/rooms/public`
- `GET /api/rooms/detail`
- `GET /api/rooms/similar`
- `GET /api/properties/all`
- `GET /api/properties/all.php`
- `GET /api/boarder/saved-listings`
- `GET /api/boarder/saved-listings?property_id=...`
- `POST /api/boarder/saved-listings`
- `DELETE /api/boarder/saved-listings`
- `GET /api/boarder/applications`
- `POST /api/boarder/applications`
- `GET /api/boarder/applications/:id`
- `DELETE /api/boarder/applications/:id`
- `POST /api/boarder/applications/:id/confirm`
- `GET /api/landlord/applications`
- `GET /api/landlord/applications/:id`
- `PATCH /api/landlord/applications/:id/status`
- `GET /api/landlord/properties`
- `GET /api/landlord/properties.php`
- `GET /api/landlord/properties?id=...`
- `GET /api/landlord/properties.php?id=...`
- `POST /api/landlord/listings`

## Shared Utilities

- `src/lib/http.ts` centralizes JSON responses and `HttpError` conversion.
- `src/lib/auth.ts` parses JWT auth, supports the PHP `X-User-ID` development bypass, and authorizes route roles.
- `src/lib/validation.ts` validates JSON request bodies and common string/email fields.
- `src/lib/d1.ts` requires the Cloudflare D1 `DB` binding for database-backed routes.

## D1 Setup

The auth route expects a Cloudflare D1 binding named `DB`.

Create the database and add the generated binding to `wrangler.jsonc`:

```bash
cd workers/api
bunx wrangler d1 create haven-space
```

After Wrangler prints the `d1_databases` block, add it to `wrangler.jsonc`, keeping `binding` as `DB`.

Apply migrations:

```bash
bunx wrangler d1 migrations apply haven-space --local
bunx wrangler d1 migrations apply haven-space --remote
```

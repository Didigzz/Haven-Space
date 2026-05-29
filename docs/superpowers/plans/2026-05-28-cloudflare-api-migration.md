# Cloudflare API Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Haven Space PHP API into a TypeScript Cloudflare Workers API in small, testable slices.

**Architecture:** Keep the existing PHP backend in `functions/` until every endpoint group has TypeScript parity. Build the new API in `workers/api/` with Hono, Wrangler, Worker-native `fetch`, and explicit route modules. Do not move secrets into files; use Cloudflare secrets for private keys.

**Tech Stack:** Cloudflare Workers, Wrangler, TypeScript, Hono, Bun test runner.

---

## Migration Checklist

- [x] Phase 0: Scaffold a Worker API without touching PHP routes.
- [x] Phase 0: Port the current router smoke endpoint: `GET /api/test` and `GET /test`.
- [x] Phase 1: Add shared Worker utilities for JSON responses, auth headers, and request validation.
- [ ] Phase 2: Port authentication endpoints from `functions/api/auth/` one by one.
- [x] Phase 2a: Port `/auth/check-email` to a D1-backed Worker route.
- [x] Phase 3: Port planned public room/listing endpoints from `functions/api/rooms/` and `functions/api/properties/`.
- [x] Phase 3a: Port `/api/rooms/popular-locations` to a D1-backed Worker route.
- [x] Phase 3b: Port `/api/rooms/public` to a D1-backed Worker route.
- [x] Phase 3c: Port `/api/rooms/detail` to a D1-backed Worker route.
- [x] Phase 3d: Port `/api/rooms/similar` to a D1-backed Worker route.
- [x] Phase 3e: Port `/api/properties/all` to a D1-backed Worker route.
- [x] Phase 4: Port boarder application and saved-listing routes from `functions/src/Modules/Application` and legacy boarder endpoints.
- [x] Phase 4a: Port saved-listing read endpoints: `GET /api/boarder/saved-listings` and saved status checks.
- [x] Phase 4b: Port saved-listing write endpoints: `POST /api/boarder/saved-listings` and `DELETE /api/boarder/saved-listings`.
- [x] Phase 4c: Port application read endpoints for boarders and landlords.
- [x] Phase 4d: Port boarder application creation endpoint: `POST /api/boarder/applications`.
- [x] Phase 4e: Port boarder application deletion endpoint: `DELETE /api/boarder/applications/:id`.
- [x] Phase 4f: Port boarder booking confirmation endpoint: `POST /api/boarder/applications/:id/confirm`.
- [x] Phase 4g: Port landlord application status endpoint: `PATCH /api/landlord/applications/:id/status`.
- [ ] Phase 5: Port landlord property, room, boarder, announcement, calendar, and welcome-setting routes.
- [x] Phase 5a: Port landlord property read endpoints: `GET /api/landlord/properties` and `.php` aliases.
- [ ] Phase 6: Port payments, notifications, messages, uploads, and AI endpoints.
- [ ] Phase 7: Switch frontend API base URL from PHP to the Worker only after parity tests pass.
- [ ] Phase 8: Remove PHP endpoints after production traffic has been verified on Cloudflare.

## Files

- Create: `workers/api/package.json` for Worker-local dependencies and scripts.
- Create: `workers/api/wrangler.jsonc` for Cloudflare deployment configuration.
- Create: `workers/api/tsconfig.json` for strict TypeScript checking.
- Create: `workers/api/.dev.vars.example` for local non-secret configuration examples.
- Create: `workers/api/src/env.ts` for Worker binding types.
- Create: `workers/api/src/lib/http.ts` for shared JSON and error responses.
- Create: `workers/api/src/lib/auth.ts` for bearer token helpers, JWT verification, and role authorization.
- Create: `workers/api/src/lib/validation.ts` for JSON body and field validation helpers.
- Create: `workers/api/src/lib/d1.ts` for requiring the D1 binding.
- Create: `workers/api/src/repositories/users.ts` for auth-related user lookups.
- Create: `workers/api/src/repositories/locations.ts` for public location/listing lookups.
- Create: `workers/api/src/repositories/listings.ts` for public listing queries and related photos/rooms/amenities.
- Create: `workers/api/src/routes/auth.ts` for TypeScript auth endpoints.
- Create: `workers/api/src/routes/rooms.ts` for public room/listing endpoints.
- Create: `workers/api/migrations/0001_users_auth.sql` for auth-relevant D1 user columns.
- Create: `workers/api/migrations/0002_public_listings.sql` for public listing tables.
- Create: `workers/api/migrations/0003_public_room_listings.sql` for rooms, amenities, and listing photo tables.
- Create: `workers/api/migrations/0004_landlord_profiles.sql` for landlord display names used by map property pins.
- Create: `workers/api/migrations/0005_saved_listings.sql` for boarder saved property records.
- Create: `workers/api/migrations/0006_applications.sql` for rental applications.
- Create: `workers/api/migrations/0007_user_boarder_status.sql` for boarder status updates during booking confirmation.
- Create: `workers/api/src/repositories/applications.ts` for application list/detail reads.
- Create: `workers/api/src/repositories/saved-listings.ts` for saved listing reads.
- Create: `workers/api/src/routes/applications.ts` for boarder/landlord application endpoints.
- Create: `workers/api/src/routes/boarder.ts` for boarder-owned endpoints.
- Create: `workers/api/src/repositories/landlord-properties.ts` for landlord-owned property reads.
- Create: `workers/api/src/routes/landlord.ts` for landlord-owned endpoints.
- Create: `workers/api/src/routes/system.ts` for smoke and health routes.
- Create: `workers/api/src/index.ts` for the Hono application entrypoint.
- Create: `workers/api/test/system.test.ts` for parity tests.
- Create: `workers/api/test/boarder.test.ts` for boarder saved-listing route tests.
- Create: `workers/api/test/applications.test.ts` for application read route tests.
- Modify: `package.json` to expose root-level Cloudflare API commands.

## Task 1: Worker Scaffold

- [x] **Step 1: Create the Worker package**

Create `workers/api/package.json` with scripts for local dev, deploy, typecheck, and tests.

- [x] **Step 2: Add Wrangler config**

Create `workers/api/wrangler.jsonc` with `main` set to `src/index.ts`, `compatibility_date` set to `2026-05-28`, and `workers_dev` enabled for the first deployment.

- [x] **Step 3: Add TypeScript config**

Create `workers/api/tsconfig.json` with strict checking and Cloudflare Worker types.

- [x] **Step 4: Add local env example**

Create `workers/api/.dev.vars.example`.

## Task 2: Smoke Endpoint Parity

- [x] **Step 1: Add binding types**

Create `workers/api/src/env.ts` with public configuration bindings used by the Worker.

- [x] **Step 2: Add system routes**

Create `workers/api/src/routes/system.ts` with `GET /api/test`, `GET /test`, and `GET /api/health`.

- [x] **Step 3: Add Worker entrypoint**

Create `workers/api/src/index.ts`, mount the system routes, configure CORS, and return JSON for 404 and unhandled errors.

- [x] **Step 4: Add tests**

Create `workers/api/test/system.test.ts` and assert that `/api/test` keeps the existing PHP smoke response shape.

- [x] **Step 5: Verify**

Run:

```bash
cd workers/api
bun install
cd ../..
bun run cf:api:typecheck
bun run cf:api:test
```

Expected: TypeScript check passes and the system route tests pass.

## Task 2.5: Shared Worker Utilities

- [x] **Step 1: Add JSON response helpers**

Create `workers/api/src/lib/http.ts` with `jsonResponse`, `errorResponse`, `responseFromError`, and `HttpError`.

- [x] **Step 2: Add auth header helpers**

Create `workers/api/src/lib/auth.ts` with `bearerToken`, `requireBearerToken`, and `authorizationHeaders`.

- [x] **Step 3: Add request validation helpers**

Create `workers/api/src/lib/validation.ts` with `readJsonObject`, `requiredString`, `optionalString`, `requiredEmail`, and `requiredStringFields`.

- [x] **Step 4: Add focused tests**

Create tests under `workers/api/test/lib/` for HTTP responses, bearer token parsing, and JSON validation.

- [x] **Step 5: Verify**

Run:

```bash
bun run cf:api:typecheck
bun run cf:api:test
```

Expected: TypeScript check passes and all Worker tests pass.

## Data Layer Decision

Choose the Cloudflare data layer before porting database-backed endpoints:

- D1 for relational data currently represented by SQL migrations.
- R2 for uploaded files and room/property media.
- KV only for low-write cache/config data, not primary records.

## Task 3: Auth Migration

- [x] **Step 1: Inventory PHP auth behavior**

Read these files before editing TypeScript:

```bash
rg --files functions/api/auth | rg "\.php$"
rg -n "localStorage\.setItem|Authorization|auth/me|refresh-token|login\.php|register\.php" client/js client/views
```

- [x] **Step 2: Create auth route module**

Create `workers/api/src/routes/auth.ts` and mount it from `workers/api/src/index.ts`. Keep existing route aliases where the frontend still calls `.php` URLs, including `/auth/login.php` and `/auth/register.php`.

- [x] **Step 3: Port `/auth/check-email`**

Create `workers/api/src/repositories/users.ts`, query `users.google_id` and `users.password_hash` by email, ignore rows where `deleted_at IS NOT NULL`, and preserve this PHP response shape:

```json
{ "exists": true, "is_google_account": false }
```

- [x] **Step 4: Add D1 migration for auth user columns**

Create `workers/api/migrations/0001_users_auth.sql` with the `users` columns needed by auth and an index on active email lookups.

- [x] **Step 5: Add parity tests**

Create `workers/api/test/auth.test.ts` for unregistered emails, password users, Google-only users, missing email, and invalid email.

- [ ] **Step 6: Port remaining auth endpoints one at a time**

Next endpoints: `/auth/login.php`, then `/auth/register.php`. Each endpoint needs a failing test before implementation and a parity check against the PHP response shape.

## Task 3.5: Public Room And Listing Migration

- [x] **Step 1: Inventory public room/listing endpoints**

Read:

```bash
Get-Content functions\api\rooms\popular-locations.php
Get-Content functions\api\rooms\public.php
Get-Content functions\api\rooms\detail.php
Get-Content functions\api\rooms\similar.php
Get-Content functions\api\properties\all.php
```

- [x] **Step 2: Port `/api/rooms/popular-locations`**

Create `workers/api/src/routes/rooms.ts` and `workers/api/src/repositories/locations.ts`. Preserve the PHP response shape:

```json
{
  "data": {
    "locations": [
      {
        "name": "Manila, Metro Manila",
        "search_value": "Manila, Metro Manila",
        "property_count": 8,
        "avg_price": 0,
        "min_price": 0,
        "max_price": 0,
        "price_range": "Various prices"
      }
    ]
  }
}
```

- [x] **Step 3: Add D1 migration for public listing tables**

Create `workers/api/migrations/0002_public_listings.sql` with `addresses` and `properties` columns needed by public listing endpoints.

- [x] **Step 4: Add route tests**

Create `workers/api/test/rooms.test.ts` for location name cleanup and max `limit` behavior.

- [ ] **Step 5: Port remaining public endpoints one at a time**

- [x] **Step 5: Port `/api/rooms/public`**

Create `workers/api/src/repositories/listings.ts` and extend `workers/api/src/routes/rooms.ts`. Preserve the PHP response envelope:

```json
{
  "data": {
    "properties": [],
    "total_count": 0,
    "limit": 20,
    "offset": 0
  }
}
```

Support `search`, `price_min`, `price_max`, `sort_by`, `limit`, and `offset`.

- [x] **Step 6: Add D1 migration for listing child tables**

Create `workers/api/migrations/0003_public_room_listings.sql` with `rooms`, `amenities`, `property_photos`, and `room_photos`.

- [x] **Step 7: Add route tests**

Extend `workers/api/test/rooms.test.ts` for `/api/rooms/public` response shape, room/photo/amenity enrichment, filters, pagination, and max `limit` behavior.

- [ ] **Step 8: Port remaining public endpoints one at a time**

- [x] **Step 8: Port `/api/rooms/detail`**

Extend `workers/api/src/repositories/listings.ts` and `workers/api/src/routes/rooms.ts`. Preserve PHP-compatible responses for success, missing `id`, and not found.

- [x] **Step 9: Add route tests**

Extend `workers/api/test/rooms.test.ts` for `/api/rooms/detail` response shape, room/photo/amenity enrichment, missing `id`, and not-found behavior.

- [x] **Step 10: Port `/api/rooms/similar`**

Extend `workers/api/src/repositories/listings.ts` and `workers/api/src/routes/rooms.ts`. Preserve the PHP response envelope:

```json
{ "data": [] }
```

Support `id` and `limit`, validate missing `id`, return `404` for unpublished or missing source properties, and clamp `limit` to `1..10`.

- [x] **Step 11: Add route tests**

Extend `workers/api/test/rooms.test.ts` for `/api/rooms/similar` response shape, price/location bind values, max `limit`, missing `id`, and not-found behavior.

- [ ] **Step 12: Port remaining public endpoints one at a time**

- [x] **Step 12: Port `/api/properties/all`**

Create `workers/api/src/routes/properties.ts` and extend `workers/api/src/repositories/listings.ts`. Preserve the PHP response envelope:

```json
{
  "data": {
    "properties": [],
    "total_count": 0
  }
}
```

Support both `/api/properties/all` and `/api/properties/all.php` while the existing frontend still calls the PHP-suffixed URL.

- [x] **Step 13: Add D1 migration for landlord profile names**

Create `workers/api/migrations/0004_landlord_profiles.sql` with the `landlord_profiles` columns needed by the map endpoint, especially `user_id` and `boarding_house_name`.

- [x] **Step 14: Add route tests**

Create `workers/api/test/properties.test.ts` for `/api/properties/all` and `/api/properties/all.php` response shape, amenities/photos enrichment, occupancy status, and empty map results.

- [x] **Step 15: Move to the next phase after remote migration is applied**

Next phase: boarder application and saved-listing routes.

## Task 4: Boarder Saved Listings And Applications

- [x] **Step 1: Inventory saved-listing and application behavior**

Read:

```bash
Get-Content functions\api\boarder\saved-listings.php
Get-Content functions\src\Modules\Application\Controllers\ApplicationController.php
Get-Content functions\src\Modules\Application\Repositories\ApplicationRepository.php
Get-Content functions\src\Modules\Application\Services\ApplicationService.php
```

- [x] **Step 2: Add protected-route auth context**

Extend `workers/api/src/lib/auth.ts` to support the PHP JWT `Authorization: Bearer <token>` flow, cookie `access_token` fallback, and the PHP development bypass via `X-User-ID` or `user_id`.

- [x] **Step 3: Add D1 migration for saved listings**

Create `workers/api/migrations/0005_saved_listings.sql` with `boarder_id`, `property_id`, optional `room_id`, `saved_at`, `deleted_at`, and the boarder/property uniqueness/indexes used by the PHP route.

- [x] **Step 4: Port saved-listing read paths**

Create `workers/api/src/repositories/saved-listings.ts` and `workers/api/src/routes/boarder.ts`. Preserve PHP-compatible responses for:

```json
{ "success": true, "data": [], "count": 0 }
```

and:

```json
{ "success": true, "is_saved": false, "saved_at": null }
```

- [x] **Step 5: Add route tests**

Create `workers/api/test/boarder.test.ts` for saved-listing list response shape, saved status checks, missing-token auth behavior, and boarder-only authorization.

- [x] **Step 6: Port saved-listing write paths**

Extend `workers/api/src/repositories/saved-listings.ts` and `workers/api/src/routes/boarder.ts` for `POST /api/boarder/saved-listings` and `DELETE /api/boarder/saved-listings`. Preserve PHP-compatible success and error responses for missing `property_id`, missing property, unavailable property, missing room, duplicate save, missing saved listing, and successful soft delete.

- [x] **Step 6a: Add saved-listing write tests**

Extend `workers/api/test/boarder.test.ts` for `POST` and `DELETE` saved-listing response shapes and validation errors.

- [x] **Step 7: Port application read paths**

Create `workers/api/migrations/0006_applications.sql`, `workers/api/src/repositories/applications.ts`, and `workers/api/src/routes/applications.ts`. Preserve PHP-compatible envelopes for:

```json
{ "data": [] }
```

and:

```json
{ "error": "Application not found" }
```

Port these endpoints:

- `GET /api/boarder/applications`
- `GET /api/boarder/applications/:id`
- `GET /api/landlord/applications`
- `GET /api/landlord/applications/:id`

- [x] **Step 7a: Add application read tests**

Create `workers/api/test/applications.test.ts` for boarder list, landlord list, detail ownership, not-found behavior, and user-bound D1 query parameters.

- [x] **Step 8: Port `POST /api/boarder/applications`**

Extend `workers/api/src/repositories/applications.ts` and `workers/api/src/routes/applications.ts`. Preserve PHP-compatible responses for successful creation, invalid JSON, missing required fields, missing rooms, duplicate active applications, and re-applying after a soft-deleted duplicate.

- [x] **Step 8a: Add application creation tests**

Extend `workers/api/test/applications.test.ts` for the `POST /api/boarder/applications` response shape, validation errors, D1 query parameters, duplicate checks, and soft-deleted duplicate cleanup.

- [x] **Step 9: Port `DELETE /api/boarder/applications/:id`**

Extend `workers/api/src/repositories/applications.ts` and `workers/api/src/routes/applications.ts`. Preserve PHP-compatible responses for successful soft delete, missing applications, invalid IDs, and unauthorized boarders.

- [x] **Step 9a: Add application delete tests**

Extend `workers/api/test/applications.test.ts` for `DELETE /api/boarder/applications/:id` response shape, ownership checks, not-found behavior, invalid ID behavior, and D1 query parameters.

- [x] **Step 10: Port `POST /api/boarder/applications/:id/confirm`**

Create `workers/api/migrations/0007_user_boarder_status.sql` and extend `workers/api/src/repositories/applications.ts` plus `workers/api/src/routes/applications.ts`. Preserve PHP-compatible responses for required `payment_method`, missing applications, unauthorized boarders, non-accepted applications, successful confirmation, boarder status update, and cancellation of other active applications.

- [x] **Step 10a: Add application confirmation tests**

Extend `workers/api/test/applications.test.ts` for `POST /api/boarder/applications/:id/confirm` response shape, validation errors, status checks, ownership checks, and D1 query parameters.

- [x] **Step 11: Port `PATCH /api/landlord/applications/:id/status`**

Extend `workers/api/src/repositories/applications.ts` and `workers/api/src/routes/applications.ts`. Preserve PHP-compatible responses for verified-landlord authorization, required `status`, invalid statuses, missing applications, unauthorized landlords, already processed applications, successful status updates, and boarder email auto-verification when accepting an application.

- [x] **Step 11a: Add application status update tests**

Extend `workers/api/test/applications.test.ts` for `PATCH /api/landlord/applications/:id/status` response shape, validation errors, owner checks, processed-status checks, verified-landlord write gating, and D1 query parameters.

Next phase: landlord property, room, boarder, announcement, calendar, and welcome-setting routes.

## Task 4.5: Landlord Property, Room, Boarder, Announcement, Calendar, And Settings Migration

- [x] **Step 1: Inventory Phase 5 landlord routes**

Read `functions/api/landlord/*` and frontend usage under `client/js/views/landlord`. Prioritize route groups already used by multiple landlord pages.

- [x] **Step 2: Port landlord property read endpoints**

Create `workers/api/src/repositories/landlord-properties.ts` and `workers/api/src/routes/landlord.ts`. Preserve PHP-compatible response envelopes for:

```json
{
  "data": {
    "properties": [],
    "total_count": 0
  }
}
```

and:

```json
{
  "data": {
    "id": 10,
    "name": "Pine House"
  }
}
```

Port these aliases:

- `GET /api/landlord/properties`
- `GET /api/landlord/properties.php`
- `GET /api/landlord/properties?id=:id`
- `GET /api/landlord/properties.php?id=:id`

- [x] **Step 2a: Add landlord property read tests**

Create `workers/api/test/landlord.test.ts` for landlord property list/detail response shapes, `.php` alias behavior, empty lists, not-found behavior, photo URL normalization, and landlord-only authorization.

- [ ] **Step 3: Port remaining landlord property write paths one at a time**

Next endpoints: `POST /api/landlord/listings`, property photo uploads, room photo uploads, `PUT /api/landlord/listings/:id`, and property delete/update aliases.

## Task 5: Frontend Cutover

- [ ] **Step 1: Add a configurable Worker API URL**

Modify `client/js/config.js` only after enough Worker endpoints exist for the page being tested. Keep `http://localhost:8000` as the PHP fallback until full parity.

- [ ] **Step 2: Test page groups**

Move one frontend area at a time: public room browsing, auth, boarder dashboard, landlord dashboard, then admin.

- [ ] **Step 3: Remove PHP dependency**

Only remove PHP routes after the same route group passes Worker tests, local browser checks, and production Cloudflare smoke checks.

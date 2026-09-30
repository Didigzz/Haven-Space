# Spec — Boarder "Find a Room" → Public `/find-a-room` Redirect

**Status:** **Implemented** (2026-09-26) — see §11 for the implementation notes.
**Short name:** `boarder-find-a-room-redirect`
**Date:** 2026-09-26
**Owner request (verbatim):**

> in http://localhost:3000/boarder/find-a-room, after clicking the find a room is should route back in http://localhost:3000/find-a-room

Reconstructed intent (confirmed during interview): the boarder-shell sidebar item labelled
**"Find a Room"** currently points at the in-shell duplicate grid
(`/boarder/find-a-room`). It should instead send the boarder to the **public browse page**
(`/find-a-room`), and the redundant in-shell grid/detail pages should be retired in favour of
the public equivalents. Alongside this, the account-menu entry labelled **"Dashboard"** should
read **"Application"** for boarders who don't yet have a confirmed tenancy.

---

## 1. Interview decisions (as answered by the requestor)

| # | Topic | Decision |
|---|-------|----------|
| D1 | Click target | The **sidebar "Find a Room" nav item** rendered by `Sidebar` from `apps/web/src/lib/nav.ts`. |
| D2 | Underlying goal | `/boarder/find-a-room` is a **redundant duplicate** of `/find-a-room`; the public page becomes the single browsing surface. |
| D3 | Scope toward the existing boarder tree | **Redirect + retire the tree** — replace the in-shell grid and detail with redirects; retarget all links. |
| D4 | Public page for signed-in boarders | **Public layout**, full listing-detail links go to **`/rooms/$id`**; the guest CTA stays hidden for signed-in users. |
| D5 | Apply / tour flow | **Keep `/boarder/find-a-room/$id/apply` and `/boarder/find-a-room/$id/tour` as they are** (still inside the boarder shell). |
| D6 | Boarder listing detail | **`/boarder/find-a-room/$id` also redirects** to `/rooms/$id`; only `apply`/`tour` survive under the boarder layout. |
| D7 | Post-login redirects | `redirectPathForUser` / `boarderRedirectPath` should target **`/find-a-room`** directly for `new`/`browsing` (both the web copy in `apps/web/src/lib/oauth.ts` and the API mirror in `workers/api/src/routes/auth/helpers.ts`). |
| D8 | Redirect mechanism | **Client-side `beforeLoad` redirect** in the route definitions. |
| D9 | Query/hash on the legacy URL | **Drop them** — redirect bare to `/find-a-room`. |
| D10 | Sidebar item | **Keep the item labelled "Find a Room"**, pointed at `/find-a-room`. Clicking it intentionally leaves the boarder shell. |
| D11 | Return path to the shell | The boarder **clicks the account name** (the existing `UserMenu` in `PublicNavbar`) → **Dashboard/Application** entry returns them to the shell. |
| D12 | Account-menu label | Boarder-only rename to **"Application"**, applied **context-aware**: non-confirmed boarders (whose landing is `/boarder/applications`) see **"Application"**; confirmed boarders see **"Dashboard"**. Landlord/admin keep "Dashboard". |
| D13 | Account-menu target | For non-confirmed boarders link **straight to `/boarder/applications`** (no `/boarder` redirect hop). |
| D14 | Logged-out visitor on `/boarder/find-a-room` | **Redirect to `/find-a-room` regardless** of auth state (no login bounce). |
| D15 | Detail-page Apply for a signed-in boarder | Public `/rooms/$id` sends them to **`/boarder/find-a-room/$id/apply`** (detects the session), instead of the current dead-end `→ /auth/login?redirect=/rooms/$id`. |
| D16 | Guest Apply (logged out) | Login `redirect` becomes the **apply form path**, so they land on the form after authenticating (not back on the detail page). |
| D17 | Back links on apply/tour | **Repoint to `/rooms/$id`** (no redirect hop). |
| D18 | Confirmed boarder's full nav | Its "Find a Room" item is **kept and pointed at `/find-a-room`** — consistent for every boarder. |
| D19 | Shared constant | Add a **new `apps/web/src/lib/routes.ts`** exporting the browse path, legacy-redirect map, and path builders, so destinations can't drift again. |
| D20 | Tests | **Update the existing assertions and add redirect coverage.** |
| D21 | Docs | **Update everything that references the route**, including QA specs and `report.md`. |
| D22 | Extras | **Nothing else** (rating UI, bookmarked-heart wiring, etc. are out of scope). |

---

## 2. Current architecture (verified facts)

- **Routes are file-based** under `apps/web/src/routes`, tree regenerated into
  `apps/web/src/routeTree.gen.ts`.
- **The boarder copy** is a three-layer layout:
  - `apps/web/src/routes/boarder/find-a-room.tsx` — `Protected role="boarder"` +
    `RoleShell title="Find a room"` + `<Outlet />`. This is the **shell for the whole
    subtree** and must survive so `apply`/`tour` keep their guard and sidebar.
  - `apps/web/src/routes/boarder/find-a-room/index.tsx` — renders
    `FindARoomContent detailTo="/boarder/find-a-room/$id"`.
  - `apps/web/src/routes/boarder/find-a-room/$id.tsx` — a bare `<Outlet />` layout for the
    detail children.
  - `apps/web/src/routes/boarder/find-a-room/$id/index.tsx` — queries `getRoomDetail`, renders
    `RoomDetailView` with `showSave` and `applyTo="/boarder/find-a-room/$id/apply"`.
  - `apps/web/src/routes/boarder/find-a-room/$id/apply.tsx` / `tour.tsx` — the real workflow.
- **The public copy:** `apps/web/src/routes/find-a-room/index.tsx` — `createServerFn` loader +
  `PublicLayout` + `FindARoomContent` (default `detailTo="/rooms/$id"`); the public detail is
  `apps/web/src/routes/rooms/$id.tsx` (server-loaded `RoomDetailView`, **no `applyTo`**).
- **Nav config:** `apps/web/src/lib/nav.ts` line 12 (`BOARDER_NAV`, item `to:
  '/boarder/find-a-room'`) and line 33 (`BOARDER_LIMITED_NAV`, same target). `useBoarderNav()`
  (`apps/web/src/lib/useBoarderNav.ts`) picks between them from live `boarder_status`.
- **Pre-tenancy behaviour (existing spec `pre-tenancy-boarder-nav-spec.md`):** non-confirmed
  boarders get `BOARDER_LIMITED_NAV` = Applications / Find a Room / Settings (D1, R1); `/boarder`
  redirects to `/boarder/applications` (D5); `FeatureGate`
  (`apps/web/src/components/boarder/FeatureGate.tsx`) gates hidden routes with a CTA back to
  `/boarder/applications`.
- **Account menu:** `apps/web/src/components/layout/UserMenu.tsx` — used by both `Topbar`
  (boarder/landlord/admin shells) and `PublicNavbar` (line 42), so it renders on the public
  `/find-a-room` too. `roleHome()` (lines 9–13) maps boarder → `/boarder`; the item label is
  hard-coded `"Dashboard"` at line 99.
- **Detail link wiring:** `apps/web/src/components/rooms/RoomDetailView.tsx` lines ~110–113:
  ```ts
  const publicDetailHref = `/rooms/${listing.id}`;
  const authRedirect = `/auth/login?redirect=${encodeURIComponent(publicDetailHref)}`;
  const applyHref = applyTo ?? authRedirect;
  const tourPath = `/boarder/find-a-room/${listing.id}/tour`;
  const secondaryHref = applyTo ? tourPath : authRedirect;
  const contactHref = applyTo ? '/boarder/messages' : authRedirect;
  const browseHref = applyTo ? '/boarder/find-a-room' : '/find-a-room';  // ← breadcrumb
  ```
  `applyTo` is only passed by `boarder/find-a-room/$id/index.tsx`.
- **Login redirect precedence:** every auth screen does
  `navigate({ to: redirect ?? redirectPathForUser(user) })` — the `redirect` search param wins,
  so the guest-Apply flow (D16) works without touching `redirectPathForUser`.
- **Existing tests that encode the old route:**
  - `apps/web/test/boarder-nav.test.ts` — `LIMITED_TO` (line 5) expects
    `/boarder/find-a-room`; `FULL_TO` derives from `BOARDER_NAV`.
  - `apps/web/test/oauth.test.ts` line 36 — `expect(redirectPathForUser(user('boarder'))).toBe('/boarder/find-a-room')`.
  - `workers/api/test/auth.test.ts` lines 711, 974–975 — asserts landing on
    `http://localhost:4173/boarder/find-a-room` (and `redirect` param value).
- **Test tooling:** `bun test --preload ./test/setup.ts`,
  `@testing-library/react` + `happy-dom` are available; existing tests are unit-level
  (no router harness exists yet).

---

## 3. Requirements

### 3.1 Shared destination constants

- **R1.** Create `apps/web/src/lib/routes.ts` exporting at minimum:
  - `BROWSE_LISTINGS_PATH = '/find-a-room'`
  - `LEGACY_ROUTE_REDIRECTS` (or an equivalent pure helper) mapping the retired boarder URLs to
    their public equivalents, e.g. `'/boarder/find-a-room' → '/find-a-room'`
  - `publicDetailPath(id)` → `` `/rooms/${id}` ``
  - `boarderApplyPath(id)` → `` `/boarder/find-a-room/${id}/apply` ``
  - `boarderTourPath(id)` → `` `/boarder/find-a-room/${id}/tour` ``
- **R2.** `apps/web/src/lib/nav.ts` must use `BROWSE_LISTINGS_PATH` for **both**
  `BOARDER_NAV`'s and `BOARDER_LIMITED_NAV`'s Find a Room item (labels unchanged).
- **R3.** No literal `'/boarder/find-a-room'` string may remain as a **navigation target** in
  app code (route definitions, nav config, links, breadcrumbs). It may appear only in the
  legacy-redirect map and its tests.

### 3.2 Retire the in-shell browse grid

- **R4.** `apps/web/src/routes/boarder/find-a-room/index.tsx` becomes a redirect route:
  `beforeLoad` throws `redirect({ to: BROWSE_LISTINGS_PATH, replace: true })`.
- **R5.** The redirect fires for **every** visitor, authenticated or not (D14), and **drops any
  query string / hash** (D9). A request for `/boarder/find-a-room/` (trailing slash) behaves
  identically.
- **R6.** The parent layout `apps/web/src/routes/boarder/find-a-room.tsx` is **kept unchanged**
  — it still supplies `Protected` + `RoleShell` to the surviving `apply`/`tour` routes.
- **R7.** The redirect must run in `beforeLoad` (not inside a component effect) so the boarder
  shell is never flashed before the redirect. TanStack runs the matched route's `beforeLoad`
  before the layout components render.

### 3.3 Retire the in-shell listing detail

- **R8.** `apps/web/src/routes/boarder/find-a-room/$id/index.tsx` becomes a redirect route to
  `publicDetailPath(id)` (D6), same mechanism and same query/hash policy as R4–R5.
- **R9.** `apps/web/src/routes/boarder/find-a-room/$id.tsx` (the `<Outlet />` layout) stays, so
  `$id/apply` and `$id/tour` keep rendering inside the boarder shell.

### 3.4 Surviving boarder apply/tour routes

- **R10.** `$id/apply.tsx` and `$id/tour.tsx` keep their current behaviour and paths (D5).
- **R11.** Their back links (apply line ~302, tour lines ~148/159) repoint from
  `/boarder/find-a-room/$id` to `publicDetailPath(id)` (D17).
- **R12.** Any other in-shell reference to the retired URLs (e.g. `RoomDetailView`'s
  `browseHref`, `apps/web/src/routes/boarder/index.tsx`'s "Find a room" link) resolves to
  `BROWSE_LISTINGS_PATH` / `publicDetailPath(id)`.

### 3.5 Detail-page apply wiring

- **R13.** `RoomDetailView` decides the apply destination from the session:
  - signed-in boarder → `boarderApplyPath(listing.id)` (D15)
  - signed-in landlord/admin → current behaviour (they have no apply flow; keep the login
    bounce or hide the CTA — see Open Question O2)
  - logged out → `/auth/login?redirect=${encodeURIComponent(boarderApplyPath(listing.id))}`
    (D16)
- **R14.** `browseHref` (the "Find a Room" breadcrumb) is always `BROWSE_LISTINGS_PATH`, for
  both the public detail and any in-shell rendering (the in-shell detail no longer exists).
- **R15.** `/rooms/$id` (public) is **not** redirected and keeps `PublicLayout` (D4); the guest
  CTA continues to be hidden for signed-in users.

### 3.6 Account menu

- **R16.** In `UserMenu.tsx`, the first menu entry renders:
  - boarder with `boarder_status === 'confirmed'` → label **"Dashboard"**, target `/boarder`
  - boarder with any other/unknown status → label **"Application"**, target
    `/boarder/applications` (D12, D13)
  - landlord → "Dashboard" → `/landlord`; admin → "Dashboard" → `/admin` (unchanged)
- **R17.** The boarder branch needs the live status. `UserMenu` must resolve it the same way the
  shell does — reuse `useBoarderStatus()` from `apps/web/src/lib/useBoarderNav.ts` (fail-safe
  `'new'` → "Application") rather than reading the possibly-stale session value (mirrors spec
  R14 of `pre-tenancy-boarder-nav-spec.md`). The extra query only fires for signed-in users.
- **R18.** For pre-tenancy boarders the entry must link **directly** to `/boarder/applications`
  and not rely on the `/boarder` redirect.

### 3.7 Login redirects

- **R19.** `boarderRedirectPath` in `apps/web/src/lib/oauth.ts`: `new`/`browsing` →
  `BROWSE_LISTINGS_PATH` (`/find-a-room`). All other statuses unchanged.
- **R20.** Mirror the same change in `workers/api/src/routes/auth/helpers.ts` so the API-side
  and web-side behaviour cannot diverge.
- **R21.** Google OAuth `redirect` state passthrough behaviour is unchanged.

---

## 4. Files to change

| File | Change |
|------|--------|
| `apps/web/src/lib/routes.ts` | **New.** Constants + legacy-redirect map + path builders (R1). |
| `apps/web/src/lib/nav.ts` | Point both boarder nav lists at `BROWSE_LISTINGS_PATH` (R2). |
| `apps/web/src/routes/boarder/find-a-room/index.tsx` | Replace grid with `beforeLoad` redirect (R4–R7). |
| `apps/web/src/routes/boarder/find-a-room/$id/index.tsx` | Replace detail with `beforeLoad` redirect to `/rooms/$id` (R8). |
| `apps/web/src/routes/boarder/find-a-room/$id/apply.tsx` | Repoint back link (R11). |
| `apps/web/src/routes/boarder/find-a-room/$id/tour.tsx` | Repoint back links (R11). |
| `apps/web/src/components/rooms/RoomDetailView.tsx` | Session-aware apply/login/browse targets (R13–R14). |
| `apps/web/src/routes/boarder/index.tsx` | "Find a room" link → `BROWSE_LISTINGS_PATH` (R12). |
| `apps/web/src/components/layout/UserMenu.tsx` | Context-aware label + target (R16–R18). |
| `apps/web/src/lib/oauth.ts` | `new`/`browsing` → `/find-a-room` (R19). |
| `workers/api/src/routes/auth/helpers.ts` | Mirror (R20). |
| `apps/web/src/routeTree.gen.ts` | Regenerated by `bun run web:build` (no manual edit). |

**Unchanged on purpose:** `boarder/find-a-room.tsx`, `boarder/find-a-room/$id.tsx`,
`routes/find-a-room/index.tsx`, `routes/rooms/$id.tsx`,
`components/boarder/FeatureGate.tsx`.

---

## 5. Edge cases and how they behave

| # | Case | Expected |
|---|------|----------|
| E1 | `/boarder/find-a-room/` (trailing slash) | Same redirect as the canonical path. |
| E2 | `/boarder/find-a-room?search=Quezon&sort_by=price-low#top` | Redirects bare to `/find-a-room`; filters reset to defaults (D9). |
| E3 | Logged-out visitor on `/boarder/find-a-room` | Lands on `/find-a-room` (public layout), **no** login bounce (D14). |
| E4 | Landlord/admin opening `/boarder/find-a-room` | Also redirected to `/find-a-room` — the legacy URL is a pure alias, not a role gate. |
| E5 | Boarder opens `/boarder/find-a-room/12` | Redirects to `/rooms/12` (public detail, public layout). |
| E6 | Boarder clicks Apply on `/rooms/12` | Goes to `/boarder/find-a-room/12/apply` inside the boarder shell. |
| E7 | Guest clicks Apply on `/rooms/12` | Login screen with `redirect=/boarder/find-a-room/12/apply`; after auth they land **on the form**; a landlord logging in through that URL must not be stranded (see O2). |
| E8 | Boarder on `/boarder/find-a-room/12/apply` presses back | Returns to `/rooms/12` (R11). |
| E9 | Direct visit to `/boarder/find-a-room/12/tour` | Still renders in the boarder shell (no redirect). |
| E10 | Pre-tenancy boarder on `/find-a-room` opens the account menu | Sees **"Application"** → `/boarder/applications`; the sidebar shell returns. |
| E11 | Confirmed boarder on `/find-a-room` opens the account menu | Sees **"Dashboard"** → `/boarder`; menu is otherwise unchanged. |
| E12 | Status changes in-session (`new` → `confirmed`) | Menu label and nav both upgrade live via `useBoarderStatus()`; no reload. |
| E13 | `/boarder` opened by a pre-tenancy boarder via the menu | Not reachable from the menu (goes to `/boarder/applications`); the existing `/boarder` redirect still covers typed URLs. |
| E14 | Retired URL in a bookmark or an old QA link | Resolves, doesn't 404. |

---

## 6. Test plan

**Update (must pass after the change):**

- `apps/web/test/boarder-nav.test.ts` — `LIMITED_TO` becomes
  `['/boarder/applications', '/find-a-room', '/boarder/settings']`; the tenancy-only hidden list
  still excludes `/find-a-room` only by not listing it — re-check the `hidden` array is still
  semantically right now that Find a Room leaves the shell (comment the reasoning).
- `apps/web/test/oauth.test.ts` — line 36 expects `/find-a-room`.
- `workers/api/test/auth.test.ts` — lines 711, 974–975 expect `/find-a-room` (and the
  `redirect` param value asserted at 975, if it still came from `redirectPathForUser`).

**Add:**

- `apps/web/test/routes.test.ts` (new, unit-level — matches the repo's existing test style,
  which has no router harness):
  - every boarder nav item's `to` is either an in-shell `/boarder/...` path or exactly
    `BROWSE_LISTINGS_PATH` (`/find-a-room`) — i.e. no item points at the retired URL;
  - `LEGACY_ROUTE_REDIRECTS['/boarder/find-a-room'] === '/find-a-room'`;
  - `publicDetailPath`, `boarderApplyPath`, `boarderTourPath` produce the expected strings;
  - the account-menu resolution helper (extract it as a pure function, e.g.
    `accountMenuEntry(role, boarderStatus)` in `UserMenu.tsx` or `lib/nav.ts`) returns
    `{ label: 'Application', to: '/boarder/applications' }` for every non-confirmed boarder
    status and `{ label: 'Dashboard', to: '/boarder' }` for `confirmed`, plus landlord/admin
    mappings.

**Commands:**

```bash
bun run web:typecheck
bun run web:test
bun run cf:api:typecheck
bun run cf:api:test
```

**Manual walkthrough (post-implementation, dev server):**

1. Log in as a **new / browsing** boarder → lands on `/find-a-room` (public layout).
2. Sidebar "Find a Room" (in the shell, before applying) → `/find-a-room`, sidebar gone.
3. Open the account menu → **"Application"** → `/boarder/applications` (shell returns).
4. Click a listing card → `/rooms/<id>` in the public layout.
5. Click **Apply** → `/boarder/find-a-room/<id>/apply` inside the shell.
6. Back link → `/rooms/<id>`.
7. Log out, click Apply on a listing → login → lands on the apply form.
8. Type `/boarder/find-a-room` and `/boarder/find-a-room/<id>` directly → both land publicly.
9. As a **confirmed** boarder: full sidebar, "Find a Room" → `/find-a-room`, menu reads
   "Dashboard" → `/boarder`.
10. Repeat 1–2 as a landlord/admin typing the legacy URL → redirected to `/find-a-room`.

---

## 7. Documentation to update

| Document | What to fix |
|----------|-------------|
| `pre-tenancy-boarder-nav-spec.md` | D1 (Find a Room destination), D11 (login redirects), R1, R3, R7+ and any mention of `/boarder/find-a-room` as the pre-tenancy browse destination. |
| `docs/specs/google-oauth.md` | Lines ~83, 125, 220, 231, 274, 277 — the `new`/`browsing` landing page. |
| `docs/qa/qa-spec.md` | Line 123 (browse step), the boarder find-a-room scenarios, BUG-08 write-up context. |
| `docs/qa/qa-spec-audit.md` | Route tables (~lines 175–177, 336, 352) and the "duplicate UI" pair list. |
| `qa-full-system-review-spec.md` | Route inventories (~lines 29, 139) and the duplicate-route watchlist. |
| `report.md` | W3 route tables (~lines 88–91, 536–538), route inventory (~line 373), trailing-slash alias notes. |
| `haven-space-audit.md` | Only if it states the boarder tree shape (line 360, 507) — add a retirement note rather than rewriting history. |

Rule of thumb: **living specs get edited in place; historical QA artefacts get an
"amended by this change" note** so past run records stay truthful.

---

## 8. Out of scope

- Wiring the bookmark/heart button (currently local `useState` only).
- The hardcoded `rating` / `reviews` display in `FindARoomContent`/`RoomDetailView`.
- Any redesign of `/find-a-room` or `/rooms/$id`.
- The `save`/saved-listings API (`workers/api/src/repositories/saved-listings.ts`) — untouched
  even though the public detail doesn't pass `showSave`.
- `FeatureGate` copy/CTA changes.
- The "Distance" filter on `/find-a-room` (currently a no-op select).

---

## 9. Open questions / risks

- **O1 — `/boarder/find-a-room/$id` layout shell.** While the detail redirects, the shell title
  for `apply`/`tour` remains `"Find a room"` (`boarder/find-a-room.tsx`). Acceptable, or should
  the title become "Apply" / "Schedule a tour" per child? *Default: leave as-is (no request).*
- **O2 — Landlord/admin through the guest-Apply login.** **Resolved by implementing the
  suggested handling:** `resolvePostAuthPath(user, redirect)` (web) / `resolvePostAuthPath`
  (API) honour an explicit return path only when it does not fall inside another role's area
  (`isForeignRolePath`), otherwise they fall back to `redirectPathForUser(user)`. Public paths
  such as `/haven-ai` still pass through for every role.
- **O3 — Redirect and `main` deploy.** Pages git integration + API CI are unaffected; the
  `routeTree.gen.ts` must be regenerated (`bun run web:build`) before the typecheck gate is
  meaningful.
- **O4 — Old QA screenshots/reports** referencing the boarder grid will describe a route that
  now redirects; that is expected and should be noted, not "fixed".
- **O5 — Naming.** Proposed filename: `boarder-find-a-room-redirect-spec.md` (repo-root
  convention, matching `pre-tenancy-boarder-nav-spec.md` and `qa-full-system-review-spec.md`).

---

## 10. Acceptance criteria

1. Clicking the sidebar **Find a Room** item from anywhere in the boarder shell lands on
   `/find-a-room` in the public layout.
2. `/boarder/find-a-room`, `/boarder/find-a-room/`, and `/boarder/find-a-room/<id>` all resolve
   via client-side redirects (grid → `/find-a-room`, detail → `/rooms/<id>`); no 404, no shell
   flash, no query/hash carried over.
3. `/boarder/find-a-room/<id>/apply` and `/tour` still work inside the boarder shell, with back
   links to `/rooms/<id>`.
4. A signed-in boarder clicking Apply on a public listing reaches the apply form; a guest
   reaches it after logging in.
5. The account menu shows **"Application" → `/boarder/applications`** for non-confirmed
   boarders and **"Dashboard" → `/boarder`** for confirmed boarders; landlords/admins unchanged.
6. `new`/`browsing` post-login landings are `/find-a-room` in both the web and API helpers.
7. No navigation target in app code references the retired URLs; destinations come from
   `lib/routes.ts`.
8. `bun run web:typecheck`, `web:test`, `cf:api:typecheck`, and `cf:api:test` all pass with the
   updated expectations.
9. The documentation listed in §7 reflects the new routing.

---

## 11. Implementation notes (2026-09-26)

**What landed**

| Area | Change |
|------|--------|
| `apps/web/src/lib/routes.ts` | **New.** `BROWSE_LISTINGS_PATH`, `LEGACY_BROWSE_LISTINGS_PATH`, `LEGACY_ROUTE_REDIRECTS`, `publicDetailPath`, `boarderApplyPath`, `boarderTourPath`, `BOARDER_MESSAGES_PATH`, `loginRedirectPath`. |
| `apps/web/src/lib/nav.ts` | Both boarder nav lists use `BROWSE_LISTINGS_PATH`; added the pure `accountHomeEntry(role, boarderStatus)` + `AccountHomePath`/`AccountMenuEntry` types. |
| `apps/web/src/routes/boarder/find-a-room/index.tsx` | Grid replaced with a `beforeLoad` `redirect` to `/find-a-room` (`replace: true`, query/hash dropped). |
| `apps/web/src/routes/boarder/find-a-room/$id/index.tsx` | Detail replaced with a `beforeLoad` `redirect` to `/rooms/$id`. |
| `apps/web/src/routes/boarder/find-a-room/$id/{apply,tour}.tsx` | Back links repointed to `/rooms/$id`. |
| `apps/web/src/components/rooms/RoomDetailView.tsx` | Session-aware: a signed-in boarder gets `boarderApplyPath`/`boarderTourPath`/`BOARDER_MESSAGES_PATH`; guests and other roles get `loginRedirectPath(applyPath)`; the breadcrumb is always `BROWSE_LISTINGS_PATH`. |
| `apps/web/src/components/layout/UserMenu.tsx` | Uses `accountHomeEntry` + `useBoarderStatus({ enabled: isBoarder })`; the local `roleHome()` was removed. |
| `apps/web/src/lib/useBoarderNav.ts` | `useBoarderStatus` accepts `{ enabled }` so non-boarders don't fire an extra `/auth/me`. |
| `apps/web/src/lib/oauth.ts` | `new`/`browsing` → `/find-a-room`; added `resolvePostAuthPath` + `isForeignRolePath` (O2). |
| `workers/api/src/routes/auth/helpers.ts` / `google.ts` | `browseListingsPath`, `resolvePostAuthPath` mirrored; the Google callback uses it. |
| `apps/web/src/routes/auth/{login,signup/index,signup/landlord,choose-role}.tsx` | Post-auth navigation goes through `resolvePostAuthPath`; landlord signup still defaults to `/landlord/verification`. |

**Tests** — `apps/web/test/boarder-nav.test.ts` (`LIMITED_TO`), `apps/web/test/oauth.test.ts`
(+ `resolvePostAuthPath` / `isForeignRolePath` cases), `workers/api/test/auth.test.ts`
(lines ~711/974), and a new `apps/web/test/routes.test.ts` (constants, legacy redirect map, no
nav item pointing at the retired URL, path builders, `accountHomeEntry`).

**Verification** — `bun run web:typecheck`, `bun run cf:api:typecheck`, `bun run web:test`
(71 pass), `bun run cf:api:test` (243 pass), plus `prettier --write` on every touched file.

**Notes / deviations**

- O1 left as-is: the shared `boarder/find-a-room.tsx` shell still titles apply/tour pages
  "Find a room".
- No router-level test harness exists yet, so redirect coverage is unit-level (constants +
  nav wiring); the §6 manual walkthrough still applies.
- No `routeTree.gen.ts` regeneration was needed — no route files were added or removed.

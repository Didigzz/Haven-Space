# Spec: Pre-Tenancy Boarder Sidebar (limited nav until tenancy is confirmed)

**Status:** Spec only — no code changes yet.
**Request short name:** `pre-tenancy-boarder-nav`
**Date:** 2026-09-26

> **Amended by `boarder-find-a-room-redirect-spec.md` (2026-09-26).** The in-shell browse
> grid and listing detail were retired: **Find a Room now targets the public `/find-a-room`
> page** (`/boarder/find-a-room` and `/boarder/find-a-room/$id` redirect there), and the
> `new`/`browsing` login landing is `/find-a-room`. Only `/boarder/find-a-room/$id/apply`
> and `/boarder/find-a-room/$id/tour` still render inside the boarder shell. Everything else
> in this spec — the limited nav, the gate, `/boarder` → `/boarder/applications` — is
> unchanged. References to the old destination below are updated inline.

---

## 1. Problem statement

A boarder who signs up / logs in with Google (or any method) but has **not yet been accepted
into — or confirmed a booking with — a boarding house sees the full boarder sidebar:

> Dashboard, My Tenancy, Applications, Find a Room, Messages, Announcements, Payments,
> House Rules, Settings

Most of those destinations are meaningless before a tenancy exists (there is nothing to
announce, no messages thread, no payments, no house rules, no tenancy record). The sidebar
should only offer the items that make sense for a boarder who is still applying:

> **Applications, Find a Room, Settings**

…until the boarder's booking is **confirmed** (active tenancy), at which point the full
sidebar appears.

This is a **UI/state bug, not an auth bug**: the nav list `BOARDER_NAV`
(`apps/web/src/lib/nav.ts`) is a static array passed to `RoleShell` by every boarder route,
so all boarders — Google or email/password — always see the same full list.

## 2. Decisions made during interview

| # | Topic | Decision |
|---|-------|----------|
| D1 | Items kept pre-tenancy | **Applications, Find a Room, Settings** (Find a Room is required so a new boarder can discover rooms and apply — it links to the public `/find-a-room`; see the amendment note above). Dashboard is *not* kept. |
| D2 | Trigger condition | Limited nav for **every `boarder_status` except `confirmed`**: `new`, `browsing`, `applied_pending`, `pending_confirmation`, `rejected`, `accepted`. Full nav only for `confirmed`. |
| D3 | Auth-method scope | **All boarders**, regardless of login method (Google vs email/password). The nav is state-based, not auth-method based. |
| D4 | Direct URL visits to hidden routes | Render an **"not available yet" gate** using the existing `EmptyState` component (`apps/web/src/components/ui/EmptyState.tsx`) with a CTA button back to `/boarder/applications`. |
| D5 | Dashboard (`/boarder`) | **Hidden from nav + redirect** to `/boarder/applications` for non-confirmed boarders who hit `/boarder` by URL. |
| D6 | State source | **Live API query** (React Query), not the possibly-stale session value. The nav must reflect the current server-side status. |
| D7 | Live upgrade | When the status becomes `confirmed` (landlord confirms booking), the **full sidebar must appear immediately in the same session**, without logout/login. |
| D8 | Sidebar layout (limited) | **Flatten to a single group** (e.g. `MAIN`) containing the 3 items — no `Discovery`/`Account` headers when the nav is limited. |
| D9 | Onboarding route | **Out of scope.** `apps/web/src/routes/onboarding/boarder.tsx` keeps the current full `BOARDER_NAV`. |
| D10 | Post-confirm landing | **Unchanged.** `/boarder/confirm-booking` → `/boarder/tenancy` as today; the full nav simply appears alongside it. |
| D11 | Login redirects | Keep `redirectPathForUser`/`boarderRedirectPath` in `apps/web/src/lib/oauth.ts` (mirrored in `workers/api/src/routes/auth/helpers.ts`): `new`/`browsing` → **`/find-a-room`** (was `/boarder/find-a-room`; amended by `boarder-find-a-room-redirect-spec.md`), `applied_pending`/`pending_confirmation`/`rejected` → `/boarder/applications`, `accepted` → `/boarder/confirm-booking`, `confirmed` → `/boarder`. All of these destinations remain reachable in the limited nav (except `/boarder`, which now redirects — see D5). |
| D12 | Implementation shape | A **`useBoarderNav()` hook** that reads live status and returns the filtered/reshaped `NavItem[]`; call sites swap `nav={BOARDER_NAV}` → `nav={useBoarderNav()}`. |
| D13 | Verification | Typecheck + a **manual QA checklist** (matrix in §7). No new unit-test suite required, though a pure filter helper may be unit-tested if convenient. |

## 3. Current architecture (relevant facts)

- **Nav config:** `apps/web/src/lib/nav.ts` exports `BOARDER_NAV` (9 items across groups
  `Main`, `Discovery`, `Communication`, `Payments`, `Info`, `Account`), plus `LANDLORD_NAV`
  and `ADMIN_NAV` (both untouched by this spec).
- **Rendering:** `apps/web/src/components/layout/RoleShell.tsx` accepts `nav` and renders
  `Sidebar` only when `nav.length > 0`. `apps/web/src/components/layout/Sidebar.tsx`
  groups items by `item.group` with `useMemo` and renders a section header per group.
  **Note:** `Sidebar` already skips the header row when collapsed; grouping logic needs no
  change if the hook emits items with a single shared `group`.
- **Call sites:** ~20 boarder route files pass `nav={BOARDER_NAV}` (see
  `apps/web/src/routes/boarder/**` and `apps/web/src/routes/onboarding/boarder.tsx`).
  Each is `<Protected role="boarder"><RoleShell title=… nav={BOARDER_NAV}>…`.
- **Status field:** `AuthUser.boarder_status?: string` (`apps/web/src/lib/types.ts` line
  ~125). Computed server-side by `determineBoarderStatus()`
  (`workers/api/src/repositories/users.ts`): returns `confirmed` iff a confirmed booking
  exists; recomputed on `GET` account/me (`workers/api/src/routes/account.ts`) and on Google
  login (`workers/api/src/routes/auth/google.ts`). Stored/updated on the `users` table by
  applications and tenancy repositories.
- **Status values:** `new`, `browsing`, `applied_pending`, `pending_confirmation`,
  `rejected`, `accepted`, `confirmed` (see `boarderRedirectPath` and
  `workers/api/src/lib/application-status.ts` transitions
  `pending → accepted → confirmed → ended`).
- **Existing API helpers:** `getMe` (recomputes status server-side), `getTenancy`
  (`/api/boarder/tenancy`, returns `data: null` when no active tenancy),
  `getAcceptedApplications` (`/api/boarder/accepted-applications`). Frontend uses
  React Query throughout (`queryKey: ['tenancy']`, `['accepted']`, …).
- **Empty state primitive:** `EmptyState({ title, description })` — dashed-border centered
  card. It has **no action slot today**; a CTA button will need to be rendered next to/under
  it (either extend the component with an optional `action`/children prop, or compose
  `<EmptyState …/><Button …/>` in the gate wrapper — implementation choice).

## 4. Requirements

### 4.1 Navigation visibility

- **R1.** For a boarder whose live status is **not** `confirmed`, the sidebar renders exactly:
  - Applications → `/boarder/applications`
  - Find a Room → `/find-a-room` (public page — clicking it leaves the boarder shell;
    amended by `boarder-find-a-room-redirect-spec.md`)
  - Settings → `/boarder/settings`
- **R2.** All other boarder items (Dashboard, My Tenancy, Messages, Announcements,
  Payments, House Rules) are omitted from the sidebar for non-confirmed boarders.
- **R3.** For `boarder_status === 'confirmed'`, the sidebar renders the existing full
  `BOARDER_NAV` exactly as today (9 items, original groups).
- **R4.** Limited nav renders under a **single group header** (label: `MAIN`). Full nav keeps
  the current multi-group layout.
- **R5.** Landlord and admin navs are untouched.
- **R6.** Onboarding (`/onboarding/boarder`) keeps the full `BOARDER_NAV` (D9).

### 4.2 Route gating (direct URL access)

- **R7.** For non-confirmed boarders, visiting a hidden route by URL renders a gate screen
  instead of the page content:
  - Uses `EmptyState` with copy equivalent to:
    - title: `"Not available yet"`
    - description: `"This becomes available once your booking is confirmed and your tenancy starts."`
    - CTA button: `"Go to Applications"` → `/boarder/applications`
  - The route shell (sidebar with the *limited* nav + topbar) still wraps the gate, so the
    user is never dropped out of the boarder layout.
- **R8.** Hidden-and-gated routes: `/boarder` is special (R9); gated list =
  `/boarder/tenancy`, `/boarder/messages`, `/boarder/announcements`, `/boarder/payments`
  (incl. `/boarder/payments/pay`), `/boarder/house-rules`, plus any other boarder sub-route
  that only makes sense with an active tenancy (e.g. `/boarder/maps`,
  `/boarder/rooms/$id` if it is tenancy-scoped — verify during implementation).
- **R9.** `/boarder` (Dashboard): non-confirmed boarders are **redirected** to
  `/boarder/applications`. Confirmed boarders see the dashboard as today.
- **R10.** Routes that must remain reachable pre-tenancy (never gated):
  `/boarder/applications` (+ `$id`, `settings`), `/boarder/find-a-room/$id/apply`,
  `/boarder/find-a-room/$id/tour`, `/boarder/settings`, `/boarder/confirm-booking`
  (required for `accepted` status), `/boarder/application-submitted`. The browse grid and
  detail are no longer part of this list — `/boarder/find-a-room` and
  `/boarder/find-a-room/$id` redirect to the public page and are reachable by anyone
  (amended by `boarder-find-a-room-redirect-spec.md`).
- **R11.** Confirmed boarders are never gated — every route behaves exactly as today.
- **R12.** Gating is a **frontend concern only**; no API/route changes are required by this
  spec (backend already scopes data per boarder).

### 4.3 State resolution & live updates

- **R13.** The nav is computed from a **live React Query fetch**, e.g.
  `queryKey: ['boarder-status']` calling `getMe()` (which recomputes `boarder_status`
  server-side) — or an equivalent existing endpoint. Fetch policy: stale-time of a few
  minutes + `refetchOnWindowFocus`, and invalidation after status-mutating actions
  (application submit/withdraw/confirm, booking confirm, leave request finalize).
- **R14.** Fallback behavior while loading or on fetch error: use the session
  `user.boarder_status` from `useAuth()` so the sidebar never flashes the wrong shape.
  Default (no session value yet) = **limited nav** (fail-safe: don't show unavailable items).
- **R15.** When the status flips to `confirmed` (R13 detects it, or the existing
  `['tenancy']` query is invalidated by `confirm-booking`), the full sidebar appears
  **without re-login**. Conversely, when a tenancy ends and the server resets
  `boarder_status` to `'new'`, the sidebar shrinks back to the limited set.
- **R16.** `accepted` (accepted but unconfirmed) users still get the **limited** sidebar —
  `confirm-booking` remains directly reachable and is where they land post-login.

### 4.4 Implementation shape (D12)

- **R17.** Add `useBoarderNav()` (suggested location:
  `apps/web/src/lib/useBoarderNav.ts` or `apps/web/src/components/layout/useBoarderNav.ts`,
  keeping non-routes trees ≤4 levels per project convention).
  - Internally: `useAuth()` for the session fallback + one React Query status fetch.
  - Returns `NavItem[]`.
  - Pure filtering/reshaping should live in an exported helper
    (e.g. `getBoarderNav(status: string | undefined): NavItem[]` in `lib/nav.ts`) so it is
    trivially unit-testable.
- **R18.** Every gated boarder route swaps `nav={BOARDER_NAV}` → `nav={useBoarderNav()}`
  except `apps/web/src/routes/onboarding/boarder.tsx` (keeps `BOARDER_NAV`).
  `BOARDER_NAV` remains exported as the canonical full list.
- **R19.** The gate screen is implemented once (small shared component or helper, e.g.
  `components/boarder/FeatureGate.tsx`) and reused by gated routes rather than copy-pasted.
- **R20.** No changes to `apps/web/src/lib/oauth.ts` redirect logic (D11) and no Worker API
  changes.

## 5. Explicit non-goals

- No changes to landlord/admin navigation.
- No changes to onboarding navigation (D9).
- No backend/auth changes; Google login flow untouched.
- No redesign of the sidebar beyond grouping/omission described here.
- No enforcement of gating server-side.

## 6. Edge cases to handle

1. **Fresh Google account, first login:** status `new` → limited nav; lands on
   `/find-a-room` (public page — amended by `boarder-find-a-room-redirect-spec.md`).
2. **Status fetch slow/failing:** session value used; no nav flicker from full → limited.
3. **SSR/hydration:** `Protected` returns `null` pre-hydration, so nav is client-only — no
   hydration mismatch expected, but the hook must be a plain React hook (no `window`
   access during render).
4. **`accepted` user mid-flow:** limited nav while on `/boarder/confirm-booking`; after
   confirming, `['tenancy']`/`['boarder-status']` invalidate → full nav on the
   `/boarder/tenancy` landing page.
5. **Tenancy ends** (`confirmed` → server resets status to `new`): nav shrinks back;
   previously-visible routes then show the gate.
6. **Expired/refreshed token:** if the status query 401s, existing auth refresh handles
   the session; nav falls back to session status meanwhile.
7. **Direct deep link** (bookmark) to a gated route while logged out: existing
   `Protected` redirect to `/auth/login` runs first; after login the normal redirect logic
   (D11) applies, then gating.
8. **Empty groups:** limited nav must not render empty group headers (single `MAIN`
   group avoids this; full nav unchanged).
9. **`rejected` / `pending_confirmation` boarders:** still need Applications + Find a Room
   (to re-apply) + Settings — covered by the limited set.

## 7. Manual QA checklist

Run with `bun run web:dev` + `bun run cf:api:dev` (local migrations applied).

| # | Scenario | Expected |
|---|----------|----------|
| Q1 | Brand-new account, **Google login**, `/boarder` settings/dashboard nav | Sidebar = MAIN: Applications, Find a Room, Settings only |
| Q2 | Same account, **email/password login** | Identical sidebar (auth method irrelevant) |
| Q3 | Type `/boarder/payments` by URL (also `/boarder/messages`, `/boarder/announcements`, `/boarder/house-rules`, `/boarder/tenancy`) | "Not available yet" EmptyState + "Go to Applications" CTA inside the boarder shell |
| Q4 | Click CTA | Lands on `/boarder/applications` |
| Q5 | Type `/boarder` by URL | Redirected to `/boarder/applications` |
| Q6 | Visit Find a Room → open a room → Apply | Application submitted; nav still limited (status `applied_pending`) |
| Q7 | Submit an application by URL after status change | Still limited nav |
| Q8 | Landlord accepts the application → boarder refreshes/focuses tab (same session, **no logout**) | Nav still limited; post-login landing would be `/boarder/confirm-booking`; confirm-booking page reachable |
| Q9 | Boarder confirms booking | Full 9-item sidebar with original groups appears immediately; lands on `/boarder/tenancy` |
| Q10 | Confirmed boarder visits `/boarder/payments`, `/boarder`, etc. | No gating, pages render as today |
| Q11 | Limited nav layout | Single `MAIN` header, 3 items; no empty `Discovery`/`Communication`/… headers |
| Q12 | `/onboarding/boarder` | Full `BOARDER_NAV` unchanged (out of scope) |
| Q13 | Sidebar collapse/expand with limited nav | Behaves correctly (icon-only mode, no stray headers) |
| Q14 | Logout → login again as confirmed boarder | Full nav at first render |
| Q15 | Non-tenanted boarder with landlord/admin account switch | Landlord/admin sidebars unchanged |

**Automated verification:** `bun run web:typecheck` must pass; `bun run web:test` must
stay green (existing tests in `apps/web/test/`). If `getBoarderNav()` is extracted as a
pure helper, add a small unit test covering each `boarder_status` value.

## 8. Files expected to change (implementation phase)

| File | Change |
|------|--------|
| `apps/web/src/lib/nav.ts` | Add `getBoarderNav(status)` pure helper + limited-nav constant |
| `apps/web/src/lib/useBoarderNav.ts` (new) | Hook: live status query + session fallback → `NavItem[]` |
| `apps/web/src/components/boarder/FeatureGate.tsx` (new) | Shared EmptyState + CTA gate screen |
| `apps/web/src/components/ui/EmptyState.tsx` | Optional: accept children/`action` for the CTA |
| `apps/web/src/routes/boarder/*.tsx` + nested (~20 files) | `nav={useBoarderNav()}`; gated routes render `FeatureGate` when status ≠ confirmed |
| `apps/web/src/routes/onboarding/boarder.tsx` | **No change** (keeps `BOARDER_NAV`) |

Not touched: `apps/web/src/lib/oauth.ts`, `workers/api/**`, landlord/admin navs.

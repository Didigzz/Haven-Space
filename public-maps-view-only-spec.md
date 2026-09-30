# Spec — `/public-maps` is a view-only public map (no "Use my location")

**Status:** **Not implemented** — spec only (written 2026-09-30). No code has been changed.
**Short name:** `public-maps-view-only`
**Date:** 2026-09-30
**Owner request (verbatim):**

> In map view http://localhost:3000/public-maps, dont apply the use my location etcc.. because it is
> a public map only for viewing

**Relationship to earlier work:** the `auth-hero-map-locale` spec made every map page share one
Google-embed module pinned on `Malaybalay, Bukidnon`; the `map-use-location` spec then added a
"Use my location" control **to all four map pages plus the listing-detail map** (its decision `D2`
explicitly listed `/public-maps`). That second feature **is already implemented in the working
tree** (uncommitted). This spec is a **targeted carve-out**: `/public-maps` steps back out of the
`map-use-location` feature and becomes a purely static, view-only page. Nothing about the feature
itself changes, and no other surface is touched.

---

## 1. Interview decisions (as answered by the requestor)

| #   | Topic | Decision |
| --- | ----- | -------- |
| D1 | Page scope | **Only `/public-maps`.** `/maps`, `/boarder/maps`, `/landlord/maps` and the listing-detail map keep the "Use my location" control exactly as they are. |
| D2 | Meaning of the change | **Remove the capability, not just the button.** `/public-maps` never reads geolocation, never requests a position, and never renders a runtime-coordinate map URL. |
| D3 | Remembered opt-in | **Not honoured.** Even if the visitor previously clicked "Use my location" elsewhere and `haven.mapUseLocation` is set, `/public-maps` still opens on Malaybalay. The page must not read the flag. |
| D4 | Subtitle | **Revert to the existing Malaybalay line** — `mapSubtitle()`, i.e. "Browse boarding houses around Malaybalay, Bukidnon." The location-worded `LOCATION_SUBTITLE` is no longer reachable on this page. |
| D5 | Cross-link | **Add a small path through to `/maps`** so a visitor who wanted a "near me" map is not stranded. |
| D6 | Cross-link placement | **A right-aligned row between the page header and the map frame** — the same position the removed toolbar occupied. |
| D7 | Cross-link rendering | **`variant="outline"`, `size="sm"`** — the same Button shape the removed control used, so the row keeps its visual weight. Implemented as a `<Link>` styled with `buttonClasses()` (the repo's existing convention for navigation that reads as a button). |
| D8 | Cross-link label | **"Open the interactive map"** (single shared string, literal in the page). |
| D9 | Cross-link icon | **`Icon name="map"`** (`maps.svg`) — signals "go to the other map page", not "find me". |
| D10 | Cross-link target | `/maps` (the other public map page, which keeps the location feature). Not `/find-a-room`, not the boarder map. |
| D11 | "View only" and the map itself | **The Google embed stays fully interactive** (pan/zoom/fullscreen as Google renders it). Only the geolocation affordance is removed. No static image, no locked scroll. |
| D12 | Pinned place | **Unchanged: `Malaybalay, Bukidnon` at `z=13`**, the same as every other surface. The page does not broaden to a nationwide view. |
| D13 | Page identity | **Minimal change.** Remove the control, revert the subtitle, add the link row. No new explanatory copy, no hint card. |
| D14 | "View only" indicator | **None.** No badge, no label, no visible statement that the page is read-only. |
| D15 | Shared files | **`MapLocationControl.tsx`, `useMapLocation.ts`, `geolocation.ts` and `MapEmbed.tsx` are left untouched.** No `readOnly`/`static`/`enabled` prop is added; `/public-maps` simply stops importing and calling them. The other surfaces must compile and behave byte-identically. |
| D16 | Reversibility | **Hard-coded removal.** No feature flag, no `PUBLIC_MAPS_LOCATION_ENABLED` constant. Turning it back on would mean restoring the wiring deliberately. |
| D17 | Tests | **Flip the existing guard into a two-way assertion:** `/public-maps` must NOT contain the control or the hook wiring, **and** the other three pages must still render `MapLocationControl`. |
| D18 | Earlier spec doc | **`map-use-location-spec.md` is left as-is** — the historical record of what it spec'd. Its stale `D2` ("all four pages") is deliberately not amended, only noted as a known divergence. |
| D19 | `/public-maps` vs `/maps` duplication | **Noted, not acted on.** The near-duplicate pair is recorded as a known follow-up in §9; no consolidation, merge or retirement in this change. |
| D20 | Hero CTA | **Left pointing at `/public-maps`.** The home hero's "View Map" button is not repointed to `/maps`; the D5/D6 link on the page is the affordance. |
| D21 | Verification | **`bun run web:typecheck`, `bun run web:test`, and a live check** of `http://localhost:3000/public-maps` confirming the control is gone, the subtitle is back, and the link navigates to `/maps`. |
| D22 | Deliverables / git | **Changes stay uncommitted**, matching the convention of the two preceding map specs. No commit, no PR, no edit to any other doc. |

---

## 2. Current state (verified 2026-09-30)

### 2.1 `apps/web/src/routes/public-maps.tsx` — today

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { PublicLayout } from '../components/layout/PublicLayout';
import { LOCATION_SUBTITLE, MapEmbed, mapSubtitle } from '../components/rooms/MapEmbed';
import { MapLocationControl } from '../components/rooms/MapLocationControl';
import { PageHeader } from '../components/ui/PageHeader';
import { mapUrlForCoordinates } from '../lib/maps';
import { useMapLocation } from '../lib/useMapLocation';

export const Route = createFileRoute('/public-maps')({
  component: PublicMapsPage,
});

function PublicMapsPage() {
  const location = useMapLocation();
  const pin = location.coordinates;
  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <PageHeader title="Public map" subtitle={pin ? LOCATION_SUBTITLE : mapSubtitle()} />
        <MapLocationControl state={location} />
        <MapEmbed
          title="Haven Space public map"
          heightClass="h-[60vh]"
          url={pin ? mapUrlForCoordinates(pin.latitude, pin.longitude) : undefined}
        />
      </div>
    </PublicLayout>
  );
}
```

This page is the **only** thing that changes. Note the three things it does today that must stop:
calls `useMapLocation()` (which reads `localStorage` **and** may fire `getCurrentPosition()` on
mount when an opt-in is stored — the D3 path), renders `MapLocationControl`, and passes a runtime
`url` to `MapEmbed`.

### 2.2 The pieces it stops using (all **unchanged** by this spec)

| File | Role |
| ---- | ---- |
| `apps/web/src/lib/useMapLocation.ts` | The shared hook. Reads `hasLocationOptIn()` and auto-applies on mount (`autoApply` defaults `true`). `/public-maps` calling this is precisely what D3 forbids. |
| `apps/web/src/lib/geolocation.ts` | `supportsGeolocation()`, `getCurrentCoordinates()`, `hasLocationOptIn()`, `setLocationOptIn()`, `clearLocationOptIn()`, `LOCATION_OPT_IN_KEY = 'haven.mapUseLocation'`. Untouched. |
| `apps/web/src/components/rooms/MapLocationControl.tsx` | The toolbar row + "Use my location" / "Locating…" / "Reset to Malaybalay" buttons + the `sr-only` `aria-live` status line. Untouched. |
| `apps/web/src/components/rooms/MapEmbed.tsx` | `MapEmbed({ title, heightClass, url })` — `src={url ?? DEFAULT_MAP_URL}`, plus `mapSubtitle()` and `LOCATION_SUBTITLE`. Untouched; `/public-maps` simply stops passing `url`. |
| `apps/web/src/lib/maps.ts` | `MAP_LOCATION_QUERY`, `DEFAULT_MAP_ZOOM = 13`, `DEFAULT_MAP_URL`, `USER_LOCATION_MAP_ZOOM = 15`, `mapUrlForCoordinates()`, `osmEmbedUrl()`. Untouched. |

### 2.3 The other three surfaces (must not regress)

| Surface | File | Keeps |
| ------- | ---- | ----- |
| `/maps` | `routes/maps.tsx` | `useMapLocation()` + `MapLocationControl` + runtime `url` + `LOCATION_SUBTITLE` swap |
| `/boarder/maps` | `routes/boarder/maps.tsx` | same (inside `Protected role="boarder"` + `RoleShell`) |
| `/landlord/maps` | `routes/landlord/maps.tsx` | same (inside `Protected role="landlord"` + `RoleShell`) |
| listing detail | `components/rooms/RoomDetailView.tsx` | `useMapLocation({ autoApply: false })` + `MapLocationControl` above the OSM listing map |

### 2.4 Building blocks the replacement row uses (all already exist)

- **`Button` / `buttonClasses`** — `components/ui/Button.tsx`. `buttonClasses({ variant, size, className })`
  returns `inline-flex items-center justify-center rounded-full font-semibold …` plus the variant and
  size classes. `outline` = `border-2 border-primary bg-surface text-primary hover:bg-mint`;
  `sm` = `px-3 py-1.5 text-sm`. Already used on `<Link>` elsewhere (e.g. `routes/landlord/index.tsx`),
  so a Link-as-button here is the house convention, not a new pattern.
- **`Icon`** — `components/ui/Icon.tsx`. `map → maps.svg`, `location → location.svg`; the component
  takes `name`, `size` and `className`.
- **`PageHeader`** — `components/ui/PageHeader.tsx`, `PageHeader({ title, subtitle })`. Its `actions`
  slot is **not** used (D6 places the row in the page body, exactly where the control was).
- **`Link`** — `@tanstack/react-router` (type-safe `to="/maps"`; the route exists and is registered
  in `routeTree.gen.ts`, so no codegen change is needed).

### 2.5 What changes in the existing test file

`apps/web/test/maps.test.ts` currently contains:

```ts
test('every map surface renders the shared location control', () => {
  for (const file of [...MAP_ROUTES, 'components/rooms/RoomDetailView.tsx']) {
    const source = readFileSync(join(SRC_DIR, file), 'utf8');
    expect(source).toContain('MapLocationControl');
  }
});
```

`MAP_ROUTES` includes `'routes/public-maps.tsx'`, so **this test fails the moment the change lands**
and must be flipped per D17 (R6/R7 below). Every other assertion in the file remains valid and must
stay green: `MAP_SURFACE_FILES` still legitimately contains `routes/public-maps.tsx` for the
"no coordinates leave the device" scan.

---

## 3. Requirements

### 3.1 The page (`apps/web/src/routes/public-maps.tsx`)

- **R1.** The page **must not import or call `useMapLocation`**, and must not import `geolocation.ts`.
  No hook instance is mounted, so **nothing on this page can read `hasLocationOptIn()` or call
  `getCurrentPosition()`** — the D3 guarantee is structural, not conditional.

- **R2.** The page **must not render `MapLocationControl`** and must not import it. No toolbar, no
  "Use my location" button, no "Locating…" state, no "Reset to Malaybalay" action, and no `sr-only`
  `aria-live` status line on this page.

- **R3.** `<MapEmbed />` is called with **`title` and `heightClass` only** — no `url` prop. The embed
  therefore resolves to `DEFAULT_MAP_URL` (Malaybalay, `z=13`) on every render, for every visitor,
  in every session state. `title="Haven Space public map"` and `heightClass="h-[60vh]"` are unchanged.

- **R4.** The subtitle is **`mapSubtitle()`** unconditionally — no ternary, no `LOCATION_SUBTITLE`
  import. Final string: `Browse boarding houses around Malaybalay, Bukidnon.` The
  `PageHeader title="Public map"` is unchanged.

- **R5.** A replacement row renders **in the same position as the removed toolbar** (immediately after
  `PageHeader`, before `MapEmbed`), right-aligned, with the same vertical rhythm the control had
  (`mb-4`, `flex flex-wrap items-center justify-end`) so the layout does not jump:

  ```tsx
  <div className="mb-4 flex flex-wrap items-center justify-end">
    <Link to="/maps" className={buttonClasses({ variant: 'outline', size: 'sm' })}>
      <Icon name="map" size={16} className="mr-1.5" />
      Open the interactive map
    </Link>
  </div>
  ```

  The exact markup is an implementation choice; the **contract** is: a `Link` to `/maps`, styled as
  an `outline`/`sm` button, led by the `map` icon, labelled exactly `Open the interactive map`,
  right-aligned in the row the control used to occupy.

- **R6.** Nothing else on the page changes: `PublicLayout` wrapper, `mx-auto max-w-6xl px-4 py-10`
  container, `createFileRoute('/public-maps')`, the component name `PublicMapsPage`. No new route,
  no `routeTree.gen.ts` edit, no route-level loader, no `head`/meta change.

- **R7.** The result must be **identical for every visitor state**: signed out or signed in, first
  visit or returning, opt-in stored or not, permission granted/denied/unavailable. There is no code
  path on this page that depends on any of them. (D2/D3)

### 3.2 The other surfaces (explicitly unchanged)

- **R8.** `routes/maps.tsx`, `routes/boarder/maps.tsx`, `routes/landlord/maps.tsx` and
  `components/rooms/RoomDetailView.tsx` are **not edited**. They keep the hook, the control, the
  runtime URL and the `LOCATION_SUBTITLE` swap exactly as they are now.

- **R9.** `lib/useMapLocation.ts`, `lib/geolocation.ts`, `lib/maps.ts`,
  `components/rooms/MapLocationControl.tsx` and `components/rooms/MapEmbed.tsx` are **not edited**.
  No prop is added to the control or the embed to "support" this page (D15) — the page opts out by
  not calling them, which also means the removal cannot accidentally weaken the other surfaces.

- **R10.** The shared `haven.mapUseLocation` opt-in keeps its current meaning everywhere else. A
  visitor can opt in on `/maps` and out on `/maps`; `/public-maps` neither reads nor writes it. (D3,
  and the round-1 rejection of "clearing the flag on visit".)

### 3.3 Tests (`apps/web/test/maps.test.ts`)

- **R11.** The existing `test('every map surface renders the shared location control')` is **flipped
  into a two-way assertion** (D17):

  - the three remaining map routes (`routes/maps.tsx`, `routes/boarder/maps.tsx`,
    `routes/landlord/maps.tsx`) **and** `components/rooms/RoomDetailView.tsx` still contain
    `MapLocationControl` — so a future "cleanup" cannot silently strip the feature everywhere;
  - `routes/public-maps.tsx` **does not** contain `MapLocationControl`.

- **R12.** A **static-surface guard** for `/public-maps` asserts, by source scan of
  `routes/public-maps.tsx`:

  - `useMapLocation` is absent;
  - `MapLocationControl` is absent;
  - `mapUrlForCoordinates` is absent;
  - `LOCATION_SUBTITLE` is absent;
  - `lib/maps`'s coordinate builder is never referenced, so the page cannot carry a runtime URL;
  - `<MapEmbed` is still present (the page still renders a map) and the `url=` prop is **not**
    passed to it;
  - the file contains exactly one `/maps` link target (`to="/maps"`) — the interactive-map CTA.

- **R13.** The pre-existing "every map route renders the shared embed, not a literal URL" test
  (`<MapEmbed` present, `<iframe` absent, no `https://www.google.com/maps` literal) must still pass
  for `routes/public-maps.tsx` — it does, since R3 keeps the shared embed.

- **R14.** The pre-existing privacy scans must still pass with `routes/public-maps.tsx` in
  `MAP_SURFACE_FILES`: no `fetch(`, no `createServerFn`, no `console.log` in the page.

- **R15.** The geolocation-scope scans must still pass and must **not** be weakened:
  `navigator.geolocation` remains referenced only by `lib/geolocation.ts`, and `LOCATION_OPT_IN_KEY`
  remains referenced only by that module. Removing the hook call from `/public-maps` must not
  introduce a second reference anywhere.

- **R16.** `bun run web:typecheck` is clean. This is also what proves the page has no dangling import
  after `LOCATION_SUBTITLE`, `MapLocationControl`, `mapUrlForCoordinates` and `useMapLocation` are
  dropped from its import list.

- **R17.** The rest of the suite under `apps/web/test/` (`routes.test.ts`, `components.test.tsx`,
  `asset-refs.test.ts`, `auth-layout.test.tsx`, `boarder-nav.test.ts`, `feature-gate.test.tsx`,
  `amenity-icons.test.ts`, `landlord-documents-modal.test.tsx`) stays green.

### 3.4 Verification

- **R18.** Run, from the repo root:

  ```bash
  bun run web:typecheck
  bun run web:test
  ```

- **R19.** **Live check** (D21) against the running dev server at `http://localhost:3000/public-maps`:

  1. the page renders the header "Public map" and the Malaybalay subtitle;
  2. **no** "Use my location" button and **no** "Reset to Malaybalay" anywhere on the page;
  3. the right-aligned "Open the interactive map" button sits above the map and navigates to `/maps`;
  4. `/maps` still shows "Use my location" — proving the carve-out did not leak;
  5. with `haven.mapUseLocation` set to `'1'` in `localStorage` and **before** visiting `/public-maps`,
     the public map still opens on Malaybalay (the D3 check), while `/maps` still follows the user.

  If a dev server is not already listening on port 3000, start `bun run web:dev` and use its port
  rather than assuming 3000.

---

## 4. Files to change

| # | File | Change |
| - | ---- | ------ |
| 1 | `apps/web/src/routes/public-maps.tsx` | Drop the hook, the control and the runtime `url`; restore `mapSubtitle()`; add the `/maps` Link row (R1–R7) |
| 2 | `apps/web/test/maps.test.ts` | Flip the control guard into a two-way assertion; add the static-surface guard (R11, R12) |

**Two files. Nothing else.** No new file, no deletion, no dependency, no migration, no API/worker
change, no new route, no `routeTree.gen.ts` change, no new image asset, no edit to
`map-use-location-spec.md` (D18), and no edit to any other page (R8–R10).

---

## 5. Exact resulting values

| Item | Before | After |
| ---- | ------ | ----- |
| `useMapLocation()` calls on `/public-maps` | 1 | **0** |
| `MapLocationControl` renders on `/public-maps` | 1 | **0** |
| `MapEmbed url` prop on `/public-maps` | `pin ? mapUrlForCoordinates(...) : undefined` | **not passed** |
| Effective iframe `src` on `/public-maps` | `DEFAULT_MAP_URL`, or coordinates at `z=15` when active | **always `DEFAULT_MAP_URL`** |
| Effective `src` string | — | `https://www.google.com/maps?q=Malaybalay%2C%20Bukidnon&output=embed&z=13` |
| `/public-maps` title | `Public map` | `Public map` *(unchanged)* |
| `/public-maps` subtitle | `pin ? LOCATION_SUBTITLE : mapSubtitle()` | **`mapSubtitle()`** → `Browse boarding houses around Malaybalay, Bukidnon.` |
| `/public-maps` iframe `title` | `Haven Space public map` | `Haven Space public map` *(unchanged)* |
| `/public-maps` frame height | `h-[60vh]` | `h-[60vh]` *(unchanged)* |
| Row above the map | location toolbar (button + reset + `sr-only` status) | `Open the interactive map` outline `sm` link → `/maps`, `map` icon |
| Extra visible copy on the page | — | none beyond that button |
| `haven.mapUseLocation` on `/public-maps` | read + auto-applied on mount | **never read, never written** |
| `/maps` `/boarder/maps` `/landlord/maps` listing map | location feature | **unchanged** |

---

## 6. Edge cases

| Case | Expected behaviour |
| ---- | ------------------ |
| Opt-in stored in `localStorage`, visitor opens `/public-maps` | Malaybalay. The page never reads the flag, so no lookup happens and the permission prompt cannot appear (D3). |
| Opt-in stored, visitor opens `/maps` right after | Unchanged — `/maps` auto-applies as it does today. The two pages disagree on purpose. |
| First-ever visit, no opt-in | Malaybalay, no prompt, button present inviting them to `/maps`. |
| Geolocation permission previously **denied** in browser settings | Irrelevant to this page — nothing is requested, nothing fails, no fallback logic runs. |
| Browser without `navigator.geolocation` / insecure context | Irrelevant — the page has no geolocation dependency at all. This is the one surface where the control cannot be "hidden because unsupported", because it is not there in the first place. |
| Signed-out visitor deep-links `/public-maps` | Unchanged: `PublicLayout` (public page, no `Protected` gate). |
| Signed-in boarder/landlord opens `/public-maps` | Identical to a signed-out visitor — authenticated role never enters the page's render (R7). |
| Client-side navigation `/public-maps` → `/maps` (via the new link) | `/maps` mounts its own hook; a stored opt-in auto-applies there. No state is carried across from the public page, and none needs to be. |
| Client-side navigation `/maps` → `/public-maps` while `/maps` is tracking | `/public-maps` renders Malaybalay immediately; the `/maps` hook unmounts and its in-flight lookup is ignored by its own `mounted`/`requestId` guard (existing behaviour, unmodified). |
| Two tabs, one on `/maps` (tracking) and one on `/public-maps` | Independent; the public tab is always Malaybalay. No cross-tab sync is introduced or needed. |
| SSR / Worker-mode render of `/public-maps` | Renders the Malaybalay embed and the link row; the page touches no `window`/`navigator`/`localStorage`, so there is no hydration mismatch and nothing new to guard (a strict improvement on today's version, which mounts an effect that reads `localStorage`). |
| The visitor clears site data / uses "Reset to Malaybalay" on `/maps` | No effect on `/public-maps`, which was already static. |
| `/maps` removed or renamed in a future change | The new `Link to="/maps"` is a **type-checked** route, so `bun run web:typecheck` fails loudly rather than shipping a dead link. |
| Google Maps ignores the embed's `z=13` | Degrades to Google's default zoom, still pinned on Malaybalay — the same pre-existing risk class as today (unchanged by this spec). |
| Slow network on `/public-maps` | Nothing new to wait for: no permission prompt, no lookup. The page's only async work is the iframe itself. |

---

## 7. Test plan

Run from the repo root:

```bash
bun run web:typecheck
bun run web:test          # bun test --preload ./test/setup.ts
```

Extend `apps/web/test/maps.test.ts` using its existing style (`bun:test`, `node:fs` +
`import.meta.dir` source scans, `@testing-library/react` with the happy-dom registrator preloaded in
`apps/web/test/setup.ts`).

**R20. Two-way control assertion (replaces the current one).**

- For `routes/maps.tsx`, `routes/boarder/maps.tsx`, `routes/landlord/maps.tsx` and
  `components/rooms/RoomDetailView.tsx`: source contains `MapLocationControl`.
- For `routes/public-maps.tsx`: source does **not** contain `MapLocationControl`.

**R21. `/public-maps` static-surface guard.** Source scan of `routes/public-maps.tsx` asserting the
absence of `useMapLocation`, `MapLocationControl`, `LOCATION_SUBTITLE`, `mapUrlForCoordinates` and
`lib/maps`-derived runtime URLs, plus the presence of `<MapEmbed` **without** a `url=` prop, and
exactly one `to="/maps"` link.

**R22. Subtitle.** Assert the page cannot produce the location-worded subtitle: it does not contain
`LOCATION_SUBTITLE`, and `mapSubtitle()` still returns
`Browse boarding houses around Malaybalay, Bukidnon.` (the existing `MAP_LOCATION_QUERY` assertion
covers the string's source).

**R23. No new geolocation surface.** Re-run the existing scans unchanged:
`navigator.geolocation` referenced only in `lib/geolocation.ts`; `LOCATION_OPT_IN_KEY` referenced
only in `lib/geolocation.ts`; no `fetch(`/`createServerFn`/`console.log` in any
`MAP_SURFACE_FILES` entry.

**R24. Regression.** The full `apps/web/test/` suite stays green, and `bun run web:typecheck` is
clean.

**R25. Live check** exactly as R19 — this is a spec-mandated manual step (D21), not optional.

---

## 8. Out of scope (explicit)

- **`/maps`.** Stays a location-enabled public page; it is the target of the new CTA (D1, D10).
- **`/boarder/maps` and `/landlord/maps`.** Authenticated map pages; untouched (R8).
- **The listing-detail map** in `RoomDetailView` (OSM embed, `autoApply: false`). Untouched (R8).
- **The whole `map-use-location` feature.** No change to the hook, the storage key, the control, the
  zoom constants, the silent-failure behaviour or the privacy rules — on any other surface (R9).
- **New props on shared components.** No `readOnly`/`static`/`enabled` mode (D15).
- **A feature flag** or any named constant making this reversible by configuration (D16).
- **Any visible "view only" affordance.** No badge, banner or hint card (D13, D14).
- **Copy for the home hero or footer.** The hero's "View Map" button keeps pointing at
  `/public-maps`, and the hero's "near your location" line is not reworded (D20, D13).
- **Repointing or adding any other navigation.** Footer, navbar, `/find-a-room`'s "Map" button: no
  change.
- **Consolidating or retiring `/public-maps` vs `/maps`.** Duplication is noted in §9, not fixed (D19).
- **A nationwide/wider pin.** The page keeps the Malaybalay locale (D12).
- **Any API, worker, D1, migration, analytics, log or dependency change.**
- **Amending `map-use-location-spec.md`** (D18) and **any commit** (D22).

---

## 9. Open questions / risks

1. **Stale doc divergence.** `map-use-location-spec.md` `D2` states the control belongs on all four
   map pages and its acceptance checklist asserts `/public-maps` shows it. After this change that
   document describes the other three surfaces only. Per D18 the old spec is left untouched; if the
   repo ever treats specs as living documents, this is the first place to reconcile.
2. **`/public-maps` vs `/maps` are near-duplicates.** `report.md` already flags the pair (and pairs
   like `auth/signup` + `auth/signup/index`) as duplicate route files resolving to similar UI. After
   this change the only meaningful difference is the location control. Consolidating them (one page,
   a `locationEnabled` flag) is a natural follow-up but explicitly out of scope here (D19) — worth
   revisiting once the public pages get another design pass.
3. **Hero "View Map" now leads to the lesser map.** The home hero's primary map CTA targets
   `/public-maps`, which after this change cannot answer "near me". D20 keeps it there and D5/D6 add
   an on-page escape hatch. If analytics ever show the hero CTA as a top entry point, repointing it to
   `/maps` (or flipping the two pages' roles) is the obvious corrective.
4. **The `/maps` link is the only affordance.** A visitor who lands on `/public-maps` and looks for
   "near me" has exactly one path. If that proves too quiet, the low-risk escalation is a wordier
   label or a second line of copy — both deliberately excluded by D13/D14 for now.
5. **Removal is structural, not behavioural.** Because the page stops importing the hook entirely
   (R1), there is no runtime guard that could be bypassed by a stored opt-in, a stale bundle or a
   future refactor that reintroduces `pin`. The paired inverse test (R11/R12) is what keeps it that
   way; without it, a copy-paste of `maps.tsx` would silently restore the feature.
6. **No `url` prop means no way to deep-link a different locale** on the public page (e.g. a future
   `?place=` query). Not needed today; noted so the omission is deliberate.

---

## 10. Acceptance criteria

- [ ] `/public-maps` renders **no** "Use my location" button, **no** "Reset to Malaybalay" action and
      **no** location status line.
- [ ] `apps/web/src/routes/public-maps.tsx` does not import or call `useMapLocation`,
      `MapLocationControl`, `mapUrlForCoordinates` or `LOCATION_SUBTITLE`.
- [ ] The iframe `src` on `/public-maps` is `DEFAULT_MAP_URL` for every visitor, every session, every
      stored-opt-in state — and `<MapEmbed>` is called without a `url` prop.
- [ ] The subtitle is `Browse boarding houses around Malaybalay, Bukidnon.` and the title is
      `Public map`; the map still renders at `h-[60vh]` with the same iframe `title`.
- [ ] A right-aligned row between the header and the map holds an `outline`/`sm` **"Open the
      interactive map"** button with the `map` icon, linking to `/maps`.
- [ ] The Google embed stays fully interactive (pan/zoom) — no static image, no scroll lock.
- [ ] `/maps`, `/boarder/maps`, `/landlord/maps` and the listing-detail map are **byte-identical** to
      before this change, and `/maps` still shows and honours "Use my location".
- [ ] `MapLocationControl.tsx`, `useMapLocation.ts`, `geolocation.ts` and `MapEmbed.tsx` are **not
      modified**; no new prop or flag was introduced.
- [ ] `apps/web/test/maps.test.ts` asserts both directions (public page lacks it; the other four
      surfaces still have it) and gains the static-surface guard.
- [ ] `bun run web:typecheck` clean; `bun run web:test` green, including the pre-existing privacy and
      geolocation-scope scans.
- [ ] Live check on `localhost:3000/public-maps` passes, including the "opt-in stored, page still
      shows Malaybalay" case.
- [ ] `map-use-location-spec.md` and every other doc are untouched; no new file besides this spec;
      working tree left uncommitted.

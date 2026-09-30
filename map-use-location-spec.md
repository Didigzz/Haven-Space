# Spec — "Use my location" on the Map Views

**Status:** **Not implemented** — spec only (written 2026-09-30). No code has been changed.
**Short name:** `map-use-location`
**Date:** 2026-09-30
**Owner request (verbatim):**

> I want to have a changes in map view, when a user use location( use location ), the map view then
> directly point in the location of a , user, but if the user didnt open the location, the default
> will be in Malaybalay

**Relationship to earlier work:** the `auth-hero-map-locale` spec already landed the *static* half of
this feature — a shared `apps/web/src/lib/maps.ts` module, a shared `components/rooms/MapEmbed.tsx`,
and the Malaybalay default on all four map pages. This spec is the **dynamic** half: an explicit
"Use my location" affordance that re-points the map at the user's real coordinates, with Malaybalay
remaining the fallback. **No part of the existing Malaybalay default is reverted or removed** — it
becomes the fallback state.

---

## 1. Interview decisions (as answered by the requestor)

| #   | Topic | Decision |
| --- | ----- | -------- |
| D1 | What "use location" means | **An explicit "Use my location" button.** No automatic permission prompt on page load. |
| D2 | Page scope | **All four Google-map pages**: `/maps`, `/public-maps`, `/boarder/maps`, `/landlord/maps`. |
| D3 | Point of the pin | **Exact user coordinates** (raw `lat,lng` from the browser), not a reverse-geocoded place name. |
| D4 | User outside Malaybalay | **Follow the user anywhere.** Malaybalay is only the fallback when location is unavailable — it is not a service-area fence. |
| D5 | Remembering the user | **Remember the opt-in in `localStorage` and auto-apply it on later visits** (no second click needed). |
| D6 | Denied / unavailable / timeout | **Silent fallback to Malaybalay.** No toast, no inline error, no message of any kind. |
| D7 | Page copy while tracking | **Switch the subtitle to "your location" wording.** |
| D8 | Copy phrasing | **One shared string reused on all four pages** (not per-page voice). |
| D9 | Privacy | **Coordinates never leave the browser.** No API call, no server log, no analytics payload. |
| D10 | Zoom at the user's location | **`z=15`** (neighbourhood level) — tighter than the Malaybalay default `z=13`. |
| D11 | Button placement | **In a toolbar row sitting between the page header and the map frame.** |
| D12 | Button busy state | **Disabled, with a "Locating…" label**, while the browser resolves the position. |
| D13 | Unsupported browser / insecure context | **Hide the button entirely** if `navigator.geolocation` is absent. |
| D14 | Returning to Malaybalay | **Yes — a "Reset to Malaybalay" action** that clears the stored opt-in and restores the default view. |
| D15 | Storage contents | **An opt-in flag only.** Coordinates are never persisted; they are re-fetched live every visit. |
| D16 | Freshness | **Re-request fresh coordinates on every page load** where the opt-in is set (accurate if the user moved). |
| D17 | Shared device | **Acceptable to remember**; the Reset control is the documented way to undo it. |
| D18 | Listing-detail map (`RoomDetailView`) | **In scope.** It gets the same button; activating it **swaps the embed to the user's coordinates** and the reset action restores the listing marker. |
| D19 | Reach of "all map surfaces" | **All five map surfaces** — the four pages plus the listing detail map. There is **no admin map** in the repo (grep-verified), so five is exhaustive. |
| D20 | Verification | **`bun run web:typecheck` + `bun run web:test` only.** No browser walk required. |
| D21 | Where tests go | **Extend the existing `apps/web/test/maps.test.ts`**; no new test file. |
| D22 | Deliverables / git | **Changes stay uncommitted** (same convention as the previous spec). No commits, no doc edits. |

---

## 2. Current state (verified 2026-09-30)

### 2.1 The shared locale module

`apps/web/src/lib/maps.ts` is the single source of truth and already exports:

```ts
export const MAP_LOCATION_QUERY = 'Malaybalay, Bukidnon';
export const DEFAULT_MAP_ZOOM = 13;
export const DEFAULT_MAP_URL = `https://www.google.com/maps?q=${encodeURIComponent(
  MAP_LOCATION_QUERY
)}&output=embed&z=${DEFAULT_MAP_ZOOM}`;
```

It is the **only** place a Google Maps URL is built — but the URL is a **module-load-time constant**,
which is exactly what blocks this feature: the user's coordinates are runtime data, so the module needs
a *builder* in addition to the constant (R2).

### 2.2 The shared embed

`apps/web/src/components/rooms/MapEmbed.tsx`:

```tsx
export function MapEmbed({ title, heightClass }: { title: string; heightClass: string }) {
  return <iframe title={title} src={DEFAULT_MAP_URL} className={`w-full rounded-lg border-0 shadow-card ${heightClass}`} />;
}

export function mapSubtitle(): string {
  return `Browse boarding houses around ${MAP_LOCATION_QUERY}.`;
}
```

The `src` is hardcoded to `DEFAULT_MAP_URL`; the component takes no location input (R4).

### 2.3 The five surfaces

| # | Surface | File | Current map | Current copy |
| - | ------- | ---- | ----------- | ------------ |
| 1 | `/maps` | `routes/maps.tsx` | `<MapEmbed title="Haven Space map" heightClass="h-[60vh]" />` | `PageHeader` "Explore the map" / `mapSubtitle()` → "Browse boarding houses around Malaybalay, Bukidnon." |
| 2 | `/public-maps` | `routes/public-maps.tsx` | `<MapEmbed title="Haven Space public map" heightClass="h-[60vh]" />` | `PageHeader` "Public map" / `mapSubtitle()` |
| 3 | `/boarder/maps` | `routes/boarder/maps.tsx` | `<MapEmbed title="Haven Space map" heightClass="h-[70vh]" />` | `PageHeader icon="map"` "Explore the map" / "Find boarding houses and available rooms near you." |
| 4 | `/landlord/maps` | `routes/landlord/maps.tsx` | `<MapEmbed title="Haven Space map" heightClass="h-[70vh]" />` | `PageHeader icon="map"` "Property map view" / "See your properties in and around the areas you manage." |
| 5 | Listing detail | `components/rooms/RoomDetailView.tsx` (lines 47–68, called at 179) | local `MapEmbed({latitude, longitude, title})` → **OpenStreetMap** `export/embed.html?bbox=…&marker=lat,lng`, `h-[420px] sm:h-[480px]`, `loading="lazy"` | Inside the photo section; gated by a `showMap` toggle and a "Back to Images" button |

`RoomDetailView`'s map is a **separate local component** that happens to share the name `MapEmbed`.
Both maps are plain `<iframe>`s, so "moving the pin" always means "recomputing the iframe `src`".

### 2.4 What already exists to build on

- **Icons**: `Icon.tsx` already maps `location → location.svg`, `target → location.svg`, `pin → LocationPin.svg`. No new asset needed.
- **Buttons**: `components/ui/Button.tsx` — `Button` + `buttonClasses()`, variants `primary|secondary|outline|ghost|…`, sizes `sm|md`, with `disabled:opacity-60` already styled.
- **Header slot**: `PageHeader` accepts an `actions?: ReactNode` slot (`flex flex-wrap items-center gap-2` on the right). It is a natural home for a toolbar control, but the requestor chose a **separate toolbar row above the map** (D11), not the header slot — see R6 for how the two coexist.
- **Toast infra**: `lib/toast.ts` exists but is **unused here** — D6 is a silent fallback.
- **Hook convention**: `lib/useBoarderNav.ts` shows hooks live at the root of `apps/web/src/lib`.

### 2.5 What does **not** exist

- **No geolocation code anywhere.** `navigator.geolocation` / `getCurrentPosition` appear in **zero** files under `apps/web/src` (grep-verified). This is a from-scratch browser-API integration.
- **No proximity, distance, or radius logic.** Nothing sorts listings by distance; the maps are Google *place* results, not Haven inventory (carried over from the previous spec's §9 note about BUG-05).
- **No admin map.** `apps/web/src/routes/admin/` has no map reference.

---

## 3. Requirements

### 3.1 Location source (new module)

- **R1.** A new browser-side module owns the geolocation call and the opt-in persistence. Suggested
  path `apps/web/src/lib/geolocation.ts`, keeping `lib/maps.ts` purely about map URLs. Suggested shape:

  ```ts
  export type UserCoordinates = { latitude: number; longitude: number };

  /** True only in a browser that can actually serve a position. */
  export function supportsGeolocation(): boolean;

  /** localStorage key holding the opt-in flag, e.g. 'haven.mapUseLocation'. */
  export const LOCATION_OPT_IN_KEY = 'haven.mapUseLocation';

  export function hasLocationOptIn(): boolean;      // guarded for SSR
  export function setLocationOptIn(on: boolean): void; // guarded for SSR
  export function clearLocationOptIn(): void;       // = setLocationOptIn(false)

  /** Promise wrapper over navigator.geolocation.getCurrentPosition; rejects with the
   *  PositionError code on denial/unavailable/timeout. */
  export function getCurrentCoordinates(options?: PositionOptions): Promise<UserCoordinates>;
  ```

  The module, the file names and the key string are **implementation choices**; the *contract*
  (one module, flag-only storage, SSR-guarded, promise-returning) is the requirement.

- **R2.** `apps/web/src/lib/maps.ts` gains a **builder** alongside the existing constant. The constant
  `DEFAULT_MAP_URL` still exists and must keep the same value (the existing test asserts on it):

  ```ts
  /** Zoom once the map is following the user (neighbourhood level). */
  export const USER_LOCATION_MAP_ZOOM = 15;

  /** Google Maps embed pinned on raw coordinates. Not for module scope — coordinates are runtime data. */
  export function mapUrlForCoordinates(latitude: number, longitude: number, zoom = USER_LOCATION_MAP_ZOOM): string;

  /** OpenStreetMap embed for the listing-detail surface. */
  export function osmEmbedUrl(latitude: number, longitude: number, label?: string): string;
  ```

  Both builders must keep `output=embed` / `export/embed.html` semantics identical to today's strings,
  so the *only* visible change is which point is pinned. `encodeURIComponent` stays on the `q` value.

### 3.2 The shared React hook

- **R3.** One hook — suggested `apps/web/src/lib/useMapLocation.ts` — is the only place the four pages
  and the listing map get their behaviour, so the surfaces cannot drift:

  ```ts
  type MapLocationState = {
    /** 'idle' | 'locating' | 'active' */
    status: 'idle' | 'locating' | 'active';
    coordinates: UserCoordinates | null;
    /** Hides the control entirely when the browser can't provide a position (D13). */
    supported: boolean;
    /** Request a fresh position and remember the opt-in. */
    useMyLocation: () => void;
    /** Forget the opt-in and return to the Malaybalay default (D14). */
    reset: () => void;
  };
  ```

  Behaviour it must implement:

  1. **Mount (client only):** if `hasLocationOptIn()` is true, immediately call
     `getCurrentCoordinates()` and, on success, set `coordinates` + `status: 'active'` **without**
     flipping on a loading UI (D16, D5). This is the "auto-apply" path.
  2. **`useMyLocation()`:** set `status: 'locating'` (D12), call `getCurrentCoordinates()`, and on
     success persist the opt-in flag and set `coordinates` + `'active'`.
  3. **`reset()`:** clear the stored flag, drop `coordinates`, return to `'idle'`.
  4. **On any failure** (denied, unavailable, timeout, insecure context, no API): return to
     `'idle'`/Malaybalay and surface **nothing** (D6). Do **not** clear the opt-in flag on failure —
     a transient GPS failure must not silently destroy a working preference; only `reset()` clears it.
  5. **Cleanup:** ignore results that arrive after unmount (no state updates on an unmounted hook).

- **R4.** The hook is **never called during SSR render** and never touches `window`/`navigator`/
  `localStorage` outside a client-only path (effect or guarded accessor). The web app is SSR'd in
  Worker mode, so a top-level `navigator.geolocation` read would break the build.

### 3.3 Shared UI

- **R5.** A shared control component — suggested `apps/web/src/components/rooms/MapLocationControl.tsx` —
  renders the toolbar row and both states:

  - **Idle / fallback state:** a `Button` (`variant="outline"`, `size="sm"` suggested) reading
    **"Use my location"**, with the existing `Icon name="location"` (or `target`) leading it.
  - **Locating state:** the same button **disabled** with the label **"Locating…"** (D12).
  - **Active state:** the button reflects "on" (e.g. `aria-pressed="true"` / a filled variant) and a
    second control **"Reset to Malaybalay"** is available (D14).
  - **Unsupported:** the component renders **nothing at all** when `supported` is false (D13).
  - The row sits **between the page header and the map iframe**, right-aligned, on every surface (D11).
  - Accessibility: the status change is exposed (`aria-pressed` on the toggle; an `aria-live="polite"`
    status line or an accessible label change) so the state is not conveyed by colour alone.

- **R6.** `PageHeader`'s existing `actions` slot is **not** used for this control, and `PageHeader`
  itself is not modified. The toolbar is its own element in each page's body.

### 3.4 The four map pages

- **R7.** `components/rooms/MapEmbed.tsx` stops hardcoding `DEFAULT_MAP_URL` for its `src` and instead
  accepts the active URL (or the coordinates), falling back to `DEFAULT_MAP_URL` when no location is
  active. Its public shape stays small — the page still owns only the title and the height:

  ```tsx
  export function MapEmbed({ title, heightClass, url }: { title: string; heightClass: string; url?: string })
  ```

  `url` defaults to `DEFAULT_MAP_URL`, so an un-updated caller cannot regress to a broken map.

- **R8.** Each of the four routes:
  1. calls the hook (R3);
  2. renders `<MapLocationControl …/>` in the toolbar row above the map (R5);
  3. passes the active URL to `MapEmbed`: `mapUrlForCoordinates(lat, lng)` when active, else `undefined`;
  4. swaps its subtitle to the shared "your location" string when active (R9).

  The four pages stay **structurally** as they are — same `PublicLayout`/`Protected`+`RoleShell`
  wrappers, same `h-[60vh]` / `h-[70vh]` frame heights, same iframe `title` attributes.

- **R9.** The active-location subtitle is **one shared string** (D8). Suggested source: a new export
  next to `mapSubtitle()` in `MapEmbed.tsx`, e.g.

  ```ts
  export const LOCATION_SUBTITLE = 'Showing boarding houses around your location.';
  ```

  `/maps`, `/public-maps`, `/boarder/maps` and `/landlord/maps` all use it while active, and each
  returns to its **current** subtitle on reset. (Note: only `/maps` and `/public-maps` use
  `mapSubtitle()` today; the boarder/landlord pages have their own literal subtitles that must be
  preserved as the fallback text.)

### 3.5 The listing-detail map

- **R10.** `RoomDetailView`'s local OpenStreetMap `MapEmbed` gets the same control in the same toolbar
  position (above the map, inside the `showMap` branch), reusing the hook and the shared control.

- **R11.** Activating it **swaps** the embed from the listing marker to the user's coordinates —
  built by `osmEmbedUrl(latitude, longitude)` with a bbox derived the same way as today's local
  helper (`dLat = 0.009`, `dLng = 0.012`). The "Reset to Malaybalay" control on this surface restores
  **the listing marker** (not Malaybalay), since the page's default is the listing. The reset label
  therefore needs a per-surface noun, or the component needs a configurable reset label — an
  implementation detail to settle at build time (see §9.3).

- **R12.** The listing map's `h-[420px] sm:h-[480px]` sizing, its `loading="lazy"`, the `showMap`
  toggle and the "Back to Images" button are all **unchanged**.

### 3.6 Privacy & data

- **R13.** Coordinates are used **only** to build the iframe URL in the browser (D9). No `fetch` to
  the API, no `console.log`, no analytics event, no cookie, no query param, no server function may
  carry a latitude/longitude or a derived place name. The landing/visibility of this requirement:
  a source-scan test (R17) asserting no file under `apps/web/src` posts coordinates to the API.

- **R14.** `localStorage` holds **only** the boolean opt-in flag (D15) — never `lat`/`lng`. Even after
  a page reload the coordinates are re-acquired live (D16). Clearing site data or using Reset returns
  the user to the Malaybalay default (D17).

---

## 4. Files to change

| # | File | Change |
| - | ---- | ------ |
| 1 | `apps/web/src/lib/geolocation.ts` | **new** — geolocation wrapper + opt-in flag storage (R1) |
| 2 | `apps/web/src/lib/maps.ts` | add `USER_LOCATION_MAP_ZOOM`, `mapUrlForCoordinates()`, `osmEmbedUrl()`; keep `DEFAULT_MAP_*` byte-identical (R2) |
| 3 | `apps/web/src/lib/useMapLocation.ts` | **new** — the shared hook (R3, R4) |
| 4 | `apps/web/src/components/rooms/MapLocationControl.tsx` | **new** — toolbar row + button states (R5) |
| 5 | `apps/web/src/components/rooms/MapEmbed.tsx` | accept optional `url` (default `DEFAULT_MAP_URL`); add `LOCATION_SUBTITLE` (R7, R9) |
| 6 | `apps/web/src/routes/maps.tsx` | wire hook + control + active-subtitle (R8) |
| 7 | `apps/web/src/routes/public-maps.tsx` | wire hook + control + active-subtitle (R8) |
| 8 | `apps/web/src/routes/boarder/maps.tsx` | wire hook + control + active-subtitle (R8) |
| 9 | `apps/web/src/routes/landlord/maps.tsx` | wire hook + control + active-subtitle (R8) |
| 10 | `apps/web/src/components/rooms/RoomDetailView.tsx` | control + swap-to-user-coords with listing-restoring reset (R10–R12) |
| 11 | `apps/web/test/maps.test.ts` | extend with the new cases (R15–R17) |

**No** API/worker/migration/repository changes, **no** new dependency, **no** new route, **no**
`routeTree.gen.ts` change, **no** new image asset. `PageHeader`, `Button`, `Icon`, `lib/toast.ts` and
`lib/maps.ts`'s existing exports are all **unchanged** (beyond the additive R2 builders).

---

## 5. Exact resulting values

| Constant / state | Value |
| ---------------- | ----- |
| `MAP_LOCATION_QUERY` | `Malaybalay, Bukidnon` *(unchanged)* |
| `DEFAULT_MAP_ZOOM` | `13` *(unchanged)* |
| `DEFAULT_MAP_URL` | `https://www.google.com/maps?q=Malaybalay%2C%20Bukidnon&output=embed&z=13` *(unchanged)* |
| `USER_LOCATION_MAP_ZOOM` | `15` (new) |
| URL while active (e.g. 8.1575, 125.1275) | `https://www.google.com/maps?q=8.1575%2C125.1275&output=embed&z=15` |
| Opt-in storage key | a single boolean entry (suggested `haven.mapUseLocation`) — **no coordinates** |
| Active subtitle | `Showing boarding houses around your location.` (one shared string) |
| Button idle label | `Use my location` |
| Button busy label | `Locating…` (disabled) |
| Reset label (map pages) | `Reset to Malaybalay` |

---

## 6. Edge cases

| Case | Expected behaviour |
| ---- | ------------------ |
| Permission prompt dismissed / denied | Silent fallback: map stays on Malaybalay, button returns to idle, no message (D6). |
| `POSITION_UNAVAILABLE` (no GPS, no Wi-Fi fix) | Same silent fallback (D6). |
| `TIMEOUT` | Same silent fallback; the button must not stay stuck on "Locating…" forever (R3.4). |
| Insecure context (`http://` non-localhost) | `supportsGeolocation()` false → **button hidden** (D13). |
| Browser without `navigator.geolocation` | **Button hidden** (D13). |
| Opt-in stored but permission revoked in browser settings later | Mount-time lookup fails → silent Malaybalay; **flag is preserved**, so re-granting restores tracking without another click (R3.4). |
| Opt-in stored, user in another city | Map follows them there; Malaybalay is not re-imposed (D4). |
| Opt-in stored, user is physically in Malaybalay | Coordinates are still used (`q=8.1575,125.1275`), not the `Malaybalay, Bukidnon` place string — one code path, no special case. |
| Multiple tabs | Each tab runs its own hook and lookup; both render the same coordinates. No cross-tab sync is required. |
| `reset()` clicked while a lookup is in flight | Lookup result must be ignored; the map must stay on Malaybalay (R3.5). |
| Component unmounts mid-lookup (route change) | No state update after unmount; no console warning (R3.5). |
| SSR / Worker-mode render of any of the four pages | Renders the Malaybalay embed and a hidden/absent control; no `navigator` access, no hydration mismatch (the active state is only ever established in an effect). |
| Direct deep link to `/boarder/maps` while signed out | Unchanged — `Protected` redirects as it does today. |
| Listing detail map, listing has no coordinates | Unchanged — the existing `hasCoords` gate means the map (and therefore the new control) never renders. |
| Listing detail map + user active, then "Back to Images" | Unchanged toggle; returning to the map preserves whatever location state the hook holds. |
| `lat`/`lng` with negative values (southern/western hemisphere) | Builder must not choke on a leading `-`; `encodeURIComponent` is applied to the whole `q` value. |
| Google Maps ignores `z=15` on an embed | Degrades to the default zoom, still pinned on the user — degraded, not broken (same risk class as the existing `&z=13`). |
| Landing on a map page for the first time with a cold cache | No auto-prompt (D1); the map is Malaybalay and the button invites the user. |

---

## 7. Test plan

Run from the repo root:

```bash
bun run web:typecheck
bun run web:test          # bun test --preload ./test/setup.ts
```

Extend `apps/web/test/maps.test.ts` (D21) using its existing style — `bun:test`, `node:fs` +
`import.meta.dir` source scans, and `@testing-library/react` with the happy-dom global registrator
already preloaded in `apps/web/test/setup.ts`.

- **R15. Constants & builders (pure).**
  - `DEFAULT_MAP_URL` still equals today's value and `MAP_LOCATION_QUERY === 'Malaybalay, Bukidnon'` — the existing assertions must stay green untouched.
  - `USER_LOCATION_MAP_ZOOM === 15`.
  - `mapUrlForCoordinates(8.1575, 125.1275)` contains `output=embed`, contains `q=8.1575%2C125.1275` (or the equivalent encoding of the pair), and ends with `&z=15`.
  - `mapUrlForCoordinates(-8.5, -125.25)` handles the negative pair.
  - `osmEmbedUrl(8.1575, 125.1275)` contains `export/embed.html` and `marker=8.1575,125.1275`.

- **R16. Hook behaviour (mocked geolocation).** happy-dom does not implement a real
  `navigator.geolocation`, so the tests stub it (`Object.defineProperty(navigator, 'geolocation', …)` /
  `vi`-free manual stubs, matching how the suite is written):
  - success → hook reports `status: 'active'` with the coordinates and the opt-in flag is written;
  - `PositionError` denial → `status: 'idle'`, coordinates `null`, **flag not written**;
  - stored opt-in + failing lookup on mount → `status: 'idle'` and the flag **still present** (R3.4);
  - stored opt-in + successful lookup on mount → `'active'` with fresh coordinates (D16);
  - `reset()` → flag removed, coordinates cleared, `'idle'`;
  - `navigator.geolocation` deleted → `supported === false`.
  - Remember to restore the stubbed globals between tests (the setup file is shared across files).

- **R17. Source-scan guards (matches the file-reading style already in `maps.test.ts`).**
  - every one of the four map routes renders `<MapLocationControl` and does **not** inline a literal
    `https://www.google.com/maps` URL (extends the existing "single place the URL is consumed" test);
  - `MapEmbed.tsx` no longer hardcodes `src={DEFAULT_MAP_URL}` unconditionally — the effective `src`
    is `url ?? DEFAULT_MAP_URL`;
  - **no** file under `apps/web/src` sends coordinates anywhere: assert the geolocation module is the
    only file referencing `navigator.geolocation`, and that no `fetch(`/`createServerFn` call site in
    the map files passes `latitude`/`longitude` (R13);
  - no file under `apps/web/src` stores coordinates in `localStorage` (R14) — the only
    `localStorage` write in the geolocation module is the boolean flag.

- **R18.** `bun run web:typecheck` clean — this is also the enforcement that every wired surface
  satisfies the new `MapEmbed` props and the hook's return type.
- **R19.** The remaining pre-existing suite under `apps/web/test/` stays green (notably
  `routes.test.ts`, `components.test.tsx`, `asset-refs.test.ts`).
- **R20.** No browser walk is required (D20). A human smoke test is an **optional** follow-up: on
  `/maps`, click "Use my location", grant, confirm the pin moves and the subtitle changes; reload and
  confirm auto-apply; click "Reset to Malaybalay" and confirm it stays reset after another reload.
  Repeat the denial path by blocking the permission in browser settings.

---

## 8. Out of scope (explicit)

- **Distance/radius features.** Sorting listings by proximity, "within 5 km" filters, or a
  "boarding houses near me" query. The maps remain Google place embeds; no Haven inventory is plotted
  (carries over the previous spec's BUG-05 note).
- **Reverse geocoding.** No converting coordinates into a city/barangay name, and no display of a
  human-readable place label for the user's position (D3, D7).
- **Automatic prompting.** No permission request on page load, no interstitial, no first-visit nudge (D1).
- **Any server-side involvement.** No API route, repository, D1 column, migration, analytics event or
  log line involving location (D9, R13).
- **Changing the Malaybalay default.** `MAP_LOCATION_QUERY`, `DEFAULT_MAP_ZOOM` and `DEFAULT_MAP_URL`
  keep their current values and remain the fallback everywhere (R2).
- **Admin surfaces.** There is no admin map; nothing to add (D19).
- **`/find-a-room` "popular locations" chips, the home page, `Hero.tsx`'s link and the seeded
  Manila/Baguio/QC listings.** Untouched, exactly as the previous spec left them.
- **`PageHeader`, `Button`, `Icon`, `lib/toast.ts` redesigns.** Reused as-is; no toast is added (D6).
- **Cross-tab/cross-device sync of the opt-in, and a user-account-level location preference.**
- **Any commit** (D22); migrations, worker code, DB, dependencies and deployment.

---

## 9. Open questions / risks

1. **Hook shape vs. duplicated state.** Four pages plus the listing map each mount their own hook
   instance, so each page does its own `getCurrentPosition()` on load. That is fine functionally
   (browsers short-circuit a granted permission) but means N lookups if several surfaces are open.
   Option A (recommended, spec'd): keep it in the hook, no shared provider. Option B: a small
   context/provider in the root so the whole app shares one lookup. Decide at build time; B is only
   worth it if double lookups show up in practice.
2. **Opt-in flag semantics on failure.** R3.4 keeps the flag when a lookup fails, so a temporarily
   disabled GPS does not erase the preference. The alternative (clear on failure) would silently
   downgrade a user who simply walked into a basement. The chosen behaviour is stated in §6; confirm
   it reads correctly in review.
3. **Reset label on the listing map.** The shared control says "Reset to Malaybalay", but the listing
   surface's default is *the listing*, not Malaybalay. Either the control takes a configurable
   `resetLabel`, or the listing map uses a different label like "Reset to listing". Tracked here so
   the shared component does not ship a misleading label.
4. **"Locating…" has no timeout UI.** R3.4 only guarantees the button leaves the busy state on
   `TIMEOUT`. If a browser ignores `timeout`, the button could look stuck; a defensive client-side
   timeout (e.g. 10 s) is a reasonable build-time addition, not a requirement.
5. **Google embed zoom param.** As with the existing `&z=13`, `&z=15` is honoured by the classic
   `output=embed` URL in practice; if Google ever ignores it the pin is still correct.
6. **D13 hides the control in insecure contexts.** Production is HTTPS (Pages), and `localhost` is a
   secure context, so hiding should only ever affect an unusual deployment. Worth a glance during the
   manual smoke test.
7. **No permission-state pre-check.** `navigator.permissions.query({ name: 'geolocation' })` could
   let the UI say "blocked" rather than silently failing, but D6 chose silence and the API is not
   uniformly supported. Deliberately omitted.

---

## 10. Acceptance criteria

- [ ] Every one of `/maps`, `/public-maps`, `/boarder/maps`, `/landlord/maps` shows a **"Use my location"** control in a toolbar row above the map.
- [ ] On a fresh visit with no opt-in, each of those pages opens **pinned on Malaybalay, Bukidnon at z=13**, exactly as today, and no permission prompt appears.
- [ ] Clicking the control asks for permission; on grant the map **re-pins to the user's exact coordinates at z=15** and the subtitle switches to the shared "around your location" string.
- [ ] On deny/unavailable/timeout the map **stays on Malaybalay with no message**, and the control returns to its idle state.
- [ ] The opt-in **survives a reload**, and a later visit auto-centres on the user after a fresh coordinate lookup — with **no coordinates written to storage**.
- [ ] **"Reset to Malaybalay"** clears the opt-in and the next reload stays on Malaybalay.
- [ ] The listing-detail map offers the same control, swaps to the user's coordinates when activated, and restores the listing marker on reset.
- [ ] The control is **absent** where geolocation is unsupported, and the map pages still render under SSR with no hydration warning.
- [ ] No latitude/longitude is sent to the Haven API, logged, or persisted anywhere (source-scan test proves it).
- [ ] `DEFAULT_MAP_URL` / `MAP_LOCATION_QUERY` / `DEFAULT_MAP_ZOOM` are unchanged; no new dependency, route, asset or migration.
- [ ] `bun run web:typecheck` clean; `bun run web:test` green including the extended `apps/web/test/maps.test.ts`.
- [ ] Working tree left uncommitted; no other docs edited.

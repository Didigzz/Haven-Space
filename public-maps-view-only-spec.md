# Spec — `/public-maps` is a view-only public map (no controls, no actions)

**Status:** **Implemented** (2026-09-30) — see §10 for the verified acceptance criteria.

> **Superseded (2026-09-30) by `hero-map-modal`.** That spec turned the home hero's "View Map" —
> this page's only in-app entry point — into a dialog and **deleted `/public-maps`**, so every decision
> below (including **D17**, which left the hero pointing here) is historical. The view-only *principle*
> this spec established is exactly what the hero dialog now follows.

**Short name:** `public-maps-view-only`
**Date:** 2026-09-30
**Owner request (verbatim, first iteration):**

> In map view http://localhost:3000/public-maps, dont apply the use my location etcc.. because it is
> a public map only for viewing

**Owner revision (verbatim, second iteration):**

> remove the Open the Interactive Map, is it just for viewing , no functions yet

**Relationship to earlier work:** the `auth-hero-map-locale` spec made every map page share one
Google-embed module pinned on `Malaybalay, Bukidnon`; the `map-use-location` spec then added a
"Use my location" control **to all four map pages plus the listing-detail map** (its decision `D2`
explicitly listed `/public-maps`). Both are already in the working tree (uncommitted). This spec is
a **targeted carve-out with a second pass**: `/public-maps` leaves the `map-use-location` feature
*and* ends up with no interactive affordance of any kind. Nothing about the feature itself changes,
and no other surface is touched.

---

## 1. Interview decisions (as answered by the requestor)

| #   | Topic | Decision |
| --- | ----- | -------- |
| D1 | Page scope | **Only `/public-maps`.** `/maps`, `/boarder/maps`, `/landlord/maps` and the listing-detail map keep the "Use my location" control exactly as they are. |
| D2 | Meaning of the change | **Remove the capability, not just the button.** `/public-maps` never reads geolocation, never requests a position, and never renders a runtime-coordinate map URL. |
| D3 | Remembered opt-in | **Not honoured.** Even if the visitor previously clicked "Use my location" elsewhere and `haven.mapUseLocation` is set, `/public-maps` still opens on Malaybalay. The page must not read the flag. |
| D4 | Subtitle | **Revert to the existing Malaybalay line** — `mapSubtitle()`, i.e. "Browse boarding houses around Malaybalay, Bukidnon." |
| D5 | Interactive affordances (revised) | **None.** The first draft added an "Open the interactive map" outline button linking to `/maps`; the owner asked for it to be removed. The page has **no buttons, no links and no form controls** in its body. |
| D6 | Toolbar row (revised) | **Deleted, not replaced.** The page body is exactly `PageHeader` + `MapEmbed`. Nothing occupies the row the location toolbar used to sit in. |
| D7 | Why (owner's rationale) | *"it is just for viewing, no functions yet"* — there is nothing worth offering to act on until the map surface gains real behaviour, so the page does not pretend otherwise. |
| D8 | View-only indicator | **None.** No badge, label, banner or explanatory copy. The absence of controls is the whole statement. |
| D9 | "View only" and the map itself | **The Google embed stays fully interactive** (pan/zoom/fullscreen as Google renders it). "No functions" means no Haven-side controls; the third-party map is not disabled. |
| D10 | Pinned place | **Unchanged: `Malaybalay, Bukidnon` at `z=13`**, the same as every other surface. The page does not broaden to a nationwide view. |
| D11 | Page identity | **Minimal.** No new copy, no hint card, no restructuring. |
| D12 | Shared files | **`MapLocationControl.tsx`, `useMapLocation.ts`, `geolocation.ts` and `MapEmbed.tsx` are left untouched.** No `readOnly`/`static`/`enabled` prop is added; `/public-maps` simply stops importing and calling them. |
| D13 | Reversibility | **Hard-coded removal.** No feature flag, no `PUBLIC_MAPS_LOCATION_ENABLED` constant. |
| D14 | Tests | **Two-way assertion:** `/public-maps` must NOT contain the control or any geolocation wiring **and** must contain no links/buttons; the other three pages plus the listing detail must still render `MapLocationControl`. |
| D15 | Earlier spec doc | **`map-use-location-spec.md` is left as-is** — the historical record of what it spec'd. Its stale `D2` ("all four pages") is deliberately not amended, only noted in §9. |
| D16 | `/public-maps` vs `/maps` duplication | **Noted, not acted on.** Recorded in §9; no consolidation in this change. |
| D17 | Hero CTA | **The home hero's "View Map" button is left pointing at `/public-maps`** — unchanged from before this change. It now leads to a page with no controls, which is a deliberate consequence, not an oversight; see §9.3. |
| D18 | Verification | **`bun run web:typecheck`, `bun run web:test`, and a live check** of `http://localhost:3000/public-maps` confirming the page body has no interactive elements. |
| D19 | Deliverables / git | **Changes stay uncommitted**, matching the convention of the two preceding map specs. No commit, no PR. |

**Superseded:** the first draft's decisions to add a `/maps` cross-link (and the "View only" badge /
hero-repointing options considered alongside it) are withdrawn by D5–D8.

---

## 2. Current state (verified 2026-09-30)

### 2.1 `apps/web/src/routes/public-maps.tsx` — before this spec

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

Three things it did that had to stop: call `useMapLocation()` (which reads `localStorage` **and**
may fire `getCurrentPosition()` on mount when an opt-in is stored — the D3 path), render
`MapLocationControl`, and pass a runtime `url` to `MapEmbed`.

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
| `/maps` | `routes/maps.tsx` | hook + `MapLocationControl` + runtime `url` + `LOCATION_SUBTITLE` swap |
| `/boarder/maps` | `routes/boarder/maps.tsx` | same (inside `Protected role="boarder"` + `RoleShell`) |
| `/landlord/maps` | `routes/landlord/maps.tsx` | same (inside `Protected role="landlord"` + `RoleShell`) |
| listing detail | `components/rooms/RoomDetailView.tsx` | `useMapLocation({ autoApply: false })` + `MapLocationControl` above the OSM listing map |

### 2.4 What the page needs from the design system

**Nothing beyond what it already had.** After the revision the page renders only `PageHeader` (with
its `title`/`subtitle`) and `MapEmbed`, inside `PublicLayout` — so the second pass removes imports
rather than adding them. The `Button`/`buttonClasses`/`Icon`/`Link` conventions that the withdrawn
first draft used are **not** needed here; they remain in use elsewhere and are unchanged.

### 2.5 What changed in the existing test file

`apps/web/test/maps.test.ts` contained:

```ts
test('every map surface renders the shared location control', () => {
  for (const file of [...MAP_ROUTES, 'components/rooms/RoomDetailView.tsx']) {
    const source = readFileSync(join(SRC_DIR, file), 'utf8');
    expect(source).toContain('MapLocationControl');
  }
});
```

`MAP_ROUTES` includes `'routes/public-maps.tsx'`, so that test failed the moment the change landed
and was replaced per D14 (R6/R7 below). The file's other assertions remain valid and green:
`MAP_ROUTES` is still used by the "every map route renders the shared embed" test, and
`MAP_SURFACE_FILES` still legitimately contains `routes/public-maps.tsx` for the
"no coordinates leave the device" scan.

---

## 3. Requirements

### 3.1 The page (`apps/web/src/routes/public-maps.tsx`)

- **R1.** The page **must not import or call `useMapLocation`**, and must not import `geolocation.ts`.
  No hook instance is mounted, so **nothing on this page can read `hasLocationOptIn()` or call
  `getCurrentPosition()`** — the D3 guarantee is structural, not conditional.

- **R2.** The page **must not render `MapLocationControl`** and must not import it. No toolbar, no
  "Use my location" button, no "Locating…" state, no "Reset to Malaybalay" action, and no `sr-only`
  `aria-live` status line.

- **R3.** The page body contains **no interactive elements at all** (D5–D7): no `<Link>`, no
  `<Button>`, no `<a>`, no form control, no `onClick`. Its rendered `<main>` is exactly:

  ```tsx
  <div className="mx-auto max-w-6xl px-4 py-10">
    <PageHeader title="Public map" subtitle={mapSubtitle()} />
    <MapEmbed title="Haven Space public map" heightClass="h-[60vh]" />
  </div>
  ```

- **R4.** `<MapEmbed />` is called with **`title` and `heightClass` only** — no `url` prop. The embed
  therefore resolves to `DEFAULT_MAP_URL` (Malaybalay, `z=13`) on every render, for every visitor, in
  every session state. `title="Haven Space public map"` and `heightClass="h-[60vh]"` are unchanged.

- **R5.** The subtitle is **`mapSubtitle()`** unconditionally — no ternary, no `LOCATION_SUBTITLE`
  import. Final string: `Browse boarding houses around Malaybalay, Bukidnon.` The
  `PageHeader title="Public map"` is unchanged.

- **R6.** Nothing else on the page changes: `PublicLayout` wrapper, the `mx-auto max-w-6xl px-4 py-10`
  container, `createFileRoute('/public-maps')`, the component name `PublicMapsPage`. No new route, no
  `routeTree.gen.ts` edit, no loader, no `head`/meta change. The surrounding `PublicNavbar`/`Footer`
  chrome is untouched (its own links are not "the page").

- **R7.** The result is **identical for every visitor state**: signed out or signed in, first visit or
  returning, opt-in stored or not, permission granted/denied/unavailable. There is no code path on
  this page that depends on any of them. (D2/D3)

- **R8.** Because the page no longer reads `localStorage` or mounts an effect, it renders the same
  markup on the server and on the client — no hydration dependency, no mismatch, and no reliance on
  the client bundle to be correct. (D9's interactive embed is Google's own document.)

### 3.2 The other surfaces (explicitly unchanged)

- **R9.** `routes/maps.tsx`, `routes/boarder/maps.tsx`, `routes/landlord/maps.tsx` and
  `components/rooms/RoomDetailView.tsx` are **not edited**. They keep the hook, the control, the
  runtime URL and the `LOCATION_SUBTITLE` swap exactly as they are now.

- **R10.** `lib/useMapLocation.ts`, `lib/geolocation.ts`, `lib/maps.ts`,
  `components/rooms/MapLocationControl.tsx` and `components/rooms/MapEmbed.tsx` are **not edited**.
  No prop is added to the control or the embed to "support" this page (D12) — the page opts out by
  not calling them, which also means the removal cannot accidentally weaken the other surfaces.

- **R11.** The shared `haven.mapUseLocation` opt-in keeps its current meaning everywhere else. A
  visitor can opt in and out on `/maps`; `/public-maps` neither reads nor writes it. (D3)

### 3.3 Tests (`apps/web/test/maps.test.ts`)

- **R12.** The old single-direction guard is **replaced by a two-way assertion** (D14):

  - `routes/maps.tsx`, `routes/boarder/maps.tsx`, `routes/landlord/maps.tsx` and
    `components/rooms/RoomDetailView.tsx` (a `LOCATION_SURFACES` list) still contain
    `MapLocationControl` — so a future "cleanup" cannot silently strip the feature everywhere;
  - `routes/public-maps.tsx` **does not** contain `MapLocationControl`.

- **R13.** A **static-surface guard** for `/public-maps` asserts, by source scan of
  `routes/public-maps.tsx`, the absence of:

  - `MapLocationControl`
  - `useMapLocation`
  - `geolocation`
  - `LOCATION_SUBTITLE`
  - `mapUrlForCoordinates`
  - the `url=` on the embed
  - `to="/maps"` — the withdrawn cross-link (D5)
  - `buttonClasses` and `<Button` — the withdrawn action row (D6)

  …and the **presence** of `<MapEmbed`, so the page is proven to still render a map.

- **R14.** A subtitle test pins the copy: `mapSubtitle()` returns
  `Browse boarding houses around ${MAP_LOCATION_QUERY}.`

- **R15.** The pre-existing "every map route renders the shared embed, not a literal URL" test
  (`<MapEmbed` present, `<iframe` absent, no `https://www.google.com/maps` literal) must still pass
  for `routes/public-maps.tsx` — it does, since R4 keeps the shared embed.

- **R16.** The pre-existing privacy scans must still pass with `routes/public-maps.tsx` in
  `MAP_SURFACE_FILES`: no `fetch(`, no `createServerFn`, no `console.log` in the page.

- **R17.** The geolocation-scope scans must still pass and must **not** be weakened:
  `navigator.geolocation` remains referenced only by `lib/geolocation.ts`, and `LOCATION_OPT_IN_KEY`
  remains referenced only by that module.

- **R18.** The rest of the suite under `apps/web/test/` (`routes.test.ts`, `components.test.tsx`,
  `asset-refs.test.ts`, `auth-layout.test.tsx`, `boarder-nav.test.ts`, `feature-gate.test.tsx`,
  `amenity-icons.test.ts`, `landlord-documents-modal.test.tsx`) stays green.

### 3.4 Verification

- **R19.** Run, from the repo root:

  ```bash
  bun run web:typecheck
  bun run web:test
  ```

- **R20.** **Live check** (D18) against the running dev server at `http://localhost:3000/public-maps`:

  1. the header reads "Public map" and the subtitle the Malaybalay line;
  2. **no** "Use my location" and **no** "Reset to Malaybalay" anywhere;
  3. **no** "Open the interactive map" button — and in fact **zero** `button`/`a`/form elements inside
     `<main>`;
  4. the iframe `src` is exactly the Malaybalay embed (`...?q=Malaybalay%2C%20Bukidnon&output=embed&z=13`);
  5. with `haven.mapUseLocation` set to `'1'` **before** loading the page, the map is still Malaybalay
     (the D3 check), while `/maps` still carries the control.

  If a dev server is not already listening on port 3000, start `bun run web:dev` and use its port.

---

## 4. Files to change

| # | File | Change |
| - | ---- | ------ |
| 1 | `apps/web/src/routes/public-maps.tsx` | Drop the hook, the control and the runtime `url`; restore `mapSubtitle()`; render header + map only (R1–R8) |
| 2 | `apps/web/test/maps.test.ts` | Two-way control assertion; static-surface guard incl. "no links/buttons"; subtitle test (R12–R14) |

**Two files. Nothing else.** No new file, no deletion, no dependency, no migration, no API/worker
change, no new route, no `routeTree.gen.ts` change, no new image asset, no edit to
`map-use-location-spec.md` (D15), no home-hero change (D17), and no edit to any other page (R9–R11).

---

## 5. Exact resulting values

| Item | Before | After |
| ---- | ------ | ----- |
| Imports in the page | hook, control, `LOCATION_SUBTITLE`, `mapUrlForCoordinates` | `createFileRoute`, `PublicLayout`, `MapEmbed`, `mapSubtitle`, `PageHeader` |
| `useMapLocation()` calls | 1 | **0** |
| `MapLocationControl` renders | 1 | **0** |
| Interactive elements in `<main>` | 3 (toggle, reset, status line's siblings) | **0** |
| `MapEmbed url` prop | `pin ? mapUrlForCoordinates(...) : undefined` | **not passed** |
| Effective iframe `src` | `DEFAULT_MAP_URL`, or coordinates at `z=15` when active | **always `DEFAULT_MAP_URL`** |
| Effective `src` string | — | `https://www.google.com/maps?q=Malaybalay%2C%20Bukidnon&output=embed&z=13` |
| Title | `Public map` | `Public map` *(unchanged)* |
| Subtitle | `pin ? LOCATION_SUBTITLE : mapSubtitle()` | **`mapSubtitle()`** → `Browse boarding houses around Malaybalay, Bukidnon.` |
| iframe `title` | `Haven Space public map` | `Haven Space public map` *(unchanged)* |
| Frame height | `h-[60vh]` | `h-[60vh]` *(unchanged)* |
| Row above the map | location toolbar (button + reset + status) | **nothing** — the row is deleted, not replaced |
| Links out of the page body | 0 | **0** (the draft's `/maps` link was withdrawn) |
| `haven.mapUseLocation` on this page | read + auto-applied on mount | **never read, never written** |
| `/maps` `/boarder/maps` `/landlord/maps` listing map | location feature | **unchanged** |

---

## 6. Edge cases

| Case | Expected behaviour |
| ---- | ------------------ |
| Opt-in stored in `localStorage`, visitor opens `/public-maps` | Malaybalay. The page never reads the flag, so no lookup happens and no permission prompt can appear (D3). |
| Opt-in stored, visitor opens `/maps` right after | Unchanged — `/maps` auto-applies as it does today. The two pages disagree on purpose. |
| First-ever visit, no opt-in | Malaybalay, no prompt, and no invitation to do anything — there is nothing on the page to click. |
| Geolocation permission previously **denied** in browser settings | Irrelevant to this page — nothing is requested, nothing fails, no fallback logic runs. |
| Browser without `navigator.geolocation` / insecure context | Irrelevant — the page has no geolocation dependency at all. Its markup is identical in every browser. |
| Signed-out visitor deep-links `/public-maps` | Unchanged: `PublicLayout` (public page, no `Protected` gate). |
| Signed-in boarder/landlord opens `/public-maps` | Identical to a signed-out visitor — role never enters the page's render (R7). |
| A visitor wants a "map near me" from this page | There is no in-page path to `/maps` (D5). They reach it via the footer's "Maps" link or by typing the URL; §9.3 tracks whether that is acceptable. |
| Client-side navigation `/maps` → `/public-maps` while `/maps` is tracking | `/public-maps` renders Malaybalay immediately; the `/maps` hook unmounts and its in-flight lookup is ignored by its own `mounted`/`requestId` guard (existing behaviour, unmodified). |
| Two tabs, one on `/maps` (tracking) and one on `/public-maps` | Independent; the public tab is always Malaybalay. No cross-tab sync is introduced or needed. |
| SSR / Worker-mode render | Server and client produce the same markup with no effect and no `window`/`navigator`/`localStorage` access at all — a strictly simpler render than before this change (R8). |
| The visitor clears site data / uses "Reset to Malaybalay" on `/maps` | No effect on `/public-maps`, which was already static. |
| Google Maps ignores the embed's `z=13` | Degrades to Google's default zoom, still pinned on Malaybalay — pre-existing risk class, unchanged by this spec. |
| The map iframe fails to load (offline, blocked) | The page is still a valid, complete page: header and subtitle render, the frame is empty. Nothing on the page depends on the map loading, which is a small resilience win from removing the controls. |
| A future dev reintroduces a control "for convenience" | Caught by the static-surface guard (R13), which fails on `buttonClasses`/`<Button`/`to="/maps"` as well as on the geolocation identifiers. |

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

**R21. Two-way control assertion (replaces the current one).**

- `LOCATION_SURFACES` = `routes/maps.tsx`, `routes/boarder/maps.tsx`, `routes/landlord/maps.tsx`,
  `components/rooms/RoomDetailView.tsx` → source contains `MapLocationControl`.
- `routes/public-maps.tsx` → source does **not** contain `MapLocationControl`.

**R22. `/public-maps` static-surface guard.** Source scan asserting the absence of `useMapLocation`,
`MapLocationControl`, `LOCATION_SUBTITLE`, `mapUrlForCoordinates`, `url=`, `to="/maps"`,
`buttonClasses` and `<Button`, plus the presence of `<MapEmbed`.

**R23. Subtitle.** `mapSubtitle()` returns
`Browse boarding houses around Malaybalay, Bukidnon.` (the existing `MAP_LOCATION_QUERY` assertion
covers the string's source), and the page cannot produce the location-worded subtitle because it
does not reference `LOCATION_SUBTITLE`.

**R24. No new geolocation surface.** Re-run the existing scans unchanged:
`navigator.geolocation` referenced only in `lib/geolocation.ts`; `LOCATION_OPT_IN_KEY` referenced
only in `lib/geolocation.ts`; no `fetch(`/`createServerFn`/`console.log` in any
`MAP_SURFACE_FILES` entry.

**R25. Regression.** The full `apps/web/test/` suite stays green.

**R26. Live check** exactly as R20 (D18).

**Known test-environment limitation (observed 2026-09-30):** the working tree's client bundle is
broken site-wide by unrelated in-flight work — `apps/web/src/lib/nav.ts` does not export
`AdminSectionKey` / `ADMIN_SECTION_LABELS` / `toAdminSectionKey`, which the untracked
`components/admin/sections.ts` and `AdminSection.tsx` import. Vite throws on every page (including
`/`), so nothing hydrates. This blocks confirming the *client-rendered* "Use my location" button on
`/maps` visually; the source-scan guard (R21) is what proves that wiring is intact. It does **not**
affect `/public-maps`, whose markup is now server-rendered and hydration-independent (R8), and it is
not caused by this change.

---

## 8. Out of scope (explicit)

- **Any interactive affordance on `/public-maps`.** No cross-link to `/maps`, no CTA, no button, no
  badge, no hint copy (D5–D8). The withdrawn draft's row stays withdrawn.
- **`/maps`.** Stays a location-enabled public page; untouched (D1).
- **`/boarder/maps` and `/landlord/maps`.** Authenticated map pages; untouched (R9).
- **The listing-detail map** in `RoomDetailView` (OSM embed, `autoApply: false`). Untouched (R9).
- **The whole `map-use-location` feature.** No change to the hook, the storage key, the control, the
  zoom constants, the silent-failure behaviour or the privacy rules (R10–R11).
- **New props on shared components.** No `readOnly`/`static`/`enabled` mode (D12).
- **A feature flag** making this reversible by configuration (D13).
- **Home hero, navbar or footer changes.** The hero's "View Map" keeps pointing at `/public-maps`
  (D17); the footer's "Maps" link keeps pointing at `/maps`.
- **Consolidating or retiring `/public-maps` vs `/maps`.** Noted in §9.2, not fixed (D16).
- **A nationwide/wider pin.** The page keeps the Malaybalay locale (D10).
- **Any API, worker, D1, migration, analytics, log or dependency change.**
- **Amending `map-use-location-spec.md`** (D15) and **any commit** (D19).
- **Fixing the unrelated broken `nav.ts` admin exports.** Another thread's in-flight work; left
  alone (see §7's limitation note).

---

## 9. Open questions / risks

1. **Stale doc divergence.** `map-use-location-spec.md` `D2` states the control belongs on all four
   map pages and its checklist asserts `/public-maps` shows it. After this change that document
   describes the other three surfaces only. Per D15 the old spec is left untouched; if the repo ever
   treats specs as living documents, this is the first place to reconcile.
2. **`/public-maps` vs `/maps` are now nearly identical pages** differing only by the location
   control, and `report.md` already flags the pair (like `auth/signup` + `auth/signup/index`) as
   duplicate route files. Consolidating them (one page, a `locationEnabled` flag) is the natural
   cleanup, explicitly out of scope here (D16).
3. **`/public-maps` is now a dead end.** The home hero's primary "View Map" CTA points here (D17),
   and a visitor arriving from the hero has no path to the interactive `/maps` surface. D5 removes
   the in-page escape hatch on purpose, so the remaining routes to `/maps` are the footer's "Maps"
   link and manual navigation. If that proves too quiet, the smallest fixes are (a) repointing the
   hero CTA to `/maps`, or (b) swapping which page the hero advertises. Both are one-line changes
   deliberately not taken in this pass.
4. **"No functions yet" is a promise the page can outgrow.** If `/public-maps` later gains real
   behaviour (seeded Haven inventory plotted on the map, a search box, a city switcher), the
   "nothing to click" decision (D7) should be revisited rather than treated as permanent.
5. **Removal is structural, not behavioural.** Because the page stops importing the hook entirely
   (R1), there is no runtime guard that a stored opt-in, a stale bundle or a future refactor could
   bypass. The paired inverse tests (R12/R13) are what keep it that way — without them, a copy-paste
   of `maps.tsx` would silently restore the feature *and* the toolbar row.
6. **No `url` prop means no way to deep-link a different locale** on the public page (e.g. a future
   `?place=` query). Not needed today; noted so the omission is deliberate.
7. **The page depends on the client bundle for nothing now.** Worth preserving: any future addition
   here that reintroduces an effect or a `localStorage` read gives up the hydration independence
   noted in R8.

---

## 10. Acceptance criteria

**Verified 2026-09-30** (`bun run web:test` → 101 pass / 0 fail; live check on
`http://localhost:3000/public-maps`).

- [x] `/public-maps` renders **no** "Use my location" button, **no** "Reset to Malaybalay" action and
      **no** location status line.
- [x] `/public-maps` renders **no** "Open the interactive map" button and **zero** interactive
      elements inside `<main>`.
- [x] `apps/web/src/routes/public-maps.tsx` does not import or call `useMapLocation`,
      `MapLocationControl`, `mapUrlForCoordinates` or `LOCATION_SUBTITLE`.
- [x] The iframe `src` is `https://www.google.com/maps?q=Malaybalay%2C%20Bukidnon&output=embed&z=13`
      for every visitor, every session, every stored-opt-in state — and `<MapEmbed>` is called
      without a `url` prop.
- [x] The subtitle is `Browse boarding houses around Malaybalay, Bukidnon.` and the title is
      `Public map`; the map still renders at `h-[60vh]` with the same iframe `title`.
- [x] With `haven.mapUseLocation` set to `1`, the page still opens on Malaybalay (the D3 check).
- [x] The Google embed stays fully interactive (pan/zoom) — no static image, no scroll lock.
- [ ] `/maps`, `/boarder/maps`, `/landlord/maps` and the listing-detail map are **byte-identical** to
      before this change, and `/maps` still carries the location control *(source-verified; the
      client-rendered button cannot be confirmed visually while the unrelated `nav.ts` breakage
      prevents hydration — see §7)*.
- [x] `MapLocationControl.tsx`, `useMapLocation.ts`, `geolocation.ts` and `MapEmbed.tsx` are **not
      modified**; no new prop or flag was introduced.
- [x] `apps/web/test/maps.test.ts` asserts both directions (public page lacks it; the other four
      surfaces still have it) and carries the static-surface guard plus the subtitle test.
- [x] `bun run web:test` green, including the pre-existing privacy and geolocation-scope scans.
- [ ] `bun run web:typecheck` clean — **blocked by unrelated in-flight admin work** (missing
      `AdminSectionKey` / `ADMIN_SECTION_LABELS` / `toAdminSectionKey` exports in the unmodified
      `apps/web/src/lib/nav.ts`); no error in either file this spec touched.
- [x] `map-use-location-spec.md` and every other doc are untouched; no new file besides this spec;
      working tree left uncommitted.

# Spec — Home hero "View Map" opens the view-only map dialog

**Status:** **Implemented and verified** (2026-09-30) — 124 unit tests pass (0 failures),
`web:typecheck` clean, `web:build` clean. See §11 for what shipped.
**Short name:** `hero-map-modal`
**Date:** 2026-09-30
**Owner request (verbatim, first iteration):**

> in http://localhost:3000/ or public page there is a View Map, make it a modal type same in
> http://localhost:3000/find-a-room map modal type, make the size in a desktop type

**Owner revision (verbatim, second iteration — this is the design that shipped):**

> make the heromap-modal follow the sizing and modal layout of the find-a-room-map-modal, but it will
> have no geolocation since hero-map-modal is for viewing only

**Relationship to existing work.** Four earlier specs built everything this reuses:

- `auth-hero-map-locale` — one shared map-locale module (`lib/maps.ts`) and one shared embed
  (`MapEmbed.tsx`).
- `map-use-location` — `useMapLocation` + `MapLocationControl` + `mapUrlForCoordinates`, plus the
  `.md`-style shared `Modal` hardening.
- `public-maps-view-only` — made `/public-maps` a read-only page with **no** controls; its decision
  **D17** explicitly left the home hero's "View Map" pointing at `/public-maps`.
- `find-a-room-map-modal` — built `components/rooms/MapModal.tsx`, a thin host for the map in a
  dialog. Its **D1** and §8 ("Out of scope") explicitly kept the home hero as a **navigation** link.
- `modal-desktop-width` — widened every `Modal` tier and made `MapModal` opt into `size="xl"`.

This spec **reverses** `public-maps-view-only` (the route is retired outright) and the
`find-a-room-map-modal` D1/§8 hero carve-out, and it **reuses** `modal-desktop-width`'s `xl` panel so
the two dialogs are the same size. It does not change the map pieces themselves, `/find-a-room`,
`/maps`, `/landlord/maps` or the listing-detail map.

**Why the first draft changed.** The original draft made the hero dialog _interactive_ and gave it a
`size` prop so it could be wider than `/find-a-room`'s `md` panel. By the time it was implemented,
`modal-desktop-width` had already moved `/find-a-room` to `xl`, so "wider than the browse dialog" was
no longer a thing to build — and the requestor asked for the hero to be **view-only**, which the first
draft explicitly rejected (its D12/D13). This document describes the shipped design, not the draft.

---

## 1. Interview decisions (as answered by the requestor)

| #   | Topic                          | Decision                                                                                                                                                                                                                                           |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Which trigger becomes a dialog | **Only the home hero's "View Map"** (`/`). Every other map entry point keeps navigating.                                                                                                                                                           |
| D2  | Dialog contents                | **The find-a-room dialog minus location.** Same heading, same subtitle line, same `w-full` Google embed, same panel — no control row.                                                                                                              |
| D3  | Geolocation                    | **Not offered, not read, not imported.** The hero dialog never asks for a position and never reads the stored opt-in, so it is view-only by construction rather than by hiding a button.                                                           |
| D4  | `/public-maps`                 | **Delete the route.** It was the hero's only in-app destination; a bookmark now 404s, the same trade-off `find-a-room-map-modal` D19 took for `/boarder/maps`.                                                                                     |
| D5  | Panel size                     | **Identical to the browse dialog** — whatever `MapModal` hard-codes, which is `size="xl"` (`max-w-4xl` → `max-w-6xl`). The hero passes no `size` at all, so the two cannot drift apart.                                                            |
| D6  | Modal layout                   | **The shared `MapModal` shell** — same fixed heading, same frame height, same mount-on-open body.                                                                                                                                                  |
| D7  | Heading                        | **Reuse `MAP_MODAL_TITLE`** = "Find boarding houses near you".                                                                                                                                                                                     |
| D8  | Subtitle                       | **`mapSubtitle()`** — "Browse boarding houses around Malaybalay, Bukidnon." The location-tracking variant (`LOCATION_SUBTITLE`) can never appear here.                                                                                             |
| D9  | Implementation shape           | **Extend `MapModal` with an optional `viewOnly` prop** (default `false`) rather than add a second dialog. One panel, one title, one mount-on-open guarantee, two bodies.                                                                           |
| D10 | Trigger appearance             | **Keep the exact look** — the same outline pill (`rounded-full border-2 border-primary bg-surface px-6 py-3 font-semibold text-primary hover:bg-mint`) and the same "View Map" label; it becomes a `<button type="button">` instead of a `<Link>`. |
| D11 | Modal open state               | **Local component state only** (`useState` in `Hero`). No query param, no hash, no deep link; dismissing the dialog is not a Back step.                                                                                                            |
| D12 | Page-load guarantee            | **Nothing runs until the dialog is opened** — no map `<iframe>`, and no geolocation lookup on home load. The body is gated on `open`.                                                                                                              |
| D13 | Tests                          | **Extend `apps/web/test/maps.test.ts`** with hero wiring, view-only absence guards and a retired-route guard; add `Hero.tsx` to the map-surface scans.                                                                                             |
| D14 | Earlier spec docs              | **Amend** `find-a-room-map-modal-spec.md` (D1/§8) and `public-maps-view-only-spec.md` (whole spec + D17) with supersession notes.                                                                                                                  |
| D15 | Deliverables / git             | **Changes stay uncommitted**, the convention of the preceding map specs. No commit, no PR.                                                                                                                                                         |

---

## 2. Current state (verified 2026-09-30)

### 2.1 The trigger before this change

`apps/web/src/components/rooms/Hero.tsx`, inside the hero CTA row:

```tsx
<Link
  to="/public-maps"
  className="rounded-full border-2 border-primary bg-surface px-6 py-3 font-semibold text-primary transition-colors hover:bg-mint"
>
  View Map
</Link>
```

`Hero` is rendered by exactly one route, `apps/web/src/routes/index.tsx` (`<PublicLayout><Hero />…`),
and was a **stateless** component.

### 2.2 The dialog being reused

`apps/web/src/components/rooms/MapModal.tsx` — a thin host: the shared `Modal` at `size="xl"`, the
fixed `MAP_MODAL_TITLE`, and a body that only exists while `open` is true. Its interactive body
renders `useMapLocation()` + `MapLocationControl` + a `MapEmbed` with `h-[60vh] sm:h-[70vh]`.

### 2.3 The shared `Modal` sizes

`apps/web/src/components/ui/Modal.tsx`:

```ts
const SIZES = {
  md: 'max-w-lg sm:max-w-2xl', // 512 → 672px
  lg: 'max-w-2xl sm:max-w-4xl', // 672 → 896px
  xl: 'max-w-4xl sm:max-w-6xl', // 896 → 1152px
} as const;
```

`Modal` already caps the panel at `max-h-[90vh]`, locks body scroll, traps focus (including the map
`<iframe>`) and restores focus to the trigger on close. **No change to `Modal` was needed.**

---

## 3. Requirements

### 3.1 `MapModal` gains a view-only variant (D2, D3, D9)

- **R1.** `MapModal` accepts an optional `viewOnly` prop typed `boolean`, **defaulting to `false`**.
- **R2.** When `viewOnly` is true, the dialog renders `MapModalViewOnlyBody`: the `mapSubtitle()`
  line and a `MapEmbed` with `h-[60vh] sm:h-[70vh]` and **no** `url` — so the embed keeps its own
  Malaybalay default.
- **R3.** `MapModalViewOnlyBody` does **not** call `useMapLocation`, does **not** render
  `MapLocationControl`, and contains no `mapUrlForCoordinates`, `LOCATION_SUBTITLE` or `url=`. The
  feature is absent from that branch, not hidden in it.
- **R4.** The interactive path is unchanged: no `viewOnly` (or `viewOnly={false}`) still renders
  `MapModalBody` exactly as `find-a-room-map-modal` shipped it.
- **R5.** Both bodies stay behind the same `{open ? … : null}` gate, so the iframe cannot load before
  the dialog opens.
- **R6.** The panel stays `size="xl"` for both variants — the hero passes no `size`, so the two
  dialogs cannot drift apart.

### 3.2 The hero trigger (D1, D10, D11)

- **R7.** `Hero` gains local state: `const [mapOpen, setMapOpen] = useState(false);`.
- **R8.** The "View Map" affordance becomes a `<button type="button">` calling `setMapOpen(true)`,
  keeping its exact current classes and label.
- **R9.** `Hero` renders `<MapModal open={mapOpen} onClose={() => setMapOpen(false)} viewOnly />` once,
  at the end of its section.
- **R10.** Every other part of the hero is unchanged: the "New / Introducing Haven AI" pill, the
  `<h1>`, the supporting paragraph and the solid "Find a Room" `Link`. The `Link` import stays.

### 3.3 Behaviour inside the dialog (D2, D3, D6, D12)

- **R11.** The dialog shows the fixed heading **"Find boarding houses near you"** and, in its body,
  the `mapSubtitle()` line and a `w-full h-[60vh] sm:h-[70vh]` Google embed — the find-a-room dialog
  without the control row.
- **R12.** **Mount on open.** Opening the home page produces **zero** map iframes. This is structural
  (the body is gated on `open`), not merely visual.
- **R13.** Nothing on `/` reads the stored `haven.mapUseLocation` opt-in, because nothing on `/`
  imports the location hook at all.
- **R14.** Scroll lock, focus trap, Escape / backdrop / X close, and focus restore to the trigger are
  inherited from the shared `Modal` unchanged. Focus returns to the hero's "View Map" button.
- **R15.** No new browser-API access at module scope; `Hero` stays server-renderable (the dialog
  renders nothing while closed).

### 3.4 Retire `/public-maps` (D4)

- **R16.** Delete `apps/web/src/routes/public-maps.tsx` and regenerate `routeTree.gen.ts`.
- **R17.** No redirect is added — a bookmarked `/public-maps` becomes a 404.
- **R18.** Every non-historical reference is removed: `apps/web/test/maps.test.ts` (`MAP_ROUTES`,
  `MAP_FRAME_HEIGHTS`, the deleted view-only guard) and the stale route list in `lib/maps.ts`'s module
  comment. Historical docs are left alone.

### 3.5 Untouched surfaces

- **R19.** `/find-a-room`, `FindARoomContent.tsx`, `routes/maps.tsx`, `routes/landlord/maps.tsx`,
  `RoomDetailView.tsx`, `MapEmbed.tsx`, `MapLocationControl.tsx`, `useMapLocation.ts`,
  `lib/geolocation.ts`, `lib/maps.ts`'s builders and the shared `Modal` are all unchanged. The footer
  never linked `/public-maps`, so no other link needed touching.

### 3.6 Tests and docs (D13, D14)

- **R20.** `apps/web/test/maps.test.ts` gains hero coverage and loses the retired page's guards:
  - `Hero.tsx` contains `<MapModal`, `setMapOpen(true)`, `open={mapOpen}`, `viewOnly` and `<button>`,
    and **no longer** contains `to="/public-maps"`;
  - `Hero.tsx` contains none of `MapLocationControl`, `useMapLocation`, `geolocation`,
    `LOCATION_SUBTITLE`, `mapUrlForCoordinates`, `url=`;
  - the `MapModalViewOnlyBody` slice contains none of the same identifiers, still renders
    `MapEmbed`, and uses the same frame height as the interactive body;
  - the mount gate still covers both bodies;
  - `routes/public-maps.tsx` does not exist and no file under `src/` references `/public-maps`;
  - `Hero.tsx` joins the map-surface and "no coordinates leave the device" scans.
- **R21.** **Supersession notes** are added to `find-a-room-map-modal-spec.md` (D1 / §8) and
  `public-maps-view-only-spec.md` (the whole spec, D17 included), each stating that `hero-map-modal`
  supersedes that item and pointing at this file. Their historical text is otherwise left intact.
- **R22.** `bun run web:typecheck` clean, `bun run web:build` clean and `bun run web:test` green.

---

## 4. Files to change

| #   | File                                         | Change                                                         |
| --- | -------------------------------------------- | -------------------------------------------------------------- |
| 1   | `apps/web/src/components/rooms/MapModal.tsx` | R1–R6 — `viewOnly` prop + `MapModalViewOnlyBody`               |
| 2   | `apps/web/src/components/rooms/Hero.tsx`     | R7–R10 — `useState`, `<button>` trigger, `<MapModal viewOnly>` |
| 3   | `apps/web/src/routes/public-maps.tsx`        | **delete** (R16)                                               |
| 4   | `apps/web/src/routeTree.gen.ts`              | regenerate (R16)                                               |
| 5   | `apps/web/src/lib/maps.ts`                   | stale route list in the module comment (R18)                   |
| 6   | `apps/web/test/maps.test.ts`                 | R20 — hero + view-only + retired-route coverage                |
| 7   | `find-a-room-map-modal-spec.md`              | R21 — supersession note (D1/§8)                                |
| 8   | `public-maps-view-only-spec.md`              | R21 — supersession note                                        |
| 9   | `hero-map-modal-spec.md`                     | this file                                                      |

**No** change to `Modal.tsx`, `FindARoomContent.tsx`, `MapEmbed.tsx`, `MapLocationControl.tsx`,
`useMapLocation.ts`, `lib/geolocation.ts`, `lib/maps.ts`'s URL builders, any API/worker/DB code, or
any dependency.

---

## 5. Exact resulting values

| Item                    | Value                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Home dialog size        | `size="xl"` (hard-coded in `MapModal`) → `max-w-4xl` on phones, `max-w-6xl` (1152px) from 640px |
| Find-a-room dialog size | unchanged: the same `size="xl"` — **the two dialogs are identical in size**                     |
| Map frame               | `w-full h-[60vh] sm:h-[70vh]`, `title="Haven Space map"`                                        |
| Dialog heading          | `Find boarding houses near you` (`MAP_MODAL_TITLE`, reused)                                     |
| Dialog body             | subtitle + map only — no control row                                                            |
| Subtitle                | `Browse boarding houses around Malaybalay, Bukidnon.` (`mapSubtitle()`)                         |
| Location control        | **none** on the home dialog                                                                     |
| Runtime-coordinate URL  | **none** on the home dialog — the embed's default is used                                       |
| Trigger markup          | `<button type="button">` with label `View Map`, unchanged outline-pill classes                  |
| Trigger target          | none — it opens a dialog (was `to="/public-maps"`)                                              |
| Open/close state        | `useState` inside `Hero`; not in the URL                                                        |
| Focus return target     | the hero "View Map" button                                                                      |
| `/public-maps`          | deleted (404)                                                                                   |

---

## 6. Edge cases

| Case                                                          | Expected behaviour                                                                                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Home page first load, dialog never opened                     | **No map iframe** in the DOM (R12).                                                                                                  |
| Opt-in stored from `/maps` or `/find-a-room`                  | **Ignored.** The home dialog has no location wiring, so Malaybalay is always the pin (R13).                                          |
| Dialog closed while nothing is in flight                      | Nothing to cancel — there is no request.                                                                                             |
| Close, then reopen                                            | Same static Malaybalay embed.                                                                                                        |
| Close via Escape / X / backdrop                               | All three close it and return focus to the "View Map" button (R14).                                                                  |
| Escape while focus is inside the map iframe                   | The cross-origin frame swallows the key, so Escape may not close it; the X and backdrop still work. Pre-existing `Modal` limitation. |
| Narrow phone viewport                                         | Same centered dialog; the wide cap clamps to the screen width.                                                                       |
| Very short viewport                                           | The panel caps at `max-h-[90vh]` and scrolls internally — inherited from `Modal`.                                                    |
| Signed-out visitor                                            | Same dialog; the public Google embed needs no session.                                                                               |
| SSR of `/`                                                    | The dialog is closed → nothing rendered for it; "View Map" renders as a plain server-rendered `<button>` (R15).                      |
| Bookmarked `/public-maps`                                     | 404 (R17).                                                                                                                           |
| Google embed refuses to render in an iframe (consent/sandbox) | Pre-existing behaviour; the panel still opens and closes.                                                                            |
| Reduced motion / slow device                                  | The dialog still runs the shared spring animation; the iframe loads only on open, which is lighter than the old page navigation.     |

---

## 7. Test plan

Run from the repo root:

```bash
bun run web:typecheck
bun run web:build      # regenerates routeTree.gen.ts after the route deletion
bun run web:test
```

- **Hero wiring (R20).** `Hero.tsx` contains `<MapModal`, `setMapOpen(true)`, `open={mapOpen}`,
  `viewOnly` and `<button>`, and no longer navigates — `not.toContain('to="/public-maps"')`.
- **View-only absence (R20).** `Hero.tsx` — and the `MapModalViewOnlyBody` slice of `MapModal.tsx` —
  contain none of the location identifiers; the modal slice still renders `MapEmbed` at the shared
  frame height.
- **Same panel (R20).** `Hero.tsx` passes no `size="xl"`; `MapModal.tsx` hard-codes it.
- **Mount gate (R20).** The line holding `<MapModalBody` also holds `open ?` and `viewOnly ?`.
- **Retired route (R20).** `existsSync('src/routes/public-maps.tsx')` is `false` and no file under
  `src/` references `/public-maps`.
- **Existing guards stay green.** `MAP_ROUTES`, `LOCATION_SURFACES`, `MAP_FRAME_HEIGHTS`, the
  geolocation-ownership scans and all of `modal.test.tsx`.

---

## 8. Out of scope (explicit)

- Geolocation of any kind on the home hero dialog (D3) — that is `/find-a-room`'s and `/maps`'
  behaviour.
- Changing the **`/find-a-room`** dialog — it keeps the interactive body (R4).
- Adding a dialog trigger anywhere other than the home hero (D1).
- The footer "Maps" → `/maps` link, `/maps`, `/landlord/maps`, and the listing-detail map.
- A redirect for `/public-maps` (R17) or a query-param / hash deep link to the open dialog (D11).
- Preloading a map iframe on home load (D12).
- Mobile-specific layout (bottom sheet, full-screen) — same dialog everywhere.
- An "open the full map" action inside the dialog.
- Any change to `useMapLocation`, `lib/geolocation.ts`, `MapEmbed`, `MapLocationControl`,
  `lib/maps.ts`'s builders, or the shared `Modal`.
- Listing pins / "boarding houses near me" markers; distance or radius features; reverse geocoding.
- Adding a focus-trap, portal or sizing dependency.
- Updating historical docs (`report.md`, `docs/qa/*`, `docs/superpowers/plans/*`) that name
  `/public-maps` — they are snapshots, not instructions.
- Any commit (D15).

---

## 9. Open questions / risks

1. **A wider panel around a `h-[60vh] sm:h-[70vh]` map is a wide, short map.** Inherited from
   `modal-desktop-width`; if it reads poorly, the height is a one-line change in `MapModal`.
2. **`/public-maps` is gone with no redirect** (D4/R17). Only historical QA docs still name it.
3. **`Hero` is now a client-stateful component.** It is rendered by `/` under `PublicLayout`;
   `useState` and a conditionally-rendered dialog are SSR-safe, but the hero is no longer a pure
   presentational function.
4. **The `viewOnly` prop is a mode, not a size.** If a third host appears with a third composition,
   consider whether `MapModal` should take a body/variant slot instead of accumulating boolean props.
5. **Two bodies duplicate the frame height string.** The test asserts both use
   `h-[60vh] sm:h-[70vh]`, which catches drift, but a shared constant would remove the possibility.
6. **`routeTree.gen.ts` is generated.** Deleting the route file without regenerating leaves a stale
   import; `bun run web:build` is what regenerates it, so typecheck alone is not the gate for R16.

---

## 10. Acceptance criteria

- [x] On `/`, clicking **View Map** opens a dialog **in place** — the URL stays `/` and the page
      behind is untouched.
- [x] The dialog is the **same size** as `/find-a-room`'s (`xl`: `max-w-4xl` → `max-w-6xl`) and
      otherwise identical minus the location row: heading "Find boarding houses near you", subtitle,
      `w-full h-[60vh] sm:h-[70vh]` Google embed.
- [x] The dialog offers **no** "Use my location" control and reads **no** stored opt-in; the pin is
      always Malaybalay.
- [x] **No map iframe exists on `/` until the dialog is opened.**
- [x] Escape, the X and the backdrop all close the dialog; focus returns to the **View Map** button;
      body scroll is locked while open.
- [x] The trigger keeps its exact prior look and label; only `Link` → `<button type="button">` changes.
- [x] `/find-a-room` still opens the interactive dialog; `/maps`, `/landlord/maps` and the
      listing-detail map are unmodified.
- [x] `/public-maps` is deleted, `routeTree.gen.ts` regenerated, and no source file references the
      path.
- [x] `apps/web/test/maps.test.ts` is extended (34 cases); `bun run web:typecheck` clean;
      `bun run web:test` green — 124 tests across 16 files.
- [x] Supersession notes added to `find-a-room-map-modal-spec.md` and `public-maps-view-only-spec.md`.
- [x] No API/worker/DB/dependency change; nothing committed.

---

## 11. Implementation notes (what shipped)

Written after the fact, so the spec reflects reality.

- **`MapModal.tsx`** grew a `viewOnly?: boolean` prop (default `false`) and a second body,
  `MapModalViewOnlyBody`, which renders `mapSubtitle()` and a bare `MapEmbed` at
  `h-[60vh] sm:h-[70vh]`. The interactive body is untouched. Both bodies sit behind
  `{open ? (viewOnly ? <MapModalViewOnlyBody /> : <MapModalBody />) : null}`, and the panel stays
  `size="xl"` for both — so the hero passes no `size` and the two dialogs cannot drift apart.
- **`Hero.tsx`** is now client-stateful: `mapOpen` + a `<button type="button">` with the same outline
  classes, and one `<MapModal … viewOnly />` at the end of the section. The `Link` import stays.
- **`routes/public-maps.tsx`** was deleted and `routeTree.gen.ts` regenerated by `bun run web:build`
  (no `public-maps` reference survives anywhere under `src/`). `lib/maps.ts`'s module comment no
  longer lists the route.
- **Tests:** `apps/web/test/maps.test.ts` (34 cases) gained the hero wiring, the "same panel", the
  view-only absence (Hero _and_ the modal's view-only slice) and the retired-route guards; it lost the
  old `/public-maps` view-only guard and its `MAP_FRAME_HEIGHTS`/`MAP_ROUTES` entries, and `Hero.tsx`
  joined `MAP_SURFACE_FILES`. Suite total: **124 passing across 16 files**, `web:typecheck` and
  `web:build` clean.
- **Not done in this pass:** the live browser check. The static guarantees are covered by the unit
  suite, but a real-browser pass of `http://localhost:3000/` (dialog opens without navigating, is as
  wide as `/find-a-room`'s, no iframe pre-open, focus returns) is the recommended follow-up — it is
  what caught the focus-trap bug in the preceding map spec.

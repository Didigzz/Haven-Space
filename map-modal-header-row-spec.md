# Spec — `/find-a-room` map dialog: centred subtitle with the control beside it

**Status:** **Implemented and verified** (2026-09-30) — 127 unit tests pass (0 failures),
`web:typecheck` clean, `web:build` clean, and every new utility found in the emitted CSS. See §11 for
what shipped.
**Short name:** `map-modal-header-row` (the file is `map-modal-header-row-spec.md`)
**Date:** 2026-09-30
**Owner request (verbatim):**

> in http://localhost:3000/find-a-room after clicking map, follow the image where the Browse boarding
> houses around Malaybalay, Bukidnon. stays in the middle and beside that is the Use my location so
> that the space is utilize

**Reference image:** a crop of the dialog showing the heading `Find boarding houses near you`
left-aligned, and below it the grey line
`Browse boarding houses around Malaybalay, Bukidnon.` **centred across the panel**, with the top edge
of the map frame under it. The image is the **target** state, not a screenshot of the current build.

**Relationship to existing work.** Three earlier specs own everything this touches:

- `find-a-room-map-modal` built `MapModal.tsx` (a thin host over the shared `Modal`) and its
  `MapModalBody`, which stacks the subtitle line and the control row. Its **D7** ("the subtitle line is
  a small addition … trivially droppable if unwanted") and §9.7 are the closest prior art.
- `modal-desktop-width` widened every `Modal` tier and put `MapModal` on `size="xl"`
  (`max-w-4xl` → `max-w-6xl`, i.e. 896px → 1152px). That width is _why_ the two stacked rows now read
  as wasted space.
- `hero-map-modal` added the `viewOnly` branch. That branch keeps the old left-aligned subtitle; this
  spec deliberately leaves it alone (D1, D20).

This spec changes **only the markup of `MapModalBody`'s header area** — one `<p>` and one wrapper
`<div>` in one file. It changes no component interface, no shared component, no copy and no behaviour.

---

## 1. Interview decisions (as answered by the requestor)

| #   | Topic                      | Decision                                                                                                                                                                                       |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Scope                      | **Only the `/find-a-room` dialog** — the interactive `MapModalBody`. `/maps`, `/landlord/maps`, the listing-detail map and the hero's view-only dialog keep today's layout.                    |
| D2  | Meaning of "in the middle" | **Centred across the full panel width, with the button pinned to the panel's right edge.** The subtitle ignores the button's width; it is not merely centred in the space left over beside it. |
| D3  | The image                  | **It is the target design.** The heading `Find boarding houses near you` **stays left-aligned** exactly as it is today; only the subtitle below it changes.                                    |
| D4  | Vertical space             | **Merge the two stacked rows into one** and reclaim the height: the map frame starts higher and the dialog is shorter.                                                                         |
| D5  | Active state               | When a location is active, **both buttons sit pinned right, side by side** — `Use my location` then `Reset to Malaybalay` — with the subtitle still centred across the panel.                  |
| D6  | Geolocation unavailable    | `MapLocationControl` renders `null`; **the subtitle stays centred and the row keeps its height**, so nothing shifts when there is no control.                                                  |
| D7  | Long-subtitle collision    | **Constrain the subtitle's width** so it can never reach the pinned button; if it does not fit, it wraps onto a second line.                                                                   |
| D8  | Implementation shape       | **A local row inside `MapModalBody` only.** `MapLocationControl.tsx` stays **byte-identical**; no new prop, no new shared component.                                                           |
| D9  | Narrow viewport (<640px)   | **Stack**: the centred subtitle sits on its own line, then the control on a right-aligned row beneath it. One row only from 640px up.                                                          |
| D10 | Screen reader semantics    | **No change.** The subtitle stays a plain `<p>`; it is not wired to the dialog via `aria-describedby`.                                                                                         |
| D11 | DOM order                  | **Subtitle first, then the control.** Pinning the button right is CSS only, so reading and tab order are exactly as they are today.                                                            |
| D12 | Visual style               | **Plain** — text and button on the panel background. No strip, card, border or new surface.                                                                                                    |
| D13 | Gap above the map          | **Tighter — roughly 8px**, down from today's 16px.                                                                                                                                             |
| D14 | Test coverage              | **Source-scan assertions in `apps/web/test/maps.test.ts`**, the established pattern for this feature area.                                                                                     |
| D15 | Verification               | **`bun run web:typecheck` + `bun run web:test`.** No build check required for this change.                                                                                                     |
| D16 | Docs                       | **Only this spec.** `find-a-room-map-modal-spec.md` and `hero-map-modal-spec.md` are left untouched.                                                                                           |
| D17 | Deferred work              | **`/maps` and `/landlord/maps` become a recorded future follow-up** — they carry the same subtitle-then-control stack, but they are explicitly out of scope here.                              |
| D18 | Collision mechanism        | **A symmetric gutter** — equal padding left and right of the subtitle of roughly one control's width, so the text stays truly centred in the panel.                                            |
| D19 | Specificity                | **Pin the exact utility classes** in this spec, so the change is mechanical and the test scan can assert the strings.                                                                          |
| D20 | Typography                 | **Unchanged** — `text-sm text-gray-ink`, same size and colour as today.                                                                                                                        |

---

## 2. Current state (verified 2026-09-30)

### 2.1 The header area as it ships today

`apps/web/src/components/rooms/MapModal.tsx`, inside `MapModalBody`:

```tsx
function MapModalBody() {
  const location = useMapLocation();
  const pin = location.coordinates;

  return (
    <>
      <p className="mb-3 text-sm text-gray-ink">{pin ? LOCATION_SUBTITLE : mapSubtitle()}</p>
      <MapLocationControl state={location} />
      <MapEmbed
        title="Haven Space map"
        heightClass="h-[60vh] sm:h-[70vh]"
        url={pin ? mapUrlForCoordinates(pin.latitude, pin.longitude) : undefined}
      />
    </>
  );
}
```

Two stacked rows: a left-aligned subtitle with `mb-3`, then the control row with `mb-4`. Against the
`xl` panel's 1104px of inner width, that is a mostly-empty line above a right-aligned button.

### 2.2 The control being wrapped — untouched

`apps/web/src/components/rooms/MapLocationControl.tsx`:

```tsx
export function MapLocationControl({ state, resetLabel = 'Reset to Malaybalay }: { … }) {
  if (!state.supported) return null;
  …
  return (
    <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
      <Button variant={active ? 'primary' : 'outline'} size="sm" onClick={state.useMyLocation} disabled={locating} aria-pressed={active}>
        <Icon name="location" size={16} className="mr-1.5" />
        {locating ? 'Locating…' : 'Use my location'}
      </Button>
      {active ? (
        <Button variant="ghost" size="sm" onClick={state.reset}>{resetLabel}</Button>
      ) : null}
      <span className="sr-only" aria-live="polite">{statusText}</span>
    </div>
  );
}
```

Three facts drive this spec's mechanics (D8 — the file must not change):

1. It already right-aligns itself, so a plain wrapper only has to give it the last slot in a row.
2. It carries its own **`mb-4`** — 16px. Since it moves inside the new row, that margin becomes the
   gap above the map unless it is cancelled at the wrapper level.
3. It renders **`null`** when `state.supported` is false, so a row that keeps its height must do so
   from its own `min-height`, not from the control.

### 2.3 The button heights that size the row

`apps/web/src/components/ui/Button.tsx` — `SIZES = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2' }`.
For a `sm` button: `1.25rem` line-height + `0.75rem` vertical padding = **2rem (32px)**, plus the
`outline` variant's `border-2` = **2.25rem (36px)**. So the row must reserve **36px** to accommodate
the widest state (idle `outline`) without shifting when the state flips to the 32px `primary`.

### 2.4 The rest of the dialog (unchanged)

- The `Modal` panel is `p-6` with `max-h-[90vh]`; the title row (`<h2>` left, close button right) is
  not touched (D3).
- `MapModalViewOnlyBody` (the hero's view-only branch) renders its own subtitle + bare embed; it is
  **not** touched (D1, D20).
- `apps/web/test/maps.test.ts` currently asserts, for this area, that `MapModal.tsx` contains
  `<Modal`, `useMapLocation`, `MapLocationControl`, `<MapEmbed`, `h-[60vh]`, `sm:h-[70vh]` and
  `size="xl"`, that the mount gate still holds, and that `MapLocationControl` appears on every
  location-enabled surface. All of that must stay green.

---

## 3. Requirements

### 3.1 The merged header row (D2–D9, D11, D12, D18, D19)

- **R1.** `MapModalBody`'s subtitle and control become **one row**: a `<div className="relative mb-2 sm:min-h-9">` wrapper containing the subtitle `<p>` and a new wrapper `<div>` around `<MapLocationControl … />`.
- **R2.** The subtitle is **centred across the full panel width** from 640px up:
  `<p className="text-center text-sm text-gray-ink sm:absolute sm:inset-x-0 sm:top-1/2 sm:-translate-y-1/2 sm:px-40">`,
  keeping the existing `pin ? LOCATION_SUBTITLE : mapSubtitle()` expression verbatim.
- **R3.** The symmetric gutter is **`sm:px-40`** (10rem / 160px each side). It must be at least half
  the widest control state — `Use my location` + `Reset to Malaybalay` measure ≈300px together, so
  150px per side is the floor and 160px leaves ≈10px of clearance. Growing either label means growing
  this gutter.
- **R4.** The control is **pinned right** by wrapping it, not by editing it:
  `<div className="-mb-4 sm:flex sm:justify-end"><MapLocationControl state={location} /></div>`.
  When the location is active, both buttons travel together in that slot, in their existing order
  (D5).
- **R5.** The row holds its height when the control is absent: **`sm:min-h-9`** (2.25rem / 36px, the
  tallest control state — §2.3). The centred subtitle does not move when the control appears or
  disappears, and neither does the map (D6).
- **R6.** The gap above the map becomes **≈8px**. The wrapper's `-mb-4` cancels the control's own
  16px margin, and the row's `mb-2` (8px) supplies the gap. This works in all three cases — control
  present, control absent, and the stacked mobile layout — because the negative margin sits on the
  wrapper, which is present in every case.
- **R7.** **Below 640px the two stack** (D9). Nothing is prefixed with `sm:`, so on a phone the
  subtitle is an in-flow centred line and the control wrapper sits beneath it, still right-aligning
  its own buttons.
- **R8.** The subtitle keeps `text-sm text-gray-ink` and loses only its `mb-3` (the row now owns the
  spacing). Its text expression and both strings are unchanged (D20).
- **R9.** **No new surface**: no background, border, shadow or rounded container — plain content on
  the panel (D12).
- **R10.** `MapLocationControl.tsx` is **not modified**, in whole or in part — its `mb-4`,
  `justify-end`, `gap-2`, labels, icon and `sr-only` live region all stay exactly as they are (D8).
  Its `sr-only` `aria-live` status line keeps its position in the DOM.

### 3.2 Semantics left alone (D10, D11)

- **R11.** The subtitle stays a plain `<p>` — no `id`, no `aria-describedby`, no `role` (D10).
- **R12.** DOM order stays **subtitle → control → map**, so the control button remains the first
  focusable element inside the dialog and the shared `Modal` focus trap is untouched (D11).
- **R13.** The mount-on-open guarantee is untouched: the whole header area still lives inside
  `MapModalBody`, which only renders while the dialog is open.

### 3.3 Explicitly untouched (D1, D3, D16, D17)

- **R14.** `MapModal.tsx`'s `Modal` line, `MAP_MODAL_TITLE`, the `size="xl"` panel, `MapModalViewOnlyBody`
  and the mount gate are unchanged.
- **R15.** `routes/maps.tsx`, `routes/landlord/maps.tsx`, `components/rooms/RoomDetailView.tsx`,
  `components/rooms/Hero.tsx`, `MapEmbed.tsx`, `useMapLocation.ts`, `lib/geolocation.ts`, `lib/maps.ts`
  and `components/ui/Modal.tsx` are all unchanged. The heading row inside `Modal` is unchanged (D3).

---

## 4. Files to change

| #   | File                                         | Change                                               |
| --- | -------------------------------------------- | ---------------------------------------------------- |
| 1   | `apps/web/src/components/rooms/MapModal.tsx` | R1–R10 — the merged header row inside `MapModalBody` |
| 2   | `apps/web/test/maps.test.ts`                 | R16 — header-row source-scan assertions              |
| 3   | `map-modal-header-row-spec.md`               | this file                                            |

**No** change to `MapLocationControl.tsx`, `Modal.tsx`, `MapEmbed.tsx`, `useMapLocation.ts`,
`Button.tsx`, `Hero.tsx`, any route file, any API/worker/DB code, or any dependency (D8, R14, R15).

---

## 5. Exact resulting values (pinned classes, D19)

```tsx
// inside MapModalBody, replacing the current <p> + <MapLocationControl/> pair
<div className="relative mb-2 sm:min-h-9">
  {/* Centred across the whole panel; the symmetric gutter keeps it clear of the pinned control. */}
  <p className="text-center text-sm text-gray-ink sm:absolute sm:inset-x-0 sm:top-1/2 sm:-translate-y-1/2 sm:px-40">
    {pin ? LOCATION_SUBTITLE : mapSubtitle()}
  </p>
  {/* `-mb-4` cancels the control's own bottom margin — MapLocationControl itself is untouched — so
      the row's `mb-2` is what the map sees. */}
  <div className="-mb-4 sm:flex sm:justify-end">
    <MapLocationControl state={location} />
  </div>
</div>
```

| Item                    | Value                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Row wrapper             | `relative mb-2 sm:min-h-9`                                                                           |
| Subtitle classes        | `text-center text-sm text-gray-ink sm:absolute sm:inset-x-0 sm:top-1/2 sm:-translate-y-1/2 sm:px-40` |
| Subtitle copy, default  | `Browse boarding houses around Malaybalay, Bukidnon.` (`mapSubtitle()`)                              |
| Subtitle copy, tracking | `Showing boarding houses around your location.` (`LOCATION_SUBTITLE`)                                |
| Symmetric gutter        | `sm:px-40` → 160px per side (floor for the two-button state ≈150px)                                  |
| Control wrapper         | `-mb-4 sm:flex sm:justify-end`                                                                       |
| Pinned-right slot       | `Use my location`, then `Reset to Malaybalay` when active                                            |
| Row height reserved     | `sm:min-h-9` → 36px (the `outline`/`border-2` button height)                                         |
| Gap above the map       | ≈8px (`-mb-4` + `mb-2`)                                                                              |
| Stacking breakpoint     | below `sm` (640px)                                                                                   |
| Subtitle element        | plain `<p>`, no ARIA wiring                                                                          |
| DOM order               | subtitle → control → `MapEmbed`                                                                      |
| Panel                   | unchanged `size="xl"`, `p-6`, `max-h-[90vh]`, title left-aligned                                     |

---

## 6. Edge cases

| Case                                               | Expected behaviour                                                                                                                                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Idle (nothing active)                              | One row: centred subtitle, `Use my location` pinned right.                                                                                                                                                                                       |
| Active location                                    | Same row; `Use my location` becomes primary and `Reset to Malaybalay` joins it at the right, both still in the 36px slot.                                                                                                                        |
| Locating                                           | The button shows `Locating…` and is disabled; the row height is unchanged, so nothing shifts.                                                                                                                                                    |
| `navigator.geolocation` missing / insecure context | The control renders `null`; the subtitle stays centred and the row keeps its 36px, so the map does not move (D6).                                                                                                                                |
| Subtitle swaps to `LOCATION_SUBTITLE`              | Re-centred in place; the shorter/longer string changes nothing but its own line box.                                                                                                                                                             |
| Narrow desktop (~640–760px)                        | The 320px of gutters squeeze the text, so `Browse boarding houses around Malaybalay, Bukidnon.` may wrap to a second line. Accepted (D7); if it reads poorly, either widen the breakpoint to `md:` or reduce the gutter — both one-line changes. |
| Two buttons on a narrow desktop                    | The control may wrap internally; the row grows because the control is in flow, and the absolutely positioned subtitle stays vertically centred in the taller row.                                                                                |
| Phone (<640px)                                     | Stacked: centred subtitle, then the right-aligned control under it, then the map (D9).                                                                                                                                                           |
| Very long `resetLabel` on another surface          | Irrelevant — `MapLocationControl` is only wrapped here, and `resetLabel` is only overridden by `RoomDetailView`, which this spec does not touch.                                                                                                 |
| Escape / X / backdrop, focus trap, scroll lock     | Unchanged — inherited from the shared `Modal`; DOM order is preserved (R12).                                                                                                                                                                     |
| Reduce motion / slow device                        | Unaffected; this is a static layout change.                                                                                                                                                                                                      |
| SSR of `/find-a-room`                              | Unchanged: the dialog is closed, so `MapModalBody` does not render at all.                                                                                                                                                                       |
| Hero's view-only dialog                            | Unchanged — its subtitle stays left-aligned (D1, D20).                                                                                                                                                                                           |

---

## 7. Test plan

Run from the repo root (D15):

```bash
bun run web:typecheck
bun run web:test
```

- **R16. `apps/web/test/maps.test.ts` (extended).** Source-scan assertions, in the style the file
  already uses for this feature:
  - `components/rooms/MapModal.tsx` contains `text-center`, `sm:px-40`, `sm:absolute`, `sm:min-h-9`
    and `sm:justify-end` — the row is present;
  - it still contains `<MapLocationControl state={location} />`, so the control is still rendered
    from the modal and not re-implemented;
  - the wrapper still carries `-mb-4`, pinned as the mechanism for the ~8px gap;
  - **`components/rooms/MapLocationControl.tsx` still contains `mb-4` and `justify-end`** — a
    regression guard that the shared control was wrapped, not rewritten (D8);
  - the `MapModalViewOnlyBody` slice contains **no** `text-center` and **no** `sm:px-40` — the scope
    guard for D1/D20;
  - `apps/web/src/routes/maps.tsx` and `landlord/maps.tsx` contain no `sm:px-40` — the scope guard
    for D1/D17.
- **Existing guards stay green.** The `size="xl"` assertion, the mount-gate assertion, the
  `MAP_ROUTES` / `LOCATION_SURFACES` / `MAP_FRAME_HEIGHTS` scans, and the hero wiring and
  view-only-absence tests from `hero-map-modal` all still pass, since none of them touch this markup.
- **Not covered by tests.** The actual centring, the pinned-right placement and the stacking are
  visual; the scans pin the classes that produce them but cannot assert the rendered geometry. A
  live check is the recommended follow-up, not part of this spec's gate (D15).

---

## 8. Out of scope (explicit)

- The hero's view-only dialog (`MapModalViewOnlyBody`) — its subtitle stays left-aligned (D1, D20).
- `/maps`, `/landlord/maps` and the listing-detail map, which keep the stacked subtitle + control.
  **Recorded as a follow-up** (D17): they share the same two-row shape and would want the same
  treatment, but the request is about the `/find-a-room` dialog.
- Any change to `MapLocationControl`'s props, classes, labels, variants or its `sr-only` live region
  (D8, R10).
- Centring or otherwise restyling the dialog heading, `Find boarding houses near you`, or the
  `Modal` title row / close button (D3).
- Any new visual container — strip, card, border, background or shadow (D12).
- Wiring the subtitle to the dialog with `aria-describedby` (D10).
- Moving the control before the subtitle in the DOM, or changing the tab order (D11).
- Changing the copy, the frame height (`h-[60vh] sm:h-[70vh]`), the panel size or the animation.
- A responsive redesign (bottom sheet, full-screen dialog) — the same dialog at every width.
- Adding a dependency (layout, focus-trap or otherwise).
- Updating `find-a-room-map-modal-spec.md` or `hero-map-modal-spec.md` (D16).
- Any commit — same convention as the preceding map specs.

---

## 9. Open questions / risks

1. **The 640–760px band is the weak spot.** The gutter is sized for the two-button state, so on a
   panel only just wider than 640px the subtitle wraps and the row grows. Accepted (D7); the
   one-line fixes are a wider breakpoint (`md:`) or a smaller gutter.
2. **The gutter is coupled to the button labels.** `sm:px-40` was chosen from today's
   `Use my location` / `Reset to Malaybalay`. Renaming either, or translating the app, can bring the
   text and the button within ~10px of each other. Pinned in §5 so the coupling is visible.
3. **`-mb-4` is the only way to reach ≈8px without touching the control.** `MapLocationControl` must
   stay byte-identical (D8), and its `mb-4` sits inside the new row. The negative margin cancels it
   in every branch, but it is the kind of rule a future reader may delete as a mistake — R16 asserts
   it for that reason. If `MapLocationControl` ever gains a spacing prop, this should become a plain
   gap.
4. **`sm:min-h-9` assumes the `sm` button height.** If `Button`'s `sm` size changes, the reserved
   height silently stops matching the tallest control state and the row shifts slightly when the
   control appears. Not guarded by a test.
5. **Absolutely positioning the subtitle on desktop takes it out of the row's height.** That is
   deliberate (it is what lets the control own the row height and the map gap), but it means a very
   long subtitle could extend past the row's 36px rather than growing it. With today's two strings
   on an `xl` panel that cannot happen; it would need a much longer string.
6. **Two sources of "centred" now exist in the codebase.** The subtitle here is centred with a
   symmetric gutter, while `PageHeader`'s subtitle (used by `/maps`) is left-aligned — so a future
   pass at D17 should decide whether the centring treatment generalises or stays modal-specific.
7. **The image showed only the top of the frame.** The map screenshot is a crop, so the frame's own
   appearance (border, rounded corners, shadow) is out of scope and assumed unchanged.

---

## 10. Acceptance criteria

- [x] On `/find-a-room`, clicking **Map** opens the dialog with the grey
      `Browse boarding houses around Malaybalay, Bukidnon.` **centred across the panel**, with
      `Use my location` **pinned to the right** on the same line.
- [x] The dialog heading `Find boarding houses near you` is still **left-aligned**, and the close
      button is still at the top right.
- [x] The map frame starts **higher than before** — the two former rows are now one.
- [x] With a location active, `Use my location` (primary) and `Reset to Malaybalay` are both pinned
      right, side by side, and the subtitle is still centred.
- [x] With geolocation unavailable, the subtitle stays centred and **nothing shifts** — the row keeps
      its height and the map stays where it was.
- [x] The gap between the row and the map frame is **≈8px**.
- [x] The subtitle is still `text-sm text-gray-ink`; no background, border or container was added.
- [x] On a phone-width viewport the subtitle is centred on its own line with the control right-aligned
      **beneath** it.
- [x] `MapLocationControl.tsx` is **unchanged** (its `mb-4` and `justify-end` are intact), and the
      hero's view-only dialog still shows its left-aligned subtitle.
- [x] `/maps`, `/landlord/maps` and the listing-detail map are unmodified.
- [x] Tab order inside the dialog is unchanged; the status line for assistive tech is unchanged.
- [x] `apps/web/test/maps.test.ts` carries the new source-scan assertions; `bun run web:typecheck` is
      clean and `bun run web:test` is green.
- [x] No dependency, API/worker/DB or copy change; nothing committed.

**Verification note.** Per D15 the gate was `web:typecheck` + `web:test`, so the purely visual claims
above (the exact centring, the ≈8px gap, the phone stacking) rest on the pinned classes being present
in the source — asserted by R16 — and confirmed present in the emitted CSS, rather than on a rendered
measurement. **No live browser check was performed.**

---

## 11. Implementation notes (what shipped)

Written after the fact, so the spec reflects reality.

- **`MapModalBody`'s header is one row**, exactly as pinned in §5: a
  `relative mb-2 sm:min-h-9` wrapper holding the subtitle as
  `text-center text-sm text-gray-ink sm:absolute sm:inset-x-0 sm:top-1/2 sm:-translate-y-1/2 sm:px-40`
  and the control wrapped in `-mb-4 sm:flex sm:justify-end`. The `pin ? LOCATION_SUBTITLE :
mapSubtitle()` expression and the `MapEmbed` below it are unchanged.
- **`MapLocationControl.tsx` was not edited at all** — it keeps its own `mb-4` and `justify-end`, and
  the new test asserts both, so a future "cleanup" cannot quietly make the wrapper's negative margin
  and right-alignment pointless (D8, R10).
- **`MapModalViewOnlyBody` and every other map surface are untouched**, and the new scope-guard test
  fails if the centring markup leaks into the hero dialog or onto `/maps` / `/landlord/maps`.
- **Tests.** `apps/web/test/maps.test.ts` gained three cases — the row's classes plus `-mb-4` and the
  `<MapLocationControl state={location} />` call site (R16), the "wrapped, not rewritten" guard, and
  the scope guard. That file is now **37 cases**; the suite went **124 → 127**, 0 failures.
- **Verification actually run.** `bun run web:typecheck` clean. `bun run web:test` 127 pass / 0 fail
  across 16 files. `bun run web:build` exit 0, and the emitted `app-*.css` contains
  `.sm\:px-40`, `.sm\:min-h-9`, `.sm\:absolute`, `.sm\:inset-x-0`, `.sm\:top-1\/2`,
  `.sm\:-translate-y-1\/2`, `.sm\:justify-end`, `.-mb-4` and `.text-center` — so no utility silently
  dropped out of the bundle. (Bare `.min-h-9` is absent by design: only the `sm:`-prefixed form is
  used.)
- **The `-mb-4` arithmetic, for the record.** The control's own `mb-4` (16px) sits inside the row, so
  the visible gap above the map is `16px + the row's own bottom margin`. `-mb-4` cancels the 16px and
  `mb-2` supplies 8px — the same 8px whether the control is present, absent, or stacked on a phone,
  because the negative margin lives on the wrapper rather than on the control.
- **Still open.** The risks in §9 are unchanged by the implementation: the gutter is still coupled to
  the button labels, `sm:min-h-9` still assumes the `sm` button height, and the 640–760px band still
  wraps. No live browser check was run.

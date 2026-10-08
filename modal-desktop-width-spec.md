# Spec — Desktop-Sized Dialogs (wider panels, taller maps)

**Status:** **Implemented and verified** (2026-09-30) — 120 unit tests pass (0 failures), `web:typecheck`
clean, `web:build` clean, and the emitted CSS contains every new utility. See §11 for what shipped.
**Short name:** `modal-desktop-width`
**Date:** 2026-09-30
**Owner request (verbatim):**

> when using a desktop adjust the size of the modal like make it wide

> http://localhost:3000/find-a-room?redirect=%2Ffind-a-room here after clicking the map it shows a
> modal, change the size of a modal to a desktop size

**Relationship to existing work:** this is a follow-up to `find-a-room-map-modal` (which introduced
`MapModal` and hardened the shared `Modal`) and to the Apple-style restructure specs. It changes
**only sizing classes** — the diff for `Modal.tsx` is three strings. Everything that spec built
(focus trap, scroll lock, focus restore, the map-as-host composition) is untouched. Note that
`find-a-room-map-modal` **D4** explicitly chose `md` (512px) for the map dialog; this spec supersedes
that one decision (see D6) because it is exactly what the request asks to change.

---

## 1. Interview decisions (as answered by the requestor)

| #   | Topic | Decision |
| --- | ----- | -------- |
| D1  | Scope | **Every dialog rendered by the shared `Modal`** — map, add-room, add/edit boarder, announcements, verification documents. Not only the map dialog. |
| D2  | Widest desktop width | **1152px** (`max-w-6xl`) for the widest tier. |
| D3  | The size tiers | **Keep `md` / `lg` / `xl`** and bump each by the same two steps on desktop: `md` → 672px, `lg` → 896px, `xl` → 1152px. |
| D4  | Short forms | **Stay the narrow tier.** A form dialog does *not* get the full desktop width; `md` (672px on desktop) is the form size. |
| D5  | Breakpoint | **`sm` (640px).** From 640px up the panel uses the wider cap; below that nothing changes. |
| D6  | The map dialog's tier | **`MapModal` opts into `size="xl"`.** Derived from D1+D2+D4: the map dialog is the one the request is about, and `md`'s new desktop cap (672px) would leave it 480px short of the width asked for. |
| D7  | Mobile | **Unchanged.** Every tier's sub-640px width is byte-identical to today; only `sm:`-prefixed classes are added. |
| D8  | Map frame height (dialog) | **Taller on desktop:** `h-[60vh]` → `h-[60vh] sm:h-[70vh]`. |
| D9  | Map frame heights (pages) | **Every map surface steps up on desktop.** `/maps` and `/public-maps`: 60vh → 70vh. `landlord/maps`: 70vh → 80vh. Nothing gets shorter on mobile. |
| D10 | The panel's height cap | **Keep `max-h-[90vh]`.** The panel already scrolls when its content is taller; no change to that. |
| D11 | `ConfirmDialog` | **Stays compact** (`max-w-md`, 448px). A confirm prompt is not a content dialog. |
| D12 | `LoginPromptOverlay` | **Untouched.** It is a bespoke prompt, not a `Modal`, same class of dialog as D11. |
| D13 | Regression coverage | **Yes.** Rendered-DOM assertions in `apps/web/test/modal.test.tsx`, plus the map-frame heights. |
| D14 | Deliverable / git | **This spec first, then the code on an explicit "implement"** — both done in this pass (§11). Changes stay **uncommitted**, as with the earlier specs. |

---

## 2. Current state (verified 2026-09-30)

### 2.1 The shared `Modal` and its three tiers

`apps/web/src/components/ui/Modal.tsx`:

```ts
const SIZES = {
  md: 'max-w-lg',   // 512px
  lg: 'max-w-2xl',  // 672px
  xl: 'max-w-4xl',  // 896px
} as const;
```

with the prop doc comment `/** md matches the original max-w-lg; wider panels opt in explicitly. */`
and the panel built as:

```tsx
className={`relative w-full ${SIZES[size]} max-h-[90vh] overflow-y-auto rounded-2xl border border-white/20 bg-surface/90 p-6 shadow-pop backdrop-blur-xl`}
```

The outer wrapper is `fixed inset-0 z-50 flex items-center justify-center p-4`, and the panel is
`w-full`. **That combination matters:** `max-w-*` is a *cap*, not a width, so a cap larger than the
viewport can never overflow — the panel is bounded by the flex container (viewport minus the 16px
padding) at all times. No `overflow-x`, no horizontal scrolling, at any size.

The scale itself is stock Tailwind: `apps/web/src/styles/app.css` overrides only colours in `@theme`
— no `--container-*`, no `--spacing`, no root `font-size` — so `max-w-2xl` really is 42rem/672px,
`max-w-4xl` 56rem/896px and `max-w-6xl` 72rem/1152px.

### 2.2 Every `Modal` call site (the full blast radius)

| # | File | Line | Size | Contents |
| - | ---- | ---- | ---- | -------- |
| 1 | `components/rooms/MapModal.tsx` | 19 | *(default `md`)* | The `/find-a-room` map dialog — the one in the request |
| 2 | `components/rooms/LandlordRoomList.tsx` | 162 | *(default `md`)* | "Add a room" form (2-column grid) |
| 3 | `routes/boarder/announcements.tsx` | 103 | *(default `md`)* | Reading one announcement |
| 4 | `routes/boarder/tenancy.tsx` | 142 | *(default `md`)* | "Request to leave" form |
| 5 | `routes/landlord/announcements.tsx` | 201 | *(default `md`)* | New / edit announcement form |
| 6 | `routes/landlord/boarders.tsx` | 300 | *(default `md`)* | Add / edit boarder form (2-column grid) |
| 7 | `components/admin/LandlordDocumentsModal.tsx` | 163 | `size="xl"` | Landlord verification documents |
| 8 | `components/admin/LandlordDocumentsModal.tsx` | 306 | `size="xl"` | Enlarged document preview |

Two things to note. **No call site uses `lg` today** — it exists as API surface only, so scaling it
is zero-risk and keeps the ladder even for future call sites. And **six of eight call sites rely on
the default**, so all of D1's benefit arrives without touching a single call site except #1.

### 2.3 The map surfaces and their frame heights

| File | Line | Today | Caller |
| ---- | ---- | ----- | ------ |
| `components/rooms/MapModal.tsx` | 43 | `heightClass="h-[60vh]"` | the `/find-a-room` dialog |
| `routes/maps.tsx` | 23 | `heightClass="h-[60vh]"` | `/maps`, full page |
| `routes/public-maps.tsx` | 25 | `heightClass="h-[60vh]"` | `/public-maps`, view-only |
| `routes/landlord/maps.tsx` | 31 | `heightClass="h-[70vh]"` | `/landlord/maps` |

`MapEmbed` (`components/rooms/MapEmbed.tsx`) joins whatever it is handed into
`className={\`w-full rounded-lg border-0 shadow-card ${heightClass}\`}`, so a responsive height is a
plain string swap at each call site; the component itself does not change.

### 2.4 Dialogs that do **not** use the shared `Modal`

- `components/ui/ConfirmDialog.tsx` — `className="w-full max-w-md rounded-2xl …"` (448px). Used by
  `PropertyAccessTab`, `ApplicationsSection`, `LandlordsSection`, `PropertiesSection`, `UsersSection`,
  `LandlordRoomList`, `landlord/announcements` and `landlord/boarders`.
- `components/ai/LoginPromptOverlay.tsx` — `max-w-md`, bespoke `role="dialog"`.

Both are prompt-shaped, stay as they are (D11/D12), and are named here so a later reader does not
mistake the narrow widths for something this spec forgot.

### 2.5 Existing tests this touches — one assertion is deliberately invalidated

`apps/web/test/maps.test.ts` (`find-a-room-map-modal` coverage):

```ts
expect(source).toContain('h-[60vh]');          // still passes: 'h-[60vh] sm:h-[70vh]' contains it
// No size override: the dialog uses the shared default (`md`) by choice.
expect(source).not.toContain('size=');         // BREAKS: D6 adds size="xl"
```

That second assertion exists to pin an earlier decision this spec supersedes. It must be **replaced**
(not deleted) by the opposite assertion plus its reason, so the guard keeps its meaning. The comment
above `SIZES` and the prop doc comment in `Modal.tsx` also become wrong and are updated in the same
pass.

---

## 3. Requirements

### R1 — Every tier keeps its mobile width and gains a wider desktop cap (D3, D5, D7)

```ts
const SIZES = {
  md: 'max-w-lg sm:max-w-2xl',
  lg: 'max-w-2xl sm:max-w-4xl',
  xl: 'max-w-4xl sm:max-w-6xl',
} as const;
```

Below 640px each tier is byte-identical to what ships today. No `size` prop values change meaning;
no new tier is introduced.

### R2 — The map dialog opts into the widest tier (D6)

`MapModal`'s `<Modal …>` gains `size="xl"`, so on desktop it is 1152px instead of 512px — the change
actually asked for.

### R3 — Form dialogs stay the narrow tier (D4)

Call sites #2, #4, #5, #6 keep their default `md`. The two 2-column form grids keep both columns
comfortable at 672px; they do not stretch to 1152px.

### R4 — The map frame is taller on desktop (D8)

`MapModal`: `heightClass="h-[60vh] sm:h-[70vh]"`.

### R5 — Every page map steps up too (D9)

`/maps` and `/public-maps`: `h-[60vh] sm:h-[70vh]`. `landlord/maps`: `h-[70vh] sm:h-[80vh]`. No
surface's sub-640px height changes.

### R6 — The panel's height cap is untouched (D10)

`max-h-[90vh] overflow-y-auto` stays exactly as it is. At 70vh the map still fits without scrolling
on any window ≥ ~770px tall (70vh + the ~140px title/subtitle/control row ≈ 678px vs a 691px cap),
so the scrollbar is a rare fallback, not the normal state. This is why D10 keeps 90vh.

### R7 — Prompts stay narrow (D11, D12)

`ConfirmDialog` and `LoginPromptOverlay` are not edited.

### R8 — No behavioural change

No change to focus handling, Escape, backdrop click, scroll lock, animation, or the `Modal` DOM
structure. The diff is width/height class strings plus comments.

### R9 — Comments that assert the old behaviour are corrected

The `SIZES` header comment, the `size` prop doc comment, and the `maps.test.ts` "no size override"
assertion all encode "the map dialog is `md` by choice". Each is updated to state the new rule rather
than left to contradict the code.

---

## 4. Files to change

| File | Change |
| ---- | ------ |
| `apps/web/src/components/ui/Modal.tsx` | `SIZES` values; `SIZES` comment; `size` prop doc comment |
| `apps/web/src/components/rooms/MapModal.tsx` | `size="xl"`; `heightClass="h-[60vh] sm:h-[70vh]"` |
| `apps/web/src/routes/maps.tsx` | `heightClass="h-[60vh] sm:h-[70vh]"` |
| `apps/web/src/routes/public-maps.tsx` | `heightClass="h-[60vh] sm:h-[70vh]"` |
| `apps/web/src/routes/landlord/maps.tsx` | `heightClass="h-[70vh] sm:h-[80vh]"` |
| `apps/web/test/modal.test.tsx` | New tests for R1–R3, R7 |
| `apps/web/test/maps.test.ts` | Replace the `not.toContain('size=')` assertion (D6); assert the four frame heights (R4/R5) |

Six source files, two test files. No route, hook, repository, API or config changes; nothing in
`workers/api`.

---

## 5. Exact resulting values

### 5.1 Panel widths

| Tier | < 640px (unchanged) | ≥ 640px (new) | Change on desktop | Call sites |
| ---- | ------------------- | ------------- | ----------------- | ---------- |
| `md` | `max-w-lg` (512px) | `max-w-2xl` (672px) | +160px | forms + announcement reader |
| `lg` | `max-w-2xl` (672px) | `max-w-4xl` (896px) | +224px | *(none yet)* |
| `xl` | `max-w-4xl` (896px) | `max-w-6xl` (1152px) | +256px | **map dialog**, verification documents, document preview |
| `ConfirmDialog` | `max-w-md` (448px) | `max-w-md` (448px) | none | all confirms |

The map dialog therefore goes **512px → 1152px** on desktop, which is the headline change.

### 5.2 `MapModal` after

```tsx
<Modal open={open} title={MAP_MODAL_TITLE} onClose={onClose} size="xl">
  {open ? <MapModalBody /> : null}
</Modal>
```

```tsx
<MapEmbed
  title="Haven Space map"
  heightClass="h-[60vh] sm:h-[70vh]"
  url={pin ? mapUrlForCoordinates(pin.latitude, pin.longitude) : undefined}
/>
```

### 5.3 Frame heights

| Surface | < 640px | ≥ 640px |
| ------- | ------- | ------- |
| `/find-a-room` dialog | 60vh | 70vh |
| `/maps` | 60vh | 70vh |
| `/public-maps` | 60vh | 70vh |
| `/landlord/maps` | 70vh | **80vh** |

---

## 6. Edge cases

1. **A large cap on a small viewport.** `w-full` bounds the panel to the flex container (viewport
   minus `p-4`), so `sm:max-w-2xl` on a 660px window yields 628px, not 672px. No overflow, no
   horizontal scroll. This is asserted by the viewport-free nature of the classes, and the browser
   check should confirm it at ~700px.
2. **`sm` starts below the tier's own width.** On a 640px window the `md` cap (672px) exceeds the
   viewport — harmless for the reason above, but worth a look in the browser check.
3. **Nested dialogs.** `LandlordDocumentsModal` renders the preview `Modal` above the review `Modal`;
   both are `xl`, so both widen together. Escape still closes both (existing documented behaviour,
   unchanged here).
4. **The verification document grid.** `md:grid-cols-2` inside a 1152px panel gets noticeably wider
   cards. `md:grid-cols-2` triggers at 768px — i.e. *before* the panel reaches its desktop width, so
   the grid can be two wide columns while the panel is still narrow-ish. Worth eyeballing on a ~800px
   window; if it looks stretched, the fix is a one-class change at that call site and **out of scope**
   here unless the requestor asks.
5. **The documents preview image** is `max-h-[70vh]` and unaffected; a 1152px panel simply centres it
   with more breathing room.
6. **The announcement reader** at 672px on desktop is deliberate: 1152px is a poor measure for long
   prose. If it ever needs more, that is a call-site change, not a change to `md`.
7. **Zoomed-in browsers.** At 200% zoom the `sm` breakpoint may not be reached, so the panel falls back
   to today's widths — the same graceful behaviour every other responsive class in the app has.
8. **Reduced motion / transparency.** Untouched; no class in this diff interacts with either.
9. **Print.** No print stylesheet exists; nothing to reconcile.

---

## 7. Test plan

**`apps/web/test/modal.test.tsx`** (extend; the existing `parts()` helper already returns the panel):

1. For each of `md`, `lg`, `xl`: render `<Modal open size={tier}>` and assert the panel's
   `className` contains both the base class and the `sm:` class from R1 — and, as the regression
   guard, that it does **not** contain the tier's old desktop cap as a bare class where that would
   mean no scaling (e.g. `xl` must not be only `max-w-4xl`).
2. Assert the panel still has `max-h-[90vh]` and `overflow-y-auto` (R6 — a silent change here would
   let a tall dialog run off-screen).
3. Render `<MapModal>` and assert its panel contains `sm:max-w-6xl` (R2 — this is the request's own
   requirement, pinned so a future refactor cannot quietly drop the `size` prop).
4. Render `<ConfirmDialog open>` and assert the panel contains `max-w-md` and no `sm:max-w-*` (R7).

**`apps/web/test/maps.test.ts`** (edit one assertion, add one test):

5. Replace `expect(source).not.toContain('size=')` with a positive assertion of the new contract and
   a comment naming this spec as the reason the old one is gone.
6. A source scan over the four map surfaces asserting each `heightClass` matches its expected pair
   from §5.3 — the existing `toContain('h-[60vh]')` check stays as-is and keeps passing.

**Commands / gates:**

```bash
bun run web:typecheck        # tsc --noEmit
bun run web:test             # expect the current 86 passing + the new tests, 0 failures
bun run web:build            # vite build
bunx prettier --write apps/web/src/components/ui/Modal.tsx apps/web/src/components/rooms/MapModal.tsx \
  apps/web/src/routes/maps.tsx apps/web/src/routes/public-maps.tsx \
  apps/web/src/routes/landlord/maps.tsx apps/web/test/modal.test.tsx apps/web/test/maps.test.ts
```

**Browser check (manual, DevTools device toolbar):**

- `/find-a-room` → Map button: panel is 512px wide below 640px and 1152px from 640px up; map is 70vh
  tall on desktop; no horizontal scrollbar; Escape/backdrop still close it.
- One form dialog (`landlord/boarders` add) stays 672px on a 1440px window.
- `/maps`, `/public-maps`, `/landlord/maps` frames are taller on desktop.
- A confirm dialog is still 448px.

---

## 8. Out of scope (explicit)

- `ConfirmDialog` and `LoginPromptOverlay` widths (D11/D12).
- Per-dialog width overrides beyond the existing `size` prop; no new prop, no context.
- The panel's `rounded-2xl`, `p-6`, blur, border, shadow, animation.
- The documents grid card layout and the preview image cap (§6.4/6.5 — call-site polish, not asked
  for).
- Page content widths (`max-w-[1280px]` shell column, `max-w-2xl` page bodies) — the request is about
  dialogs.
- Any change under `workers/api`, routing, or data fetching.
- Committing anything (D14).

---

## 9. Open questions / risks

1. **Is 1152px too wide for the verification-documents dialog?** It is the other `xl` user, and its
   content is four document cards in a 2-column grid. D1 says every content dialog scales, so it
   does — but if it reads as too airy, the lever is that call site dropping to `lg` (896px), *not*
   changing `xl`.
2. **The boarder announcement reader (call site #3).** Left at `md` (672px) for line-length reasons.
   If the requestor wants it wider, `lg` (896px) is the natural step.
3. **`lg` has no call sites.** Kept and scaled for ladder consistency; if the requestor prefers a
   two-tier system, say so before implementation — dropping `lg` would mean touching type definitions
   and both `xl` call sites.
4. **Ratifying a superseded decision.** D6 reverses `find-a-room-map-modal` D4. The spec for that work
   is marked implemented, so this file is the record of the reversal; its `maps.test.ts` assertion is
   updated rather than left failing.
5. **`sm` vs `md`.** `sm` was chosen (D5), so a 700px-wide window already gets 672px panels. If that
   ever feels cramped, moving the prefix to `md:` (768px) is a three-string change in `SIZES`.

---

## 10. Acceptance criteria

1. `Modal`'s three tiers match R1 exactly; sub-640px widths are unchanged from today.
2. Clicking **Map** on `/find-a-room` opens a dialog that is 1152px wide on a desktop viewport, with
   the map at 70vh.
3. Form dialogs (add room, add/edit boarder, new/edit announcement, request to leave) render at 672px
   on desktop and are unchanged on mobile.
4. `/maps`, `/public-maps` and `/landlord/maps` frames are taller on desktop and unchanged on mobile.
5. `ConfirmDialog` is still 448px wide.
6. No horizontal overflow or clipped content at any width from 320px to 1920px.
7. `bun run web:typecheck`, `bun run web:test` (all passing, 0 failures) and `bun run web:build` are
   clean; touched files are prettier-clean.
8. The `Modal` diff contains no behavioural change — no new effect, no DOM change, no new prop.

---

## 11. Implementation notes (what shipped)

Implemented 2026-09-30. The diff is class strings, comments and tests — no component structure, prop
shape or behaviour changed, and nothing outside `apps/web` was touched.

### 11.1 Files

| File | What changed |
| ---- | ------------ |
| `apps/web/src/components/ui/Modal.tsx` | `SIZES` → `'max-w-lg sm:max-w-2xl'` / `'max-w-2xl sm:max-w-4xl'` / `'max-w-4xl sm:max-w-6xl'`; the `SIZES` header comment now documents the tier ladder and why a cap can never overflow; the `size` prop doc comment now says which tiers are for forms vs data-heavy panels |
| `apps/web/src/components/rooms/MapModal.tsx` | `size="xl"` (+ a comment naming this spec as the reason, since it reverses `find-a-room-map-modal` D4); `heightClass="h-[60vh] sm:h-[70vh]"` |
| `apps/web/src/routes/maps.tsx` | `heightClass="h-[60vh] sm:h-[70vh]"` |
| `apps/web/src/routes/public-maps.tsx` | `heightClass="h-[60vh] sm:h-[70vh]"` |
| `apps/web/src/routes/landlord/maps.tsx` | `heightClass="h-[70vh] sm:h-[80vh]"` |
| `apps/web/test/modal.test.tsx` | 4 tests, below |
| `apps/web/test/maps.test.ts` | The superseded assertion replaced; 1 test added |

### 11.2 Tests added

`apps/web/test/modal.test.tsx`:

- **every size keeps its phone width and gains a wider desktop cap** — loops all three tiers, asserts
  the exact class array contains the phone width *and* the `sm:` width, and asserts it does **not**
  contain the bare desktop cap (which is precisely the shape the bug would take if the `sm:` half were
  dropped).
- **the panel keeps its height cap and still scrolls when content is taller** — pins `max-h-[90vh]`
  and `overflow-y-auto` (R6), so widening the panel cannot silently take the tall-content fallback
  with it.
- **the map dialog takes the widest panel and a taller frame on desktop** — the request's own
  requirement: renders `MapModal` and asserts the panel carries `sm:max-w-6xl` and the iframe carries
  both `h-[60vh]` and `sm:h-[70vh]`.
- **confirm prompts stay compact** — renders `ConfirmDialog` and asserts `max-w-md` with no `sm:max-w-*`
  (R7), so a future "widen everything" change cannot sweep the prompts in unnoticed.

`apps/web/test/maps.test.ts`:

- The `expect(source).not.toContain('size=')` assertion that pinned the old default is replaced by
  `expect(source).toContain('size="xl"')` with a comment explaining the reversal (R9). The existing
  `toContain('h-[60vh]')` check was kept — `'h-[60vh] sm:h-[70vh]'` still satisfies it.
- **every map frame is taller on desktop and unchanged on phones** — a scan over all four map
  surfaces that parses each `heightClass` and asserts it equals its expected pair from §5.3, so a
  surface cannot be forgotten or quietly get shorter on mobile.

### 11.3 Verification

| Gate | Result |
| ---- | ------ |
| `bun run web:typecheck` | clean |
| `bun run web:test` | **120 pass, 0 fail**, 376 `expect()` calls, 16 files |
| `bun run web:build` | succeeds |
| `bunx prettier --write` on all 7 touched files | clean |

Emitted `apps/web/dist/client/assets/app-*.css` contains `.sm\:max-w-2xl`, `.sm\:max-w-4xl`,
`.sm\:max-w-6xl`, `.sm\:h-[70vh]`, `.sm\:h-[80vh]` and the plain `h-[60vh]`, all inside a
`@media (width>=40rem)` block. The stock container tokens are confirmed in that same file rather than
assumed: `--container-2xl: 42rem` (672px), `--container-4xl: 56rem` (896px), `--container-6xl: 72rem`
(1152px) — so the pixel figures quoted throughout this spec are the real ones.

### 11.4 Not done (deliberately)

- The **browser pass** in §7 — checked here by unit tests and by reading the emitted CSS, not by
  driving Chrome. Worth a look before shipping, at ~700px (device toolbar) for §6.1/6.2 and at ~800px
  for §6.4, the two places a class-level change is least able to prove itself.
- §9's open questions (the documents dialog at 1152px, and the boarder announcement reader staying at
  `md`) are left as-is, per the answers in §1.
- Nothing was committed (D14).

# Spec — Map copy stops saying "boarding houses"

**Status:** **Specced, not implemented** (2026-09-30). No code has been written for this spec yet.
**Short name:** `inclusive-map-copy` (the file is `inclusive-map-copy-spec.md`)
**Date:** 2026-09-30
**Owner request (verbatim):**

> lets not make this a generalize place and words Browse boarding houses around Malaybalay, Bukidnon.
> since not only boarding house we also have pad apartment etc..

**Reading of the request.** The platform lists more than boarding houses — pads, apartments, dormitories
and studio units are all in scope for the listing type — so copy that says "boarding houses" overstates
the product. The three runtime map strings are the surface in question, and the fix is one inclusive
noun (D1) plus a neutral line where a noun would be wrong (D5).

---

## 1. Interview decisions (as answered by the requestor)

| #   | Topic                     | Decision                                                                                                                                                                                                       |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Direction                 | **One inclusive word** rather than naming each type (a list is never complete) or dodging the noun entirely.                                                                                                   |
| D2  | The word                  | **`rentals`.** Covers houses, pads, apartments and dorms, and is familiar to the audience.                                                                                                                     |
| D3  | Scope                     | **All three runtime map strings**: `mapSubtitle()`, `LOCATION_SUBTITLE` (`MapEmbed.tsx`) and `MAP_MODAL_TITLE` (`MapModal.tsx`). The rest of the app is untouched.                                             |
| D4  | Locale                    | **Keep "around Malaybalay, Bukidnon."** The place stays the anchor of the line and still comes from `MAP_LOCATION_QUERY`.                                                                                      |
| D5  | Tracking line             | **Neutral — "Showing what's around your location."** It is shared with `/landlord/maps`, where "rentals" reads oddly for someone who owns them, so the noun is dropped rather than duplicated.                 |
| D6  | Heading                   | **"Find rentals near you"** — the noun is used here too, overriding the interview's earlier "Find a place near you" so the word is genuinely shared (D7).                                                      |
| D7  | Shared constant           | **One constant holds the noun** and both noun-bearing strings compose from it, so the word cannot drift apart again.                                                                                           |
| D8  | Verb                      | **Keep "Browse"** in the default subtitle — the noun is the only change to that sentence.                                                                                                                      |
| D9  | Taxonomy                  | **Untouched.** The `boarding-house` listing type, its "Boarding House" labels, the landlord `boarding_house_name` field, the admin column header and the onboarding placeholders all stay exactly as they are. |
| D10 | Test guards               | **Update the pinned assertions only** — no new "boarding house" scan, which would collide with the retained taxonomy labels.                                                                                   |
| D11 | `modal.test.tsx` fixtures | **Update the four literal `title="Find boarding houses near you"` fixtures** to the new heading so no stale copy is left to grep for.                                                                          |
| D12 | SEO copy                  | **Left deliberately, and said so explicitly** — the FAQ, footer, testimonials and hero keep "boarding houses" for search.                                                                                      |
| D13 | Docs                      | **This new spec only.** The earlier specs stay historical snapshots of what was true then.                                                                                                                     |
| D14 | The rest                  | **Out of scope _plus_ an explicit deferred pass** — the remaining occurrences are listed, flagged as SEO-or-taxonomy, and marked for a possible later review.                                                  |
| D15 | Verification              | **`bun run web:typecheck` + `bun run web:test`**; the changes stay **uncommitted**, the convention of the recent copy and map changes (D16).                                                                   |
| D16 | Git                       | Nothing committed.                                                                                                                                                                                             |

---

## 2. Current state (verified 2026-09-30)

### 2.1 The three strings

`apps/web/src/components/rooms/MapEmbed.tsx` (lines 29–40):

```tsx
/** Subtitle naming the pinned location, for pages without richer copy. */
export function mapSubtitle(): string {
  return `Browse boarding houses around ${MAP_LOCATION_QUERY}.`;
}

/**
 * The one shared subtitle while the map follows the user (spec D8/R9).
 *
 * Deliberately names no place: the app has no reverse geocoding (spec D3), so it cannot honestly
 * say *which* city it is showing.
 */
export const LOCATION_SUBTITLE = 'Showing boarding houses around your location.';
```

`apps/web/src/components/rooms/MapModal.tsx` (line 8):

```tsx
/** Fixed heading — the dialog names its purpose, not the widget (spec `find-a-room-map-modal` D8). */
export const MAP_MODAL_TITLE = 'Find boarding houses near you';
```

### 2.2 Where they surface

| String              | Surfaces                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `mapSubtitle()`     | `routes/maps.tsx` (`PageHeader` subtitle), `MapModalBody`, `MapModalViewOnlyBody` (the home hero dialog) |
| `LOCATION_SUBTITLE` | `routes/maps.tsx`, `routes/landlord/maps.tsx`, `MapModalBody` — all three swap to it while tracking      |
| `MAP_MODAL_TITLE`   | the `/find-a-room` dialog and the hero's view-only dialog (both via `MapModal`)                          |

So this one change re-words `/maps`, `/landlord/maps`, the `/find-a-room` dialog and the home hero
dialog. `/landlord/maps` is the reason D5 exists: its inactive subtitle is its own literal ("See your
properties in and around the areas you manage."), but tracking swaps in the shared constant.

### 2.3 What pins these strings today

`apps/web/test/maps.test.ts`:

```ts
// test: 'the view-only dialog keeps the Malaybalay subtitle'
expect(mapSubtitle()).toBe(`Browse boarding houses around ${MAP_LOCATION_QUERY}.`);

// test: 'the dialog heading is the fixed one from the spec'
expect(MAP_MODAL_TITLE).toBe('Find boarding houses near you');
```

`apps/web/test/modal.test.tsx` passes `title="Find boarding houses near you"` to `<Modal>` in four
places (lines ~122, ~143, ~172, ~272). Those are arbitrary fixtures, not the real constant — but they
will read as stale copy after this change (D11).

### 2.4 The taxonomy that must not change (D9)

- `components/rooms/FindARoomContent.tsx` — `{ value: 'boarding-house', label: 'Boarding House' }` in the
  property-type filter, and the listing-type dropdowns in `landlord/listings/create.tsx` /
  `listings/$id/edit.tsx` (`<option value="boarding-house">Boarding house</option>`).
- `boarding_house_name` — the DB column, surfaced by `admin/LandlordDocumentsModal.tsx`,
  `admin/sections/LandlordsSection.tsx` (column header "Boarding house"), `boarder/find-a-room` previews
  and the landlord onboarding/profile placeholders ("Sunrise Boarding House").
- Guest-facing but out of scope by D3/D12: the hero paragraph, `/find-a-room`'s search heading and
  results line, the FAQ, testimonials, footer, our-story, VisionCards and the auth panel copy.

### 2.5 Existing patterns this follows

- `lib/maps.ts` already owns the shared, single-source locale (`MAP_LOCATION_QUERY`,
  `DEFAULT_MAP_ZOOM`) precisely so map copy cannot drift — the module doc says "prefer these constants
  over literal map URLs". D7 puts the noun alongside them for the same reason.
- `.prettierrc` sets `singleQuote: true`, so the tracking line's apostrophe forces double quotes:
  `"Showing what's around your location."` (Prettier prefers the quote that avoids an escape).

---

## 3. Requirements

### 3.1 The shared noun (D1, D2, D7)

- **R1.** `apps/web/src/lib/maps.ts` exports one constant holding the inclusive noun, e.g.
  `export const RENTALS_NOUN = 'rentals';`, with a doc comment saying why (the platform lists pads,
  apartments, dormitories and studio units too) and that it is the single source for the word.
- **R2.** Both noun-bearing strings compose from it rather than repeating the literal:
  `mapSubtitle()` and `MAP_MODAL_TITLE` (R3, R4). `LOCATION_SUBTITLE` is deliberately noun-free (R5).

### 3.2 The three strings (D3–D6, D8)

- **R3.** `mapSubtitle()` returns `` `Browse ${RENTALS_NOUN} around ${MAP_LOCATION_QUERY}.` `` →
  **"Browse rentals around Malaybalay, Bukidnon."** The verb stays "Browse" (D8) and the locale stays
  (D4); only the noun changes.
- **R4.** `MAP_MODAL_TITLE` becomes `` `Find ${RENTALS_NOUN} near you` `` →
  **"Find rentals near you."** _(No trailing period — it is a heading, as today.)_
- **R5.** `LOCATION_SUBTITLE` becomes the neutral literal
  **"Showing what's around your location."** — no noun, so it reads correctly on `/landlord/maps` as
  well as on the boarder surfaces (D5).
- **R6.** The doc comments on the two changed exports are updated to match reality: `mapSubtitle()`'s
  "Subtitle naming the pinned location…" and `LOCATION_SUBTITLE`'s "Deliberately names no place…" should
  also say the tracking line names no _property type_, since that is now a deliberate property of it.

### 3.3 What must not change (D9)

- **R7.** The `boarding-house` listing type value, every "Boarding House" label, the
  `boarding_house_name` field and column header, and the landlord onboarding placeholders remain
  byte-identical.
- **R8.** No file outside the four named in §4 is edited — in particular the marketing copy, the
  `/find-a-room` search heading/results line and the FAQ (D12, D14).

### 3.4 Tests and docs (D10, D11, D13, D15, D16)

- **R9.** The two pinned assertions in `apps/web/test/maps.test.ts` are updated to the new copy. **They
  should assert the literal copy, not re-interpolate the constant** — a test that rebuilds the string
  from the same constant cannot catch a wrong constant, and pinning the copy is what those tests exist
  for.
- **R10.** The four `title="Find boarding houses near you"` fixtures in `apps/web/test/modal.test.tsx`
  are updated to the new heading (D11).
- **R11.** `bun run web:typecheck` is clean and `bun run web:test` is green.
- **R12.** **No change** to the earlier spec files (D13) and **nothing committed** (D16).

---

## 4. Files to change

| #   | File                                         | Change                                               |
| --- | -------------------------------------------- | ---------------------------------------------------- |
| 1   | `apps/web/src/lib/maps.ts`                   | R1 — export the shared noun constant                 |
| 2   | `apps/web/src/components/rooms/MapEmbed.tsx` | R3, R5, R6 — `mapSubtitle()` and `LOCATION_SUBTITLE` |
| 3   | `apps/web/src/components/rooms/MapModal.tsx` | R4 — `MAP_MODAL_TITLE`                               |
| 4   | `apps/web/test/maps.test.ts`                 | R9 — the two pinned assertions                       |
| 5   | `apps/web/test/modal.test.tsx`               | R10 — the four fixtures                              |
| 6   | `inclusive-map-copy-spec.md`                 | this file                                            |

**No** change to `routes/maps.tsx`, `routes/landlord/maps.tsx`, `MapEmbed`'s markup, `MapModal`'s body,
any component, any API/worker/DB code or any dependency — the routes consume the constants, so they
update themselves.

---

## 5. Exact resulting values

```ts
// apps/web/src/lib/maps.ts
/**
 * What the platform lists, in one word. The inventory is not only boarding houses — pads, apartments,
 * dormitories and studio units are all listed — so map copy names none of them and uses this instead.
 * Kept here beside `MAP_LOCATION_QUERY` for the same reason: one source, so the word cannot drift.
 */
export const RENTALS_NOUN = 'rentals';
```

```tsx
// apps/web/src/components/rooms/MapEmbed.tsx
export function mapSubtitle(): string {
  return `Browse ${RENTALS_NOUN} around ${MAP_LOCATION_QUERY}.`;
}

export const LOCATION_SUBTITLE = "Showing what's around your location.";
```

```tsx
// apps/web/src/components/rooms/MapModal.tsx
export const MAP_MODAL_TITLE = `Find ${RENTALS_NOUN} near you`;
```

| Item                               | Before                                                    | After                                             |
| ---------------------------------- | --------------------------------------------------------- | ------------------------------------------------- |
| Default map subtitle               | `Browse boarding houses around Malaybalay, Bukidnon.`     | **`Browse rentals around Malaybalay, Bukidnon.`** |
| Tracking subtitle                  | `Showing boarding houses around your location.`           | **`Showing what's around your location.`**        |
| Dialog heading                     | `Find boarding houses near you`                           | **`Find rentals near you`**                       |
| Noun constant                      | —                                                         | `RENTALS_NOUN = 'rentals'` in `lib/maps.ts`       |
| Locale constant                    | `MAP_LOCATION_QUERY = 'Malaybalay, Bukidnon'`             | unchanged                                         |
| Property-type labels               | "Boarding House", `boarding-house`, `boarding_house_name` | unchanged                                         |
| `/landlord/maps` inactive subtitle | `See your properties in and around the areas you manage.` | unchanged                                         |

---

## 6. Edge cases

| Case                                         | Expected behaviour                                                                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/maps` header                               | Subtitle becomes `Browse rentals around Malaybalay, Bukidnon.`; while tracking, `Showing what's around your location.`                   |
| `/landlord/maps` tracking                    | Gets the neutral line — no "rentals" shown to someone who owns them (D5). Its inactive subtitle is its own literal and does not change.  |
| `/find-a-room` dialog                        | Heading `Find rentals near you`, subtitle `Browse rentals around Malaybalay, Bukidnon.`                                                  |
| Home hero dialog (view-only)                 | Same heading and subtitle as the `/find-a-room` dialog — both go through `MapModal`, so the two can never disagree.                      |
| Property-type filter                         | Still lists `Boarding House` as one option among several (D9).                                                                           |
| Landlord listing forms                       | Still `<option value="boarding-house">Boarding house</option>` (D9).                                                                     |
| Admin landlord table                         | Column header still "Boarding house", still reads `boarding_house_name` (D9).                                                            |
| FAQ / footer / testimonials / hero paragraph | Still say "boarding houses" — deliberate (D12).                                                                                          |
| SEO                                          | The word is kept where it is a search term; the app deliberately carries two vocabularies, documented in §8.                             |
| A test lands without its copy change         | `maps.test.ts` fails on the two pinned assertions — R9 must land in the same change, exactly like the `size=` guard in `hero-map-modal`. |
| `modal.test.tsx` fixtures left stale         | They would still pass (they are literals passed to `Modal`), so nothing fails — which is precisely why R10 updates them.                 |
| SSR of `/`, `/maps`, `/find-a-room`          | Unchanged; these are static strings with no browser APIs involved.                                                                       |
| Screen readers                               | The dialog heading is still the `Modal` title; changing its text changes what is announced, which is intended.                           |
| Long strings                                 | The new subtitle is shorter than the old one, so the `sm:px-40` gutter in `map-modal-header-row` gets more clearance, not less.          |

---

## 7. Test plan

Run from the repo root (D15):

```bash
bun run web:typecheck
bun run web:test
```

- **Pinned copy (R9).** `apps/web/test/maps.test.ts`:
  - `expect(mapSubtitle()).toBe('Browse rentals around Malaybalay, Bukidnon.')` — the **literal**, so a
    wrong constant cannot pass;
  - `expect(MAP_MODAL_TITLE).toBe('Find rentals near you')`.
- **Optional but recommended (R1).** `expect(RENTALS_NOUN).toBe('rentals')`, mirroring the existing
  `expect(MAP_LOCATION_QUERY).toBe('Malaybalay, Bukidnon')` pin. This is the one net-new assertion
  D10 allows for, since the constant is itself a pinned value.
- **Fixtures (R10).** `apps/web/test/modal.test.tsx` — the four `title=…` strings updated; the suite
  stays green because they were always arbitrary.
- **Existing guards stay green.** `LOCATION_SURFACES`, `MAP_ROUTES`, `MAP_FRAME_HEIGHTS`, the
  `map-modal-header-row` class scans, the hero wiring/view-only tests and the `button-variants` scan
  all pass unchanged — none of them assert copy except the two being updated.
- **Not covered by tests.** No test can judge whether "rentals" is the right word; see §9.1. The spec's
  D10 deliberately adds no copy guard.

---

## 8. Out of scope (explicit, with the deferred pass required by D14)

Untouched, grouped by why:

**Kept on purpose for search (D12).** The spec records these as deliberate, so a later pass does not
"fix" them by mistake:

| File                                       | Copy                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| `components/home/FAQSection.tsx`           | "How do I find boarding houses near me?" and its answer                      |
| `components/layout/Footer.tsx`             | "Affordable boarding houses and rooms across the Philippines."               |
| `components/home/Testimonials.tsx`         | the AI-matching testimonial                                                  |
| `components/home/VisionCards.tsx`          | "Finding your perfect boarding house made effortless…"                       |
| `components/rooms/Hero.tsx`                | "Haven Space connects you with verified boarding houses near your location…" |
| `components/auth/AuthSplitLayout.tsx`      | "Verified boarding houses near you…" (asserted by `auth-layout.test.tsx`)    |
| `routes/index.tsx`, `routes/our-story.tsx` | platform/alt/body copy                                                       |

**Real property types or DB fields (D9).** Kept verbatim: the `boarding-house` value, the
"Boarding House" filter and dropdown labels, `boarding_house_name`, the admin column header, the
landlord onboarding placeholders, `/boarder/house-rules` copy.

**Neither, and open to a later pass (the D14 follow-up).** `FindARoomContent.tsx`'s search heading
("Discover verified boarding houses near your university with all the amenities you need") and its
results line ("Verified boarding houses near you.") are user-facing copy that now sits beside
"Find rentals near you" in the very next interaction. They were in scope-offer C in Round 1 and were
not taken. The spec flags them, plus the marketing list above, as a **candidate follow-up pass** rather
than silently changing them.

**Also out of scope:** any change to `MAP_LOCATION_QUERY` or the locale; any change to map behaviour,
layout or the `map-modal-header-row` row; any API/worker/DB/migration change; any dependency; updating
the earlier spec files (D13); any commit (D16).

---

## 9. Open questions / risks

1. **"Rentals" is a marketplace word, not a student word.** The audience is boarders hunting near
   campus; "dorms", "rooms" or "spaces" may read warmer, and the heading ("Find rentals near you") is
   the most prominent of the three strings. The word is one constant, so it is a one-line change if it
   does not land — which is part of why D7 put it in `lib/maps.ts`.
2. **The app now carries two vocabularies.** The map says "rentals"; the landing-page hero paragraph,
   the FAQ and the footer say "boarding houses". That is deliberate (D12) but visible: a visitor can
   read "verified boarding houses near your location" on `/` and "Find rentals near you" in the dialog
   one click later. §8's follow-up is the mitigation.
3. **The tracking line loses the noun.** `LOCATION_SUBTITLE` is now type-free _and_ place-free
   ("Showing what's around your location."), so it conveys less than before; the trade was paying
   landlord neutrality (D5). If it reads as too vague, the alternative is a second constant for the
   landlord surface.
4. **`RENTALS_NOUN` is a copy token in a module about map coordinates.** `lib/maps.ts` owns
   `MAP_LOCATION_QUERY`, which is also copy, so the placement is defensible — but a future `lib/copy.ts`
   is the cleaner home if more shared words appear. Named here so the choice is visible.
5. **The heading is now a template string.** `MAP_MODAL_TITLE` stops being a bare literal, so anything
   grepping the frozen text (docs, specs, `modal.test.tsx` fixtures) finds nothing. R9/R10 cover the
   tests; the earlier specs are knowingly left stale (D13).
6. **Earlier specs now state the old copy as current.** `find-a-room-map-modal-spec.md`,
   `hero-map-modal-spec.md`, `map-modal-header-row-spec.md`, `map-use-location-spec.md` and
   `public-maps-view-only-spec.md` all quote "Browse boarding houses around Malaybalay, Bukidnon."
   D13 keeps them as historical snapshots; a reader looking for today's copy should land on this file.
7. **No guard prevents the old noun returning.** D10 declined a scan because "boarding house" is still
   valid in the taxonomy, so the only protection is the two pinned assertions. A future edit could
   reintroduce "boarding houses" into a _new_ map string without failing anything.

---

## 10. Acceptance criteria

- [ ] The `/find-a-room` map dialog's heading reads **"Find rentals near you"**.
- [ ] Its default subtitle reads **"Browse rentals around Malaybalay, Bukidnon."**
- [ ] With a location active, the subtitle reads **"Showing what's around your location."**
- [ ] `/maps` shows the same subtitle pair through its `PageHeader`.
- [ ] `/landlord/maps` shows the neutral tracking line, and its own inactive subtitle is unchanged.
- [ ] The home hero's view-only dialog shows the same heading and subtitle as the `/find-a-room` dialog.
- [ ] The property-type filter still offers **Boarding House**; the landlord forms still use
      `boarding-house`; the admin table still shows the `boarding_house_name` column.
- [ ] No marketing copy, FAQ entry, footer line or `/find-a-room` search/results line changed.
- [ ] `apps/web/test/maps.test.ts` pins the new literals, `apps/web/test/modal.test.tsx`'s fixtures are
      updated, `bun run web:typecheck` is clean and `bun run web:test` is green.
- [ ] The earlier spec files are untouched and nothing is committed.

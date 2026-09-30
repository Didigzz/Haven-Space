# Spec — Auth Artwork Consistency + Malaybalay Map Locale

**Status:** **Not implemented** — spec only (written 2026-09-29). No code has been changed.
**Short name:** `auth-hero-map-locale`
**Date:** 2026-09-29
**Owner request (verbatim):**

> 1. THe http://localhost:3000/auth/choose-role has old picture of UI, unlike in the login in which is new,
> -- TO fix this apply the changes in the login ui picture same in the choose-role in both landlord and border
> 2. In the Map, make the Map point automatically in Malaybalay Bukidnon Mindanao

**Note on the referenced file:** the request pointed at `to-do-list.md`, which is **empty on disk**
(0 bytes, untracked — no history in git). The two items above are therefore taken from the message
itself. Per the interview, `to-do-list.md` is to be **left exactly as it is** (see D21).

---

## 1. Interview decisions (as answered by the requestor)

| #   | Topic | Decision |
| --- | ----- | -------- |
| D1 | What "old picture of UI" means | **Only the left-hand artwork panel** on `/auth/choose-role`. The form/role cards, headings and layout on that page are fine and stay untouched. |
| D2 | Which pages get the new artwork | `/auth/choose-role` **+ both signup pages** (`/auth/signup`, `/auth/signup/landlord`). ("both landlord and border" = the boarder signup and the landlord signup, plus the choose-role page whose two cards are Boarder/Landlord.) |
| D3 | `/auth/choose` | **Switch it too** — it explicitly passes `signup_lower_left.png` today, so it must be edited explicitly (the default change does not reach it). |
| D4 | Component default | **Change `AuthSplitLayout`'s default artwork** to the new `login_hero.webp`, so `forgot-password`, `reset-password` and `verify-email` inherit it with no edit of their own. |
| D5 | Caption overlay | **`caption={false}` everywhere** — the new hero has its own headline baked into the pixels, so no overlaid heading/subtitle. |
| D6 | Caption feature | **Remove it** — delete the `caption` prop and the gradient + "Find your haven, right next door." overlay block; it becomes unreachable once every caller is off it. |
| D7 | Hero alt text | **Reuse login's descriptive `imageAlt`** as the component default (the visible headline is in the artwork, so it is not decorative). |
| D8 | Old artwork files | **Delete** `login_right.png`, `signup_lower_left.png`, `signup_lower_right.png` once nothing references them. |
| D9 | Which map pages | **All four**: `/maps`, `/public-maps`, `/boarder/maps`, `/landlord/maps`. |
| D10 | Map behaviour | **Pin the place**, i.e. keep the place-search embed (`?q=…&output=embed`) rather than a bare centred viewport. |
| D11 | Pin wording | **`q=Malaybalay, Bukidnon`** (not "Malaybalay City…", not lat/long). |
| D12 | Zoom | **City level, `z=13`**, added explicitly to the URL. |
| D13 | Map page copy | **Follow the locale** — the headings/subtitles on those four pages should name Malaybalay, Bukidnon instead of implying nationwide coverage. |
| D14 | Where the location lives | **New module `apps/web/src/lib/maps.ts`** exporting the shared constant(s); all four routes import it. No inline URL strings. |
| D15 | Map iframe markup | **Strictly the URL only** — iframe `title`, `className` and attributes are left alone (including the different `h-[60vh]` / `h-[70vh]` shells). |
| D16 | Listing-detail map | **Out of scope** — `RoomDetailView`'s `MapEmbed` is OpenStreetMap centred on the listing's own coordinates; it must keep pointing at the listing. |
| D17 | Reach of the locale change | **Map viewport (+ copy) only.** Find-a-room popular-location chips, the home page and the Manila/Baguio/QC seed data are untouched. |
| D18 | `/auth/choose` vs `/auth/choose-role` duplication | **Leave both pages as they are**; consolidation is a separate decision, not this pass. |
| D19 | Verification | **`bun run web:typecheck` + existing `bun run web:test` must stay green, plus new unit test(s)** for the map URL constant and the auth-layout default. |
| D20 | Historical docs | **Leave `docs/superpowers/plans/2026-08-16-design-recovery.md` untouched** — it records the Aug design pass and still names the old PNGs; don't rewrite history. |
| D21 | Deliverables / git | **Changes stay uncommitted.** No commits, no `to-do-list.md` edits, no `report.md`/QA-doc edits. |
| D22 | Browser verification | Not required by the requestor (no preview walk selected). The crop/visual sanity check at both panel widths is therefore an **optional manual follow-up**, flagged in §9. |

---

## 2. Current state (verified 2026-09-29, tree at `7afeb19` + ~75 uncommitted files)

### 2.1 The auth layout

`apps/web/src/components/auth/AuthSplitLayout.tsx` (lines 5–58) is the single split-panel shell used
by **eight** auth routes. Its current contract:

```ts
export function AuthSplitLayout({
  title, subtitle,
  image = '/assets/images/public/login_right.png',  // ← old artwork
  imageAlt = '',
  caption = true,                                   // ← overlay caption on by default
  children, footer,
})
```

- Left panel: `relative hidden w-1/2 overflow-hidden bg-primary lg:block`, `<img … fetchPriority="high"
  className="absolute inset-0 h-full w-full object-cover object-[20%_50%]" />`. The in-file comment
  explains the `20%` object-position: it keeps the *baked-in* headline clear of the left edge when the
  panel is narrower than the artwork and `object-cover` crops horizontally.
- When `caption` is true it also renders `bg-gradient-to-t from-primary-dark/80 to-primary/20` plus an
  `<h2>` ("Find your haven,<br/>right next door.") and a `<p>` ("Verified boarding houses near you,
  managed by trusted landlords.").
- Right panel: logo link (`/assets/images/Haven_Space_Logo.png`), `<h1>{title}</h1>`, optional subtitle,
  `{children}`, optional `footer`. **Unchanged by this spec.**

### 2.2 Which page passes what

| Route file | Line | Image passed | Caption |
| ---------- | ---- | ------------ | ------- |
| `routes/auth/login.tsx` | 68–74 | **`/assets/images/public/login_hero.webp`** (+ `imageAlt` = the tagline sentence) | `caption={false}` |
| `routes/auth/signup/index.tsx` | 76–79 | `/assets/images/public/signup_lower_right.png` | default `true` |
| `routes/auth/signup/landlord.tsx` | 124–127 | `/assets/images/public/signup_lower_left.png` | default `true` |
| `routes/auth/choose.tsx` | 16–19 | `/assets/images/public/signup_lower_left.png` | default `true` |
| `routes/auth/choose-role.tsx` | 111 | *(none — falls back to `login_right.png`)* | default `true` |
| `routes/auth/forgot-password.tsx` | 61 | *(none)* | default `true` |
| `routes/auth/reset-password.tsx` | 61 | *(none)* | default `true` |
| `routes/auth/verify-email.tsx` | 47 | *(none)* | default `true` |

So `/auth/choose-role` is the page the user is describing: it is the only *role-choosing* page still on
the August artwork, and it also stacks the overlay caption on top of it.

### 2.3 The asset folder

`apps/web/public/assets/images/public/`:

| File | Size | Last modified | Referenced by (code) |
| ---- | ---- | ------------- | -------------------- |
| `login_hero.webp` | 138,992 B | 2026-09-22 | `routes/auth/login.tsx:71` |
| `login_right.png` | 350,482 B | 2026-08-16 | `AuthSplitLayout.tsx:8` (default) |
| `signup_lower_left.png` | 396,675 B | 2026-08-16 | `signup/landlord.tsx:127`, `choose.tsx:19` |
| `signup_lower_right.png` | 445,507 B | 2026-08-16 | `signup/index.tsx:79` |

The only other mentions of those three PNGs anywhere in the repo are in the **historical** plan doc
`docs/superpowers/plans/2026-08-16-design-recovery.md` (lines 485, 499, 736, 744, 758) — left alone per
D20. No test in `apps/web/test/` references them, so deleting them cannot break the suite.

### 2.4 The maps

Four route files each contain their own copy of the same hardcoded iframe:

```tsx
src="https://www.google.com/maps?q=boarding+house+Philippines&output=embed"
```

| File | Line | iframe `title` | iframe classes | Heading / subtitle copy |
| ---- | ---- | -------------- | -------------- | ----------------------- |
| `routes/maps.tsx` | 15 | `Haven Space map` | `h-[60vh] w-full rounded-lg border-0 shadow-card` | `PageHeader` "Explore the map" / "Browse boarding houses across the Philippines." |
| `routes/public-maps.tsx` | 12 | `Haven Space public map` | `h-[60vh] w-full rounded-lg border-0 shadow-card` | `PageHeader` "Public map" / "Discover boarding house locations near you." |
| `routes/boarder/maps.tsx` | 25 | `Haven Space map` | `h-[70vh] w-full rounded-xl border border-gray-200 shadow-card` | `<h2>` "Explore the map" / "Find boarding houses around you." |
| `routes/landlord/maps.tsx` | 20 | `Haven Space map` | `h-[70vh] w-full rounded-xl border border-gray-200 shadow-card` | `<h2>` "Property map view" / "See your properties on the map." |

`boarder/maps.tsx` and `landlord/maps.tsx` are wrapped in `<Protected role="…">` + `<RoleShell>`; the two
public pages use `PublicLayout`. The map is linked from `components/layout/Footer.tsx` ("Maps" →
`/maps`) and from `/find-a-room`.

**Not a map page for this change:** `apps/web/src/components/rooms/RoomDetailView.tsx:47–65` defines a
local `MapEmbed` that renders an OpenStreetMap `export/embed.html?bbox=…&marker=<listing lat,lng>` — it
is per-listing and stays exactly as it is (D16). With that caveat, those four routes are the whole
`google.com/maps` surface of the app (grep-verified).

Nothing in the app depends on the maps' location: no API call, no test, no route param
(`apps/web/test/` has no maps coverage).

---

## 3. Requirements

### 3.1 Auth artwork (issue 1)

- **R1.** `AuthSplitLayout`'s **default `image`** becomes `/assets/images/public/login_hero.webp`.
- **R2.** `AuthSplitLayout`'s **default `imageAlt`** becomes login's current string:
  `"Find your haven, right next door. Verified boarding houses near you, managed by trusted landlords."`
- **R3.** The `caption` prop and the whole caption branch (gradient overlay + `<h2>` + `<p>`) are
  **deleted** from `AuthSplitLayout`. The `<img>` renders `alt={imageAlt}` unconditionally.
- **R4.** The three explicit-artwork call sites stop passing their old PNG and inherit the default:
  - `routes/auth/signup/index.tsx` — remove `image="/assets/images/public/signup_lower_right.png"`
  - `routes/auth/signup/landlord.tsx` — remove `image="/assets/images/public/signup_lower_left.png"`
  - `routes/auth/choose.tsx` — remove `image="/assets/images/public/signup_lower_left.png"`
- **R5.** `routes/auth/login.tsx` drops its now-redundant `image=`, `imageAlt=` and `caption={false}`
  props (they are exactly the new defaults). This is cosmetic — behaviour must be byte-identical.
- **R6.** No caller may still pass `caption` (TypeScript must not compile if any does). The other three
  fallback pages (`forgot-password`, `reset-password`, `verify-email`) need **no edit**; they inherit
  R1–R3.
- **R7.** `routes/auth/choose-role.tsx` needs **no edit either** (it passes neither prop) — but it is the
  page the request named, so it is the **primary manual check target**.
- **R8.** Nothing else on `choose-role` changes: no typography, spacing, copy, heading, role-card or
  form edits (D1).

### 3.2 Map locale (issue 2)

- **R9.** New module `apps/web/src/lib/maps.ts` is the single source of truth. Minimum shape:

  ```ts
  /** Canonical map location (spec `auth-hero-map-locale`). */
  export const MAP_LOCATION_QUERY = 'Malaybalay, Bukidnon';
  /** City-level zoom for the embedded Google map. */
  export const DEFAULT_MAP_ZOOM = 13;
  /** Public Google Maps embed pinned on the canonical location. */
  export const DEFAULT_MAP_URL = `https://www.google.com/maps?q=${encodeURIComponent(
    MAP_LOCATION_QUERY
  )}&output=embed&z=${DEFAULT_MAP_ZOOM}`;
  ```

  Building the URL from the query constant (rather than hardcoding the finished string) is deliberate:
  it keeps the pin and the copy in §3.3 in sync and gives the test in R15 something exact to assert.

- **R10.** All four map routes import `DEFAULT_MAP_URL` from `../../lib/maps` and use it as the iframe
  `src`. The literal `boarding+house+Philippines` URL must not survive anywhere in `apps/web/src`.
- **R11.** The map pins the **place** `Malaybalay, Bukidnon` at **`z=13`** (D10–D12). It is not a bare
  centred viewport (`ll=`), not lat/long, and not "Malaybalay City".
- **R12.** The iframe elements themselves stay as they are: same `title` attributes, same
  `className` strings, no added `loading`/`referrerPolicy` (D15).
- **R13.** The four pages' **copy names the locale** instead of implying nationwide coverage (D13).
  Suggested strings (wording may be refined; the requirement is that each page names Malaybalay,
  Bukidnon):
  - `routes/maps.tsx` — `PageHeader title="Explore the map"`, subtitle
    `"Browse boarding houses around Malaybalay, Bukidnon."`
  - `routes/public-maps.tsx` — `PageHeader title="Public map"`, subtitle
    `"Discover boarding houses in Malaybalay, Bukidnon."`
  - `routes/boarder/maps.tsx` — `<h2>Explore the map</h2>` + `"Find boarding houses around
    Malaybalay, Bukidnon."`
  - `routes/landlord/maps.tsx` — `<h2>Property map view</h2>` + `"See your properties in and around
    Malaybalay, Bukidnon."`
  Where practical, derive the locale text from `MAP_LOCATION_QUERY` so copy and URL cannot drift.
- **R14.** No other page's location content changes (D17): `/find-a-room` chips and search, the home
  page, and the seeded Manila/Baguio/QC properties are untouched.

### 3.3 Cleanup

- **R15.** After R1–R5, delete `apps/web/public/assets/images/public/login_right.png`,
  `signup_lower_left.png` and `signup_lower_right.png` (D8). Confirm first that
  `grep -rn "login_right\|signup_lower_left\|signup_lower_right" apps/web/src apps/web/test` returns
  nothing.

---

## 4. Files to change

| # | File | Change |
| - | ---- | ------ |
| 1 | `apps/web/src/components/auth/AuthSplitLayout.tsx` | R1–R3 (new defaults, caption removed) |
| 2 | `apps/web/src/routes/auth/login.tsx` | R5 (drop redundant props) |
| 3 | `apps/web/src/routes/auth/signup/index.tsx` | R4 |
| 4 | `apps/web/src/routes/auth/signup/landlord.tsx` | R4 |
| 5 | `apps/web/src/routes/auth/choose.tsx` | R4 |
| 6 | `apps/web/src/lib/maps.ts` | **new** (R9) |
| 7 | `apps/web/src/routes/maps.tsx` | R10 + R13 |
| 8 | `apps/web/src/routes/public-maps.tsx` | R10 + R13 |
| 9 | `apps/web/src/routes/boarder/maps.tsx` | R10 + R13 |
| 10 | `apps/web/src/routes/landlord/maps.tsx` | R10 + R13 |
| 11 | `apps/web/public/assets/images/public/login_right.png` | **delete** (R15) |
| 12 | `apps/web/public/assets/images/public/signup_lower_left.png` | **delete** (R15) |
| 13 | `apps/web/public/assets/images/public/signup_lower_right.png` | **delete** (R15) |
| 14 | `apps/web/test/maps.test.ts` | **new** — map-constant + no-stale-URL test (R19) |
| 15 | `apps/web/test/auth-layout.test.tsx` | **new** — hero default + no-caption test (R18) |
| 16 | `apps/web/test/asset-refs.test.ts` | **new** — old PNGs gone and unreferenced (R20) |

`routes/auth/choose-role.tsx`, `forgot-password.tsx`, `reset-password.tsx` and `verify-email.tsx` are
**intentionally not edited** — they inherit the fix. No route file, migration, API route, repository,
`routeTree.gen.ts` or dependency changes are involved (no new routes, no new packages).

---

## 5. Exact resulting values

- Hero asset: `/assets/images/public/login_hero.webp`
- Hero alt: `Find your haven, right next door. Verified boarding houses near you, managed by trusted landlords.`
- `MAP_LOCATION_QUERY`: `Malaybalay, Bukidnon`
- `DEFAULT_MAP_ZOOM`: `13`
- `DEFAULT_MAP_URL`: `https://www.google.com/maps?q=Malaybalay%2C%20Bukidnon&output=embed&z=13`
  (the `q` value is `encodeURIComponent('Malaybalay, Bukidnon')`; the test should assert on the
  constants rather than the literal encoded string so encoding style can change without breaking it)

---

## 6. Edge cases

| Case | Expected behaviour |
| ---- | ------------------ |
| `/auth/choose-role` Google-failure states (`session.link`, expired session, `landlord-details` step) | All render inside the same shell; the left panel is identical in every state. No state-specific artwork. |
| `choose-role` on the Boarder card vs the Landlord card | Same page, same panel — "both landlord and boarder" is satisfied by one artwork, no per-role variant. |
| Narrow viewport (`< lg`) | The left panel is `hidden … lg:block`, so nothing changes below `lg`; no mobile regression possible. |
| Desktop crop | The hero's baked-in headline is protected by the existing `object-[20%_50%]` position + the in-file comment. Untestable by unit tests → optional manual check (§9). |
| `fetchPriority="high"` on the hero | Stays; it is part of the panel markup and unrelated to the caption removal. |
| `verify-email` / `forgot-password` / `reset-password` | Get the hero + tagline alt with zero edits. Their `alt` is now a sentence rather than `''` — a deliberate a11y improvement, not a regression. |
| Screen-reader duplication | The hero alt repeats the page's tagline; the panel is a visual, so this is acceptable and matches what login already ships. |
| Old PNG requested directly (bookmark, Google image cache) | 404s after deletion. Acceptable: no page, test or build references them. |
| Google embed in a blocked/consent region | Unchanged pre-existing behaviour (embed may show a consent interstitial); out of scope. |
| Google place resolution for `Malaybalay, Bukidnon` | Google's index resolves the city; "Bukidnon" only disambiguates the province. If the pin label ever reads oddly, changing `MAP_LOCATION_QUERY` in `lib/maps.ts` plus its copy is the single edit point. |
| Trailing `&z=13` on an embed URL | Supported by the classic `output=embed` maps URL; if Google ever ignores it, the pin is still on Malaybalay — degraded to default zoom, not broken. |
| SSR/prerender of the four map pages | The URL is a plain string constant; no browser API, so SSR output is unchanged apart from the new `src`. |
| `/maps` deep link with query params | No consumer passes params today; nothing to preserve. |

---

## 7. Test plan

Run (from repo root):

```bash
bun run web:typecheck
bun run web:test          # bun test --preload ./test/setup.ts
```

Follow the existing `apps/web/test` conventions: `bun:test` (`test`/`expect`), `node:fs`/`node:path`
with `import.meta.dir` for file assertions (as in `amenity-icons.test.ts`), `@testing-library/react` +
happy-dom (globally registered in `test/setup.ts`) for component renders.

- **R16.** `bun run web:typecheck` clean — this is also the enforcement for R6 (no caller may pass
  `caption`).
- **R17.** The existing suite (currently 13 files under `apps/web/test/`) still passes.
- **R18.** New `apps/web/test/auth-layout.test.tsx`:
  - renders `AuthSplitLayout` and asserts the `<img>` `src` is `/assets/images/public/login_hero.webp`
    (i.e. the default), and its `alt` is the tagline sentence;
  - asserts the caption headline text ("Find your haven") is **absent** — a regression test for the
    overlay coming back;
  - asserts the title/subtitle/children/footer still render (the right panel is untouched).
- **R19.** New `apps/web/test/maps.test.ts`:
  - `DEFAULT_MAP_URL` contains `output=embed`, contains the `encodeURIComponent(MAP_LOCATION_QUERY)`
    value (i.e. matches `Malaybalay`), and ends with `&z=13`;
  - `MAP_LOCATION_QUERY === 'Malaybalay, Bukidnon'`;
  - a source-scan test over `apps/web/src` asserting the old string
    `boarding+house+Philippines` appears in **zero** files, and that all four map route files import
    from `lib/maps` (mirrors the file-reading style of `amenity-icons.test.ts`).
- **R20.** New `apps/web/test/asset-refs.test.ts`:
  - the three old PNGs no longer exist on disk (`existsSync` false);
  - no file under `apps/web/src` mentions `login_right`, `signup_lower_left` or `signup_lower_right`;
  - `login_hero.webp` exists.
- **R21.** No browser/CDP walk is required (D22, D19 chose "typecheck + existing tests + new unit
  test(s)"). Optional but recommended if a human is available: open `/auth/choose-role`,
  `/auth/signup`, `/auth/signup/landlord`, `/auth/choose`, `/auth/login` and confirm the panel is
  identical on all five, then open the four map pages and confirm each lands on Malaybalay.

---

## 8. Out of scope (explicit)

- `RoomDetailView`'s per-listing OpenStreetMap `MapEmbed` (D16).
- Relocating the Manila/Baguio/Quezon City seed data, "popular locations" chips, `/find-a-room`
  search defaults, or any other nationwide copy (D17).
- Consolidating `/auth/choose` and `/auth/choose-role` into one role-chooser (D18). *(Carried forward
  from the QA report's §6 note: they are two different pages that both read as role pickers.)*
- `/onboarding`, `/onboarding/boarder`, `/onboarding/landlord` artwork (they do not use
  `AuthSplitLayout`).
- Redesigning the `AuthSplitLayout` right-hand form panel, the logo block, or `choose-role`'s role
  cards/typography (D1).
- Real data-driven Haven pins on the maps (the QA report's BUG-05 option A). This pass keeps a Google
  *place* embed, now scoped to the canonical locale.
- The remaining open QA findings — `BUG-03` (favicon 404), `BUG-04` (AI provider error body leaked),
  the dead refresh-token flow (`report.md` §10.6c), re-apply-after-rejection (§10.8),
  audit-log pagination (§10.10).
- Editing `to-do-list.md`, `report.md`, the QA specs, or
  `docs/superpowers/plans/2026-08-16-design-recovery.md` (D20, D21).
- Any commit (D21); migrations, API/worker code, DB, dependencies, deployment.

---

## 9. Open questions / risks

1. **Residual prop design (small).** After R3–R5, `image`/`imageAlt` still exist as props with the new
   values as defaults. Option A (recommended, spec'd): keep them so a future page can vary the art.
   Option B: hardcode the hero inside the component and drop both props entirely, since all eight auth
   pages now share one panel. Either satisfies R1–R3; pick one when implementing.
2. **Copy wording (R13).** The four suggested subtitles are proposals, not dictated text. They must name
   Malaybalay, Bukidnon; exact phrasing is free. Note the landlord page's "See your properties…"
   line now names a place its properties may not be in (seed data is elsewhere) — worth a glance at
   runtime copy quality.
3. **Crop check is manual.** The `object-[20%_50%]` position exists to keep the hero's baked-in
   headline readable when the panel crops. Unit tests cannot see pixels, and the requestor opted out
   of a browser walk; if the headline ever clips at a particular width, the fix is the object-position,
   tracked here rather than in tests.
4. **BUG-05 is only partly addressed.** The QA report logged "map pages show unrelated Google results,
   not Haven listings". After this change the map is still Google place results — just pinned on the
   canonical city rather than the whole country. If the intent was "show *our* inventory", that is
   the separate option-A work (data-driven markers from `/api/rooms/public`).
5. **Deletion is irreversible in the working tree** (the PNGs are tracked in git, so they are
   recoverable via `git show HEAD:…`, but there is no local backup). Confirm R15's grep is empty
   before deleting.

---

## 10. Acceptance criteria

- [ ] `/auth/choose-role`, `/auth/signup`, `/auth/signup/landlord`, `/auth/choose`, `/auth/login`,
      `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email` all render the same left
      panel: `login_hero.webp`, no overlay caption text, tagline `alt`.
- [ ] `AuthSplitLayout` no longer has a `caption` prop or overlay branch; no caller passes `caption`.
- [ ] `/maps`, `/public-maps`, `/boarder/maps`, `/landlord/maps` open pinned on `Malaybalay, Bukidnon`
      at `z=13`, sourced from `apps/web/src/lib/maps.ts`.
- [ ] The string `boarding+house+Philippines` appears nowhere under `apps/web/src`.
- [ ] The four map pages' copy names Malaybalay, Bukidnon.
- [ ] `login_right.png`, `signup_lower_left.png`, `signup_lower_right.png` are deleted and unreferenced.
- [ ] `bun run web:typecheck` clean; `bun run web:test` green including the three new test files.
- [ ] No API/worker/DB/schema/route/dependency change; working tree left uncommitted; `to-do-list.md`
      and the historical docs untouched.

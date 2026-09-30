# Spec — Pinned Artwork Panel & Pinned Shell Sidebar (page keeps scrolling)

**Status:** **Not implemented** — spec only (written 2026-09-29). No code has been changed.
**Short name:** `auth-shell-pinned-panels`
**Date:** 2026-09-29
**Owner request (verbatim):**

> fix in the http://localhost:3000/auth/signup/landlord, when landlord is selected the screen zoom and can be drag down and up, but the issue is I want the picture fix not be able to drag too, only the options can be scroll up and down, while the image is fix, apply this to others to others if it has the same problem

**Reading of the report (confirmed in the interview):** on `/auth/signup/landlord` the landlord form
is long enough that **the whole page scrolls as one surface**, so the artwork panel slides out of view
("the screen zoom and can be drag down and up"). The wanted behaviour is: **the picture stays put,
only the options/form side scrolls**. The same defect exists in the role shells, where the sidebar
carries `overflow-y-auto` that can never actually scroll because the sidebar is as tall as the page.

---

## 1. Interview decisions (as answered by the requestor)

| #   | Topic | Decision |
| --- | ----- | -------- |
| D1 | Symptom | **The whole page scrolls together** — scrolling the long form drags the artwork out of view. Not artwork stretching, not browser zoom, not rubber-banding. |
| D2 | Scope — auth | **Every page using `AuthSplitLayout`** (all 8 auth routes) gets the pinned artwork from one change. |
| D3 | Scope — shells | **Also pin the sidebar in the role shells** (`RoleShell` → boarder / landlord / admin / onboarding). |
| D4 | Scope — public pages | **Public pages stay as they are** (`PublicLayout` / `PublicNavbar` already use `sticky` where they need it). |
| D5 | Scroll model | **Sticky elements, page keeps its normal scrollbar.** Explicitly *not* a fixed-height app frame with an inner scrollbar. |
| D6 | Short forms | **Keep short pages centred** (login, verify-email): the options column stays vertically centred; it only scrolls when the content genuinely overflows. |
| D7 | Mobile input zoom | **Add the defensive 16px rule anyway** — the controls already inherit 16px, so this is insurance against a future `text-sm` utility, not a live fix. |
| D8 | Shell topbar | **Pin the sidebar only** — the topbar keeps scrolling away with the content, as it does today. |
| D9 | Shell scroll model | Same as auth (D5): sticky sidebar, page scroll. |
| D10 | Long sidebar navs | **The sidebar scrolls internally** — pinned to viewport height, with the nav area scrolling inside it so the logo/collapse header stays and every item stays reachable. |
| D11 | The shell's fade strip | **Remove it.** The `sticky top-[57px]` "fade under the floating topbar" only made sense with a sticky topbar; with D8 it is a stray smear. |
| D12 | Mobile sidebar (width/drawer) | **Out of scope** — the sidebar keeps rendering at 288px under `lg`, exactly as today. Combined with D9 this means **the shell pinning is `lg`-gated** (see D13). |
| D13 | Derived: breakpoint gating | Both pins apply **only at `lg` and up**, because that is the only place the auth artwork is visible at all (`hidden … lg:block`) and the only way to honour D12 for the shell. Below `lg` nothing changes anywhere. |
| D14 | Shared abstraction | **Applied per component** — put the utilities directly in each component's JSX with an explanatory comment; no shared class constant, no `<StickyPanel>` wrapper. |
| D15 | Scrollbar layout shift | **`scrollbar-gutter: stable` globally on the `html` element** in `styles/app.css`. |
| D16 | Auth header (logo/title) | **Let it scroll away** — only the artwork is pinned; the logo, heading and subtitle scroll with the form as today. |
| D17 | Verification | **`bun run web:typecheck` + the existing `bun run web:test` suite must stay green.** No new class-assertion tests, no browser measurement requested. |
| D18 | Deliverables | **Changes stay uncommitted**, consistent with the previous change. |

---

## 2. Current state (verified 2026-09-29)

### 2.1 Auth split layout — `apps/web/src/components/auth/AuthSplitLayout.tsx`

```tsx
<div className="flex min-h-screen">
  {/* Left image panel */}
  <div className="relative hidden w-1/2 overflow-hidden bg-primary lg:block">
    <img
      src={image}
      alt={imageAlt}
      fetchPriority="high"
      className="absolute inset-0 h-full w-full object-cover object-[20%_50%]"
    />
  </div>

  {/* Right form panel */}
  <div className="flex w-full items-center justify-center bg-cream px-4 py-10 lg:w-1/2">
    <div className="w-full max-w-md">
      <Link to="/">…logo…</Link>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
      {footer ? <div className="mt-6 border-t border-gray-100 pt-4 text-sm">{footer}</div> : null}
    </div>
  </div>
</div>
```

Why it scrolls together: the row is `min-h-screen` and **grows with the form**, the left panel is a
flex child of that row (so its height is the row's height), and the `<img>` is
`absolute inset-0 h-full` inside it. Nothing is sticky, so the browser scrolls the single page
surface and the artwork travels with it. The panel is *taller than the viewport* on long forms, so
`object-cover` also re-crops the art as the row grows.

Consumers (all 8 auth routes, none of them sets any scroll/height classes of its own):
`/auth/login`, `/auth/signup`, `/auth/signup/landlord`, `/auth/choose`, `/auth/choose-role`,
`/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`.

Longest content by far: `/auth/signup/landlord` (`routes/auth/signup/landlord.tsx`, ~316 lines —
first/last name, email, password ×2, business name, description, city/province, contact number,
agreement) and the `landlord-details` step of `/auth/choose-role`. Those are the pages that actually
overflow a 900px-tall desktop preview.

### 2.2 Role shell — `apps/web/src/components/layout/RoleShell.tsx`

```tsx
<div className="flex min-h-screen bg-cream">
  {nav.length > 0 && <Sidebar nav={nav} />}
  <div className="flex min-w-0 flex-1 flex-col">
    <Topbar title={title} />
    {/* soft scroll-edge fade under the floating topbar */}
    <div className="pointer-events-none sticky top-[57px] z-20 h-4 bg-gradient-to-b from-black/[0.04] to-transparent" />
    <main className="flex-1 px-6 pb-10 pt-2">…</main>
  </div>
</div>
```

`Sidebar` (`apps/web/src/components/layout/Sidebar.tsx`, only consumed by `RoleShell`):

```tsx
<aside className={`flex shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] ${
  collapsed ? 'w-20' : 'w-72'
}`}>
  <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">…logo, collapse toggle…</div>
  <nav className="flex-1 overflow-y-auto py-4">…groups…</nav>
</aside>
```

The `nav`'s `overflow-y-auto` is dead: the `aside` is a flex child of a `min-h-screen` row that grows
with the page, so the `nav` never becomes shorter than its content — the whole sidebar scrolls away
with the page instead. `Topbar` is a plain non-sticky `<header>`, and the fade's `top-[57px]` is a
hardcoded guess at the topbar's height.

`RoleShell` is used by ~35 routes: all of `/boarder/**` and `/landlord/**`, the admin page,
`/onboarding/boarder`, `/onboarding/landlord`, `/landlord/onboarding`.

### 2.3 Existing sticky precedent in the codebase

The app already uses this same "page scrolls, element sticks" model elsewhere, so D5/D9 is
consistent with house style: `PublicNavbar` (`sticky top-0 z-40 … backdrop-blur`),
`FindARoomContent`'s filter bar (`sticky top-0 z-40`), `RoomDetailView`'s and
`boarder/find-a-room/$id/apply`'s `lg:sticky lg:top-6` asides, `FAQSection`'s `lg:sticky lg:top-8`,
and `routes/haven-ai.tsx` (which already owns a `h-screen` + `overflow-y-auto` chat frame).
`admin/index.tsx` has three `sticky bottom-4` bulk-action bars inside its `RoleShell` — they live in
the normal page flow and are unaffected by pinning the sidebar.

### 2.4 Scroll / sizing facts that matter

| Item | State |
| ---- | ----- |
| Viewport meta | `width=device-width, initial-scale=1` (`routes/__root.tsx`) — no `maximum-scale`, so pinch-zoom is user-controlled and must stay that way. |
| Body / html rules | `styles/app.css` styles `body` (font, background, colour) only — **no `overflow`, no height, no scrollbar rules anywhere**. Nothing between the sticky candidates and the scroll root sets `overflow`, so `position: sticky` will work (see R6). |
| Form control size | `Field.tsx`'s shared `inputClasses` has no font-size utility → inputs/selects/textareas inherit the 16px root default. That is already the size that prevents mobile zoom-on-focus. |
| Tests touching these components | None. `apps/web/test/auth-layout.test.tsx` asserts the hero `src`/`alt` and the absence of the retired caption only — it does not assert layout classes, so it is unaffected by this change. No test references `RoleShell`, `Sidebar` or the fade. |

---

## 3. Requirements

### 3.1 Auth artwork stays put (issue 1)

- **R1.** In `AuthSplitLayout`, the left panel becomes viewport-pinned from `lg` up:

  | | classes |
  | - | ------- |
  | before | `relative hidden w-1/2 overflow-hidden bg-primary lg:block` |
  | after | `relative hidden w-1/2 overflow-hidden bg-primary lg:sticky lg:top-0 lg:block lg:h-screen` |

- **R2.** The row (`flex min-h-screen`) and the options column
  (`flex w-full items-center justify-center bg-cream px-4 py-10 lg:w-1/2`) are **unchanged**. The page
  keeps the browser's own scrollbar (D5) and short forms stay vertically centred (D6) — no inner
  `overflow-y-auto` column is introduced, so the classic "`items-center` + overflow clips the top of
  tall content" trap never arises.
- **R3.** Below `lg` nothing changes: the panel stays `hidden` and the form scrolls as it does today
  (D13).
- **R4.** The `<img>` keeps `absolute inset-0 h-full w-full object-cover object-[20%_50%]` and
  `fetchPriority="high"` — it now fills a viewport-height panel instead of an ever-growing one, which
  also stops the art re-cropping mid-scroll.
- **R5.** A short code comment records the contract: the panel is pinned so the artwork can't be
  scrolled away, and it must stay `lg:`-gated while the artwork is `lg`-only.

### 3.2 Shell sidebar stays put (issue 1, "others with the same problem")

- **R6.** In `Sidebar`, the `aside` gains viewport pinning at `lg`:
  - before: `flex shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] …`
  - after: `flex shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] lg:sticky lg:top-0 lg:h-screen …`
  With `lg:h-screen` the existing `flex-1 overflow-y-auto` on the `nav` finally does its job: the
  logo/collapse header stays fixed and a long nav (landlord/admin have 14+ items) scrolls inside the
  sidebar (D10). No extra `overflow` rule is needed on the `aside` itself.
- **R7.** `RoleShell` **deletes the fade div** (`pointer-events-none sticky top-[57px] z-20 h-4 …`)
  and its comment (D11). Nothing else in the shell changes: `Topbar` stays non-sticky (D8), so it
  scrolls away with the content; `main` keeps its padding and becomes the scrolling content.
- **R8.** The pinning is `lg`-gated (D13), so the sub-`lg` sidebar keeps today's behaviour —
  full 288px width in the page flow, page scroll, no internal nav scroll (D12).
- **R9.** Because the sticky element is the sidebar and the page is still the scroll container, both
  the shell's `min-h-screen` row and the auth row must keep having **no `overflow` value** on
  themselves or on any ancestor. Implementation must check this holds (it does today, §2.4) and leave
  a comment saying so, since a future `overflow-hidden` wrapper would silently kill the pinning.

### 3.3 Global scrollbar gutter

- **R10.** Add to `apps/web/src/styles/app.css` (next to the existing `:root` / `body` rules):

  ```css
  html {
    /* Reserve the scrollbar track so pinning the panel doesn't shift content sideways
       when a long form starts scrolling. */
    scrollbar-gutter: stable;
  }
  ```

  This is app-wide by decision (D15), so pages that never scroll now also reserve the gutter —
  accepted. It is a progressive enhancement: browsers without support simply keep today's behaviour.

### 3.4 Mobile form-control size (defensive)

- **R11.** Add `text-base` to `Field.tsx`'s shared `inputClasses` string so inputs, selects and
  textareas are explicitly 16px. `PasswordInput`/`SelectInput`/`TextArea` all reuse that constant, so
  one edit covers every form control. Today this changes nothing visually (they already inherit 16px);
  it prevents a future `text-sm` utility from re-introducing zoom-on-focus (D7).

---

## 4. Files to change

| # | File | Change |
| - | ---- | ------ |
| 1 | `apps/web/src/components/auth/AuthSplitLayout.tsx` | R1, R5 — pin the left panel at `lg` |
| 2 | `apps/web/src/components/layout/Sidebar.tsx` | R6 — pin the `aside` at `lg` |
| 3 | `apps/web/src/components/layout/RoleShell.tsx` | R7 — remove the fade div + its comment |
| 4 | `apps/web/src/styles/app.css` | R10 — global `scrollbar-gutter: stable` |
| 5 | `apps/web/src/components/ui/Field.tsx` | R11 — `text-base` in `inputClasses` |

No route file, test file, API/worker file, migration or dependency changes. No new shared module or
component (D14). `routeTree.gen.ts` untouched.

---

## 5. Resulting markup (exact)

```tsx
// AuthSplitLayout — left panel
<div className="relative hidden w-1/2 overflow-hidden bg-primary lg:sticky lg:top-0 lg:block lg:h-screen">
  <img … className="absolute inset-0 h-full w-full object-cover object-[20%_50%]" />
</div>

// Sidebar — aside
<aside
  className={`flex shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] lg:sticky lg:top-0 lg:h-screen ${
    collapsed ? 'w-20' : 'w-72'
  }`}
>

// RoleShell — the fade div is deleted; the shell keeps:
<div className="flex min-h-screen bg-cream"> … <Topbar/> <main>…</main> </div>

// app.css
html {
  scrollbar-gutter: stable;
}

// Field.tsx
const inputClasses =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-primary focus:outline-none';
```

*(the `inputClasses` line above is illustrative of the added `text-base`; keep the existing utilities
otherwise unchanged.)*

---

## 6. Edge cases

| Case | Expected behaviour |
| ---- | ------------------ |
| `/auth/signup/landlord` scrolled to the bottom | Artwork stays put at the top of the viewport; only the fields move. |
| Short auth pages (`/auth/login`, `/auth/verify-email`, `/auth/forgot-password`) | Row is exactly one viewport tall, no page scrollbar, form stays vertically centred (D6, R2). |
| Artwork visibility | The panel is a full viewport tall, so `object-cover` no longer re-crops it as the form grows — the composition is stable during scroll. |
| Very short viewport (laptop, ~600px) | The panel is 600px tall and the form scrolls; nothing clips. |
| Tablet / small laptop (< 1024px) | Panel hidden, shell sidebar unpinned — byte-identical to today (R3, R8). |
| Long landlord/admin sidebar navs | Items scroll inside the pinned sidebar; the logo + collapse toggle stay visible (R6). |
| Sidebar collapse toggle while pinned | `transition-[width]` still animates; the pinned `aside` changes width without affecting the pin. |
| Admin bulk-action bars (`sticky bottom-4` in `admin/index.tsx`) | Unaffected — they live in `main`'s flow, which is still the page scroll (no new scroll container). |
| Keyboard focus on an off-screen field | The browser scrolls the page to reveal it; the artwork stays pinned. No custom scroll/`scrollIntoView` logic needed. |
| Screen reader / focus order | Unchanged: same DOM order (artwork, then options), pure CSS positioning, no JS and no hydration risk. |
| Browser without `scrollbar-gutter` support | Ignored gracefully — the page works, just without reserve. |
| Pinch-zoom on mobile | Untouched — the viewport meta is not modified and no `maximum-scale` is added (R11 only pins the control font-size). |
| A future `overflow-hidden` ancestor | Would break `position: sticky`. That is why R5/R9 add the explanatory comments; if it ever happens the symptom is "the panel scrolls again", not a crash. |
| The deleted fade | Nothing else references it (verified: no component or test imports/depends on that element); no other file changes needed. |
| `/haven-ai` | Already a `h-screen` + inner-scroll chat frame of its own; not a `RoleShell` consumer, untouched. |

---

## 7. Verification

Per D17 — no new tests, no browser measurement requested:

```bash
bun run web:typecheck   # must be clean
bun run web:test        # existing suite must stay green (last run: 15 files / 81 pass)
```

Rationale recorded in the spec: `position: sticky` cannot be meaningfully asserted from happy-dom
(there is no layout engine), and no existing test renders `AuthSplitLayout`'s or `Sidebar`'s classes,
so the guarantee here is a visual one. If a human is available, the 30-second manual check is:

1. Open `/auth/signup/landlord` (1440×900), scroll to the bottom → the artwork must not move.
2. Open `/landlord` (or any `/landlord/**` page) and scroll → the sidebar must not move, and the
   topbar must scroll away as it does today.
3. Shrink the window below 1024px → the previous behaviour returns exactly (no artwork, plain
   scrolling shell).

**Not verified by this spec:** real-browser scroll physics (momentum, rubber-banding), Safari
`scrollbar-gutter` support, and the desktop crop of the hero after the panel becomes
viewport-height (the `object-[20%_50%]` composition should now be *more* stable, not less).

---

## 8. Out of scope (explicit)

- The mobile sidebar's width/drawer problem (288px rail at every width, no drawer) — D12.
- Making the shell `Topbar` sticky, and the "floating topbar" behaviour the deleted fade assumed — D8/D11.
- Converting any layout into a fixed app frame with an inner scrollbar — D5/D9.
- Public pages, `PublicNavbar`/`PublicLayout`, `/haven-ai`'s own frame — D4.
- The auth logo/heading/subtitle (they keep scrolling away) — D16.
- A shared sticky class constant or `<StickyPanel>` component — D14.
- Any viewport-meta or pinch-zoom change — R11 is font-size only.
- New tests for the layout classes, and any browser/CDP verification — D17.
- Committing the work (D18), and any API/worker/DB/dependency change.

---

## 9. Open questions / risks

1. **`lg`-gating the shell pin is a derived decision** (D12 + D13): the requestor asked to leave the
   mobile sidebar alone, and an ungated `sticky h-screen` would have changed mobile too. If they'd
   rather have the sidebar pinned at every width, drop the `lg:` prefix in R6 — at the cost of the
   mobile sidebar becoming its own scroll region.
2. **`scrollbar-gutter: stable` is global** (D15): it applies to public pages as well, so a page that
   never scrolls now reserves ~15px of gutter. Reversible in one line if it looks off anywhere.
3. **`top-[57px]` was a hardcoded guess at the topbar's height.** The fade is being deleted rather
   than fixed, which is why no topbar-height variable is introduced — if a sticky topbar is ever
   wanted, the fade (and the height source) should come back with it.
4. **The pinning now depends on no ancestor introducing `overflow`.** Nothing does today; the
   comments added by R5/R9 are the only guard. A CSS-level regression test is impossible without a
   real browser.
5. **`transition-[width]` on a sticky element** is fine in current browsers, but the collapse animation
   while scrolled is only verified by eye (D17).
6. **Success is judged on `/auth/signup/landlord` and a `/landlord/**` page**, since those are the two
   surfaces the report described; other long auth pages (choose-role's landlord step) inherit the same
   component behaviour.

---

## 10. Acceptance criteria

- [ ] On `/auth/signup/landlord` (≥1024px wide) scrolling the form leaves the artwork fixed in place.
- [ ] Short auth pages still show a vertically centred form with no scrollbar and no visual change.
- [ ] Under 1024px, auth pages and shells behave exactly as they did before this change.
- [ ] On any `/boarder/**`, `/landlord/**`, `/admin` or `/onboarding/*` page the sidebar stays put
      while the content scrolls; long nav lists scroll inside the sidebar; the topbar still scrolls away.
- [ ] The `sticky top-[57px]` fade strip is gone and nothing else changed in `RoleShell`.
- [ ] `html { scrollbar-gutter: stable }` is in `styles/app.css`.
- [ ] Form controls carry an explicit `text-base`.
- [ ] `bun run web:typecheck` clean and `bun run web:test` green; working tree left uncommitted.

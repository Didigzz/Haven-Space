# Spec — Landlord Surface Restructure (apple-design)

**Status:** **Not implemented** — spec only (written 2026-09-29). No code has been changed.
**Short name:** `landlord-apple-ui-restructure`
**Date:** 2026-09-29
**Owner request (verbatim):**

> apple-design, I want restructure the whole land lord pages for better UI

**Reading of the request (confirmed across four interview rounds):** the landlord surface
(`apps/web/src/routes/landlord/**`, 22 route files, ~2,500 lines) works but has no coherent visual
language. It is the *only* part of the app that still uses flat bordered `Card`s, it names every
page twice, it swaps three different primary-button styles and three different "coming soon"
layouts, and two pages drop the whole sidebar while they load. This change restructures **how those
pages are laid out and presented** using the `apple-design` skill (loaded and used as the design
rubric — restraint, hierarchy, materials and depth, press feedback, reduced motion) **without
touching routes, nav, data, or copy.**

---

## 1. Interview decisions (as answered by the requestor)

### Round 1 — scope and fidelity

| #   | Topic | Decision |
| --- | ----- | -------- |
| D1  | Depth of "restructure" | **Visual + layout only.** Same routes, same nav, same data, same copy. Rework spacing, typography, cards, tables, headers and empty/loading states so the pages look deliberate. **No information-architecture changes** — merging the duplicate Listings/Properties pages and pruning dead nav items are **not** part of this. |
| D2  | Apple-design fidelity | **Full Apple treatment.** Restraint + typography *plus* motion polish *plus* chrome as translucent material: blurred topbar/sidebar with content scrolling underneath, scroll-edge fading instead of hard dividers, spring-driven floating panels. |
| D3  | Dark mode | **Stay light-only now** (`color-scheme: light` stays pinned), but **record dark mode as an explicit follow-up** in §8/§9 so it is a planned step, not an oversight. |
| D4  | Page coverage | **All 22 landlord route files** — including the long forms (`listings/create`, `listings/$id/edit`, `listings/rooms/$id/edit`), `verification` and `onboarding`. |

### Round 2 — boundaries created by round 1

| #   | Topic | Decision |
| --- | ----- | -------- |
| D5  | Topbar chrome | **Pin it as a translucent material — this deliberately reverses D8 of `auth-shell-pinned-panels-spec.md`**, which made the topbar scroll away. Content now scrolls underneath a blurred bar. |
| D6  | Shell reach | **Apply the shell changes app-wide.** `RoleShell` / `Topbar` / `Sidebar` are shared by landlord, boarder, admin and onboarding; the change lands everywhere rather than forking a landlord-only variant. |
| D7  | Duplicate page title | **Keep the in-body page heading, de-title the topbar.** The topbar stops printing the page name; identity/materials move there instead (see D10). |
| D8  | Loader flash | **Fix it in this change**, for `applications.tsx` and `settings.tsx` only (not a 22-file state-flow refactor). |
| D9  | Placeholder pages | **Unify the placeholder layout only.** One shared "not built yet" layout (icon, title, honest copy, next-step link) replaces the four hand-rolled variants. **Copy is unchanged** and `nav.ts` is untouched. |

### Round 3 — interaction and surface language

| #   | Topic | Decision |
| --- | ----- | -------- |
| D10 | What fills the topbar | **A breadcrumb trail derived from the route** (e.g. `Properties / Oak Street Boarding House / Edit listing`). No page title in the bar. |
| D11 | Destructive actions | **Wire the existing `ConfirmDialog` into "Remove boarder" and "Delete announcement."** Everything non-destructive stays one click. |
| D12 | Responsive lists | **Tables everywhere.** Landlord administration is a desktop workflow; no card fallback on mobile — just cleaner overflow, column behaviour and row rhythm. |
| D13 | New components | **Extend `components/ui/*` only.** Reuse and extend the existing primitives; **no new files under `components/landlord/`** (which today holds only `VerificationNotice.tsx`). |
| D14 | Card material | **Opaque cards, softer radius + soft elevation shadow.** Translucent material is reserved for chrome (topbar, sidebar) and floating layers (modal, menus, toasts) — the skill's own rule ("never stack a light translucent surface on another"). |

### Round 4 — rhythm, motion and verification

| #   | Topic | Decision |
| --- | ----- | -------- |
| D15 | Density | **Airier throughout.** More generous padding, taller rows, bigger gaps between sections — the workspace breathes even though rows-per-screen drops. |
| D16 | Topbar pin gate | **`lg` and up only**, mirroring the `lg`-gated sidebar pin shipped in `auth-shell-pinned-panels`. Below `lg` nothing changes. |
| D17 | Motion budget | **Polish existing motion + press feedback.** Upgrade what already animates (modal, menus, toasts) to proper springs, and give every actionable element instant press feedback. **Nothing new moves** — no page-entrance choreography, no scroll-driven reveals. |
| D18 | Boarder / admin topbar | **All roles get breadcrumbs.** Every role shell loses its topbar title in favour of breadcrumbs, so boarder and admin pages change too (they share the component — see D6). |
| D19 | Verification | **`bun run web:typecheck` + `bun run web:test` + a production build with the emitted CSS grepped** to confirm the new utilities (translucency, sticky, shadows) actually compile. |

### Derived decisions

| #   | Topic | Decision |
| --- | ----- | -------- |
| D20 | Commit policy | **Changes stay uncommitted**, consistent with the two previous changes. |
| D21 | Reduced motion | The new translucent chrome and every upgraded animation must honour **`prefers-reduced-motion: reduce`** (cross-fade instead of slide/spring) and **`prefers-reduced-transparency: reduce`** (opaque chrome, no blur). Non-negotiable consequence of D2 + D17; the existing keyframes in `app.css` already set this precedent. |
| D22 | `title` prop removal | `Topbar` is rendered in **exactly one file** (`RoleShell.tsx`) but `RoleShell` takes `title` at **32 call sites** (16 of them landlord). Since the bar no longer shows a title and breadcrumbs are route-derived (D10/D18), the `title` prop becomes dead at all 32 sites and must be removed from the component and every caller. |
| D23 | No new dependency | `framer-motion@^13.1.0` is already a dependency and already used by `Modal`, `RestrictionBanner` and friends, so D2/D17 need no `package.json` change. |
| D24 | Palette unchanged | The green/cream token set in `@theme` stays. This is a restructure of structure, space, hierarchy and motion — **not a rebrand** and not a colour change. |
| D25 | Where the scroll edge lives | The scroll-edge fade must live **inside** the sticky topbar as an absolutely-positioned child (`top-full`), so it needs no hardcoded offset. `auth-shell-pinned-panels` D11 deleted a fade strip precisely because its `top-[57px]` was a hand-guessed topbar height; that guess must not come back. |
| D26 | Alignment of shell chrome | The sidebar header is `h-16` (64px) and the topbar is `~57px` (`px-6 py-3` around a `text-lg` heading). Under "airier + craft" (D15/D2) the topbar gets a fixed `h-16` so the two horizontal rules meet. |

---

## 2. Current state (verified 2026-09-29)

### 2.1 Surface inventory — 22 route files

| File | Lines | Shell source |
| ---- | ----- | ------------ |
| `landlord/index.tsx` (dashboard) | 164 | own `RoleShell` |
| `landlord/listings.tsx` | 14 | own `RoleShell` + `<Outlet/>` (layout) |
| `landlord/listings/index.tsx` | 95 | **inherited** from `listings.tsx` |
| `landlord/listings/create.tsx` | 277 | **inherited** |
| `landlord/listings/$id/edit.tsx` | 442 | **inherited** |
| `landlord/listings/rooms/$id/edit.tsx` | 313 | **inherited** |
| `landlord/properties.tsx` | 110 | own `RoleShell` |
| `landlord/applications.tsx` | 121 | own — **but flashy** (see 2.4) |
| `landlord/boarders.tsx` | 369 | own `RoleShell` |
| `landlord/invitations.tsx` | 189 | own `RoleShell` |
| `landlord/announcements.tsx` | 261 | own `RoleShell` |
| `landlord/verification.tsx` | 299 | own `RoleShell` |
| `landlord/onboarding.tsx` | 139 | own `RoleShell` |
| `landlord/settings.tsx` | 241 | own — **but flashy** (see 2.4) |
| `landlord/calendar.tsx` | 28 | own `RoleShell` |
| `landlord/activity.tsx` | 27 | own `RoleShell` |
| `landlord/messages.tsx` | 26 | own `RoleShell` |
| `landlord/pricing.tsx` | 30 | own `RoleShell` |
| `landlord/payments.tsx` | 14 | own `RoleShell` + `<Outlet/>` |
| `landlord/payments/index.tsx` | 21 | **inherited** |
| `landlord/payments/record.tsx` | 21 | **inherited** |
| `landlord/maps.tsx` | 29 | own `RoleShell` |

Shared components consumed by the surface: `components/layout/{RoleShell,Topbar,Sidebar}.tsx`,
`components/shared/RestrictionBanner.tsx`, `components/landlord/VerificationNotice.tsx`,
`components/rooms/LandlordRoomList.tsx`, and `components/ui/{Card,DataTable,Modal,Button,Field,Icon,
PageHeader,EmptyState,ErrorState,Spinner,StatusBadge,Toast,ConfirmDialog}`.

### 2.2 Shell and chrome

```
RoleShell.tsx
<div className="flex min-h-screen bg-cream">
  {nav.length > 0 && <Sidebar nav={nav} />}
  <div className="flex min-w-0 flex-1 flex-col">
    <Topbar title={title} />
    <main className="flex-1 px-6 pb-10 pt-2">
      <div className="mx-auto max-w-[1200px]">  <RestrictionBanner/> {children}
```

* `Topbar.tsx` — `header.flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3`
  with `<h1 className="text-lg font-bold text-ink">{title}</h1>` + `NotificationBell` + `UserMenu`.
  **Not sticky** (the explicit D8 of the previous spec). **Rendered in only one file** (`RoleShell.tsx`),
  so it is *not* directly per-page — `RoleShell`'s `title` prop is the real coupling point at 32 sites.
* `Sidebar.tsx` — `aside` is `lg:sticky lg:top-0 lg:h-screen` (shipped last change), `border-r
  border-gray-200 bg-white`, `h-16` brand header with the logo + collapse toggle, groups from
  `NavItem.group`, items `rounded-lg px-3 py-2 text-sm`, active = `bg-mint font-semibold text-primary`,
  group labels `text-[11px] font-semibold uppercase tracking-wider text-muted`.
* `RestrictionBanner` already uses a `motion.div` fade-in and an amber `rounded-2xl shadow-sm` surface.
* The topbar (`~57px`) and the sidebar header (`h-16` = 64px) do not align.
* Precedent for translucent sticky chrome already exists: `PublicNavbar` is
  `sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur`, and the modal backdrop is
  `bg-black/20 backdrop-blur-md`.

### 2.3 Every page names itself twice

`Topbar` prints `<h1>{title}</h1>`, and then the page body prints a **second** heading using a
copy-pasted block:

```tsx
<div className="mb-5 flex items-center gap-3">
  <Icon name="…" size={28} />
  <div>
    <h2 className="text-2xl font-bold text-ink">My properties</h2>
    <p className="text-sm text-gray-ink">All the properties you manage.</p>
  </div>
</div>
```

`text-2xl font-bold` appears **15 times** across the landlord routes. `components/ui/PageHeader.tsx`
already encodes exactly this idea (`mb-6 flex items-start justify-between`, `h1 text-2xl font-bold`,
subtitle in `text-gray-ink`, `actions` slot) but is used by **only** `routes/maps.tsx` and
`routes/public-maps.tsx` — no landlord page uses it. The placeholder pages drift further
(`h1 text-xl font-bold` in `calendar.tsx`/`activity.tsx`/`pricing.tsx` vs `h2 text-2xl font-bold`
elsewhere).

### 2.4 Two pages lose the whole shell while loading

```tsx
// applications.tsx:54-58
if (applications.isLoading) return <Spinner />;
if (applications.error) return <ErrorState message={applications.error.message} />;
if (!applications.data || applications.data.data.length === 0) {
  return <EmptyState title="No applications" description="Boarder applications appear here." />;
}
// settings.tsx:122
if (profile.isLoading) return <Spinner />;
```

All of these return **before** `RoleShell` is mounted, so the sidebar and topbar disappear and then
pop back in. `listings/index.tsx` has the same early returns but is nested under `listings.tsx`'s
`RoleShell`, so its shell persists — that is the correct in-repo precedent.

### 2.5 The landlord surface uses a different card language than the rest of the app

```tsx
// components/ui/Card.tsx — flat, border-only, no shadow
<div className="rounded-lg border border-gray-200 bg-white p-4">
```

Meanwhile the rest of the app standardised on `rounded-2xl bg-white p-5 shadow-card` /
`hover:shadow-pop` — `RoomDetailView` (10 sections), `FindARoomContent`, `RoomCard`,
`boarder/find-a-room/$id/{apply,tour}`, `boarder/announcements`, `for-landlords`, `teams`,
`our-story`, `Testimonials`, `UserMenu`, `Toast`, and the already-glassy `Modal`
(`bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl`). The `--shadow-card` and `--shadow-pop`
tokens are defined in `@theme` and used heavily by those files — **but by no landlord page**.
This is the single clearest "landlord pages look like a different app" signal.

### 2.6 Action affordances are inconsistent within the surface

* **Three primary-action styles**: inline `rounded-full bg-primary px-5 py-2` links
  (`index.tsx` ×2, `listings/index.tsx`), the `Button` primitive (`applications`, `announcements`,
  `boarders`, `LandlordRoomList`), and inline `rounded-full border-2 border-primary … hover:bg-mint`
  outline links (dashboard's three "Manage"/"Review" cards).
* **`Button` is used but its variants are bypassed**: `applications.tsx` does
  `<Button className="px-2 py-1 text-xs">` (bypassing the `sm|md` size scale) and
  `<Button className="bg-red-600 px-2 py-1 text-xs hover:bg-red-700">` even though a `danger` variant
  exists.
* **Destructive actions are bare underlined words**: `boarders.tsx` (`Approve`/`Decline`/`Edit`/`Remove`)
  and `announcements.tsx` (`Edit`/`Delete`) are `<button className="text-sm text-primary hover:underline">`
  / `text-red-600` — ~20px tall, no press state, no hit padding.
* **`boarders.tsx` Remove and `announcements.tsx` Delete fire immediately** with no confirmation,
  while `LandlordRoomList` and `admin/PropertyAccessTab` already use `ConfirmDialog` — so the app has
  the right pattern, applied unevenly.
* **Hand-rolled status pills** sit next to `StatusBadge`: `properties.tsx`'s `AccessBadge`
  (`bg-blue-100 text-blue-700` / `bg-mint text-primary-dark`) and `announcements.tsx`'s
  `High priority` pill (`bg-red-100 text-red-700`).

### 2.7 The five placeholders are four different layouts

`calendar.tsx` and `activity.tsx` are byte-similar (`Card mx-auto max-w-2xl` + `Icon size={28}` +
`h1 text-xl font-bold` + two `<p className="text-sm text-gray-ink">` sentences). `pricing.tsx` adds
an extra `h2`. `messages.tsx` uses the icon+`h2` header **plus** an `EmptyState`.
`payments/index.tsx` and `payments/record.tsx` use the icon+`h2` header **plus** their own
`EmptyState`. So five pages, four shapes, three different heading levels.

### 2.8 Motion and token vocabulary that already exists (nothing new is needed)

| Piece | Where | Notes |
| ----- | ----- | ----- |
| `menu-pop` | `app.css` → `UserMenu` | 160ms ease-out, `transform-origin: top right` |
| `modal-fade` / `modal-pop` | `app.css` → `components/ai/LoginPromptOverlay` | 180/200ms ease-out |
| `toast-in` | `app.css` → `Toast` | 200ms ease-out, `translateX(16px)` |
| `logo-marquee` | `app.css` | 30s linear |
| Reduced-motion overrides | `app.css` | one guard per keyframe (`animation: none`) — the house pattern to follow |
| `framer-motion` springs | `Modal` (`type:'spring', bounce:0, duration:0.4`), `RestrictionBanner` | the only spring usage today |
| `Button` press feedback | `active:scale-[0.97] transition-all duration-100 ease-out` | already correct per skill §1 |
| `shadow-card` / `shadow-pop` | `@theme` tokens, used app-wide **except** landlord | the ready-made elevation scale |
| `scrollbar-gutter: stable` | `app.css` on `html` | shipped last change |
| Hover-transform gating | `app.css` | transform hovers suppressed on coarse pointers |

### 2.9 What is *not* broken (and must stay that way)

The data layer (`lib/api/landlord.ts`, React Query keys/invalidations), the route tree, `LANDLORD_NAV`
and its 14 items, `Protected role="landlord"`, `VerificationNotice`'s gate on the three write surfaces
(BUG-09), the map constants from `lib/maps.ts`, and all copy. Only one test touches a UI primitive
(`components.test.tsx`: `Button renders its children`), so the primitives are effectively unpinned by
tests — the rest of the suite (`routes.test.ts`, `boarder-nav.test.ts`, `toast*`, `auth-layout.test.tsx`)
does not assert ClassName strings.

---

## 3. Requirements

### 3.1 Chrome as material (D2, D5, D6, D16, D18, D25, D26)

* **R1.** `Topbar` becomes a pinned translucent bar at `lg` and up:
  replace `border-b border-gray-200 bg-white px-6 py-3` with a translucent material —
  e.g. `lg:sticky lg:top-0 lg:z-30 flex h-16 items-center justify-between px-6 bg-white/70
  backdrop-blur-xl backdrop-saturate-150`. Below `lg` it stays in the page flow exactly as today
  (D16), so the sub-`lg` rail behaviour is untouched.
* **R2.** Because the bar now floats, the **hard `border-b` divider is replaced by a scroll-edge
  underlay** (skill §12: "scroll edge effects, not hard dividers"): an absolutely-positioned child of
  the bar at `absolute inset-x-0 top-full h-6 pointer-events-none` fading from the material colour to
  transparent. It lives **inside** the sticky element so no topbar-height constant is needed (D25) —
  the deleted `top-[57px]` guess must not reappear.
* **R3.** The bar gets a **fixed `h-16`** so it aligns with the sidebar's `h-16` brand header (D26).
  `Topbar` therefore also disappears from the list of things that "read as careless" in the skill's
  craft principle.
* **R4.** `Sidebar`'s `bg-white` becomes a **heavier material than the topbar** (skill §12: "material
  weight encodes hierarchy"), e.g. `bg-white/85 backdrop-blur-xl backdrop-saturate-150`, keeping
  `border-r border-gray-200` (it is a structural region, not floating chrome). Its existing
  `lg:sticky lg:top-0 lg:h-screen` pin is unchanged.
* **R5.** `RoleShell`'s `main` keeps being the only scroll container (`px-6 pb-10 pt-2` is replaced by
  the airier padding of R9); **no ancestor may introduce `overflow`**, or `position: sticky` on both
  the sidebar and the topbar silently dies. An explanatory comment must record this, as the previous
  spec did for the sidebar.
* **R6.** No `z-index` stacking regression: content in `main` must never paint over the pinned bar
  (`lg:z-30` on the bar), and the existing `Modal` (`z-50`) / `ConfirmDialog` (`z-50`) /
  `UserMenu` (`z-40`) / `Toast` layers must still sit above it.

### 3.2 Breadcrumbs replace the topbar title (D7, D10, D18, D22)

* **R7.** The topbar stops rendering `<h1>{title}</h1>` and renders a **breadcrumb trail** instead,
  derived from the current route (path segments + `LANDLORD_NAV`/`BOARDER_NAV` labels where a segment
  matches, plus the record name where a param is available). Trailing crumbs are plain text; ancestors
  are links. It must degrade gracefully for a route with no trail (render nothing rather than a
  broken crumb).
* **R8.** The `title` prop is **removed from `RoleShell` and `Topbar` and from all 32 call sites**
  (16 landlord, plus boarder/admin/onboarding). Because breadcrumbs are derived, no replacement prop
  is introduced. If breadcrumbs genuinely cannot be derived for a page, the fallback is that the page's
  own in-body heading is the only label — never a re-added `title` prop.
* **R9.** Every page keeps its **in-body heading with icon and subtitle** (D7). This becomes the single
  place a page names itself.

### 3.3 Heading, rhythm and density (D1, D15, D24)

* **R10.** Adopt `PageHeader` as the canonical landlord heading block and extend it to carry an
  optional `icon` (the current pattern's `Icon size={28}`) alongside its existing `title`, `subtitle`
  and `actions`. It already renders `h1 text-2xl font-bold`; add size-specific tracking
  (`tracking-tight` on the heading, per skill §15). All ~15 copy-pasted heading blocks in the landlord
  routes are replaced by it.
* **R11.** Landing on **one spacing scale**: the surface moves from the current mix of `mb-4/mb-5/mb-6`,
  `p-4`, `gap-3/gap-4` to a single rhythm — roughly `space-y-6` between page sections, `gap-4` inside
  grids, and consistent vertical padding inside cards. Concretely: `main` goes from
  `px-6 pb-10 pt-2` to `px-6 pb-16 pt-6` (and wider gutters at `lg`), and the content column from
  `max-w-[1200px]` to a slightly roomier ceiling.
* **R12.** **Airier lists** (D15): `DataTable` row padding increases from `px-4 py-2` to roughly
  `px-4 py-3.5`, the header row gets matching breathing room, the expand chevron stops being a bare
  `▸`/`▾` text glyph and becomes a proper icon button with press feedback, and the table's outer
  `rounded-lg` is raised to match the new card radius (R15). Table text stays `text-sm` — scanning
  many rows is the job (D12), so padding grows without inflating the type.
* **R13.** Card grids (`index.tsx` stat cards, dashboard action cards) get more generous gaps and
  taller tiles so the dashboard reads as a dashboard rather than a dense form.
* **R14.** No copy changes anywhere (D1/D9) — including the subtitle lines, the placeholder sentences
  and the empty-state text.

### 3.4 Surface language (D14, R15–R17)

* **R15.** `Card` becomes opaque but elevated, matching the app-wide language:
  from `rounded-lg border border-gray-200 bg-white p-4` to roughly
  `rounded-2xl border border-gray-200/70 bg-white p-5 shadow-card`, with an optional
  `hover:shadow-pop` for interactive cards. It stays **opaque** — translucency is for chrome and
  floating layers only (D14).
* **R16.** The `--shadow-card` / `--shadow-pop` tokens are used by the landlord surface for the first
  time (they already exist — no new tokens strictly required, though a slightly deeper card shadow may
  be added if the cream background makes `--shadow-card` read as flat).
* **R17.** An explicit documented rule in the spec and in code comments: **never place a translucent
  surface on top of another** (skill §12). Cards are opaque; only the topbar, sidebar, modal, menus and
  toasts are translucent, and they float over the cream page — never over each other.

### 3.5 Actions and affordances (D11, D17)

* **R18.** **One primary action style per context.** The three competing styles in 2.6 collapse to the
  `Button` primitive (and a link styled like it): dashboard/listings CTAs, the `Button`-based actions,
  and the outline "Manage"/"Review" links all resolve onto the primitive's `primary`/`outline`/`danger`
  variants instead of inlining colour utilities.
* **R19.** **`Button` variants win over overrides.** `applications.tsx`'s
  `className="bg-red-600 px-2 py-1 text-xs"` becomes `variant="danger" size="sm"`; its
  `className="px-2 py-1 text-xs"` becomes `size="sm"`. No route file overrides a `Button`'s
  background or size again.
* **R20.** **Row actions become real controls.** The bare `text-sm hover:underline` buttons in
  `boarders.tsx` and `announcements.tsx` become `Button`/icon-button affordances with press feedback
  and a hit area meeting the skill's tap guidance (~10px of additional hit padding), while keeping
  their current labels and positions.
* **R21.** **Press feedback is instant** (skill §1 — "respond on pointer-down, not on release"). Every
  interactive element in the landlord surface (buttons, rows, cards, sidebar items, table actions,
  pills that toggle) must show a state on `:active`, not only on hover (D17). Colour-only hovers stay
  ungated; the existing `active:scale-[0.97]` pattern on `Button` is the reference.
* **R22.** **Destructive actions confirm** (D11): `boarders.tsx` Remove and `announcements.tsx` Delete
  route through the existing `ConfirmDialog` with `destructive` (default) and `busy` wired to the
  mutation's `isPending`, exactly as `LandlordRoomList` already does. `applications.tsx`'s
  Accept/Reject stay one-click (reversible status changes), as does every other action.
* **R23.** Hand-rolled status pills (`AccessBadge`, the `High priority` pill) move onto `StatusBadge`
  (extending its tone map if a tone is missing) so one pill language covers the surface.

### 3.6 States render inside the shell (D8)

* **R24.** `applications.tsx` and `settings.tsx` stop early-returning before the shell: loading, error
  and empty states render **inside** `RoleShell` so the sidebar and topbar never disappear. The
  `listings.tsx` → `<Outlet/>` layout is the reference. (Deliberately scoped to these two files — D8 —
  not a 22-file state-flow refactor.)
* **R25.** `EmptyState` gains optional `icon` and `action` slots (extending
  `components/ui/EmptyState`, per D13) so an empty state can carry a real CTA — today
  `listings/index.tsx` and `properties.tsx` smuggle a "Create a listing" link into the `description`
  string. Existing call sites keep working (both props optional).

### 3.7 Placeholder pages (D9)

* **R26.** The five placeholder pages (`calendar`, `activity`, `messages`, `pricing`,
  `payments/index`, `payments/record`) are rebuilt on **one shared placeholder presentation** — a
  centred `Card` with an icon, a title, the existing honest copy, and a next-step link where one
  exists. **The copy does not change** and `nav.ts` is untouched, so all five stay reachable from the
  sidebar with their current labels.
* **R27.** The heading level is normalised across them (`h1 text-xl` and `h2 text-2xl` become the one
  chosen heading block from R10), and they get the same page padding as every other landlord page
  instead of `mx-auto max-w-2xl`.

### 3.8 Motion (D17, D21, D23)

* **R28.** **Polish, don't invent.** The animations that already exist are upgraded, not replaced:
  `Modal` keeps its spring; the `UserMenu` `menu-pop`, the `Toast` `toast-in` and the modal
  fade/pop move from fixed `ease-out` keyframes to spring-family timing (critically damped,
  ~`bounce: 0`) representing Apple's `damping 1.0` default — **no bounce anywhere**, since no
  interaction in this surface is momentum-driven (skill §4: bounce only after a flick).
  `framer-motion` is already a dependency (D23), so this adds no package.
* **R29.** **Nothing new moves** (D17): no page-entrance choreography, no scroll-triggered reveals, no
  parallax, no animated numbers, no drag gestures. The one new visual effect allowed is the
  **material's own presence** (R1–R4 blur/saturation) and the R2 scroll edge.
* **R30.** **Reduced motion and reduced transparency are honoured** (D21): every animation added or
  touched needs a `prefers-reduced-motion: reduce` path that cross-fades instead of sliding/springing,
  following the existing per-keyframe guard pattern in `app.css`; and the translucent chrome needs a
  `prefers-reduced-transparency: reduce` path that goes opaque and drops `backdrop-filter`.
* **R31.** Motion never blocks input (skill §3): no transition may lock out clicks during its run.

### 3.9 Non-goals encoded as guard rails

* **R32.** **Routes, nav, data and copy are frozen.** `nav.ts`, `routes.ts`, every `createFileRoute`
  path, every React Query key, and every user-visible string stay exactly as they are. If a
  restructure tempts an IA change (the duplicate `listings` vs `properties` pages, the five dead-end
  nav items, `Tenants` vs `Boarders` naming), it is **recorded in §9, not implemented** (D1).
* **R33.** No API/worker/D1/migration change, no dependency change (D23), no `routeTree.gen.ts` edit,
  no dark theme (D3).

---

## 4. Files to change

| #  | File | Change |
| -- | ---- | ------ |
| 1  | `components/layout/Topbar.tsx` | R1, R2, R3, R7, R8 — translucent `h-16` sticky bar, scroll-edge child, breadcrumbs, drop `title` |
| 2  | `components/layout/RoleShell.tsx` | R5, R8, R10, R11 — drop `title`, airier `main`, keep no-`overflow` comment |
| 3  | `components/layout/Sidebar.tsx` | R4 — heavier material, keep the `lg` pin and the logo header |
| 4  | `components/ui/Card.tsx` | R15 — `rounded-2xl` + `shadow-card`, `p-5`, optional hover elevation |
| 5  | `components/ui/DataTable.tsx` | R12 — taller rows and header, proper expand control with press feedback |
| 6  | `components/ui/PageHeader.tsx` | R10 — optional `icon`, `tracking-tight`, adopted as the canonical heading |
| 7  | `components/ui/EmptyState.tsx` | R25 — optional `icon` and `action` |
| 8  | `components/ui/StatusBadge.tsx` | R23 — tone map covers the hand-rolled pills |
| 9  | `components/ui/Modal.tsx` | R28, R31 — spring family consistency |
| 10 | `styles/app.css` | R2, R28, R30 — scroll-edge utility if shared, motion/reduced-motion + reduced-transparency guards |
| 11 | `routes/landlord/index.tsx` | R10, R12, R13, R18 — dashboard rhythm, stat tiles, one CTA style |
| 12 | `routes/landlord/listings/index.tsx` | R10, R12, R18, R25 — `PageHeader`, empty-state CTA |
| 13 | `routes/landlord/listings.tsx` | R5, R8 — drop `title` |
| 14 | `routes/landlord/listings/create.tsx` | R11, R19 |
| 15 | `routes/landlord/listings/$id/edit.tsx` | R10, R11, R18, R19 (442 lines — the longest landlord form) |
| 16 | `routes/landlord/listings/rooms/$id/edit.tsx` | R11, R19 |
| 17 | `routes/landlord/properties.tsx` | R10, R18, R23, R25 |
| 18 | `routes/landlord/applications.tsx` | **R24** (shell flash), R10, R12, R18, R19 |
| 19 | `routes/landlord/boarders.tsx` | **R22** (confirm remove), R10, R12, R18, R20 |
| 20 | `routes/landlord/invitations.tsx` | R10, R11, R18 |
| 21 | `routes/landlord/announcements.tsx` | **R22** (confirm delete), R10, R18, R20, R23 |
| 22 | `routes/landlord/verification.tsx` | R10, R11, R18 |
| 23 | `routes/landlord/onboarding.tsx` | R10, R11, R18 |
| 24 | `routes/landlord/settings.tsx` | **R24** (shell flash), R10, R11 |
| 25 | `routes/landlord/maps.tsx` | R11 — align with the new padding/heading |
| 26 | `routes/landlord/{calendar,activity,messages,pricing}.tsx` | R26, R27 — unified placeholder |
| 27 | `routes/landlord/payments.tsx`, `payments/index.tsx`, `payments/record.tsx` | R8 (drop `title`), R26, R27 |
| 28 | `routes/{boarder,admin,onboarding}/**` (the other 16 `RoleShell` call sites) | R8 only — drop the now-dead `title` prop |
| 29 | `components/rooms/LandlordRoomList.tsx` | R11, R18, R20 — align the embedded room block with the new language (it sets today's precedent for R22) |

**No** API/worker file, migration, `lib/nav.ts`, `lib/routes.ts`, `lib/maps.ts`, `lib/api/landlord.ts`,
`VerificationNotice.tsx`, `package.json` or `routeTree.gen.ts` changes. **No new files** (D13).

**Blast-radius note:** items 2–10 are shared primitives (D6/D13), so `Card`, `EmptyState`,
`DataTable`, `PageHeader`, `StatusBadge`, `Modal` and the de-titled shell change **every consumer,
including boarder/admin pages**. That is the accepted consequence of "extend `components/ui/*` only"
+ "apply shell changes app-wide"; §9 records the alternate reading.

---

## 5. Resulting markup (illustrative, not final)

```tsx
// Topbar — pinned material + scroll edge, no title
<header className="flex h-16 items-center justify-between bg-white/70 px-6 backdrop-blur-xl backdrop-saturate-150 lg:sticky lg:top-0 lg:z-30">
  <Breadcrumbs />                                  {/* R7; renders nothing when there is no trail */}
  <div className="flex items-center gap-3">
    <NotificationBell />
    <UserMenu />
  </div>
  {/* scroll edge: absolutely positioned INSIDE the sticky bar, so no height constant (R2/D25) */}
  <span aria-hidden className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-white/70 to-transparent" />
</header>

// Sidebar — heavier structural material, pin unchanged
<aside className="flex shrink-0 flex-col border-r border-gray-200 bg-white/85 backdrop-blur-xl backdrop-saturate-150 transition-[width] lg:sticky lg:top-0 lg:h-screen …">

// Card — opaque, elevated, app-wide language
<div className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-card …">

// Landlord page — one heading, one rhythm
<RoleShell nav={LANDLORD_NAV}>          {/* title prop gone (R8) */}
  <PageHeader icon="buildingOffice" title="My properties" subtitle="All the properties you manage." />
  …
</RoleShell>

// Destructive action — the pattern LandlordRoomList already uses
<ConfirmDialog
  open={pending !== null}
  title="Remove boarder"
  message={<>Remove <strong>{pending?.first_name}</strong>? This cannot be undone.</>}
  confirmLabel="Remove boarder"
  busy={remove.isPending}
  onConfirm={…}
  onCancel={() => setPending(null)}
/>

// app.css — reduced transparency for the new chrome
@media (prefers-reduced-transparency: reduce) {
  /* topbar/sidebar go opaque, blur off */
}
```

---

## 6. Edge cases

| Case | Expected behaviour |
| ---- | ------------------ |
| `/landlord/applications` and `/landlord/settings` while loading | Sidebar and topbar stay put; only the content area shows the spinner (R24). |
| `/landlord/applications` with zero results | Empty state renders **inside** the shell, so the page never loses its chrome. |
| `/landlord/listings/*` (already nested in a shell) | Still inherits `listings.tsx`'s shell; must not end up double-wrapped by R24-style changes. |
| Router back/forward on a landlord page | Breadcrumbs re-derive from the route; no stale crumb, no flicker (pure derivation, no state). |
| A route with no derivable trail | Breadcrumbs render nothing; the in-body `PageHeader` is the only label. Never a broken or empty-link crumb. |
| Below `lg` (phone/tablet) | Topbar and sidebar are unpinned exactly as today (D16); tables keep their horizontal overflow (D12); no breadcrumb truncation bugs — the trail wraps or truncates. |
| Content scrolling under the translucent topbar | Scroll-edge fade softens the transition; nothing is hidden because the bar occupies real flow space in the layout. |
| Reaching the bottom of a short page | The scroll-edge underlay is still present; it must read as a soft edge, not a stray smear. *(If it reads wrong, see §9 Q2.)* |
| `Modal` / `ConfirmDialog` / `UserMenu` / `Toast` open over pinned chrome | They still paint above it (`z-50`/`z-40`), and a translucent card must never be stacked on translucent chrome (R17). |
| `prefers-reduced-motion: reduce` | All springs/cross-fades become opacity changes only; the chrome keeps working. |
| `prefers-reduced-transparency: reduce` | Topbar and sidebar go opaque, blur off, content still scrolls under a solid bar. |
| Browser without `backdrop-filter` or `prefers-reduced-transparency` | Graceful: `bg-white/70` still gives readable text; unsupported media queries are simply ignored (progressive enhancement, same posture as `scrollbar-gutter`). |
| Long landlord nav (14 items) | Sidebar still scrolls internally inside its existing `lg:h-screen` pin; the branding header stays visible. |
| `landlord/listings/$id/edit` (442 lines, the longest form) | Keeps its `LandlordRoomList` embed, photos section and authorised-landlords card; only spacing/heading/action styling changes — no field, validation or payload change. |
| `VerificationNotice` shown to an unverified landlord | Still renders its amber banner + CTA, restyled consistently, and the write surfaces stay gated (BUG-09 must not regress). |
| Sidebar collapse toggle while the topbar is pinned | Width transition still animates; the breadcrumb trail reflows without overlap. |
| Keyboard focus in an off-screen field | The page (still the only scroll container) scrolls it into view; pinned chrome does not trap focus. |
| Screen readers / focus order | Unchanged DOM order apart from the topbar's own content; breadcrumbs are a `<nav>` with an ordered list and proper `aria-current` on the last crumb. |
| Present-day tests | `components.test.tsx` (`Button renders its children`) and `routes.test.ts` etc. must stay green; nothing asserts the class strings being changed. |

---

## 7. Verification (D19)

```bash
bun run web:typecheck   # must be clean
bun run web:test        # existing suite must stay green (last run: 15 files / 81 pass)
bun run web:build       # must succeed
```

Plus a **build-output check** on the emitted CSS, mirroring how the previous change verified its
utilities beyond happy-dom (there is no layout engine in the test env, so visual intent can only be
confirmed in the compiled artefact):

```bash
# confirm the new utilities actually compile into the emitted stylesheet
grep -o "backdrop-blur-xl\|backdrop-saturate-150\|bg-white/70\|bg-white/85\|rounded-2xl\|shadow-card\|tracking-tight\|h-16" \
  apps/web/dist/client/assets/app-*.css | sort -u
# confirm the accessibility guards exist
grep -o "prefers-reduced-motion\|prefers-reduced-transparency" apps/web/dist/client/assets/app-*.css | sort -u
# confirm the deleted guess never returns
grep -rn "57px" apps/web/src   # expect: no matches
```

**Not verified by this spec:** real scroll/rubber-band physics, actual blur rendering, Safari's
`backdrop-filter` behaviour, and the perceived quality of the new spacing. D19 deliberately did not
choose the browser-walkthrough option, so the last mile is a human glance at a landlord page at
desktop and narrow widths.

---

## 8. Out of scope (explicit)

* **Any IA change** (D1/R32): merging `/landlord/listings` with `/landlord/properties` (both call
  `getProperties()` and show near-identical tables), removing or regrouping the dead-end nav items
  (`calendar`, `activity`, `messages`, `pricing`, `payments`), renaming `Tenants` ↔ `Boarders`, and
  the `/landlord/listings` ↔ `/landlord/listings/` alias.
* **Nav file changes** — `lib/nav.ts`, `LANDLORD_NAV`, its 14 items and their group labels are frozen.
* **Copy changes** (D1/D9) — all page copy, including the five placeholder sentences.
* **The mobile sidebar's width/rail problem** (288px at every width, no drawer) — still deferred.
* **Card-on-mobile list fallbacks** (D12 chose tables everywhere).
* **Dark mode** (D3) — light-only now; recorded as a planned follow-up, not skipped.
* **New motion** (D17/R29) — page transitions, scroll-triggered reveals, parallax, animated counters,
  drag/swipe gestures, momentum physics. Those parts of the apple-design skill are deliberately not
  applied because no interaction in this surface is gesture-driven.
* **Haptics/audio feedback** (skill §13) — not applicable on this platform mix, and D17 excludes it.
* **`components/landlord/*` growth** (D13) — no new landlord-specific components or files.
* **API/worker/D1/migrations/`lib/api/landlord.ts`**, dependency changes (D23), `routeTree.gen.ts`.
* **New tests** (D19 chose typecheck + suite + build check, not new primitive tests).
* **Committing the work** (D20).

---

## 9. Open questions / risks

1. **Blast radius of the shared primitives.** R15/R12/R10 change `Card`, `DataTable`, `PageHeader` and
   `EmptyState` **for every consumer**, and R8 strips the topbar title from **all 32 `RoleShell` call
   sites** — so boarder, admin and onboarding pages change too. That is the direct consequence of
   choosing "extend `components/ui/*` only" (D13) together with "apply shell changes app-wide" (D6). If
   the intent was landlord-only, the fix is a scoped variant/`className` override rather than
   restructuring the primitives — worth confirming before implementation.
2. **The scroll-edge fade could read as a smear.** An always-present gradient under a sticky bar looks
   right while content is passing beneath it and can look like a stray shading band when nothing is
   scrolled. The previous spec deleted a fade strip for exactly this reason. Options: keep it always-on
   and subtle (current spec), or gate it on scroll position (a small scroll listener — arguably new
   motion, which D17 excludes). Decision deferred to implementation review.
3. **`title` removal is the largest single mechanical change** (32 call sites) and is technically
   beyond "landlord pages". D18 explicitly chose it, but if a smaller diff is preferred, keeping
   `title` as an optional-but-unused prop is the fallback.
4. **Breadcrumb source of truth.** Need to confirm at implementation time that the router exposes
   enough (matched segments + params) to label a crumb like the property *name* on
   `/landlord/listings/$id/edit`; if not, the trail stops at the static segment
   (`Listings / Edit listing`) rather than resolving a record title from React Query.
5. **Airier density vs. row counts.** `boarders.tsx` and `applications.tsx` are scan-heavy; R12's
   taller rows reduce rows-per-screen by roughly a fifth. Accepted per D15, but it is the trade most
   likely to be revisited.
6. **`--shadow-card` on cream.** The token (`0 1px 3px rgba(0,0,0,.1)`) was tuned against white page
   backgrounds in `RoomDetailView` etc.; on `bg-cream` it may read flatter, hence R16's allowance to
   deepen it. That would affect the whole app, not just landlord.
7. **Two separate `RoleShell` concerns now overlap**: this change de-titles the shell and pins its
   topbar, while `auth-shell-pinned-panels` explicitly decided the topbar should scroll away (its D8).
   This spec supersedes that decision for the shell; the auth-side decisions in that spec are untouched.
8. **Placeholders keep their "coming soon" copy** (D9) while gaining a unified shell and a next-step
   link. Five honest-but-inert sidebar destinations remain — a known UX smell that D1 puts out of scope.

---

## 10. Acceptance criteria

- [ ] On every `/landlord/**` page, the topbar is a pinned translucent bar at `lg` and up; content
      scrolls underneath it; below `lg` the old behaviour returns exactly.
- [ ] The topbar shows breadcrumbs, not a page title, on landlord, boarder, admin and onboarding pages,
      and the now-dead `title` prop is gone from `RoleShell`, `Topbar` and all 32 call sites.
- [ ] Every landlord page names itself **once**, via the in-body `PageHeader` with icon and subtitle.
- [ ] The sidebar renders as a heavier translucent material while keeping its existing `lg` pin,
      internal nav scroll and collapse animation.
- [ ] `Card` is `rounded-2xl` + shadowed with the app-wide `shadow-card` language; translucency appears
      only on chrome and floating layers, never stacked on another translucent surface.
- [ ] Landlord tables have taller, roomier rows and a real expand control; still real tables at every
      width with clean horizontal overflow.
- [ ] One primary-action style per context; no route file overrides a `Button`'s colours or size.
- [ ] Row actions have press feedback and a real hit area; "Remove boarder" and "Delete announcement"
      confirm through `ConfirmDialog` with `busy` wiring; everything else stays one click.
- [ ] `applications.tsx` and `settings.tsx` render loading, error and empty states **inside** the
      shell — the sidebar and topbar never disappear.
- [ ] The five placeholder pages share one presentation, with their copy unchanged and `nav.ts`
      untouched.
- [ ] No new motion beyond polished existing animations + press feedback; no bounce anywhere; every
      animation and the translucent chrome honour `prefers-reduced-motion` and
      `prefers-reduced-transparency`.
- [ ] Routes, nav, API calls, query keys, validation and **all copy** are unchanged; no new files; no
      dependency change; no dark theme.
- [ ] `bun run web:typecheck` clean, `bun run web:test` green, `bun run web:build` succeeds, and the
      emitted CSS contains the new translucency/sticky/shadow utilities plus the reduced-motion and
      reduced-transparency guards.
- [ ] Working tree left **uncommitted**.

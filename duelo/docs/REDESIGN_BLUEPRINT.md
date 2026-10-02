# Big Bang Duel: Redesign & Design-System Blueprint (Phase 0)

> **Status:** Draft for Hugo's approval. Nothing in this document has been implemented.
> **Scope:** `duelo/src/pages/`, `duelo/src/components/`, `duelo/src/styles/`, `duelo/public/` assets, root status docs.
> **Baseline:** commit `3fd631d` (main, 2026-10-02). `npm run build` passes on a clean clone (Vite 7, 7.3 s, one 1.29 MB JS chunk, 171 kB CSS).
> **Companion:** the [Big Bang Duel Design System](https://claude.ai/artifact/Qz7X7UheF7vkgzjtfgxd21) artifact (tokens, brand book, component specs and live previews). It is the visual reference for §7–§9.

---

## 0. How to read this / decisions needed from Hugo

1. **§1–§6 are the audit** (method, systemic findings, pages, components, styles, assets and docs). Every file in `src/pages/` and `src/components/` has a row with a status and a decision (§3, §4).
2. **§7–§10 are the proposal.** That covers the design system, the premium-polish plan, page wireframes and the target folder structure.
3. **§11 is the ticket backlog.** It has 37 small tickets ordered by risk. Each has 3–8 checklist items and an explicit *Out of scope* line.
4. **§12 is the proposed root `CLAUDE.md`.**

**Decisions needed before any ticket starts** (each one blocks the tickets listed):

| # | Decision | Why it matters | Blocks |
|---|---|---|---|
| D1 | Approve the semantic token names in §7.1. Old Tailwind names stay as aliases during migration. | Every later ticket uses them. | T05 → all |
| D2 | Desktop strategy for non-battle pages: **(a)** the phone shell stays at 430 px and only the background is improved, or **(b)** an app frame at ≥1024 px with a side rail and content up to 960 px (recommended, §7.3). | Changes layout work in Phase C. | T27 |
| D3 | Missing audio: `useSound` loads 11 files from `/assets/audio/*.mp3`, but **that folder does not exist**, and `playSound` is never called. Options: provide the audio files, or ship haptics/visual feedback only and keep the hook dormant. | Polish plan §8.6. | T34 |
| D4 | Settings controls that don't work today (§2, item S9): hide them, or wire them? | Wiring "Save progress" for guests touches auth, which is out of scope. | T21 |
| D5 | Asset optimization: this audit only *notes* the problems. Approve generating smaller derived variants? Originals stay untouched. | 115 MB of PNG fallbacks ship in `dist/`. | T36 |
| D6 | UI-blocking issues that touch logic or security (§2.3). Each needs a yes or no. | Out of scope unless approved. | T23, T25, T28, T31 |
| D7 | Language: the UI mixes Portuguese and English (login buttons, guest panel). Is PT-BR the single source language for now? | Copy pass in each page ticket. | page tickets |

---

## 1. Method and evidence

- **Static audit** of all source in `duelo/src` (pages, components, styles, hooks, `App.tsx`, `index.html`, `vite.config.ts`, `tailwind.config.ts`) and `duelo/public`.
- **Build baseline** run on a clean clone of `main@3fd631d`: `npm ci && npm run build` ✅. Warnings: a single chunk over 500 kB, ineffective dynamic imports, and `mobile.webp`/`desktop.webp` URLs that Tailwind picked up from a code sample string in `design-system.tsx`.
- **Responsive analysis** at 320 / 375 / 768 / 1024 / 1440 px, landscape phones (e.g. 844×390, 667×375) and notch devices. Defects were computed from the CSS and Tailwind classes (fixed px offsets, `vw` sizes, viewport-based breakpoints inside the 430 px shell). They were **not** captured from device screenshots, because the app needs Firebase auth to get past `/`. Ticket T01 adds a screenshot harness so every later ticket can verify visually.
- **Contrast** values were computed with WCAG 2 relative luminance (§7.1.4).
- **Working tree note:** the local OneDrive copy shows 131 modified files with equal insertions and deletions. That is CRLF line-ending noise, not real edits. Adding a `.gitattributes` with `* text=auto eol=lf` is recommended (T02).

### 1.1 Route verification (`App.tsx` vs `src/pages/`)

| Route | Element | Guard | Layout | Page file | Notes |
|---|---|---|---|---|---|
| `/` | `IndexPage` → `LoginScreen` | none (redirects to `/menu` when authed) | own full-bleed | `index.tsx` | ✅ |
| `/game`, `/game/:roomId` | `GamePage` → `GameArena` | `ProtectedRoute` | own full-screen | `game.tsx` (6-line wrapper) | ✅ |
| `/menu` | `MenuPage` | Protected | `MobileLayout` | `menu.tsx` | ✅ |
| `/online` | `OnlinePage` → `OnlineLobby` | Protected + GuestRestricted | `MobileLayout` | `online.tsx` (wrapper) | Only reachable from the profile dropdown; no nav entry. |
| `/missions` | `MissionsPage` | Protected | `MobileLayout` | `missions.tsx` | ✅ |
| `/admin/missions` | `AdminMissionsPage` | Protected only (role check is inside the page, client-side) | `MobileLayout` | `AdminMissionsPage.tsx` | Desktop admin tool squeezed inside the phone shell. |
| `/leaderboard` | `LeaderboardPage` → `Leaderboard` | Protected + GuestRestricted | `MobileLayout` | `leaderboard.tsx` (wrapper) | Bottom-nav item, so a guest tap silently bounces to `/menu`. |
| `/characters` | `CharactersPage` | Protected | `MobileLayout` | `characters.tsx` | Nav label says **"Cartas"** but the page is characters/classes. |
| `/profile`, `/profile/:uid` | `ProfilePage` | Protected + GuestRestricted | `MobileLayout` | `profile.tsx` | ✅ |
| `/achievements` | `AchievementsPage` | Protected | `MobileLayout` | `achievements.tsx` | ✅ |
| `/friends` | `FriendsPage` | Protected + GuestRestricted | `MobileLayout` | `friends.tsx` | Shown in the guest dropdown, then bounces. |
| `/match-history` | `MatchHistoryPage` | Protected + GuestRestricted | `MobileLayout` | `matchHistory.tsx` | ✅ |
| `/shop` | `ShopPage` | Protected + GuestRestricted | `MobileLayout` | `shop.tsx` | Bottom-nav item, so guests bounce. |
| `/design-system` | `DesignSystemPage` | Protected | `MobileLayout` | `design-system.tsx` | Public in production to any logged-in player. |
| `*` | `Navigate → /` | | | | |

**Mismatches found**

- `game.tsx`, `online.tsx` and `leaderboard.tsx` (~130 B each) are **thin re-export wrappers**, not stubs or dead routes. All three are live. Decision: keep them as route entry points; they become `React.lazy` boundaries in T37.
- `characters.tsx.backup` is not routed or imported. **Delete** (T03).
- **Broken share link:** `GameArena.shareRoomLink` builds `${origin}/#/game/${roomId}`, but the app uses `BrowserRouter`. The `#/` link lands on `/`, which redirects to `/menu`, so the guest never joins. This is UI-blocking (§2.3, U1).
- Guest users see entry points (bottom nav **Loja**, **Ranking**; dropdown **Amigos**, **Online**; menu **Jogar Rápido**) that their guards reject without feedback.

---

## 2. Systemic findings (cross-cutting)

### 2.1 Top 15, ranked by user impact

| # | Finding | Evidence | Fix ticket |
|---|---|---|---|
| S1 | **Viewport breakpoints fire inside a 430 px shell.** At ≥768 px every non-battle page sits in a 430 px phone shell, but `md:`/`lg:` utilities still trigger. Results: 3-column character grid in ~406 px (`characters.tsx`), `lg:grid-cols-2` achievements in 430 px, `md:text-5xl` titles, `md:flex-row` layouts that overflow. | `mobileLayout.css` `.mobile-shell{max-width:430px}` + `md:` use in 11 page files | T11 (container queries), T27 |
| S2 | **`tailwind.config.ts` is dead.** Tailwind v4 via `@tailwindcss/vite` ignores the JS config without an `@config` directive. The custom screens `360:`, `xs:`, `390:` (used in `BattleArena.tsx` L226/L454) generate **no CSS**. | `globals.css` has no `@config`; build output has no `360\:` rules | T02 |
| S3 | **Battle screen is unusable in landscape phones.** Header ≈110 px + fixed hand ≈300 px exceeds 390 px of height. The hand covers the arena and characters. | `CardHandEnhanced` fixed bottom stack; `BattleHeader` | T28, T29 |
| S4 | **Magic pixel offsets couple battle layers.** The drop zone is `top-[68px] md:top-[78px] bottom-[148px] md:bottom-[172px]`, QuickChat is `bottom-[240px] md:bottom-[290px]`, and the arena is `pb-28 md:pb-32`. None account for safe-area insets or variable header height, so they drift on notch phones and when the info panel toggles. | `CardHandEnhanced.tsx`, `QuickChat.tsx`, `BattleArena.tsx` | T28 |
| S5 | **Safe-area handling is inconsistent.** `BottomNav` adds `env(safe-area-inset-bottom)` **twice** (`.bottom-nav` padding + `.safe-bottom` spacer). The battle hand has **no** bottom inset (home indicator overlaps cards). Left/right insets are ignored everywhere (landscape notch). `--ios-notch-top` and the `.ios-notch` class are computed in `App.tsx` and never consumed. `NOTCH_SAFE_AREA.md` documents a `.top-bar` padding that no longer matches the code. The profile dropdown is pinned at `top:76px` and ignores the top inset. | `BottomNav.tsx`, `mobileLayout.css`, `App.tsx` L60–96 | T06 |
| S6 | **No reduced-motion support.** `prefers-reduced-motion` appears only in the unused `App.css`. There are infinite animations (logo float, pulse glow, dust, idle bob, pulse rings, `animate-pulse` on 1-HP bars) plus a full-screen shake. | grep | T05 |
| S7 | **Font tokens are broken in places.** `@theme` defines `--font-family-*` (a v3 naming). Tailwind v4 expects `--font-*`, so `font-western` only works because `western.css` re-declares it by hand. `battleHeader.css` uses `var(--font-western)` / `var(--font-stats)`, which are **undefined**. `font-sans` (9 uses) and `font-mono` (30 uses) bypass the brand fonts. `font-bungee` (Admin) is never loaded. | `globals.css`, `western.css`, grep | T05 |
| S8 | **Illegible type sizes.** There are 96× `text-[10px]`, 28× `text-[9px]`, 5× `text-[8px]`, 1× `text-[7px]` and 1× `text-[6px]` (rarity and class chips on character cards). The proposed floor is 11 px (`micro`). | grep | T07–T10, page tickets |
| S9 | **Non-functional or misleading controls.** In `SettingsModal`: the language `<select>` does nothing, the "Vibração da Tela" toggle is a static div, and the guest "SAVE PROGRESS" form only edits local state and shows `alert()`. The vibration preference in `GamePauseMenu` is stored but never read (there are no `navigator.vibrate` calls). `isMuted` comes from a `useRef`, so the toggles don't re-render and show stale state. | `SettingsModal.tsx`, `GamePauseMenu.tsx`, `useSound.ts` | T21 (D4) |
| S10 | **Low-contrast text is the default "muted".** `text-sand/50` on `#1a0a04` = **2.98:1**, `/40` and `/30` are worse, and `text-red-west` as text = **3.55:1** on the dark surface. These fail WCAG AA for body text. | §7.1.4 | T05 + page tickets |
| S11 | **Modals are not dialogs.** There is no focus trap, no Esc to close (except pause via a window listener), no `role="dialog"`/`aria-modal`, and toggles have no `role="switch"`. The profile dropdown items are `<div onClick>`, so they are not keyboard reachable. z-index ranges from 10 up to `z-[10000]` with no scale. | `SettingsModal`, `GamePauseMenu`, `ProfileDropdown`, `characters.tsx` | T09, T22 |
| S12 | **Three parallel styling systems.** (1) Tailwind utilities with arbitrary values, (2) hand-written BEM-ish CSS (`mobileLayout.css`, `matchHistory.css`, `battleHeader.css`), (3) inline `style={{}}` (17 uses) and hard-coded hex (70 in TSX). `matchHistory.css` is desktop-first (`max-width` queries) while the rest is mobile-first. | §5 | T11–T26 |
| S13 | **Duplicated domain constants.** Card labels, descriptions and image paths are defined **five** times (`CardHand`, `CardHandEnhanced`, `CardItem`, `BattleArena`, `TurnResult`, and labels again in `GameOver`). The descriptions already disagree (e.g. dodge-streak rules appear in `CardHand` but not in `CardHandEnhanced`). `ConfirmPurchaseModal` is copy-pasted between `characters.tsx` and `shop.tsx`. | §5.1 | T04, T17 |
| S14 | **Assets far larger than their render size.** Cards are 1728×2304 (~150–220 kB) rendered at ≤100 px wide. Nav icons are ~1000 px (26–75 kB) rendered at 24 px. Class icons are 1024–1600 px rendered at 20–32 px. `dist/` is **145 MB**, mostly from 115 MB of PNG fallbacks and a 5.2 MB `bbd_ico.svg`. | §6 | T36 (D5) |
| S15 | **Zoom disabled.** `index.html` sets `maximum-scale=1, user-scalable=no`, which fails WCAG 1.4.4. `AssetPreloader` adds an artificial 1.2 s delay after assets load. | `index.html`, `AssetPreloader.tsx` | T35 |

### 2.2 Inconsistency inventory (summary)

- **Page header patterns (5 variants):** `h1 4xl/5xl + drop-bounce` (profile, shop, friends, leaderboard, lobby), `h1 3xl tracking-widest` (characters), image hero banner (missions), card header with back arrow (achievements), BEM header with back button (match history).
- **Button patterns (≥9):** `.btn-western` (+ `btn-danger`, `btn-sky`, nonexistent `btn-red` in `menu.tsx`), `.play-btn` (menu), gold-tint bordered (pause, prep), green solid (missions claim), `bg-btn-western` (nonexistent color in `characters.tsx`), ghost-outline, motion buttons, emoji FAB, and plain text links. `.btn-western` has **no disabled style**, so `GameOver` "REVANCHE" looks enabled while saving.
- **Panel patterns (≥6):** `.card-wood`, `bg-black/30 rounded-xl`, stone/amber gradient (achievements), crimson/stone hero (missions), glass `from-black/95` (turn result), neutral/blue (admin).
- **Toggles (3 implementations):** pause menu, settings modal, online lobby (`Toggle` local component).
- **Spinners (5):** border spinners in friends, leaderboard, lobby, game-waiting, menu (double ring), plus `animate-spin-star` CSS (unused).
- **Palettes off-brand:** Tailwind default `stone/amber/zinc/neutral/blue/purple/fuchsia/emerald/sky` are used directly in achievements, admin, characters (rarity), profile, GameOver (purple level), QuickChat.

### 2.3 UI-blocking issues touching logic or security (flag only, needs D6 approval)

| ID | Issue | Proposed handling |
|---|---|---|
| U1 | Room share link uses `/#/game/{id}` with BrowserRouter, so the invite fails. | One-line URL fix in T28. It is a UI string, but it changes behavior, so it needs approval. |
| U2 | Guest users can start **Jogar Rápido** (online quick match) from the menu, although `/online` is guest-restricted. | Product decision: hide or disable it for guests with an explainer (UI only). Matchmaking behavior is unchanged. |
| U3 | `AdminMissionsPage` calls the Gemini API from the browser with `VITE_GEMINI_API_KEY`. **The key is bundled into the public JS.** The admin role check is client-side only. | **Security, out of scope.** Recommend moving to a server function and rotating the key. Flagged for Hugo. |
| U4 | `CardHandEnhanced` "HIDE_ALL" info mode hides the Confirm button, leaving only double-tap or drag (undiscoverable). | UX: keep the mode but always keep a compact confirm affordance (T31). |
| U5 | `/design-system` is reachable by any logged-in player. | Gate behind `import.meta.env.DEV`, or remove once the artifact replaces it (T25). |

---
## 3. Page audit (`src/pages/`: 15 files, 100% covered)

**Status legend:** 🟢 sound, cosmetic issues only · 🟡 works, with layout or consistency defects · 🔴 broken or unusable in at least one target context · ⚫ dead file.
**Decision legend:** **Keep** (restyle with primitives only) · **Merge** (fold into another file or shared component) · **Rewrite** (rebuild the view layer with the same data and logic) · **Delete**.

### 3.1 Summary table

| File | Lines | Route | Status | Decision | Ticket |
|---|---:|---|---|---|---|
| `index.tsx` | 41 | `/` | 🟡 | Keep (container for Login) | T24 |
| `menu.tsx` | 488 | `/menu` | 🟡 | Rewrite view; keep match/resume logic verbatim | T23 |
| `characters.tsx` | 1215 | `/characters` | 🔴 (≥768 px shell grid, 6–7 px text) | Rewrite + split into `features/characters/*` | T18 |
| `characters.tsx.backup` | 543 | — | ⚫ | **Delete** | T03 |
| `profile.tsx` | 722 | `/profile[/:uid]` | 🟡 | Rewrite view, split sections | T19 |
| `shop.tsx` | 423 | `/shop` | 🟡 | Keep; extract `PurchaseConfirmDialog` (merge with characters) | T17 |
| `missions.tsx` | 396 | `/missions` | 🟡 | Keep; normalize type scale and hero | T16 |
| `achievements.tsx` | 436 | `/achievements` | 🟡 | Rewrite view (off-brand palette, `min-h-screen` in shell) | T15 |
| `friends.tsx` | 445 | `/friends` | 🟢 | Keep; primitives swap | T13 |
| `matchHistory.tsx` | 294 | `/match-history` | 🟡 | Rewrite onto Tailwind + primitives; **delete `matchHistory.css`** | T14 |
| `leaderboard.tsx` | 6 | `/leaderboard` | 🟢 wrapper | Keep (lazy boundary) | T12, T37 |
| `online.tsx` | 6 | `/online` | 🟢 wrapper | Keep (lazy boundary) | T20, T37 |
| `game.tsx` | 6 | `/game[/:roomId]` | 🟢 wrapper | Keep (lazy boundary) | T37 |
| `AdminMissionsPage.tsx` | 615 | `/admin/missions` | 🟡 (desktop tool in phone shell, Bungee font missing) | Keep logic; move outside `MobileLayout` into an `AdminLayout`; re-skin last | T26 |
| `design-system.tsx` | 254 | `/design-system` | 🟡 (double background, emoji headings, stale) | Rewrite as dev-only token gallery, or delete in favor of the artifact | T25 |

### 3.2 Per-page responsive defects

Viewports: **320** (iPhone SE 1st gen / small Android) · **375** (iPhone SE 2/3, mini) · **768** (tablet portrait; the shell becomes a 430 px card) · **1024 / 1440** (desktop) · **Land.** (844×390 and 667×375) · **Safe** (notch / home indicator).

**`index.tsx` + `LoginScreen`**
- 320: the parchment card is `max-w-sm mx-4` with `p-8`, leaving ~224 px of inner width. The rotated title plaque (`px-8`, `text-2xl` Rye, `tracking-widest`) can clip at the edges.
- 768–1440: fine (full-bleed desert, landscape bg at `md`).
- Land.: logo 192 px + form is taller than 375 px. The `min-h-screen` flex column centers and **clips the top** (no scroll padding). The logo should shrink by height.
- Safe: no top inset handling. The logo can sit under the notch in standalone PWA mode.
- Also: 23 hard-coded hex colors that duplicate existing tokens. Visible English copy with Portuguese `sr-only` copy (screen readers hear a different language than shown). Dust particles use `Math.random()` in render, so they reposition on every re-render.

**`menu.tsx`**
- 320: `.play-btn` is 96 px tall with a 60 px icon + 22 px Rye label + arrow. The label "Jogar Rápido" fits, but the sub-label `letter-spacing:1.5px` truncates. The resume banners are a row of icon + text + button + trash button, which is cramped (≈40 px of text column).
- 375: OK.
- 768+: inside the shell. The quick-match modal is `fixed inset-0`, so on desktop it covers the whole viewport instead of the shell (inconsistent with page modals that portal into the shell).
- Land.: `.hero` uses `justify-content:flex-end`. Two 96 px buttons + banners exceed the content height (390 − 72 top bar − 68 nav = 250 px), so it scrolls and the top banners hide.
- Other: `btn-red` does not exist, so "CANCELAR" renders brown. The solo-setup view hard-codes `background:#1a0a04` inline.

**`characters.tsx`**
- 320: 2-column grid with `gap-4` gives ~138 px cards. Rarity chip `text-[6px]`, class chip `text-[7px]`, name `text-[10px]`: unreadable.
- 375: same type issue. The filter-pill rail scrolls horizontally with a hidden scrollbar, so there is no affordance.
- 768–1440: `md:grid-cols-3` fires inside the 430 px shell, so 3 columns of ~122 px cards and text shrinks visually (S1). Toast is `fixed bottom-6 left-1/2` relative to the **viewport**, not the shell.
- Land.: the detail modal (portal, `max-w-[430px]`) computes portrait height from the viewport; on 390 px of height the CTA zone and portrait leave ≈80 px for info.
- Safe: the modal's top bar handles the top inset; the CTA bar has `pb-6` and **no bottom inset**.
- Other: `z-[9999]`/`z-[10000]`; `bg-btn-western` (nonexistent); `font-sans` in descriptions; a duplicated purchase modal.

**`profile.tsx`**
- 320: avatar grids `grid-cols-5` in ~256 px → 44 px avatars, acceptable. Stat triplets `text-[9px]`.
- 768+: `md:text-5xl` title inside the 430 px shell (S1). A nested `max-h-[240px]` scroll inside a scrolling page (scroll-trap on touch).
- Land.: long single column; nested scroll areas are hard to escape.
- Other: three distinct "stat card" styles in one page (sky, fuchsia and orange borders).

**`shop.tsx`**
- 320: currency header `grid-cols-2` with 48 px coin icons + `text-xl`, tight but fits. The sort `<select>` uses browser default styling.
- 768+: S1 title size. The list is a fixed `max-h-[420px]` inner scroll (scroll-in-scroll).
- Other: two placeholder sections (cards with only a title and an uppercase note). Decide whether they ship.

**`missions.tsx`**
- 320: **opposite density problem.** Mission titles `text-xl`, body `text-base/lg`, tabs `text-sm uppercase tracking-[0.12em]`. Tabs wrap to 2 lines (`flex-wrap`); reward column + title column collide.
- 375: tabs still wrap.
- 768+: `sm:` sizes (`text-5xl`, `text-2xl`) fire inside the shell.
- Other: hard-coded `#2b1409`, `#2f1407`, `#7b3515`; hero uses `bg_saloon.webp` (327 kB) at 35% opacity.

**`achievements.tsx`**
- All widths: page root is `min-h-screen ... max-w-7xl` inside the shell's scroll container, so double background and padding.
- 768–1440: `lg:grid-cols-2` inside 430 px (S1).
- Other: entirely Tailwind `stone/amber/zinc/emerald`, off the western palette. The back button is an SVG with no label.

**`friends.tsx`**
- 320: friend row = 40 px avatar + name + 2–3 action buttons with `text-[10px]` labels. The pending row's accept and decline buttons squeeze the name to ~70 px.
- 768+: S1 title.
- Other: `font-mono` player codes (system mono, off-brand); status dot colors carry meaning by hue only.

**`matchHistory.tsx` (+ `styles/matchHistory.css`, 558 lines)**
- Desktop-first CSS (`@media (max-width:768px)`, `(max-width:480px)`) with its own palette (`#1a0f05`, `#2d1b0a`, `#0d0603`, `#ffb3ba`) and fonts (`"Oswald", monospace`, `"Courier New"`).
- 320: `.details-grid` collapses at 480 px. The summary row (badge + info + 3 quick stats + chevron) overflows below ~340 px.
- Other: emoji used as stat icons (8 occurrences).

**`AdminMissionsPage.tsx`**
- Designed for desktop (`fixed` top nav `px-8`, `lg:grid-cols-4`, `pt-24`) but rendered inside the 430 px shell **with** TopBar and BottomNav, so its fixed nav overlaps the TopBar.
- Font `font-bungee` is never loaded (falls back to serif).
- Decision: give it an `AdminLayout` (no phone shell), neutral admin skin acceptable. Lowest priority.

**`design-system.tsx`**
- Its own `min-h-screen` desert background inside the shell's background (double). Emoji section headings. It documents `btn-sky` and badges that drift from real usage.
- Decision: replace with a dev-only gallery generated from the new primitives, or delete and point to the artifact (D-U5).

**`game.tsx` → `GameArena` (battle; see §4 for components)**
- 320: card width `calc(18vw-4px)` ≈ 54 px, labels 9 px. Header health segments ≈12 px wide each. QuickChat FAB (56 px) at `bottom:240px right:16px` sits over the player character.
- 375: workable.
- 768: the hand is `max-w-7xl` centered with cards fixed at 100 px; good. Characters capped at 275 px.
- 1024/1440: the battle is **not** in the shell (full-bleed). Characters max 320 px, so the arena feels empty at 1440 with large unused center space.
- Land.: **broken** (S3).
- Safe: header handles the top inset; the hand ignores the bottom inset (S5); the drop-zone offsets ignore both.

---

## 4. Component audit (`src/components/`: 30 files, 100% covered)

| File | Used by | Status | Decision | Notes | Ticket |
|---|---|---|---|---|---|
| `auth/AuthGuard.tsx` | — | ⚫ | **Delete** | Superseded by `ProtectedRoute` in `App.tsx`; `bg-sand` loading screen is off-style. | T03 |
| `auth/LoginScreen.tsx` | `index.tsx` | 🟡 | Rewrite view | 23 hex literals; mixed language; uses `.btn-western`, `.input-parchment`. Auth calls stay untouched. | T24 |
| `auth/LoginScreen.test.tsx` | vitest | 🟢 | Keep → update selectors | Relies on `sr-only` Portuguese labels; keep those labels or update the tests in T24. | T24 |
| `auth/LoginScreen.integration.test.tsx` | vitest | 🟢 | Keep | Same as above. | T24 |
| `common/AssetPreloader.tsx` | `App.tsx` | 🟡 | Keep, simplify | Artificial 1.2 s delay; preloads only 3 of ~40 characters; no reduced-motion handling. | T35 |
| `common/MissionsModal.tsx` | — | ⚫ | **Delete** | Unused since `missions.tsx` exists; contains its own Firestore claim transaction, a divergence risk. Confirm no planned use. | T03 |
| `common/SettingsModal.tsx` | `TopBar` | 🔴 (fake controls) | Rewrite → `features/settings/SettingsSheet` | Shares toggles with `GamePauseMenu`; see S9. | T21 |
| `game/BattleArena.tsx` | `BattleUILayout` | 🟡 | Rewrite view | Hosts the **turn-result overlay** inline (`fixed inset-0`); dead `360:/xs:/390:` classes; duplicate card constants. Extract `TurnResultOverlay`. | T28, T32 |
| `game/BattleHeader.tsx` | `BattleUILayout` | 🟡 | Keep, restyle | rAF `setState` every frame for the timer (re-renders the header ~60×/s); hue-only health colors; `animate-pulse` at 1 HP. | T30 |
| `game/BattleUILayout.tsx` | `GameArena` | 🟡 | Rewrite as `BattleLayout` (grid) | Owns the RTDB emoji listener; keep the logic, replace the absolute/fixed layering with grid rows. | T28 |
| `game/CardHand.tsx` | — | ⚫ | **Delete** (after harvesting) | Older hand. It has the more complete card descriptions (dodge streak, double-shot limit) and the safe-area padding. Harvest both into `lib/cards.ts` in T04. | T03/T04 |
| `game/CardHandEnhanced.tsx` | `BattleUILayout` | 🟡 | Rewrite view → `features/battle/Hand` | Keep selection, drag, double-tap and auto-fire logic byte-for-byte; replace layout, fixed offsets, a11y. | T31 |
| `game/CardItem.tsx` | `CardHand`, `CardHandEnhanced` | 🟡 | Rewrite → `BattleCard` primitive | Inline style block; `disabled` with no reason text; 8–9 px labels. | T31 |
| `game/Character.tsx` | `BattleArena` | 🟢 | Keep | Variants map is good; needs reduced-motion and size by container height (landscape). | T29 |
| `game/GameArena.tsx` | `game.tsx` | 🟡 | Keep logic; extract `WaitingRoomOverlay` | Inline SVG icons although `lucide-react` is installed; `alert()`; broken share URL (U1). | T28 |
| `game/GameOver.tsx` | `BattleUILayout` | 🟡 | Rewrite view → `features/battle/GameOver` | Keep the `recordMatchResult` effect untouched. Disabled buttons look enabled; the level row shows even with no level change; unlock shows a raw character id. | T33 |
| `game/GamePauseMenu.tsx` | `BattleUILayout` | 🟡 | Rewrite onto `Sheet` + shared settings | Vibration flag never read; no focus trap; mute state stale. | T21 |
| `game/GamePrep.tsx` | `menu.tsx` | 🟡 | Rewrite view → character select | Accordion hides the chosen character art; "INICIAR DUELO" overrides `.btn-western`. Becomes the "pre-duel" screen in §9. | T23 |
| `game/QuickChat.tsx` | `BattleUILayout` | 🟡 | Keep, restyle | Fixed pixel position; the cooldown label does not tick (no timer re-render); emoji as UI. | T28 |
| `game/StatusBar.tsx` | — | ⚫ | **Delete** | Pre-BattleHeader HUD. | T03 |
| `game/TurnResult.tsx` | — | ⚫ | **Delete** | Superseded by the overlay inside `BattleArena` (which duplicates its constants). | T03 |
| `game/WoodenBattleHeader.tsx` | — | ⚫ | **Delete** (+ `styles/battleHeader.css`) | Only consumer of `battleHeader.css`, which is still globally imported (331 lines of dead CSS). Its nine-slice wood idea is reused in the new `Panel` spec. | T03 |
| `game/uiPreferences.ts` | `CardHandEnhanced`, `authStore` | 🟢 | Keep → move to `features/settings/` | Logic module, not UI; Firestore sync stays as-is. | T21 |
| `layout/BottomNav.tsx` | `MobileLayout` | 🟡 | Keep, restyle | Double safe-area; no `aria-current`; no-op ternary for badge color; guest-restricted items without a lock state; Firestore missions listener lives in a layout component (keep, document). | T22 |
| `layout/MobileLayout.tsx` | `App.tsx` | 🟡 | Rewrite → `AppShell` | Becomes the responsive frame (phone shell <1024, app frame ≥1024 per D2) and the **container-query root**. | T11, T27 |
| `layout/ProfileDropdown.tsx` | `TopBar` | 🟡 | Rewrite onto `Menu` primitive | `<div onClick>` items; fixed `top:76px`; shows guest-restricted items. | T22 |
| `layout/TopBar.tsx` | `MobileLayout` | 🟡 | Keep, restyle | At 320 px: 50 px avatar + nowrap name + 3 pills (≥45 px each) overflow when values exceed 4 digits. The name is a `<span onClick>`. | T22 |
| `leaderboard/Leaderboard.tsx` | `leaderboard.tsx` | 🟢 | Keep → `features/leaderboard/` | Rank colors by hue only; staggered `animationDelay` per row (fine, gate by reduced motion). | T12 |
| `lobby/OnlineLobby.tsx` | `online.tsx` | 🟡 | Keep → `features/lobby/` | Third toggle implementation; 10 px Rye labels. | T20 |

**Coverage check:** 15 page files + 30 component files = 45 files, 45 rows (§3.1 + §4).

---

## 5. Styles: duplication and inconsistency map

### 5.1 Overlapping components and constants

| Cluster | Members | Resolution |
|---|---|---|
| **Card hand** | `CardHand.tsx` (dead) · `CardHandEnhanced.tsx` (live) | One `Hand` component; harvest the richer copy and safe-area padding from the dead one. |
| **Battle header** | `BattleHeader.tsx` (live) · `WoodenBattleHeader.tsx` (dead) + `battleHeader.css` · `StatusBar.tsx` (dead) | One `BattleHud`. Delete the dead pair and its CSS. |
| **Battle layout** | `GameArena.tsx` (route, room join, waiting overlay, shake, dust) · `BattleUILayout.tsx` (composition, emoji RTDB listener) · `BattleArena.tsx` (characters + turn-result overlay) | Three layers stay but get single responsibilities: `BattleScreen` (route/data) → `BattleLayout` (grid) → `Arena` / `TurnResultOverlay` / `WaitingRoomOverlay`. |
| **Turn result** | `TurnResult.tsx` (dead) · overlay inside `BattleArena.tsx` | `TurnResultOverlay`. |
| **Card metadata** | `CARD_DETAILS` ×2, `CARD_IMAGES` ×3, `CARD_IMAGE_SOURCES` ×2, `CARD_LABELS` ×3, ability maps ×2 | `src/lib/cards.ts` (UI metadata only; rules stay in `gameEngine.ts`). |
| **Purchase confirm** | `ConfirmPurchaseModal` in `characters.tsx` · inline modal in `shop.tsx` | `PurchaseConfirmDialog`. |
| **Settings** | `SettingsModal.tsx` · `GamePauseMenu.tsx` (sound + vibration) · `OnlineLobby` `Toggle` | `SettingsPanel` + `Switch` primitive. |
| **Characters page** | `characters.tsx` · `characters.tsx.backup` | Delete the backup. |
| **Missions UI** | `missions.tsx` · `MissionsModal.tsx` (dead) | Delete the modal. |
| **Star icon** | `GameOver` `Star` · `WoodenBattleHeader` `Star` · BattleHeader round dots | `RoundStars` primitive. |
| **Spinner** | 5 inline implementations | `Spinner` (sheriff-star variant optional). |

### 5.2 Conflicting or dead CSS

| File | Lines | Problem | Action |
|---|---:|---|---|
| `src/App.css` | 42 | Vite template leftovers (`#root{max-width:1280px;padding:2rem}`, logo spin). **Not imported**, so dead. | Delete (T02) |
| `src/index.css` | 2 | Imports `globals.css`, but `main.tsx` imports `globals.css` directly, so `index.css` is unused. | Delete (T02) |
| `tailwind.config.ts` | 43 | Ignored by Tailwind v4 (S2); duplicates `@theme` colors. | Move breakpoints to `@theme --breakpoint-*`, delete (T02) |
| `styles/western.css` | 9 | Manual `.font-*` shims because `@theme` uses `--font-family-*`. | Rename to `--font-*`; delete the shim (T05) |
| `styles/battleHeader.css` | 331 | Only used by dead `WoodenBattleHeader`; globally imported; uses undefined `--font-western`. | Delete (T03) |
| `styles/mobileLayout.css` | 656 | Shell + TopBar + nav + dropdown + menu play buttons. A global `main{…}` selector styles **every** `<main>`. Unused rules: `.settings-btn`, `@keyframes xpGlow`. 30+ hex literals. | Split into component CSS or Tailwind; scope `main` to `.app-shell__main` (T11, T22, T23) |
| `styles/matchHistory.css` | 558 | Private palette, desktop-first, fonts by literal name. | Delete after T14 |
| `styles/animations.css` | 125 | Good keyframes but no reduced-motion guard; unused classes (`.card-flip`, `.animate-spin-star`, `.animate-tumbleweed`, `.animate-slide-right`). | Keep keyframes; add a reduced-motion block; prune unused (T05) |
| `styles/globals.css` | 235 | Two palettes (`original` + `mobile prototype`) with near-duplicates (`cream` = `parchment`, `gold-proto` vs `gold`, `dark` vs `black-ink`); Google Fonts via CSS `@import` (render-blocking chain). | Becomes `tokens.css` + `base.css` + `components.css` (T05) |

### 5.3 Hard-coded values that bypass tokens

| Metric | Count | Worst offenders |
|---|---:|---|
| Hex literals in TSX | 70 | `LoginScreen` 23, `StatusBar` 14 (dead), `WoodenBattleHeader` 14 (dead), `CardHand` 4 (dead), `missions` 3, `BattleArena` 3, `GameOver` 3 |
| `rgba()` in TSX | ~60 | `characters` 11, `menu` 5, `BattleHeader` 4 |
| Hex in CSS files | ≈110 | `mobileLayout.css`, `matchHistory.css`, `globals.css` button gradients |
| Inline `style={{}}` | 17 | `characters` 4, `CardItem` (the whole visual), `CardHand` 3, `BattleHeader` 2 |
| Arbitrary Tailwind values `-[…]` | ≈330 | `characters` 60, `profile` 31, `missions` 21, `LoginScreen` 19, `OnlineLobby` 18 |
| Arbitrary font sizes | 152 | `text-[10px]` ×96, `[9px]` ×28, `[11px]` ×18, `[8px]` ×5, `[7px]`, `[6px]` |
| z-index values | 14 distinct | `0, 1, 5, 10, 20, 30, 35, 40, 50, 60, 90, 100, 9999, 10000` |
| Off-brand font utilities | 39 | `font-mono` ×30, `font-sans` ×9, `font-bungee` (unloaded) |
| Tailwind default palette | widespread | `stone/amber/zinc/neutral/emerald/fuchsia/purple/sky/blue/green/red-*` |

---

## 6. Assets and status docs

### 6.1 Assets (`src/assets/`, `public/`): notes only, nothing moved

| Finding | Detail | Proposed later action (needs D5) |
|---|---|---|
| Oversized rasters | Cards 1696–1728 × 2304–2368 px (150–220 kB webp) shown ≤160 px wide; nav icons 863–1200 px (26–75 kB) shown at 24 px; class icons 1024–1600 px (72–134 kB) shown at 16–32 px; `gold_coin.webp` 1024 px / 118 kB shown at 16–24 px; `ruby_coin` 1440 px. | Generate `@1x/@2x` derived sizes (e.g. cards 240/480 w; icons 48/96) beside the originals; `srcset`. |
| PNG fallbacks | 99 PNGs, **115 MB**, in `public/**/png/`. Every evergreen browser supports WebP, so `<picture>` PNG fallbacks only add deploy weight (`dist/` = 145 MB). | Keep the files in the repo; stop copying them into `dist/` (move to `/art-src`) once approved. |
| `public/bbd_ico.svg` | 5.2 MB SVG (embedded raster). Not referenced by `index.html` (which uses `icone_app.webp`). | Confirm unused; keep in an art-source folder. |
| PWA icons | `manifest.json` points both 192 and 512 sizes to one `icone_app.webp` (175 kB, a single size). `purpose: "any maskable"` on an unpadded logo will be cropped. Apple touch icon is WebP (iOS expects PNG). | Export 192/512 PNG + a maskable variant from the existing art. |
| Possibly unreferenced in `src` | `ui/banner_classic`, `banner_template`, `banner_template2`, `bg_personalized`, `cards_icon`/`home_icon`/`missions_icon`/`shop_icon` (duplicates of `ui/nav/*`), `ranking_icon`, `sheriff_icon`, `tambor_ammo1/2`, `versus_icon`, `image-47`, `characters_profile/mokey_king_profile2`, `cards/old/*` | Keep; candidate art for polish (§8: `versus_icon` for turn result, `tambor_ammo*` for the reload animation, `sheriff_icon` for loading). |
| File names with spaces | `characters/la belle.*`, `o galo.*`, `o panda.*`, `tai lung.*`, `the toon.*` (+ png) | Works, but fragile in URLs and scripts. Rename only with a mapping in `lib/characters.ts` (later, optional). |
| Missing | `/assets/audio/*.mp3` (11 files referenced by `useSound.ts`) | D3. Today every page that renders `TopBar` triggers 11 failed fetches at module load. |
| Fonts | Rye, Permanent Marker, Oswald via CSS `@import` from Google Fonts (`display=swap`). | Self-host with `@fontsource/*` or add `preconnect` + `<link>` in `index.html` (T05). |
| `src/assets/react.svg` | Template leftover | Delete (T02). |

---

### 6.2 Status docs at `duelo/` root

| Doc | Date | Verdict | Notes |
|---|---|---|---|
| `DESIGN_SYSTEM.md` | 2026-03-06 | **Superseded** by this blueprint + artifact | Documents palette v1 only; misses the "mobile prototype" palette that most of the shell uses; recommends `md:` patterns that break in the shell (S1). Move to `docs/archive/`. |
| `STYLE_FIXES.md` | 2026-03-07 | **Obsolete** | Describes the `@theme` vs `:root` incident; the lesson (keep `@theme`) is carried into `CLAUDE.md`. Archive. |
| `FINAL_REPORT.md` | 2026-03-07 | **Obsolete** | Report of the same fix. Archive. |
| `NEW_BATTLE_UI_SUMMARY.md` | 2026-03-21 | **Partially obsolete** | Lists `CardHandEnhanced`, `BattleUILayout`, `QuickChat` (still live) and claims "fully responsive" (not true in landscape). Keep for the feature list; archive. |
| `NOTCH_SAFE_AREA.md` | — | **Stale** | Code differs (`.top-bar` padding, unused JS notch probe). Replaced by §7.2.3. Archive. |
| `PLAYER_PROGRESSION_PLAN.md` | 2026-03-07 | **Current (game design)** | Not UI. Move to `docs/game/`. |
| `BOTAI_V53_IMPLEMENTATION.md` | 2026-03-21 | **Current (AI)** | Not UI. Move to `docs/game/`. |
| `TEST_GUIDE.md` | 2026-03-19 | **Current** | Move to `docs/`; add the visual-regression harness from T01. |
| Repo root: `PHASE2_DATABASE_SYNC_FIX.md`, `BRANCH_FEAT_AI_HISTORY5_DOUBLE2.md`, `game_master_prompt.md`, `duelo_prototype.html` | — | Out of scope (not `duelo/`) | `duelo_prototype.html` is the origin of the "mobile prototype" palette; keep as a reference. |

---
## 7. Unified design system spec

**Principles**

1. **Keep the identity, remove the noise.** Western-cartoon art carries the brand: sunset desert, saloon wood, parchment, brass and crimson. The UI chrome around it gets quieter and more consistent so the art reads as premium.
2. **Every value comes from a token.** No hex, `rgba()` or arbitrary `-[…]` value in TSX. Arbitrary values are allowed only inside `src/ui/` primitives, and only for art-driven geometry (card aspect ratio, nine-slice).
3. **Mobile-first, container-aware.** Components respond to the width of the container they live in (shell or frame), not the viewport.
4. **Motion is a reward, never a blocker.** Every animation has a reduced-motion equivalent, and no input waits on an animation longer than 300 ms.

The **Big Bang Duel Design System** artifact holds the canonical token values (`tokens.json`), the brand book and live component previews. The tables below are the same values, written for implementation.

### 7.1 Design tokens

#### 7.1.1 Color: raw palette (values exactly as in the code today)

| Token | Value | Source today | Use |
|---|---|---|---|
| `night-950` | `#0e0604` | `.bottom-nav` end, shell bg | App background behind everything |
| `night-900` | `#1a0a04` | `--color-dark`, shell bg-color | Base surface |
| `night-800` | `#2a1208` | `--color-dark-mid` | Raised surface |
| `night-700` | `#1e0e06` | `--color-nav-bg`, dropdown | Popover surface |
| `wood-900` | `#3b1f0a` | `--color-brown-dark` | Darkest wood, panel edge |
| `wood-800` | `#4a2208` | `.card-wood` mid stop | Panel body |
| `wood-700` | `#6b3410` | `.card-wood` start | Panel highlight |
| `wood-600` | `#7b4a1e` | `--color-brown-mid` | Secondary ink on parchment |
| `wood-500` | `#a0522d` | `--color-brown-light` | Rare accents |
| `wood-edge` | `#2a1005` | button/panel bottom shadow | Bevel edge |
| `btn-wood-top` / `btn-wood-bottom` | `#8b4513` / `#5a2d0c` | `.btn-western` | Primary button gradient |
| `parchment` | `#f5e6c8` | `--color-parchment` (= `--color-cream`) | Light surface, text on dark |
| `sand-300` | `#f0d080` | `--color-sand-light` | Headline text on wood |
| `sand-500` | `#d4a855` | `--color-sand` | Secondary text on dark |
| `brass-300` | `#f0d070` | `--color-gold-l` | Currency numbers, active nav |
| `brass-500` | `#c8a84b` | `--color-gold-proto` | Chrome borders, avatar rings |
| `brass-700` | `#8b6914` | `--color-gold-d` | Nav top border, quiet brass |
| `gold` | `#ffd700` | `--color-gold` | Titles, selection, glow |
| `crimson-900` | `#4a0808` | `--color-crimson-d` | Danger/online button edge |
| `crimson-700` | `#7a1010` | `--color-crimson` | Top bar, online CTA |
| `crimson-500` | `#a01818` | `--color-crimson-l` | Online CTA highlight |
| `red-west` | `#c0392b` | `--color-red-west` | Danger fills |
| `red-deep` | `#8b0000` | `--color-red-700` | Danger gradient end |
| `sky` | `#87ceeb` | `--color-sky` | XP, info, secondary CTA |
| `sunset-500` | `#ff6b35` | `--color-sunset-1` | Energy/impact FX |
| `sunset-200` | `#f7c59f` | `--color-sunset-2` | FX glow |
| `ink` | `#1a0a00` | `--color-black-ink` | Text on parchment and gold |

#### 7.1.2 Color: semantic layer (what components use)

| Semantic token | Maps to | Rule |
|---|---|---|
| `bg-app` | `night-950` | Page background under art |
| `surface` | `night-900` | Default panel on art (opaque, replaces `bg-black/30`) |
| `surface-raised` | `night-800` | Rows, nested panels |
| `surface-overlay` | `rgba(14,6,4,0.85)` | Scrims under dialogs |
| `surface-wood` | `wood-800` (+ gradient `wood-700 → wood-900`) | Hero panels, dialogs |
| `surface-parchment` | `parchment` | Forms, login, rules sheets |
| `text` | `parchment` | Body on any dark surface (15.6:1 on `surface`) |
| `text-strong` | `sand-300` | Titles on wood |
| `text-muted` | **`#c9ad7f`** (new) | Replaces `text-sand/50`, `/40`, `/30` (8.97:1 on `surface`, 4.6:1 on `wood-700`) |
| `text-on-light` | `ink` | Body on parchment (15.7:1) |
| `text-on-light-muted` | `wood-600` | Secondary on parchment (6.0:1) |
| `accent` | `gold` | Selection, focus ring, key numbers |
| `accent-chrome` | `brass-500` | Borders on chrome (3:1+ on every dark surface) |
| `currency` | `brass-300` | Gold/ruby/trophy amounts |
| `info` | `sky` | XP, info badges |
| `success` | `#4ade80` | Win, positive delta (always paired with an icon or `+` sign) |
| `danger` | `red-west` (fill) / **`#f87171`** (text) | Loss, destructive. **Text uses `danger-text`** (6.97:1); `red-west` as text fails (3.55:1). |
| `focus-ring` | `gold`, 2 px solid + 2 px `night-950` offset | Every interactive element |

**Rarity and class scales:** keep today's hues (rarity: common sand, rare sky, epic purple, legendary gold, titanic red; classes: atirador red, estrategista blue, sorrateiro purple, ricochete yellow, sanguinario orange, suporte green), but define them as tokens (`rarity-*`, `class-*`) and **always pair them with the label or class icon**, so meaning never depends on hue alone.

**Health bar:** keep the 4-segment bar. The fill color changes by remaining segments (green → yellow → orange → red), and the segment count already encodes the value, so color is redundant (OK). Replace the infinite `animate-pulse` at 1 HP with a single "danger" heartbeat on damage (reduced-motion: static red outline).

#### 7.1.3 Typography

Fonts stay: **Rye** (display), **Oswald** (UI/body/numbers), **Permanent Marker** (hand-lettered accents, sparingly). Fix the token names to Tailwind v4 (`--font-western`, `--font-stats`, `--font-marker`). Ban `font-sans`, `font-mono` and `font-bungee` outside `src/ui/`. Player codes use Oswald with `tabular-nums` and wide tracking.

| Style | Family | Size / line | Weight | Case / tracking | Use |
|---|---|---|---|---|---|
| `display-xl` | Rye | 48 / 48 | 400 | — | VITÓRIA / DERROTA, round banners |
| `display` | Rye | 36 / 40 | 400 | — | Page titles (one per page) |
| `title` | Rye | 24 / 28 | 400 | 0.04em | Dialog titles, section heads |
| `heading` | Rye | 18 / 22 | 400 | 0.04em | Card titles, list group heads |
| `button` | Rye | 16 / 20 | 400 | 0.08em upper | Primary and danger buttons |
| `button-sm` | Oswald | 13 / 16 | 600 | 0.1em upper | Secondary/ghost buttons, tabs |
| `body` | Oswald | 16 / 24 | 400 | — | Paragraphs, descriptions |
| `body-sm` | Oswald | 14 / 20 | 400 | — | Row text, card descriptions |
| `label` | Oswald | 12 / 16 | 600 | 0.12em upper | Field labels, chips, stat captions |
| `micro` | Oswald | 11 / 14 | 600 | 0.08em upper | **Floor.** Card cost tags, timers. Nothing smaller ships. |
| `stat` | Oswald | 20 / 24 | 700 | tabular-nums | Currency, scores, counters |
| `stat-lg` | Oswald | 32 / 36 | 700 | tabular-nums | Reward count-ups |
| `hand` | Permanent Marker | 18 / 22 | 400 | -0.01em | "Novo!", stamps, tutorial callouts |

Fluid scaling: `display` and `display-xl` use `clamp()` against the **container** (`cqi`), not `vw`, for example `clamp(28px, 8cqi, 36px)`.

#### 7.1.4 Contrast check (WCAG 2)

| Pair | Ratio | Verdict |
|---|---:|---|
| `parchment` on `surface` | 15.64 | ✅ |
| `sand-500` on `surface` / `wood-700` | 8.75 / 4.49 | ✅ / ⚠️ use `sand-300` on wood for small text |
| `text-sand/50` (today) on `surface` | 2.98 | ❌ → `text-muted` 8.97 |
| `text-sand/70` (today) on `wood-800` | 3.42 | ❌ → `text-muted` 6.41 |
| `red-west` text (today) on `surface` | 3.55 | ❌ → `danger-text` 6.97 |
| `brass-500` border on `surface` | 8.41 | ✅ (≥3:1 for UI marks) |
| `brass-700` border on `surface` | 3.79 | ✅ borders only |
| `ink` on `parchment` / `wood-600` on `parchment` | 15.67 / 6.0 | ✅ |
| `sand-300` on `crimson-700` (top bar) | 7.35 | ✅ |

#### 7.1.5 Spacing, radius, shadow, z-index

- **Spacing (4 px base):** `space-0.5` 2 · `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-5` 20 · `space-6` 24 · `space-8` 32 · `space-10` 40 · `space-12` 48. Page gutter = `space-4` (16 px). At ≤340 px container width it drops to `space-3`.
- **Radius:** `radius-sm` 6 (inputs, chips) · `radius-md` 8 (buttons, battle cards) · `radius-lg` 12 (rows, popovers) · `radius-xl` 16 (panels, play buttons) · `radius-2xl` 24 (sheets, shell) · `radius-full`.
- **Shadow:** `shadow-bevel` = `0 4px 0 #2a1005, 0 6px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)` (buttons; pressed = `0 2px 0 …`) · `shadow-panel` = `0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)` · `shadow-pop` = `0 10px 40px rgba(0,0,0,0.8)` · `shadow-glow-gold` = `0 0 16px rgba(255,215,0,0.5)` · `shadow-chrome` = `0 4px 20px rgba(0,0,0,0.6)`.
- **z-index scale (replaces 14 ad-hoc values):**

| Token | Value | Layer |
|---|---:|---|
| `z-base` | 0 | Art, dust |
| `z-content` | 10 | Page content, characters |
| `z-chrome` | 20 | TopBar, BottomNav, BattleHud |
| `z-dropzone` | 30 | Battle drop target |
| `z-hand` | 40 | Battle hand |
| `z-float` | 45 | QuickChat FAB |
| `z-overlay` | 50 | Turn result, waiting room |
| `z-dialog` | 60 | Modals, sheets, pause, game over |
| `z-popover` | 70 | Menus, dropdowns, tooltips |
| `z-toast` | 80 | Toasts |
| `z-system` | 90 | Preloader, offline banner |

#### 7.1.6 Motion

| Token | Value | Use |
|---|---|---|
| `duration-instant` | 100 ms | Press states |
| `duration-fast` | 150 ms | Hovers, toggles |
| `duration-base` | 250 ms | Sheets, fades, card select |
| `duration-slow` | 400 ms | Page transitions, reveals |
| `duration-dramatic` | 700 ms | Victory banner, level up (skippable) |
| `ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrances |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Moves |
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Today's "pop" (avatar, card select), small elements only |

**Reduced motion** (`@media (prefers-reduced-motion: reduce)` + `<MotionConfig reducedMotion="user">`): no infinite loops (idle bob, logo float, pulse glow, dust, pulse ring), no screen shake (replace with a 150 ms red vignette flash), no translate or scale entrances (opacity fades ≤150 ms only), count-ups jump to the final value, character attack variants become a single 100 ms brightness flash.

### 7.2 Breakpoints and layout strategy

**Two axes, two mechanisms:**

1. **Container queries for components.** `AppShell` main and every `Panel` set `container-type: inline-size`. Components use Tailwind v4 `@container` variants (`@sm:` 384 px, `@md:` 448 px, `@lg:` 512 px, `@2xl:` 672 px). This fixes S1, because the same component behaves correctly in the 430 px shell and in the desktop frame.
2. **Viewport media queries only for the frame.** `AppShell` and the battle layout use these, declared in `@theme` (replacing the dead config):

| Token | Query | Frame behavior |
|---|---|---|
| `bp-compact` | `< 360px` | Gutter 12 px; TopBar hides the trophy pill (moves into the dropdown) |
| `bp-phone` | `≥ 360px` | Default design target (375–430) |
| `bp-tablet` | `≥ 768px` | Non-battle: phone shell centered on art (today's behavior, improved bg). Battle: full-bleed. |
| `bp-desktop` | `≥ 1024px` | Non-battle: **app frame** (D2b) with a left nav rail (icons + labels) replacing BottomNav, content column max 960 px, TopBar becomes a header row. Battle: arena capped at 1200 px wide, centered. |
| `bp-wide` | `≥ 1440px` | Same frame, art fills; content max 960 px; optional right rail (friends online) later |
| `bp-short` | `(orientation: landscape) and (max-height: 500px)` | Landscape phone: compact HUD (40 px), hand docks to the right as a vertical 5-card column, characters scale by height (`max-h: 60svh`) |

#### 7.2.1 Shell grid (non-battle)

```
<1024:  [ TopBar      ]  ← safe-area top
        [ main (scroll)]  container-type: inline-size
        [ BottomNav   ]  ← safe-area bottom (once)
≥1024:  [ rail | header           ]
        [ rail | main (max 960)   ]
```

#### 7.2.2 Battle grid (replaces fixed offsets)

```
portrait:   grid-template-rows: auto 1fr auto;     /* hud / arena / hand */
            hand padding-bottom: max(12px, env(safe-area-inset-bottom))
            drop zone = arena row (no px offsets); QuickChat anchored to hand row top-end
landscape-short: grid-template-columns: 1fr auto; rows: auto 1fr
            hud spans both columns; hand = right column, cards stacked vertically
```

#### 7.2.3 Safe areas (single source of truth)

- `AppShell`: `padding-inline: env(safe-area-inset-left/right)`. The TopBar adds the top inset once. BottomNav adds the bottom inset once. **Remove** the `.safe-bottom` spacer, the JS notch probe and `--ios-notch-top`.
- Battle: the HUD adds the top inset; the hand adds the bottom inset; landscape adds left/right on the outer grid.
- Dialogs and sheets: the sheet bottom padding includes the bottom inset.
- Use `100svh` for battle (stable while browser chrome shows) and `100dvh` for the shell (follows it).
- `index.html`: drop `maximum-scale=1, user-scalable=no`. Keep `viewport-fit=cover`. Use `touch-action: manipulation` on controls to avoid double-tap zoom instead.

### 7.3 Primitive component library (`src/ui/`)

All primitives are token-only, forward `ref` and `className`, and have a visible `:focus-visible` ring, a disabled state and reduced-motion behavior.

| Primitive | API sketch | Replaces |
|---|---|---|
| `Button` | `variant: 'primary' \| 'danger' \| 'secondary' \| 'ghost'` · `size: 'sm' \| 'md' \| 'lg'` · `loading` · `icon` · `fullWidth` | `.btn-western`, `.btn-danger`, `.btn-sky`, `btn-red` (bug), gold-tint, green-solid and ad-hoc buttons |
| `PlayButton` | `tone: 'online' \| 'solo'` · `title` · `subtitle` · `icon` | `.play-btn.btn-online/.btn-solo` (menu) |
| `IconButton` | `label` (required, used as aria-label) · `size` · `variant` | Close ×, trash, settings, back arrows |
| `Panel` | `tone: 'wood' \| 'surface' \| 'parchment' \| 'glass'` · `padding` · `as` | `.card-wood`, `bg-black/30` boxes, stone/amber gradients |
| `Dialog` | `open` · `onClose` · `title` · `footer` · `size` · portal into the shell root · focus trap · Esc · scroll lock · `role="dialog"` | Settings, pause, purchase confirm, quick-match search, character detail |
| `Sheet` | Bottom sheet on phone, centered dialog at `@lg` | Pause menu, settings, filters |
| `Tabs` / `SegmentedControl` | `items` · `value` · `onChange` · roving tabindex · `aria-selected` | Leaderboard, characters, missions, friends, lobby tabs |
| `Badge` | `tone: 'rarity-*' \| 'class-*' \| 'success' \| 'danger' \| 'info' \| 'neutral'` · `icon` | Rarity tags, class chips, "VOCÊ", status pills |
| `ProgressBar` | `value` · `max` · `tone` · `segments?` · `label` (for screen readers) | XP, mission progress, mastery, timer, health segments |
| `CurrencyChip` | `kind: 'gold' \| 'ruby' \| 'trophy'` · `amount` · `delta?` (animated) · `onClick?` | `.coins-pill` ×3, shop/purchase rows, rewards |
| `Avatar` | `src` · `size: 24–96` · `ring: 'brass' \| 'gold' \| 'rarity-*'` · `status?` · `badge?` | `.avatar-ring`, dropdown avatar, friend/leaderboard avatars |
| `Switch` | `checked` · `onChange` · `label` · `role="switch"` | 3 toggle implementations |
| `Toast` | `useToast().show({tone, title, icon})` · queue · `aria-live="polite"` | Purchase feedback, copy-code, `alert()` |
| `Menu` | Trigger + items (`button` elements) · arrow keys | `ProfileDropdown` |
| `States` | `EmptyState({icon, title, body, action})` · `LoadingState({label})` (sheriff-star spinner) · `ErrorState({message, onRetry})` · `Skeleton` | 5 spinners, ad-hoc empty and error blocks |
| `PageHeader` | `title` · `subtitle?` · `back?` · `actions?` | 5 header variants |
| `RoundStars` | `won` · `total` · `side` | 3 star implementations |
| `BattleCard` | `card` · `state: 'idle' \| 'selected' \| 'disabled'` · `disabledReason` · `uses?` · `streak?` | `CardItem` |

---
## 8. "Premium game" polish plan

Guiding idea: **every screen has one hero moment, and everything else is calm.** Polish comes from staging, timing and feedback, not from more gradients. All of it uses existing art; no new assets are required except audio (D3).

### 8.1 Main menu
- **Hero:** the player's current character art stands in the desert (bottom-anchored, ~55% height) with a slow parallax on the bg (reduced-motion: static). This replaces the empty sky above the two buttons.
- Play buttons keep their crimson and wood identity. They get a press-down bevel (`shadow-bevel` → pressed) and a 100 ms brass shimmer on press, replacing the JS ripple that appends DOM nodes.
- Resume banners become one compact `Panel tone="glass"` "Continue" card above the buttons (one at a time; online takes priority).
- Quick-match search becomes a **Sheet** with a sheriff-star spinner, rotating flavor lines and an elapsed timer. Cancel is always visible.

### 8.2 Character select (pre-duel)
- Replaces the `GamePrep` accordion: a horizontal snap carousel of unlocked characters (card art, rarity frame, class badge), the selected one enlarged with its passive ability text, and the mode picker as a 3-option `SegmentedControl` with a one-line rule summary.
- Locked characters are shown greyed with "Nv 5" or price `CurrencyChip`, so the carousel doubles as a progression teaser.
- CTA "INICIAR DUELO" is a `Button size="lg"` pinned above the safe area.

### 8.3 Battle screen
- **HUD:** avatar + name + 4-segment health + ammo cylinders per side, a center "Turno N" plaque and round stars. The timer is a thin bar under the HUD animated with CSS `transform: scaleX()` driven by one CSS animation per turn (no per-frame React state). It turns red in the last 3 s with one subtle tick (haptic, if enabled).
- **Arena:** characters keep their framer variants. Add a small ground shadow tied to the idle bob. On damage, a red edge vignette and number pop ("-1") over the hit character replace the full-screen shake (shake stays as an opt-in "Efeitos de impacto" setting, default on, off under reduced motion).
- **Hand:** cards fan slightly (±4°) in portrait. The selected card lifts and gets a gold rim. Unavailable cards show the reason ("Sem munição") on long-press or focus, not just grey. Confirm is always available as a compact button (U4).
- **Drop/confirm feedback:** card flies from the hand to the center (`duration-base`), then the turn resolves.

### 8.4 Turn result
- A staged reveal replaces the static modal: (1) both cards flip in from each side using `versus_icon.webp` as the center plate (150 ms), (2) outcome line "Seu Tiro acertou! −1 ❤" (sound: gunshot), (3) ability callouts slide in. Total ≤1.2 s, **tap anywhere to skip**. Reduced motion: final state with a 150 ms fade.
- Layout uses the arena row, not a viewport-fixed modal, so the HUD stays visible.

### 8.5 Game over and rewards
- Sequence: banner (VITÓRIA / DERROTA / EMPATE in `display-xl` with a brass plaque) → winner art → stats → **reward rows count up one by one** (XP bar fills, gold `CurrencyChip` counts up, trophies delta) → level-up callout if any (named character unlocks with portrait, not a raw id) → achievements toast stack.
- Buttons stay disabled with a visible "Salvando…" state until `recordMatchResult` resolves (logic unchanged). Real disabled styling is added.
- Every step is skippable with a tap.

### 8.6 Transitions, audio and haptics hooks
- **Route transitions:** `AnimatePresence` around the shell `<Outlet>`. Pages cross-fade with an 8 px rise (`duration-slow`); the battle enters with a "dust wipe" (bg dust layer sweeps once). Reduced motion: 150 ms fade.
- **Feedback service** `useFeedback()` → `feedback.emit('card.select' | 'card.play' | 'hit' | 'win' | 'loss' | 'reward.tick' | 'ui.tap' | 'timer.warn')`. One place maps events to sound (Howler, if D3 provides files) and haptics (`navigator.vibrate`, Android only; iOS ignores it gracefully). It respects the mute and vibration settings and reduced motion. UI components emit events and never call Howler directly.
- Fix `useSound`: a module-level store (zustand) so mute is reactive. Lazy-create `Howl`s on first `emit`, not at import, to stop 11 failing requests per page.

### 8.7 Micro-interactions catalogue
- Buttons: press 100 ms translateY(2px) + bevel shrink; hover brightness 1.08 (pointer devices only).
- Currency: `+N` floating label and a coin glint when the value increases (TopBar and rewards).
- Nav: active icon lifts 1 px and the brass underline slides between items (`layoutId`).
- Tabs: underline slides (`layoutId`).
- Lists: first paint staggers ≤8 rows (30 ms each), later rows appear instantly.
- Claim buttons (missions, achievements): stamp effect using `font-marker` "RECEBIDO!", then the row collapses.
- Copy player code: inline check-mark swap + toast (replaces `alert`).

---

## 9. Page-by-page wireframe descriptions

Notation: ⟨…⟩ = primitive · `[ ]` = region · ↓ = scroll.

**Login (`/`)**
`[full-bleed desert art + dust]` → `[logo, height ≤ 28svh]` → ⟨Panel parchment⟩ with a nailed title plaque "ENTRAR" → fields (`input-parchment` → ⟨Field⟩) → ⟨Button primary⟩ → text link "Esqueci minha senha" → divider "OU" → ⟨Button secondary⟩ "Jogar como convidado" → Google button (brand-compliant white). Landscape: logo moves left, panel right.

**Menu (`/menu`)**
⟨TopBar⟩ → `[hero: character art bottom-anchored over desert]` → ⟨Panel glass⟩ "Continue" card (optional) → ⟨PlayButton online⟩ "Jogar Rápido" → ⟨PlayButton solo⟩ "Jogar Solo" → secondary row: ⟨Button ghost⟩ "Sala privada" (→ `/online`, fixes discoverability) → ⟨BottomNav⟩. Desktop: art left half, buttons right column.

**Pre-duel (`/menu` solo step → becomes its own sheet)**
⟨PageHeader back "Prepare seu duelo"⟩ → carousel of ⟨CharacterCard⟩ (snap) → selected character detail strip (class ⟨Badge⟩, passive) → ⟨SegmentedControl⟩ Iniciante / Normal / Avançado + rule line → sticky ⟨Button lg⟩ "INICIAR DUELO".

**Battle (`/game`)**
Portrait: `[HUD: P1 avatar·hearts·ammo | Turno plaque + RoundStars | P2]` → `[timer bar]` → `[arena: P1 art · VS space · P2 art; turn-result plays here]` → `[hand: info line + 5 ⟨BattleCard⟩ + Confirm + pause/info toggles]`; ⟨QuickChat FAB⟩ at the hand's top-right edge (online only). Landscape-short: HUD across the top; arena left; vertical hand right.

**Waiting room (online, inside battle)**
⟨Panel glass⟩ centered: sheriff spinner → "Aguardando forasteiro" → big room code (`stat-lg`, tracking) → ⟨IconButton⟩ copy · share → ⟨Button ghost danger⟩ "Cancelar".

**Game over (overlay)**
⟨Dialog full-height sheet⟩: banner → winner art → RoundStars recap → stats rows → rewards rows (count-up) → level-up / unlock card → actions: ⟨Button primary⟩ "Revanche", ⟨Button secondary⟩ "Menu". Achievement ⟨Toast⟩ stack.

**Characters (`/characters`, nav label → "Personagens")**
⟨PageHeader "Personagens"⟩ + currency summary ⟨CurrencyChip⟩×2 → ⟨Tabs⟩ Personagens / Classes (dot badge on evolvable) → class filter chips (scroll rail with edge fade) → "Seus" section grid (2 cols; `@md` 3 cols; `@2xl` 4) → "Disponíveis" grid → tap opens ⟨Sheet⟩ character detail (portrait, passive, lore, CTA buy/equip). Classes tab: list of ⟨ClassMasteryCard⟩ with ⟨ProgressBar⟩ and upgrade ⟨Button⟩ + cost.

**Profile (`/profile`)**
⟨PageHeader⟩ → identity ⟨Panel wood⟩: ⟨Avatar 96⟩, name (editable inline), player code + copy → ⟨Tabs⟩ Visão geral / Personalizar / Estatísticas. Overview: level + XP ⟨ProgressBar⟩, currencies, trophies. Customize: avatar picture grid, gameplay character grid (no nested scroll; the page scrolls). Stats: W/L/D tiles, per-mode, per-character list.

**Shop (`/shop`)**
⟨PageHeader⟩ + balance chips → ⟨Panel⟩ "Personagens" with sort ⟨SegmentedControl⟩ → item rows (art, name, rarity ⟨Badge⟩, price ⟨CurrencyChip⟩, ⟨Button sm⟩ buy) → ⟨PurchaseConfirmDialog⟩. Unbuilt sections are hidden until real.

**Missions (`/missions`)**
Hero banner (saloon art, 120 px, title + reset countdown) → ⟨Tabs⟩ Diárias / Semanais / … → mission rows (difficulty ⟨Badge⟩ with word + dot, title `heading`, objective `body-sm`, rewards ⟨CurrencyChip⟩s, ⟨ProgressBar⟩, claim ⟨Button⟩) → completed history (collapsed).

**Achievements (`/achievements`)**
⟨PageHeader back⟩ + unclaimed counter ⟨Badge⟩ → list of ⟨Panel wood⟩ accordion rows (icon, name, tier dots, progress, claim). `@lg`: 2 columns (container-based, so only in the desktop frame).

**Leaderboard (`/leaderboard`)**
⟨PageHeader⟩ → ⟨SegmentedControl⟩ mode → ⟨SegmentedControl⟩ sort (vitórias/troféus) → podium (top 3 with ⟨Avatar ring=gold/silver/bronze⟩ and rank number, so not color-only) → list rows → "Você" row pinned at the bottom when off-screen.

**Friends (`/friends`)**
⟨PageHeader⟩ → ⟨Tabs⟩ Amigos / Pedidos (count) / Adicionar → rows (⟨Avatar status⟩ with status text, name, code, actions as ⟨IconButton⟩ + overflow ⟨Menu⟩) → Adicionar: your code card + code input + ⟨Button⟩.

**Match history (`/match-history`)**
⟨PageHeader back⟩ → list of result rows (result ⟨Badge⟩ VITÓRIA/DERROTA/EMPATE, mode, date, 3 stat icons with numbers) → expand to a details grid (`@sm` 3 columns, else stacked). Empty state with CTA "Jogar agora".

**Online lobby (`/online`)**
⟨PageHeader⟩ → ⟨Tabs⟩ Criar / Entrar / Salas abertas → Create: mode ⟨SegmentedControl⟩, options as ⟨Switch⟩ rows, ⟨Button⟩ → Join: big code input + ⟨Button⟩ → Open rooms list with join buttons, empty and loading states.

**Settings (Sheet from TopBar and from Pause)**
Sections: Conta (name, guest panel per D4), Áudio (music, effects ⟨Switch⟩), Jogo (info display mode, impact effects, vibration), Idioma (hidden until implemented). Pause adds "Continuar" and "Sair da partida" (confirm step) on top.

**Admin missions (`/admin/missions`)**
Own ⟨AdminLayout⟩ (no shell, no game nav), neutral surface tokens, Oswald only. Keep functionality.

---

## 10. Target folder structure and migration order

### 10.1 Target tree (`duelo/src`)

```
src/
  app/
    App.tsx                  # routes only (lazy pages)
    AppShell.tsx             # was layout/MobileLayout: frame, safe areas, container root
    routes.tsx
  ui/                        # design-system primitives (token-only)
    Button.tsx  PlayButton.tsx  IconButton.tsx  Panel.tsx  Dialog.tsx  Sheet.tsx
    Tabs.tsx  Badge.tsx  ProgressBar.tsx  CurrencyChip.tsx  Avatar.tsx  Switch.tsx
    Toast.tsx  Menu.tsx  States.tsx  PageHeader.tsx  RoundStars.tsx  Spinner.tsx
    index.ts
  features/
    shell/       TopBar.tsx  BottomNav.tsx  NavRail.tsx  ProfileMenu.tsx
    auth/        LoginScreen.tsx (+ tests)
    menu/        MenuScreen.tsx  ContinueCard.tsx  QuickMatchSheet.tsx  PreDuel.tsx
    battle/      BattleScreen.tsx  BattleLayout.tsx  BattleHud.tsx  Arena.tsx  Character.tsx
                 Hand.tsx  BattleCard.tsx  TurnResultOverlay.tsx  WaitingRoomOverlay.tsx
                 GameOver.tsx  QuickChat.tsx  PauseSheet.tsx
    characters/  CharactersScreen.tsx  CharacterCard.tsx  CharacterSheet.tsx  ClassMasteryCard.tsx
    shop/        ShopScreen.tsx  PurchaseConfirmDialog.tsx
    profile/     ProfileScreen.tsx  sections/*
    missions/    MissionsScreen.tsx  MissionRow.tsx
    achievements/AchievementsScreen.tsx  AchievementRow.tsx
    friends/     FriendsScreen.tsx
    leaderboard/ LeaderboardScreen.tsx
    lobby/       OnlineLobby.tsx
    history/     MatchHistoryScreen.tsx
    settings/    SettingsPanel.tsx  uiPreferences.ts
    admin/       AdminLayout.tsx  AdminMissionsScreen.tsx
  pages/                     # thin route entries (lazy boundaries), one per route
  lib/        + cards.ts (UI card metadata) + feedback.ts (audio/haptics)
  hooks/ store/ types/       # unchanged
  styles/
    tokens.css   base.css   animations.css   (globals.css imports them)
```

Pages remain thin wrappers (the pattern `game.tsx`/`online.tsx` already use) so routing and lazy-loading stay trivial.

### 10.2 Keep / merge / rewrite / delete: full decision list

| Current file | Decision | Destination |
|---|---|---|
| `pages/index.tsx` | Keep | `pages/index.tsx` → `features/auth` |
| `pages/menu.tsx` | Rewrite view | `features/menu/MenuScreen.tsx` (+ `QuickMatchSheet`, `ContinueCard`) |
| `pages/characters.tsx` | Rewrite + split | `features/characters/*` |
| `pages/characters.tsx.backup` | **Delete** | — |
| `pages/profile.tsx` | Rewrite view + split | `features/profile/*` |
| `pages/shop.tsx` | Keep + extract | `features/shop/*`, `PurchaseConfirmDialog` (merged with characters) |
| `pages/missions.tsx` | Keep | `features/missions/*` |
| `pages/achievements.tsx` | Rewrite view | `features/achievements/*` |
| `pages/friends.tsx` | Keep | `features/friends/*` |
| `pages/matchHistory.tsx` | Rewrite view | `features/history/*`; delete `styles/matchHistory.css` |
| `pages/leaderboard.tsx`, `online.tsx`, `game.tsx` | Keep | lazy wrappers |
| `pages/AdminMissionsPage.tsx` | Keep | `features/admin/*` + `AdminLayout` |
| `pages/design-system.tsx` | Rewrite (dev-only) or Delete | `features/dev/TokenGallery` behind `import.meta.env.DEV` |
| `components/auth/AuthGuard.tsx` | **Delete** | — |
| `components/auth/LoginScreen*.tsx` | Rewrite view / keep tests | `features/auth/` |
| `components/common/AssetPreloader.tsx` | Keep, simplify | `app/AssetPreloader.tsx` |
| `components/common/MissionsModal.tsx` | **Delete** | — |
| `components/common/SettingsModal.tsx` | Merge | `features/settings/SettingsPanel.tsx` |
| `components/game/BattleArena.tsx` | Rewrite (split) | `Arena.tsx` + `TurnResultOverlay.tsx` |
| `components/game/BattleHeader.tsx` | Keep, restyle | `BattleHud.tsx` |
| `components/game/BattleUILayout.tsx` | Rewrite | `BattleLayout.tsx` |
| `components/game/CardHand.tsx` | **Delete** (harvest copy) | `lib/cards.ts` |
| `components/game/CardHandEnhanced.tsx` | Rewrite view | `Hand.tsx` |
| `components/game/CardItem.tsx` | Rewrite | `BattleCard.tsx` |
| `components/game/Character.tsx` | Keep | `features/battle/Character.tsx` |
| `components/game/GameArena.tsx` | Keep logic, extract overlay | `BattleScreen.tsx` + `WaitingRoomOverlay.tsx` |
| `components/game/GameOver.tsx` | Rewrite view | `features/battle/GameOver.tsx` |
| `components/game/GamePauseMenu.tsx` | Merge | `PauseSheet.tsx` (uses `SettingsPanel`) |
| `components/game/GamePrep.tsx` | Rewrite | `features/menu/PreDuel.tsx` |
| `components/game/QuickChat.tsx` | Keep, restyle | `features/battle/QuickChat.tsx` |
| `components/game/StatusBar.tsx` | **Delete** | — |
| `components/game/TurnResult.tsx` | **Delete** | — |
| `components/game/WoodenBattleHeader.tsx` | **Delete** | — |
| `components/game/uiPreferences.ts` | Keep (move) | `features/settings/uiPreferences.ts` |
| `components/layout/BottomNav.tsx` | Keep, restyle | `features/shell/BottomNav.tsx` |
| `components/layout/MobileLayout.tsx` | Rewrite | `app/AppShell.tsx` |
| `components/layout/ProfileDropdown.tsx` | Rewrite on `Menu` | `features/shell/ProfileMenu.tsx` |
| `components/layout/TopBar.tsx` | Keep, restyle | `features/shell/TopBar.tsx` |
| `components/leaderboard/Leaderboard.tsx` | Keep | `features/leaderboard/` |
| `components/lobby/OnlineLobby.tsx` | Keep | `features/lobby/` |
| `styles/battleHeader.css`, `App.css`, `index.css`, `tailwind.config.ts`, `assets/react.svg` | **Delete** | — |
| `styles/western.css` | **Delete** (after token rename) | — |
| `styles/mobileLayout.css` | Rewrite → Tailwind + `AppShell` | — |
| `styles/matchHistory.css` | **Delete** (after T14) | — |
| `styles/globals.css`, `animations.css` | Keep → split into `tokens.css`, `base.css`, `animations.css` | — |

### 10.3 Migration order (risk ladder)

1. **Phase A, foundations (no visual change intended):** harness, dead code, tokens, constants, motion, safe areas. T01–T06.
2. **Phase B, primitives:** built in isolation with the dev gallery; nothing migrated yet. T07–T11.
3. **Phase C, low-traffic pages first:** leaderboard → friends → history → achievements → missions → shop → characters → profile → lobby → settings → shell chrome → menu → login → dev page → admin. T12–T26.
4. **Phase D, desktop frame:** T27.
5. **Phase E, battle (highest risk, most-played screen):** layout grid → landscape → HUD → hand → turn result → game over → feedback → transitions. T28–T35.
6. **Phase F, performance and assets:** T36–T37.

Each ticket ships behind no flag (small enough to review). Rollback = revert one PR.

---
## 11. Ticket backlog (ordered by risk, lowest first)

Every ticket must: pass `npm run build`, `npm run lint` and `npm test`; include before/after screenshots from the T01 harness at 320, 375, 768, 1024, 1440 and 844×390 for the screens it touches; and change **no** game logic, Firebase data model, bot AI or matchmaking behavior.

Risk: 🟢 low · 🟡 medium · 🔴 high.

### Phase A: Foundations

**T01 · Visual QA harness** 🟢
- [ ] Add a Playwright project `visual` with viewports 320×640, 375×812, 768×1024, 1024×768, 1440×900, 844×390.
- [ ] Add a test-only auth bypass (Firebase emulator or a seeded test user via env) so protected pages render.
- [ ] Add a solo-battle fixture that seeds `gameStore` into `selecting`, `animating` and `game_over` states.
- [ ] Snapshot every route + battle states; store under `e2e/__screenshots__`.
- [ ] Document the commands in `docs/TEST_GUIDE.md`.
- *Out of scope:* fixing any defect found; CI gating on diffs.

**T02 · Tooling hygiene** 🟢
- [ ] Add `.gitattributes` (`* text=auto eol=lf`) and renormalize in a separate commit.
- [ ] Move custom breakpoints into `@theme` (`--breakpoint-*`) and delete `tailwind.config.ts`.
- [ ] Delete `src/App.css`, `src/index.css`, `src/assets/react.svg`.
- [ ] Move root status docs into `docs/archive/`, `docs/game/` and `docs/` per §6.2.
- *Out of scope:* any component or style change.

**T03 · Remove dead components and CSS** 🟢
- [ ] Delete `AuthGuard`, `MissionsModal`, `CardHand` (after T04 harvest), `StatusBar`, `TurnResult`, `WoodenBattleHeader`, `characters.tsx.backup`.
- [ ] Delete `styles/battleHeader.css` and its import in `globals.css`.
- [ ] Remove unused rules: `.settings-btn`, `@keyframes xpGlow`, unused animation classes (§5.2).
- [ ] Remove the unused notch probe in `App.tsx` and `--ios-notch-top` (replaced by T06).
- [ ] Confirm with `grep` + build that nothing imports them.
- *Out of scope:* restyling anything that remains.

**T04 · Single source for card UI metadata** 🟢
- [ ] Create `src/lib/cards.ts` with `CARD_META[card] = {label, description, cost, image}` and ability label → class/description maps.
- [ ] Use the more complete descriptions from `CardHand` (dodge streak, double-shot limit); Hugo reviews the copy.
- [ ] Replace the duplicated maps in `CardHandEnhanced`, `CardItem`, `BattleArena`, `GameOver`.
- [ ] Unit test: every `CardType` in `gameEngine` has metadata.
- *Out of scope:* changing card rules or costs in `gameEngine.ts`.

**T05 · Token layer + fonts + motion base** 🟡
- [ ] Split `globals.css` into `tokens.css` (raw + semantic tokens from §7.1, `@theme`), `base.css`, `animations.css`.
- [ ] Rename font tokens to `--font-western/-stats/-marker`; delete `western.css`.
- [ ] Keep every legacy color name as an alias so existing classes keep working.
- [ ] Add `text-muted`, `danger-text`, the z-index, radius, shadow and duration tokens.
- [ ] Add the global `prefers-reduced-motion` block (kills infinite loops, shake).
- [ ] Load fonts via `<link rel=preconnect>` + `<link>` in `index.html` (or `@fontsource`).
- *Out of scope:* replacing usages in components (done per page).

**T06 · Safe areas and viewport** 🟡
- [ ] `MobileLayout`: add left/right insets; remove the `.safe-bottom` spacer (double inset).
- [ ] Profile dropdown anchors to the TopBar bottom, not `top:76px`.
- [ ] Remove `maximum-scale=1, user-scalable=no` from `index.html`; add `touch-action: manipulation` to controls.
- [ ] Update `docs/NOTCH_SAFE_AREA.md` to describe the single-source rule (§7.2.3).
- *Out of scope:* battle screen insets (T28); visual restyle.

### Phase B: Primitives

**T07 · `Button`, `PlayButton`, `IconButton`** 🟢
- [ ] Implement variants and sizes from §7.3 on tokens only; real `disabled` and `loading` styles.
- [ ] Visible focus ring (`focus-ring` token).
- [ ] Dev gallery entry (`/dev/ui` behind `import.meta.env.DEV`).
- [ ] Unit tests: disabled blocks click; `IconButton` requires `label`.
- *Out of scope:* migrating call sites.

**T08 · `Panel`, `Badge`, `CurrencyChip`, `Avatar`** 🟢
- [ ] Panel tones `wood|surface|parchment|glass` (wood keeps the grain overlay from `.card-wood`).
- [ ] Badge tones for rarity, class (icon + word), status.
- [ ] CurrencyChip with optional animated `delta` (reduced-motion aware).
- [ ] Avatar sizes 24–96, rings, status dot with an accessible label.
- *Out of scope:* call-site migration.

**T09 · `Dialog`, `Sheet`, `Switch`, `Menu`** 🟡
- [ ] Portal into the shell root (`#app-overlay-root`) so overlays respect the shell on desktop.
- [ ] Focus trap, Esc, scroll lock, `role="dialog"`, `aria-modal`, labelled title.
- [ ] `Sheet`: bottom sheet below `@lg`, dialog above; bottom safe-area padding.
- [ ] `Switch` with `role="switch"`, `aria-checked`; `Menu` with button items and arrow keys.
- *Out of scope:* replacing existing modals.

**T10 · `Tabs`, `ProgressBar`, `Toast`, `States`, `RoundStars`, `Spinner`** 🟢
- [ ] `Tabs`/`SegmentedControl` with roving tabindex and a sliding indicator.
- [ ] `ProgressBar` (continuous and segmented, with an sr label).
- [ ] `Toast` queue with `aria-live="polite"`.
- [ ] Empty, loading (sheriff-star spinner) and error states; skeleton.
- *Out of scope:* call-site migration.

**T11 · `PageHeader` + container-query shell** 🟡
- [ ] `MobileLayout` main gets `container-type: inline-size`; scope the global `main{}` rule to the shell.
- [ ] `PageHeader` (title, subtitle, back, actions) with `display` clamped by `cqi`.
- [ ] Lint rule (or `grep` CI check) flagging new `md:`/`lg:` inside `src/features/**` except frame files.
- [ ] Docs: when to use `@container` vs viewport variants.
- *Out of scope:* migrating pages (each page ticket swaps its `md:` → `@md:`).

### Phase C: Page migrations (each: primitives, tokens, `@container` variants, a11y labels, PT-BR copy)

**T12 · Leaderboard** 🟢
- [ ] `PageHeader`, `SegmentedControl` ×2, `Avatar`, `Badge` "VOCÊ".
- [ ] Top-3 podium with numbers + rings (not color-only).
- [ ] Empty, loading and error via `States`.
- [ ] Replace `text-sand/30-50` with `text-muted`.
- *Out of scope:* ranking queries and sort logic.

**T13 · Friends** 🟢
- [ ] Tabs; rows with `Avatar status` + status word; actions as `IconButton` + overflow `Menu`.
- [ ] Player code in `stat` style (Oswald tabular), copy → `Toast`.
- [ ] 320 px: actions collapse into the overflow menu.
- *Out of scope:* friend request logic, `friendsStore`.

**T14 · Match history** 🟡
- [ ] Rebuild markup on primitives + Tailwind tokens; delete `styles/matchHistory.css`.
- [ ] Replace emoji stat icons with lucide icons + labels.
- [ ] Details grid: stacked by default, 3 columns at `@sm`.
- *Out of scope:* history fetching or `MatchSummary` shape.

**T15 · Achievements** 🟡
- [ ] Remove `min-h-screen`/own background; use the shell.
- [ ] Map stone/amber colors to `surface-wood`, `accent`, `text-muted`.
- [ ] Accordion rows with button semantics (`aria-expanded`); claim → stamp micro-interaction.
- [ ] `@lg:grid-cols-2` (container) instead of `lg:`.
- *Out of scope:* achievement evaluation or claim transactions.

**T16 · Missions** 🟡
- [ ] Normalize to the type scale (titles `heading`, body `body-sm`, tabs `button-sm`); tabs never wrap at 320.
- [ ] Difficulty `Badge` with word + dot; hard-coded hex → tokens.
- [ ] Hero banner height capped (120 px), art at `object-position` center.
- *Out of scope:* mission assignment, expiry, claim logic.

**T17 · Shop + `PurchaseConfirmDialog`** 🟡
- [ ] Extract one `PurchaseConfirmDialog` used by shop and characters.
- [ ] Remove the inner `max-h-[420px]` scroll; the page scrolls.
- [ ] Sort as `SegmentedControl`; hide placeholder sections (confirm with Hugo).
- *Out of scope:* prices, `buyCharacterInShop`.

**T18 · Characters (split)** 🔴
- [ ] Split `characters.tsx` (1215 lines) into `CharactersScreen`, `CharacterCard`, `CharacterSheet`, `ClassMasteryCard`.
- [ ] Minimum text `micro` (11 px): rarity and class chips via `Badge`.
- [ ] Grid 2 → `@md:3` → `@2xl:4` (container), toast via `Toast`.
- [ ] Detail as `Sheet` (no `z-[10000]`), CTA with safe-area padding.
- [ ] Nav label "Cartas" → "Personagens" (Hugo to confirm).
- *Out of scope:* unlock, mastery and purchase rules.

**T19 · Profile** 🟡
- [ ] Split into identity, overview, customize and stats sections with `Tabs`.
- [ ] Remove nested scroll areas.
- [ ] Unify the three stat-card styles into one `StatTile`.
- *Out of scope:* profile write paths, avatar data.

**T20 · Online lobby** 🟡
- [ ] `Tabs` Criar / Entrar / Salas; `Switch` replaces the local `Toggle`.
- [ ] Labels at `label` size (no 10 px Rye).
- [ ] Empty and loading states.
- *Out of scope:* room creation, config fields, lobby store.

**T21 · Settings panel + pause sheet** 🟡
- [ ] `SettingsPanel` shared by the TopBar sheet and `PauseSheet`.
- [ ] Reactive mute state (zustand) instead of `useRef`.
- [ ] Vibration preference read by `feedback` (T34); impact-effects toggle wired to the shake setting.
- [ ] Per D4: hide the language select and the guest "save progress" form until implemented, or keep with "Em breve".
- *Out of scope:* account linking, auth flows.

**T22 · Shell chrome: TopBar, BottomNav, ProfileMenu** 🟡
- [ ] TopBar fits at 320 (name ellipsis; trophies move to the menu below `bp-phone`).
- [ ] BottomNav `aria-current`, lock state for guest-restricted items (tap → explainer toast).
- [ ] `ProfileMenu` on `Menu` (buttons, keyboard), hides guest-restricted items for guests.
- [ ] Move CSS from `mobileLayout.css` into components/tokens.
- *Out of scope:* the missions listener logic; nav destinations.

**T23 · Menu + pre-duel** 🟡
- [ ] Character hero art; `PlayButton` ×2; `ContinueCard`; "Sala privada" entry to `/online`.
- [ ] `QuickMatchSheet` (fixes the `btn-red` bug); the ripple becomes a CSS press state.
- [ ] `PreDuel` carousel + `SegmentedControl` replaces the `GamePrep` accordion.
- [ ] Per U2 decision: guest state for "Jogar Rápido".
- *Out of scope:* `quickMatch`, resume and reconnect logic.

**T24 · Login** 🟢
- [ ] Hex → tokens; PT-BR visible copy matching `sr-only` (update tests).
- [ ] Landscape layout (logo left, panel right); logo height by `svh`.
- [ ] Error message uses `ErrorState`-style inline alert with `role="alert"`.
- *Out of scope:* auth providers, validation rules.

**T25 · Dev token gallery** 🟢
- [ ] Replace `design-system.tsx` with a gallery rendering tokens + primitives.
- [ ] Route only when `import.meta.env.DEV` (U5).
- [ ] Link to the Design System artifact.
- *Out of scope:* production routes.

**T26 · Admin layout** 🟢
- [ ] `AdminLayout` without TopBar and BottomNav; route moves out of `MobilePage`.
- [ ] Replace `font-bungee` with Oswald; neutral admin surface tokens.
- [ ] Desktop-first layout is acceptable here; verify at 1024 and 1440 only, plus a 375 smoke check.
- *Out of scope:* the Gemini call and key (U3, security); mission template logic.

### Phase D: Desktop

**T27 · Desktop app frame (per D2)** 🟡
- [ ] `AppShell` ≥1024: `NavRail` (same items as BottomNav), header row, content max 960 px.
- [ ] Overlays portal into the frame; dialogs center in the content column.
- [ ] Verify every page at 1024 and 1440 with the harness.
- *Out of scope:* battle screen; new desktop-only features.

### Phase E: Battle (highest risk)

**T28 · Battle layout grid** 🔴
- [ ] `BattleLayout` CSS grid (HUD / arena / hand); remove the drop-zone `top/bottom-[px]`, `pb-28`, QuickChat `bottom-[240px]`.
- [ ] Drop zone = arena row; QuickChat anchored to the hand row.
- [ ] Hand bottom safe-area padding; HUD top inset unchanged.
- [ ] Extract `WaitingRoomOverlay`; copy/share use `Toast` instead of `alert()`.
- [ ] Per U1 approval: share URL `/game/{id}` (no `#`).
- [ ] Regression: drag, double-tap, auto-fire on timeout and confirm all still resolve turns (manual + harness).
- *Out of scope:* `gameStore`, RTDB listeners, turn resolution.

**T29 · Landscape battle** 🔴
- [ ] `bp-short` layout: compact HUD, vertical hand on the right, characters sized by height.
- [ ] Turn result fits within 390 px of height.
- [ ] Verify 667×375 and 844×390 with notch left/right insets.
- *Out of scope:* forcing orientation; PWA manifest changes.

**T30 · Battle HUD** 🟡
- [ ] Tokens; `RoundStars`; ammo icons sized by container.
- [ ] Timer bar via one CSS animation per turn (no per-frame `setState`); same start reference (`turnStartedAt` online, local start offline).
- [ ] 1-HP state: static danger outline + one heartbeat on damage (no infinite pulse).
- *Out of scope:* timer duration, auto-fire rules.

**T31 · Hand and BattleCard** 🔴
- [ ] `BattleCard` from tokens (no inline style), labels ≥11 px, slight fan in portrait.
- [ ] Keyboard: arrow keys move, Enter selects, Enter again confirms; `aria-pressed`, disabled reason.
- [ ] Confirm always reachable in `HIDE_ALL` mode (U4).
- [ ] Event handlers moved as-is (no changes to selection, drag, double-tap or auto-fire logic).
- *Out of scope:* card availability rules, info-mode persistence.

**T32 · Turn result overlay** 🟡
- [ ] `TurnResultOverlay` in the arena row; staged reveal ≤1.2 s with `versus_icon`.
- [ ] Tap to skip; reduced-motion fade.
- [ ] Ability callouts as `Panel` rows with class `Badge`.
- *Out of scope:* `TurnResult` data shape, timing of phase transitions in the store.

**T33 · Game over and rewards** 🟡
- [ ] Staged sequence (§8.5) with skip; count-ups via `CurrencyChip delta` and `ProgressBar`.
- [ ] Unlocks show character portrait + name (lookup via `lib/characters`).
- [ ] Real disabled state while saving; level row only when the level changed.
- *Out of scope:* `recordMatchResult`, reward amounts, rematch logic.

**T34 · Feedback service (audio + haptics)** 🟡
- [ ] `lib/feedback.ts` event API; lazy Howl creation; respects mute, vibration and reduced motion.
- [ ] Emit events from Hand, Arena, GameOver, TopBar currency changes.
- [ ] Per D3: wire audio files or keep sound dormant; haptics on Android.
- *Out of scope:* new audio production.

**T35 · Transitions and preloader** 🟢
- [ ] `AnimatePresence` route transitions (fade + 8 px rise; battle dust wipe).
- [ ] Remove the 1.2 s artificial preloader delay; show progress with the sheriff spinner.
- [ ] Reduced-motion variants.
- *Out of scope:* changing what assets are preloaded beyond the delay.

### Phase F: Performance and assets

**T36 · Derived image sizes (per D5)** 🟡
- [ ] Script (extend `optimize_images.js`) that writes `@1x/@2x` webp variants beside the originals.
- [ ] `srcset` in `BattleCard`, nav icons, currency, class icons.
- [ ] Exclude `public/**/png/` from `dist/` (move to `art-src/`) once nothing references it.
- [ ] Export proper PWA icons (192/512 PNG + maskable).
- *Out of scope:* editing or regenerating art.

**T37 · Route-level code splitting** 🟢
- [ ] `React.lazy` for every page wrapper; `Suspense` with `LoadingState`.
- [ ] Split `firebase` and `framer-motion` into vendor chunks; target main chunk < 500 kB.
- [ ] Prefetch the battle chunk when the menu mounts so starting a duel has no loading flash.
- *Out of scope:* changing Firebase initialization.

---

## 12. Proposed root `CLAUDE.md` (for Hugo's approval)

```markdown
# Big Bang Duel: agent guide

## Stack
- App lives in `duelo/`: Vite 7 + React 19 + TypeScript 5.9 + Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first config) + Firebase (Auth, Firestore, RTDB) + zustand + framer-motion + howler. Deployed on Vercel (SPA rewrite in `vercel.json`).
- Commands (run in `duelo/`): `npm run dev`, `npm run build` (must pass), `npm run lint`, `npm test`, `npm run test:e2e`.

## Boundaries
- Do NOT change game rules (`lib/gameEngine.ts`), bot AI (`lib/botAI*.ts`, `public/data/strategy_*.json`), matchmaking/rooms (`hooks/useFirebase.ts`), the Firebase data model or rules, or auth flows unless the task says so explicitly.
- Never delete or regenerate art in `public/assets/`. New derived sizes go beside originals.
- Docs live in `duelo/docs/`. Do not add status reports at the repo root.

## Design system rules
- Tokens are defined only in `src/styles/tokens.css` (`@theme`). Never write hex, rgb(a) or arbitrary `-[...]` values in TSX outside `src/ui/`.
- Use primitives from `src/ui/` (Button, Panel, Dialog, Sheet, Tabs, Badge, ProgressBar, CurrencyChip, Avatar, Switch, Toast, Menu, States, PageHeader). Add a variant before adding a one-off.
- Fonts: `font-western` (Rye) for display and buttons, `font-stats` (Oswald) for everything else, `font-marker` for rare accents. No `font-sans`, `font-mono` or other families.
- Minimum text size is 11 px (`micro`). Muted text uses `text-muted`, never `text-sand/50`.
- z-index only from the scale (`z-content` … `z-system`).
- Every animation needs a reduced-motion path (`MotionConfig reducedMotion="user"` + CSS media query). No infinite loops under reduced motion.
- Interactive elements are `<button>`/`<a>`, have a visible focus ring, and icon-only buttons have an aria-label. Dialogs use `Dialog`/`Sheet` (focus trap, Esc).
- UI copy is PT-BR.

## Responsive rules
- Mobile-first. Inside pages and features use container variants (`@sm: @md: @lg:`), not viewport variants. Viewport variants (`md: lg:`) are only for `AppShell` and `BattleLayout`.
- Verify at 320, 375, 768, 1024, 1440 and landscape 844×390 (`npm run test:visual`).
- Safe areas: the shell/HUD adds top, BottomNav/hand adds bottom, the outer frame adds left/right, exactly once. Use `100dvh` for the shell and `100svh` for battle.
- Battle layout is a CSS grid. Never position battle layers with fixed pixel offsets.

## Conventions
- Feature code in `src/features/<feature>/`, primitives in `src/ui/`, pages are thin lazy route wrappers.
- Shared UI metadata for cards lives in `src/lib/cards.ts`; never redeclare card labels or images.
- Keep PRs to one ticket from `docs/REDESIGN_BLUEPRINT.md` §11; include harness screenshots.
```

---

## 13. Validation of this blueprint

- [x] Covers 100% of `src/pages/` (15/15, §3.1) and `src/components/` (30/30, §4), each with a status and a decision (repeated in §10.2).
- [x] Backlog has 37 tickets, each with 3–8 checklist items and an explicit *Out of scope* line, ordered by risk within phases (§11).
- [x] No source file outside `duelo/docs/` was modified by this work; this file is the only addition. `npm run build` was verified passing on an untouched clone of `main@3fd631d`.
- [x] Route list confirmed against `App.tsx` (§1.1); mismatches reported.
- [x] Assets noted, none moved (§6.1). Logic and security issues flagged, not fixed (§2.3).

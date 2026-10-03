# CLAUDE.md

Instructions for AI coding agents working on Big Bang Duel. Rules are labelled **Active now** or **Active after T##**. Do not treat "Active after" rules as existing structure until that ticket merges.

## Stack (Active now)

- App lives in `duelo/`. Run all commands from there.
- React 19, Vite 7, TypeScript ~5.9, React Router 6, Zustand 5, Tailwind CSS 4 (`@tailwindcss/vite`), framer-motion, lucide-react, howler.
- Firebase 12 (Firestore + RTDB). Hosting config in `firebase.json`; deploy config in `duelo/vercel.json`.
- Tests: Vitest + Testing Library (`npm test`), Playwright (`npm run test:e2e`).
- Commands: `npm run dev`, `npm run build` (`tsc -b && vite build`), `npm run lint`, `npm test`.
- Docs live in `duelo/docs/`. No status reports at the repo root.

## Boundaries (Active now)

- Redesign work is visual only. Do not change game logic, bot AI, matchmaking, the Firebase data model or security rules unless a ticket says so.
- Do not modify original image assets. Derived sizes are allowed (see D5).
- One ticket = one PR. Touch only files the ticket names.
- Real-time Firestore listener in `src/store/authStore.ts` is the source of truth. Do not update local state after Firestore writes.

## Design system rules

- **Active now:** keep the Western look in `duelo/docs/archive/DESIGN_SYSTEM.md` and the references in `Inspiration_images/`. Existing color/font names stay valid.
- **Active after T05:** colors, spacing and type come from semantic tokens in `tokens.css`. No new hardcoded hex values in components. Legacy token names remain as aliases (D1).
- **Active after T07–T10:** build screens from primitives in `src/ui`. Do not add one-off buttons, cards or modals.

## Responsive rules

- **Active now:** mobile-first. Keep safe-area handling (`duelo/docs/archive/NOTCH_SAFE_AREA.md`).
- **Active after T11:** components size themselves with container queries, not viewport breakpoints.
- **Active after T11:** at ≥1024 px non-battle pages render inside the desktop app frame with a side rail (D2). Battle pages are excluded.

## Conventions (Active now)

- TypeScript strict, function components, hooks, Zustand stores in `src/store`, shared Firebase operations go in `src/lib/firebaseService.ts`. Redesign tickets do not move Firebase code.
- UI text is PT-BR only (D7). No i18n layer.
- Match surrounding code style. Prefer Tailwind utilities and existing CSS in `src/styles`.
- Add or update tests for logic you change.

## Approved decisions

- **D1** Semantic tokens approved. Legacy names kept as aliases.
- **D2** Desktop app frame with side rail at ≥1024 px for non-battle pages.
- **D3** No audio files for now. Haptics and visual feedback only. Audio hook stays dormant.
- **D4** Hide non-working Settings controls.
- **D5** Derived image sizes allowed. Originals untouched.
- **D6** U1, U2, U4, U5 approved.
- **D7** PT-BR is the single UI language.

## Ticket workflow

- One ticket per PR.
- **Active after T01:** attach before/after screenshots from the visual harness (`npm run test:visual`, arrives with T01).
- `npm run build`, `npm run lint` and `npm test` must pass before opening the PR.

## Known issues, out of scope

- `src/pages/AdminMissionsPage.tsx` calls Gemini from the browser. Key already rotated; server-side move still pending.
- Admin role check is client-side only.

# UI Redesign Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for the main implementation; independent motion work and a final fresh review may be delegated.

**Goal:** Redesign all existing surfaces and add purposeful game motion without adding runtime dependencies.

**Architecture:** Preserve server pages, shared primitives, translation dictionaries, API contracts, and the authoritative game snapshot flow. Replace visual styling and page composition; isolate board animation to SVG/CSS and presentation helpers.

**Tech Stack:** Existing Next.js, React, TypeScript, Tailwind, CSS, SVG, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-29-ui-redesign-design.md`

## Global Constraints

- Work only in `codex/ui-redesign`; do not merge or push to main.
- No runtime dependencies, backend changes, speculative game state, or new product features.
- Preserve English/French/Arabic/RTL, light/dark, native keyboard activation, focus, and HTTPS.
- Respect reduced motion; animations must not delay an action or connection recovery.

## Review Focus

- Small screens and long Arabic/French content must not clip or create horizontal page scrolling.
- Confirmed moves must retain the same cell button and keyboard focus during animations.
- Reconnected snapshots must remain authoritative and stale snapshots must not replay marks.
- Reduced motion must expose final mark and winning-line geometry without animation.
- Destructive dialogs, registration legal links, admin forms, and existing validation must remain usable.

### Task 1: Shared visual system and page composition

**Files:** `src/frontend/styles/index.css`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/play/page.tsx`, login/register pages, `src/frontend/layout/preferences.tsx`, new geometric artwork/navigation components, and licensed static font assets.

**Interfaces:** Reuse existing translation keys and primitives. Shared CSS classes preserve the feature components' contracts.

- [x] Establish isolated branch/dependencies and run baseline tests.
- [x] Inspect incumbent rendered desktop/mobile before editing.
- [x] Implement paper/forest/lime tokens, locally hosted type, responsive shell, active navigation, lobby composition, auth framing, and consistent supporting surfaces.
- [x] Inspect desktop/mobile/RTL and both themes; exercise public/account/admin forms with existing browser journeys.

### Task 2: Board and result motion

**Files:** `src/frontend/features/games/components/Board.tsx`, `LiveGame.tsx`, `src/frontend/features/games/lib/board-presentation.ts`, `tests/server/board-presentation.test.ts`. Main stylesheet remains owned by Task 1.

**Interfaces:** Preserve GameBoard props and LiveGame request/recovery behavior. Expose presentation classes for drawn marks, active player, finished match, and winning line. Geometry uses board thirds and no layout-dependent measurements.

- [x] Write and run failing geometry tests for horizontal/vertical/both diagonal winning lines and absent/invalid lines.
- [x] Implement geometry helper, SVG stroke markup, winning overlay, and player state attributes.
- [x] Run focused tests, whole server suite, and typecheck.
- [x] Verify keyboard focus, replay behavior, reduced motion, and draw/win/waiting states in browser.

### Task 3: Final verification, review, and handoff

**Files:** browser coverage as needed, `DESIGN.md`, `.impeccable/surfaces/tic-tac-toe.md`, `PRODUCT.md` interface notes.

**Interfaces:** Document only the shipped system and the branch's actual test evidence.

- [x] Run typecheck, lint, server suite, production build, isolated real-browser coverage.
- [x] Capture and open the required desktop/mobile/theme/RTL evidence; run Impeccable detector once on changed UI.
- [x] Obtain fresh code and visual review, fix material findings, and verify affected checks.
- [x] Update durable design documentation, commit only this branch, and report its name, commits, verification and any limitations.

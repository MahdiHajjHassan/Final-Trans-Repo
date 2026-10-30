# UI redesign integration handoff

Branch: `codex/ui-redesign`, based on `c3ff68d`.
Initial implementation commit: `98a84bc`; a follow-up fixes room-code form
alignment and records the final verification.
Worktree: `/workspace/Transcendence2/.worktrees/ui-redesign`.
The owner requested a separate branch for later synchronization with concurrent
feature work. Nothing was pushed or merged into main.

## Changes

The current revision restores the rounded Readex Pro appearance: large geometric
type, a tilted finished-board illustration, bold round-ended marks, rounded
controls and filled navigation states. Burgundy/rose accents, ivory light
surfaces and wine-dark surfaces remain; green and orange are excluded. The
serif/fine-line revision is superseded, and Readex Pro is the only local font.
Responsive lobby/authentication compositions, shared forms, tables, legal pages
and browser icons remain. React/Next.js/TypeScript/Tailwind and package
dependencies are unchanged.

Confirmed X/O marks draw in SVG, player emphasis follows the saved turn, and a
line draws through a winning trio. The result and dialogs have bounded motion.
Reduced motion renders finished strokes immediately; old boards do not replay
their initial marks. Cell buttons and focus remain stable. Rematch navigation is
immediate rather than waiting for a clearing sequence.

## Restored rounded revision verification — 2026-10-30

The owner rejected the serif/classy revision and requested the earlier look
without green or orange. The rounded appearance was restored from `66497af`,
retaining the burgundy palette. Instrument Serif and its unused asset were
removed; Readex Pro is the sole self-hosted font again.

- A fresh production image build and all 29 Chromium browser tests passed,
  including both-theme contrast, RTL, focus, motion and reduced motion.
- ESLint, source audit and diff integrity checks passed.
- Ten valid lobby/game captures cover light/dark desktop and phone layouts.
- An independent Impeccable visual review returned `ship`, with no material
  fixes. The detector reported 41 advisory entries and no non-advisory findings.

Current previews are `.impeccable/review/rounded-burgundy-comparison.png` and
`rounded-burgundy-game-comparison.png`, with individual desktop and mobile
captures under the same prefix. The verification sections below are historical.

## Superseded serif revision verification — 2026-10-30

The owner requested burgundy and a classy, elegant game, rejecting green,
orange and the classroom paper/pen impression. The revision changes the visual
system and typography while keeping the existing game and application flows.

- Fresh production image build passed, including TypeScript checking.
- All 29 Chromium browser tests passed with HTTPS validation, including both
  themes, contrast, Arabic/RTL, keyboard focus, motion and reduced motion.
- ESLint and source/artifact audit passed. No package dependencies were added.
- Ten valid rendered artifacts show the lobby and a real saved game in light,
  dark, desktop and phone views, plus two side-by-side comparisons.
- An independent Impeccable visual reviewer returned `ship` for this directed
  revision, with no material fixes.

The revision's detector run returned 38 advisory entries and one overused-font
warning for Instrument Serif. The font was retained for the requested slim,
high-contrast display voice; the visual reviewer found no visible fit problem.

That revision's historical previews are in `.impeccable/review/burgundy-comparison.png` and
`burgundy-game-comparison.png`, with full-size individual `burgundy-light.png`,
`burgundy-dark.png` and `burgundy-game-*` captures beside them.

The verification record below is the initial redesign's historical evidence.

## Initial redesign verification — 2026-10-30

| Check | Result |
| --- | --- |
| `npm test` | 134 tests passed, 27 files |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings |
| `npm run build` / isolated production image build | Passed |
| `npm run audit:source` | Passed; PDFs unchanged, private artifacts absent |
| Full Playwright suite | 29 tests passed in distro Chromium 154.0.8037.57 |
| Final rendered capture matrix | 19 captures, no document overflow or page errors |

Playwright used the `chrome` project with `/usr/bin/chromium`; this is not a
claim of actual Google Chrome, Firefox or Edge verification. HTTPS certificate
chain and hostname validation stayed enabled. The isolated test project was
`tictactoe-e2e-redesign`, port `8543`, credentials file `.env.redesign-e2e`.

The browser checks cover both themes, translations/RTL, keyboard focus, reduced
motion, winning geometry, initial-mark replay suppression, server rendering
without JavaScript, reconnect/stale snapshots, uncertain responses, secure
accounts, user administration and registration legal-link preservation. A fresh
code reviewer found French admin navigation overflow at 320px; the new regression
test observed 355px before restoring wrapping and passed after the fix.

The independent visual review matched the direction contract and requested one
room-code form grouping fix. Its regression test observed a 32.78px desktop
offset and a mobile action beside the hint before the fix. The final form aligns
the desktop action with the input and stacks the full field above its action on
phones. The fresh-image suite passed, and the reviewer scored that listed fix
resolved from recaptured desktop/mobile screenshots (`ship` at that scope).

Impeccable's detector ran once: 42 advisory entries for typography/radius/color
variants and no non-advisory findings. Those variations are described in the
design documentation; the detector does not replace rendered review.

Screenshots and capture metadata are preserved locally in the worktree's ignored
`.impeccable/review/`, including `desktop.png`, `mobile.png`,
`game-win-desktop.png`, `game-win-mobile.png` and `measurements.json`.
The actual-browser `motion-preview.gif` and `motion-preview.webm` show confirmed
moves, player emphasis and a diagonal win; no simulated game state was used.

## Synchronizing feature work

The highest overlap is `src/frontend/styles/index.css`, the locale layout and
play/login/register pages, `src/frontend/layout/preferences.tsx`, and the Board
and LiveGame presentation components. Header links now live in
`src/frontend/layout/Navigation.tsx`; integrate any new feature navigation there.
The shared component and translation contracts are retained. This branch changes
no backend service, API route, database schema or game rule.

`DESIGN.md`, `PRODUCT.md`'s Interface section, the tic-tac-toe surface brief and
`.impeccable/design.json` describe the finished visual system for future screens.
The local font is a licensed static asset, not an additional runtime technology.

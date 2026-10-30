# Whole application redesign

Latest revision, 2026-10-30: the owner rejected the classy/serif revision and
requested the earlier rounded look with no green or orange. Restore the original
Readex typography, rounded controls and bold board geometry while retaining the
burgundy/rose palette. The original direction below records the first
implementation; DESIGN.md is the current visual authority. Existing product and
stack constraints below still apply.

The owner authorized autonomous implementation on a separate branch while another session develops features. Keep this work in `codex/ui-redesign`, based on `c3ff68d`; do not merge or push to main. Deliver a committed branch for later synchronization.

## Intent and constraints

Make this small tic-tac-toe game feel considered, distinctive, and enjoyable throughout: guest play, signed-in lobby, live matches, authentication, account, user administration, legal, and recovery screens. Preserve all existing product behavior, translations, backend contracts, stable board focus, HTTPS, server-authoritative moves, reduced-motion support, and both themes. Keep Next.js/React/TypeScript/Tailwind; add no runtime dependencies. A self-hosted, licensed font is a static asset, with no external runtime request.

## Approach

Retheme-only would leave the current composition too sparse; replacing the component stack would add needless integration and explanation costs. Recompose the existing pages and shared components, retaining their behavior. The owner delegated remaining visual choices when authorizing implementation after the proposed whole-project workflow and animation examples.

## Direction contract

THESIS: A welcoming modern game club: obvious choices, a generous playing surface, and expressive geometric marks.

OWN-WORLD: Warm paper, deep forest-green framing, lime actions with dark ink, blue X and coral O. A geometric, locally hosted typeface carries Latin and Arabic. Strong scale in the lobby, quieter precision in forms and tables. No gradients, remote fonts, decorative loops, or invented product claims.

STORY: Arrive, choose a computer or friend, make a move, understand the turn and result, and play again. Supporting screens share the shell and controls without imitating the game board.

FIRST VIEWPORT: Familiar header navigation and preferences; guest introduction and account entry beside a crisp geometric board composition. Signed-in play puts game choices first and recent games below. Live matches center the interactive board, player identities, turn status, and connection feedback.

FORM: Code-first Operate surface; seed:a2af097c0c4c51c8. Grounded candidate 4, modern recreation club. Other grounded systems considered: tabletop game publisher, schoolyard play, sports scorebook, grid typography, family game night, and public play pavilion. Grid typography contributes precision; garden-map palette contributes confident flat color; exposure sheets, timetable rack, and reference-setting challengers are declined because they make ordinary play less immediate. The owner delegated selection; no claim of an attended concept vote.

## Motion

Draw confirmed X/O marks, transition player emphasis, draw a line through a winning trio, and give the result a bounded reveal. Use SVG/CSS without delaying inputs, making optimistic moves, replaying old marks on snapshots, or replacing focused cell buttons. Reduced motion presents finished strokes and results immediately. Rematches navigate to a new saved game immediately; no clearing choreography delays or obscures committed state.

## Verification

Run existing server tests, typecheck, lint, production build, and isolated browser journeys. Inspect desktop/360px, light/dark, French/Arabic RTL, forms, legal content, match states, and keyboard use. Add focused coverage for winning-line geometry and the reduced-motion contract. Keep preview databases and server ports separate from the other session. Update design guidance from the finished implementation; leave all game/backend feature additions out of scope.

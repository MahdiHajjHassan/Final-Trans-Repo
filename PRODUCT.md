# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Audience and goal

A small 42 ft_transcendence game, playable and explainable by the accepted
**three-person** team: Mahdi (mahajj-h), Joseph (jboustan) and Khalid (ksayour,
42 campus login). The owner confirmed Khalid joined on 2026-10-29. The goal is a complete tic-tac-toe application
that satisfies mandatory requirements and at least14 demonstrated module points.
Official scoring and human explanation are separate from automated tests.

## Confirmed product

Tic-tac-toe with both friend play in separate signed-in browser sessions on one
computer and a local computer opponent. The owner authorized the game implementation and removal of superseded
product material.

Guests read rules and create accounts. Members create/join invitation rooms,
play alternately, resume committed matches, resign or play again. AI replies
server-side and intentionally permits imperfect choices. Administrators create,
list, edit and delete users and manage roles, with a final-administrator guard.
Deletion safely resolves/anonymizes games and revokes the removed user's access.

## Technical choices

Node24/npm, pinned Next/React/TypeScript, Prisma/SQLite, Tailwind/shared semantic
CSS tokens and Caddy local HTTPS. Server transactions own moves, turns and
results. Scoped SSE publishes canonical snapshots after commits; the client
filters stale versions and reads current state after reconnect. A lost response
never triggers an automatic move retry. Single application process is the target.

## Interface

The rounded modern game-club appearance uses burgundy/rose accents, ivory light
surfaces and wine-dark surfaces. Local OFL Readex Pro supplies display headings,
body text and Arabic. The tilted decorative board, bold round-ended X/O marks,
rounded controls and filled navigation states carry the identity. The serif and
fine-line revision is superseded. Runtime font requests remain local.

Guest entry introduces the game and account actions; signed-in play prioritizes
computer/friend choices. Live matches center the square board, player identities,
turn/result feedback and explicit recovery. Forms, tables and legal pages reuse
the shared controls. See DESIGN.md for extracted visual tokens.

English/French/Arabic, logical RTL layout, LTR room codes and board positions,
360px and desktop widths, both themes, stable keyboard focus and legal form
preservation remain required. SVG/CSS motion describes confirmed marks and
results, finishes promptly and respects reduced-motion preferences. Server state
continues to own moves and results. Legal links open separately, preserving the
original form without storing its password in browser storage.

## Modules and verification

The previously verified baseline is 16 candidate points. The three added modules
are full user management (2), four-player tournament (1), and full statistics/
history (1), for a 20-point candidate target after the current verification.
Profiles, safe uploaded/default avatars, consent-based friends and session presence
extend secure accounts. Fixed numbered seats create two semifinals and one final;
draws replay, deletion cancels unfinished work. History and standings derive from
saved games, with achievements/progression and explicit competitive exclusions.
No spectator or remote-player module, chat, OAuth, app 2FA or ELO engine is added.
Production now includes completed email ownership verification; preserve its gates and delivery configuration.
Use README.md, docs/requirements/module-matrix.md and
 docs/evaluation/2026-10-30-khalid-modules.md for executed checks and limits.

## Delivery constraints and authorship

The owner authorized implementing and pushing this package to Transcendence2
pre-prod and preparing a prod-compatible branch plus a manual for Khalid's own
verification/integration/push. The owner subsequently authorized this specific Git promotion from ksayour-42. No external runtime deployment.
Production is MahdiHajjHassan/Final-Trans-Repo; preserve its history and runtime
cookie/header conventions in the prepared port. Preserve private environments,
normal data and certificate volumes. Tests reset only guarded isolated databases.

Superpowers and vendored Impeccable are required; other skills need owner approval.
Implementation is Mahdi/Codex-assisted. Record Joseph's and Khalid's actual review,
adaptation, verification and delivery only after they occur, under their real
identities. Earlier implementation history remains available in Git.

# Joseph / Claude — Tic Tac Toe handoff

Read AGENTS.md, README.md, DESIGN.md, docs/requirements/module-matrix.md and
 docs/evaluation/tic-tac-toe-evidence.md before changing the application.
The accepted team is Mahdi (mahajj-h) and Joseph (jboustan).

## Current source

The friend/computer game, secure accounts, administrator CRUD, scoped SSE,
SSR, themes and en/fr/ar/RTL are implemented in Transcendence2 staging.
The implementation commit is acfb60facedc71166c272276aa361ad69da0cb5b;
PR #1 was merged into main as 2cb312ce783365073d2d7584def5c97b77d43860.
Use docs/delivery/PUSH-MAP.md for current delivery references.

Review and reuse the tested source; preserve its actual Mahdi/Codex authorship.
Record Joseph's actual review, adaptation, authenticated commits and explanation
in docs/team/contributions/joseph.md only when they happen. Verify the acting
GitHub account and normal author identity before pushing.

## Working boundaries

Use docs/api/auth.md and docs/api/games.md for the same-origin HTTPS contracts.
Run npm test, npm run typecheck, npm run lint and npm run build after code changes.
For browser verification use the isolated tictactoe-e2e project prefix and a high
port, with its own ignored environment file. Never reset the ordinary database.
Read README.md for strict certificate trust and browser commands.

The current candidate target is 15 points; G09 remains unclaimed pending a
complete demonstration on the required browsers. Human understanding and
contribution are separate from automation. No final-history delivery, external
deployment, credential disclosure or data-volume deletion is authorized.

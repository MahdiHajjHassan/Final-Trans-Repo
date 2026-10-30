# Joseph / Claude — Tic Tac Toe handoff

Read AGENTS.md, README.md, DESIGN.md, docs/requirements/module-matrix.md and
docs/evaluation/2026-10-30-khalid-production.md before changing the application.
The accepted team is Mahdi Hajj Hassan (mahajj-h), Joseph Boustany (jboustan)
and Khalid Sayour (ksayour).

## Current source

The friend/computer game, secure accounts, administrator CRUD, scoped SSE,
SSR, themes and en/fr/ar/RTL are implemented in Final-Trans-Repo production
source, with email ownership verification, profiles/friends/presence,
four-player tournaments and statistics/history. Development remains in
Transcendence2 (ppd). The original game implementation commit is
acfb60facedc71166c272276aa361ad69da0cb5b; staging PR #1 merged as
2cb312ce783365073d2d7584def5c97b77d43860.
Khalid's authenticated GitHub account ksayour-42 delivered module integration
PR #11, merged as 61611fc4f91446835f13876aaa5e8ddd7268af1f. Use
docs/evaluation/2026-10-30-khalid-production.md for current delivery references.

Review and reuse the tested source; preserve its actual Mahdi/Codex authorship.
Khalid's assigned G12 user management (2), G13 tournament (1) and G14
statistics/history (1) total four candidate points; the account integration
does not establish personal implementation or understanding. No completed
Joseph-authored feature work or personal demonstration is recorded yet.
Record Joseph's actual review, adaptation, authenticated commits and explanation
in docs/team/contributions/joseph.md only when they happen. Verify the acting
GitHub account and normal author identity before pushing.

## Working boundaries

Use docs/api/auth.md and docs/api/games.md for the same-origin HTTPS contracts.
Run npm test, npm run typecheck, npm run lint and npm run build after code changes.
For browser verification use the isolated tictactoe-e2e project prefix and a high
port, with its own ignored environment file. Never reset the ordinary database.
Read README.md for strict certificate trust and browser commands.

The current candidate target is 20 points; G09 uses actual Chrome, Firefox and
Brave. Human understanding and contribution are separate from automation.
Follow AGENTS.md and the owner's task-specific delivery authorization; the
completed module promotion does not authorize a new production push. No external
deployment, credential disclosure or data-volume deletion is authorized.

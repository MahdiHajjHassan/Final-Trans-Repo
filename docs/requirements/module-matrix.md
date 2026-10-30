# Tic-tac-toe traceability

Candidate points are not awarded scores.
The owner-confirmed roster is Mahdi, Joseph and Khalid (42 login ksayour).

| ID | Module | Points | Source | Proof |
| --- | --- | ---: | --- | --- |
| G01 | Frameworks | 2 | src/app, src/frontend, src/backend | Build, HTTP and full browser flows |
| G02 | Web game | 2 | backend/modules/games; frontend/features/games | Eight lines/draw, actual human win/draw/replay/resign |
| G03 | AI | 2 | backend/modules/games/engine | Literal competence/imperfect-policy tests, browser game |
| G04 | Real-time | 2 | backend/modules/realtime; frontend/features/games | Scoped/revoked/aborted streams, friend/reconnect browser checks |
| G05 | ORM | 1 | prisma/schema.prisma, migrations | Real SQLite, uniqueness, join/move/resign races |
| G06 | Design system | 1 | src/frontend/components/ui, DESIGN.md | Eleven composed shared primitives, rendered appearance checks |
| G07 | Three languages | 1 | i18n/dictionaries | Key parity, en/fr/ar UI/legal flows |
| G08 | RTL | 1 | locale layout, logical CSS, bdi | Arabic 360px, code direction, no overflow |
| G09 | Extra browsers | 1 | playwright.config.ts | Current actual Chrome/Firefox/Edge matrix; historical Windows failure retained |
| G10 | SSR | 1 | play and game server pages | Real saved board and metadata with JavaScript disabled |
| | Core target | 14 | | Mandatory requirements separate |
| G11 | Advanced permissions | 2 | auth/users/admin | Current-role CRUD, revocation, last-admin concurrency, deletion |
| | Verified baseline | 16 | | No extra auth/theme points |
| G12 | Full user management | 2 | profiles/friends/presence, member UI | Safe identity, avatar validation, consent, presence, access/race tests and browser journeys |
| G13 | Four-player tournament | 1 | tournaments and game settlement | Registration/pairings, draw replay, concurrent advancement, final, deletion and browser journey |
| G14 | Statistics/history | 1 | statistics query and history/leaderboard UI | Canonical eligibility, ranking, history privacy, achievements, progression and browser journeys |
| | Candidate target after current verification | 20 | | Official assessment and mandatory email work remain separate |

See [current evidence](../evaluation/2026-10-30-khalid-modules.md) for executed results
and limits, including the pending separate email work. Historical evidence remains
in [the original report](../evaluation/tic-tac-toe-evidence.md).
Human contribution and understanding require
actual recorded demonstration, independently of automation.

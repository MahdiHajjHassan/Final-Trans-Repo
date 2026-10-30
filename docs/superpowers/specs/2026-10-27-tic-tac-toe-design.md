> Delivery update2026-10-27: the later owner request authorizes staging commit/push. Earlier no-commit restrictions below describe the implementation phase. No final-repository delivery or external deployment is authorized.

# Tic-Tac-Toe Design

Status: owner-approved for implementation on 2026-10-27; execution evidence is recorded separately.

## Owner direction

On 2026-10-27 the owner approved a tic-tac-toe project that satisfies the
assignment, with friend and computer modes and an accepted two-member team.
The selected approach uses the existing Node/Next/Prisma/SQLite/Caddy stack and
its secure account foundation for one focused game application.

Standing constraints: one-computer demonstration, secure accounts, HTTPS,
containers, English/French/Arabic, RTL, light/dark mode, Superpowers/Impeccable
and genuine contribution records. Later owner instructions authorize staging
commits/pushes and removal of superseded product files. Preserve private .env,
certificate material, runtime data and original reference PDFs. No external
deployment or final-history delivery is authorized.

## Product and scope

Working application name: Tic Tac Toe. A visitor immediately understands the
3-by-3 game and can sign in to play. The primary actions are Play computer,
Create friend game, and Join with code. The playable board is the main surface.

- Friend play: two different authenticated users in separate browser sessions
  on the same computer. The creator is X and the joining player is O; X starts.
- Computer play: the signed-in human is X and the server-controlled opponent is O.
- Normal rules: alternate moves into empty cells; a row, column or diagonal of
  three wins; a full board without a winning line is a draw.
- Show assigned mark, opponent, turn, connection state, result and winning line.
- Support cancellation before a friend joins and resignation during a match.
- Play again starts a new game. For friend play it creates a new room/code;
  the second player must join again. No automatic rematch consent is assumed.
- Keep a short personal list of ongoing and completed games with Resume/View.
  This does not claim the separate game-statistics module.
- Retain secure account/profile/password controls, admin user management,
  relevant legal pages and complete translated interface/error states.

Unrelated productivity features and public API keys are outside this product. Friends/social chat, avatars,
tournaments, leaderboards, ranks, achievements, extra games, OAuth, PWA, and
game customization are outside this bounded plan.

## Module target and evidence

These are planned candidate points, awarded only after functional demonstration.
The current evidence withholds G09 and records 13 core + 2 buffer = 15 points;
README.md and docs/requirements/module-matrix.md use the same module IDs.
Basic email/password login and theme switching do not earn separate points.
Remote-players points are not claimed: a second computer is not required.

| ID | Module | Points | Demonstration |
| --- | --- | ---: | --- |
| G01 | Frontend and backend frameworks | 2 | React pages and real Next server routes/services |
| G02 | Complete web-based game | 2 | Two humans complete live wins, losses and draws |
| G03 | AI opponent | 2 | Explainable, competent and imperfect computer player |
| G04 | Real-time features | 2 | Scoped server push, reconnect/resync and cleanup |
| G05 | ORM | 1 | Prisma relations, migrations and actual SQLite queries |
| G06 | Custom design system | 1 | Eleven used shared components, tokens, authored X/O marks and game favicon |
| G07 | Three languages | 1 | Complete English, French and Arabic flows and errors |
| G08 | RTL | 1 | Proper Arabic direction, mirrored layout and mixed text |
| G09 | Additional browsers | 1 | Actual Chrome, Firefox and Edge verification |
| G10 | SSR | 1 | Meaningful initial game/lobby HTML and metadata |
| | Core target | 14 | Every mandatory requirement also passes |
| G11 | Advanced permissions | 2 | Admin user CRUD, role management and distinct guest/member/admin access |
| | Target with buffer | 16 | No game/customization/social/statistics points double-counted |

Sources: subject v21.1 PDF pages 8-17 for the project, mandatory requirements,
dependencies, frameworks, real-time, ORM, SSR, design system, languages/RTL,
browsers, AI, permissions and game modules. The supplied evaluation-sheet
capture requires each module to be demonstrated independently and incomplete
modules count as zero. Original PDF files stay unchanged.

### Acceptance item outside the code

The owner explicitly clarified on 2026-10-27 that two members are accepted:
Mahdi and Joseph. Apply that clarification to the copied PDFs' generic team
size; this is no longer an unresolved gate. Genuine contributions, Git history
and each member's ability to explain the code remain mandatory human evidence.

## Architecture

Node.js 24, Next.js App Router, React, TypeScript, Tailwind, Prisma, SQLite and
Caddy remain suitable. Reusing their pinned package/install foundation is
preferred to introducing dependencies. New project skills still require owner
approval. AI is local game logic, with no model service or external API.

The server owns all game state. HTTPS POST requests submit actions; a per-game
Server-Sent Events stream sends canonical snapshots. This fits the turn-based
game without a separate broker or application server. Next supports Web
Streams in route handlers; native EventSource reconnects; Caddy recognizes
text/event-stream as a streaming response. Those capabilities do not themselves
prove this app's real-time module: the transport must pass its own tests.

References:
- https://nextjs.org/docs/app/api-reference/file-conventions/route#streaming
- https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#streaming

The target deployment is one Node application process. The process-wide game
event bus must be shared across route bundles, scoped by game ID, and publish
only committed changes. Horizontal replicas are outside this local assignment.
Reconnecting clients always receive the latest database snapshot, so event
history replay and a durable message broker are unnecessary.

### Data and state

Use User, Session, RateLimitBucket, Game and GameMove. Account emails,
password hashes, session tokens and invitation codes never enter public DTOs.

Game stores mode HUMAN/AI, nullable human X/O references, nine cells, current
turn, status WAITING/ACTIVE/FINISHED/CANCELLED, winner, termination reason,
version and timestamps. GameMove stores game ID, ply 1-9, mark, cell 0-8 and
timestamp; unique game/ply and game/cell constraints prevent duplicate moves.
AI identity is explicit rather than represented by an account with a password.

An eight-character cryptographically random invitation code is returned only
to the waiting room's creator. Normalize case/outer whitespace when joining,
rate-limit attempts, and retry code collisions. The same account cannot occupy
both seats. Only one simultaneous joining request may claim O.

All mutations reload the current account, check membership/status/turn and the
expected version, then commit board, move rows and result atomically. Reject
client-supplied boards, winners, player IDs and roles. Invalid fields are 400,
missing sessions 401, unseated actors 403, unknown games/codes 404, and stale
versions, wrong turns, occupied cells or finished games 409. Never retry an
uncertain move automatically; fetch the canonical snapshot first.
Cancellation accepts expectedVersion just like resignation and moving.

AI chooses an immediate win when available, otherwise normally blocks a threat,
then favors center/corners and legal alternatives. A controlled 15% branch may
miss a block or choose another legal move. Inject randomness into unit tests;
never expose deterministic seeds or testing controls through production APIs.
The policy must demonstrate both winning competence and possible mistakes.
The human and any resulting AI reply commit in the same transaction, with one
version increment per move and no persistent timer/background-worker dependency.
Any thinking animation is presentation only; the server result stays canonical.

### Live state and disconnects

Send an initial snapshot on subscription and after each committed change, plus
a heartbeat every 15 seconds and a 2-second reconnection suggestion. Ignore
snapshots older than the current version. Limit an account to five concurrent
streams and clean up subscriptions/timers on abort.

Authenticate subscriptions, recheck session/account access before delivering
state and at heartbeats, and close revoked streams. On browser/network failure,
disable move submission, announce Reconnecting, then replace the board with the
latest snapshot before accepting input. A disconnect does not forfeit a match;
the waiting player can resume later or resign. Do not claim opponent-online
presence or implement clocks/time penalties.

Deleting a user cancels their waiting games, ends their active games as a loss
to the remaining opponent, revokes sessions and anonymizes their references.
Finished results remain with a Deleted player label. Admins cannot set winners,
play for others or delete/demote the last administrator.

## HTTP and shared contracts

Use one game service for browser HTTP actions and server-rendered reads:
- POST /api/games: create HUMAN waiting room or ACTIVE AI game.
- POST /api/games/join: join by code.
- GET /api/games/[id]: authorized snapshot, plus creator-only code when waiting.
- POST /api/games/[id]/moves: cell and expectedVersion only.
- POST /api/games/[id]/resign: expectedVersion only.
- POST /api/games/[id]/cancel: creator-only waiting-room cancellation.
- GET /api/games/[id]/events: authorized same-origin SSE.

Auth/account/admin routes retain their existing responsibilities. Moves and
joining are rate-limited and all mutations enforce Origin. Session cookies
remain Secure, HttpOnly and SameSite=Lax; passwords remain Argon2id.
Proposed limits per authenticated account: create 10/minute, join 20/minute,
and game moves/resign/cancel 60/minute combined; retain the existing stricter
login/registration limits. Return 429 with Retry-After on exhaustion.

## Interface and Impeccable brief

Operate mode: make playing, turn ownership and recovery obvious. Reuse a
restrained shared visual system where useful, with a large square board as the
focal element, clear X/O shapes, obvious turn/result text and a single next
action. The layout adapts to 360px phones and desktop. Aesthetic elaboration
cannot expand the functional scope.

Routes: /[locale]/play, /[locale]/games/[id], auth/account, admin users, Privacy
and Terms. Header navigation is Play, Account, and Users for administrators,
plus language/theme controls. Public Play renders rules and mode explanations;
signed-in views render actual recent games and the initial authorized board
in server HTML. Appropriate metadata and meaningful no-JavaScript content
support the SSR claim; gameplay itself requires JavaScript.

Cells are keyboard-operable, named by row/column/state, and never rely on color
alone. Turn/result/reconnection changes have restrained live announcements.
Keep focus stable as snapshots arrive. Preserve form input on validation errors;
registration legal links open in another tab without saving passwords to browser
storage. Translate AI/waiting/invalid-code/conflict/reconnect/result states.
Use icons as consistent authored SVG where needed, not decorative emoji.

## Delivery and stop condition

Runtime DATABASE_URL is file:/data/tictactoe.db on game-data. Retain private
.env files, all runtime data, and existing Caddy certificate volumes/local CA.
Keep the Compose project name consistent so certificates and data are reused.

The owner requested removal of superseded product code, scripts, contracts,
plans and evidence. Preserve original reference PDFs and actual Git authorship;
only current game checks establish game verification.

Finish only with working human and AI modes, live recovery/concurrency checks,
fresh setup, HTTPS, all selected module demonstrations, browser/theme/locale/
keyboard coverage, accurate README and actual contribution records. No official
score, human understanding or Joseph contribution is inferred from automation.

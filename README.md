*This project has been created as part of the 42 curriculum by mahajj-h, jboustan, ksayour.*

# Tic Tac Toe

A complete web game for two signed-in friends using separate browser sessions on
one computer, or one player against the computer. X starts; three in a line wins.
Accounts and committed matches survive restarts. The server owns every move.
Members can edit profiles and avatars, accept friends, see friend presence,
register for a fixed four-player tournament, and inspect saved history,
achievements, progression and competitive standings.

This is **MahdiHajjHassan/Final-Trans-Repo (production source)**. Development
remains in [Transcendence2 (ppd)](https://github.com/MahdiHajjHassan/Transcendence2).
The team is Mahdi (`mahajj-h`), Joseph (`jboustan`) and Khalid (`ksayour`).

## Instructions

Use Git, Node.js **24**, npm and Docker with Compose. On Windows, native npm
installation needs Python and Visual Studio C++ Build Tools for better-sqlite3.
Dependencies, including the container base images, are pinned. Use normal GitHub
authentication; no token belongs in this repository or a chat.

```sh
npm ci
npm run setup
docker compose up --build -d --force-recreate
```

Open **https://localhost:8443/en/play**. Setup generates a Git-ignored `.env` with
this computer's random administrator password. Read **ADMIN_EMAIL** and
**ADMIN_PASSWORD** privately there. Setup refuses to replace an existing file;
startup does not reset an existing administrator's password. Register additional
players in the interface. Signup creates a pending attempt; the requesting
browser must confirm the six-digit email code before the account exists.
Existing unverified accounts prove email ownership after a correct password,
then return to password login. No verification bypass is provided.

If you already have an older `.env` using port 443, migrate its connection
settings before starting the updated source:

```sh
npm run setup -- --update-port --port 8443
docker compose up --build -d --force-recreate
```

This changes only `HTTPS_PORT` and `APP_ORIGIN` to `8443` and
`https://localhost:8443`. Existing administrator credentials, mail settings,
database configuration and Docker volumes are preserved. Do not delete `.env`
or run `docker compose down -v`. If your shell exports `HTTPS_PORT` or
`APP_ORIGIN`, update those overrides too; shell values take precedence over `.env`.

Only Caddy publishes a port, bound to loopback HTTPS on port **8443** by default
so rootless Docker does not need permission to bind privileged port 443. The Node
process runs as non-root. Startup deploys migrations and seeds the administrator.
Named volumes retain game data and certificates across recreation. Do not delete volumes.
The `game-data` volume stores `file:/data/tictactoe.db`.

Verify the real certificate chain and hostname:

```sh
./scripts/verify-tls.sh
```

Run that POSIX script from Git Bash on Windows. Or from PowerShell:

```powershell
docker compose cp proxy:/data/caddy/pki/authorities/local/root.crt local-certs/root.crt
npm run smoke
```

Create `local-certs` first if needed. Trust only the public `root.crt`:
Windows Current User > Trusted Root Certification Authorities for Chrome/Edge;
Firefox Settings > Privacy & Security > Certificates > Authorities may need a
separate import, or enterprise root trust. Then reload without a certificate
warning. Never copy Caddy's private CA key. The verifier uses explicit CA trust
and hostname verification; no insecure TLS flags are needed.

For a different port, generate an environment with
`npm run setup -- --port 9443`. With an existing `.env`, keep `HTTPS_PORT` and
`APP_ORIGIN` consistent. Use `npm run setup -- --update-port --port 9443` to
change an existing local installation without replacing credentials. An explicit
`--port 443` remains available on hosts that permit binding privileged ports.
Keep `COMPOSE_PROJECT_NAME` consistent for all runtime and TLS commands, so
recreation reuses the same certificates and data.
In a managed cloud needing its public network proxy CA, set `CODEX_PROXY_CERT`
and include `compose.cloud.yaml` using the OS-specific COMPOSE_FILE separator.
That CA is a build secret, never an application credential.

## Play and demonstrate

1. Register and sign in. Choose **Play computer**, place a mark and finish a game.
   **Play again** creates a separate saved match; **Resign** confirms a loss.
2. For a friend, use two separate browser profiles or one private window. Sign in
   with different accounts. First player chooses **Create friend game**, shares
   the displayed code; second enters it under **Join with code**. Play alternately.
3. Show a win or draw in both sessions. Reload, briefly disconnect/reconnect,
   or recreate containers: the committed board returns. An uncertain move is
   never retried automatically. Refresh after a conflict before trying again.
4. Switch English/French/Arabic, theme and phone width. Cells work with Tab and
   Enter/Space, preserve focus and announce turns/results. X/O differ by shape.
5. Administrator > **Users** demonstrates user creation, editing, roles and
   deletion. Creating a user first sends an email code; confirm it in the requesting
   administrator browser before the account and chosen role are created.
   Members cannot administer users. The final administrator cannot
   be deleted or demoted. Deleting a player ends active games and anonymizes
   their historical references.
6. Registration Privacy/Terms links open a separate tab and preserve the form,
   including the typed password, in the original tab. Passwords are not saved
   to browser storage.

7. Open **Friends** to find players and send/accept requests. Presence is visible
   only for accepted friends. Upload a PNG/JPEG/WebP avatar under **Account**.
8. For a tournament, use **four independent browser profiles/contexts**, each
   signed into a different account. Ordinary tabs share cookies. The host creates
   a tournament and shares its code; three players join. Confirm the displayed
   semifinals, start, finish both rounds and the final. Draws replay with seats
   swapped. No LAN or separate PCs are needed.
9. **History** shows your own results and progression; **Leaderboard** ranks
   completed human games. AI, cancellation and account-deletion forfeits do not
   earn competitive points.

## Architecture and technical choices

Next.js App Router provides frontend React/TypeScript and backend route handlers;
Tailwind plus semantic CSS tokens provide styling. Prisma with SQLite keeps this
single-computer delivery small and transactional. Caddy provides local HTTPS.
Zod validates client inputs and backend bodies independently. The backend reloads
current session/role and checks Origin, membership, turn, cell and version.

Passwords use Argon2id. Sessions are random, stored only as hashes server-side,
and sent in Secure, HttpOnly, SameSite=Lax cookies. Password changes revoke all
sessions. Auth and game actions are rate-limited. Private game projections contain
player display names, never email, passwords or tokens. Production preserves the existing `__Host-taskboard_` cookie namespace and
`X-Taskboard-Client-IP` proxy convention. This port does not rename existing
session or preference cookies.

Game state is committed before publication. Scoped HTTPS server-sent events send
full snapshots, with monotonic versions and 15-second authorization heartbeats.
On reconnection the client reads canonical state before enabling moves. A
process-wide bus supports this **single application process**; a multi-instance
service would require a shared broker and is outside this delivery.

The computer plays O. It takes an immediate win; otherwise it usually blocks a
threat, then prefers center/corners. A 15% imperfect branch permits legal weaker
choices. It can beat weak play and can lose; it is not perfect minimax. The human
move and computer reply commit in one transaction, with no external AI service.

## Source layout

| Path | Responsibility |
| --- | --- |
| `src/app` | URL routes, server-rendered pages, and API entry points. |
| `src/frontend/components/ui` | Shared controls, one component per file. |
| `src/frontend/features` | Accounts, profiles, friends, tournaments, statistics, auth and game components. |
| `src/frontend/layout`, `lib`, `styles` | Preferences, browser requests/form validation and shared styles. |
| `src/backend/modules` | Auth, games, users, profiles, friends, presence, tournaments, statistics and realtime. |
| `src/backend/common` | HTTP responses, errors, validation and request security. |
| `src/backend/config`, `database` | Environment validation, database connections, write retries and seeding. |
| `src/shared` | Data contracts and small helpers shared across application layers. |
| `src/shared/i18n` | Locale selection, text direction and separate English/French/Arabic dictionaries. |
| `prisma` | The database schema and published migrations. |
| `scripts` | Setup, startup, HTTPS smoke checks, verification, and rehearsal. |
| `tests/server`, `tests/browser` | Database-backed service tests and real browser journeys. |

The layout follows the frontend/features and backend/modules grouping in
[tawbinho/ft_transcendence](https://github.com/tawbinho/ft_transcendence), using
Next.js for this application's routes and server rendering.

A move starts in `src/frontend/features/games/components/Board.tsx`. `LiveGame.tsx`
sends it to `src/app/api/games/[id]/moves/route.ts`. Under `src/backend/modules/games`,
`games.controller.ts` reads the request, `games.service.ts` saves the move and
`engine/game.engine.ts` checks the board. The realtime module sends the saved state
to connected players.

## Database schema

| Model | Purpose and relationships |
| --- | --- |
| User | Unique email, public name, password hash, MEMBER/ADMIN role; sessions and X/O game seats |
| Session | Hash-only token, expiry, nullable lastSeenAt, User foreign key; revoked on password change/deletion |
| RateLimitBucket | Persistent per-action quotas and reset times |
| Game | Mode, nine-cell board, seats, turn, status/result, unique invitation, version/times |
| GameMove | Game foreign key, mark/cell/ply; unique game+cell and game+ply |
| UserAvatar | User primary/foreign key, canonical 256px WebP bytes, revision; cascades on deletion |
| Friendship | Canonical user pair, requester, pending/accepted state; unique pair and cascading user references |
| Tournament | Host, code, state/version, champion slot and timestamps |
| TournamentEntry | Tournament and nullable user, unique numbered seat; historical seats survive deletion |
| TournamentMatch | SF1/SF2/final, entry/winner references, current game/attempt/version; Game links uniquely to match+attempt |

Game seats become null when an account is deleted, after the game is safely
resolved. Moves/results remain. Transactions and version predicates ensure two
concurrent joins or conflicting actions cannot both claim the same state.

## Features and candidate modules

Mandatory frontend/backend/database, secure accounts, concurrent use, HTTPS,
responsive access, legal pages and one-command container startup apply separately.

| ID | Candidate module | Points |
| --- | --- | ---: |
| G01 | Frontend/backend frameworks | 2 |
| G02 | Complete web game | 2 |
| G03 | Computer opponent | 2 |
| G04 | Real-time updates | 2 |
| G05 | ORM | 1 |
| G06 | Shared design system | 1 |
| G07 | English, French, Arabic | 1 |
| G08 | RTL support | 1 |
| G09 | Additional browsers: Chrome, Firefox and Brave | 1 |
| G10 | Meaningful server rendering | 1 |
| | Core candidate target | **14** |
| G11 | Advanced permissions | 2 |
| | Verified baseline with permissions | **16** |
| G12 | Full profiles, avatars, friends and online status | 2 |
| G13 | Fixed four-player tournament | 1 |
| G14 | Statistics, history, achievements/progression and leaderboard | 1 |
| | Complete candidate target after the recorded verification | **20** |

These are candidate mappings, not official awarded points. Theme switching and
basic authentication do not add points. No remote-player, public API, 2FA or notification module is claimed.
Email ownership verification is included and earns no extra point here.

## Verification and fresh setup

Run `npm run format` to apply the shared code style and `npm run format:check` to
check it. Formatting excludes generated code, private files, documentation,
lockfiles, and published migrations.

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run audit:source
npm run smoke:auth
npm run smoke:games
npm run test:e2e
npm run verify
npm run rehearse
```

Smoke checks use validated local HTTPS, temporary demonstration accounts and
normal game actions; game records remain on the administrator account.
`verify` runs sequential checks including actual Chrome, Firefox and Brave.
Install actual Chrome, Firefox and Brave; `npx playwright install chrome firefox` installs
the managed versions where available. Brave uses its installed product executable; Chromium alone does not count as Brave.
Browser tests use project `tictactoe-e2e-mahdi`, port 8443 and own ignored
`.env.e2e`. Their guarded reset affects only that isolated database. Normal
runtime data and certificates are never reset. The test public CA must also be
trusted. Certificate validation remains enabled in both browsers and Node API
requests. Override `TICTACTOE_E2E_PROJECT`, `TICTACTOE_E2E_PORT` and
`TICTACTOE_E2E_ENV_FILE` consistently if needed.

`rehearse` exports the exact uncommitted working source (including new files,
excluding ignored credentials/builds/databases), hashes it and performs a fresh
npm install/setup/migration/seed/check/build plus isolated HTTPS Chrome flows on
9443. It makes no commit. Only the already trusted test certificate volume is
reused; rehearsal game data is separate. Ignored logs, traces and screenshots
may contain private test inputs and must never be shared unredacted.

## Email verification setup

Signup requires an emailed code before an account can be used. Existing accounts
must verify too; their saved data is preserved. Future logins use the password
normally. This feature adds no module points.

The owner selected a business Gmail mailbox. Configure the following values
only in the private `.env`, using the mailbox's App Password when account
settings allow it. Do not put a normal Google password, App Password, or real
sender address in repository files or chat:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=<your-mailbox-address>
SMTP_PASSWORD=<your-app-password>
SMTP_FROM_EMAIL=<your-mailbox-address>
```

The mailbox administrator may restrict SMTP/App Passwords. The application needs
outbound SMTP access; a managed environment must grant it before a live test.
SMTP authentication and an actual received message are separate from automated
local-inbox checks. The website can still run on localhost.

For a fresh database, set a deliverable `ADMIN_EMAIL` before seeding. If an
existing administrator still uses `admin@taskboard.local`, run migrations and
explicitly correct that address from the operator console:

```sh
npm run account:email -- --current-email admin@taskboard.local --new-email <your-real-address>
```

Inside Compose, run the same command with `docker compose exec app` before
`npm run account:email`. This updates the selected account and revokes its
sessions without changing its role, password or saved games. Normal bootstrap
never renames or silently verifies existing accounts. Then sign in with the
existing password, enter the emailed code, and sign in normally.

Codes expire after ten minutes and work once. Resend has a one-minute cooldown
and a five-per-hour address limit. Invalid or undelivered codes never grant
account access. Test verification uses only the guarded, isolated Mailpit SMTP
sidecar; its inbox UI/API binds to localhost, with separate test data. It does
not send real messages. Real sender credentials are not needed for that suite.

Run `smoke:auth` after verifying the administrator address in the browser.
`smoke:games` also needs a separate verified account: put `SMOKE_MEMBER_EMAIL`
and `SMOKE_MEMBER_PASSWORD` in the private environment. It signs in to those
two accounts and preserves them; it no longer creates an instantly playable
unverified test address or deletes an existing account afterward.

## Team, project management and AI use

Mahdi (`mahajj-h`) led development and coordinated delivery. Khalid (`ksayour`,
GitHub `ksayour-42`) integrated the member modules and promoted them to production.
Joseph (`jboustan`) is the third team member. Development takes place on pre-prod,
with validated changes promoted to the production repository.

Codex assisted architecture, implementation, tests and documentation. The team
is responsible for reviewing and understanding the submitted code and explaining
the AI assistance used during evaluation.

## Resources

- [Original subject](docs/reference/en.subject.pdf) and [evaluation sheet](docs/reference/EVALUATION-SHEET.pdf), unchanged.
- [Next.js documentation](https://nextjs.org/docs), [Prisma documentation](https://www.prisma.io/docs), [Caddy documentation](https://caddyserver.com/docs/).
- [Game API](docs/api/games.md), [auth contract](docs/api/auth.md), [profiles/friends/presence](docs/api/profiles.md), [tournaments](docs/api/tournaments.md), [statistics](docs/api/statistics.md).

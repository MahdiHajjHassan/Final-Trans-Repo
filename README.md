*This project has been created as part of the 42 curriculum by mahajj-h, jboustan, ksayour.*

# ft_transcendence — Tic Tac Toe

## Description

**Tic Tac Toe** is a web application for playing against a friend or a computer opponent.
Players have accounts, profiles and friends, can enter four-player tournaments, and can
follow their results through match history and a leaderboard. The interface is available
in English, French and Arabic, with right-to-left layout and light/dark themes.

**Key features**

- Two-player Tic Tac Toe with live updates and server-side move validation.
- A computer opponent that can win and make mistakes.
- Email/password accounts, email verification and secure sessions.
- Profiles, avatar uploads, friends and online status.
- Four-player tournaments with semifinals, a final and replayed draws.
- Match history, statistics, achievements, levels and competitive standings.
- Administrator tools for managing users and roles.
- Responsive pages, keyboard navigation, three languages and Arabic RTL support.
- Privacy Policy and Terms of Service pages.

## Instructions

**Prerequisites:** Git, Node.js **24**, npm and Docker with the Compose plugin.
On Windows, the native SQLite dependency also requires Python and Visual Studio C++ Build Tools.

```sh
# 1. Install the dependencies and run the local setup.
npm ci
npm run setup -- --port 8443

# 2. Complete the administrator and email-delivery setup.
# 3. Build and start the application and HTTPS proxy.
docker compose up --build -d
```

Open **https://localhost:8443/en/play**. The database tables are created automatically when the
application starts. Caddy provides HTTPS and creates a local certificate authority.

```sh
./scripts/verify-tls.sh
```

This exports the public certificate to `local-certs/root.crt` and checks the application.
Trust that certificate in your operating system or browser. On Windows, run the script
from Git Bash; Firefox may require a separate certificate import.

**Creating an account:** sign up with an email address and password, enter the six-digit
code received by email, then sign in. Email delivery must be working before accounts
can be verified.

For a friend game, open two separate browser profiles or use a private window. One player
creates a game and shares its invitation code; the other joins with that code. A tournament
uses four accounts in separate browser sessions.

More commands and the API reference are in [Technical documentation](#technical-documentation).

## Team Information

| Login | Role(s) | Responsibilities |
| --- | --- | --- |
| **mahajj-h** | Technical Lead, Project Manager, Developer | Architecture, backend services, database, authentication, game rules, live updates and coordination of delivery. |
| **jboustan** | Developer — UI and browser tooling | Account/game/admin pages, reusable components, languages/RTL and browser-test tooling. |
| **ksayour** | Product Owner | Player-facing requirements and acceptance criteria, data-model study, and coordination of profiles, tournaments and statistics delivery. |

## Project Management

- **Organisation:** work is divided between application architecture/backend, UI/browser tooling,
  and product/module coordination. Shared data contracts connect these areas.
- **Tools:** Git and GitHub branches and pull requests for tracking and combining changes;
  the API documents in `docs/api` describe shared request and response contracts.
- **Communication:** GitHub pull requests and shared technical documents record changes and handoffs.

## Technical Stack

| Part | Technology |
| --- | --- |
| Frontend | React 19, Next.js 16, TypeScript, Tailwind CSS 4 |
| Backend | Next.js route handlers, TypeScript, Zod, Argon2, Nodemailer |
| Database | SQLite, Prisma ORM and migrations |
| Real-time | Server-Sent Events (SSE) |
| Deployment | Docker Compose, Caddy HTTPS proxy |
| Testing | Vitest, Playwright with Chrome, Firefox and Brave |

**Why these technologies**

- **Next.js and React:** server-rendered pages and backend routes share typed data contracts.
- **SQLite and Prisma:** a relational database with transactions, typed access and versioned
  migrations fits the single-server application.
- **Database sessions:** logout and password changes revoke server-side access immediately;
  only a hash of each session token is stored.
- **SSE:** the server publishes authorized game snapshots while ordinary HTTPS requests submit moves.
- **Tailwind and shared components:** common controls and style tokens keep the interface consistent
  across themes, screen sizes and languages.
- **Caddy:** provides the HTTPS entry point while the application port stays inside Docker.

## Database Schema

The database contains eleven models. The full definitions are in
[prisma/schema.prisma](prisma/schema.prisma). `?` indicates a nullable field;
`String` IDs are UUIDs except for the hash-based session/challenge keys.

| Model | Main fields and types | Relationships |
| --- | --- | --- |
| User | `id: String`, `email: String` (unique), `displayName: String`, `passwordHash: String`, `emailVerifiedAt: DateTime?`, `role: Role` | Sessions, avatar, friends, game seats, tournament entries and verification requests |
| Session | `id: String` (token hash), `userId: String`, `expiresAt: DateTime`, `lastSeenAt: DateTime?` | Belongs to a user |
| EmailChallenge | `id: String` (token hash), `userId: String?`, `createdById: String?`, `requestedRole: Role`, `codeHash: String`, `expiresAt: DateTime`, `attempts: Int` | Pending signup or verification; optional user and creating administrator |
| UserAvatar | `userId: String`, `data: Bytes`, `revision: Int` | One avatar per user; deleted with the user |
| Friendship | `id: String`, `userAId: String`, `userBId: String`, `requestedById: String`, `status: FriendshipStatus` | One row per user pair; pending or accepted |
| Game | `id: String`, `mode: GameMode`, `board: String`, `xId: String?`, `oId: String?`, `status: GameStatus`, `version: Int` | Two user seats, moves and an optional tournament match |
| GameMove | `id: String`, `gameId: String`, `mark: String`, `cell: Int`, `ply: Int` | Belongs to a game; unique cell and move number per game |
| Tournament | `id: String`, `hostId: String?`, `joinCode: String`, `status: TournamentStatus`, `championSlot: Int?` | Owns entries and bracket matches |
| TournamentEntry | `id: String`, `tournamentId: String`, `userId: String?`, `slot: Int` | A numbered tournament seat |
| TournamentMatch | `id: String`, `tournamentId: String`, `slot: TournamentSlot`, `entryAId: String?`, `entryBId: String?`, `winnerEntryId: String?` | Semifinal/final pairing and its game attempts |
| RateLimitBucket | `key: String`, `windowStart: DateTime`, `count: Int` | Persistent action and page-request limits |

Moves and results are saved transactionally. Game versions reject stale actions, and unique
constraints prevent duplicate seats or moves. Deleting an account removes its sessions,
avatar and friendships while preserving anonymized match history.

## Features List

The responsibility column follows the team's areas of work.

| Feature | Description | Responsibility |
| --- | --- | --- |
| Accounts | Signup, email verification, login/logout, password change and secure sessions | mahajj-h; jboustan (UI) |
| Game | Tic Tac Toe rules, invitation codes, moves, resignations and saved results | mahajj-h, jboustan |
| Live updates | Authorized SSE, refreshed game state and reconnection handling | mahajj-h; jboustan (UI) |
| Computer opponent | Server-side win/block/position strategy with deliberate mistakes | mahajj-h, jboustan |
| Profiles and avatars | Editable display name, player profile and validated image uploads | mahajj-h, ksayour |
| Friends and presence | Requests, acceptance/removal and accepted-friend online status | mahajj-h, ksayour |
| Tournaments | Four-player registration, semifinals, draw replays and final | mahajj-h, ksayour |
| Statistics | Match history, wins/losses, progression, achievements and leaderboard | mahajj-h, ksayour |
| Administration | User management, roles and restricted administrator screens | mahajj-h; jboustan (UI) |
| Interface | Shared controls, responsive pages, light/dark themes and keyboard navigation | mahajj-h, jboustan |
| Languages | English, French and Arabic with mirrored RTL layouts | mahajj-h, jboustan |
| Browser compatibility | Chrome, Firefox and Brave test projects | jboustan, mahajj-h |
| Deployment | Docker Compose, HTTPS and automatic migrations | mahajj-h |

## Modules

| # | Module | Type | Points | Responsibility | Implementation |
| --- | --- | --- | ---: | --- | --- |
| 1 | Frontend and backend frameworks | Major | 2 | mahajj-h, jboustan | React and Next.js pages with backend route handlers |
| 2 | Complete web game | Major | 2 | mahajj-h, jboustan | Live two-player Tic Tac Toe with server-owned rules and saved results |
| 3 | AI opponent | Major | 2 | mahajj-h, jboustan | Computer takes wins, usually blocks threats and sometimes makes a weaker legal move |
| 4 | Real-time features | Major | 2 | mahajj-h, jboustan | Authorized SSE snapshots and reconnection recovery |
| 5 | ORM | Minor | 1 | mahajj-h | Prisma schema, relations and SQLite migrations |
| 6 | Custom design system | Minor | 1 | mahajj-h, jboustan | Twelve reusable UI components, shared colors, typography and icons |
| 7 | Multiple languages | Minor | 1 | mahajj-h, jboustan | Complete English, French and Arabic dictionaries and a language switcher |
| 8 | RTL support | Minor | 1 | mahajj-h, jboustan | Arabic layout direction, logical CSS and mirrored navigation |
| 9 | Additional browsers | Minor | 1 | jboustan, mahajj-h | Firefox and Brave in addition to Chrome |
| 10 | Server-side rendering | Minor | 1 | mahajj-h, jboustan | Saved game and account/history data rendered on the server |
| 11 | Advanced permissions | Major | 2 | mahajj-h; jboustan (UI) | Administrator/member roles, user CRUD and last-administrator protection |
| 12 | Standard user management | Major | 2 | mahajj-h, ksayour | Profiles, default/uploaded avatars, friends and online status |
| 13 | Tournament system | Minor | 1 | mahajj-h, ksayour | Registration, fixed bracket, pairings, replayed draws and champion |
| 14 | Game statistics and history | Minor | 1 | mahajj-h, ksayour | Results, opponents, dates, levels, achievements and leaderboard |

**Total: 6 Major × 2 + 8 Minor × 1 = 20 candidate points.** The subject requires 14;
bonus points are capped at 5 and depend on the mandatory requirements being satisfied.

**Justification:** the game, real-time updates and AI form the core experience. Profiles,
friends and tournaments support playing together; statistics give players a record of their
progress. The design system, languages, RTL and browser support make the same application
usable by more players.

## Individual Contributions

**mahajj-h** — Application architecture, database and migrations, backend accounts and
permissions, game services, live updates, email verification, interface refinements and
container deployment. **Challenge:** simultaneous player actions and account changes.
Transactions, version checks and session revocation keep the saved state consistent.

**jboustan** — UI work for the account, game and administration pages, shared
components, engine/AI integration, localization/RTL and browser-test tooling.
**Challenge:** browser tests using local HTTPS. Exporting Caddy's public root certificate
through Compose allows tests to verify the certificate chain and hostname.

**ksayour** — Product ownership, data-model study and delivery coordination for profiles,
friends, tournaments and statistics. **Challenge:** combining these modules with the
existing account rules. The integration preserves email verification, user permissions
and saved data across the member features.

## Resources

- [Next.js](https://nextjs.org/docs), [React](https://react.dev) and [Tailwind CSS](https://tailwindcss.com/docs).
- [Prisma](https://www.prisma.io/docs), [SQLite](https://www.sqlite.org/docs.html) and [Caddy](https://caddyserver.com/docs/).
- [Docker Compose](https://docs.docker.com/compose/), [Nodemailer](https://nodemailer.com), [Vitest](https://vitest.dev) and [Playwright](https://playwright.dev).
- [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) and [session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
- [Project subject](docs/reference/en.subject.pdf) and [evaluation sheet](docs/reference/EVALUATION-SHEET.pdf).

**AI use:** Codex assisted with architecture, implementation, debugging, tests and
documentation across the account, game and member modules. The team is responsible for
reviewing the work and explaining the application.

---

# Technical documentation

## Run the project (details)

The application runs as two Compose services: `app` contains the Next.js frontend and
backend, and `proxy` contains Caddy. SQLite is stored in a persistent volume attached
to the application.

```sh
npm ci
npm run setup -- --port 8443
# Complete the local account and email-delivery setup before starting.
docker compose up --build -d
docker compose ps
./scripts/verify-tls.sh
```

The HTTPS entry point is **https://localhost:8443**. Only the proxy publishes a port;
the application and database stay behind it. Pending migrations run at startup,
and the initial administrator is created when the database is empty.

### Everyday commands

```sh
docker compose up -d                  # Start existing services
docker compose up --build -d          # Rebuild and start
docker compose logs -f app            # Follow application logs
docker compose ps                    # Check service status
docker compose down                  # Stop services and retain data
./scripts/verify-tls.sh               # Check HTTPS and database readiness
```

Keep the same Compose project and retain its volumes to preserve accounts, games
and certificates. Run `npm run setup` only when preparing a new installation.

For an existing installation still using port 443, switch to 8443 without resetting
accounts or saved games:

```sh
npm run setup -- --update-port --port 8443
docker compose up --build -d --force-recreate
```

### Configuration

The application needs a working email sender and a reachable inbox for the initial
administrator. New accounts and the administrator's first sign-in require email verification.
The initial administrator is created only once; later starts preserve existing accounts.

Caddy manages HTTPS certificates. Import only its public root certificate into the browser
or operating system. Accounts, games and certificates remain available after a normal
container restart.

## Database migrations

Prisma migrations define the SQLite schema. The application applies pending migrations
automatically when it starts. To apply them manually inside the running application:

```sh
docker compose exec app npm run db:migrate
```

After a schema change, regenerate the Prisma client with:

```sh
npm run db:generate
```

The schema and migration files are in [prisma/](prisma/). Existing data is preserved
when applying the published migrations.

## API

Routes are served under `/api` over HTTPS. Most JSON responses use `{data: ...}` on success
and `{error: {code, fields?}}` on failure; some actions return an empty 204 response.
The health route returns readiness status, game events use SSE, and avatar reads return
image bytes. Authenticated requests use the session cookie.

Excessive page refreshes return HTTP 429 with a `Retry-After` delay. Wait for that
delay before refreshing again. Page-request limits are shared by client address
and are separate from action-specific API limits.

**Accounts and administration**

| Route | Description |
| --- | --- |
| `POST /api/auth/register` | Start signup and send an email verification code |
| `POST /api/auth/login` | Sign in, or begin verification for an unverified account |
| `POST /api/auth/logout` | End the current session |
| `GET /api/auth/verification` | Read the requesting browser's pending verification state |
| `POST /api/auth/verification/confirm` | Confirm an emailed code |
| `POST /api/auth/verification/resend` | Request a replacement code |
| `GET /api/account` | Read the signed-in account |
| `PATCH /api/account` | Update the display name |
| `PUT /api/account/password` | Change the password and revoke existing sessions |
| `GET /api/admin/users` | List users as an administrator |
| `POST /api/admin/users` | Start verified user creation as an administrator |
| `PUT /api/admin/users/:id` | Update a user's details or role |
| `DELETE /api/admin/users/:id` | Delete a user, with final-administrator protection |

**Games and tournaments**

| Route | Description |
| --- | --- |
| `GET /api/games` | List the current player's games |
| `POST /api/games` | Create a friend or computer game |
| `POST /api/games/join` | Join a waiting game with its invitation code |
| `GET /api/games/:id` | Read an authorized game snapshot |
| `POST /api/games/:id/moves` | Submit a move with the expected game version |
| `POST /api/games/:id/resign` | Resign from an active game |
| `POST /api/games/:id/cancel` | Cancel a waiting game |
| `GET /api/games/:id/events` | Follow authorized live updates through SSE |
| `GET /api/tournaments` | List the player's tournaments |
| `POST /api/tournaments` | Create a four-player tournament |
| `POST /api/tournaments/join` | Join using a tournament code |
| `GET /api/tournaments/:id` | Read the participant's bracket |
| `POST /api/tournaments/:id/start` | Host starts the tournament after four players join |
| `POST /api/tournaments/:id/leave` | Leave a waiting tournament as a non-host |
| `POST /api/tournaments/:id/cancel` | Host cancels a waiting tournament |

**Profiles, friends and statistics**

| Route | Description |
| --- | --- |
| `GET /api/profiles` | Search players by display name |
| `GET /api/profiles/:id` | Read a player's public profile |
| `PUT /api/account/avatar` | Upload PNG, JPEG or WebP image bytes |
| `DELETE /api/account/avatar` | Restore the default avatar |
| `GET /api/profiles/:id/avatar` | Read a player's avatar |
| `GET /api/friends` | List friendships and pending requests |
| `POST /api/friends` | Send a friend request |
| `PATCH /api/friends/:id` | Accept an incoming request |
| `DELETE /api/friends/:id` | Decline, withdraw or remove a friendship |
| `POST /api/account/presence` | Update the current session's presence |
| `GET /api/account/statistics` | Read personal statistics, level and achievements |
| `GET /api/account/history` | Read personal match history |
| `GET /api/leaderboard` | Read competitive standings |
| `POST /api/preferences` | Change language or theme preferences |
| `GET /api/health` | Check application and database readiness |

Request bodies, response types and validation rules are documented in
[accounts](docs/api/auth.md), [games](docs/api/games.md),
[profiles and friends](docs/api/profiles.md), [tournaments](docs/api/tournaments.md)
and [statistics](docs/api/statistics.md).

## Backend without Docker

Backend tests can run locally with Node.js 24 and npm:

```sh
npm ci
npm run db:generate
npm test
```

Tests use isolated databases. Application services are organized under
`src/backend/modules`, with shared validation and request handling in `src/backend/common`.
The normal application deployment uses the HTTPS Compose stack described above.

## Frontend

The frontend is served by Next.js in the `app` service. Pages are under `src/app`,
feature components under `src/frontend/features`, reusable controls under
`src/frontend/components/ui`, and translations under `src/shared/i18n`.

```sh
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Browser tests use Playwright with Chrome, Firefox and Brave. Install the actual browsers
and trust the test application's public certificate before running `npm run test:e2e`.

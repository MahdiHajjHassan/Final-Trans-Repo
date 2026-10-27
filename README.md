*This project has been created as part of the 42 curriculum by mahajj-h, jboustan.*

# Tic Tac Toe

## Description

Tic Tac Toe is a web application for two friends using separate browser sessions
on one computer, or one signed-in player against the computer. X starts; three
marks in a row, column or diagonal win. Accounts, moves and results are stored in
SQLite, and the server validates every action.

The application includes registration, login, account editing, administrator user
management, invitation codes, live game updates, recent matches, English/French/
Arabic, right-to-left layouts, and remembered light/dark themes. Privacy and terms
pages are available from every page's footer.

## Instructions

### Prerequisites and startup

Install Git, Node.js **24**, npm, Docker with Compose, and current Google Chrome.
Edge is used by the default browser test suite; the optional Firefox project uses
Playwright's Firefox build. Native Windows dependency installation may require
Python and Visual Studio C++ Build Tools for `better-sqlite3`. Git Bash is useful
for the supplied POSIX scripts.

From the repository root:

```sh
npm ci
npm run setup
docker compose up --build -d --force-recreate
```

Open **https://localhost/en/play** after trusting the local public certificate
authority as described below. The complete application starts through the single
Compose command; it deploys migrations and creates the initial administrator.

Setup creates a Git-ignored `.env` containing random credentials and refuses to
overwrite an existing file. Read `ADMIN_EMAIL` and `ADMIN_PASSWORD` privately from
that file. `.env.example` documents the variables with placeholders. Existing
accounts and passwords are preserved on subsequent startups. Register another
account through the interface for friend play. Mailbox ownership is not verified
and the application sends no email.

For a different port, use `npm run setup -- --port 8443` before the first startup.
An existing `.env` must keep `HTTPS_PORT` and `APP_ORIGIN` consistent. Use the same
`COMPOSE_PROJECT_NAME` for every command belonging to an instance. Named volumes
preserve SQLite data and certificates across recreation; do not remove volumes
when restarting the application.

### Local HTTPS trust

Only Caddy publishes a host port, bound to loopback. The application container
runs as a non-root user. Export and verify the instance's **public** root CA:

```sh
./scripts/verify-tls.sh
```

Run this script with Git Bash on Windows. The PowerShell equivalent is:

```powershell
New-Item -ItemType Directory -Force local-certs | Out-Null
docker compose exec -T proxy cat /data/caddy/pki/authorities/local/root.crt |
    Set-Content -Encoding ascii local-certs/root.crt
npm run smoke
```

For browser access, import `local-certs/root.crt` into Windows Current User
Trusted Root Certification Authorities, the macOS trusted system keychain, or
the Linux system/browser trust store. Firefox may require importing it under
Settings > Privacy & Security > Certificates > Authorities. Reload the page and
confirm a valid HTTPS connection. Never export the CA's private key or bypass
certificate checks.

`compose.cloud.yaml` is an optional build-only override for an environment that
supplies a public network proxy CA through `CODEX_PROXY_CERT`. Normal local builds
use `compose.yaml`. Keep private values out of shell output, Git and screenshots.

### Play and administration

1. Register and sign in. Select **Play computer**, choose an empty square, and
   finish a game. **Play again** starts a separate saved match.
2. For friend play, use two browser profiles or a private window with different
   accounts. One player selects **Create friend game** and shares its invitation
   code; the other enters it under **Join with code**.
3. Take turns, show a win or draw, then reload or reconnect. The saved board is
   restored before moves are enabled. After a lost response or conflict, refresh
   canonical state before trying a new move; uncertain moves are not blindly
   retried. Cancel an unjoined room or confirm resignation from an active game.
4. Change language and theme from the header. Board cells support Tab and
   Enter/Space; the turn/result heading announces changes. The board remains LTR
   inside an Arabic page so cell coordinates remain consistent.
5. The administrator's **Users** page can search, create, edit roles/names and
   delete users. Members cannot administer accounts. The last administrator
   cannot be deleted or demoted. Account deletion revokes sessions, ends active
   games safely and anonymizes historical player references.

Privacy/terms links open a separate tab during registration, preserving the form
in its original tab. Passwords are not persisted in browser storage.

## Technical stack and choices

| Area | Technology and reason |
| --- | --- |
| Frontend and backend | Next.js App Router, React and TypeScript provide server-rendered pages, client interactions and route handlers in one application. |
| Styling | Tailwind CSS and shared semantic CSS tokens provide reusable components, responsive layouts and both themes. |
| Persistence | Prisma with SQLite provides typed data access and transactional persistence for a small, single-instance application. |
| Validation and security | Zod schemas, Argon2id password hashing, hashed session tokens, origin checks, current-role authorization and persistent rate limits. |
| Live updates | Authenticated server-sent events over HTTPS deliver versioned game snapshots and reconnect recovery. |
| Runtime and tests | Node.js 24, Docker Compose, Caddy, Vitest and Playwright. |

The server checks the session, game membership, turn, cell and expected version.
Transactions prevent competing joins or moves from both claiming the same state.
Events are published after commit. A process-wide event bus supports one running
application process; multiple replicas would require a shared event broker.

Sessions use random tokens in Secure, HttpOnly, SameSite=Lax cookies; only token
hashes are stored in the database. Password changes revoke sessions. Game views
contain display names rather than email addresses or credentials. Existing
internal cookie/header names are shared across the application and proxy.

The computer plays O. It takes an immediate win, usually blocks an immediate
threat, then prefers the center and corners. A 15% imperfect branch can select a
weaker legal move, allowing it to lose. The human move and any computer reply
commit atomically. This is a local heuristic opponent, without an external model
or service.

## Database schema

| Model | Key fields and relationships |
| --- | --- |
| `User` | String ID and unique email, display name, password hash, `MEMBER`/`ADMIN` role and timestamps; owns sessions and can occupy game seats. |
| `Session` | Hashed token as the string primary key, expiry timestamp and user foreign key. |
| `RateLimitBucket` | String key, integer action count and window-start timestamp. |
| `Game` | String ID, friend/computer mode, encoded nine-cell board, X/O player foreign keys, turn, status/result, unique invitation code, integer version and timestamps. |
| `GameMove` | String ID, game foreign key, mark, integer cell and ply; unique constraints on game+cell and game+ply. |

Deleting an account sets historical player references to null after resolving
active games. Moves and results remain. The schema and migration are in
`prisma/schema.prisma` and `prisma/migrations/`.

## Team and project management

| Member | Roles and responsibilities |
| --- | --- |
| Mahdi Hajj Hassan — `mahajj-h`, GitHub `MahdiHajjHassan` | Product Owner, Project Manager and Technical Lead/Architect; backend/security, database/container foundation, integration, accessibility corrections, documentation and final verification. |
| Joseph Boustany — `jboustan`, GitHub `josephboustany` | Frontend and test developer; UI/localization integration, account/game/admin pages, browser suites and Linux certificate-export adaptation. |

Work was organized through feature branches and GitHub pull requests, with
dependent interfaces integrated in order. Email was used for coordination and
handoffs. Type checks, lint, server tests and browser flows support review before
merging. Each member is responsible for explaining the implementation and their
own contributions during evaluation.

## Features and individual contributions

| Feature | Contribution |
| --- | --- |
| Database, migrations, container startup and HTTPS | Mahdi developed and integrated the foundation. |
| Authentication, account security and role enforcement | Mahdi developed the services and tests; Joseph integrated the account/preferences/admin interfaces. |
| Rules, computer opponent, persistence and concurrent moves | Mahdi developed the shared implementation and services; Joseph integrated the rules and complete game interface. |
| Live updates and recovery | Mahdi supplied the event/stream services; Joseph integrated the live client and reconnection flows. |
| Design system, themes, languages, RTL and server-rendered pages | Joseph integrated and adapted the shared frontend; Mahdi corrected control-border contrast and obsolete copy. |
| Automated verification | Mahdi supplied server/testing infrastructure and final integration; Joseph integrated the browser suites and fixed public-CA extraction on Linux Docker hosts. |

The code and tests were developed with AI assistance, as described under
Resources. Reuse and integration of shared source are included in these
contributions; the table does not claim independent authorship of every line.

Challenges included preventing races and lost-response duplicate moves,
recovering live sessions safely, keeping localized/legal flows consistent, and
trusting local HTTPS without disabling certificate validation. Version predicates
and transactions address concurrent writes; canonical snapshots address recovery;
shared dictionaries and components keep UI behavior aligned; explicit public-CA
trust addresses browser and script HTTPS access.

## Modules and point justification

| Chosen module | Type / points | Implementation | Member responsibilities |
| --- | ---: | --- | --- |
| Frontend and backend frameworks | Major / 2 | React pages and Next.js server route handlers | Mahdi backend; Joseph frontend |
| Complete web game | Major / 2 | Friend/computer Tic Tac Toe with rules, results and recovery | Mahdi services; Joseph rules/UI integration |
| AI opponent | Major / 2 | Local imperfect win/block/position policy | Mahdi shared implementation; Joseph integration |
| Real-time features | Major / 2 | Scoped HTTPS event streams, versions and reconnection | Mahdi service; Joseph live client |
| Advanced permissions | Major / 2 | Guest/member/admin boundaries and protected administrator user CRUD | Mahdi backend; Joseph admin UI |
| ORM | Minor / 1 | Prisma schema, relationships and transactions | Mahdi |
| Custom design system | Minor / 1 | At least ten used primitives, semantic palette, typography, SVG marks and shared states | Joseph integration; Mahdi accessibility fixes |
| Multiple languages | Minor / 1 | Complete English, French and Arabic dictionaries and switcher | Joseph |
| RTL | Minor / 1 | Arabic mirroring, logical spacing and isolated game coordinates | Joseph |
| SSR | Minor / 1 | Server-rendered account, lobby and authorized saved-game content, including board HTML without JavaScript | Joseph pages; Mahdi services |
| **Total proposed** | **15** | Five major and five minor modules | Both |

The final module score is awarded during evaluation, after the mandatory
requirements and demonstrations pass. The additional-browser module is not
included in this total: it requires two additional browsers beyond Chrome.
Theme switching and basic email/password authentication are included features
without separate extra points. This project does not claim the larger standard
user-management module with avatars/friends, remote-player, statistics,
tournament or public-API modules.

## Verification

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run audit:source
npm run smoke:auth
npm run smoke:games
npm run test:e2e
./scripts/verify-tls.sh
```

`npm run verify` runs the main checks sequentially. The default end-to-end command
runs actual Chrome and Edge. Run `npx playwright test --project=firefox` separately
after installing Playwright's Firefox build with `npx playwright install firefox`.
A runner that cannot start is not a browser-compatibility pass. The installed
Windows Firefox runner failed to start during verification (`spawn UNKNOWN`);
Firefox compatibility is therefore unclaimed on that host.

Browser tests use a separate Compose project and `.env.e2e`, with guarded reset
logic for that isolated test database. Override `TICTACTOE_E2E_PROJECT`,
`TICTACTOE_E2E_PORT` and `TICTACTOE_E2E_ENV_FILE` together when sharing a Docker
host. The suite exports its separate public test CA to
`local-certs/<TICTACTOE_E2E_PROJECT>.crt`. Windows setup attempts a Current User
Root import; first-time trust can require interactive approval. For an unattended
run, `TICTACTOE_E2E_CA_VOLUME` may select an already-trusted **test** CA volume;
the project's game-data volume remains separate. Linux/macOS runners must
prepare the isolated stack and trust that CA in the
relevant system/browser store before running browser cases. Trusting the normal
instance's `local-certs/root.crt` does not automatically trust this test instance.
Browser and Node certificate/hostname validation remain enabled.

`npm run rehearse` copies the current source to a private temporary directory and
performs fresh setup/checks and isolated Chrome flows. Logs and browser artifacts
are ignored under `.logs`, `test-results` and `playwright-report`; they can contain
test inputs and should be kept private. Server tests use disposable SQLite files.

## Resources and AI use

- [Next.js documentation](https://nextjs.org/docs) — App Router, rendering, route handlers and cookies.
- [React documentation](https://react.dev/) — components, state and client interactions.
- [Prisma documentation](https://www.prisma.io/docs) and [SQLite documentation](https://www.sqlite.org/docs.html) — schema, constraints and transactions.
- [Tailwind CSS documentation](https://tailwindcss.com/docs) — the styling framework.
- [Caddy documentation](https://caddyserver.com/docs/) — local HTTPS and reverse proxying.
- [Playwright documentation](https://playwright.dev/docs/intro) and [Vitest documentation](https://vitest.dev/guide/) — browser and server testing.
- [Argon2 specification, RFC 9106](https://www.rfc-editor.org/rfc/rfc9106.html) — password hashing.

Codex assisted Mahdi with architecture, implementation, debugging, tests,
accessibility checks and documentation. Claude assisted Joseph with frontend
integration, testing and the Linux Docker certificate-export fix. AI-generated
suggestions were used across both application and test code. This assistance is
separate from the local computer opponent described above. Both team members
remain responsible for reviewing, understanding and demonstrating the result.

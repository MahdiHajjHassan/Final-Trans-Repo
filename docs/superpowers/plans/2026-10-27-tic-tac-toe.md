> Delivery update2026-10-27: the later owner request authorizes staging commit/push. Earlier no-commit restrictions below describe the implementation phase. No final-repository delivery or external deployment is authorized.

# Tic-Tac-Toe Implementation Plan

> **For agentic workers:** Owner approved implementation on 2026-10-27. Use superpowers:executing-plans. Steps use checkbox syntax; actual execution evidence belongs in the plan ledger.

**Goal:** Deliver a small, complete tic-tac-toe project with friend and computer modes, all mandatory requirements, and 16 demonstrable candidate module points.

**Architecture:** A server-authoritative Next application uses Prisma/SQLite for games, accounts and moves. HTTPS actions mutate state transactionally; scoped SSE publishes canonical snapshots. A local imperfect AI replies within the human-move transaction.

**Tech Stack:** Node.js 24, existing pinned Next/React/TypeScript/Tailwind/Prisma/SQLite/Caddy dependencies, and actual Chrome/Firefox/Edge Playwright projects.

**Spec:** ../specs/2026-10-27-tic-tac-toe-design.md

## Global constraints

- The owner permits removing superseded code and documents.
- Both friend and computer modes; one computer with separate browser sessions.
- Target: G01-G10 = 14 points; G11 advanced permissions = 2-point buffer.
- Superpowers and Impeccable are required. Other project skills need approval.
- No commits, pushes, publishing, printed credentials, or data-volume deletion.
- Preserve .env and public/private certificate material. Do not reset accounts in an existing database; use a new game database/volume.
- Keep both reference PDFs and historical staging manifests unchanged.
- English/French/Arabic, Arabic RTL, light/dark, keyboard access, HTTPS and meaningful SSR are required.
- Source and helpers may be reused selectively. Compatibility with previous features is not required.
- New games and tests must not use the normal runtime database as a disposable fixture.
- Run resource-heavy Windows commands sequentially and server tests with one worker. Observe disk/commit memory before repeated builds.

## Review focus

1. Two people join the last seat concurrently: one claims it; the other sees a clear conflict. Task 3.
2. A repeated click or uncertain response must not place two moves or silently retry an old version. Tasks 3 and 6.
3. Closing/reopening tabs or restarting the server must restore the committed board and release abandoned subscriptions. Tasks 5 and 9.
4. Deleting an account during a game must terminate/anonymize it safely without a phantom turn or lingering authorized stream. Tasks 4 and 5.
5. A late snapshot must not undo a displayed result, and a delayed AI response cannot move after termination. Tasks 3, 5 and 6.

## Shared contracts

Actor and Role live in src/shared/auth.ts.
The new game types live in src/shared/games.ts:

- Mark = X | O; Cells is exactly nine entries of X | O | null.
- GameDTO: id, mode, cells, players, status, turn, winner, reason, winningLine,
  version, createdAt, updatedAt, finishedAt. Player projections contain public
  displayName and kind HUMAN/AI/DELETED, never email or credentials.
- GameView: game: GameDTO, viewerMark: Mark, inviteCode: string | null.
  The code is non-null only for the creator of a waiting HUMAN game.
- MoveInput: cell: integer 0-8, expectedVersion: positive integer.
- GameService.create(actor, {mode}): Promise<GameView>.
- GameService.join(actor, {code}): Promise<GameView>.
- GameService.read(actor, id): Promise<GameView>.
- GameService.listMine(actor, {page}): Promise<{items: GameDTO[]; total: number; page: number; pageSize: 10}>.
- GameService.move(actor, id, MoveInput): Promise<GameDTO>.
- GameService.resign(actor, id, {expectedVersion}): Promise<GameDTO>.
- GameService.cancel(actor, id, {expectedVersion}): Promise<GameDTO>.
- GameEvents.subscribe(gameId, listener): () => void.
- GameEvents.publish(gameId, version): void, called only after commit.

## Task 1: Establish the game foundation and executable contracts

**Files:** Use game composition in src/server/services.ts,
src/shared/auth.ts and prisma/schema.prisma; create src/shared/games.ts and the
new game's initial migration; adapt src/server/db.ts, scripts/setup.mjs,
scripts/migrate.mjs, scripts/seed.ts and tests/helpers/{db,fixtures}.ts.

**Produces:** User/Session/RateLimitBucket/Game/GameMove schema, the shared types
above, isolated real-SQLite helpers, and secret-safe setup.

- [x] Write tests for a fresh game database, schema relations, duplicate game/cell or game/ply rejection, safe repeated seeding and setup refusal to overwrite .env.
- [x] Run the new migration/setup tests before implementation and observe the expected missing-schema failure.
- [x] Implement the schema and bootstrap. Game human references are nullable with safe deletion handling in Task 4. Use the game-data volume.
- [x] Use generic auth/security infrastructure. Keep private .env values intact; unused legacy keys do not become requirements for new installations.
- [x] Verify fresh migration and rerun with unchanged seeded-account IDs. On Windows test actual NTFS access behavior rather than interpreting Unix permission bits as ACLs.

## Task 2: Implement and prove game rules and the computer policy

**Files:** Create src/server/games/rules.ts, ai.ts, schema.ts and
tests/server/{game-rules,game-ai}.test.ts.

**Interfaces:** evaluateBoard(cells) returns winner/winningLine/draw;
applyMove(cells, mark, cell) returns the new evaluated board without mutating
input; chooseAiMove(cells, random = Math.random) returns a legal cell or null.

- [x] Write literal cases for all eight winning lines, a ninth-move draw, terminal boards, occupied cells and non-integer/out-of-range inputs.
- [x] Write AI cases for taking an immediate win, blocking with a random value below .85, allowing a legal imperfect alternative above that threshold, and never moving on a full/finished board.
- [x] Observe RED, implement pure rules and policy, then run both files to GREEN.
- [x] Prove the AI can beat a scripted weak opponent and can lose, using controlled random inputs. No external AI service, perfect-play requirement or production test switches.

## Task 3: Implement authoritative game services and HTTP actions

**Files:** Create src/server/games/{service,http,dto}.ts and the routes listed in
the spec; wire src/server/services.ts; create tests/server/{games,game-http,
game-concurrency}.test.ts.

**Consumes/produces:** The exact GameService contracts above and the existing
origin/session/input/rate-limit helpers, using game cookies and proxy headers.

- [x] Write failing HTTP/service cases for anonymous and unseated actors, self-join, invalid/used codes, illegal/out-of-turn moves, resignation and cancellation.
- [x] Add real independent-connection races: two joiners; duplicate moves with the same version; move versus resignation. Assert one committed result and consistent move rows.
- [x] Implement eight-character secure code generation and normalization, bounded collision retry, join limits and expected-version predicates within transactions.
- [x] AI games commit the human move plus any AI reply atomically; increment version per actual move. Persist exactly one terminal result.
- [x] Use 400/401/403/404/409 as defined in the spec; return safe DTOs and never accept caller-supplied boards, marks or winners.
- [x] Run all new game service/HTTP/concurrency tests to GREEN.

## Task 4: Complete accounts and advanced permissions for the game

**Files:** Adapt src/server/auth/, src/server/users/service.ts, src/features/
auth.tsx and users.tsx, account/admin routes and tests/server/{auth,sessions,
admin-users}.test.ts; add tests/server/game-account-deletion.test.ts.

**Consumes:** Current-role authorization and Game state transitions.
**Produces:** Secure guest/member/admin boundaries and a safe deletion operation.

- [x] Preserve or recreate signup/login/logout, Argon2id, hash-only sessions, profile/password changes and server/client validation.
- [x] Test all admin user CRUD/role paths, concurrent last-admin protection and immediate denial after session revocation.
- [x] Test deletion with waiting, active-human, active-AI and finished matches. Cancel waiting games; active games end in the surviving opponent's favor; remove private identity references.
- [x] Implement account deletion transactionally and publish changed game versions after commit. Administrators cannot forge moves/results.
- [x] Keep registration form values while reading legal links; adapt the existing three-language regression to the replacement auth UI.

## Task 5: Implement scoped live updates and recovery

**Files:** Create src/server/games/events.ts, stream.ts,
src/app/api/games/[id]/events/route.ts and tests/server/game-stream.test.ts.

**Consumes:** GameEvents and GameService.read. Use a process-wide bus shared
across Next route bundles; membership/auth are checked independently of the bus.

- [x] Write failing stream cases for an initial snapshot, only the subscribed game's committed updates, invalid sessions, revocation, abort cleanup and out-of-order versions.
- [x] Implement HTTPS SSE with text/event-stream, no-store, a 15-second heartbeat and retry: 2000. Limit each account to five simultaneous streams.
- [x] Authenticate before subscribing and reauthorize before state delivery and at heartbeats. Close revoked streams and release every timer/listener on disconnect.
- [x] Send a full latest snapshot on every reconnect. Register the listener before the first read and filter versions so the initial-read race cannot lose or reverse an update.
- [x] Verify streaming through Caddy, not only in-process. Keep the standard immediate flush for text/event-stream and avoid buffering or insecure TLS flags.

## Task 6: Build the game-first interface, SSR and design system

**Files:** Create src/features/games/{lobby,board,live-game}.tsx and
src/app/[locale]/{play,games/[id]}/page.tsx; adapt src/app/page.tsx,
src/app/[locale]/layout.tsx, src/components/ui.tsx, globals.css, robots.ts,
sitemap.ts, and DESIGN.md. Add tests/browser/{games,game-recovery,ssr}.spec.ts.

**Consumes:** GameView for the initial server render; GameDTO for live updates.
**Produces:** Play/create/join, waiting room, board, results and play-again flows.

- [x] Use Impeccable for the game surface and applicable context/quality checks. Keep the brief focused on clear play, not a visual identity workshop or added product features.
- [x] Make Play computer, Create friend game and Join with code findable immediately. Show a waiting-room code only to its owner.
- [x] Build stable keyboard-operable cells and accessible turn/result announcements, clear cancellation/resignation confirmations and a basic personal recent-games list.
- [x] Show pending/reconnecting/conflict states; disable moves until synchronized. Never automatically replay uncertain moves.
- [x] On a stream error, use an authorized snapshot request to classify recovery: 401/403 clears private state and returns to sign-in, 404 shows an unavailable game, and network/5xx retries at 2 seconds with backoff capped at 10 seconds. Create a fresh EventSource when needed rather than assuming every HTTP failure reconnects automatically.
- [x] Render meaningful lobby rules, authenticated recent games and the initial authorized board in server HTML. Verify HTML/metadata with JavaScript disabled; playing requires JavaScript.
- [x] Use at least 10 real shared primitives across auth, lobby, board, confirmations and admin. Document the components and tokens actually used.
- [x] Test human wins/draws/resignation, AI play, new-game replay, stale tabs, dropped/reopened connections, and focus retention.

## Task 7: Complete languages, RTL, themes and legal text

**Files:** Adapt src/i18n/, src/components/preferences.tsx, legal pages and
tests/browser/appearance.spec.ts; preserve/update registration-legal.spec.ts.

**Consumes:** Every game/error/recovery state from Tasks 2-6.

- [x] Add complete en/fr/ar wording, including the AI, room codes, all HTTP errors, confirmation text, rules and connection states.
- [x] Preserve form contents on validation errors; keep invitation codes LTR inside Arabic, mirror layout logically and distinguish X/O without color.
- [x] Verify light/dark persistence, 360px/1280px layouts, keyboard focus and contrast. Inspect actual rendered gameplay in both themes and Arabic.
- [x] Update Privacy/Terms for accounts and stored game records. Do not claim services/features that are absent.
- [x] Verify all registration legal links open separately and return to an intact form in all three languages.

## Task 8: Keep one product and document it accurately

**Files:** package.json, compose.yaml, .env.example, AGENTS.md, PRODUCT.md,
README.md, docs/requirements/module-matrix.md, docs/api/ and delivery routing.

**Produces:** One game application with current documentation and dependencies.

- [x] Remove superseded feature routes, services, scripts, dependencies and styles.
- [x] Use game-data and retain all data/certificate volumes without pruning.
- [x] Keep smoke:auth and smoke:games for verified HTTPS flows without printing credentials.
- [x] Require only actual game settings in setup/seed/config; preserve private .env files.
- [x] Document real architecture/schema, commands, module IDs, AI policy and contribution records.
- [x] Remove superseded documents at the owner's request; retain original work/authors in Git history.

## Task 9: Verify the complete replacement and stop

**Files:** Adapt tests/helpers/e2e-*, playwright.config.ts, scripts/verify.mjs,
scripts/rehearse.mjs and add scripts/smoke-games.mjs,
tests/browser/{games,multiuser,game-recovery,admin,auth}.spec.ts and
docs/evaluation/tic-tac-toe-evidence.md.

- [x] Run npm test -- --maxWorkers=1, npm run typecheck, npm run lint, npm run build and the artifact audit sequentially. Report every remaining failure.
- [x] Run Linux/container tests for POSIX behavior and platform-appropriate Windows setup checks; do not hide a Windows failure behind a Linux pass.
- [ ] G09 withheld: Firefox cannot start in the Windows loader. Chrome/Edge26/26 passed; isolated databases/ports and normal-data protection verified. Current target15points uses G11 buffer.
- [x] Default isolated Compose settings are project tictactoe-e2e-mahdi, port 8443 and ignored .env.e2e; use port 9443 if 8443 is occupied and pass it consistently. Require the exact isolated project label, allowed project prefix and high test port before any test database reset.
- [x] Demonstrate two browser sessions on one computer, simultaneous join/move races, AI competence/imperfect play, cancellation/resignation, restart/reconnect, roles and deletion during play.
- [x] Verify /api/health, all game/account mutations and streaming over real chain/hostname-validated HTTPS. Trust the generated public CA for normal browser use.
- [x] Recreate containers and show saved accounts/matches persist in the new game volume. Check responsive/theme/locale/RTL/keyboard states and unexpected console errors.
- [x] Verify fresh setup from the exact uncommitted source using a private temporary source copy that excludes .git, .env, databases and build artifacts. Existing npm run rehearse requires a commit: adapt it or record it as deferred, never commit just to satisfy that tool.
- [x] Record evidence for G01-G11 individually; only complete modules count. Record human explanation/contribution checks separately.
- [x] Owner confirmed on 2026-10-27 that the two-member team, Mahdi and Joseph, is accepted. Apply this clarification without inventing contributors.
- [x] Stop at this tested scope. Future publishing, Git commits and final-history delivery need a separate owner instruction.

## Review and execution status

Owner approved the plan and instructed execution on 2026-10-27. Both play
modes and the accepted two-member roster are
confirmed. Execute directly and keep evidence in the plan ledger.

Builder check: a fresh software-engineering reviewer read the spec and plan
and returned "nothing important left." This checks planning ambiguity only;
it is not game implementation, browser evidence, owner approval or a score.

Final execution evidence: docs/evaluation/tic-tac-toe-evidence.md. The retained ledger records the scope adjustment and every execution ruling. No official score or human contribution is inferred.

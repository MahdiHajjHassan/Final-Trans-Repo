> Execution update (2026-10-30): the owner subsequently authorized full
> implementation and ppd delivery, superseding the original planning-only scope.
> The three modules are implemented; the dated delivery evidence records actual
> verification, deviations and publication. Original task checklists describe
> intended coverage and are not evidence that every suggested case was executed.
> Email remains separate; prod promotion is Khalid's later action.

# Four-Player Tournament Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after review. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add registration, management, fixed semifinals/final and persisted automatic advancement for one candidate point.

**Architecture:** Tournament/Entry/Match rows organize existing HUMAN Game rows. The game service settles a terminal round inside its existing write transaction; the bracket UI polls metadata, while the existing player-only game SSE remains unchanged.

**Tech Stack:** Existing Node 24/Next/React/Prisma/SQLite, shared auth/rate-limit helpers, Vitest and Playwright. No new networking or bracket dependency.

**Spec:** `docs/superpowers/specs/2026-10-30-khalid-modules-design.md`, four-player tournament section.

## Global Constraints

- Inherit the package roadmap's constraints, baseline/integration instructions and final gates.
- Exactly four distinct signed-in participants. Host is slot 1; SF1 = slots 1/2, SF2 = slots 3/4; their winners play FINAL.
- Draws replay the same pairing with switched X/O; only an actual game winner advances. No arbitrary-size bracket or client-supplied result.
- Bracket visibility does not authorize reading another pairing's board or SSE.
- Account deletion cancels affected running tournaments transactionally; earlier finished games remain historical.
- Preserve ordinary friend/AI games and existing live-game presentation.

## Review Focus

- Simultaneous fourth joins/start requests cannot exceed four entries or create duplicate semifinals; Task 1.
- Concurrent semifinal completion, duplicate terminal calls and draws cannot advance twice or produce multiple finals; Task 2.
- Existing game retries, app restarts and stale pages recover from canonical SQLite state; Tasks 2–3.
- Deleting host/entrant in each lifecycle state does not break admin CRUD or invent champions; Task 2.
- A participant can view pairings but cannot read/play/stream an unseated game; Tasks 2–3.

---

### Task 1: Persistent lobby, registration and fixed bracket creation

**Files:**
- Create `src/shared/tournaments.ts`.
- Create `src/backend/modules/tournaments/{tournaments.service,tournaments.controller,tournament-view}.ts`, `src/backend/modules/tournaments/dto/tournament.schema.ts`.
- Create `src/backend/common/security/invitation.ts`; modify `src/backend/modules/games/games.service.ts` to import the unchanged eight-character generator instead of duplicating it.
- Create `src/app/api/tournaments/route.ts`, `src/app/api/tournaments/join/route.ts`, `src/app/api/tournaments/[id]/route.ts`, and `src/app/api/tournaments/[id]/{start,leave,cancel}/route.ts`.
- Modify `prisma/schema.prisma`, `src/backend/services.ts`, `scripts/test-db.ts`; add additive `_tournaments` migration.
- Create `tests/server/tournament-lobby.test.ts`, `tests/server/tournament-http.test.ts`, `tests/server/tournament-migration.test.ts`.

**Interfaces:**
- `TournamentEntryDTO = {id: string; slot: 1|2|3|4; profile: PublicProfile|null}`; null profile is a deleted participant.
- `TournamentMatchDTO = {id: string; slot: 'SF1'|'SF2'|'FINAL'; status: 'PENDING'|'ACTIVE'|'FINISHED'|'CANCELLED'; version: number; entryAId: string|null; entryBId: string|null; winnerEntryId: string|null; attempt: number; currentGameId: string|null}`.
- `TournamentDTO = {id: string; status: 'LOBBY'|'RUNNING'|'FINISHED'|'CANCELLED'; version: number; hostId: string|null; championSlot: 1|2|3|4|null; inviteCode: string|null; entries: TournamentEntryDTO[]; matches: TournamentMatchDTO[]; createdAt: string; finishedAt: string|null}`. No board/cells/moves/session/email fields.
- `TournamentList = {items: TournamentDTO[]; total: number; page: number; pageSize: 10}`.
- `createTournamentService(db, options?: {code?:()=>string})` produces `create(actor, input): Promise<TournamentDTO>`, `join(actor, input): Promise<TournamentDTO>`, `read(actor,id): Promise<TournamentDTO>`, `listMine(actor,input): Promise<TournamentList>`, `start(actor,id,input): Promise<TournamentDTO>`, `leave(actor,id,input): Promise<void>`, `cancel(actor,id,input): Promise<TournamentDTO>`; actor `Actor|null`, IDs strings, inputs unknown.
- HTTP: POST `/api/tournaments` `{}` → 201; GET same `?page=1`; POST `/api/tournaments/join` `{code}`; GET `/api/tournaments/[id]`; POST `start/leave/cancel` `{expectedVersion}`; leave returns 204, other actions `{data: TournamentDTO}`. Validate duplicate query keys and all extra input fields.

- [ ] Write real-DB tests for create/host seat, three joins, normalized eight-character code, duplicate retry returning the same membership, self/repeated join, missing/fifth account, unique slot/pairing order, member leave and host cancel. Start with three is CONFLICT; non-host start/cancel is FORBIDDEN; stale version is CONFLICT.
- [ ] Write `test("concurrent fourth joins never exceed tournament capacity")` with two independent connections: `expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1)` and `expect(await f.db.tournamentEntry.count({where: {tournamentId: event.id}})).toBe(4)`. Race two starts; assert exactly two ACTIVE HUMAN semifinal games and one PENDING final match, no AI/inviteCode or duplicate rounds. Test forced code collision retry (maximum five attempts) and lobby restart/reload.
- [ ] Add HTTP privacy/origin/auth/quota tests: host-only lobby code, member-only bracket read, no private profile keys, malformed IDs/extra fields, quotas 5 create/20 join/30 other lobby writes per minute/user. Migration tests preserve old users/games and nullable ordinary-game links; ensure the guarded test reset will delete tournament dependencies safely.
- [ ] Run `npm test -- tests/server/tournament-lobby.test.ts tests/server/tournament-http.test.ts tests/server/tournament-migration.test.ts`; observe intended RED.
- [ ] Implement models/FKs/unique indexes and the transactional service/controller. Freeze roster at start; create the fixed three matches and only the two semifinal games atomically. Ordinary games retain null tournament fields. Reuse currentActor inside writes and parameterized queries. The host cannot leave their own lobby; cancel is their available action. In the isolated reset, delete GameMove/Game before TournamentMatch, then TournamentEntry/Tournament, before deleting users; preserve the existing isolation guard and the email session's challenge cleanup.
- [ ] Run the focused tests, `npm test -- tests/server/games.test.ts tests/server/game-identifiers.test.ts`, types and lint. Commit message `feat: add four-player tournament registration`.

### Task 2: Atomic results, draw replays and account deletion

**Files:**
- Create `src/backend/modules/tournaments/tournament-results.ts`, `src/backend/modules/tournaments/tournament-deletion.ts`.
- Modify `src/backend/modules/games/games.service.ts`, `src/backend/modules/games/game-view.ts`, `src/backend/modules/users/users.service.ts`, `src/shared/games.ts`.
- Create `tests/server/tournament-results.test.ts`, `tests/server/tournament-deletion.test.ts`; extend `tests/server/game-account-deletion.test.ts` and stream tests where the DTO gains tournament metadata.

**Interfaces:**
- `settleTournamentGame(tx: Prisma.TransactionClient, gameId: string): Promise<void>` resolves only the currently linked FINISHED attempt, creates draw replays/final/champion in the caller's transaction, and is an idempotent no-op for ordinary or already settled games.
- `cancelTournamentsForUser(tx: Prisma.TransactionClient, userId: string): Promise<{id: string; version: number}[]>` cancels affected running events/active games, removes lobby participation or cancels a deleted host's lobby; returns changed game refs. No publication or separate transaction inside this helper.
- Add `GameDTO.tournament: {id: string; matchId: string}|null` via a narrow relation in gameInclude and `gameDto`; preserve all existing DTO properties. Add `TOURNAMENT_CANCELLED` to GameReason, with localized rendering later.
- A match's current game is `(tournamentMatchId, tournamentAttempt=match.attempt)`, with database uniqueness. Canonical entry IDs, not names, determine the winner when X/O switches in a replay.

- [ ] Write `test("draw creates one replay without advancing either player")` through actual `games.move`: after a full-board draw, `expect(match.attempt).toBe(2)`, `expect(match.winnerEntryId).toBeNull()` and `expect(replay.xId).toBe(original.oId)`. Also test one semifinal winner, both winners create exactly one final, final yields the correct champion and resignation advances. Repeat settlement does nothing; old-attempt/stale commands cannot resolve the new game.
- [ ] Use independent connections to finish both semifinals concurrently and to submit competing terminal actions. Assert no duplicate final/replay, final players match recorded entry winners, all writes roll back if progression fails, no events publish before commit, and DB reopen retains the bracket/champion.
- [ ] Write deletion regressions for non-host/host LOBBY, semifinal ACTIVE, waiting-for-other-semifinal winner, active FINAL, FINISHED tournament and historical deleted opponent. Assert preserved admin delete capability and last-admin safeguards, cancelled unfinished games/no new champion, finished-round preservation, anonymized entry profile and cascade removal of avatar/friend/session rows. Ordinary/AI deletion results retain their existing semantics.
- [ ] Prove every non-seated participant still gets 403 for the other semifinal's read/move/resign/SSE despite knowing its ID. Run `npm test -- tests/server/tournament-results.test.ts tests/server/tournament-deletion.test.ts tests/server/game-account-deletion.test.ts tests/server/game-stream.test.ts`; observe RED.
- [ ] Implement settlement inside move/resign transactions after saving the terminal game and moves. Claim match version/current attempt before changing it; switch marks by attempt parity on draws; create FINAL only from both completed semifinal winners. Commit all changes together, then use the existing original-game publisher. Do not publish or advance in a read/controller/UI callback.
- [ ] Integrate deletion helper before normal game/account deletion. Cancel RUNNING events and their active Game rows; preserve previously finished rounds. Merge returned affected-game refs with the delete service's final persisted versions (deduplicate by ID, use the latest version) before post-commit publication. No stale event after a newer deletion update.
- [ ] Rerun focused tests, all server tests, types and lint. Commit message `feat: advance tournament rounds atomically`.

### Task 3: Registration/bracket UI and four-context demo

**Files:**
- Create `src/app/[locale]/tournaments/page.tsx`, `src/app/[locale]/tournaments/[id]/page.tsx`.
- Create `src/frontend/features/tournaments/components/{TournamentLobby,TournamentBracket}.tsx`.
- Modify `src/frontend/features/games/components/LiveGame.tsx`, `src/frontend/layout/Navigation.tsx`, locale dictionaries/styles and guarded test fixture setup.
- Create `tests/browser/tournament.spec.ts`, `docs/api/tournaments.md`; update privacy text if required by the new participant records.

**Interfaces:**
- UI consumes TournamentDTO and existing GameView; it never sends selected winners or manipulates boards directly.
- Bracket fetches the canonical read endpoint on a visible five-second interval and after lobby actions, with one request in flight and abort on hide/unmount. On 409 reload canonical state and explain the stale action; do not retry a mutation automatically.
- Tournament game completion offers the bracket link; drawn players follow its currentGameId to replay. Ordinary rematch behavior stays unchanged. Only the seated member sees an actionable play link; others see pairing/outcome text.

- [ ] Add `test("four profiles complete semifinals replay and final")` using authenticated isolated contexts A/B/C/D: create, join, inspect pairings, host start, play a semifinal draw/replay, finish both semifinals, verify final, win final and reload champion. Assert persisted state with `expect(finalBracket.status).toBe("FINISHED")` and `expect(finalBracket.championSlot).toBe(expectedSlot)` using the authorized bracket API after reload. Check all four contexts can find their assigned game without any new session or invitation bypass.
- [ ] Add late-fifth join, refresh/stale start, non-host cancel, non-seated board/SSE rejection, running deletion interruption and return-to-bracket cases. Verify ordinary game rematch still works. Use scripted legal moves for determinism, not a client score-write API.
- [ ] Add mobile Arabic/long-name bracket reading-order, keyboard focus, empty/loading/permission/error and both-theme checks. Run `npx playwright test tests/browser/tournament.spec.ts --project=chrome` against an isolated trusted-HTTPS setup; observe actual missing UI RED before writing components.
- [ ] Read Impeccable craft-floor immediately before UI edits. Build lobby with one clear registration/start action; render SF1/SF2/FINAL in a semantic ordered structure that stacks on mobile. Reuse rounded components and preserve physical game board direction. Show waiting/replay/cancelled/champion states as text, no new animation framework or live spectator board.
- [ ] Run focused browser cases on actual Chrome/Firefox/Edge, types/lint and server regressions. Update API/setup/docs and record real evidence; commit message `feat: add tournament lobby and bracket screens`.
- [ ] Verify all four tournament subject bullets; carry the module to the package's final combined gate before claiming its point.

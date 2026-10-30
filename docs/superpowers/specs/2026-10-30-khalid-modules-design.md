> Execution update (2026-10-30): the owner subsequently authorized full
> implementation and ppd delivery, superseding the original planning-only scope.
> The three modules are implemented; the dated delivery evidence records actual
> verification, deviations and publication. Original task checklists describe
> intended coverage and are not evidence that every suggested case was executed.
> Email remains separate; prod promotion is Khalid's later action.

# Khalid's four-point module package

Status: selected design, subsequently implemented under the owner's explicit
ppd delivery request. The detailed rules are implementation defaults; the dated
evidence records tests and deviations without claiming every suggestion ran.

## Intent, sources and boundaries

Add useful features that Khalid can implement, test, demonstrate and explain.
Keep the existing game small and reliable. Preserve actual authorship; this
document does not claim that Khalid wrote existing authentication or game code.

| Module | Subject requirements | Candidate addition |
| --- | --- | ---: |
| Standard user management, IV.3 p14 | Profile editing, uploaded/default avatar, friends and online status, profile page | 2 |
| Tournament, IV.6 p17 | Bracket/order, pairings, participant matchmaking, registration/management | 1 |
| Statistics and match history, IV.3 p14 | Statistics, opponents/dates/results, achievements/progression, leaderboard | 1 |

The earlier verified baseline was 16 candidate points; the intended total is
20 only after all four additional points and the current baseline work in the
updated app. The original evaluation sheet counts incomplete modules as zero
and requires genuine teamwork and individual understanding. Browser evidence
for an older UI does not establish Chrome/Firefox/Edge coverage for this UI.
The subject's bonus remains capped at five points; a 20-point candidate package
does not change that cap.

Sources: unchanged `docs/reference/en.subject.pdf` v21.1 and
`docs/reference/EVALUATION-SHEET.pdf` (image-based, read through OCR). Preserve
their checksums from AGENTS.md. No official score is promised.

Latest fetched preprod: `13c79e6e54d33666516ad020113c3ba07623c902`.
Latest fetched prod/reference: `e9fa33fe9c69cf9d220c8273d2f635d781347b05`.
The redesign is rounded Readex Pro with burgundy/rose and ivory/wine themes.
The root planning checkout also contains older uncommitted evidence/docs;
do not copy that checkout over current main. Start implementation from freshly
fetched ppd and carry only the approved planning documents forward.

Email verification belongs to the owner's separate laptop session. Do not
merge the unfinished cloud email branch, modify its sender, replace its guards,
or duplicate its migration. Coordinate shared-file integration when its actual
commit is available; run these modules against the final combined auth flow.
Development is preprod only. No prod push, promotion or external deployment.
No spectator, remote-player module, chat, OAuth, app 2FA, new game or ELO engine.
Four browser profiles/contexts on one computer are sufficient for the demo;
no LAN setup or exposing the Compose listener is necessary.

## Approaches

- **Recommended:** extend the existing Next/React/Prisma/SQLite services, save
  canonical avatars in SQLite, use short authenticated presence polling, reuse
  Game rows for tournament rounds, and derive statistics from completed games.
  This keeps the existing container and one source of truth.
- Filesystem/object-storage avatars, WebSockets, generic bracket sizes and
  stored statistic counters add storage/synchronization work without serving
  the selected scope. They are excluded from this proposal.

The owner selected the module package; the recommended technical approach is
the planner's proposal for review. It is not a record of a separate owner vote.
An independent builder check of this design returned "nothing important left";
this is a design-clarity check, not an implementation or security review.

## Shared architecture and UI

Reuse `currentActor`, `requestActor`, `requirePageActor`, `withWriteRetry`,
`jsonData`, `handleApi`, `requireSameOrigin`, the existing limiter and real
SQLite fixtures. New JSON endpoints reject unknown/duplicate query keys, use
existing error codes and private/no-store responses. Parse UUIDs and bounded
pagination; mutations recheck authorization inside their transaction. No client
chooses another actor, a score, winner, role or ownership flag.

Routes follow `/:locale/...`, with English/French/Arabic and RTL. Member profile
routes are signed-in only. New screens extend the current rounded design,
existing shared form/table/dialog/pagination components and navigation. No new
visual world, generated decoration, font or palette. Use textual online/result
labels, keyboard focus, associated feedback and numeric/code direction handling.
Check both themes, 360px Arabic and desktop, plus the existing 320px navigation
regression and reduced motion. Keep game-board geometry and motion unchanged.

Surfaces: `/profiles/[id]` for a person's profile; `/friends` for discovery and
requests; existing `/account` for self-edit/avatar; `/tournaments` and
`/tournaments/[id]` for registration/bracket; `/history` for own matches and
statistics; `/leaderboard` for standings. Navigation groups profile/friends and
history/leaderboard to preserve narrow-screen wrapping. Every screen needs
empty/loading/error/permission states; no statistics chart library is needed.

Implement the plans in order: user management, tournament, then statistics.
Each plan owns its migration and tests; no all-module schema scaffolding first.
Keep module boundaries under `src/backend/modules`, `src/frontend/features`,
thin Next routes, and explicit contracts under `src/shared`.

## Standard user management — 2 candidate points

### Profiles and privacy

Retain display-name editing through PATCH `/api/account` and existing password
changes. Other signed-in users can view public member information: ID, display
name, avatar URL and join date. Never expose email, role, password, session IDs,
verification fields or pending email state through discovery, friends, rankings
or profiles. Discovery searches display names only (`q` 2–60 trimmed characters,
substring matching with the existing SQLite search semantics), 25 per page
ordered displayName then ID; duplicate names are
allowed and actions identify the UUID. Reject unknown filters.

`src/shared/profiles.ts` owns `PublicProfile` and `ProfilePage`; the latter adds
`relationship: SELF | NONE | OUTGOING | INCOMING | FRIEND` and
`online: boolean | null` (null unless self/friend). PublicProfile is reusable
in friends and leaderboard DTOs; it does not include relationship or presence.

### Uploaded and default avatars

Add `UserAvatar(userId PK/FK cascade, data Bytes, revision Int, updatedAt)`.
Store only one canonical image per user in the existing persistent SQLite DB;
no new volume, external storage account or user-controlled path.
Default: local `public/default-avatar.svg`, rendered whenever no upload exists.

PUT `/api/account/avatar` takes raw PNG/JPEG/WebP bytes, not JSON or multipart.
Check origin/session before reading; count streamed bytes independently of
Content-Length, reject over 2 MiB (2,097,152 bytes), malformed images, animation,
SVG, dimensions over 4096 on either side or over 16,777,216 pixels. Decode and
re-encode with explicitly pinned `sharp@0.35.5` (already present transitively
in this baseline's lockfile). Crop to 256×256 WebP, quality 80, strip metadata,
and reject output over 96 KiB. Decode outside the write transaction, then
recheck the actor and atomically upsert; a failed upload preserves the old image.
DELETE restores the default. GET `/api/profiles/[id]/avatar` is authenticated,
returns canonical bytes with image/webp and nosniff, or the default image for
an existing user without an upload; missing users get 404. All are no-store.
An avatar URL includes its revision so client image state updates after changes.
Limit avatar mutations to five per 15 minutes/user. Cascading deletion removes
the avatar automatically, without changing account-deletion game semantics.

### Friends and presence

Add `Friendship(id, userAId, userBId, requestedById, status PENDING|ACCEPTED,
createdAt, updatedAt)`; canonical lexicographic pair, unique(A,B), cascade with
either account. Both IDs are existing distinct users; requestedBy is one member.
POST request creates one pending pair; only the recipient can accept. Recipient
may decline, requester may withdraw, either accepted member may remove. Reverse
simultaneous requests do not auto-accept: return the existing incoming request
and require the recipient to accept. Duplicate request is idempotent; unrelated
actors cannot accept/remove. Limit relationship mutations to 30/minute/user.
Friend list, incoming and outgoing requests are paginated at 25. Pending request
DTOs return online=null; only accepted friends can see each other's status.

Presence is approximate website presence, not a guarantee that a person is at
their keyboard. Add nullable `Session.lastSeenAt`; legacy sessions begin offline.
Login sets it; an immediate then 15-second heartbeat updates only the calling
valid session while its tab is visible. Online means at least one unexpired,
unrevoked session with lastSeenAt >= now minus 60 seconds. Logout/password
change/deletion stop that session's eligibility immediately; other valid
sessions remain independent. Poll friends every 15 seconds while visible and
abort timers/requests on hide/unmount. Show only online/offline to friends, no
last-seen timestamp. Reuse HTTPS requests, not another SSE/WebSocket service.
Limit heartbeat to 30/minute/session, without forcing logouts on 429.

## Four-player tournament — 1 candidate point

### Registration and fixed bracket

One host creates a tournament and takes slot 1. Three other signed-in accounts
join with an eight-character code using the existing game-code alphabet.
One account occupies one slot, capacity exactly four. No anonymous aliases,
AI seats, arbitrary sizes, seeding engine or elimination consolation matches.
Seats take the lowest free position; display the pairings before starting.
Only the host can start with exactly four current participants. Before start,
non-hosts can leave and host can cancel. After start, roster and pairings freeze.

State: LOBBY → RUNNING → FINISHED, or CANCELLED. Pair slot1/slot2 in SF1 and
slot3/slot4 in SF2; their winners play FINAL. Create both semifinal games at
start and final only when both winners exist. Only seated players can read
boards/make moves through existing Game authorization. All four participants
may view the bracket's names, statuses, outcomes and assigned-game IDs; bracket
responses contain no live boards, moves or invitation codes for playing games.
The tournament invitation is visible only to the host while in LOBBY.

### Persistence and transactional progression

Add Tournament (host nullable FK SetNull, joinCode unique, status, version,
championSlot nullable, timestamps), TournamentEntry (id, tournamentId cascade,
slot 1–4, userId nullable FK SetNull, unique tournament/slot and tournament/user),
TournamentMatch (id, tournamentId, slot SF1|SF2|FINAL, entryAId/entryBId nullable,
winnerEntryId nullable, status PENDING|ACTIVE|FINISHED|CANCELLED, attempt Int,
version; unique tournament/slot). Entries and match winners preserve bracket
structure when deleted accounts become anonymized placeholders.

Game adds nullable tournamentMatchId FK and tournamentAttempt Int with unique
(tournamentMatchId,tournamentAttempt). Ordinary games keep both null. A match's
current Game is identified by match ID plus its attempt; no circular currentGame
foreign key is necessary. All tournament games are HUMAN, ACTIVE, both seats
assigned, inviteCode null. Existing engine/move/resign and SSE remain authoritative.

A terminal game calls `settleTournamentGame(tx, gameId)` in the SAME transaction
as the final move/resignation. Guard on the match's current attempt/version.
A draw records the finished game and creates the next attempt for the same pair,
switching X/O each time. Unlimited draws do not advance either player. The
bracket labels a replay clearly; resignation remains an available normal action.
A win resolves one match exactly once. The second semifinal winner creates one
final; the final winner sets championSlot/FINISHED. No browser submit-winner API,
read-triggered advancement, background job or artificial winner after a draw.
Concurrent/retried terminal requests never duplicate games or advancement.
Publish existing game events only after commit; poll bracket metadata every
five seconds while visible. Finish screens link back to the bracket rather than
offering an independent rematch for a tournament game.

Use expectedVersion for start/leave/cancel; stale host actions return CONFLICT.
Join is capacity/uniqueness checked transactionally and returns the current
membership on duplicate retry. Rates/user/minute: create 5, join 20, lobby actions
30. Preserve existing game-action limits. A host cannot cancel a running event;
participants can resign their current match. Disconnects do not forfeit games.

### Account deletion and recovery

Preserve existing administrator deletion capability. Within its transaction,
deleting a member of a running tournament cancels that tournament and its active
games, preserving earlier completed rounds and showing an interrupted reason;
it does not invent a champion or create games with missing players. A new
GameReason TOURNAMENT_CANCELLED labels those cancelled games. Deleting a host
in LOBBY cancels it; deleting another lobby member frees that seat. Finished
tournaments remain historical, with deleted-player labels and no old email/name
snapshot. Return all changed Game refs to the existing post-commit publisher.
Reload/restart reconstructs the bracket from SQLite without an in-memory owner.

## Statistics and match history — 1 candidate point

Derive results from Game rows on read; do not add counters that need backfilling
or exactly-once updates. Personal history includes FINISHED human/AI games,
10 per page ordered finishedAt DESC, ID DESC, optional mode ALL|HUMAN|AI.
Show date (localized), opponent/Computer/Deleted player, mode, win/loss/draw and
finish reason. The caller only sees their own history. Reuse existing game read
permissions for detail links, including deleted-player cases. Existing recent
games listing remains intact; it is not itself a new completed module.

Competitive summary/leaderboard use HUMAN FINISHED games with reasons LINE,
FULL_BOARD or RESIGNED. Exclude AI games, waiting/cancelled games and
ACCOUNT_DELETED automatic forfeits. Completed games against a later-deleted
opponent still count for the surviving player; identity is anonymized, not the
result. Every completed draw replay is a real game and counts once. Finished
rounds from a subsequently cancelled tournament remain results.

For each member: played = wins+losses+draws; points = 3*wins+draws;
winRate = played ? round(100*wins/played) : 0;
level = 1+floor(points/10); progress = points%10 out of 10.
Achievements: first match (played>=1), first victory (wins>=1), ten matches
(played>=10), each with clear earned/locked feedback. These implement this
module's progression; no separate gamification point is claimed.

Leaderboard includes extant users with played>=1, ordered points DESC, wins
DESC, createdAt ASC, ID ASC, 25 per page. Rank is the one-based position in that
stable order; own rank is null before an eligible game. Never rank by AI wins.
Produce aggregates with parameterized SQLite SQL/Prisma.sql, handling X and O
seats independently and ignoring deleted owners. Read a summary and its rank in
one database snapshot. No email, passwords, sessions or invite codes in DTOs.
Views: own summary/achievements with history; shared signed-in leaderboard.

## Completion, delivery and ownership

Three linked plans under `docs/superpowers/plans/2026-10-30-khalid-*` break this
into independently reviewable deliveries. Each records exact files, interfaces,
RED/GREEN tests, commands and review checkpoints. Native implementation remains
the execution workflow used. The owner subsequently authorized full implementation
and ppd delivery; the dated evidence records the completed verification.

For each module run real-DB service/HTTP tests and focused browser flows. At the
combined gate run types/lint/all server tests/build/artifact audit, HTTPS checks
and actual Chrome/Firefox/Edge. Use guarded test databases and four isolated
authenticated browser contexts; never reset normal data or bypass authentication.
Follow Superpowers TDD and Impeccable context/craft-floor/rendered review during
implementation. Obtain fresh whole-branch and UI reviews before claiming complete.

Maintain current permission/browser/module regressions. Update README, API docs,
privacy translations, schema documentation and module matrix as functionality
actually lands. Record only observed evidence, actual Khalid contributions and
his authenticated commits; determine his real campus/GitHub identity before any
delivery attributed to him. The owner authorized preparing the prod-compatible branch and manual; Khalid
performs the actual prod integration/push under the stated delivery scope.

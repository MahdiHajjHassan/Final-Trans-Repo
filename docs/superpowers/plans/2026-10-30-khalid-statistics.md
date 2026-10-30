> Execution update (2026-10-30): the owner subsequently authorized full
> implementation and ppd delivery, superseding the original planning-only scope.
> The three modules are implemented; the dated delivery evidence records actual
> verification, deviations and publication. Original task checklists describe
> intended coverage and are not evidence that every suggested case was executed.
> Email remains separate; prod promotion is Khalid's later action.

# Statistics and Match History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after review. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete personal statistics, match history, achievements/progression and leaderboard integration for one candidate point.

**Architecture:** Derive all results from saved Game rows in database snapshots. Hydrate only the safe public profile projection for leaderboard rows; expose own history and signed-in standings without another live channel or statistic counter store.

**Tech Stack:** Existing Node 24/Next/React/Prisma/SQLite, parameterized Prisma.sql, Vitest and Playwright. No chart, ranking or analytics dependency.

**Spec:** `docs/superpowers/specs/2026-10-30-khalid-modules-design.md`, statistics/match history section.

## Global Constraints

- Inherit the package roadmap's constraints, latest-ppd/email integration instructions and final gates.
- Competitive games are HUMAN/FINISHED with LINE, FULL_BOARD or RESIGNED reason; exclude AI, WAITING, CANCELLED and ACCOUNT_DELETED automatic forfeits.
- played=wins+losses+draws; points=3*wins+draws; winRate=played?round(100*wins/played):0; level=1+floor(points/10); progress=points%10 out of 10.
- Achievements: first match (played>=1), first victory (wins>=1), ten matches (played>=10).
- Leaderboard order: points DESC, wins DESC, user.createdAt ASC, user.id ASC; only extant players with played>=1; one-based stable position, null own rank before eligibility.
- History includes own FINISHED human/AI games, 10/page; leaderboard 25/page; no opponent email, roles, tokens, invite codes or score-write endpoint.

## Review Focus

- X and O seats, draws and resignation affect the correct owner exactly once; Task 1.
- AI wins, cancellations and deletion forfeits do not inflate competitive standings; Task 1.
- Later opponent deletion anonymizes identity while retaining legitimate previous results; Task 1.
- Equal scores, zero games, old rows and concurrent game completion yield defined ranks/progression without NaN or duplicated counters; Task 1.
- Tournament draw replays and the full four-context flow reconcile with displayed history, progress and standings; Task 2.

---

### Task 1: Canonical queries, privacy and HTTP contracts

**Files:**
- Create `src/shared/statistics.ts`.
- Create `src/backend/modules/statistics/{statistics.service,statistics.controller,statistics-query}.ts` and `src/backend/modules/statistics/dto/statistics.schema.ts`.
- Create `src/app/api/account/statistics/route.ts`, `src/app/api/account/history/route.ts`, `src/app/api/leaderboard/route.ts`.
- Modify `src/backend/services.ts`; reuse the safe profile projection from user management rather than the admin/account DTO.
- Create `tests/server/statistics.test.ts`, `tests/server/statistics-http.test.ts`, `tests/helpers/finished-games.ts`.

**Interfaces:**
- `AchievementId = 'FIRST_MATCH'|'FIRST_WIN'|'TEN_MATCHES'`; `Achievement = {id: AchievementId; earned: boolean; current: number; target: number}`; current is clamped at target for display, while aggregate counts remain exact.
- `StatsSummary = {played: number; wins: number; losses: number; draws: number; points: number; winRate: number; rank: number|null; level: number; progress: number; nextLevelPoints: 10; achievements: Achievement[]}`.
- `HistoryItem = {gameId: string; mode: 'HUMAN'|'AI'; opponent: {id: string|null; displayName: string; kind: 'HUMAN'|'AI'|'DELETED'}; outcome: 'WIN'|'LOSS'|'DRAW'; reason: GameReason; finishedAt: string; tournamentId: string|null}`.
- `HistoryPage = {items: HistoryItem[]; total: number; page: number; pageSize: 10}`.
- `LeaderboardRow = {rank: number; profile: PublicProfile; played: number; wins: number; losses: number; draws: number; points: number; level: number}`; `LeaderboardPage = {items: LeaderboardRow[]; total: number; page: number; pageSize: 25}`.
- `createStatisticsService(db)` produces `summary(actor: Actor|null): Promise<StatsSummary>`, `history(actor: Actor|null,input: unknown): Promise<HistoryPage>`, `leaderboard(actor: Actor|null,input: unknown): Promise<LeaderboardPage>`.
- GET `/api/account/statistics` (no query); GET `/api/account/history?page=1&mode=ALL|HUMAN|AI`; GET `/api/leaderboard?page=1`; all authenticated, bounded integers, strict/duplicate query validation, `{data: ...}`, no-store. No userId query for another person's history.

- [ ] Build consistent saved-game fixtures with valid boards/participants/results and deterministic dates. Start with `test("two wins one loss and one draw produce seven points")`: `expect(summary).toMatchObject({played:4,wins:2,losses:1,draws:1,points:7,winRate:50,level:1,progress:7})`. Test X/O seats, full-board draws and resignation. At points10, assert level2/progress0; zero games => counts0/ranknull/level1/progress0, never NaN.
- [ ] Test achievement thresholds at played0/1/9/10 and wins0/1. Add HUMAN tournament replays, normal/AI games, WAITING/CANCELLED/TOURNAMENT_CANCELLED and ACCOUNT_DELETED fixtures. Assert every finished competitive attempt counts once, AI appears only in mode-appropriate history, and cancelled/automatic deletion outcomes do not enter rankings.
- [ ] Delete a completed opponent through the real admin service and assert the surviving person's earlier legitimate win/loss/draw remains while identity becomes Deleted player. Deleted owners disappear from rankings. Verify stable tie order and rank across the 25-row boundary, history order across the 10-row boundary, mode filters, database reopen and all legacy ordinary Game rows.
- [ ] Add authorization/privacy/query HTTP tests, own-history-only protection, unknown userId filter rejection, no private keys in API/server page models and consistency when a game finishes between summary/rank reads (one snapshot, no mixed totals). Run `npm test -- tests/server/statistics.test.ts tests/server/statistics-http.test.ts`; observe intended RED.
- [ ] Implement a single reusable parameterized aggregation that expands HUMAN game X/O seats into owner outcomes, applying exact reason/status filters. Use a transaction snapshot for summary+rank and each list+total; hydrate safe profile fields in a batch. No dynamic SQL from user text, stored score counters or full-history loading into the browser. Add only an additive index migration if the observed query plan justifies it; no database data rewrite/backfill is needed.
- [ ] Run focused tests, `npm test -- tests/server/games.test.ts tests/server/tournament-results.test.ts tests/server/tournament-deletion.test.ts`, types and lint. Commit message `feat: derive player statistics and match history`.

### Task 2: History, progression and leaderboard UI

**Files:**
- Create `src/app/[locale]/history/page.tsx`, `src/app/[locale]/leaderboard/page.tsx`.
- Create `src/frontend/features/statistics/components/{StatsSummary,MatchHistory,Leaderboard}.tsx`.
- Modify `src/app/[locale]/profiles/[id]/page.tsx` only to link the signed-in owner's own statistics/history; do not expose another person's private history.
- Modify `src/frontend/layout/Navigation.tsx`, dictionary files, styles and guarded synthetic fixtures only as needed.
- Create `tests/browser/statistics.spec.ts`, `docs/api/statistics.md`; update README/privacy/module evidence at the combined gate, not before feature completion.

**Interfaces:**
- Server-render summary/history/standings using the service methods from Task 1 and `requirePageActor`; strict pagination/mode query parsing for server pages as well as JSON routes.
- StatsSummary consumes StatsSummary DTO; MatchHistory consumes HistoryPage; Leaderboard consumes LeaderboardPage. Use aliased type imports if component/type names match. Reuse existing Pagination/DataTable/Badge/EmptyState/Feedback and same-origin navigation.
- Profile links use leaderboard row UUIDs; AI/Deleted player labels are localized from kind, not translated user names. Date formatting uses selected locale; codes/IDs never masquerade as player-visible names.

- [ ] Add `test("AI history does not change competitive points")`: read own stats, finish a legal AI game, assert `expect(after.points).toBe(before.points)` and `await expect(page.getByRole("table")).toContainText(t.computer)` on AI-filtered history. Reuse the existing translated `computer` key. Also cover a new user's zero state and HUMAN win/loss/draw, reconciling history/counts/first-match/first-win/standings. Verify pagination/filter URLs survive reload and users cannot navigate to another account's history via supplied query IDs.
- [ ] Extend the tournament journey (or a shared isolated setup) to compare real saved semifinal draw/replay/final outcomes with all four players' history/summary and the leaderboard. Seed only guarded synthetic ten-game fixtures to check ten-match achievement; never add a production score-edit or auth-bypass endpoint.
- [ ] Add Arabic 360px/desktop and both-theme/keyboard/long-name/table overflow checks; verify meaningful achievements are labelled earned/locked, rank absence has clear text, and existing navigation wrapping/reduced motion persist. Run `npx playwright test tests/browser/statistics.spec.ts --project=chrome`; observe actual missing UI RED.
- [ ] Read Impeccable craft-floor immediately before UI edits. Build a compact summary, accessible text/progress element for level, explicit achievement list, paginated history and sortable-by-rule (not client-rescored) standings. Explain the 3-point win/1-point draw rule in translated product copy. Keep game history AI/HUMAN labels and automatic deletion reason clear; do not present those forfeits as competitive wins.
- [ ] Run focused flows in actual Chrome/Firefox/Edge, types/lint and server regressions. Inspect rendered states and both themes; update API documentation. Commit message `feat: add history progression and leaderboard screens`.
- [ ] Verify all four statistics/history subject bullets and then run the package's final combined gate. A history table alone does not complete this module.

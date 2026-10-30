> Execution update (2026-10-30): the owner subsequently authorized full
> implementation and ppd delivery, superseding the original planning-only scope.
> The three modules are implemented; the dated delivery evidence records actual
> verification, deviations and publication. Original task checklists describe
> intended coverage and are not evidence that every suggested case was executed.
> Email remains separate; prod promotion is Khalid's later action.

# Khalid Module Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement the linked plans task-by-task after review. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four candidate module points through full user management (2), a fixed four-player tournament (1), and statistics/match history (1).

**Architecture:** Extend the existing service/transaction boundaries and redesigned UI. Deliver three modules sequentially, reusing account authentication, saved Game rows and player-only SSE; keep email verification in the owner's separate session.

**Tech Stack:** Node 24, Next 16, React 19, TypeScript, Tailwind 4, Prisma 7/SQLite, Vitest, Playwright, existing Caddy HTTPS; pin the existing transitive Sharp version as direct only for avatar decoding.

**Spec:** `docs/superpowers/specs/2026-10-30-khalid-modules-design.md`

## Global Constraints

- Implementation and ppd push are now authorized. Prepare a prod-compatible branch and manual; no prod push by this session.
- Preprod `MahdiHajjHassan/Transcendence2` is the development repository. Prod is reference only.
- Freshly fetched ppd baseline for this plan: `13c79e6e54d33666516ad020113c3ba07623c902`; prod reference `e9fa33fe9c69cf9d220c8273d2f635d781347b05`.
- Preserve the rounded Readex Pro/burgundy redesign, English/French/Arabic/RTL and both themes.
- Preserve accounts/games, private environments, reference PDFs and certificate/database volumes.
- No spectator, remote-player module, chat, OAuth, app 2FA, new game or ELO engine.
- Keep email verification in the separate laptop session; reconcile its real landed changes before combined verification.
- 16 → 20 is a candidate target, not an awarded score. Count only complete modules and current verified baseline behavior.
- Preserve actual authorship; identity verification and Khalid's genuine implementation/review precede any delivery attributed to him.

## Review Focus

- Concurrent actions: friendship acceptance and fourth-seat/final creation happen once; covered in user Task 2 and tournament Tasks 1–2.
- Authorization: public projections never reveal email/roles/tokens, and bracket visibility never becomes spectator access; covered in user Tasks 1/3 and tournament Tasks 2–3.
- Draws/deletion: replays never invent winners and deleted players never strand an active bracket; covered in tournament Task 2.
- Old data and mixed modes: old rows remain valid, cancelled/AI/automatic forfeits do not enter competitive rankings; covered in statistics Task 1 and migration checks.
- Integration: retain the incoming UI and email ownership gates; covered in each UI task and the final combined gate below.

---

## Read and execute in this order

1. [User management](2026-10-30-khalid-user-management.md): profiles/avatar backend, friends/presence, then UI. Produces the full two-point feature.
2. [Tournament](2026-10-30-khalid-tournament.md): lobby/bracket, transactional progression/deletion, then UI. Produces the one-point tournament.
3. [Statistics/history](2026-10-30-khalid-statistics.md): canonical queries/API, then history/leaderboard/progression UI. Produces the remaining point.

Each linked task is an independently testable review unit, uses a failing
behavior test before implementation, and ends with a scoped commit. Native
implementation is recommended because the service contracts are sequential and
the repository is small; obtain a fresh whole-branch review at the combined gate.
Do not assign overlapping shared-file implementation tasks to parallel agents.

## Before implementation on the laptop

- [ ] Read AGENTS.md, this spec and all three plans. Review the proposed draw-replay, friend-request, online-presence, deletion and scoring rules.
- [ ] Fetch ppd and prod again; inspect status and current worktrees. Preserve existing local changes and private data; create/reuse an isolated ppd branch through the project's worktree workflow, based on current ppd main.
- [ ] Carry these planning documents into that branch. Do not replace the latest code with the older cloud root or unfinished email source ZIP.
- [ ] Record the actual starting SHA. Read current DESIGN.md and surface brief; use Superpowers and Impeccable from the approved project setup.
- [ ] Coordinate with the email session: obtain its actual branch/commit and note shared files (schema/migrations, services, auth guards/sessions, account UI, fixtures/reset, translations). Reconcile before combined verification; retain ownership checks without an auth bypass.
- [ ] Run `npm ci`, `npm test`, `npm run typecheck`, `npm run lint` on the isolated starting checkout. Record actual outcomes; do not reuse an older branch's test totals.
- [ ] Test additive migrations on a disposable copy containing existing users, sessions, finished games and the email migration if available. Never reset or migrate the normal demo DB to validate an unfinished feature.

## Final combined gate

- [ ] Complete the focused RED/GREEN cycles and browser cases in all three plans.
- [ ] Confirm normal HUMAN/AI create/join/move/resign/cancel, SSR, admin CRUD/current-role revocation, last-admin protection and game privacy still work.
- [ ] Confirm integration with the completed email session: unverified accounts cannot use profile/friend/presence/tournament/stat APIs; verified password login and all existing flows still work. Coordinate test fixtures with that session's captured test mail rather than inventing a production bypass.
- [ ] Update `package.json` `test:e2e` to include `--project=chrome --project=firefox --project=edge`; check `scripts/verify.mjs` actually invokes all three. Pin browser executables to the actual claimed browsers, not Chromium as a Chrome substitute.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run audit:source`, then `npx playwright test --project=chrome --project=firefox --project=edge` against guarded isolated HTTPS. Record exact browser versions and commands. Respect local CA trust; no insecure TLS flags.
- [ ] Run `./scripts/verify-tls.sh` with the same isolated Compose project and verify one-command setup on a fresh isolated volume. Follow the cloud runtime skill only if executing in the managed cloud.
- [ ] Inspect mobile Arabic and desktop in both themes for every new surface; preserve 320px wrapping and reduced motion. Run Impeccable detector once for changed targets and obtain its required rendered UI review. Resolve material findings; keep artifacts private where appropriate.
- [ ] Obtain a fresh whole-branch code review with the original requests, spec, diffs and test evidence. Fix meaningful findings and rerun affected checks; never describe a review as performed until it exists.
- [ ] Update README, `docs/requirements/module-matrix.md`, API docs, privacy copies, schema description and `docs/evaluation/tic-tac-toe-evidence.md` with actual outcomes. Keep browser evidence tied to this final SHA; mark unfinished modules zero.
- [ ] Add `docs/team/contributions/khalid.md` only with actual identity, work, authenticated commits/reviews and understanding. Do not rewrite Mahdi/Joseph authorship or let a different identity claim earlier code.
- [ ] Leave a reproducible four-profile demo script and exact test-fixture setup; no real credentials in docs. Prepare a ppd reviewable branch/PR according to the owner's delivery request. Prod remains a separate later decision.

## Demonstration once complete

Use four isolated profiles for A/B/C/D. A edits a name and avatar; B sends A a
friend request; A accepts; their friend lists show presence, then go offline
after session revocation or the documented visibility timeout. A creates the
tournament, B/C/D register, and A starts the displayed two-semifinal bracket.
Play one draw/replay, finish both semifinals and the final, then reload to show
the persistent champion. Open each player's history, the result/achievement
summary and leaderboard; explain how saved games produce the numbers. Use only
guarded synthetic fixtures for the ten-game achievement, labelled as test data;
no score-edit API or normal-database manipulation.

## Execution record

The original plan-only status is superseded by the owner's later implementation
request. See [the dated delivery evidence](../../evaluation/2026-10-30-khalid-modules.md)
for actual tests, fixes, review, source/image provenance and delivery. This package
does not complete the separate email work or Khalid's personal prod integration.

# Shared Game Evaluation Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Reproduce and correct defects applicable to current Tic-Tac-Toe without importing the older Taskboard application.

**Architecture:** Preserve the existing Next/Prisma service boundaries. Share browser-safe field validators; keep database, session and verification fixes small. The integration chat owns formatting and final integration.

**Tech Stack:** Node24, Next16, React19, Prisma7/SQLite, Zod4, Vitest5 and Playwright1.64.

**Spec:** Owner coordination instruction of2026-10-28; docs/superpowers/specs/2026-10-27-tic-tac-toe-design.md; original subject/evaluation PDFs.

## Global constraints

- Base3135e9ff52957896a7af79a0aa770d9d13433bb0 on codex/evaluation-fixes. Taskboard archive is separate.
- Preserve environments, certificates, PDFs, volumes and actual authorship. No main merge, force-push or direct prod edits.
- No blanket formatting, renames or moves. Only root README.md is allowed as Markdown in prod; this preprod plan must not be promoted there.
- Coordinate exclusive heavy checks with Review Joseph's email and act. Use real disposable game-schema SQLite tests; never claim Taskboard tests as game/prod coverage.

## Review focus

- Unpaired high/low UTF-16 surrogates must never alias passwords or silently change names.
- Valid Unicode remains supported; browser field limits and backend validation agree.
- Persistent writers cause bounded session conflicts; expired cleanup still denies access.
- Repaired database initialization can retry without leaking the opened handle.
- UUID canonicalization must preserve scoped SSE delivery, not only initial reads.
- Windows setup and test isolation must not inherit broad credential access, mixed-case overrides or secret-bearing diagnostics.

### Task1: Establish game baseline

- [x] Create isolated worktree/branch, install pinned dependencies and verify native bindings.
- [x] Run existing game suite:85/85 tests,22 files. Initial missing nested native binding was setup-only and was repaired before baseline.

### Task2: Account field contracts

Files: src/shared/auth-validation.ts, src/server/auth/schema.ts, src/server/users/service.ts; src/features/{auth,users,validation}; corresponding auth/admin and browser tests.
Interfaces: emailSchema, displayNameSchema, passwordSchema and loginPasswordSchema remain browser-safe; existing exported passwordSchema contract remains available to bootstrap.

- [x] Add malformed-name/password, long-email and admin-ID regressions against real game-schema databases; observe RED.
- [x] Add shared validators and reuse them in server inputs; observe GREEN (7bccae4).
- [x] Load the game Impeccable context before UI work and observe browser RED before implementing raw-value validation.
- [x] Observe current-game browser validation failures before UI corrections, then verify corrected cases.
- [x] Commit only verified account-contract changes and regression tests (c9d5005; shared server contracts7bccae4 and bootstrap3810c92).

### Task3: SQLite and session recovery

Files: src/server/{db,db-write}.ts, src/server/auth/session.ts; tests/server/{db-initialization,db-recovery,sessions}.test.ts.
Interfaces: createDb/getDb retain PrismaClient contracts; isBusy becomes reusable; logout retains its existing409 conflict contract.

- [x] Reproduce failed initialization, real handle leak and real separate-process writer contention against the game schema.
- [x] Clear only rejected initialization state, close failed clients, bound logout retries and defer busy expired-session cleanup.
- [x] Verify real-database regressions and existing game/auth/session tests; commit810cbd0 (89/89, types/lint). Independent integration review accepted it; prod focused10/10 passed after adaptation.

### Task4: Canonical game identifiers and streams

Files: src/server/games/{schema,stream}.ts, tests/server/game-identifiers.test.ts; admin identifier correction belongs to Task2.
Interfaces: accepted UUID references resolve to their canonical stored identifier; event subscriptions use the canonical game.id returned by authorized reads.

- [x] Reproduce uppercase read/move references and uppercase SSE subscriptions.
- [x] Normalize UUID parsing, fix six raw mutation predicate/reload references, then independently observe the missed stream update before correcting canonical subscription/refresh keys.
- [x] Verify isolation and timely real SSE state delivery, plus existing stream/game suites; commit5a59d23 (91/91; subsequent114-test/types/lint run also passed).

### Task5: Local verification isolation

Files: scripts/setup.mjs, scripts/lib/rehearsal-env.mjs, tests/helpers/e2e-environment.ts and corresponding tests.

- [x] Reproduce Windows DACL inheritance, mixed-case rehearsal leakage, unsafe env paths, inherited Compose separators and diagnostic credential leakage.
- [x] Apply only applicable fixes; existing game npm-via-Node execution is preserved.
- [x] Verify setup/isolation tests on Windows and the full game suite/types/lint (2e82ed8;114/114).
- [x] Send exact ready commits, results, dependencies and remaining host/runtime verification limits to the integration chat; release the heavy window.

## Execution ledger

- Ruling: delivered independent database/session recovery before account UI work to unblock selective integration; no functional dependency required another order.
- The full game baseline was85/85 after rebuilding the pinned nested native SQLite binding. The initial missing binding was setup-only.
- Account/isolation focused RED run:17 failures for their intended causes,27 passing controls. After corrections:114/114 game tests, typecheck and zero-warning lint.
- Two original CRLF files retain their line endings to avoid blanket formatting. Temporary unpublished69ac517/9b0ff62 were replaced before handoff by7bccae4/2e82ed8 with minimal diffs.
- Actual-game UI RED:8 intended failures plus1 passing valid-Unicode control. A corrected contrast probe waited for theme animations before measuring all6 failing boundaries.
- Resource windows were explicitly yielded/released between chats. Confirmed trusted authority: tictactoe-e2e-mahdi_caddy-data; data stayed separate.
- Do not change next.config.ts in parallel; the integration chat owns the reviewed build-worker/agentRules alignment.
- A failed browser resource run exposed native GET password submission when hydration fails. Added two synthetic, intercepted no-JS regressions, observed GET RED, then added only POST method properties to six write forms. Admin search remains GET. No API/game handler changes.
- Final complete npm run verify passed:116 server tests, types, lint, build, artifact audit and48/48 actual Chrome/Edge cases. Final Docker image/export, strict HTTPS smokes,108-file runtime/source match and18-view rendering/contrast checks passed.
- Commits45453f0 (preprod-only contrast) andc9d5005 (UI/native credential transport and11 browser cases) delivered with dependencies/results. Both owned9843 containers stopped, volumes retained, heavy window released. Integration/fresh-clone/prod verification belongs to the integration chat.
- Earlier host-resource failures remain recorded. Only the new isolated test credential was rotated after a diagnostic URL exposure; original environments were preserved. Docker file-cache reclamation recovered commit headroom without WSL configuration/restart changes.
- See docs/evaluation/2026-10-28-game-strict-audit.md for the final findings, technical ratings, immutable image and evidence boundaries.

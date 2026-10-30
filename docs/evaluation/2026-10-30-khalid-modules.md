# Module delivery — 2026-10-30

The owner authorized implementing and pushing this package to ppd and preparing
a verified prod-compatible branch plus Khalid's promotion manual. Khalid's
**42 campus login is ksayour**; his GitHub username remains unconfirmed.
Implementation retains Mahdi/Codex authorship. This session performs no prod push
or external deployment. Email verification stays in the owner's laptop session.

## Scope and source

Ppd base: `13c79e6e54d33666516ad020113c3ba07623c902`.
Prod base: `e9fa33fe9c69cf9d220c8273d2f635d781347b05`.
Module commits: `afc1688`, `4853052`, `93fedaf`, `6026c11`, `21ba68b`,
`a195820`, `2105026`, `ccf10f3`; delivery corrections `27b4a29`, `543abeb`, and UI correction `5531e76`.
The subsequent documentation/receipt commits complete this release.

The added candidate points are full profiles/avatars/friends/presence (2), fixed
four-player tournament (1), and full statistics/history/progression/leaderboard
(1). The previously verified baseline was 16; **20 is a candidate mapping**, not
an official award. Mandatory requirements, including separate email work, and
the five-point bonus cap still apply. Theme switching/basic auth add no points.

Safe public identity projections omit emails/roles/secrets. Avatars are bounded,
canonical 256px WebP stored in SQLite. Friendship requires recipient consent;
presence counts current sessions seen within 60 seconds. Visible tabs heartbeat
every 15 seconds, bounded to 30/minute/session to allow genuine navigation.

Four distinct accounts register numbered seats. The lobby previews semifinals
1/2 and 3/4. Terminal moves/resignations advance the bracket in the original game
transaction; draws create another attempt with swapped seats. The final is
created once. Deletion cancels unfinished work and anonymizes retained results.
Bracket access never permits another pairing's game/SSE access.

Statistics derive from saved games, without an editable score counter. Only
completed human LINE/FULL_BOARD/RESIGNED games rank. AI, cancellation and automatic
account-deletion forfeits are excluded; legitimate results survive later opponent
deletion. History is private to its player. See the [API documents](../api/README.md),
[demo manual](../team/khalid-module-manual.md) and
[Khalid's production manual](../delivery/KHALID-PRODUCTION.md).

## Executed checks

| Gate | Actual result |
| --- | --- |
| Fresh ppd baseline install/test/types/lint | Passed; 134 baseline server tests |
| Corrected ppd server suite | **163/163**, 42 files, real disposable SQLite |
| Types / lint / production build / format | Passed |
| Source/public artifact audit | Passed; reference PDFs unchanged, no private source artifacts or configured secrets in public output |
| Chrome 156.0.8078.79 | **39/39** |
| Firefox 157.0 | **39/39** |
| Edge 156.0.4314.56 | **39/39** |
| Full browser matrix | **117/117**, no retries, 4.2 minutes |
| Strict HTTPS readiness / auth / game smokes | Passed; CA-chain and hostname validation enabled |
| Populated additive migration check | Passed; users, hashes, session IDs, finished boards/versions/moves preserved, foreign keys valid |
| Prod-compatible native checks | Fresh npm ci; **160/160**, 41 files; types/lint/build/source audit passed |
| Final UI correction verification | 163/163 server, types/lint/build/audit/format, plus **21/21** affected browser cases after corrections |
| Prod container/browser verification | **117/117** browser cases (39 per named browser), final container compile; strict HTTPS/auth/game smokes passed |

Commands: `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`,
`npm run build`, `npm run audit:source`, `npm run format:check`, and
`npx playwright test --project=chrome --project=firefox --project=edge`.
Smokes: `scripts/verify-tls.sh`, `scripts/smoke-auth.mjs`,
`scripts/smoke-games.mjs`, pointed only at the guarded test instance.

These are the actual named browsers. Firefox's isolated NSS profile trusts only
the public local CA; no insecure TLS flags are used. Historical Windows Firefox
startup failure remains historical, not a claim of a repaired Windows installation.
Ppd uses isolated project `tictactoe-e2e-khalid`, HTTPS 8843. Prod uses separate
project/data/port. Tests reset only their guarded synthetic database. Normal
credentials, database/certificate volumes and CA keys are preserved.

Coverage includes normal HUMAN/AI games, SSE/recovery, server-rendered saved boards
without JavaScript, role revocation/admin deletion, legal forms, keyboard/reduced
motion, French 320px navigation, module journeys and the review regressions.
Private logs/configuration/traces/screenshots remain ignored.

## Review and corrections

A fresh whole-branch code reviewer inspected `13c79e6..27b4a29` with the spec,
plans, migrations, source, tests and manuals. It initially labeled three defects
Minor, with no Critical/Important finding. The controller graded the concrete
user effects Important and fixed all three in one RED→GREEN pass:

- A real 195-byte two-frame APNG silently replaced the previous avatar because
  Sharp omits its frame count. Bounded PNG chunk inspection now rejects it,
  preserving the previous bytes and revision.
- Lobby SF1/SF2 nodes were missing before start. A browser test first failed on
  the absent pairing; read-only previews now use numbered slots without games.
- Implicit time-zone formatting showed Oct31 rather than UTC Oct30 in Kiritimati
  and caused hydration errors. Explicit UTC passes all three browser regressions.

The first browser attempt was **99/102**, not a pass. Chrome/Edge legitimate
navigation exceeded the original six-heartbeat quota; a boundary regression
verified the change to 30/minute/session. An existing Firefox persistence test
aborted its own router refresh; it now reads the real saved value in a fresh
same-session page. Invalid-avatar aria-invalid association was also verified
RED→GREEN. Typecheck caught a test-only `bytes`/`data` field typo before the green
suite; neither failed compile was represented as successful.

The Impeccable reviewer inspected all 36 original Chrome full-page captures:
English desktop and Arabic RTL 360px, light/dark, each with profile, account,
avatar failure, long mixed-script friend name, empty/populated history,
empty/populated standings and finished bracket. The three-browser matrix captures
108 views and asserts no root overflow. The detector ran **once** over changed
frontend targets: 0 primary, 45 advisory findings, largely existing type/radius
drift. Its initial disposition was `fix`: progress styling, statistics spacing,
useful localized avatar rejection, and explicit inherited-world exemption.
The same reviewer scored all four fixes resolved and returned **ship**, limited to that fix set in the refreshed 36 Chrome captures. It did not certify French/320px/motion or other browsers from stills; those browser behaviors remain covered at the automated suite’s actual scope. The ordinary extension keeps DESIGN.md and its existing sidecar. The fresh documenter returned **preserve**, with DESIGN.md and .impeccable/design.json unchanged; all 36 captures were validated, with 14 visually sampled across surfaces/variants. Pre-existing sidecar staleness and unset buildPath are reported without unrequested repair.

## Containers, port and delivery

Canonical ppd Docker image:
`1905f25ceeb545e045090c8819c4052d7971bb35cc74cc73c426061a3a2a7c4e`.
It completed clean npm ci/build with pinned Node bases, verified TLS and non-root
runtime. Corrective matrix image:
`c83aac5f1003c492f2b430efda356640eabbeb8e405b62bbc2b83ad418034e47`.
It reused those unchanged dependencies and compiled an immutable corrected source
snapshot; it is not described as another fresh npm ci. The shipping ppd image is `076d73ebdde7d66b097c2d6b7484a0a9ee24c556dfc77e57968040781e305d80`; all **197/197** selected runtime source/config/asset files match the immutable snapshot by SHA-256. The final UI-only corrections were then exercised in the affected browser cases.

VFS layer duplication exhausted this machine's 32GiB disk on earlier builds.
Install/build now share a Docker layer to avoid repeated dependency snapshots.
The attempted independent canonical prod build also exhausted disk before app
compile; it is a recorded failed infrastructure check. Only unused build cache
and owned superseded unreferenced images were removed, never volumes. Prod has
its own fresh native npm ci and final container compilation/browser checks using
the already clean canonical dependency image. The only lockfile difference is
six optional WASI-target entries absent on this Linux platform; applicable
package versions remain identical. The final prod image is `9b5264fc99364df8b813c8dffe0e79aae63a00113aab6f68f94820400a839066`; **198/198** runtime source/config/asset hashes match. The active Caddyfile matches by SHA-256. Fresh isolated prod setup/startup and all 117 browser cases completed in 4.2 minutes; final types/lint/format also pass after the runner configuration correction. All 65 approved vendored skill blobs match their ppd originals; upstream whitespace is preserved.

The prepared `codex/khalid-prod-ready` branch is published **in ppd only**. It
descends from prod `e9fa33f`, applying the module delta without merging ppd history.
It keeps prod's `__Host-taskboard_*` cookies, `X-Taskboard-Client-IP`,
`x-taskboard-locale`, `taskboardDb`, existing Tabs/CSS, .logs default and runtime
conventions. Approved guidance/docs and unchanged reference PDFs accompany it.
The initial port test caught an omitted new default-avatar asset; the corrected
suite passed. Its first browser run passed all 39 Chrome cases, then Firefox
stopped at health warmup with an unknown-issuer error. The port had omitted
the root Playwright optional-executable setting, so the configured public-CA
launcher was ignored. Both test CA fingerprints matched; copying the setting
corrected runner trust without bypassing TLS. The full matrix was rerun. Prod's baseline lacks ppd's three preference tests, accounting for
160 versus 163; this port removed no tests.

Khalid must authenticate his own GitHub login, check access, fetch the prepared
branch into a fresh prod clone, pass the current-main ancestry check, review/test
the merge, record actual verification, and create his own integration commit/PR/
push. Original commits keep their authors; a push does not reassign authorship
or create a personal cryptographic signature. Later prod/email changes require
ordinary integration testing. See the exact [promotion manual](../delivery/KHALID-PRODUCTION.md).

## Limits and deferred coverage

No automated check establishes official points, human understanding, future
contributions, completed email work or large-deployment performance. This is the
requested fixed four-person, single-process application. There is no spectator
or remote-player module. Optional reviewer suggestions are deferred: simultaneous
friend accept/remove, exact achievement transition from 9 to 10 matches, and
account deletion after one semifinal ends while another remains active. No
corresponding implementation failure was identified.

## Execution decisions

- Ruling: previous plan-only restriction is superseded by explicit implementation/delivery authorization — current user instruction — no extra scope beyond the three modules and manual.

- Ruling: cloud skill scripts are not local executable files; keep equivalent task briefs, BASE hashes, RED/GREEN evidence and completion records here — same workflow without installing extra tooling — costs manual bookkeeping discipline.

- U3: HTTP RED→GREEN (1 test); browser RED observed missing Friends heading in actual Chrome over valid HTTPS; UI native lint/build pass. Ruling: build immutable source snapshots to avoid concurrent test/source changes entering Docker COPY — isolates browser builds from subsequent task edits — final verification must still use final committed source. Test log override directs artifacts into this plan workspace instead of earlier sibling ledgers.

- Resource recovery: canonical U3 Docker build failed before app compilation because VFS exhausted 32 GiB disk. Pruned only unused build cache, no volumes/data/certificates/images. Ruling: early browser image reuses existing identical runtime dependencies and compiles immutable source in a small local derived image; final canonical Docker validation remains required where resources permit — avoids repeated full VFS layer duplication — must not mistake a derived image for fresh npm-ci verification. Host fresh npm-ci and production build already passed.

- U3 browser attempt: Arabic/mobile pass; first scenario failed only in initial HTTPS health warmup after Docker bridge recreation (navigation interrupted by chrome-error), before app interactions. Ruling: extend existing single health-GET retry to this observed Chrome network-transition error; retain TLS verification and zero retries for test mutations — no app failure is masked, persistent health errors still fail.

- Ruling: combine the canonical Docker install/compile into one layer with an npm build-cache mount — repeated node_modules snapshots exhausted VFS space before compilation — trades dependency-layer reuse for bounded disk while retaining clean npm ci, same pinned base images, verified TLS and non-root runtime. Only our superseded unreferenced U3 test image and unused build cache are removed; all normal/test data and certificate volumes remain.

- Ruling: presence allowance becomes 30/minute/session instead of 6 while heartbeat cadence remains 15 seconds — observed legitimate full navigation remounts exceeded six and caused console errors — permits 5x bounded DB writes, still rate-limited; unit boundary RED and the existing browser failures are regressions.

- Final: Ruling: corrected browser and visual results not judged by code reviewer — run and inspect the existing final matrix/render gates ourselves and use the separate mandated Impeccable finish reviewer — unobserved browser regressions would invalidate delivery.

- Final: Ruling: code reviewer did not independently rerun native suites — controller runs fresh full tests/types/lint/build and source audit after corrections — inspection alone is not a passing test claim.

- Final: Ruling: email integration excluded from review — keep owner's separate laptop work out of this package, re-fetch both mains before delivery — later completed email changes may need ordinary integration testing.

- Final: Ruling: prod port/publication/Khalid verification excluded from review — verify the prepared prod-compatible branch separately, publish only in ppd, leave actual prod promotion to Khalid — source differences or later prod changes require reverification.

- Final: Ruling: scale performance not judged — target is the explicitly fixed four-person local demonstration; bounded queries/pagination remain, no large-scale load claim — larger deployment may need measurement.

- Final: Ruling: official module points, understanding and future contributions not judged — label 20 candidate points, retain real authorship, require Khalid's actual verification/integration record — evaluator and human contribution assessment remain external.

- Ruling: independent canonical prod build exhausted VFS disk before application compilation — retain the failed attempt as evidence, use fresh prod host npm ci plus final immutable container compile against the already clean canonical ppd dependencies — a platform-specific package mismatch would invalidate that reuse. Comparison finds only six optional WASI entries absent from Linux; pinned applicable versions unchanged. Only unused build cache and superseded owned test images removed, no volumes.

- Ruling: inherited-world FORM had incorrectly said seed unavailable — replace with explicit existing-surface exemption from Impeccable new-work §3, no concept roll claimed — if this were a new visual world, a concept decision would still be required.

- Ruling: vendored skill whitespace warnings in prod aggregate diff — preserve exact approved upstream blobs, exclude .agents only from whitespace gate while checking all app/docs normally — formatting the vendor would break its unchanged-source promise. All 65 approved vendored blobs are compared before publication; normal format checks still pass.

- Ruling: keep the completed isolated worktrees and private verification context for the owner's ongoing laptop/team handoff — explicit request to keep the repositories/context, with actual review/log evidence not replaced by memory — retained private artifacts consume disk and may be cleaned after the continuing work no longer needs them. No other plan workspace is touched.

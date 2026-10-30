# Game evaluation audit - 2026-10-28

Scope: current Tic-Tac-Toe, based on preprod `3135e9ff52957896a7af79a0aa770d9d13433bb0`,
on `codex/evaluation-fixes`. The older Desktop Taskboard audit is preserved on
`codex/taskboard-evaluation-audit` (`ece14a9`, `29a3ec7`); its tests do not establish
game or prod coverage. The accepted Mahdi/Joseph two-member roster is not a finding.

The integration chat owns formatting and integration on `codex/code-readability`.
These commits preserve Mahdi's actual authorship and are supplied for selective
review/import. No main merge, force-push, credential disclosure or volume deletion
was performed here. This preprod report and plan must not be imported into prod,
which permits only its root README as Markdown.

## Reproduced game defects and verified fixes

P1 findings: cached initialization poisoning, inherited credential-file access,
native credential URLs and control contrast. Remaining findings below are P2.
All listed findings are fixed on this branch; these priorities are not grades.

| Finding | Correction | Commit and regression evidence |
| --- | --- | --- |
| Rejected cached database initialization permanently poisons later requests | Clear rejected initialization state so recovery can retry | `810cbd0`; real connection retry |
| A connection leaks when post-connect initialization fails | Disconnect the opened client while preserving the original failure | `810cbd0`; real disposable SQLite handle check |
| Logout under another process's SQLite writer returns an unbounded/unclassified failure | Apply the existing bounded write retry and conflict contract | `810cbd0`; separate-process SQLite writer |
| Expired-session deletion under contention raises instead of simply denying expired access | Defer only busy cleanup; reject the expired session, preserve unrelated errors | `810cbd0`; real writer and error controls |
| Accepted uppercase game references fail writes or miss live updates | Canonical UUID parsing, stored identifiers in mutation predicates, canonical authorized SSE subscription and refresh | `5a59d23`; real move/resign/cancel, foreign membership and timely stream update |
| Unpaired UTF-16 aliases passwords and corrupts names; configured email lengths disagree | Shared browser-safe account schemas reject malformed text and oversized addresses while retaining valid Unicode | `7bccae4`; auth/admin regressions and Unicode positive controls |
| Uppercase administrative user references fail despite valid UUID syntax | Canonical user UUID schema | `7bccae4`; real admin edit |
| Bootstrap accepts credentials that cannot be used through the supported login contract | Reuse the shared email/password schemas with a Prisma-bootstrap-safe relative import | `3810c92`; two observed failures, focused8/8 and db:generate |
| Windows-generated private environments inherit broader access | Set a noninheriting current-SID-only DACL before writing credentials; preserve exclusive-create behavior | `2e82ed8`; inspect actual Windows ACL |
| Windows mixed-case environment keys bypass rehearsal isolation | Case-normalized filtering preserves only permitted runtime/trust settings | `2e82ed8`; injected mixed-case controls |
| Browser harness accepts a template/nonfile environment, inherits the wrong Compose delimiter, or logs configured credentials | Guard a direct private env basename, declare native separator, redact configured sensitive values | `2e82ed8`; path/separator/diagnostic regressions |
| P1: unhydrated credential forms submit passwords through GET navigation URLs | Explicit POST on six write forms; retain the administrative search GET and existing JavaScript/API handlers | `c9d5005`; two actual no-JS Chrome RED cases, then native method/request URL/address checks pass in both browsers |
| Browser form serialization silently changes malformed text, and admin/password errors do not identify their fields | Read original controls, share account validation with the server, and associate errors with their fields | `c9d5005`; registration/login/account/admin/password regressions plus valid accented/Arabic/emoji controls |
| P1: input, secondary-action and playable-cell boundaries have insufficient contrast | Separate control-border tokens from subtle dividers using the already established prod values | Preprod-only `45453f0`; all six boundaries observed RED, then both themes pass in Chrome/Edge |

The actual game baseline passed85/85 tests after repairing a missing local native
dependency binding. The initial missing binding was setup failure, not an app
finding. Through `3810c92`:116/116 game tests in26files, typecheck and lint pass.
An independent source-only backend review found no additional actionable issues.
These results were obtained here; the integration chat verifies its own adapted
preprod/prod copies separately.

## Browser and container verification

Exclusive heavy-check window agreed with the integration chat. Own guarded project
`tictactoe-e2e-evaluation-fixes`, HTTPS9843, private `.env.e2e.evaluation`, separate
game-data volume. Only the explicitly agreed trusted test CA volume
`tictactoe-e2e-mahdi_caddy-data` is reused. Certificate chain and hostname validation
remain enabled for Node and browsers. No other chat's processes or containers
are stopped.

Final working-source `npm run verify` passed with exit0:

- 116/116 real game-database/server tests in 26 files; types and zero-warning lint.
- Windows production build and the stock source/public-artifact/PDF audit.
- 48/48 actual Chrome 156.0.8078.47 and Edge 156.0.4314.50 cases in 3.1 minutes.
  Eleven new cases per browser cover validation, valid Unicode, contrast and
  native no-JS credential transport. The latter use synthetic values and
  intercept document submission; they verify URL safety, not a no-JS login API.
- Final normal Dockerfile build/export passed. Tested runtime image:
  `sha256:a330d28901d43b5d03e2fb5cc3135f7a21526c19737029504d83842e79da4eee`.
  All108 selected runtime source files match;17 public artifacts contain no
  configured credentials. Private env/certificate files are excluded; UID1000.
- Strict HTTPS health, auth and game smokes passed after a guarded reset of only
  this project's disposable database. No normal database was reset.
- 18 rendered game views: en/fr/ar, 320/360/1280px and light/dark, plus a 320px
  registration error capture. No horizontal overflow or unexpected browser
  errors. Minimum measured control contrast3.422:1; text6.011:1. Five captures
  were visually inspected. Keyboard, stored themes, legal popups and two-session
  game behavior are also exercised in the full browser suite.

An earlier44-case run finished36pass/8fail with explicit browser
`ERR_INSUFFICIENT_RESOURCES`; it was not counted as a passing run. The failure
exposed the actual GET credential fallback. Only this audit's generated private
test credential was rotated and its text log redacted; older ignored traces
remain private and obsolete. A preceding corrected-image export was canceled
during host memory exhaustion; its completed retry and the final build are
separate recorded successes.

The Docker VM held2.6GB of reclaimable file cache. Syncing and dropping only
that disposable cache recovered about2.9GB of Windows commit headroom, without
editing WSL configuration or restarting/stopping other sessions. The complete
verification retry then passed. The rendered helper initially expected200 from
the documented204 preferences endpoint; correcting that helper assertion required
no application change. Other assertions and application errors were not hidden.

Both owned9843 test containers were stopped after the checks; all volumes,
environments and certificates remain. The heavy window was explicitly released
to the integration chat. Integrated preprod/prod and fresh-clone checks belong to
that chat; this report establishes the exact audit branch's results.

G09 remains unclaimed; no fresh game Firefox pass is asserted. Older Taskboard
or host Firefox evidence is not game coverage.

## Local UI assessment

These are technical UI ratings, not assignment/module points or an assertion of
a complete assistive-technology certification.

| Dimension | Rating | Observed evidence and limits |
| --- | ---: | --- |
| Accessibility |3/4| Named fields/errors, measured contrast and keyboard flows; full assistive-technology audit not performed |
| Performance |3/4| Production builds and real journeys pass, no added visual assets; sustained-load/device profiling not claimed |
| Theming |4/4| Shared semantic tokens, remembered preferences and both themes exercised |
| Responsive behavior |3/4| Three viewport widths and RTL checked; physical touch hardware not tested |
| Implementation integrity |4/4| Focused Operate surface, consistent primitives and source/image checks |
| Total |17/20| Local technical assessment; remaining verification limits above |

The source detector completed once and reported only the existing Arial font
warning. The committed Operate brief and DESIGN.md intentionally retain this
font; a new visual identity was outside scope. Its earlier allocation failure
was operational, not a completed scan. Independent backend, UI and additional
native-method source reviews found no other actionable findings. They were
source-only reviews; the executed checks above provide the runtime evidence.

## Integration receipt

New source commits: `45453f0418503f6f32800656982fe320acf73598` (preprod CSS only)
and `c9d5005cd4d38d6d59593cb0b3e22569f18ff5e7` (auth/users/validation,
one lobby form-method property and browser regressions). Prod already has the
correct control-border tokens; skip its duplicate CSS import. The behavior
slice depends on shared validators in `7bccae4`, already delivered separately.
No handler, API contract, role payload, redirect or legal link was replaced.

The earlier verified source commits are `810cbd0`, `5a59d23`, `7bccae4`,
`2e82ed8` and `3810c92`. The integration chat's reviewed worker configuration
was reused as `dc26d50`; it is not a new independent audit fix. Evidence and
provenance are recorded separately as preprod-only documentation.

## Evaluation boundaries

The supplied subject and evaluation sheet remain the authority. Candidate module
mapping is unchanged:13 core plus2 advanced-permissions points,15total. Official
scoring, both members' understanding and Joseph's actual contribution/review must
be established by the appropriate humans. Tests do not prove those facts.

Private logs/traces remain ignored and may contain test inputs. Share the commits
and aggregate results, not unredacted private artifacts. Preserve the original
PDF hashes, environments, certificates and all named volumes.

> Historical prepared-source receipt: ac97d86 below. The current production
> integration additionally preserves verified email and Brave from b1d0381;
> see [the current production evidence](../evaluation/2026-10-30-khalid-production.md).

# Prepared production port

This is the production-compatible version of the module package, hosted at
`MahdiHajjHassan/Transcendence2`, branch `codex/khalid-prod-ready`.
The destination is `MahdiHajjHassan/Final-Trans-Repo`; this implementation session
has not pushed there. Khalid's campus login is ksayour, not a verified GitHub login.

## Source ancestry and authorship

- Production parent: `e9fa33fe9c69cf9d220c8273d2f635d781347b05`.
- Ppd implementation range: `13c79e6e54d33666516ad020113c3ba07623c902` through
  `5531e76` (all module runtime and UI corrections).
- Original module commits: `afc1688`, `4853052`, `93fedaf`, `6026c11`, `21ba68b`,
  `a195820`, `2105026`, `ccf10f3`, `27b4a29`, `543abeb`, `5531e76`.
- The aggregate port and its receipt preserve Mahdi's normal author identity.
  They do not reassign original source authorship or claim Khalid's future work.
- The port applies that delta onto production history. It does not merge the
  entire ppd history. Production-only runtime conventions and Tabs/CSS remain.

## Preserved boundaries

The production variant retains `__Host-taskboard_session`, locale/theme cookies,
`X-Taskboard-Client-IP`, `x-taskboard-locale`, `taskboardDb`, `.logs` defaults and
normal database/startup conventions. New routes use existing dynamic auth guards.
Only expected incumbent runtime differences remain between ppd and prod; new
module runtime files match byte for byte. Approved project guidance and reference
PDFs accompany this source; PDF checksums remain unchanged.

Fresh prod npm ci, all 160 server tests, types, lint, build, source audit and format
checks pass. Final container image is
`9b5264fc99364df8b813c8dffe0e79aae63a00113aab6f68f94820400a839066`;
**198/198** runtime source/config/asset hashes match the immutable snapshot.
The active Caddyfile also matches the production source. Exact browser/smoke
results and the failed infrastructure attempts are recorded in
[the dated evidence](../evaluation/2026-10-30-khalid-modules.md).

## Khalid's action

Follow [KHALID-PRODUCTION.md](KHALID-PRODUCTION.md), using your own authenticated
GitHub account and normal commit identity. Confirm that current prod main is an
ancestor before merging. Inspect/run/verify the actual prepared branch, record
what you personally performed, then make your integration commit and production
PR/push. Do not force push, rename cookies, copy private environments/certificates,
reset normal data, or merge the unfinished email checkpoint. The owner is handling
email separately; incorporate only its completed tested work if requested.

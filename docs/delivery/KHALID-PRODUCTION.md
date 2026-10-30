> Completed integration: Khalid Sayour's GitHub account **ksayour-42** published
> [PR #11](https://github.com/MahdiHajjHassan/Final-Trans-Repo/pull/11), merged as
> `61611fc4f91446835f13876aaa5e8ddd7268af1f`. Production includes completed email
> verification and Chrome/Firefox/Brave selection. See
> [the current receipt](../evaluation/2026-10-30-khalid-production.md).
> The command-line steps below remain a laptop workflow; the managed-workspace
> promotion uses the connected GitHub account. Earlier package-only email limits
> describe the original ac97d86 preparation, not a request to remove current email.

# Khalid Sayour: production integration and original laptop workflow

This guide is for Khalid Sayour, **42 login ksayour**, whose authenticated GitHub
account is **ksayour-42**. The campus and GitHub logins are separate identities.
The steps below preserve the original laptop workflow; the promotion above is
already complete. No passwords, API keys, SMTP credentials or private CA keys
belong in Git or chat.

The module implementation commits retain their real Mahdi/Codex authorship.
Your own integration commit, verification record, PR and push can honestly record
the work you perform. Pushing someone else's commits does not change their author
or create a personal cryptographic signature. If you already sign commits, use
your existing signing configuration; never replace original author identities.

## What to promote

- Development: `MahdiHajjHassan/Transcendence2` (ppd).
- Production destination: `MahdiHajjHassan/Final-Trans-Repo`.
- Prepared source branch, published in ppd: **`codex/khalid-prod-ready`**.
- Your suggested production branch: `khalid/modules-production`.
- Features: full profile/avatar/friends/presence (2 candidate points), fixed
  four-player tournament (1), full statistics/history/progression/leaderboard (1).

See [the dated delivery evidence](../evaluation/2026-10-30-khalid-modules.md)
for the prepared branch’s exact verification and limits. Use the prepared
prod-ready branch recorded there. It is based on production history and preserves production's
existing cookie/header names, data location, runtime conventions and UI.
**Do not merge the entire ppd history directly into prod or copy a source ZIP
on top of an existing prod checkout.** The original implementation session
prepared the package; the later authenticated production integration is
recorded in the receipt linked above.

Email verification was developed separately and is now integrated in production.
Preserve its completed, tested guards. Never replace it with the earlier
unfinished checkpoint or bypass verification to run the demonstration.

The [port receipt](KHALID-PROD-PORT.md) records source ancestry, the preserved
production boundaries and image/source verification.

## 1. Confirm your identity and repository access

Sign into your own GitHub account using normal GitHub CLI/browser authentication:

```sh
gh auth login
gh auth status
gh api user --jq .login
gh auth setup-git
```

Read the returned login and confirm it is your account. Check write access:

```sh
gh repo view MahdiHajjHassan/Final-Trans-Repo --json viewerPermission --jq .viewerPermission
```

ADMIN, MAINTAIN or WRITE permits this delivery; READ does not. If access is
missing, the owner must add your actual GitHub account as a collaborator. Do not
use Mahdi's credentials. Check your normal commit name/email locally:

```sh
git config user.name
git config user.email
```

They must be your own real configured identity before creating your integration
commit. GitHub authentication and commit author settings are separate checks.

## 2. Start a fresh production checkout and fetch the prepared branch

These Git commands work in Git Bash or PowerShell. Use a new directory name if
one already exists; never delete/overwrite another checkout's private files.

```sh
git clone https://github.com/MahdiHajjHassan/Final-Trans-Repo.git Transcendence-prod-khalid
cd Transcendence-prod-khalid
git remote add ppd https://github.com/MahdiHajjHassan/Transcendence2.git
git fetch origin main
git fetch ppd refs/heads/codex/khalid-prod-ready:refs/remotes/ppd/codex/khalid-prod-ready
git status --short
git log -1 --oneline origin/main
git log -1 --oneline ppd/codex/khalid-prod-ready
```

Status must be clean. Confirm current production is an ancestor of the prepared
branch:

```sh
git merge-base --is-ancestor origin/main ppd/codex/khalid-prod-ready
```

Continue only on exit code 0 (in PowerShell inspect `$LASTEXITCODE`). A nonzero
result means production advanced since preparation: preserve the new commits,
coordinate/rebase the integration and rerun verification. Do not force push,
reset main or merge unrelated histories to get past this check.

```sh
git switch -c khalid/modules-production origin/main
git merge --no-ff --no-commit ppd/codex/khalid-prod-ready
git diff --cached --stat
```

The merge intentionally stops before your commit so you can inspect and run it.
If it conflicts, stop and resolve it deliberately with the owner; do not select
all of one side. `git merge --abort` reverses only this in-progress merge if you
need to restart; it does not authorize deleting private runtime data.

## 3. Run and verify the actual production variant

Use Node 24. Preserve production's existing `__Host-taskboard_*` cookie names
and `X-Taskboard-Client-IP` proxy convention; the prepared port adapts the tests
and new modules to those existing boundaries. Do not rename cookies to match
ppd or copy ppd credentials/certificates into prod.

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run audit:source
npm run setup
docker compose up --build -d --force-recreate
```

Setup generates only this fresh checkout's private `.env` and refuses to replace
one. Record the actual outcomes and compare the feature behavior with
[the run/demo manual](../team/khalid-module-manual.md). Trust this instance's
public CA normally, then run `./scripts/verify-tls.sh` from Git Bash and the
HTTPS smoke checks in README. Never run a test reset against normal data.

Run the configured actual-browser suite on a separate guarded test project as
README documents:

```sh
npm run test:e2e
```

This now includes Chrome, Firefox and Brave; browser installs and local public-CA
trust are prerequisites. The delivery evidence states exactly which browsers
were tested in the implementation environment. Do not call a failed or
unavailable local runner a pass. Resolve setup issues before claiming your own
verification. Confirm profile/avatar/friend consent/presence, four-player draw
replay/final, private history, achievements and standings using four independent
profiles. Check admin deletion and existing friend/computer games still work.

The application startup applies additive migrations; it does not reset the
normal database. Back up existing production data through the operator's normal
backup procedure before deploying migrated source. Code rollback does not mean
running a down migration or deleting the SQLite volume.

## 4. Record your actual integration and push from your account

Before committing, ensure the current Git author/committer are you:

```sh
git var GIT_AUTHOR_IDENT
git var GIT_COMMITTER_IDENT
git status --short
```

Add your actual verification/contribution record (campus login ksayour, your
verified GitHub login, commands/outcomes and any real fixes) to
`docs/team/contributions/khalid.md`. Leave earlier implementation authorship as
recorded. Stage only that record and any reviewed fixes; private files stay ignored.

```sh
git add docs/team/contributions/khalid.md
git commit -m "Integrate and verify the new player and tournament modules"
git log -1 --format=fuller
git push -u origin khalid/modules-production
```

Inspect the author/committer and the push destination. Do not use `--author`,
author/committer environment overrides, empty contribution commits, history
rewrites or force pushes. Existing commits keep their original authors. Your
integration commit records the verification you actually performed.

## 5. Open and merge the production PR

```sh
gh pr create --repo MahdiHajjHassan/Final-Trans-Repo --base main --head khalid/modules-production --title "Add player profiles, four-player tournaments and game statistics" --body-file docs/delivery/KHALID-PRODUCTION-PR.md
```

Edit the PR body with your actual results and inspect the complete diff and
required checks. When this verified diff matches the authorized module promotion and required
checks pass, merge it from your GitHub account using the PR UI. Do not bypass branch rules. Source delivery
is separate from recreating a running production service; do that only under
the owner's deployment instruction, preserving the existing `.env`, database,
volumes and certificate authority.

Finally record the PR URL, merge SHA and actual runtime checks. Confirm that the
production main contains your integration and the expected ported implementation
commits with their original-author provenance. No success is inferred merely from a push returning exit code 0.

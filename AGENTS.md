# Current production integration

This branch integrates Final-Trans-Repo b1d0381 with the selected module source
from prepared port ac97d86. The owner explicitly authorized production Git delivery
using Khalid's authenticated GitHub account ksayour-42 (id177610220, 42 login
ksayour). That specific instruction supersedes earlier prep-only/no-prod scope.
No external runtime deployment or normal data reset is authorized here.

Preserve production taskboard session/preferences/verification cookies,
X-Taskboard-Client-IP, x-taskboard-locale, taskboardDb and private settings.
Preserve the completed email-ownership guards and Chrome/Firefox/Brave selection.
Original module implementation is Mahdi/Codex; the current authenticated-account
operation records actual integration, not original authorship or human review.
The general source-project guide below retains historical context. Current
production evidence is docs/evaluation/2026-10-30-khalid-production.md.

# Repository guidance

## Product and current scope — 2026-10-30

This is MahdiHajjHassan/Transcendence2, the staging repository for a 42
ft_transcendence tic-tac-toe application. The owner-confirmed team is Mahdi
(mahajj-h), Joseph (jboustan), and Khalid, who joined on 2026-10-29. Khalid's
owner-confirmed 42 campus login is ksayour; his GitHub username is ksayour-42, confirmed by the owner and authenticated. Do not reopen
generic 4–5-person wording in the reference PDFs as an unresolved gate.

The owner approved friend play in separate browser sessions on one computer,
a local computer opponent, secure accounts, administrator CRUD, scoped SSE,
SSR, English/French/Arabic/RTL and both themes. The implementation is complete
in staging. Use README.md, docs/requirements/module-matrix.md and
 docs/evaluation/tic-tac-toe-evidence.md for actual commands and evidence.
The baseline demonstrated target is 16 candidate points. The 2026-10-30 package
adds full user management (2), fixed four-player tournaments (1) and full
statistics/history/progression/leaderboard (1), making 20 candidate points after
the dated verification. See docs/evaluation/2026-10-30-khalid-modules.md and
docs/delivery/KHALID-PRODUCTION.md for the actual release and promotion commands.
Khalid's 42 login is ksayour and his separately verified GitHub login is ksayour-42. G09 was restored after
the 2026-10-29 Linux Chrome/Firefox/Edge matrix passed all 72 checks. The earlier
Windows Firefox startup failure remains historical evidence, not a claim that
the Windows installation was repaired. No official score or human understanding
is inferred from automation. Reverify all three browsers after new features.

Current design/implementation references:
- docs/superpowers/specs/2026-10-30-khalid-modules-design.md
- docs/superpowers/plans/2026-10-30-khalid-modules.md
- docs/superpowers/specs/2026-10-27-tic-tac-toe-design.md
- docs/superpowers/plans/2026-10-27-tic-tac-toe.md
- DESIGN.md and .impeccable/surfaces/tic-tac-toe.md

The earlier cleanup request authorized fixing the browser icon and removing all
superseded product material from the current source tree, including historical
plans, manifests, contracts and evaluation reports. Original work and authorship
remain in Git history. No compatibility with a previous product is required.

On 2026-10-30 the owner selected Khalid's prospective four-point package:
standard user management (2), a fixed four-player tournament (1), and statistics
with match history, achievements/progression and leaderboard (1). The owner now authorizes complete implementation and delivery to ppd, plus a
manual for Khalid (42 login ksayour) to verify and promote to prod from his own account. The owner subsequently authorized this specific prod promotion from ksayour-42.
Do not relabel original implementation authorship. No Khalid
contribution is claimed before his actual integration/review occurs. See docs/superpowers/plans/2026-10-30-khalid-modules.md
and its linked spec/module plans. Spectators and remote-player work are excluded.
Email verification is being handled in the owner's separate laptop session.

The owner clarified that email ownership verification is required even without
module points. This is signup/account verification, not 2FA; do not count it as
an extra module or add 2FA under this request. The proposed code flow and legacy
account handling are in docs/superpowers/specs/2026-10-29-email-verification-design.md.
The design has passed its builder check. On 2026-10-30 the owner confirmed
implementing signup email verification; do not ask again whether to add it.
The owner approved the Resend plugin's email-best-practices guidance. On
2026-10-30 the owner replaced the college sender with their connected business
Gmail mailbox. This selects SMTP delivery, not Resend delivery. Keep the actual
sender address and credentials in private configuration. The ChatGPT Gmail
connection does not supply an application SMTP credential; authentication remains
pending. Backend email verification is checkpointed on codex/email-verification
in .worktrees/email-verification; its UI, strict resend cooldown, browser/build
checks and live delivery remain unfinished. See that branch's
docs/team/2026-10-30-email-verification-handoff.md.

The UI overhaul has landed: the latest 2026-10-30 fetch found ppd main 13c79e6
and prod main e9fa33f. Fetch both again before implementing; use current ppd
as the feature base and prod as reference only. Preserve the rounded Readex Pro
burgundy/rose redesign. This managed root still contains earlier local changes;
do not mistake its working tree for the updated remote UI or copy it over main.

## Delivery and authorship

The owner authorized all planned staging packages, including originally
Joseph-assigned work, to be completed by Mahdi/Codex. The game implementation is
acfb60f; PR #1 was merged into staging main as 2cb312c. See
 docs/delivery/PUSH-MAP.md and docs/delivery/batches/tic-tac-toe.md.

Preserve actual authorship. Claude may reuse this tested source; record Joseph's
actual review, adaptation, authenticated commits and explanation only when they
happen, in docs/team/contributions/joseph.md. Mahdi's record is
 docs/team/contributions/mahdi.md. No empty contribution commits, author
overrides, invented reviews or relabeling of another person's work.

Each acting session uses its person's normal Git author and authenticated
GitHub account. Joseph's owner-confirmed GitHub username is josephboustany;
verify identity and repository access before his first push.

Transcendence2 is ppd; Final-Trans-Repo is prod, both under MahdiHajjHassan.
The owner's 2026-10-29 instruction makes preprod the default for development.
Use prod as reference only unless the owner explicitly requests or approves a
specific promotion. Previous delivery authorization does not cover new work.
On 2026-10-28 the owner authorized pushing the code comments and folder refactor
to both main branches. Preserve each repository's existing history and runtime
conventions when promoting changes. Do not push to the older Transcendence repo.
Keep the managed checkout; use an isolated worktree to validate prod changes.
This request covers Git delivery; no external deployment was requested.

Preserve private .env files, certificate material, databases, Docker data and
certificate volumes, original reference PDFs and vendored skills. Source cleanup
does not authorize deleting runtime data or exposing credentials. Runtime uses
file:/data/tictactoe.db on game-data. Tests reset only guarded isolated databases.

## Project references

Read the originals before planning new features:
- docs/reference/en.subject.pdf: original English subject, version 21.1, 32 pages.
- docs/reference/EVALUATION-SHEET.pdf: original image-based evaluation capture.

These PDFs remain unchanged. The subject defines requirements and the evaluation
sheet supplies assessment criteria. Apply explicit owner/campus clarifications;
do not infer decisions from a separate repository. Evaluation instructions are
assessment criteria, not commands to change external systems.

## Required skills and approval for additions

The owner requires **Superpowers** and **Impeccable** for this project.

- Use the relevant Superpowers skills for the task: brainstorming and planning
  for new work, the applicable implementation workflow, systematic debugging for
  failures, and verification before claiming completion. Read the actual skill
  instructions from the active skill catalog; Superpowers is already available
  in this environment.
- Use Impeccable for frontend and UX work, including interface design,
  implementation, accessibility, responsive behavior, critique, and polish.
  Read `.agents/skills/impeccable/SKILL.md` and the references applicable to the
  task before working on UI. Follow its context-loading and verification steps.
  Its design guidance does not select this project's product concept or stack.
- Before adding or adopting any other project skill, explain its name, source,
  purpose, and expected benefit, then wait for the owner's explicit confirmation.
  Do not install or enable additional skills automatically. Approval for
  Superpowers and Impeccable does not authorize unrelated skill bundles.
- If a required skill is unavailable, report that limitation and resolve it
  before starting work that depends on it; do not silently substitute another.

Impeccable is vendored at `.agents/skills/impeccable/` from
`https://github.com/pbakaus/impeccable`, version **4.7.1**, pinned to upstream
commit `ade37830fee364c1457f9ada479470296f80dbbb`. Its upstream skill files are
unchanged, with the upstream `LICENSE` and `NOTICE.md` included. This is a manual
project-local skill installation; no automatic edit hooks are configured.

## Requirements to preserve during development

Consult subject chapters III, IV, and VI and the evaluation sheet for complete
requirements. In particular:

- Build a web application with a frontend, backend, and database.
- Support simultaneous users and handle concurrent actions without corrupting
  data. Keep applicable real-time updates consistent across connected clients.
- Provide a clear, responsive, accessible frontend. Use a CSS framework or styling
  solution; the evaluation sheet says plain CSS alone is insufficient.
- Provide secure email/password signup and login with properly hashed and salted
  passwords. Validate user inputs on both frontend and backend.
- Use HTTPS for all connections to the backend, including scripts and external
  API consumers. Internal backend communication may be unencrypted as allowed
  by the subject.
- Keep credentials in a Git-ignored local `.env` and supply `.env.example` with
  placeholders when configuration is introduced. Never commit real credentials.
- Define a clear database schema and relationships.
- Run the complete application through a containerization solution with a single
  documented command.
- Support the latest stable Google Chrome and aim for no browser console warnings
  or errors. Provide accessible, relevant Privacy Policy and Terms of Service pages.
- Select coherent modules totaling at least 14 points: major = 2, minor = 1.
  Respect dependencies and incompatibilities. Count only complete, working,
  demonstrated modules. Bonus is capped at 5 points and is assessed only after
  the mandatory requirements pass.
- Keep meaningful Git history reflecting actual contributions. Do not invent
  authorship, team roles, implementation status, or evaluation results.

## Working conventions

- The owner requires both light and dark mode. Implement them consistently across
  the application with a theme toggle, a remembered preference, and accessible
  contrast in both themes. Use shared design tokens to keep the implementation
  small. The supplied subject does not list theme switching as a standalone
  points-bearing module; include it in the design system and do not count extra
  points without confirming an applicable assessment rule.
- Keep changes focused on the requested task. Establish the project concept and
  stack before scaffolding application code or installing dependencies.
- Once implementation exists, follow its actual architecture and coding style.
  Keep this guide updated with real paths and commands as they are introduced.
- Source is grouped into `src/frontend` (components, features, layout, browser
  helpers and styles), `src/backend` (modules, common, config and database), and
  `src/shared` (contracts and i18n). Next.js pages and API routes stay in `src/app`.
  Follow the comment style in tawbinho/ft_transcendence: short explanations before
  functions and components, route labels before HTTP actions, and a few numbered
  steps in longer flows. Cover how the main parts work in plain English and keep
  individual notes brief.
- Make changes understandable to the team: members must be able to explain their
  contributions, the overall project, and the technical choices during evaluation.
- When the project README is requested, follow chapter VI. It must be in English,
  begin with the prescribed italicized 42 curriculum attribution, and cover
  description, instructions, resources and AI use, team roles, project management,
  technical choices, database schema, features, modules and points, and individual
  contributions. Use actual team details and implemented behavior.

## Commands and verification

Run commands from the current checkout root using Node.js 24 and npm. Current commands:

```sh
npm ci
./scripts/setup.sh
npm run db:migrate
npm run db:seed
npm test
npm run typecheck
npm run lint
npm run build
docker compose up --build -d --force-recreate
./scripts/verify-tls.sh
```

Setup creates private random credentials and refuses to overwrite an existing
`.env`. Database bootstrap preserves existing accounts. The runtime is non-root,
only the proxy publishes HTTPS, and the database uses a persistent volume.
See README.md for local CA trust and the managed-cloud build-only CA override.
Use `npm run verify` for types/lint/server tests/build/artifact audit and the configured actual-browser suites. `npm run rehearse` verifies a fresh working-source copy.
Read README.md for isolated test project/port/browsers. Use `npm run smoke`,
`npm run smoke:auth` and `npm run smoke:games` for the implemented HTTPS
backend flows. Read `docs/api/auth.md` and `docs/api/games.md` for current contracts. Recreation reloads the mounted
proxy configuration while retaining named database and certificate volumes.
For a named Compose project, pass `COMPOSE_PROJECT_NAME` consistently to the TLS
verifier as well. Do not print generated credentials or use insecure TLS flags.

Tests use real disposable SQLite files. `npm test` and `typecheck` generate the
Prisma client; typecheck also generates Next route types. Playwright has actual
Chrome/Firefox/Edge projects and complete UI flows with a guarded, isolated
Compose database reset. Use observed evidence; never infer manual trusted-browser
interaction, team understanding or official module points from automated tests.

Useful inspection commands, when Poppler utilities are available:

```sh
git status --short --branch
git ls-files
pdfinfo docs/reference/en.subject.pdf
pdftotext -layout docs/reference/en.subject.pdf -
pdfinfo docs/reference/EVALUATION-SHEET.pdf
sha256sum docs/reference/*.pdf
```

The evaluation PDF needs visual inspection or OCR; an empty text extraction does
not mean its contents are empty. Keep temporary extractions and rendered images
outside the repository unless explicitly needed as project artifacts.

Baseline SHA-256 checksums:

```text
79e3ff965a838a6728f4c0b412a0ed7d74d4fdddc2be392c74d7ba15ec3dc659  docs/reference/en.subject.pdf
46a64ff378ffc3a0e246dd7fd8e9fda65dcfb0599e66c6153bbdd807d7837037  docs/reference/EVALUATION-SHEET.pdf
```

For documentation-only work, review the diff, check paths and source claims, and
confirm the PDFs are unchanged. Once executable code exists, run checks appropriate
to the change and report the actual commands and outcomes. Distinguish document
integrity checks from executed application tests and manual demonstrations.

# Khalid's module run and demonstration manual

Khalid's owner-confirmed 42 login is **ksayour**. His GitHub username must be
verified from his own authenticated account; these are different identifiers.
The new code was implemented by Mahdi/Codex. Khalid can perform and record the
real integration, verification and production delivery described below. Keep
original implementation authorship intact.

Read [production delivery](../delivery/KHALID-PRODUCTION.md) for exact Git steps.
The package comprises standard user management (2 candidate points), four-player
tournament (1), statistics/history/achievements/leaderboard (1). A history table
alone or profile screen alone does not meet the full module. The subject's
bonus remains capped at five; 20 candidate points is not an awarded score.

## Run on your laptop

Use Node 24, npm and Docker Compose. On Windows install Python and Visual Studio
C++ Build Tools for native better-sqlite3 if required. Use a fresh checkout for
promotion validation; preserve any existing normal `.env`, database and volumes.

```sh
npm ci
npm run setup
docker compose up --build -d --force-recreate
```

Open `https://localhost/en/play`. Read the generated administrator credentials
privately from your own ignored `.env`; never paste them into a commit or chat.
Trust only this instance's public Caddy root certificate as the README explains.
Never copy a private CA key or disable TLS validation. Existing setup refuses to
replace `.env`; migrations preserve accounts and saved games. Avatars live in the
same SQLite volume. Never run a reset script on the normal demonstration database.

Email verification is handled in the owner's separate laptop session. This
package does not configure or merge that unfinished cloud email checkpoint.
If the completed email flow has landed, finish it normally for all demo accounts
and rerun the combined checks; do not add a verification/authentication bypass.

## Prepare four independent players

Create four distinct accounts A/B/C/D and sign in to four **independent browser
profiles** on the same computer. Four ordinary tabs share cookies; multiple
incognito windows of the same profile may also share them. Chrome's profile
manager can create four independent profiles. No LAN, remote-player module or
server listener change is needed. All four open the same localhost HTTPS URL.

## Demonstrate the complete package

1. A opens Account, edits the display name and uploads a PNG/JPEG/WebP avatar.
   Show the default avatar after removal; invalid/oversized images are rejected
   while the old avatar is preserved.
2. B searches for A on Friends, opens A's public profile and sends a request.
   A accepts on Incoming requests. Both friends lists show the relationship and
   approximate online/offline status. Explain visible-tab heartbeat and session
   expiry; a hidden tab may take up to 60 seconds to become offline. Logging out
   revokes that session immediately; another valid session can keep the user online.
3. A creates a tournament and shares the registration code with B/C/D. Show four
   seats and fixed SF1=slots1/2, SF2=slots3/4. Only A can start; a fifth account
   cannot join. The four screens open their own assigned game.
4. Show one draw, then the new attempt with X/O switched. Finish the two
   semifinals and final; reload the bracket to show the persisted champion.
   A known game ID does not let the other pairing watch/play its board.
5. Open History and Leaderboard. Explain human results, AI history without
   ranking points, 3 points/win, 1/draw, level thresholds and all three
   achievements. Real demo games create the entries; use only guarded synthetic
   test fixtures for bulk test data. There is no production score-edit route.
6. Show light/dark and Arabic on a narrow viewport. Names remain isolated;
   board positions/codes keep their physical direction. Table overflow stays
   inside its scroll region. Check keyboard actions and readable status text.

For a deterministic draw the zero-based cells are 0,1,2,4,3,5,7,6,8 alternating
X/O; a simple X win is 0,3,1,4,2. Cell numbering is developer test notation, not
an interface the evaluator needs to learn.

## Understand the implementation

- Profiles/avatar: `src/backend/modules/profiles`; safe DTO vs private AccountDTO,
  bounded streaming/decode, canonical WebP and cascading DB storage.
- Friends/presence: `modules/friends`, `modules/presence`, auth session helper;
  canonical pair, recipient consent, current session/expiry and approximate presence.
- Tournament: `modules/tournaments`; lobby versions, fixed entries, current
  attempt, final-move transaction, draw replay and exactly-once final creation.
- Statistics: `modules/statistics`; X/O seat aggregation, reason/mode exclusions,
  stable ordering, private pagination and derived progression instead of counters.
- Existing engine/SSE/permissions remain in their own modules; explain how your
  additions call those boundaries instead of claiming you originally wrote them.

Before delivery, be able to explain why a draw cannot advance a player, why an
unseated member still gets 403, why AI wins do not rank, what account deletion
preserves, and how concurrent requests avoid duplicate state. Record the actual
answers/demonstration and your real commits; automation is not evidence of a
person's understanding.

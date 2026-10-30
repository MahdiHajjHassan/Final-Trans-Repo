> Execution update (2026-10-30): the owner subsequently authorized full
> implementation and ppd delivery, superseding the original planning-only scope.
> The three modules are implemented; the dated delivery evidence records actual
> verification, deviations and publication. Original task checklists describe
> intended coverage and are not evidence that every suggested case was executed.
> Email remains separate; prod promotion is Khalid's later action.

# Standard User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after review. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete profile editing/pages, uploaded/default avatars, friends and online status for two candidate points.

**Architecture:** Keep existing account/password services. Add safe member projections, bounded canonical avatar bytes in SQLite, canonical-pair friend requests and session-based presence. Expose thin authenticated routes and extend the current UI.

**Tech Stack:** Existing Node 24/Next/React/Prisma/SQLite/Vitest/Playwright, plus direct exact `sharp@0.35.5` already in this baseline's lockfile.

**Spec:** `docs/superpowers/specs/2026-10-30-khalid-modules-design.md`, standard user management section.

## Global Constraints

- Inherit all constraints and final gates in `2026-10-30-khalid-modules.md`.
- Keep email verification in the separate laptop session; do not replace its guards, auth contract or migration.
- Profile projections never include email, role, password, tokens or verification state.
- Avatars: 2,097,152-byte input; PNG/JPEG/WebP; one frame; max 4096×4096 and 16,777,216 pixels; canonical 256×256 WebP quality 80; max 98,304-byte output.
- Friends require recipient acceptance; one canonical pair; presence heartbeat 15 seconds, online cutoff 60 seconds, visible-tab polling only.
- Preserve English/French/Arabic/RTL, both themes and the current rounded design.

## Review Focus

- Disguised/large/animated image streams cannot consume unbounded memory or replace a valid old avatar; Task 1.
- Public/member projections and same-named users never expose private account fields or target the wrong ID; Tasks 1/3.
- Opposite requests/accept-remove races do not create duplicate or involuntary friendships; Task 2.
- Revoked/expired/unverified sessions and multiple tabs do not fabricate presence; Task 2.
- Email integration, image failures and Arabic/mobile long names preserve clear usable UI; Task 3.

---

### Task 1: Safe profiles and canonical avatars

**Files:**
- Create `src/shared/profiles.ts`.
- Create `src/backend/modules/profiles/{profiles.service,profile-view,avatar.service,avatar.controller,avatar-image}.ts`.
- Create `src/backend/common/security/read-bytes.ts` and `public/default-avatar.svg`.
- Create `src/app/api/account/avatar/route.ts`, `src/app/api/profiles/[id]/avatar/route.ts`.
- Modify `prisma/schema.prisma`, `src/backend/services.ts`, `package.json`, `package-lock.json`.
- Create an additive migration named with the execution date and suffix `_profile_avatars`; preserve existing migration ordering, including email work.
- Create `tests/server/profiles.test.ts`, `tests/server/avatars.test.ts`, `tests/server/avatar-http.test.ts`.

**Interfaces:**
- `PublicProfile = { id: string; displayName: string; avatarUrl: string; joinedAt: string }`.
- `ProfileList = { items: PublicProfile[]; total: number; page: number; pageSize: 25 }`.
- `profile-view.ts` exports `publicProfileSelect` (Prisma.UserSelect: ID, displayName, createdAt, avatar revision only), its inferred `ProfileRecord` type, and `publicProfile(record: ProfileRecord): PublicProfile`; friends/tournaments/leaderboard reuse it without private account selections.
- `createProfileService(db)` produces `read(actor: Actor|null, id: string): Promise<PublicProfile>` and `search(actor: Actor|null, input: unknown): Promise<ProfileList>`.
- `readBytes(request: Request, maxBytes: number): Promise<Uint8Array>` counts actual streaming bytes, checks optional declared length and cancels on overflow; existing JSON reader stays unchanged.
- `normalizeAvatar(bytes: Uint8Array, contentType: string): Promise<Uint8Array>` enforces the spec before returning canonical WebP; expose no raw decoder errors.
- `createAvatarService(db)` produces `put(actor: Actor|null, bytes: Uint8Array, contentType: string): Promise<PublicProfile>`, `remove(actor: Actor|null): Promise<PublicProfile>`, `read(actor: Actor|null, id: string): Promise<{bytes: Uint8Array; contentType: 'image/webp'|'image/svg+xml'}>`.
- PUT/DELETE `/api/account/avatar` return `{data: PublicProfile}`; GET avatar returns bytes for a valid member or default. New route handlers use existing HTTP/auth helpers; only upload uses the bounded raw reader.

- [ ] Write real-DB tests, starting with `test("member profile contains only the safe projection")`: `expect(Object.keys(profile).sort()).toEqual(["avatarUrl", "displayName", "id", "joinedAt"])`. Profile search uses displayName only; identical names keep distinct UUIDs; response JSON excludes seeded email/role/hash/session keys; anonymous reads fail. Avatar creation/replacement/removal/deletion and old-user default behavior survive DB reopen. Add a migration fixture preserving preexisting user/game IDs and passwords.
- [ ] Write image/HTTP tests: valid PNG/JPEG/WebP become exactly 256×256 WebP; uploaded metadata is removed; reject SVG, fake MIME, truncated/corrupt input, animation, oversized dimensions and >2 MiB streams with missing/false Content-Length. Verify failed replacement leaves prior bytes/revision intact, revoked actor fails at commit, foreign Origin fails before decode, mutation quota returns 429, headers are no-store/nosniff.
- [ ] Run `npm test -- tests/server/profiles.test.ts tests/server/avatars.test.ts tests/server/avatar-http.test.ts`; observe the intended missing behavior failure, not an unrelated environment error.
- [ ] Add the cascade UserAvatar model/migration and exact Sharp dependency (`npm install --save-exact sharp@0.35.5` only during execution). Implement the interfaces, counter-based upsert revision, UUID/pagination/q schemas, origin/auth checks and five-avatar-mutations/15-minute/user quota. Decode outside transactions and reauthorize before upsert; use DB storage, not uploaded filenames or a new volume.
- [ ] Rerun those tests, `npm run typecheck`, `npm run lint`; all must exit 0. Commit only these files, message `feat: add safe member profiles and avatars`.

### Task 2: Friend requests and session presence

**Files:**
- Create `src/shared/friends.ts`.
- Create `src/backend/modules/friends/{friends.service,friends.controller}.ts` and `src/backend/modules/presence/{presence.service,presence.controller}.ts`.
- Create `src/backend/modules/auth/session-token.ts` for the shared server-only token-format/hash helper.
- Create `src/app/api/friends/route.ts`, `src/app/api/friends/[id]/route.ts`, `src/app/api/account/presence/route.ts`.
- Modify `prisma/schema.prisma`, `src/backend/modules/auth/sessions.service.ts`, `src/backend/services.ts`; create additive `_friends_presence` migration.
- Create `tests/server/friends.test.ts`, `tests/server/presence.test.ts`, `tests/server/friends-http.test.ts`.

**Interfaces:**
- `Relationship = 'SELF'|'NONE'|'OUTGOING'|'INCOMING'|'FRIEND'`.
- `FriendshipDTO = {id: string; status: 'PENDING'|'ACCEPTED'; requestedById: string; profile: PublicProfile; online: boolean|null}`; its `profile` always describes the other member, and pending requests have `online:null`.
- `FriendList = {items: FriendshipDTO[]; total: number; page: number; pageSize: 25}`.
- `createFriendService(db, options?: {now?:()=>Date})` produces `request(actor, targetId): Promise<FriendshipDTO>`, `accept(actor, friendshipId): Promise<FriendshipDTO>`, `remove(actor, friendshipId): Promise<void>`, `list(actor, input: unknown): Promise<FriendList>`, `relationship(actor, targetId): Promise<{relationship: Relationship; online: boolean|null}>`; actor is `Actor|null`, IDs strings.
- GET `/api/friends?kind=accepted|incoming|outgoing&page=1`; POST `{userId}` to request; PATCH `/api/friends/[id]` `{action:'accept'}`; DELETE same path with `{}` to decline/withdraw/remove. All actions are authorized from actual pair membership/requester.
- `sessionTokenHash(raw: string|null): string|null` in `session-token.ts` returns SHA-256 only for the existing 64-character lowercase-hex token format; otherwise null. Existing session create/resolve/revoke and presence consume this one helper; preserve their contracts.
- `createPresenceService(db, options?: {now?:()=>Date}).heartbeat(rawToken: string|null): Promise<void>` independently validates current session/expiry/user guard, updates only that session's lastSeenAt; returns no token. POST `/api/account/presence` JSON `{}` returns 204 after origin check. Do not weaken the session resolver.

- [ ] Write `test("opposite concurrent requests remain one pending friendship")`: after independent-connection requests, `expect(await f.db.friendship.count()).toBe(1)` and `expect((await f.db.friendship.findFirst())?.status).toBe("PENDING")`. Add self/missing target rejection, duplicate retry, recipient-only accept, stranger rejection, decline/withdraw/removal and cascading deletion. Check incoming/outgoing classification, null pending presence and no private profile keys. Race acceptance/removal: no resurrected deleted friendship without a new explicit request.
- [ ] Write fake-clock/real-DB presence tests at 59/60/61 seconds, expired/revoked session, logout, password-change revocation, account deletion and multiple independent valid sessions. Legacy null lastSeen is offline. Presence never creates/revives a session, exposes a raw token, or accepts client-supplied userId/timestamp. Add combined auth regression if email gate has landed.
- [ ] Write HTTP tests for anonymous/cross-origin/extra-field/duplicate-query requests and quotas (30 relationship mutations/minute/user; 30 heartbeats/minute/session). Run `npm test -- tests/server/friends.test.ts tests/server/presence.test.ts tests/server/friends-http.test.ts` and observe RED.
- [ ] Implement canonical pair uniqueness/transactional checks and session timestamp migration; initialize lastSeenAt in `createSessionToken`. Friend reads compute presence from all current unexpired sessions in the same snapshot. No last-seen timestamp is sent to friends, and strangers receive `online:null`. Rate-limit denial never revokes authentication.
- [ ] Run the focused tests plus `npm test -- tests/server/sessions.test.ts tests/server/auth.test.ts tests/server/admin-users.test.ts`, types and lint. Commit only this task, message `feat: add friends and authenticated presence`.

### Task 3: Profile, friend and avatar UI with real browser flows

**Files:**
- Create `src/backend/modules/profiles/profiles.controller.ts`, `src/app/api/profiles/route.ts`, `src/app/api/profiles/[id]/route.ts`.
- Create `src/app/[locale]/profiles/[id]/page.tsx`, `src/app/[locale]/friends/page.tsx`.
- Create `src/frontend/features/profiles/components/{ProfileSummary,AvatarForm}.tsx`, `src/frontend/features/friends/components/FriendsPanel.tsx`, `src/frontend/features/account/components/PresenceHeartbeat.tsx`.
- Modify `src/app/[locale]/layout.tsx`, `src/app/[locale]/account/page.tsx`, `src/frontend/layout/Navigation.tsx`, `src/backend/services.ts`, existing dictionary files and shared styles only as needed.
- Modify `scripts/test-db.ts` only for safe isolated cascade/reset ordering; preserve the email session's guarded fixture setup.
- Create `tests/server/profile-http.test.ts`, `tests/browser/user-management.spec.ts`; update dictionary parity tests and relevant API/privacy docs.

**Interfaces:**
- `ProfilePage = PublicProfile & {relationship: Relationship; online: boolean|null}` in `src/shared/profiles.ts` (Relationship imported as type from friends).
- GET `/api/profiles?q=...&page=1` returns ProfileList; GET `/api/profiles/[id]` returns ProfilePage by composing Tasks 1/2; no parallel private account endpoint is added.
- `PresenceHeartbeat` starts immediately for a visible authenticated session, then every 15 seconds; aborts on hide/unmount. FriendsPanel polls every 15 seconds only while visible; 401/403 follows existing stale-auth navigation behavior.

- [ ] Add `test("accepted friends see each other and removal is symmetric")` with two authenticated browser contexts: `await expect(pageA.getByRole("button", {name: t.removeFriend})).toBeVisible()` after acceptance, then remove and assert both friends lists omit the other UUID after refresh. Introduce `removeFriend` in all dictionaries in this task. Also edit name, view other profile without private email, upload/replace/remove avatar and discover the correct UUID among duplicate names. Add offline/online multiple-session cases using controlled service time/real revocation where needed; do not use a 60-second browser sleep or a production clock-control route.
- [ ] Add keyboard/focus, upload-error/empty-list, long Arabic-name, 360px light/dark and existing 320px navigation assertions. Verify raw avatar bytes never enter browser storage and private profile HTML is no-store/authenticated. Run focused HTTP/service cases and `npx playwright test tests/browser/user-management.spec.ts --project=chrome`; observe the actual missing UI behavior before implementation.
- [ ] Read current Impeccable context/shape guidance and craft-floor before UI edits. Build through existing components, current avatar/name form and locale navigation. Keep self/password editing intact. Render text beside presence dots; no busy-loop polling, fixed overlays or new decoration assets. Localize all new errors/statuses and update privacy text for profiles, friends, presence and stored avatar data.
- [ ] Rerun focused cases, types/lint and actual-browser focused flows on Chrome/Firefox/Edge. Inspect both themes/Arabic mobile/desktop and default/broken-image behavior. Commit this task, message `feat: add profile and friends screens`.
- [ ] Review the completed module against all four subject bullets. Do not add its two points to evidence until every bullet works; carry observed failures to the package's final combined gate.

# Profiles, avatars, friends and presence

All routes require the current authenticated session. Mutations require the exact
configured HTTPS Origin; JSON uses the existing 16 KiB reader and rejects extra
fields. Responses use `{data: ...}` and `Cache-Control: private, no-store`.
The application's configured session-cookie name is authoritative; do not copy
cookies between ppd and prod.

| Method/path | Input | Result |
| --- | --- | --- |
| GET /api/profiles | q (2–60 trimmed characters), page | 25 public name matches/page |
| GET /api/profiles/:id | UUID | Public profile plus caller relationship/presence |
| PUT /api/account/avatar | Raw PNG/JPEG/WebP bytes | Updated PublicProfile |
| DELETE /api/account/avatar | JSON {} | PublicProfile with default avatar |
| GET /api/profiles/:id/avatar | Optional revision URL suffix | Authenticated image bytes/default |
| GET /api/friends | kind=accepted/incoming/outgoing, page | 25 relationship rows/page |
| POST /api/friends | JSON {userId} | Existing/new pending friendship |
| PATCH /api/friends/:id | JSON {action: "accept"} | Recipient-accepted friendship |
| DELETE /api/friends/:id | JSON {} | 204; decline, withdraw or remove |
| POST /api/account/presence | JSON {} | 204; heartbeat for this session only |

PublicProfile is `{id,displayName,avatarUrl,joinedAt}`. A profile page also adds
`relationship` (SELF/NONE/OUTGOING/INCOMING/FRIEND) and `online`, which is null
unless self or accepted friend. No email, role, password, raw session or email
verification state is published through these routes. Duplicate names are
allowed; actions use UUIDs. Search is a display-name substring with SQLite's
existing matching rules, not administrator email search.

A canonical UUID pair has one friendship row. A reverse simultaneous request
never implies acceptance. Only the recipient accepts; the sender withdraws,
the recipient declines, or either accepted member removes. Strangers cannot
change a pair. Pending requests do not expose online status.

Avatar limits: 2 MiB actual streamed input even without Content-Length, one
frame, PNG/JPEG/WebP only, at most 4096 per dimension / 16,777,216 pixels.
The server decodes and crops to metadata-free 256×256 WebP (quality 80), at most
96 KiB, stored in one cascading UserAvatar row in the existing database.
Invalid replacement preserves the previous pixels. SVG uploads/URLs/filenames
are never used as storage paths. The default SVG is a fixed local asset. Image
answers use the correct Content-Type and nosniff; revision URLs do not bypass auth.

Visible authenticated tabs heartbeat immediately then every 15 seconds; friend
lists poll every 15 seconds while visible. Online means any current unexpired
session was seen within 60 seconds. It is approximate tab presence, not proof
of keyboard activity. Revoked/expired sessions never count; other valid sessions
remain independent. Legacy null timestamps start offline. No last-seen timestamp
is exposed to friends. Hidden tabs stop their timer and abort outstanding calls.

Mutation quotas: avatars 5/15 minutes/user, relationships 30/minute/user,
heartbeats 30/minute/session. A 429 never revokes a session. Existing 400/401/403/
404/409/429 responses apply; internal decoding errors never echo uploaded data.

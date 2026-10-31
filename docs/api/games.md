# Game HTTP contract

All browser actions use same-origin HTTPS and the Secure HttpOnly session cookie.
Mutations require Origin and JSON. Server input schemas reject unknown fields.

| Method/path | Body | Result |
| --- | --- | --- |
| POST /api/games | mode: HUMAN or AI | 201 GameView |
| GET /api/games?page=1 | none | own paginated games |
| POST /api/games/join | code | GameView |
| GET /api/games/:id | none | authorized GameView |
| POST /api/games/:id/moves | cell 0..8, expectedVersion | GameDTO |
| POST /api/games/:id/resign | expectedVersion | GameDTO |
| POST /api/games/:id/cancel | expectedVersion | GameDTO, waiting owner only |
| GET /api/games/:id/events | none | authorized SSE state snapshots |

Success JSON wraps data; errors wrap error.code. Validation400, anonymous401,
unseated403, missing404, stale/illegal state409, rate limit429 with Retry-After.
Codes are visible only to a waiting room's creator; players are public-name-only
projections. Limits/user/minute: create10, join20, game actions60. Five concurrent
streams/user. Snapshot ids are nondecreasing board versions; multiple state events can
share an id when current player names change. GameDTO includes playerMetadataVersion,
the sum of the seated human accounts' name revisions (empty/deleted/AI seats add zero).
For a greater board version, replace the full snapshot. For an equal board version,
replace only players and playerMetadataVersion when its metadata revision is greater.
Reject older board versions regardless of their metadata revision. A seat change or
account deletion advances the board version and may reduce the metadata revision.
Heartbeat every15seconds reauthorizes and delivers changed name revisions even if
names return to their previous values. Reconnect reads canonical state; never replay an uncertain move.
The event bus targets one application process. There is no public API-key module.

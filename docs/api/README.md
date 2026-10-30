# Application HTTP contracts

Use [games](games.md), [auth](auth.md), [profiles/friends/presence](profiles.md),
[tournaments](tournaments.md) and [statistics/history](statistics.md) for the
current same-origin HTTPS session-cookie API.
Private responses are no-store; mutations enforce Origin.
Administrator POST /api/admin/users creates a validated account (email,
displayName, password and MEMBER/ADMIN role), hashes its password and returns a
safe AccountDTO with status201. Creation is limited to10/minute/admin and rechecks
the current role. GET lists, PUT /:id updates and DELETE /:id deletes.

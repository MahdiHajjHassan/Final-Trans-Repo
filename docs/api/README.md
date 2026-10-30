# Application HTTP contracts

Use [games](games.md), [auth](auth.md), [profiles/friends/presence](profiles.md),
[tournaments](tournaments.md) and [statistics/history](statistics.md) for the
current same-origin HTTPS session-cookie API.
Private responses are no-store; mutations enforce Origin.
Administrator POST /api/admin/users validates email, displayName, password and
MEMBER/ADMIN role, then returns 202 with `{data:{verificationRequired:true}}` and
the private verification cookie. The password hash, chosen role and creator stay
in EmailChallenge; there is no User until the emailed code is confirmed through
the existing verification endpoint by the same still-verified administrator.
Failed delivery, expiration and wrong codes do not create accounts. Creation is
limited to 10/minute/admin plus the shared email send/cooldown quotas. GET lists
confirmed accounts, PUT /:id updates and DELETE /:id deletes.

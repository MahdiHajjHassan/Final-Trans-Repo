# Four-player tournaments

The existing authenticated HUMAN game engine remains authoritative. There is no
client result-write API and no spectator access. All mutations require exact
same-origin HTTPS, strict JSON and a current actor inside the write transaction.

| Method/path | Input | Result |
| --- | --- | --- |
| POST /api/tournaments | {} | 201 TournamentDTO, host in slot 1 |
| GET /api/tournaments | page | Own events, 10/page |
| POST /api/tournaments/join | {code} | Current registration/bracket |
| GET /api/tournaments/:id | UUID | Participant-only TournamentDTO |
| POST /api/tournaments/:id/start | {expectedVersion} | Host starts exactly four seats |
| POST /api/tournaments/:id/leave | {expectedVersion} | Non-host leaves LOBBY, 204 |
| POST /api/tournaments/:id/cancel | {expectedVersion} | Host cancels LOBBY |

LOBBY → RUNNING → FINISHED, or CANCELLED. Registration uses eight unambiguous
characters, shown only to the host while open. Each distinct signed-in account
claims the lowest free slot; duplicate join retries return the same membership.
Slots 1/2 form SF1 and slots 3/4 form SF2. Start freezes four seats, creates both
ACTIVE semifinal Games and the PENDING final match in one transaction. A host
cannot leave their own lobby or cancel a running event. A player can resign
through the normal game action. Disconnects do not forfeit.

TournamentDTO contains ID/status/version/host/championSlot/timestamps, safe
entries and SF1/SF2/FINAL metadata. Match entries expose only assigned-game IDs,
entry IDs, attempt, status and winner entry. No board/moves/private email or
playing-game invitation codes appear. Knowledge of another pairing's game ID
still produces 403 for its read/action/SSE routes. Brackets poll canonical
metadata every five seconds while visible, with cancellation on unmount/hide.

The final move or resignation settles its match inside the SAME SQLite
transaction. A full-board draw creates one replay for the same pair and swaps
X/O; no player advances on a draw. A win resolves the current attempt once.
Two semifinal winners produce one final, whose actual winner becomes champion.
The unique `(tournamentMatchId,tournamentAttempt)` key and match versions protect
retries/races. Publication occurs only after commit. Ordinary GameDTOs have
`tournament:null`; tournament games contain `{id,matchId}` and finish by linking
back to the bracket instead of creating a separate ordinary rematch.

Deleting a running participant account cancels its tournament and active games,
with TOURNAMENT_CANCELLED reason, preserving finished rounds. Deleting a lobby
host cancels the lobby; deleting a different lobby participant frees the slot.
Finished brackets keep their structure/champion slot with deleted-player labels.
No previous name/email snapshot survives account deletion. Normal admin deletion
and last-admin protection remain in effect.

Quotas/user/minute: create 5, join 20, other lobby writes 30, existing game actions
60. Stale/illegal transitions return 409; only the host may start/cancel (403 for
other members). Unknown/extra fields and duplicate list query keys are rejected.

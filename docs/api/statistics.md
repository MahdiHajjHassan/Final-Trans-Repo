# Statistics, history and standings

Read-only authenticated HTTPS endpoints, private/no-store JSON `{data: ...}`.
No endpoint accepts a user's score, winner, achievement or another history owner.

| GET path | Query | Result |
| --- | --- | --- |
| /api/account/statistics | none | Own totals, rank, level and achievements |
| /api/account/history | page, mode=ALL/HUMAN/AI | Own FINISHED matches, 10/page |
| /api/leaderboard | page | Signed-in standings, 25/page |

Unknown/duplicate query keys and invalid page/mode values are 400. Server-rendered
history/leaderboard pages validate the same filters and provide visible recovery
for invalid URLs. No account email/role/session/verification fields are returned.

Competitive rows are HUMAN + FINISHED with LINE, FULL_BOARD or RESIGNED reason.
AI games, waiting/cancelled games and automatic ACCOUNT_DELETED forfeits do not
rank. Every completed tournament draw replay counts as its own real game once.
Earlier completed games from a later-cancelled tournament remain results. A later
opponent deletion anonymizes identity but retains the surviving player's legitimate
previous result. Deleted owners disappear from standings.

- played = wins + losses + draws; points = 3*wins + draws.
- Win rate is rounded `100*wins/played`, or 0 for no games.
- Level = `1+floor(points/10)`; progress = `points%10` out of 10.
- Rank is the one-based position ordered points DESC, wins DESC, account join date
  ASC, UUID ASC; null before an eligible game. Zero-point players with completed
  human losses are still eligible.
- Achievements: FIRST_MATCH at played>=1, FIRST_WIN at wins>=1, TEN_MATCHES at
  played>=10. UI distinguishes earned and locked progress. No extra gamification
  point is claimed.

History orders finishedAt DESC, UUID DESC and includes AI games and automatic
forfeit explanations. Opponents are a public name/UUID, Computer or Deleted
player; dates are localized and labelled UTC. Only the caller's games receive
links, reusing existing game authorization. The leaderboard links safe profiles.

Parameterized SQLite aggregation expands X/O seats; no stored counters or
backfill jobs exist. Summary/rank and each page/total use a database snapshot,
so concurrent completion cannot mix counts from different result states.

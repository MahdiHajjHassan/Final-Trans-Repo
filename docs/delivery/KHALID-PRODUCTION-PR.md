Complete user profiles, uploaded/default avatars, friend requests and session
presence; add a fixed four-player tournament with atomic draw replay/final
progression; and expose saved-game statistics, history, achievements and standings.

This production integration preserves existing cookie/header/data conventions.
Original implementation authorship is retained; the promoter records their real
integration and verification in docs/team/contributions/khalid.md.

Validation by the promoter (fill in observed results before merging):

- [ ] Node 24 npm ci, typecheck and lint
- [ ] Server tests (actual count/result)
- [ ] Production build and source/artifact audit
- [ ] HTTPS verification and existing game/admin regressions
- [ ] Actual Chrome/Firefox/Edge checks (versions/results)
- [ ] Four-profile module demonstration, both themes and Arabic mobile
- [ ] Existing data/credentials/certificate preservation and migration backup
- [ ] Separate email change reconciled if included in this promotion

# Production email verification port — 2026-10-30

The owner explicitly authorized delivery of the completed email feature to both
Git repositories. This production port applies the email delta from staging
commit 959dd53 onto production 4f79fc1, retaining production history. It does not
include the separate user-management, tournament or statistics expansion.

Signup remains pending until the requesting browser proves ownership with its
six-digit emailed code. Existing unverified accounts prove ownership following
a correct password; confirmation revokes old sessions and returns to password
login. Existing accounts, passwords, games and persistent volumes are preserved.
Email verification adds no module points.

## Runtime boundaries

Production retains its __Host-taskboard_session, locale/theme cookie names,
X-Taskboard-Client-IP, x-taskboard-locale, taskboardDb and .logs conventions.
The new pending proof cookie is __Host-taskboard_verification. The additive
migration introduces User.emailVerifiedAt and EmailChallenge without resetting
accounts. Sender identity and App Password belong only in ignored configuration.
The auth contract is in docs/api/auth.md; private setup is documented in README.md.

## Verification receipt

- Source feature: 173 server tests and 35 checks per browser passed before port.
- Actual Gmail SMTP authentication, provider acceptance and matching inbox receipt
  were confirmed from the source feature. No live Gmail OTP consumption is claimed.
- Production port: 170/170 server tests, type checking and lint passed.
- Host and container builds passed. The final-image scan checked 650 artifacts
  without finding private sender or credential values; source audit passed.
- Focused email journeys passed 18/18: six each in Chrome 156.0.8078.74,
  Firefox 157.0 and Edge 156.0.4314.50, with strict certificate/hostname checks.
  These cover signup, legacy verification/session revocation, wrong codes,
  delivery failure/explicit resend, three languages, both themes, 360px/desktop
  and missing-attempt recovery. This is focused port verification, not a claim
  of rerunning every unrelated production UI case.
- Readiness, auth and game HTTPS smoke checks passed after a guarded isolated
  reset. The harness used the existing production CA-variable conventions;
  no TLS exceptions were enabled. Owned test containers were stopped and their
  data/certificate volumes retained. Normal account/database data was untouched.
- Desktop light and Arabic mobile dark captures match the existing auth world.
- Fresh independent review found no critical or important port defects. Its
  test-header mismatch was corrected to X-Taskboard-Client-IP; all four focused
  verification HTTP tests passed afterward.

Private SMTP settings were configured in the existing ignored local production
environment while preserving its original settings. They are not part of Git.

Codex assisted the implementation and verification under Mahdi's normal author
identity. No Khalid or Joseph review/integration is invented. This delivery is
Git promotion; no external deployment or normal database reset is included.

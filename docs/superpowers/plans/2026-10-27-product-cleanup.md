# Tic-tac-toe product cleanup

> Execute inline using superpowers:executing-plans. The owner requested the favicon fix and removal of obsolete product material.

**Goal:** Ship one consistently named tic-tac-toe product and remove superseded files.

**Approach:** Reuse the existing Next/React application and design tokens. Replace the custom favicon route with Next's native SVG and ICO metadata files. Rename internal cookies, headers, database cache and script settings together; remove unused dependencies, CSS and historical documents. Git history retains the original work and authorship.

**Constraints:** Preserve private environment files, databases, certificate material, Docker volumes, reference PDFs, vendored skills and actual authorship. Work in the managed checkout. No deployment or final-repository delivery.

## Tasks

- [x] Replace the icon with an authored X/O SVG using #145bb3 and a matching multi-size ICO fallback. Verify rendering and metadata links.
- [x] Update session, preference and proxy names together. Observe the existing login contract fail with the new name, add direct client-IP and preference-cookie checks, then update production code. Confirm login/logout/revocation, theme and locale behavior.
- [x] Remove unused CSV packages and product-specific CSS; update Docker, scripts, fixtures and 404 translations.
- [x] Delete superseded plans, delivery manifests, API docs, evaluation reports and design brief. Refresh current agent guidance, handoff, contribution records and delivery map. Align module IDs with README/current evidence.
- [x] Run server tests, types, lint, build, artifact/PDF audit, leftover and documentation-link scans, and browser checks where supported. Obtain a fresh review of the complete change.

## Review focus

- Cookie readers and writers must agree; Secure/HttpOnly/SameSite and revocation remain intact. Existing HTTP auth tests plus preference-cookie checks.
- Caddy and rate limiting must use the same IP header; invalid addresses retain the safe fallback. Direct clientKey checks and strict-HTTPS smoke.
- SVG and ICO must show the same X/O at tab sizes, and HTML must advertise both. Inspect 16/32px renders and built HTTP responses.
- Removing documents must not leave dead references. Check all local Markdown links and referenced paths.
- Cleanup must preserve game/admin functionality, reference checksums and normal data. Full test suite and isolated browser flows.

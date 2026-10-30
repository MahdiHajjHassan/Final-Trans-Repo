# Tic-tac-toe surface

Mode: Operate. Routes: `/[locale]/play` and `/[locale]/games/[id]`.

## Goal and flow

Understand computer and friend play, start or resume a saved match, identify the
current player and result, and recover safely from connection loss. Guests enter
through login or registration; signed-in players create a computer game, create a
friend room, join by invitation code, or resume a recent game. Friend play remains
separate signed-in browser sessions on one computer.

## Implemented expression

The shared world is recorded in DESIGN.md: burgundy/rose accents, ivory and
wine-dark surfaces, local Readex Pro for Latin and Arabic, rounded controls and
bold round-ended marks. The serif/fine-line revision is superseded. The guest
introduction pairs account actions with a tilted finished-board illustration;
its center tile uses Muted Rose Surface and its diagonal line follows the win.
Member entry compacts that artwork, places computer play in a deep-wine panel
and keeps friend creation/joining in an open bordered section; rules and recent
games follow. The artwork hides on compact member layouts.

Live matches center a stage (42rem maximum) with connection status, two player
identities, a stable turn/result heading, a square zero-gap board (30rem maximum)
and a clear action area. Text labels and mark geometry accompany color. Waiting
rooms show a read-only LTR invitation code. Confirmed X/O marks and winning lines
use bounded SVG/CSS drawing; a new result gets a short reveal. Initial snapshot
marks stay complete, reduced motion finishes strokes immediately, and rematches
navigate to the newly saved game without clearing choreography.

## Contracts to preserve

- Server-authoritative moves, saved results and versioned scoped SSE snapshots;
  uncertain actions recover by reading state, without automatic move retry.
- Nine native buttons with stable keys, row/column/state labels, guarded
  `aria-disabled` behavior and focus preserved across snapshots.
- A polite turn/result announcement, text connection feedback, explicit error
  recovery and native modal confirmation with focus return.
- English/French/Arabic, logical RTL layout and isolated player names; physical
  board positions and room codes remain LTR.
- Accessible contrast (4.5:1 for body text), light/dark theme and language
  preferences remembered in cookies and rendered on the server; local font requests and the existing HTTPS contract.
- Legal links open separately and leave active form passwords out of browser
  storage; no new product modules, backend contracts or runtime dependencies.

## Responsive and verification record

The shell caps at 1240px. Breakpoints at 1100px, 760px and 520px wrap the header,
stack play choices and compact the board context. Ordinary controls have 48px
minimum block size, with 44px navigation links and header preference controls;
board cells remain square with a 60px minimum block size.

This brief records the implementation source inspected on 2026-10-30. It does
not certify a rendered review. Delivery verification must inspect desktop and
360px and narrow 320px reflow, both themes, French and Arabic RTL, keyboard
focus, connection recovery, waiting/active/finished boards and reduced motion, alongside the existing server
and browser checks. Record observed outcomes separately from this brief.

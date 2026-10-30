---
name: Tic Tac Toe
description: A rounded modern game club in burgundy, rose and ivory.
colors:
  bg: "#f8f6f7"
  surface: "#fffafb"
  muted-surface: "#efe4e8"
  text: "#35242d"
  muted: "#705963"
  line: "#ddcbd3"
  control-border: "#957483"
  accent: "#74293f"
  action: "#74293f"
  action-hover: "#5f2035"
  on-action: "#fff8fb"
  club: "#3e1c2b"
  on-club: "#fff4f8"
  club-muted: "#dfbecb"
  x: "#842b4a"
  o: "#605d74"
  error: "#ae263f"
  on-error: "#fff"
  success: "#6d4f82"
  dark-bg: "#181317"
  dark-surface: "#281d24"
  dark-muted-surface: "#382630"
  dark-text: "#faedf2"
  dark-muted: "#cdb3bf"
  dark-line: "#59404d"
  dark-control-border: "#ac869a"
  dark-accent: "#dfb1c2"
  dark-action: "#dfb1c2"
  dark-action-hover: "#efcbd8"
  dark-on-action: "#371724"
  dark-club: "#351d29"
  dark-x: "#e5afc5"
  dark-o: "#c3bcd6"
  dark-error: "#ffa5b4"
  dark-on-error: "#3c1620"
  dark-success: "#d8bde7"
typography:
  display:
    fontFamily: '"Readex Pro", "Noto Sans Arabic", system-ui, sans-serif'
    fontSize: "clamp(3.75rem, 7.5vw, 6rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.04em"
  headline:
    fontFamily: '"Readex Pro", "Noto Sans Arabic", system-ui, sans-serif'
    fontSize: "clamp(2.25rem, 4.5vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  title:
    fontFamily: '"Readex Pro", "Noto Sans Arabic", system-ui, sans-serif'
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.025em"
  body:
    fontFamily: '"Readex Pro", "Noto Sans Arabic", system-ui, sans-serif'
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: '"Readex Pro", "Noto Sans Arabic", system-ui, sans-serif'
    fontSize: "0.8125rem"
    fontWeight: 500
rounded:
  control: "0.75rem"
  panel: "1rem"
  artwork: "1.5rem"
  badge: "2rem"
spacing:
  compact: "0.5rem"
  small: "0.75rem"
  base: "1rem"
  medium: "1.25rem"
  section: "1.5rem"
  panel: "2rem"
  large: "2.5rem"
  wide: "3rem"
  open: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.control}"
    padding: "0.7rem 1.25rem"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0.7rem 1.25rem"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    rounded: "{rounded.control}"
    padding: "0.7rem 1.25rem"
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0.75rem 0.875rem"
  navigation:
    textColor: "{colors.muted}"
    padding: "0.65rem 0.9rem"
    rounded: "0.6rem"
  badge:
    backgroundColor: "{colors.muted-surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.badge}"
    padding: "0.25rem 0.65rem"
  club-panel:
    backgroundColor: "{colors.club}"
    textColor: "{colors.on-club}"
    rounded: "{rounded.panel}"
    padding: "2rem"
  decorative-board:
    backgroundColor: "{colors.club}"
    rounded: "{rounded.artwork}"
    padding: "2.5rem"
  game-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "0"
  alert:
    backgroundColor: "{colors.muted-surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "1rem 1.125rem"
---

# Design System: Tic Tac Toe

## Overview

**Creative North Star: "The Modern Game Club"**

Ivory surfaces and deep wine framing make the game welcoming; burgundy actions and rose accents define both themes. Burgundy X and slate-violet O give the board its own visual language. Flat color, geometric marks and a locally hosted typeface carry the identity across the lobby, live game, forms, tables and legal pages.

Expressive scale belongs to the introduction and the board. Supporting screens use the same controls with quieter type and clear reading order. Authored SVG supplies the game artwork and icons; motion describes confirmed state changes, then stops. The system uses no gradients, remote fonts or decorative loops.

**Key Characteristics:**

- Ivory surfaces with wine framing and burgundy/rose actions.
- One local type family for Latin and Arabic.
- Geometric X/O marks with distinct shape and color.
- Flat everyday surfaces and deliberate modal depth.
- Bounded motion, stable controls and explicit state feedback.

Source capture: `src/frontend/styles/index.css` and the current frontend components, 2026-10-30. The serif and fine-line revision is superseded; this captures the restored rounded Readex Pro appearance with the retained burgundy palette. Frontmatter records the shared values; `dark-` color entries describe overrides under `data-theme="dark"`. Rendered review and browser results belong to the delivery evidence, not this source capture.

## Colors

Burgundy and muted rose provide the accent range; ivory and wine-black establish the two themes. Sidecar tonal ramps are generated preview metadata, not additional runtime swatches.

### Primary

- **Burgundy / Rose Action** (`action`, `action-hover`, `on-action`): primary buttons, the brand tile and text selection, with a darker burgundy hover in light mode and a lighter rose hover in dark mode.
- **Burgundy / Rose Accent** (`accent`): links, focus outlines and active-player emphasis.
- **Deep Wine** (`club`, `on-club`, `club-muted`): the computer-play panel, authentication aside and decorative board, with pale supporting copy.

### Secondary

- **Burgundy X** (`x`): live X marks and player symbols; dark mode uses a pale rose.
- **Slate Violet O** (`o`): live O marks and player symbols; dark mode uses a pale violet. Decorative marks use the same themed X/O colors on Surface tiles.

### Tertiary

- **Error Rose** (`error`, `on-error`): invalid fields, error feedback and destructive actions.
- **Success Violet** (`success`): successful feedback text and border.

### Neutral

- **Rose Ivory / Wine Ground** (`bg`): page canvas.
- **Ivory / Wine Surface** (`surface`): controls, board cells, table and dialog.
- **Muted Rose Surface** (`muted-surface`): quiet grouped states, hover backgrounds and badges.
- **Wine Ink / Pale Rose Ink** (`text`): primary text; **Quiet Rose Ink** (`muted`) carries supporting text.
- **Rose Divider** (`line`): section and table boundaries; **Control Edge** (`control-border`) gives fields and cells a stronger boundary.

**The Shape Before Color Rule.** Keep X/O geometry, text labels and active-state cues alongside color; color alone must never carry the game state.

## Typography

**Display and Body Font:** Readex Pro, with Noto Sans Arabic, system-ui and sans-serif fallbacks. The variable font is self-hosted at `public/fonts/readex-pro.ttf`, covers Latin and Arabic, and uses `font-display: swap` with a declared weight range (160–700). The font asset is 278,544 bytes; the SIL Open Font License and attribution are beside it. The fallback family name does not trigger a remote request.

**Character:** Rounded geometric letterforms connect the interface to the board. One family keeps short controls and longer translated text related without introducing a second decorative voice.

### Hierarchy

- **Display:** the guest lobby heading uses the frontmatter display scale; member introductions use a smaller fluid scale (`clamp(2.75rem, 5vw, 4rem)`). Responsive overrides below narrow the guest scale and remove its short line measure.
- **Headline:** page headings use the frontmatter headline scale; authentication headings are quieter (`clamp(2.25rem, 4vw, 3rem)`). Live status has a centered fluid scale (`clamp(1.75rem, 4vw, 2.5rem)`).
- **Title:** section headings use the title role. Subheadings use a smaller semibold scale (1.125rem, line-height 1.4).
- **Body:** the body role sets the default. Paragraphs stop at a readable measure (70ch); legal articles cap at 72ch with more generous paragraph leading (1.9).
- **Label:** field labels use the label role. Buttons use medium type (0.875rem, line-height 1.5); badges and footer text are smaller (0.75rem). Tables and pagination use tabular numerals.

**The Shared Script Rule.** Use the same local family for English, French and Arabic; preserve translated labels and natural wrapping rather than forcing uppercase interface copy.

## Layout

The centered shell caps its width (1240px) with generous inline padding (3rem). At the first breakpoint (1100px), padding reduces (2rem), navigation wraps to a full row and the header keeps preferences together. At the compact breakpoint (520px), padding reduces again (1.25rem) and preferences take their own row. Navigation links wrap within their row to accommodate narrow translated layouts.

Guest entry pairs an introduction with a square geometric board illustration; signed-in entry makes that artwork compact and gives the two play choices their own area. The live game has a centered stage (42rem maximum) and a large square board (`min(100%, 30rem)`). Board cells have zero gap so win-line geometry stays aligned with exact grid thirds. Tables scroll within their own bordered region.

At the intermediate breakpoint (760px), play choices and account columns stack; authentication becomes one column and hides its decorative aside. At the compact breakpoint (520px), the guest introduction and game-mode summaries stack, the member artwork hides and recent-game actions wrap. Shared spacing progresses from compact control gaps to open section separation; forms cap their width (38rem).

**The Logical Flow Rule.** Use logical spacing and isolated player names for RTL; keep the physical game board and invitation codes LTR so positions remain consistent across languages.

## Elevation & Depth

Everyday surfaces are flat. Borders, rose tonal changes and spacing establish hierarchy; panels have no ambient shadows. The active player gets an inset underline (`inset 0 -3px 0 var(--accent)`), and a playable cell gains an inset hover boundary (`inset 0 0 0 2px var(--accent)`). A native dialog alone uses a floating shadow (`0 24px 100px #170d1440`) over a dim backdrop (`#170d23a6`).

**The Modal Depth Rule.** Reserve floating elevation for modal interruption; use tonal surfaces and borders for normal content.

## Shapes

Controls and ordinary framed regions share gently rounded corners through the control radius. Larger enclosed panels use the panel radius; prominent artwork and authentication framing use the artwork radius. Badges are pill-like. The playable board has a rounded outer silhouette (1rem), square internal corners, and outlined zero-gap cells. Live marks have round stroke ends (9 units in a 100-unit viewBox), and the winning line uses a round stroke (5 units in a 300-unit viewBox). Decorative marks are bolder (10 units) with a diagonal line (7 units). The decorative board is tilted slightly (-7deg), with a Muted Rose Surface center tile; the interactive board remains upright.

## Components

### Buttons

Clear, compact actions with a light tactile response. The primary variant uses Action and its paired foreground, including the border; secondary uses Surface and Control Edge; danger uses Error Rose and its foreground. Shared padding and the control radius are in frontmatter. Ordinary buttons have a minimum block size (48px); navigation links, header preference and logout buttons use a compact minimum (44px).

Hover lifts enabled buttons slightly (-2px); primary hover uses the theme-specific Action Hover token and secondary hover uses Muted Rose Surface. Press returns the button to its base position and scales it slightly (0.98). Transitions take 180ms with the shared ease for movement. Disabled native buttons use a waiting cursor and reduced opacity (0.6).

### Chips

Status badges use Muted Rose Surface, compact padding and the badge radius. The accent variant changes its text color and adds a small current-color dot (6px); readable text remains present.

### Cards / Containers

The computer-play panel is an enclosed Deep Wine block with light copy; friend play uses an open section with a strong top border. Authentication repeats the wine enclosure as a supporting aside. These are specific compositions, not a general-purpose card grid. Shared alerts, fields, tables and dialogs retain their own semantic structure.

The room-code form aligns its submit action with the input on desktop, leaving
the hint beneath the input. At compact widths (520px and below), the complete
label/input/hint field precedes the action in one column.

### Inputs / Fields

Fields use Surface, a thin Control Edge border (1px), the control radius and a minimum block size (48px). Hover strengthens the border with Accent. The read-only state uses Muted Rose Surface. Invalid text fields use an Error Rose border and linked field feedback. Labels, hints and errors remain connected through stable IDs; native select, checkbox and password behavior are preserved.

All interactive controls use a visible Accent outline (3px, offset 4px). The board moves this outline inside each cell (offset -5px); focus on the wine computer panel uses its pale foreground. Checkbox controls retain their native interaction rather than adopting the full text-field dimensions.

### Navigation

A burgundy/rose X/O brand tile anchors the header. Navigation uses compact muted labels with a minimum block size (44px); hover and current page use Muted Rose Surface and primary text, with the current page also semibold. Active-page semantics include live matches under Play. Language remains a labelled native select, and the icon-only theme button has a translated accessible name. The skip link becomes visible on focus. Legal links state that they open separately so active forms remain intact.

### Game Board and State

Nine native cell buttons expose row, column and current mark. Unavailable cells retain focusability with `aria-disabled` and a guarded move handler. New confirmed marks draw through authored SVG; marks already in the initial snapshot stay complete. X strokes draw in sequence (320ms with the second stroke delayed 100ms). A confirmed winning line draws through the three cell centers (550ms with a 160ms delay). A new result receives a short reveal (450ms), while a dialog arrives once (220ms). Active-player emphasis transitions over 240ms.

The turn/result heading announces updates politely. Connection feedback and recovery sit beside the board; playable state follows saved server state. Rematch opens the newly saved game immediately. Reduced-motion settings remove animation and transitions and show finished strokes. Decorative artwork is hidden from assistive technology and has no input behavior.

**The Confirmed Motion Rule.** Animate committed state without delaying input, retrying uncertain moves, replaying initial marks or replacing focused cell buttons.

## Do's and Don'ts

### Do:

- **Do** reuse burgundy/rose semantic colors in both themes and preserve the body-text contrast requirement (4.5:1).
- **Do** preserve translated labels, logical layout, LTR board positions and isolated player names.
- **Do** retain native controls, visible focus, stable board buttons and explicit connection recovery.
- **Do** use short SVG/CSS state motion that finishes and respects reduced motion.
- **Do** verify rendered desktop, 360px and narrow 320px reflow, both themes, French and Arabic RTL when changing the interface.

### Don't:

- **Don't** introduce green or orange accents or restore the superseded serif/fine-line styling.
- **Don't** add gradients, remote font requests or decorative animation loops.
- **Don't** replace game labels or shape cues with color alone.
- **Don't** place ordinary content on floating shadows or turn every section into an enclosed card.
- **Don't** delay rematch navigation or invent optimistic board state for an animation.
- **Don't** infer completed visual or accessibility verification from this source-based design record.

# Tic Tac Toe design system

Operate mode: make starting a game, identifying a turn and recovering a connection
obvious. Retain the existing restrained shared tokens, one system sans family,
warm neutral surfaces/charcoal dark theme and blue action accent. No remote fonts,
illustrations, new visual assets or additional skills were introduced.

A large square nine-cell board is the focal element. X/O use authored SVG with
different geometry and text labels. Opponents sit above the board; turn/result
text occupies a stable heading; one main action sits below. Phone layouts stack
lobby sections; logical spacing and bdi support Arabic. Room codes stay LTR.
Both 360px and desktop layouts, light/dark and RTL must be inspected as rendered.

Tokens in src/app/globals.css: --bg, --surface, --text, --muted,
--muted-surface, --accent, --line, --error, --success and --radius. Body is 1rem;
page titles use a restrained 2rem scale and board titles adapt with clamp. Controls
have 44px minimum targets, visible focus and 4.5:1 body contrast. Theme preference
uses a cookie and is rendered server-side to avoid a theme flash.

Eleven actual shared primitives compose the application: Button, FormField,
TextField, SelectField, CheckboxField, Alert, Badge, Dialog, DataTable, Pagination,
EmptyState. Auth/account/admin use fields and feedback; lobby uses fields/buttons;
board uses Badge/Alert/Button/Dialog; recent games use EmptyState/Pagination;
admin uses DataTable. Tabs remains available in ui.tsx but is not counted as used.

Board buttons expose row, column and current state. aria-disabled plus a guarded
handler keeps focus stable when a played square becomes unavailable. Native
keyboard activation works; snapshot updates never steal focus. The live heading
announces turns/results. Error feedback provides explicit recovery; moves remain
unavailable until synchronized. Destructive actions use a native modal dialog
with focus return. Legal links open separately without persisting form passwords.

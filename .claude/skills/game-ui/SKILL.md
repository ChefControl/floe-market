---
name: game-ui
description: Use before building or changing any panel the player presses things in, in Floe Market (casino tables, vendor panels, shops and upgrade screens, mini-games, fight screens, menus and dialogs, tutorial prompts), when fixing one up to the standard, or when asked to check the whole game's UI ("check the UI", "UI audit", "/game-ui check"). Covers the UI kit (src/uiKit.ts, src/uiKit.css), its four skins, buttons and their states, keys, closing, pausing, sounds, words, and the check's page with cropped screenshots.
---

# Floe Market UI standard

The owner settled this standard in a grilling on 2026-10-18. It covers every part of the screen the player presses
things in. Speech bubbles and the HUD's numbers are not part of it.

The skill has three uses:

1. **Build** a new panel: make it with the kit and follow the rules below.
2. **Fix up** an old panel the owner points at: move it onto the kit and work through the checklist.
3. **Check the whole game**, only when asked. Go through every surface and publish the list of problems as the check's
   page (see the last section).

See it working before you start: run the dev or demo build with `?ui=kit`. It shows every piece in all four skins,
and holding Shift shows the keys.

## The rules

**Places.** A panel sits in one of three places:
- **Card** along the bottom, for anything you walk up to (casino tables, vendors, the shop, the gong). It docks on the
  right on a phone held sideways. It never pauses the game.
- **Dialog** in the middle over the dimmed game, for menus and forms (report, scores, saves).
- **Full screen**, for mini-games and result cards.

Every panel is registered with the kit, so the camera keeps the player in sight of it (ui.ts `keepInSight`).

**Skins.** There are four: `base`, `casino`, `fight` and `cooking`. A skin may change only colours, fonts and corner
roundness. Sizes, the press feel, states, keys and layout are the same in every skin. A single panel may add its own
colours on top (Eddie's risk colours, the red and black bets), and nothing else.

**Custom details.** A button may carry its own details on top of the kit's frame, when they make it read as the thing
it is. The casino's stake chips are round with a dotted ring inside the edge, like real chips (index.html's
`.casino .stakes`, an SVG `background-image`). The owner likes these, so keep them. Other examples are Eddie's chip
over its fee and the pays under red and black. A detail must not break the standard. The button keeps its kind, its
press, its states (a greyed chip keeps its ring) and its key badge. Put details on the button's background or a child
element. Never use `::before`, which belongs to the key badge.

**Buttons.** There are four kinds:
- `k-main`: one per panel, the biggest. Green in base, gold in casino and fight, red in cooking. **E** presses it.
- `k-plain`: everything else.
- `k-danger`: red, needs two taps (the first arms it with `aria-pressed="true"`, as Restart does).
- `k-choice`: one of a row. The picked one has `aria-pressed="true"`. A plain choice fills when picked. A choice in its
  own colour (class `k-own`, colour in `--c`, like chips and red/black) lifts with a ring instead.

Every button presses down onto its shadow when tapped and shows the skin's focus ring. With a mouse it lifts a little
on hover. On touch every button is at least 44px.

**States** (`state(button, …)` in uiKit.ts):
- `ok`: works.
- `busy`: not now, because something's under way (a round, a pour). Faded and disabled.
- `broke`: the player can't afford it. **Grey**, with the price still readable. A tap only shakes the cash in the HUD.
- `locked`: not open yet. Grey, with 🔒 and what opens it in ≤8 words.

Anything the player can never use from where they stand is **hidden**, not greyed (for example Tommy's chips above
his table limit, `StakeRules.hideOver`).

**Closing.**
- A card you walked up to closes when you walk off.
- **Esc** closes everything. On a card it works like walking off: the card stays shut until the player steps off the
  pad, or presses E where they stand. If a round is under way, it plays out as it would after walking off, and the
  player is paid.
- A **✕** (`k-plain k-x`) appears only on things you can't walk away from: dialogs, full screens, the shop bench. It is
  always that one ✕.
- Forced choices (the cloud save pick, the stale-tab notice) have no Esc and no ✕ (`forced: true`).

**Keys.**
- **E** presses the panel's main button. The round on-screen action button does the same as E.
- **1–9** press the buttons in the panel's `k-keys` rows, in order. A panel has at most 9 of them showing at once.
- **Enter / Space** press the focused button (the browser's own behaviour) and advance speech lines.
- No Z.
- **Holding Shift** shows each button's key on it. It is never shown otherwise.
- Keys typed into a text box are left to that box.

**Pausing.** If a panel dims the screen, the game pauses and says "Game paused". The kit adds that tag itself and
game.ts waits on `paused()`. Cards never pause. Story scenes (Mr. Fugu, Eddie's coin) hold the world as they do now.

**Sound.** There's no general click sound. Every main action makes a game sound: a chip clack, the gong, a coin, a
sizzle. A panel whose main action is silent is missing one. Reuse sfx.ts sounds where they fit. For a new sound,
follow the no-pops rule: render it offline and scan it before it ships.

**Words.** Stage 3's text rule applies to the whole game:
- Buttons carry the action and its numbers ("Borrow 🐡 20 · Return 🐡 24").
- A panel may add **one caption of ≤8 words** (`k-cap`), only for a rule the numbers can't show.
- Toasts and bubble lines are ≤8 words.
- Say "fight", never "bout", in anything the player reads.
- Write plain words, never slang.

## Using the kit

```ts
import { panel, state } from './uiKit';

// a card you walk up to (a casino-style table: casinoKit's gamePad does all of this for you)
const card = panel(el, { place: 'card', skin: 'casino', busy: () => pouring });
// each frame: open while the player's near, unless they shut it with Esc and haven't stepped away
el.hidden = !card.near(playerIsNear);

// a dialog: it pauses the game; Esc hides it (or give `close` to do more)
panel(dialogEl, { place: 'dialog', skin: 'base', close: closeReport });

// a button's state, every time the panel refreshes
state(buyBtn, busy ? 'busy' : cash < price ? 'broke' : 'ok');
```

Markup: the panel holds `k-title` / `k-msg` / `k-cap` text and `k-row` rows of `k-btn` buttons. Number a row with
`k-keys`; its buttons must be direct children. A dialog's content goes in a `k-sheet`. The casino tables in index.html
(`#roulette` … `#tears`) are the worked example, along with casinoKit.ts (`gamePad`, `Stakes.play`) and the panel code
in rouletteTable.ts, eddie.ts and club.ts.

Watch out for these:
- `b.disabled = …` for money is wrong: a disabled button can't shake the cash. Use `state(b, 'broke')`.
- Hold-to-repeat code must check `usable(b)` rather than `b.disabled`.
- Never set a button's `textContent` if the panel puts anything on the button's `::before`. The key badge lives there.
- A raw `keydown` for E or Esc in a panel's own file is wrong. The kit handles both. Remove the old listener when you
  move a panel onto the kit.
- When a panel moves onto the kit, take it out of `notKit` in ui.ts.

## Not on the kit yet

Only the casino boat's and the Undertow's tables use the kit so far (PR "UI standard"). Each of these still needs moving
onto it, with what the 2026-10-18 survey found wrong:
- **Shop / bench** (`#shop`, shop.ts):
  - no Esc;
  - its ✕ is red, unlike every other ✕;
  - digit keys fold sections, which turns into `k-keys` rows.
- **Your look** (`#look`, customize.ts): has its own Esc handler.
- **Gong, fight card, Eddie's coin** (`#gong`, `#fightCard`, `#coin`, gong.ts):
  - the gong should use the fight skin;
  - the focus ring is white;
  - nothing closes the card with a key.
- **Cooking at the pot** (`#show`, chanko.ts):
  - should be full screen in the cooking skin;
  - no Esc;
  - no sounds at all.
- **Dialogs** (`#report`, `#scores`, `#cloudPick`, `#stale`):
  - four copies of the same backdrop;
  - each has its own ✕;
  - none pauses the game.
- **Settings menu** (settings.ts): a dropdown, so it stays unpaused, but it needs the kit's buttons.
- **Korki and the rain song** (korki.ts, rain.ts):
  - no Esc;
  - their own focus colours.
- **Mr. Fugu's offer and the way south** (offer.ts, southDoor.ts):
  - Z advances speech;
  - each has its own local `sfx`.
- **The round action buttons** (`#buy`, `#toss`, `#craft`, `#cook`) and the tutorial's coach.

## Before you call it done

- [ ] Registered with `panel(…)`: the right place and skin. Out of `notKit` if it was there.
- [ ] One main button, E presses it. At most 9 numbered buttons showing, in reading order.
- [ ] Esc closes it (or it's forced). A ✕ only if you can't walk away, and only the kit's.
- [ ] Money uses `broke`, round-in-progress uses `busy`, not-yet-open uses `locked`, never-here is hidden.
- [ ] Dims the screen? It pauses. Card? It doesn't.
- [ ] The main action makes a game sound.
- [ ] Words: numbers on buttons, one caption ≤8 words, no "bout", no slang.
- [ ] 44px targets on touch. Docks right on a phone held sideways (`max-height: 500px`).
- [ ] Tests for the panel's keys and states, like test/uiKit.test.ts. Run only the related test files locally; the
      full suite runs on CI.
- [ ] Looked at in the demo build (below), mouse and phone sizes, Shift held for the keys.

## Checking the whole game

Run this only when the owner asks. The result is **one artifact page, updated in place every time**, so its link never
changes. Its URL is in `audit-page.md` next to this file. If that file doesn't exist yet, create the page and write the
file.

1. **Start the demo build:** launch config `floe-market-demo`, which is `VITE_FUGU_DEMO=1 npx vite --port 5177
   --strictPort`. If the config is missing, add it to `.claude/launch.json`. Never use the normal dev server (5175): it's
   signed in to the owner's cloud save. The demo build never calls `initCloud`. To load a state (stage 3, the Undertow
   found), use `deviceStore.write(…)` and then `load()`, with no reload.
2. **Start the receiver:** run `python3 -I .claude/skills/game-ui/receiver.py <scratchpad>/ui-check` in the background.
   It saves the screenshots that `shot.js` posts.
3. **For each surface** (the lists above):
   - Reach it from page JS: set `player.g.position` to the spot from layout.ts or cellarPlan.ts (imported as below).
   - Check every rule: the place and skin, Esc/E/1–9/Shift, states, the ✕, pausing, sound, words, 44px on touch
     (`resize_window` mobile).
   - Import the game's modules by the URL the page loaded them from, so you reach the running game and not a second
     copy (a second copy throws three.js errors and leaves the cash unchanged):
     `const url = n => performance.getEntriesByType('resource').map(e => e.name).find(u => new URL(u).pathname === '/src/' + n);`
     then `await import(url('player.ts'))`.
   - After a source file is edited, restart the server and reload before driving it again.
4. **For each problem**, take a cropped screenshot:
   - Paste `shot.js` into `javascript_tool` with `NAME` (e.g. `gong-no-esc`) and `SEL` (or `RECT`) set.
   - It posts the 3D world with the panels over it, cropped to that part, as `<NAME>.jpg`.
   - The panels are redrawn by html2canvas, as in bug reports. It misses a few CSS touches (a chip's dashed ring, some
     shadows), so don't report those from a shot alone. Check them with a real `screenshot` / `zoom`.
5. **Publish the page:** load the `artifact-design` skill first. Then for each problem show:
   - the surface;
   - what's wrong, in one plain line;
   - the rule it breaks;
   - `file:line`;
   - the cropped screenshot (each image goes in the Artifact tool's `files`).

   Group the problems by surface, with the worst first. Update the same URL. Fixed problems drop off the list.
6. Give the owner the link and a two-line summary. Fix nothing until the owner picks what to fix.

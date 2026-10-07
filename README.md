# Floe Market

A cozy 3D idle/tycoon game for the browser, in two stages. Stage 1 is a fish market: catch fish from the ice, sell it at a walk-up counter and upgrade the market. Stage 2 rebuilds it as Floe Sushi, a conveyor-belt sushi restaurant with rice terraces on the hillside, which you grow until the whole chain runs itself.

## Play

Play it at https://chefcontrol.github.io/floe-market/, or run it locally:

```bash
npm install
npm run dev
```

- **Move:** drag anywhere (touch or mouse) for a virtual joystick, or use WASD / arrow keys
- **Fish:** stand on the 🎣 pad to hook fish; they get chopped into fish slices automatically
- **Sell fish (stage 1):** pick slices up from the pile, drop them on the counter's 🐟 pad, and walk over the cash to collect it. Walk-in customers pay $4 a slice; once the sled window is built, snowmobiles buy 4–8 at a time at $6
- **Upgrade:** stand on a price tile to pay into it. Some tiles also need a star rating (see below). The chip under the rating shows the stage and how many of its upgrades are built
- **Upgrade circle:** each stage has a 📈 circle (by the counter in stage 1, by the kitchen line in stage 2). Stand on it to open the stage's repeatable upgrades and tap one to buy its next level: a better product (prices), marketing (customers) or the crew (speed). The list in the top left shows every modifier in play as a percentage, including how much your rating brings customers in
- **Stage up:** with all seven market upgrades built, a gold 🏯 tile appears in the middle of the dock: Open Floe Sushi, $12,000. Paying it off plays the stage-up: the counters and the south fence come down, the restaurant, its garden and the terraces go up, and day turns to dusk. Cash, rating and upgrades carry over; the counters' leftover fish and cash move to the restaurant, the roulette table moves up the dock, and Korki's statue moves to the garden
- **Rice (stage 2):** buy bags at the rice stall on the dock ($5 each; if you can't pay, the stall takes a fish slice for a bag instead), or grow it on the terraces west of the restaurant: it ripens (green to gold) in about 16 seconds, and you wade through it to harvest, or take bags off the farmer's stack on the path
- **Make sushi:** drop fish slices on the 🐟 pad and rice on the 🍚 pad at the kitchen line facing the dock. Your arms carry both at once. The cooks there toss them to a chef inside the bar, who makes a plate (a bag of rice makes two) and puts it on the belt circling them. Once the takeout kiosk is open, the chefs also pack boxes for it, keeping a few ready
- **Sell sushi:** diners in top hats come up the garden path and through the red gate, sit at the bar, take plates as they pass, and pay $30 a plate at the register by the gate when they leave. Snowmobiles buy 3–6 boxes at a time at the kiosk on the road ($35 a box); their cash lands just inside the east wall
- **Rating:** customers only wait so long. Each one leaves a 1–5★ review when they go, based on how long they waited; someone who gives up leaves 1★ and pays only for what they got. The rating in the HUD is the average of the last 20 reviews (a new game starts at ★3.0). A better rating also brings customers in faster: ×0.6 at ★1, ×1.4 at ★5
- **Gamble:** once the roulette table is built, stand on its 🎰 pad to bet on red/black, odd/even, 1–18/19–36 (pays ×2) or a single number (pays ×36)

## Economy

The money curve follows idle games ([the math of idle games](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i)): prices grow exponentially, and so does income, a little more slowly, so each purchase takes a bit longer than the last.

- **Repeatable upgrades**, three a stage, at the stage's upgrade circle:

  | | Stage 1 | Stage 2 | Each level | Price |
  | --- | --- | --- | --- | --- |
  | Better product | 🐟 Fine fillets | 🍣 Chef's specials | Prices +25% | ×1.6 a level, no limit |
  | Marketing | 📣 Posters, flyers, radio, social media, ... TV ad | 📣 Menu boards, lantern signs, ... world famous | Customers +20%, longer queues | ×1.75 a level, 8 levels |
  | Crew | 💪 Crew training: fishing and chopping | 🧑‍🍳 Kitchen crew: chefs, farm workers, rice growing | Speed +15% | ×1.75 a level, 8 levels |

  They start at $40, $60 and $80 in stage 1 and $500, $800 and $1,000 in stage 2.
- **One-off upgrades** roughly double in price each time and add capacity: machines, workers, chefs, seats, terraces.
- **Tiers.** Each stage ends on an expensive capstone. The gold tile costs about five minutes of a well-run market's income, so you start stage 2 almost broke, and stage 2's prices and sale values are about ten times stage 1's.
- **No dead ends.** Fishing is always free, and the rice stall takes a fish slice for a bag when you're short of cash, so there's always a way to make sushi and money again. The runner (bought in stage 1) keeps the fish tray stocked, the farmer's stack can be carried in by hand before there's a rice porter, and the chefs only pack a few takeout boxes ahead, so plates keep coming for diners. Rice keeps up with a fast kitchen: a bag makes two plates, and the kitchen crew speeds up the farmer and the rice porter too.

On a simulated run by a bot that plays like a reasonable player (see [Development](#development)), stage 1 takes about 13 minutes, with income growing from about $200 to $10,000 a minute; stage 2's upgrades are all bought about 30 minutes later, with income growing from about $1,600 to over $300,000 a minute. Better products then carry on for as long as you like.

## Unlocks

Two upgrades of the current stage are on offer at a time, in this order. A tile with a star requirement shows the rating it needs (🔒 ★3.5) instead of its price until your rating reaches it. Once reached, it stays open even if the rating drops later.

**Stage 1: Fish Market**

| Upgrade | Cost | Needs | Effect |
| --- | --- | --- | --- |
| 🎒 Bigger arms | $30 | | Carry 14 things at once |
| 🎯 Auto harpoon | $90 | | Catches fish while you're away |
| 🎰 Roulette table | $150 | | Bet your cash on a European wheel |
| 🏃 Hire a runner | $300 | ★3.5 | Carries fish from the pile to whichever counter is lowest (in stage 2, to the kitchen line) |
| 🥾 Snow boots | $500 | | Walk faster |
| 🛷 Sled window | $900 | ★3.8 | Opens a window in the east fence where snowmobiles buy fish in bulk, for half as much again |
| 🥅 Ice net | $1,600 | ★4.0 | Hauls in fish nonstop |
| 🏯 Open Floe Sushi | $12,000 | all of the above | Stage 2: the restaurant with ten seats, a chef and two cooks, the rice stall and the (bare) terraces |

**Stage 2: Floe Sushi**

| Upgrade | Cost | Needs | Effect |
| --- | --- | --- | --- |
| 🌾 Rice terrace | $1,500 | | Plants the bottom terrace (18 clumps of rice) |
| 🔪 Second chef | $3,000 | ★3.6 | Another chef at the bar |
| 🪑 More seats | $5,000 | ★3.8 | Eight more seats at the bar (18 in all) |
| 🧑‍🌾 Hire a farmer | $6,000 | ★3.9, 🌾 | Harvests the terraces onto a stack on the path |
| 🥡 Takeout kiosk | $8,000 | ★4.0 | Snowmobiles on the road buy boxes of sushi; the chefs pack them |
| 🧺 Rice porter | $12,000 | ★4.1, 🌾 | Carries rice from that stack, 12 bags at a time, in through the farm door to the kitchen line |
| 🌱 Second terrace | $18,000 | ★4.2, 🌾 | Plants the middle terrace |
| 🔪 Third chef | $25,000 | ★4.3 | A third chef at the bar |
| 🌱 Third terrace | $35,000 | ★4.4, second terrace | Plants the top terrace, by the hot spring |
| 🏮 Premium menu | $60,000 | ★4.5 | Everything sells for 60% more |

🛴 **Korki's golden statue** ($10) is on offer from the start, outside the queue: a gold NAMI Klima One on a pedestal, in memory of Korki. Stand on its pad to read his story; stay a few seconds and his song ("Car Alarm (extended reprise)" by pat's soundhouse, via YouTube) fades in quietly, and fades out when you leave.

Market customers and diners order 1–3 and give up after 40 seconds of waiting (for diners, 40 seconds in total between plates). Snowmobiles wait 55 seconds.

### Saving

Progress saves automatically on the device, including your reviews and everything along the supply chain (the pile, the counters, the kitchen line, plates on the belt, workers' loads, the terraces' stack): every few seconds, whenever the page is hidden or closed, and after each upgrade. Cash, fish and rice that are mid-air are counted, as are diners' unpaid bills, so closing the tab at any moment loses nothing.

- **One tab at a time.** If the game is opened in a second tab, the older tab stops saving and says so, so it can't overwrite newer progress.
- **Updates don't reset progress.** Saves carry a format version and older saves are migrated on load, keeping cash, rating and upgrades. Saves from before the two stages stay in stage 1, except those that had both the old restaurant west of the dock and every market upgrade: they go straight to stage 2, keeping the restaurant's upgrades, with the old kitchen's fish and the counters' leftovers on the kitchen line and the cash at the register. Everyone else gets back what they spent on the old restaurant, its cash and its unsold plates. A save that can't be read is kept under `floe-market-backup` instead of being overwritten.
- **Storage that sticks.** The game asks the browser to keep its storage (`navigator.storage.persist()`). On iPhone, Safari clears website data after 7 days without a visit; adding the game to the Home Screen avoids that (note that the Home Screen app keeps its own separate save).
- **Restart** (top right) erases progress after a second, deliberate tap; a quick double-tap is ignored.

## Development

TypeScript + [three.js r186](https://threejs.org/), bundled with [Vite](https://vite.dev/). All textures are drawn at runtime on canvas; the Baloo 2 font comes from Google Fonts.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run typecheck` | Type-check only |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests with coverage (fails below the thresholds in `vite.config.ts`) |
| `npm run test:watch` | Unit tests in watch mode |

`SIM=1 SIM_MINUTES=60 SIM_OUT=sim.txt npx vitest run test/balance.sim.test.ts` has a bot (`test/bot.ts`) play a fresh game for an hour of game time, in a few seconds, and writes when it bought each upgrade and how its money and earnings grew minute by minute. Use it to check the balance after changing prices; `test/softlock.test.ts` also uses the bot to check a whole game never stalls.

`.github/workflows/deploy.yml` runs the tests on every pull request and push. On `main`, it builds and deploys to GitHub Pages only if they pass.

### Tests

[Vitest](https://vitest.dev/) in jsdom. `test/setup.ts` stubs the two things jsdom lacks (the WebGL renderer and 2D canvas drawing) and seeds `Math.random`; everything else, three.js included, runs for real. `loadGame()` in `test/helpers.ts` loads a fresh copy of the whole game, optionally from a save, and steps it with `tick()`, so most tests read as "set up a situation, run a few seconds, check the outcome".

### Source layout

| File | Contents |
| --- | --- |
| `src/main.ts` | Entry point: boot, restart button, camera and render loop |
| `src/game.ts` | `tick()`: one simulation step for the whole world |
| `src/render.ts` | Renderer, scene, camera, lights, shared materials/geometry, canvas helpers |
| `src/world.ts` | Static scenery: water, the dock (both stages'), fences, roads, trees |
| `src/layout.ts` | The current stage, where people can walk in each, and the ground height (terraces, bridge, garden) |
| `src/stage.ts` | The stage-up show (banner, camera pull-back, pieces in and out) and stage 2's dusk lighting |
| `src/hall.ts` | The Floe Sushi building: floor, roof ring (fading when it would hide the player), walls, lanterns, gate, garden, kiosk booth |
| `src/farm.ts` | The terraces, hillside and hot spring, farmhouse and water wheel, drying racks, channel, path and bridge |
| `src/stations.ts` | Fishing pad, chopping block, fish pile |
| `src/fishing.ts` | Fish, hooking, chopping into slices |
| `src/counters.ts` | The walk-up fish counter, sled window and takeout kiosk, and their customers (patience, reviews) |
| `src/economy.ts` | Sale prices, and the repeatable upgrades (price, marketing, crew) and what they multiply |
| `src/shop.ts` | The upgrade circles and their panel, and the modifier list in the HUD |
| `src/rating.ts` | Reviews and the market rating |
| `src/bubble.ts` | Order bubbles with patience rings, and mood faces |
| `src/restaurant.ts` | The sushi bar: kitchen line and cooks, chefs, the plate belt, diners, register |
| `src/rice.ts` | Rice stall, planting the terraces, the farmer and the rice porter |
| `src/player.ts` / `src/playerUpdate.ts` | Player entity / per-frame player logic |
| `src/runner.ts` | Runner AI |
| `src/unlocks.ts` | Upgrade tiles for both stages and the machines they build |
| `src/roulette.ts` / `src/casino.ts` | Roulette rules / the table and its betting panel |
| `src/korki.ts` | Korki's golden statue (a NAMI Klima One) and its memoir panel |
| `src/holder.ts` | Item stacks and arcing item flights |
| `src/characters.ts` | People and sleds, walking |
| `src/decals.ts` | Deck markings (pads, drop zones, price tiles) |
| `src/items.ts` | Fish slice, rice, plate, box and bill meshes |
| `src/input.ts` | Virtual joystick and keyboard |
| `src/ui.ts` | HUD and stage chip, toasts, tips, floating text, the stage-up banner and confetti |
| `src/save.ts` | Per-device save/load, migration, autosave, one-tab-at-a-time guard |
| `src/wallet.ts` | Money |
| `src/errors.ts` | On-screen error reporting |
| `src/util.ts` | Math/random helpers |

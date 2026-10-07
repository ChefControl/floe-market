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
- **Upgrade circle:** each stage has a 📈 circle (by the counter in stage 1, by the kitchen line in stage 2). Stand on it to open the stage's repeatable upgrades and tap one to buy its next level: a better product (prices), marketing (customers) or the crew (speed). The list in the top left shows every modifier in play as a percentage, including how much your rating brings customers in; tap the stage chip to fold it away or back (on phones it starts folded, so the HUD leaves the game in view). Every level shows in the world too (see [Economy](#economy))
- **Stage up:** with all nine market upgrades built, a gold 🏯 tile appears in the middle of the dock: Open Floe Sushi, $12,000. Paying it off plays the stage-up: the counters and the south fence come down, the restaurant, its garden and the terraces go up, and day turns to dusk. Cash, rating and upgrades carry over; the counters' leftover fish and cash move to the restaurant, the roulette table moves up the dock, and Korki's statue moves to the garden
- **Rice (stage 2):** it grows on the terraces west of the restaurant, out through the farm door. The restaurant opens with a small patch of six clumps by the door, which ripens (green to gold) in 15 seconds: just enough for the first customers at a five-star rating, and no faster with upgrades, so more customers need the rest of the terrace, where rice ripens in 16 seconds and the kitchen crew speeds it up. Wade through ripe rice to harvest it, or take bags off the farmer's stack on the path. Fish the kitchen has no room for go back to the pile as you harvest, to make room in your arms
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
  | Crew | 💪 Crew training: fishing and chopping | 🧑‍🍳 Kitchen crew: chefs, the runners, farm workers, rice growing (not the starting patch) | Speed +15% | ×1.75 a level, 8 levels |

  They start at $40, $60 and $80 in stage 1 and $500, $800 and $1,000 in stage 2. Each level shows in the world:

  | | Stage 1 | Stage 2 |
  | --- | --- | --- |
  | Better product | The price board over the walk-up counter shows the new price, and a star a level | A wooden menu tag over the kitchen line, a new dish on each |
  | Marketing | Each campaign for real, spread round the market: posters on the fence, a promoter handing out flyers down the customers' path, a radio playing the jingle and a giant phone with the market's post collecting likes (at either end of the dock), a billboard and a newspaper box across the road, a food blogger taking photos and a TV playing the market's commercial out in the snow | Spread round the restaurant: a chalk menu board in the front garden, big paper lanterns on the front eaves, a phone on a ring light filming the bar, a food critic at a table holding up five stars, a magazine rack by the entrance, a TV camera filming the chefs, the gourmet guide's stars over a pedestal by the register, and flags from all over the world across the room |
  | Crew | The player's headband, coloured like a judo belt: white, yellow, orange, green, blue, purple, brown, black | The chefs' and cooks' toques grow taller |

  Fishing speed (crew training) still counts in stage 2, but it isn't in the list there: the dock catches more fish than the kitchen gets through, so carrying fish in (the runners) is what can hold the kitchen back, and the kitchen crew speeds that up.
- **One-off upgrades** roughly double in price each time and add capacity: machines, workers, chefs, seats, terraces.
- **Tiers.** Each stage ends on an expensive capstone. The gold tile costs about five minutes of a well-run market's income, so you start stage 2 almost broke, and stage 2's prices and sale values are about ten times stage 1's.
- **No dead ends.** Fishing and rice are always free, and fish the kitchen can't take go back to the pile as you harvest rice, so arms full of fish never stop you making sushi and money again. The runners (bought in stage 1) keep the fish tray stocked, the farmer's stack can be carried in by hand before there's a rice porter, and the chefs only pack a few takeout boxes ahead, so plates keep coming for diners. Fish and rice keep up with a fast kitchen: a bag of rice makes two plates, and the kitchen crew speeds up the runners, the farmer and the rice porter too.

On a simulated run by a bot that plays like a reasonable player (see [Development](#development)), stage 1 takes about 13 minutes, with income growing from about $200 to $10,000 a minute; stage 2's upgrades are all bought about 28 minutes later, with income growing from about $1,600 to over $250,000 a minute, and to over $700,000 an hour into the game. Better products then carry on for as long as you like.

## Unlocks

Two upgrades of the current stage are on offer at a time, in this order, plus the chefs, which are out all through stage 2. A tile with a star requirement shows the rating it needs (🔒 ★3.5) instead of its price until your rating reaches it. Once reached, it stays open even if the rating drops later. A tile only takes money once you stop on it, not while you walk across.

Whenever a new upgrade comes on offer, a message says what it is, and while its tile is off-screen an arrow at the edge of the screen points the way to it, until you've had it in view for a moment.

**Stage 1: Fish Market**

| Upgrade | Cost | Needs | Effect |
| --- | --- | --- | --- |
| 🎒 Bigger arms | $30 | | Carry 14 things at once |
| 🎯 Auto harpoon | $90 | | Catches fish while you're away |
| 🎰 Roulette table | $150 | | Bet your cash on a European wheel |
| 🏃 Hire a runner | $300 | ★3.5 | Carries fish from the pile to whichever counter is lowest (in stage 2, to the kitchen line) |
| 🥾 Snow boots | $500 | | Walk faster |
| 🛷 Sled window | $900 | ★3.8 | Opens a window in the east fence where snowmobiles buy fish in bulk, for half as much again |
| 🏃 Second runner | $1,200 | ★3.9, a runner | Another runner, at the first one's tile |
| 🥅 Ice net | $1,600 | ★4.0 | Hauls in fish nonstop |
| 🏃 Third runner | $3,500 | ★4.2, a second runner | A third runner. All three work side by side, and in stage 2 they all carry fish to the kitchen line |
| 🏯 Open Floe Sushi | $12,000 | all of the above | Stage 2: the restaurant with ten seats, a chef and two cooks, and a small patch of rice on the bottom terrace |

**Stage 2: Floe Sushi**

| Upgrade | Cost | Needs | Effect |
| --- | --- | --- | --- |
| 🌾 Rice terrace | $800 | | Plants the rest of the bottom terrace round the starting patch (18 clumps of rice in all) |
| 🔪 Second chef | $3,000 | ★3.6 | Another chef at the bar. Out from the start of stage 2, by the bar's east end |
| 🪑 More seats | $5,000 | ★3.8 | Eight more seats at the bar (18 in all) |
| 🧑‍🌾 Hire a farmer | $6,000 | ★3.9, 🌾 | Harvests the terraces onto a stack on the path |
| 🥡 Takeout kiosk | $8,000 | ★4.0 | Snowmobiles on the road buy boxes of sushi; the chefs pack them |
| 🧺 Rice porter | $12,000 | ★4.1, 🌾 | Carries rice from that stack, 12 bags at a time, in through the farm door to the kitchen line |
| 🌱 Second terrace | $18,000 | ★4.2, 🌾 | Plants the middle terrace |
| 🔪 Third chef | $25,000 | ★4.3, a second chef | A third chef at the bar. Out once there's a second chef |
| 🌱 Third terrace | $35,000 | ★4.4, second terrace | Plants the top terrace, by the hot spring |
| 🏮 Premium menu | $60,000 | ★4.5 | Everything sells for 60% more |

### Her house

Far out past the road, a path leaves the market (through the east fence in stage 1, and through a door in the restaurant's east wall in stage 2), crosses the road at a zebra crossing and ends at a little rose-coloured house with its windows lit. Stand in the 💔 circle in front of it and it starts to rain: the sky goes grey, you turn into the singer, Ofer Levy (navy cap, short grey beard, olive field jacket over a white T-shirt, gold chain and watch), face her window and cry, and his "מאוהב בגשם" (live at Caesarea, via YouTube) plays from the line "מול ביתך עומד בגשם נרטב". Walk away and the rain clears and the song fades out; come back and it starts again from the same line. The 🔊 button on the song's banner mutes it (it starts muted on iPhone and iPad, where web pages can't fade sound). It's there from the start, free.

🛴 **Korki's golden statue** ($10) is on offer from the start, outside the queue: a gold NAMI Klima One on a pedestal, in memory of Korki. Stand on its pad to read his story; stay a few seconds and his song ("Car Alarm (extended reprise)" by pat's soundhouse, via YouTube) fades in quietly, and fades out when you leave.

Market customers and diners order 1–3 and give up after 40 seconds of waiting (for diners, 40 seconds in total between plates). Snowmobiles wait 55 seconds.

### Saving

Progress saves automatically on the device, including your reviews and everything along the supply chain (the pile, the counters, the kitchen line, plates on the belt, workers' loads, the terraces' stack): every few seconds, whenever the page is hidden or closed, and after each upgrade. Cash, fish and rice that are mid-air are counted, as are diners' unpaid bills, so closing the tab at any moment loses nothing.

- **One tab at a time.** If the game is opened in a second tab, the older tab stops saving and says so, so it can't overwrite newer progress.
- **Updates don't reset progress.** Saves carry a format version and older saves are migrated on load, keeping cash, rating and upgrades. Saves from before the two stages stay in stage 1, except those that had both the old restaurant west of the dock and every market upgrade: they go straight to stage 2, keeping the restaurant's upgrades, with the old kitchen's fish and the counters' leftovers on the kitchen line and the cash at the register. Everyone else gets back what they spent on the old restaurant, its cash and its unsold plates. A save that can't be read is kept under `floe-market-backup` instead of being overwritten.
- **Storage that sticks.** The game asks the browser to keep its storage (`navigator.storage.persist()`). On iPhone, Safari clears website data after 7 days without a visit; adding the game to the Home Screen avoids that (note that the Home Screen app keeps its own separate save).
- **Restart** (top right) erases progress after a second, deliberate tap; a quick double-tap is ignored. Signed in, it starts the cloud save over too.

### Cloud saves

**Sign in with Google** (top right) and your game follows you to any device or browser, including the iPhone Home Screen app. Playing without signing in works exactly as before.

- **Syncing:** signed in, the game syncs with your account every 30 seconds and whenever the page is hidden. Open it on another device and you carry on where you left off. The page reloads once to load the newer game, and says "Loaded your game from the cloud".
- **Each sync** compares this device and the account with how they were at the last sync. If only one has moved on, it wins.
  - Both have progress the other hasn't seen? This happens the first time you sign in on a device that already has its own game, or after playing on two devices offline. The game asks which one to keep, showing each one's stage, cash, upgrades and when it was last played.
- **Offline:** the button says so, and the game keeps saving on the device until it can reach the cloud again.
- **Signing out** keeps the game on the device.
- **Saves are private:** each one is one Firestore document, `saves/{your account id}`, which only you can read or write (`firestore.rules`).
- **Download:** Firebase is a separate download (about 150 kB compressed). It's fetched a few seconds after the game starts, or straight away on a device that's signed in, so the sign-in window opens the moment you tap.

**Setting it up** (free Spark plan, no billing needed; the sign-in button stays hidden until this is done). Menu names are as of October 2026:

1. In the [Firebase console](https://console.firebase.google.com/), create a project. Google Analytics isn't needed.
2. **Security, Authentication, Sign-in method:** enable Google. It asks for a support email.
3. **Security, Authentication, Settings, Authorized domains:** add `chefcontrol.github.io` (GitHub Pages), and `localhost` to test with `npm run dev`. Projects created since April 2025 don't include `localhost` by default.
4. **Databases & Storage, Firestore:** create a database in the **Standard** edition (the one with the free quota), in production mode, in a location near your players. Then paste `firestore.rules` into its Rules tab and publish.
5. **Project Overview:** add a Web app (the `</>` icon), and copy its `apiKey`, `authDomain`, `projectId` and `appId` into `src/cloud.config.ts`. Firebase's docs say these can go in public code. Keep the API key limited to Firebase's APIs, which is how Firebase creates it; the security rules are what protect the saves.

The free quota (50,000 reads and 20,000 writes a day) covers about 150 hours of play a day. Each player online reads once and writes at most once every 30 seconds.

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

[docs/balance.md](docs/balance.md) sets out the principles the game is balanced by, stage by stage, the numbers that show when something is off, and where each upgrade stands.

`.github/workflows/deploy.yml` runs the tests on every pull request and push. On `main`, it builds and deploys to GitHub Pages only if they pass.

`overrides` in `package.json` lifts Firestore's `@grpc/grpc-js` (pinned to 1.9.x, which has known vulnerabilities) to a patched release. Only Firestore's Node.js build uses it, so the game in the browser is the same either way. Drop the override once `@firebase/firestore` depends on 1.13.6 or later.

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
| `src/looks.ts` | What each upgrade level looks like: price board, menu tags, headband, toques, and putting up the campaigns |
| `src/ads.ts` | The marketing campaigns, built for real (TV commercial, radio, lanterns, food critic, ...) and animated |
| `src/rating.ts` | Reviews and the market rating |
| `src/bubble.ts` | Order bubbles with patience rings, and mood faces |
| `src/restaurant.ts` | The sushi bar: kitchen line and cooks, chefs, the plate belt, diners, register |
| `src/rice.ts` | The starting rice patch, planting the terraces, the farmer and the rice porter |
| `src/player.ts` / `src/playerUpdate.ts` | Player entity / per-frame player logic |
| `src/runner.ts` | Runner AI, for all three runners |
| `src/pointers.ts` | Arrows at the edge of the screen pointing the way to new upgrade tiles |
| `src/unlocks.ts` | Upgrade tiles for both stages and the machines they build |
| `src/roulette.ts` / `src/casino.ts` | Roulette rules / the table and its betting panel |
| `src/korki.ts` | Korki's golden statue (a NAMI Klima One) and its memoir panel |
| `src/rain.ts` | Her house, the path to it, and the rain, tears and song in the circle out front |
| `src/singer.ts` | The singer's look, swapped onto the player in the rain |
| `src/youtube.ts` | Songs played through YouTube's embedded player: one API load, fades, mute buttons |
| `src/holder.ts` | Item stacks and arcing item flights |
| `src/pop.ts` | The pop-in animation for new things |
| `src/characters.ts` | People and sleds, walking |
| `src/decals.ts` | Deck markings (pads, drop zones, price tiles) |
| `src/items.ts` | Fish slice, rice, plate, box and bill meshes |
| `src/input.ts` | Virtual joystick and keyboard |
| `src/ui.ts` | HUD and stage chip (which folds the modifier list), toasts, tips, floating text, the stage-up banner and confetti, and sliding the view so an open panel never covers the player |
| `src/save.ts` | Per-device save/load, migration, autosave, one-tab-at-a-time guard |
| `src/cloud.ts` | Cloud saves: the sign-in button, syncing with the account, asking which game to keep |
| `src/firebase.ts` / `src/cloud.config.ts` | Cloud saves on Firebase (Google sign-in, Firestore), loaded on demand / the Firebase project's config |
| `src/wallet.ts` | Money |
| `src/errors.ts` | On-screen error reporting |
| `src/util.ts` | Math/random helpers |

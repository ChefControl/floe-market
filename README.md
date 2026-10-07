# Floe Market

A cozy 3D idle/tycoon game for the browser. Catch fish from the ice, chop them into steaks, stock your counters, and collect cash from hungry customers — then spend it to grow your market, and later open a conveyor-belt sushi restaurant next door.

## Play

Play it at https://chefcontrol.github.io/floe-market/, or run it locally:

```bash
npm install
npm run dev
```

- **Move:** drag anywhere (touch or mouse) for a virtual joystick, or use WASD / arrow keys
- **Fish:** stand on the 🎣 pad to hook fish; they get chopped into steaks automatically
- **Sell:** pick up steaks from the pile, drop them on a counter's 🥩 pad, and walk over the cash to collect it
- **Upgrade:** stand on a price tile to pay into it. Some tiles also need a star rating (see below)
- **Rating:** customers only wait so long. Each one leaves a 1–5★ review when they go, based on how long they waited; someone who gives up leaves 1★ and pays only for what they got. The rating in the HUD is the average of the last 20 reviews (a new market starts at ★3.0). A better rating also brings customers in faster: ×0.6 at ★1, ×1.4 at ★5
- **Gamble:** once the roulette table is built, stand on its 🎰 pad to bet on red/black, odd/even, 1–18/19–36 (pays ×2) or a single number (pays ×36)

## Unlocks

Two market upgrades are on offer at a time, in this order. A tile with a star requirement shows the rating it needs (🔒 ★3.5) instead of its price until your rating reaches it. Once reached, it stays open even if the rating drops later.

| Upgrade | Cost | Needs | Effect |
| --- | --- | --- | --- |
| 🎒 Bigger arms | $25 | | Carry 14 steaks at once |
| 🎯 Auto harpoon | $60 | | Catches fish while you're away |
| 🎰 Roulette table | $80 | | Bet your cash on a European wheel |
| 🏃 Hire a runner | $120 | ★3.5 | Carries steaks to your counters |
| 🥾 Snow boots | $150 | | Walk faster |
| 🛷 Sled window | $220 | ★3.8 | Snowmobiles buy in bulk at $6 a steak |
| 🕸️ Ice net | $320 | ★4.0 | Hauls in fish nonstop |
| 🛴 Korki's golden statue | $10 | | A gold NAMI Klima One on a pedestal, in memory of Korki. Stand on its pad to read his story; stay a few seconds and his song ("Car Alarm (extended reprise)" by pat's soundhouse, via YouTube) fades in quietly, and fades out when you leave. On offer from the start |

### Floe Sushi

Once every market upgrade is bought, a 🍣 tile by the west fence puts the sushi restaurant up for sale. Buying it opens a gate to a walkway and builds:

- **A conveyor and a lever.** A conveyor runs from the chopping block to the restaurant's kitchen. Stepping on one of the three pads beside the lever sends fresh steaks to 🥩 the market's pile, ⚖️ both sides (half each), or 🍣 the sushi kitchen. When one side is full, steaks go to the other. You can also carry steaks over and drop them on the kitchen's 🥩 pad yourself.
- **A conveyor-belt sushi bar.** The chef slices each steak into a plate of sushi and puts it on the belt circling the bar. Diners in top hats take a seat, pick plates off the belt as they pass, and leave once they've eaten their order (2–4 plates). They pay $12 a plate at the register by the walkway, where you collect the cash. They review the place like any customer, and give up after 30 seconds of waiting for plates.

| Upgrade | Cost | Needs | Effect |
| --- | --- | --- | --- |
| 🍣 Sushi restaurant | $1,200 | ★4.2 | Opens the restaurant: 6 seats, one chef, the conveyor and the lever |
| 🪑 More seats | $900 | ★4.3 | Four more seats round the ends of the bar |
| 🔪 Second chef | $1,500 | ★4.4 | Twice the sushi |
| 🏮 Premium menu | $2,500 | ★4.6 | New plates sell for $20 |

### Saving

Progress saves automatically on the device, including your reviews, the lever's position and everything in the restaurant: every few seconds, whenever the page is hidden or closed, and after each upgrade. Cash and steaks that are mid-air are counted, so closing the tab at any moment loses nothing.

- **One tab at a time.** If the game is opened in a second tab, the older tab stops saving and says so, so it can't overwrite newer progress.
- **Updates don't reset progress.** Saves carry a format version and older saves are migrated on load. A save that can't be read is kept under `floe-market-backup` instead of being overwritten.
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

`.github/workflows/deploy.yml` runs the tests on every pull request and push. On `main`, it builds and deploys to GitHub Pages only if they pass.

### Tests

[Vitest](https://vitest.dev/) in jsdom. `test/setup.ts` stubs the two things jsdom lacks (the WebGL renderer and 2D canvas drawing) and seeds `Math.random`; everything else, three.js included, runs for real. `loadGame()` in `test/helpers.ts` loads a fresh copy of the whole game, optionally from a save, and steps it with `tick()`, so most tests read as "set up a situation, run a few seconds, check the outcome".

### Source layout

| File | Contents |
| --- | --- |
| `src/main.ts` | Entry point: boot, restart button, camera and render loop |
| `src/game.ts` | `tick()`: one simulation step for the whole world |
| `src/render.ts` | Renderer, scene, camera, lights, shared materials/geometry, canvas helpers |
| `src/world.ts` | Static scenery: water, deck, fences, road, trees |
| `src/stations.ts` | Fishing pad, chopping block, steak pile |
| `src/fishing.ts` | Fish, hooking, chopping into steaks |
| `src/counters.ts` | Sales counters and customers (patience, reviews) |
| `src/rating.ts` | Reviews and the market rating |
| `src/bubble.ts` | Order bubbles with patience rings, and mood faces |
| `src/conveyor.ts` | The lever and the conveyor to the sushi kitchen |
| `src/restaurant.ts` | Floe Sushi: building, chefs, the plate belt, diners |
| `src/player.ts` / `src/playerUpdate.ts` | Player entity / per-frame player logic |
| `src/runner.ts` | Hired helper AI |
| `src/unlocks.ts` | Upgrade tiles and the machines they build |
| `src/roulette.ts` / `src/casino.ts` | Roulette rules / the table and its betting panel |
| `src/korki.ts` | Korki's golden statue (a NAMI Klima One) and its memoir panel |
| `src/holder.ts` | Item stacks and arcing item flights |
| `src/characters.ts` | People and sleds, walking |
| `src/decals.ts` | Deck markings (pads, drop zones, price tiles) |
| `src/items.ts` | Steak and bill meshes |
| `src/input.ts` | Virtual joystick and keyboard |
| `src/ui.ts` | HUD, toasts, tips, floating text |
| `src/save.ts` | Per-device save/load, migration, autosave, one-tab-at-a-time guard |
| `src/wallet.ts` | Money |
| `src/errors.ts` | On-screen error reporting |
| `src/util.ts` | Math/random helpers |

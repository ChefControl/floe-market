# Floe Market

A cozy 3D idle/tycoon game for the browser. Catch fish from the ice, chop them into steaks, stock your counters, and collect cash from hungry customers — then spend it to grow your market.

## Play

Play it at https://chefcontrol.github.io/floe-market/, or run it locally:

```bash
npm install
npm run dev
```

- **Move:** drag anywhere (touch or mouse) for a virtual joystick, or use WASD / arrow keys
- **Fish:** stand on the 🎣 pad to hook fish; they get chopped into steaks automatically
- **Sell:** pick up steaks from the pile, drop them on a counter's 🥩 pad, and walk over the cash to collect it
- **Upgrade:** stand on a price tile to pay into it
- **Gamble:** once the roulette table is built, stand on its 🎰 pad to bet on red/black, odd/even, 1–18/19–36 (pays ×2) or a single number (pays ×36)

## Unlocks

| Upgrade | Cost | Effect |
| --- | --- | --- |
| 🎒 Bigger arms | $25 | Carry 14 steaks at once |
| 🎯 Auto harpoon | $60 | Catches fish while you're away |
| 🎰 Roulette table | $80 | Bet your cash on a European wheel |
| 🏃 Hire a runner | $120 | Carries steaks to your counters |
| 🥾 Snow boots | $150 | Walk faster |
| 🛷 Sled window | $220 | Snowmobiles buy in bulk at $6 a steak |
| 🕸️ Ice net | $320 | Hauls in fish nonstop |
| 🛴 Korki's golden statue | $10 | A gold NAMI Klima One on a pedestal, in memory of Korki. Stand on its pad to read his story. On offer from the start |

### Saving

Progress saves automatically on the device: every few seconds, whenever the page is hidden or closed, and after each upgrade. Cash and steaks that are mid-air are counted, so closing the tab at any moment loses nothing.

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
| `src/counters.ts` | Sales counters and customers |
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

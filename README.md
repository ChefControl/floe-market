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

## Unlocks

| Upgrade | Cost | Effect |
| --- | --- | --- |
| 🎒 Bigger arms | $25 | Carry 14 steaks at once |
| 🎯 Auto harpoon | $60 | Catches fish while you're away |
| 🏃 Hire a runner | $120 | Carries steaks to your counters |
| 🥾 Snow boots | $150 | Walk faster |
| 🛷 Sled window | $220 | Snowmobiles buy in bulk at $6 a steak |
| 🕸️ Ice net | $320 | Hauls in fish nonstop |

Progress saves automatically to `localStorage`. Use the **Restart** button (tap twice) to wipe it.

## Development

TypeScript + [three.js r128](https://threejs.org/), bundled with [Vite](https://vite.dev/). All textures are drawn at runtime on canvas; the Baloo 2 font comes from Google Fonts.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run typecheck` | Type-check only |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |

Pushes to `main` are built and deployed to GitHub Pages by `.github/workflows/deploy.yml`.

### Source layout

| File | Contents |
| --- | --- |
| `src/main.ts` | Entry point: save/restart wiring and the frame loop |
| `src/render.ts` | Renderer, scene, camera, lights, shared materials/geometry, canvas helpers |
| `src/world.ts` | Static scenery: water, deck, fences, road, trees |
| `src/stations.ts` | Fishing pad, chopping block, steak pile |
| `src/fishing.ts` | Fish, hooking, chopping into steaks |
| `src/counters.ts` | Sales counters and customers |
| `src/player.ts` / `src/playerUpdate.ts` | Player entity / per-frame player logic |
| `src/runner.ts` | Hired helper AI |
| `src/unlocks.ts` | Upgrade tiles and the machines they build |
| `src/holder.ts` | Item stacks and arcing item flights |
| `src/characters.ts` | People and sleds, walking |
| `src/decals.ts` | Deck markings (pads, drop zones, price tiles) |
| `src/items.ts` | Steak and bill meshes |
| `src/input.ts` | Virtual joystick and keyboard |
| `src/ui.ts` | HUD, toasts, tips, floating text |
| `src/save.ts` | localStorage save/load |
| `src/wallet.ts` | Money |
| `src/errors.ts` | On-screen error reporting |
| `src/util.ts` | Math/random helpers |

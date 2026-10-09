# Floe Market

A cozy 3D idle/tycoon game for phones and computers: TypeScript, three.js and Vite, no game engine. README.md is the spec: it says what every feature does, in players' terms, and lists every source file. docs/balance.md sets out how the economy is tuned.

## Working on it

- `npm test` runs the unit tests with coverage. CI fails below the thresholds in `vite.config.ts`, so new code comes with tests. `npm run typecheck` checks types.
- Every change that players can notice updates README.md in the same pull request, in the same plain, concrete voice. A new source file gets a row in its Source layout table.
- After changing prices, speeds or capacities, run the balance bot (the command is in README's Development section) and compare with docs/balance.md.
- Pull requests are squash-merged with a title saying what players get ("Drivers boop you off the road, …") and a body in prose that explains the change and its numbers.

## How the code is written

- **Systems with an update function.** Each system exports `updX(dt)`, and `tick()` in `src/game.ts` calls them in a fixed order. Everything moves by `dt`. `tick()` never touches the camera or the renderer, so tests and the bot can run the game without a screen; keep it that way.
- **A header on every module.** It says in plain English what the module is for. Comments explain why, including the game-balance reasoning. Exports get a one-line doc comment.
- **Constants** go in capitals near the top of the file. A place in the world is an exported `{ x, z }`. Import a spot from the module that owns it; don't retype its coordinates in another file.
- **Short names** are fine when they follow the existing pattern: `g` (a character's 3D group), `h` (heading), `t` (a cooldown), `k` (a 0–1 amount).
- **Randomness.** `Math.random` is the game's luck: orders, fish and customers. Anything cosmetic (looks, rain, presents, sound, music) uses its own generator, so it never shifts the game's luck. `test/sound.test.ts` enforces this for sound.
- **Storage.** Every `localStorage` or `sessionStorage` call sits in a try/catch, so a private window or full storage never breaks the game. The save and cloud links go through `deviceStore` in `src/save.ts`.
- **Text shown to players** uses `textContent`, never `innerHTML`.
- **Draw calls.** Static pieces are merged with `bake`/`bakePainted` in `src/render.ts`, and people share baked meshes. Don't add many small meshes when one baked mesh would do.
- **Sound.** The user hears and dislikes clicks, pops and shrill ticks. Gains start at 0 and ramp up (attacks of at least 8 ms), music stays under about 4 kHz, and every pitched effect is on the major pentatonic of the music's key. Render any new sound offline and scan it for clicks before shipping.

## Co-op

Two players can play one game (README's "Playing together"). The host's phone runs the game; ten times a second it sends a guest's phone what changed in the 3D scene (`src/mirror.ts`) plus the numbers behind the HUD and panels (`world()` in `src/coop.ts`), over Firebase's Realtime Database (`database.rules.json` holds its rules; they're published by hand in the Firebase console). New code has to keep that working:

- **Build the same scene on every phone.** Everything built while the modules load is named by its three.js id (`src/boot.ts`), so module-level code must build the same objects in the same order on every device: no branching on device, screen size or storage at load time.
- **Mark what each phone keeps for itself.** Something that follows this phone's player or camera (weather, the roof fading, a per-player effect) gets `userData.net = 'local'`; a material or canvas texture each phone draws from game state gets `userData.local = true`; a group that animates itself on each phone gets `userData.net = 'self'`.
- **Things both players should notice go through `coop.relay`** (`src/remote.ts`): new sounds out in the world are made with `shared()` in `src/sfx.ts`, and `toast`, `popText`, `banner` and `confetti` relay themselves. A player's own sounds go through `sound(p, …)` in `src/playerUpdate.ts`.
- **New state the guest's phone needs** (for the HUD, a panel, or where it can walk) goes in `world()` and `see()` in `src/coop.ts`. Anything that spends money goes through the host: on a guest's phone, call `coop.ask` instead.
- `test/coop.test.ts` plays a host and a guest in one process; add a case there for anything new a guest can do.

## Where the design is going

The older code is being moved toward these rules; new code should follow them:

- **Don't add new uses of the `player` singleton.** Pass the player who's acting into the function instead.
- **Keep game state off three.js objects.** Store it in plain fields and flags, not in `userData` or in whether a mesh is visible.
- **Ask `stage.n` which stage it is.** Add per-stage differences to a table rather than another `if` in general code.
- **Change money through one function per action** (buy, pay, bet), not directly from the UI.

## Tests

Vitest in jsdom. `loadGame()` in `test/helpers.ts` loads a fresh copy of the whole game, optionally from a save, and `run`/`runUntil` step it with `tick()`. Write tests as "set up a situation, run a few seconds of game time, check the outcome". `Math.random` is seeded before every test, so a test plays out the same way every time. A new random call can still change the outcome of other tests, so prefer conditions (`runUntil`) to exact counts.

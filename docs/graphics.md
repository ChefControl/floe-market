# Graphics: how the game is drawn, and how to add to it

What to know before drawing anything new, changing how something looks, or adding a graphics mode or setting. It covers the Graphics setting and its menu row, how High and Low versions are built, the rules that keep the game's luck and look intact, what keeps it fast on phones, and how to check your work.

The graphics were reworked in #37 (the people) and #39 (everything else). The rules below come from what went wrong along the way.

## The Graphics setting

The player picks **Auto**, **Low** or **High** in the ✨ row of the settings.

- **High** draws the world the way the people are drawn: low poly but rounded, with small details, a rolling sea, cloud shadows, seasonal snow, petals and leaves, and the effects.
- **Low** draws everything exactly as it was before the rework, with a lighter renderer (a half-size shadow map with hard edges, at most 1.5 pixels a point). It's for phones that can't keep up.
- **Auto**, the default, starts each visit on High and drops to Low for the rest of the visit if the frame rate stays under 45 for six seconds. It never switches back up by itself.

The choice is kept on the device (`localStorage` key `floe-market-graphics`), never in the save or the cloud.

### The code

| Where | What |
|---|---|
| `src/graphics.ts` | The state: `gfx.quality` (`'low'` or `'high'`), `gfx.picked`, `isHigh()`, `onQuality(f)`, `choose(c)`, and Auto's watch, `frameDrawn(sec)`, called by main.ts each frame |
| `index.html` | The ✨ category in the settings' Graphics & sound group: the `#gfxCat` row (its name, the current choice in `#gfxPick` and a chevron) opens `<div id="gfx">` under it, with one `<button data-q="…">` per choice and `#gfxNow` under them ("Auto is on High now" or "Auto is on Low now" while on Auto). Its styles are under `#gfx` in the same file |
| `src/settings.ts` | Wires it: `category` opens and closes the panel with a click, like Sound; each button calls `choose(button.dataset.q)`; and `showGfx` (run on every `onQuality`) presses the right button and fills in `#gfxPick` and `#gfxNow` |
| `src/render.ts` | `fitRenderer()`: the shadow map size and softness and the pixel ratio for each setting, run again on every change |
| `src/demo.ts` | The demo build's 🛠 panel has its own Low/High buttons, which call `choose` |

### Reacting to the setting

Anything that looks different on Low and High reads `isHigh()` when it's built and listens with `onQuality(f)` for changes. Most things don't call these directly; they use `detail` (below). Changing the setting never rebuilds anything: both versions are built up front and one of them is hidden. The switch is instant, at the cost of building both.

### Adding a level (say, Medium)

`Quality` is a pair today, and nearly 30 files ask a yes-or-no question of it (`isHigh()`, `onQuality`, `detail`). Before adding a level:

1. Find every consumer: `grep -rn "isHigh\|onQuality\|detail(\|detailMarked\|userData.gfx" src`. Decide for each what the new level shows. A level in between usually means some things take High's look and others Low's, so a yes/no question won't do for everything. Add a small helper in graphics.ts (for example `atLeast('medium')`) rather than comparing strings all over.
2. Add it to `Quality`, to the line that reads the saved choice, and to `choose`.
3. Add a `<button data-q="medium">` to the row in index.html, between Low and High. settings.ts picks it up without changes, but `showGfx`'s `#gfxPick` and "Auto is on … now" texts need the new name.
4. Decide what Auto does with it. Today it only drops from High to Low (`setQuality('low')` in `frameDrawn`).
5. Give it renderer settings in `fitRenderer`.
6. Add it to the demo panel's Graphics row (demo.ts).
7. Test it in `test/graphics.test.ts` (the choice, Auto) and `test/eyecandy.test.ts` (what shows).

### Adding a separate graphics setting (say, an Effects switch)

Copy the Graphics row's pattern rather than folding it into Quality:

- **Its own module** with its state, a `localStorage` key, a getter and an `onX(f)` listener list.
- **A row in index.html**, in the settings' Graphics & sound group: a switch inside the Graphics panel (`#gfx`), or a category of its own (`class="cat"` row and `class="catPanel"` panel, opened by settings.ts's `category`), like Graphics and Sound.
- **The wiring in settings.ts:** a click handler calling your module, and a `show` function that runs on your listener.
- **Device only:** keep it on the device, out of the save (save.ts), like the Graphics choice.
- **A test** for the choice being kept and for what it turns on and off.

## Building something with a High and a Low version

### The rules

1. **Low is the old version, exactly.** Don't change Low's shapes, colours, textures or layout. Small props keep their exact old version on Low. Water, sky and effects fall back to the old ones on Low. Big new buildings keep their new shape on Low minus the extras. New things that never had a Low version get a plain one in Low's style (boxes and cylinders in flat colours).
2. **Keep the layout when adding detail.** High adds detail on top of Low's pattern; it doesn't redesign it. When the deck got real boards, they first went in at random, and that was rejected. The boards now follow the old painted texture exactly: same rows, same joints, same alternating shades. No random variation where Low had a pattern.
3. **Never touch the game's luck** (below).
4. **Keep it phone-friendly** (below).

### The game's luck

three.js gives every object, geometry and material an id drawn with `Math.random`, and `Math.random` is the game's luck: the orders, the fish, the customers. Creating one extra mesh shifts every order after it. So:

- **Low objects are created in the same order and number as before.** Don't add, remove or reorder anything created outside `quietly`.
- **Everything new is created inside `quietly(() => …)`** (kit.ts), which swaps `Math.random` for the scenery's own dice while it runs. The per-file helpers below do this for you.
- **For random variation, use `jitter(a, b)`**, which draws from the scenery's dice, never `Math.random`.
- **Code creating its own objects outside the scenery's flow** can pass its own dice: `quietly(f, dice(seed))`. That's how sea.ts makes the foam rings' mesh without shifting the scenery.
- **The scenery's dice have to stay in step too.** If you change how many objects are created inside `quietly` (merging two meshes into one, say), everything built after it gets different `jitter` values, and trees, rocks and floes change shape. Either keep the count (sea.ts's `foamRing` and kit.ts's `seasonLayer` burn the four draws their old objects took), or move the new objects to their own dice.

`test/eyecandy.test.ts` checks that the luck comes out the same whichever setting a device starts on. Run it after any change.

### The tools (src/kit.ts)

- **`Build`**: collect shapes with `add(geo, colour, x, y, z, rot?, scale?)` and `addAll(otherBuild, matrix)`, then `mesh(cast = true, material = painted)` bakes them all into one mesh.
- **`pack(pieces)`**: what `mesh` uses. It merges the pieces into one small geometry: no texture coordinates, and a byte per normal and colour channel (18 bytes a vertex instead of 44). It's drawn with render.ts's `painted` material, which shades each vertex colour exactly like `mat(colour)` would, because colour management is off (render.ts). So any number of colours bake into one mesh and one draw call.
- **Shapes:**
  - `rbox(w, h, d, r)` is a bevelled box, 44 triangles, shared by size.
  - `tube(top, bottom, h, sides = 8, open)` is a tapering post or log.
  - `K` holds unit shapes to scale: `K.ball` (7×5), `K.dot` (6×4, for small things), `K.dome`, `K.post` and `K.ring`.
  - Reuse these rather than making new geometry each time.
- **Placing:** `at(x, y, z, ry)` gives a matrix for `addAll`.
- **Colours:** `shade(c, k)` darkens or lightens; `mix(c, to, k)` blends.
- **Low and High:** `detail(low, high)` shows one or the other, now and on every change. Either may be `null`.
- **Seasons:** `seasonLayer(mesh, swatch)` fades a mesh in and out with the seasons. A swatch is `[winter, spring, summer, autumn]`: `[1, 0, 0, 0]` is snow, `[0, 1, 0, 0]` petals, `[0, 0, 0, 1]` fallen leaves. Layers with the same material and swatch share one material, so they merge.
- **Colour names:** `src/palette.ts` (`C`) names the colours that recur.

High props live in `src/props*.ts`, one file per area: `props.ts` (the dock), `propsWorld.ts`, `propsHall.ts`, `propsKitchen.ts`, `propsFarm.ts`, `propsMachines.ts` and `propsAds.ts`. Each function returns a `Build`, built about its own origin; the scene file places it.

### Wiring the two versions into a scene

Each scene file has a small helper that builds High off the game's luck and calls `detail`. Use the one in the file you're in:

| File | Helper | Use |
|---|---|---|
| world.ts | `high(to, build, low?)` | Adds `build()`'s High version to `to`, with `low` shown on Low |
| hall.ts | `hiLo(group, build, keep?, wrap?)` | Moves what's already in a piece into a Low group and adds `build()`'s High beside it. `keep` is for things both show |
| ads.ts | `highIn(to, low, build)`, `lowIn(to)` | The same, for campaigns |
| propsMachines.ts | `detailMarked(low, high)` | For things made over and over (the drive-up sleds): marks them instead of adding a listener each, so old ones aren't kept alive |
| items.ts | `looks(mesh, low, high)` | For items that come and go by the hundred: one mesh that swaps its geometry and material when drawn, rather than two meshes each |
| casinoKit.ts | `both(g, draw)`, `highOnly(g)`, `offLuck(f)` | For the casino boat, made when it's bought: `draw(pen)` runs once per setting, so both have the same layout. A `Pen`'s `box`/`cyl`/`rod` are plain boxes and cylinders on Low and the kit's shapes on High; extras go under `if (pen.high)`. Everything on the boat is made inside `offLuck`, on the boat's own dice |

Wrap the High and Low versions in groups under the thing's own group, so pop-ins and scaling still happen about the same centre.

A typical High prop:

```ts
// in a props file
export function crate(w: number) {
  const b = new Build();
  b.add(rbox(w, 0.4, 0.5, 0.03), C.plank, 0, 0.2, 0);
  for (const s of [-1, 1]) b.add(rbox(0.04, 0.42, 0.52, 0.01), shade(C.plank, 0.8), s * (w / 2 - 0.1), 0.2, 0);
  return b;
}

// in the scene file, next to the Low version that was already there
const low = mesh(new BoxGeometry(w, 0.4, 0.5), 0x9C6644, x, FY + 0.2, z, true);
scene.add(low);
high(scene, () => { const m = crate(w).mesh(); m.position.set(x, FY, z); return m; }, low);
```

### Effects

The effects (src/fx.ts) show on High only and are visual only: they never change the game. Each kind is one `InstancedMesh` pool, named `'fx'`, made up front. Nothing is created while playing, and an empty pool isn't drawn. To add a kind, add a pool to `P` with a gravity, drag and `sizeAt(k)` curve, and a function that `emit`s into it. Check `on()` (High) before emitting. Each new effect is shown to the owner for review (a clip they can watch on their phone), and kept, changed or dropped on their word.

### Not in scope of the rework

The DOM interface (the HUD, menus, toasts) isn't drawn in three.js and isn't part of High or Low. Emoji drawn into the 3D world are vector icons (src/icons.ts, `drawIcon`), on both settings, so they look the same on every phone.

## Keeping it fast on phones

The bar: an iPhone 16 holds 55–60 fps on High in the busiest scene (inside the stage 2 hall), and Auto never drops to Low there. On a CPU slowed 4× (an older phone), both settings hold 60 fps today. Don't let a change undo that.

### What costs what

- **Objects, more than triangles.** Every frame, three.js walks every visible object, tests it against the view and sets up its state, twice if it casts a shadow. So 500 small meshes cost far more CPU than one mesh with the same triangles. Bake with `Build`. Never add a separate mesh per board, tile or post.
- **Triangles** cost the phone's graphics chip. The hall on High is about 575k triangles a frame, the shadow pass included. Use the kit's shapes at their sizes. Don't raise segment counts: a ball is 7×5 and a small one is `K.dot`. Leave out detail that's smaller than a few centimetres.
- **Shadows** draw a second time everything that casts. `mesh(false)` for flat or thin things (boards, snow layers, decals, foam). A mesh baked with `cast` carries a plainer copy of itself that only the shadow pass draws: boxes without bevels, round things with fewer sides, anything under 7 cm left out. You get this for free from `Build.mesh()` and `baked()`. Don't set `castShadow` on a baked mesh by hand.

### Merging what stands still (src/batch.ts)

Whatever has stood still for a second is drawn merged with its neighbours: one mesh per material in each 12 m patch of the map, with all the plain colours (`mat(c)`) as one, painted on. Anything that moves, hides, changes material or is taken away drops out at once and is drawn by itself again. Something seen to move waits 20 s before it's merged again, and something that keeps moving is left out. This works on both settings without anything to call. To get the most from it:

- **Static things should stay still:** don't set their position, rotation or scale each frame, or touch their geometry. Animate only what moves.
- **Share materials:** use `mat(colour)` (cached by colour) or a shared constant, not a `new MeshLambertMaterial` per mesh, so things can merge.
- **Things the merging leaves alone:**
  - transparent materials;
  - `ShaderMaterial` and any material with `onBeforeCompile` (its shader may use the mesh's own coordinates, like the sea);
  - meshes with an `onBeforeRender`, a `renderOrder`, `frustumCulled = false`, several materials, morph targets or a draw range;
  - instanced and skinned meshes;
  - anything under an object with `userData.noBatch = true`, as people have.

  Use `noBatch` for anything that moves all the time.
- **Lots of moving copies:** use one `InstancedMesh` instead, as the effects and the foam rings (sea.ts) do.

### Hidden things aren't placed

Each frame, the scene only works out world positions for what's showing (render.ts `place`), not for the hidden copies of the other setting. A hidden object's `matrixWorld` can be out of date. If you need where something hidden is, call `o.updateWorldMatrix(true, false)` first, or use `getWorldPosition`, which does that itself.

## Checking your work

- **Tests:** `npm test`. Graphics tests are in `test/eyecandy.test.ts` and `test/graphics.test.ts`. They cover:
  - Low drawing nothing new;
  - the luck staying the same;
  - the sea, the renderer and the effect pools;
  - the kit;
  - the merging.

  Add to them for anything new. Tests load the game with a stub renderer, so they check structure, not pixels. Loading builds both settings, so the timeout is 15 s (vite.config.ts).
- **Look at it on both settings, in winter and summer, on a phone-sized and a desktop-sized screen.** Force a setting with `localStorage.setItem('floe-market-graphics', 'high')` before the game loads; otherwise Auto may drop to Low in a slow headless browser. Make sure Low looks exactly as it did on main.
- **The demo build:** `npx vite build --mode demo` adds a 🛠 panel with:
  - the frame rate, draw calls and triangles;
  - Low/High buttons and any season;
  - each effect;
  - jumps into a ready stage 1 or stage 2 game.

  It's the one to try on a real phone. The panel is loaded only in that mode (main.ts), never in the game itself.
- **Measure the cost.** Measure in the stage 2 hall at iPhone size (393×852), on both settings, after 20 s of customers:
  - draw calls and triangles from `renderer.info`, which count both the main and the shadow pass;
  - frame-time percentiles (p90, p95, p99) at full speed and with the CPU slowed 4× (Chrome DevTools' CPU throttling).

  Measure with the machine otherwise idle. Load on the machine distorts slowed-CPU numbers badly.
- **Show the owner.** They review on their phone: before and after pictures of each place, Low and High, winter and summer, phone and desktop, on a page they can open there, and clips of anything that moves.

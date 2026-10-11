---
name: graphics
description: Use before drawing or changing anything in Floe Market's 3D world (props, scenery, buildings, effects, the sea, seasonal layers), building a High or Low version of something, adding a graphics mode or level, or adding a graphics-related row to the settings menu. Covers the Graphics setting and its ✨ menu row, the High/Low rules, keeping the game's luck intact, staying fast on phones, and how to check the work.
---

# Floe Market graphics

Read `docs/graphics.md` in full before you start. It's the guide; this skill is the short version and the checklist.

## The five things that break most often

1. **Low must look exactly as before.** Don't change Low's shapes, colours, textures, layout, or the order and number of objects it creates. High adds detail on top of Low's pattern; it never redesigns it (no random variation where Low had a pattern).
2. **The game's luck.** three.js draws every object's id from `Math.random`, which is the game's luck. Create everything new inside `quietly(() => …)` (src/kit.ts), and use `jitter(a, b)` for randomness, never `Math.random`. Changing how many objects are made inside `quietly` changes the scenery's look after it: keep the count or use `quietly(f, dice(seed))`.
3. **Bake, don't add meshes.** Build props with `Build` (`add`, `addAll`, then `.mesh(cast)`) from the kit's shapes (`rbox`, `tube`, `K.ball`, `K.dot`…). One mesh per prop or area, never one per board or post. `mesh(false)` for flat and thin things.
4. **Let still things merge** (src/batch.ts): share materials (`mat(colour)`), don't move static things each frame, and use `userData.noBatch` for things that always move. Transparent materials, custom shaders, `onBeforeRender` and `renderOrder` aren't merged.
5. **Wire both versions with the file's helper:**
   - world.ts `high`, hall.ts `hiLo`, ads.ts `highIn`;
   - `detailMarked` for things made over and over;
   - items.ts `looks` for items;
   - otherwise kit.ts `detail(low, high)`.

## The Graphics setting and its menu row

- **State:** src/graphics.ts, with `isHigh()`, `onQuality(f)` and `choose(c)`. The choice is kept on the device under `floe-market-graphics`, never in the save.
- **Menu row:** index.html `#gfx`, one `<button data-q="…">` per choice; settings.ts wires it in `showGfx`.
- **Renderer settings per level:** render.ts `fitRenderer`.
- **Demo panel:** src/demo.ts.

A new level or a new graphics row touches all of these. The steps are in the guide.

## Before you call it done

- [ ] `npm test` passes, including `test/eyecandy.test.ts`'s luck and Low checks; new behaviour has tests.
- [ ] Looked at on Low and on High (force one with `localStorage.setItem('floe-market-graphics', 'high')`), winter and summer, phone and desktop size. Low matches main.
- [ ] Measured in the stage 2 hall at 393×852 after 20 s of play: draw calls and triangles (`renderer.info`), and frame-time p90/p95/p99, with the CPU at full speed and slowed 4×. High still holds 60 fps there.
- [ ] The owner has seen it on their phone (before and after pictures, clips of anything that moves) before it ships.

// Stage 3, Fight Night: Mr. Fugu's sumo ring in the cellar under the dock. Buying in, the ladder, the rooms (and the
// grow room behind the prep hall's wall), and the kitchen worked by hand (the dumbwaiter's bins, the racks and barrels,
// the pot, the counter, the soup bar). The rest of stage 3 is in stage3Gong, stage3Tiles and stage3Arena.test.ts.
import { BufferGeometry, ExtrudeGeometry, ShapeGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { bought, loadGame, RING_DONE } from './helpers';
import { $, offered, ring, SUSHI } from './stage3Ring';

describe('buying into the ring', () => {
  it('the gold tile by the hatch takes the player down to the cellar, with a show', async () => {
    // (with fish and rice from upstairs in the player's arms)
    const g = await loadGame({ tiles: bought(...SUSHI), fugu: 2, money: 1_100_000, back: 3, backRice: 2 });
    const [cellar, fight, layout] = [await import('../src/cellar'), await import('../src/fight'), g.layout];
    const carried = g.player.back.all();
    expect(carried).toHaveLength(5);
    const gold = g.unlocks.tiles.find(t => t.id === 'dohyo')!;
    expect(g.unlocks.visibleTiles()).toContain(gold);
    g.placePlayer(gold.x, gold.z);
    g.press('e');
    g.runUntil(() => layout.stage.n === 3, 10);
    g.press('e', 'keyup');
    // what stage 2 made stays upstairs in the restaurant's till: the cellar starts from no chips
    expect(g.wallet.money).toBe(0);
    expect((await import('../src/front')).front.till).toBe(1_100_000 - gold.cost);
    expect($('banner').textContent).toBe('Stage 2 completeFloe Sushi');
    expect(g.player.held).toBe(true);
    expect(offered(g)).toEqual([]); // the cellar's tiles wait for the show
    g.run(1.8);
    // dark, and down the hatch
    expect($('fade').classList.contains('on')).toBe(true);
    expect(layout.level.down).toBe(true);
    expect(g.player.g.position.y).toBe(cellar.CY);
    // the cellar starts with empty hands: what they carried went back up on the dock (the pile and the rice stack)
    expect(g.player.back.n).toBe(0);
    expect(carried.every(m => m.parent && m.position.y > cellar.CY + 10)).toBe(true);
    expect(cellar.cellar.visible).toBe(true);
    expect(g.hall.lamps.every(l => !l.visible)).toBe(true);
    // every light's in place from the start (no recompile mid-bout), the grow room's dark: it hasn't been found
    expect(cellar.lights.every(l => l.visible)).toBe(true);
    expect(cellar.lights[7].intensity).toBe(0);
    g.run(1);
    expect($('banner').textContent).toBe('Stage 3The Dohyo Below');
    g.run(3.5);
    expect(g.player.held).toBe(false);
    expect(g.stage.staging()).toBe(false);
    // a fresh cellar: a rack and a barrel, nothing on the ledge
    expect(fight.F.lines.rice.n).toBe(1);
    expect(fight.F.lines.fish.n).toBe(1);
    expect(fight.F.lines.mush.n).toBe(0);
    expect(fight.F.beaten).toBe(0);
    // the doors shut till the first soup's out, and a practice fight before the first boss (the cellar's tutorial)
    expect(fight.F.quiet).toBe(true);
    expect(fight.F.practice).toBe(true);
    expect(fight.nextBoss()).toBe(fight.PRACTICE);
    // the HUD: bosses beaten on the stage chip, 💪 in the season's place, and the wallet in chips
    g.ui.hud(0);
    expect($('stageName').textContent).toBe('The Dohyo Below');
    expect($('stageCount').textContent).toBe('0/5');
    expect($('power').hidden).toBe(false);
    expect($('season').hidden).toBe(true);
    expect($('cash').classList.contains('chips')).toBe(true);
    expect($('cash').textContent).toBe('🐡0');
    // (the two lines' hands wait for the practice fight: its prize hires them)
    expect(offered(g).sort()).toEqual(['barrel', 'rack']);
  });

  it("however much stage 2 made, it waits in the till: it doesn't buy the cellar, and it's saved", async () => {
    const g = await loadGame({ tiles: bought(...SUSHI), fugu: 2, money: 500_000_000 });
    const gold = g.unlocks.tiles.find(t => t.id === 'dohyo')!;
    g.placePlayer(gold.x, gold.z);
    g.press('e');
    g.runUntil(() => g.layout.stage.n === 3, 60);
    g.press('e', 'keyup');
    g.run(6);
    const { front } = await import('../src/front');
    expect(g.wallet.money).toBe(0);
    expect(front.till).toBe(500_000_000 - gold.cost);
    g.saveMod.save();
    const g2 = await loadGame(localStorage.getItem('floe-market-v1')!);
    expect(g2.wallet.money).toBe(0);
    expect((await import('../src/front')).front.till).toBe(500_000_000 - gold.cost);
  // (a stage 2 and a stage 3 game loaded: about 15 s on CI under coverage)
  }, 30_000);

  it('a stage 3 save from before the till keeps what the cellar can have paid it, and the rest goes in the till', async () => {
    // (two bosses beaten: the practice, Hakkaku and Yokobashiri paid 35 + 100 + 250 chips, and Dobu's 300 is next)
    const { front, F } = await ring({ money: 499_000_000, till: null, ring: { beaten: 2 } });
    expect(F().beaten).toBe(2);
    const keep = (35 + 100 + 250 + 300) * 1000;
    expect(front.front.till).toBe(499_000_000 - keep);
    expect((await import('../src/wallet')).wallet.money).toBe(keep);
  });

  it("a stage 3 save from before the till that's in the cellar's budget keeps its chips", async () => {
    const { front } = await ring({ money: 400_000, till: null, ring: { beaten: 2 } });
    expect(front.front.till).toBe(0);
    expect((await import('../src/wallet')).wallet.money).toBe(400_000);
  });

  it("the stage chip says when all five bosses are beaten, and the buyout and Mama's dining hall are what's new on offer", async () => {
    const { g } = await ring({ ring: RING_DONE });
    expect($('stageCount').textContent).toBe('Buyout ready');
    expect(offered(g).filter(id => !['rack', 'barrel', 'bed'].includes(id)).sort()).toEqual(['buyout', 'hall', 'shelves', 'smoke', 'steam']);
  });
});

describe('the ladder', () => {
  it("down in the cellar, the player's under the road: the drivers up top wait where they are, and don't stop for them", async () => {
    const { g, cellar } = await ring({ level: 0 });
    const { TAKEOUT } = g.counters, { HOUSE_PATH_Z } = await import('../src/layout'), { setLevel } = await import('../src/stage');
    for (let i = 0; i < 12; i++) TAKEOUT.stock.put(g.items.newBox(30, false));
    g.runUntil(() => TAKEOUT.queue[0]?.got > 0, 40);
    // (right under the road on a takeout driver's way home, where they'd be held up and get out to boop them; but up
    // top holds still while the player's down: game.ts)
    setLevel(true);
    const c = TAKEOUT.queue[0], at = c.g.position.clone();
    g.player.g.position.set(g.world.ROAD2_X, cellar.CY, HOUSE_PATH_Z + 0.4);
    g.run(10);
    expect(c.g.position.equals(at)).toBe(true);
    expect([c.held, g.player.booped]).toEqual([0, null]);
  });

  it("doesn't draw the world up top while the player's down in the cellar, and puts it all back after", async () => {
    const { g, cellar } = await ring({ level: 1 });
    const { hideAbove, leftOut } = await import('../src/levelCull');
    const { Box3 } = await import('three');
    const { scene } = g.render;
    const before = scene.children.map(o => o.visible);
    const show = hideAbove();
    const off = scene.children.filter((o, i) => before[i] && !o.visible);
    expect(off.length).toBe(leftOut());
    expect(off.length).toBeGreaterThan(100);
    // (only what's wholly up top: never the cellar, the player or the fans)
    for (const o of off) expect(new Box3().setFromObject(o).min.y).toBeGreaterThan(cellar.CY + 15);
    expect(off).not.toContain(g.player.g);
    show();
    expect(scene.children.map(o => o.visible)).toEqual(before);
    // (something that comes down shows straight away)
    const tray = off[0];
    const y = tray.position.y;
    tray.position.y = cellar.CY;
    hideAbove()();
    const again = hideAbove();
    expect(tray.visible).toBe(true);
    again();
    tray.position.y = y;
    // up on the dock, everything's drawn
    g.stage.setLevel(false);
    hideAbove()();
    expect(leftOut()).toBe(0);
  });

  it('climbs up through the hatch to the dock, and back down, with the light changing', async () => {
    // (with bowls, cured fish and raw rice in the player's arms)
    const { g, cellar, stage, F } = await ring({ level: 1, hands: { bowl: 2, cfish: 3, rice: 1 } });
    const { level } = g.layout;
    expect(level.down).toBe(true);
    expect(g.player.back.n).toBe(6);
    const [bowls, cured] = [F().counter.length, F().pantry.fish];
    expect(g.render.scene.background).toMatchObject({ r: cellar.CELLAR_SKY.bg.r });
    // (just down from a save, standing by the ladder: off it first, then on)
    g.run(0.1);
    g.player.g.position.set(cellar.LADDER_PAD.x, cellar.CY, cellar.LADDER_PAD.z);
    g.run(1.2);
    expect(level.down).toBe(false);
    expect(g.player.g.position.y).toBeGreaterThan(0);
    // what they carried stays below: bowls back on the counter, cured fish on the ledge, raw rice back in its bin
    expect(g.player.back.n).toBe(0);
    expect([F().counter.length, F().pantry.fish]).toEqual([bowls + 2, cured + 3]);
    expect(stage.view.zoom).toBe(stage.STAGE2_ZOOM);
    expect(g.hall.lamps.every(l => l.visible)).toBe(true);
    // up top, the wallet's in dollars and 💪 is put away
    g.ui.hud(0);
    expect($('cash').classList.contains('chips')).toBe(false);
    expect($('power').hidden).toBe(true);
    // standing on, it doesn't bounce straight back: step off and on again
    g.run(1);
    expect(level.down).toBe(false);
    g.placePlayer(g.layout.HATCH_AT.x + 2, g.layout.HATCH_AT.z);
    g.run(0.2);
    // ...and going down, what's carried up top stays there
    const { newFillet } = await import('../src/items');
    g.player.back.put(newFillet());
    g.placePlayer(g.layout.HATCH_AT.x, g.layout.HATCH_AT.z);
    g.run(1.2);
    expect(level.down).toBe(true);
    expect(g.player.back.n).toBe(0);
    expect(stage.view.zoom).toBe(stage.CELLAR_ZOOM);
    // it's hot down there: the player's in summer clothes, whatever the season up top
    const { setSeason, current } = await import('../src/season');
    /** Whether all the player has on is worn in `s`. */
    const dressedFor = (s: string) => g.player.g.worn().every(p => !p.seasons || p.seasons.includes(s as never));
    expect(dressedFor('summer')).toBe(true);
    // a season's turn doesn't bring the sky into the cellar, or change anyone's clothes down there
    g.saveMod.save();
    const wearing = g.player.g.worn();
    setSeason((['winter', 'spring', 'summer', 'fall'].indexOf(current()) + 2) % 4);
    g.run(7);
    expect(g.render.scene.background).toMatchObject({ r: cellar.CELLAR_SKY.bg.r });
    expect(g.player.g.worn()).toEqual(wearing);
    // ...until they're back up top
    g.player.g.position.set(cellar.LADDER_PAD.x, cellar.CY, cellar.LADDER_PAD.z);
    g.run(1.2);
    expect(level.down).toBe(false);
    expect(dressedFor(current())).toBe(true);
    if (current() !== 'summer') expect(g.player.g.worn()).not.toEqual(wearing);
  });

  it("keeps the world above out of the cellar: the fish pile, the restaurant's walls and the casino", async () => {
    const { g, cellar } = await ring({ pile: 6 });
    // right under the fish pile, nothing gets picked up
    const pile = g.stations.PILE;
    g.player.g.position.set(pile.x, cellar.CY, pile.z);
    g.run(1);
    expect(g.player.back.n).toBe(0);
    // and the kitchen line upstairs doesn't push anyone around down here
    g.player.g.position.set(0, cellar.CY, 2.6);
    g.run(0.1);
    expect(g.player.g.position.z).toBeCloseTo(2.6);
    // nor do the casino yacht's games open, under its tables
    const { GAMES } = await import('../src/layout');
    g.player.g.position.set(GAMES.roulette.x, cellar.CY, GAMES.roulette.z);
    g.run(0.1);
    for (const id of ['roulette', 'blackjack', 'slots']) expect($(id).hidden).toBe(true);
  });

  it("leaves the restaurant's staff up in the world, and brings no news of the seasons down", async () => {
    const { g, cellar } = await ring();
    // the farm's and the garden's people stand on the ground up there, wherever the player is
    expect(g.layout.groundY({ x: -14, z: 0 })).toBe(g.layout.TERRACES[0].top);
    expect(g.layout.groundY({ x: 0, z: 18 })).toBeGreaterThan(cellar.CY + 20);
    const s = await import('../src/season');
    g.run(s.SEASON_LEN + 0.1, 0.25);
    expect(s.current()).toBe('spring');
    expect($('toast').textContent).not.toContain('Spring');
  }, 30_000);
});

describe('the rooms', () => {
  it('keeps the arena, the hearth room, the prep hall and the office apart, through doorways', async () => {
    const { g, cellar, plan } = await ring();
    const L = g.layout, floorAt = (x: number, z: number) => { const q = { x, z }; L.keepOnFloor(q, L.walkable()); return Math.hypot(q.x - x, q.z - z) < 1e-6; };
    // a wall between the rooms, and a way through each doorway (but the grow room's and the Undertow's and its side rooms', not yet found)
    expect(floorAt((L.ARENA.x1 + L.KITCHEN.x0) / 2, 2)).toBe(false);
    expect(floorAt((L.KITCHEN.x1 + L.PREP.x0) / 2, 2)).toBe(false);
    for (const d of L.DOORS) expect(floorAt((d.x0 + d.x1) / 2, (d.z0 + d.z1) / 2)).toBe(d.b !== 'grow' && d.b !== 'den' && d.b !== 'loans' && d.b !== 'vip' && d.b !== 'cards');
    expect(floorAt(16, -4)).toBe(false);
    // where everything is
    expect(cellar.roomAt(cellar.RING)).toBe('arena');
    expect(cellar.roomAt(plan.BAR_PAD)).toBe('arena');
    expect(cellar.roomAt(plan.GONG_PAD)).toBe('arena');
    expect(cellar.roomAt(plan.WATCH)).toBe('arena');
    expect(cellar.roomAt(plan.POT_PAD)).toBe('kitchen');
    expect(cellar.roomAt(plan.COUNTER_PAD)).toBe('kitchen');
    expect(cellar.roomAt(plan.BIN_PADS.rice)).toBe('prep');
    // (the dumbwaiters, their chutes and the stores are in the lift room behind the prep hall's east wall, where nobody
    // walks: a step towards one stops at the wall; each store's tray is in the hall, against it)
    const { LIFT_ROOM, PREP } = g.layout;
    for (const k of ['rice', 'fish'] as const) {
      for (const at of [plan.LIFTS[k], plan.STORES[k]]) {
        expect(at.x).toBeGreaterThan(LIFT_ROOM.x0);
        const q = { ...at };
        g.layout.keepOnFloor(q, g.layout.walkable());
        expect(q.x).toBeLessThan(PREP.x1);
      }
      expect(plan.CHUTE.to).toBeGreaterThan(LIFT_ROOM.x0);
      expect(plan.CHUTE.from).toBeLessThan(plan.LIFTS[k].x);
      expect(plan.BINS[k].x).toBeGreaterThan(LIFT_ROOM.x0);
      // (the circle to take from it is against the wall, on the hall's side: reached only right up at the wall)
      const pad = plan.BIN_PADS[k], edge = { x: PREP.x1, z: pad.z };
      g.layout.keepOnFloor(edge, g.layout.walkable());
      expect(Math.hypot(edge.x - pad.x, edge.z - pad.z)).toBeLessThan(pad.r);
      expect(pad.x - pad.r).toBeGreaterThan(PREP.x1 - 0.8);
    }
    // (each chute runs downhill, from under its dumbwaiter's hatch to its lip over the store's mouth)
    expect(cellar.LIFT_LOOP.bottom).toBeGreaterThan(plan.CHUTE.y0);
    expect(plan.CHUTE.y0).toBeGreaterThan(plan.CHUTE.y1);
    expect(Math.abs(plan.CHUTE.to - plan.STORES.rice.x)).toBeLessThan(0.3);
    expect(cellar.roomAt(plan.machinePad('rice', 5))).toBe('prep');
    expect(cellar.roomAt(plan.machinePad('fish', 5))).toBe('prep');
    expect(cellar.roomAt(plan.machinePad('mush', 5))).toBe('grow');
    expect(cellar.roomAt(cellar.OFFICE)).toBe('office');
    expect(cellar.roomAt(cellar.LADDER_PAD)).toBe('landing');
    // from the bins to the soup bar: the prep hall, the hearth room, then the arena, without the landing
    const way = cellar.cellarWay(plan.BIN_PADS.rice, plan.BAR_PAD).map(w => cellar.roomAt(w));
    expect(new Set(way)).toEqual(new Set(['prep', 'kitchen', 'arena']));
    // walking into the earth stops at the wall
    g.player.g.position.set(L.ARENA.x1 - 0.2, cellar.CY, 2);
    for (let i = 0; i < 60; i++) { g.player.g.position.x += 0.05; g.run(1 / 60); }
    expect(g.player.g.position.x).toBeLessThanOrEqual(L.ARENA.x1 + 1e-6);
  });

  it("stops the player at a wall's face, and pushes them out of the prep hall's corners without a jitter", async () => {
    const { g, cellar } = await ring();
    const L = g.layout;
    // walking north into the prep hall's back wall: they stop a body's width short of the floor's edge
    g.player.g.position.set(16, cellar.CY, 3);
    for (let i = 0; i < 90; i++) { g.player.g.position.z -= 0.05; g.run(1 / 60); }
    expect(g.player.g.position.z).toBeCloseTo(L.PREP.z0 + 0.2, 5);
    // wedged between the dumbwaiter and the sacks, or between it and the bins: out to one clear spot, and kept there
    for (const at of [{ x: 20.2, z: 2.25 }, { x: 20.2, z: 7.7 }, { x: 20.5, z: 8.8 }]) {
      g.player.g.position.set(at.x, cellar.CY, at.z);
      g.run(1 / 30);
      const was = g.player.g.position.clone();
      g.run(0.3);
      expect(g.player.g.position.distanceTo(was), `from ${at.x}, ${at.z}`).toBeLessThan(1e-6);
      const boxes = cellar.cellarBoxes({ rice: 1, fish: 1, mush: 0 }), { x, z } = was;
      expect(boxes.some(([cx, cz, hx, hz]) => Math.abs(x - cx) < hx - 1e-6 && Math.abs(z - cz) < hz - 1e-6)).toBe(false);
      expect(cellar.roomAt({ x, z })).toBe('prep');
    }
  });

  it("keeps the bowl counter's circle out of the way: going through the hearth room takes no bowls, walking up to the counter does", async () => {
    const { g, cellar, plan, F, at } = await ring();
    const { cellarRoute } = await import('./bot');
    const P = plan.COUNTER_PAD, boxes = cellar.cellarBoxes(), back = g.player.back;
    // every way through the hearth room, round its furniture, between its doorways (from the landing, the arena, the
    // prep hall and the workshop) and from each to the pot, passes the circle more than a body's width wide of it
    const ends = [cellar.LADDER_FOOT, plan.BAR_PAD, plan.BIN_PADS.rice, plan.BENCH_PAD, plan.POT_PAD];
    for (const a of ends) for (const b of ends) {
      if (a === b) continue;
      let here = { x: a.x, z: a.z };
      for (const w of cellar.cellarWay(here, b)) {
        for (const p of cellarRoute(boxes, here, w, g.layout.ROOMS[cellar.roomAt(w)])) {
          for (let k = 0; k <= 40; k++) {
            const x = here.x + (p.x - here.x) * k / 40, z = here.z + (p.z - here.z) * k / 40;
            expect(Math.hypot(x - P.x, z - P.z), `from ${a.x}, ${a.z} to ${b.x}, ${b.z}, at ${x.toFixed(2)}, ${z.toFixed(2)}`).toBeGreaterThan(P.r + 0.3);
          }
          here = p;
        }
      }
    }
    // walking past it, from the prep hall's doorway to the workshop's, with bowls on the counter: none taken
    F().counter.push(...Array<boolean>(20).fill(false));
    const L = g.layout, prep = L.DOORS.find(d => d.b === 'prep')!, craft = L.DOORS.find(d => d.b === 'craft')!;
    const from = { x: L.KITCHEN.x1 - 0.3, z: (prep.z0 + prep.z1) / 2 }, to = { x: (craft.x0 + craft.x1) / 2, z: L.KITCHEN.z1 - 0.3 };
    for (let k = 0; k <= 80; k++) { at({ x: from.x + (to.x - from.x) * k / 80, z: from.z + (to.z - from.z) * k / 80 }); g.run(1 / 60); }
    expect(back.count('bowl')).toBe(0);
    // but walking up to it, the player stops at its side, still on the circle, and their arms fill
    at({ x: P.x - 0.8, z: P.z });
    for (let i = 0; i < 60; i++) { g.player.g.position.x += 0.05; g.run(1 / 60); }
    expect(g.player.g.position.x).toBeLessThan(plan.COUNTER.x - 0.5);
    expect(Math.hypot(g.player.g.position.x - P.x, g.player.g.position.z - P.z)).toBeLessThan(P.r);
    expect(back.count('bowl')).toBeGreaterThan(0);
    // (and the circle's on the hearth room's floor, against the counter, and clear of it)
    expect(cellar.roomAt(P)).toBe('kitchen');
    expect(boxes.some(([cx, cz, hx, hz]) => Math.abs(P.x - cx) < hx && Math.abs(P.z - cz) < hz)).toBe(false);
  });

  it("is dug into the earth: every wall's top one height in front and one at the back, the earth level with them, and every room, doorway and tunnel open", async () => {
    const { g, cellar, plan } = await ring();
    const L = g.layout, { CY, GROUND, ground } = cellar;
    const { Raycaster, Vector3 } = await import('three');
    type O = import('three').Object3D;
    type Mesh = import('three').Mesh;
    type V3 = import('three').Vector3;
    type P3 = { x: number; y: number; z: number };
    const shown = (o: O) => { for (let p: O | null = o; p; p = p.parent) if (!p.visible) return false; return true; };
    // (thousands of rays go at the earth, a mesh of tens of thousands of triangles; three.js tries every one of them
    // for each ray, too slow for CI's coverage run, so a plain mesh's triangles are sorted once into a grid over the
    // ground, in the world, and a ray only tries the ones in the cells it crosses; what each ray hits is as three.js
    // would find it, sides and all)
    const CELL = 2;
    type Grid = { tri: Float32Array; cells: Map<string, number[]>; lo: V3; hi: V3; cull: boolean };
    const grids = new Map<Mesh, { key: string; grid: Grid }>();
    const gridOf = (m: Mesh): Grid => {
      const g = m.geometry, pos = g.attributes.position, idx = g.index;
      m.updateWorldMatrix(true, false);
      const key = `${g.uuid} ${g.drawRange.start} ${g.drawRange.count} ${(pos as import('three').BufferAttribute).version} ${idx?.version} ${m.matrixWorld.elements.join()}`;
      const had = grids.get(m);
      if (had?.key === key) return had.grid;
      const n = idx ? idx.count : pos.count, s = Math.max(0, g.drawRange.start), e = Math.min(n, s + g.drawRange.count);
      // (three.js tests a back side by flipping each triangle; a mirroring matrix flips them too)
      const side = (m.material as import('three').Material).side, flip = (side === 2 ? false : side === 1) !== m.matrixWorld.determinant() < 0;
      const tri = new Float32Array(Math.max(0, Math.floor((e - s) / 3)) * 9), cells = new Map<string, number[]>();
      const lo = new Vector3(Infinity, Infinity, Infinity), hi = new Vector3(-Infinity, -Infinity, -Infinity), v = new Vector3();
      for (let i = s, t = 0; i + 2 < e; i += 3, t++) {
        let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
        for (let j = 0; j < 3; j++) {
          const k = flip ? 2 - j : j, at = idx ? idx.getX(i + k) : i + k;
          v.fromBufferAttribute(pos, at).applyMatrix4(m.matrixWorld);
          tri[t * 9 + j * 3] = v.x; tri[t * 9 + j * 3 + 1] = v.y; tri[t * 9 + j * 3 + 2] = v.z;
          lo.min(v); hi.max(v);
          x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z);
        }
        for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) {
          for (let cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) {
            const c = `${cx},${cz}`, list = cells.get(c);
            if (list) list.push(t); else cells.set(c, [t]);
          }
        }
      }
      const grid = { tri, cells, lo, hi, cull: side !== 2 };
      grids.set(m, { key, grid });
      return grid;
    };
    /** The nearest of a plain mesh's triangles along a ray (`dir` of length 1) closer than `far`, as three.js finds it. */
    const cast = (m: Mesh, from: P3, dir: P3, far: number) => {
      const { tri, cells, lo, hi, cull } = gridOf(m);
      // (only where the ray's inside the mesh's box)
      let t0 = 0, t1 = far;
      for (const a of ['x', 'y', 'z'] as const) {
        if (Math.abs(dir[a]) < 1e-12) { if (from[a] < lo[a] - 1e-6 || from[a] > hi[a] + 1e-6) return null; continue; }
        let ta = (lo[a] - from[a]) / dir[a], tb = (hi[a] - from[a]) / dir[a];
        if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta - 1e-6); t1 = Math.min(t1, tb + 1e-6);
        if (t0 > t1) return null;
      }
      const xs = [from.x + dir.x * t0, from.x + dir.x * t1], zs = [from.z + dir.z * t0, from.z + dir.z * t1];
      const seen = new Set<number>();
      let best = Infinity;
      for (let cx = Math.floor(Math.min(...xs) / CELL); cx <= Math.floor(Math.max(...xs) / CELL); cx++) {
        for (let cz = Math.floor(Math.min(...zs) / CELL); cz <= Math.floor(Math.max(...zs) / CELL); cz++) {
          for (const t of cells.get(`${cx},${cz}`) ?? []) {
            if (seen.has(t)) continue;
            seen.add(t);
            // (Ray.intersectTriangle)
            const o = t * 9, ax = tri[o], ay = tri[o + 1], az = tri[o + 2];
            const e1x = tri[o + 3] - ax, e1y = tri[o + 4] - ay, e1z = tri[o + 5] - az, e2x = tri[o + 6] - ax, e2y = tri[o + 7] - ay, e2z = tri[o + 8] - az;
            const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
            let DdN = dir.x * nx + dir.y * ny + dir.z * nz, sign: number;
            if (DdN > 0) { if (cull) continue; sign = 1; } else if (DdN < 0) { sign = -1; DdN = -DdN; } else continue;
            const dx = from.x - ax, dy = from.y - ay, dz = from.z - az;
            // diff × edge2, edge1 × diff
            const c2x = dy * e2z - dz * e2y, c2y = dz * e2x - dx * e2z, c2z = dx * e2y - dy * e2x;
            const DdQxE2 = sign * (dir.x * c2x + dir.y * c2y + dir.z * c2z);
            if (DdQxE2 < 0) continue;
            const c1x = e1y * dz - e1z * dy, c1y = e1z * dx - e1x * dz, c1z = e1x * dy - e1y * dx;
            const DdE1xQ = sign * (dir.x * c1x + dir.y * c1y + dir.z * c1z);
            if (DdE1xQ < 0 || DdQxE2 + DdE1xQ > DdN) continue;
            const QdN = -sign * (dx * nx + dy * ny + dz * nz);
            if (QdN < 0) continue;
            const d = QdN / DdN;
            if (d <= far && d < best) best = d;
          }
        }
      }
      return best < Infinity ? { distance: best, point: new Vector3(from.x + dir.x * best, from.y + dir.y * best, from.z + dir.z * best) } : null;
    };
    const plain = (m: O): m is Mesh => m.type === 'Mesh' && !Array.isArray((m as Mesh).material);
    /** What's first in the way of a ray, of the meshes shown in `o`. */
    const first = (from: P3, dir: P3, o: O, far = Infinity) => {
      const d = new Vector3(dir.x, dir.y, dir.z).normalize(), meshes: O[] = [];
      const hits: { distance: number; point: V3 }[] = [];
      o.traverse(m => {
        if (!(m as Mesh).isMesh || !shown(m)) return;
        if (!plain(m)) { meshes.push(m); return; }
        const hit = cast(m, from, d, far);
        if (hit) hits.push(hit);
      });
      const best = hits.sort((a, b) => a.distance - b.distance)[0] ?? null;
      const other = meshes.length ? new Raycaster(new Vector3(from.x, from.y, from.z), d, 0, far).intersectObjects(meshes, false)[0] : undefined;
      return other && (!best || other.distance < best.distance) ? other : best;
    };
    /** How high over the floor the first thing straight down at (x, z) is (null: nothing). */
    const down = (x: number, z: number, o: O = cellar.cellar) => {
      const hit = first({ x, y: CY + 20, z }, { x: 0, y: -1, z: 0 }, o);
      return hit ? hit.point.y - CY : null;
    };
    // the walls' tops: every low one's rail at one height, just over the earth's cut (between rooms and round the
    // outside, the prep hall's stone back wall too); every tall one's cap at one height, just over the bank behind it
    // (the arena's piles, north and west, and the office's own wall); and every doorway's lintel at one height (but
    // Mama Moray's hall's wide way into its dining wing, which has none)
    const low = [[-5, L.ARENA.z1 + 0.1], [L.ARENA.x1 + 0.3, 2], [L.KITCHEN.x1 + 0.3, 2], [L.CRAFT.x0 + 0.5, L.WING.z1 + 0.1], [16, L.PREP.z1 + 0.1],
      [L.LIFT_ROOM.x1 + 0.1, 4.9], [13, L.PREP.z0 - 0.3], [L.OFFICE_ROOM.x1 + 0.3, -6]].map(([x, z]) => down(x, z)!);
    const tall = [[-5, L.ARENA.z0 - 0.75], [L.ARENA.x0 - 0.75, 0], [7, L.OFFICE_ROOM.z0 - 0.25]].map(([x, z]) => down(x, z)!);
    const secret = (d: (typeof L.DOORS)[number]) => d.b === 'grow' || d.b === 'den' || d.b === 'loans' || d.b === 'vip' || d.b === 'cards';
    const lintels = [...L.DOORS.filter(d => !secret(d) && !(d.a === 'resto' && d.b === 'wing')).map(d => down((d.x0 + d.x1) / 2, (d.z0 + d.z1) / 2)!), ...plan.TUNNELS.map(t =>
      t.side === 'w' ? down(L.ARENA.x0 - 0.08, t.at + 0.5)! : down(t.at + 0.5, L.ARENA.z0 - 0.08)!)];
    for (const h of low) expect(h).toBeCloseTo(low[0], 5);
    for (const h of tall) expect(h).toBeCloseTo(tall[0], 5);
    for (const h of lintels) expect(h).toBeCloseTo(lintels[0], 5);
    expect(low[0] - GROUND.cut).toBeGreaterThan(0);
    expect(low[0] - GROUND.cut).toBeLessThan(0.05);
    expect(tall[0] - GROUND.bank).toBeGreaterThan(0);
    expect(tall[0] - GROUND.bank).toBeLessThan(0.05);
    expect(lintels[0]).toBeGreaterThan(low[0] + 0.5);
    expect(lintels[0]).toBeLessThan(tall[0] - 3);
    // every room's floor open (but the grow room's and the Undertow's places, earth like the rest while they're secrets),
    // every doorway, and the lift room behind the prep hall (the earth by the Undertow is drawn twice, lit and not: what
    // shows of it while it's a secret is `nearDenShut`)
    const earthAt = (x: number, z: number) => down(x, z, ground.open) ?? down(x, z, ground.nearDenShut);
    const open = (r: { x0: number; x1: number; z0: number; z1: number }) => {
      const out: [number, number][] = [];
      for (let x = r.x0 + 0.05; x < r.x1; x += 0.5) for (let z = r.z0 + 0.05; z < r.z1; z += 0.5) out.push([x, z]);
      return out;
    };
    const floors = [...Object.values(L.ROOMS).filter(r => r !== L.GROW), L.LIFT_ROOM].flatMap(open)
      .concat(L.DOORS.filter(d => d.b !== 'grow').map(d => [(d.x0 + d.x1) / 2, (d.z0 + d.z1) / 2]));
    for (const [x, z] of floors) {
      expect(earthAt(x, z), `${x}, ${z}`).toBeNull();
      expect(down(x, z, ground.hidden), `${x}, ${z}`).toBeNull();
    }
    // (broken ground like the rest, level with the walls round it at its edges)
    for (const [x, z, m] of [...open(L.GROW).map(([x, z]) => [x, z, ground.hidden] as const), ...[L.DEN].flatMap(open).map(([x, z]) => [x, z, ground.denHidden] as const)]) {
      const h = down(x, z, m)!;
      expect(h, `${x}, ${z}`).toBeGreaterThan(GROUND.cut - 0.45);
      expect(h, `${x}, ${z}`).toBeLessThan(GROUND.cut + 0.85);
    }
    // out past the walls, broken ground about the cut (level with it right at the walls, lumpy further out); behind the
    // back walls, banked up; and no edge to it anywhere the camera sees
    for (const [x, z] of [[-5, L.ARENA.z1 + 0.35], [7.5, L.WING.z1 + 0.35], [16, L.PREP.z1 + 0.35]]) {
      expect(earthAt(x, z), `${x}, ${z}`).toBeCloseTo(GROUND.cut, 2);
    }
    for (const [x, z] of [[-5, L.ARENA.z1 + 1], [7.5, L.WING.z1 + 1], [16, L.PREP.z1 + 1], [L.LIFT_ROOM.x1 + 1, 5], [L.GROW.x1 + 1, -5], [L.LOANS.x0 - 1, L.ARENA.z1 + 3]]) {
      const h = earthAt(x, z)!;
      expect(h, `${x}, ${z}`).toBeGreaterThan(GROUND.cut - 0.45);
      expect(h, `${x}, ${z}`).toBeLessThan(GROUND.cut + 0.85);
    }
    for (const [x, z] of [[-5, L.ARENA.z0 - 2], [L.ARENA.x0 - 2, 0], [7, L.OFFICE_ROOM.z0 - 0.5], [16, L.GROW.z0 - 2]]) {
      expect(down(x, z, ground.open), `${x}, ${z}`).toBeCloseTo(GROUND.bank, 5);
    }
    for (const [x, z] of [[-50, 0], [60, 0], [0, 45], [0, -45], [-50, 45], [60, -45]]) expect(down(x, z, ground.open)).not.toBeNull();
    // the fans' tunnels run under the bank, and nothing of it is in their way from the arena to their far ends
    for (const t of plan.TUNNELS) {
      const from = { x: t.mouth.x, y: CY + 1, z: t.mouth.z }, to = { x: t.deep.x - from.x, y: 0, z: t.deep.z - from.z };
      expect(first(from, to, ground.open)?.distance ?? Infinity).toBeGreaterThan(Math.hypot(to.x, to.z) + 0.5);
      // (the west one's far end is near enough Harry's office for its earth to be drawn with the Undertow's)
      expect(earthAt(t.deep.x, t.deep.z)).toBeCloseTo(GROUND.bank, 5);
    }
    // none of it is lit by the rooms' lights (its light's drawn into it), and a kerb of stone runs along the earth's
    // edge round every room, just past the low walls' rails (round the grow room's own walls, only once it's found)
    for (const m of [ground.open, ground.hidden, ground.denHidden, ground.nearDen, ground.nearDenShut, ground.rocks, ground.kerb, ground.growKerb, ground.denKerb, ground.shutKerb]) expect((m.material as import('three').Material).type).toBe('MeshBasicMaterial');
    for (const [x, z] of [[-5, L.ARENA.z1 + 0.35], [7.5, L.WING.z1 + 0.35], [16, L.PREP.z1 + 0.35], [L.LIFT_ROOM.x1 + 0.35, 5]]) {
      const h = down(x, z, ground.kerb)!;
      expect(h, `${x}, ${z}`).toBeGreaterThan(low[0]);
      expect(h, `${x}, ${z}`).toBeLessThan(low[0] + 0.1);
    }
    expect(down(L.GROW.x1 + 0.35, -5, ground.growKerb)).toBeNull();
    // in front of the rooms, toward the camera, the rock rises a few metres out, with crags on it ...
    expect(down(-7, L.VIP.z1 + 6, ground.open)! - GROUND.cut).toBeGreaterThan(2);
    expect(down(16, L.PREP.z1 + 6, ground.open)! - GROUND.cut).toBeGreaterThan(2);
    // ... but never into the camera's sight of a room's floor: from wherever the player stands, in a wide screen and a
    // phone's, nothing of it is in the way of anything in a room on the screen that shows over the walls (every spot
    // of every floor, as high as their rails)
    const { OFF } = await import('../src/render'), { CELLAR_ZOOM } = await import('../src/stage');
    const { Frustum, Matrix4, PerspectiveCamera } = await import('three');
    const floorsOf = [...Object.values(L.ROOMS), L.LIFT_ROOM].flatMap(r => open(r).filter(([x, z]) => Math.round((x - r.x0) / 0.5) % 2 === 0 && Math.round((z - r.z0) / 0.5) % 2 === 0));
    for (const [aspect, fov, k] of [[21 / 9, 40, 1], [9 / 19, 46, 1.28]]) {
      const cam = new PerspectiveCamera(fov, aspect, 0.1, 200);
      for (const r of [...Object.values(L.ROOMS), L.LIFT_ROOM]) {
        for (const [px, pz] of [[r.x0 + 0.5, r.z1 - 0.5], [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2], [r.x1 - 0.5, r.z1 - 0.5]]) {
          cam.position.set(px + OFF.x * k * CELLAR_ZOOM, CY + OFF.y * k * CELLAR_ZOOM, pz + OFF.z * k * CELLAR_ZOOM);
          cam.lookAt(px, CY + 0.4, pz); cam.updateMatrixWorld();
          const sees = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
          for (const [x, z] of floorsOf) {
            const spot = new Vector3(x, CY + low[0] + 0.02, z);
            if (!sees.containsPoint(spot)) continue;
            const to = spot.clone().sub(cam.position), far = to.length();
            for (const m of [ground.open, ground.nearDen, ground.rocks]) {
              const hit = plain(m) ? cast(m, cam.position, to.normalize(), far - 0.05) : new Raycaster(cam.position, to.normalize(), 0, far - 0.05).intersectObject(m, false)[0];
              expect(hit ?? undefined, `from ${px}, ${pz} (${aspect.toFixed(2)}), to ${x}, ${z}: ${m === ground.rocks ? 'a crag' : 'the rise'}`).toBeUndefined();
            }
          }
        }
      }
    }
    // when the grow room's found, its place opens up, under the tall wall at its back and the low ones round it
    cellar.showGrowRoom();
    for (const [x, z] of open(L.GROW)) {
      expect(down(x, z, ground.open)).toBeNull();
      expect(down(x, z, ground.hidden)).toBeNull();
    }
    expect(down(16, L.GROW.z0 - 0.75)).toBeCloseTo(tall[0], 5);
    expect(down(L.GROW.x1 + 0.1, -5)).toBeCloseTo(low[0], 5);
    expect(down(13, L.PREP.z0 - 0.3)).toBeCloseTo(low[0], 5);
    expect(down(L.GROW.x1 + 0.35, -5, ground.growKerb)! - low[0]).toBeGreaterThan(0);
    // and while the Undertow's a secret, the doorman's door stands as the out-of-order stall's back, in the restroom's
    // west wall (its lintel up over the low wall: southDoor.ts); when it's found, the room is dug out, lit, kerbed round
    const stall = { x: plan.CLUB_DOOR.x, z: (plan.CLUB_DOOR.z0 + plan.CLUB_DOOR.z1) / 2 };
    expect(down(stall.x, stall.z)).toBeGreaterThan(low[0] + 0.6);
    cellar.showDen();
    for (const [x, z] of [L.DEN, L.VIP].flatMap(open)) {
      expect(earthAt(x, z), `${x}, ${z}`).toBeNull();
      expect(down(x, z, ground.nearDen), `${x}, ${z}`).toBeNull();
    }
    // (along the club's front west of Eddie's room, and along his room's own)
    expect(down(L.VIP.x0 - 1.5, L.DEN.z1 + 0.5, ground.denKerb)! - low[0]).toBeGreaterThan(0);
    expect(down(L.VIP.x0 - 1.5, L.DEN.z1 + 1, ground.nearDen)! - GROUND.cut).toBeLessThan(0.85);
    expect(down(-7, L.VIP.z1 + 0.35, ground.denKerb)! - low[0]).toBeGreaterThan(0);
    expect(down(-7, L.VIP.z1 + 1, ground.nearDen)! - GROUND.cut).toBeLessThan(0.85);
    cellar.showDen(false);
  }, 180_000);

  it("copies its shapes without building a spare one first (render.ts's copyGeo): its lanterns, labels and baked furniture", async () => {
    // three.js' own clone() builds a whole new shape of the same kind at its default size, only to copy over it
    const clone = BufferGeometry.prototype.clone, spare: string[] = [];
    BufferGeometry.prototype.clone = function (this: BufferGeometry) {
      const shape = this instanceof ShapeGeometry || this instanceof ExtrudeGeometry; // (copyGeo clones these, for the luck)
      if (!shape && this.constructor !== BufferGeometry && new Error().stack?.includes('/src/cellar.ts')) spare.push(this.type);
      return clone.call(this);
    };
    try { await ring(); } finally { BufferGeometry.prototype.clone = clone; }
    expect(spare).toEqual([]);
  });

  it('keeps a metre clear in front of every doorway, both sides: nothing stands in the way of going through', async () => {
    const { g, cellar } = await ring({ ring: RING_DONE });
    g.layout.found.grow = true; g.layout.found.den = true;
    const six = { rice: 6, fish: 6, mush: 6 }, inWay: string[] = [];
    for (const d of g.layout.DOORS) {
      const across = d.x1 - d.x0 < d.z1 - d.z0; // (a doorway in a wall along z: going through it is along x)
      for (let a = 0.15; a <= 0.85; a += 0.1) for (const out of [-1, -0.5, 0.5, 1]) {
        const q = across
          ? { x: out < 0 ? d.x0 + out : d.x1 + out, z: d.z0 + (d.z1 - d.z0) * a }
          : { x: d.x0 + (d.x1 - d.x0) * a, z: out < 0 ? d.z0 + out : d.z1 + out };
        const was = { ...q };
        cellar.collideCellar(q, six);
        if (Math.hypot(q.x - was.x, q.z - was.z) > 1e-6) inWay.push(`${d.a}-${d.b} at ${was.x.toFixed(1)},${was.z.toFixed(1)}`);
      }
    }
    expect(inWay).toEqual([]);
  });

  it('has a clear way, round all the furniture and six of every machine, on every leg of the work', async () => {
    const { g, cellar, plan } = await ring({ ring: RING_DONE });
    const { cellarRoute } = await import('./bot');
    const six = { rice: 6, fish: 6, mush: 6 };
    const boxes = cellar.cellarBoxes(six);
    const inside = (x: number, z: number) => boxes.some(([cx, cz, hx, hz]) => Math.abs(x - cx) < hx - 0.01 && Math.abs(z - cz) < hz - 0.01);
    const stops = [cellar.LADDER_FOOT, plan.BIN_PADS.rice, plan.machinePad('rice', 5), plan.BIN_PADS.fish, plan.machinePad('fish', 5),
      plan.machinePad('mush', 5), plan.POT_PAD, plan.COUNTER_PAD, plan.BAR_PAD, plan.GONG_PAD, plan.WATCH, plan.BENCH_PAD, plan.BIN_PADS.rice];
    for (const s of stops) expect(inside(s.x, s.z), `stop at ${s.x}, ${s.z}`).toBe(false);
    for (let i = 1; i < stops.length; i++) {
      let here = { x: stops[i - 1].x, z: stops[i - 1].z };
      for (const w of cellar.cellarWay(here, stops[i])) {
        for (const p of cellarRoute(boxes, here, w, g.layout.ROOMS[cellar.roomAt(w)])) {
          for (let k = 0; k <= 40; k++) {
            const x = here.x + (p.x - here.x) * k / 40, z = here.z + (p.z - here.z) * k / 40;
            expect(inside(x, z), `from stop ${i - 1} to ${i}, at ${x.toFixed(2)}, ${z.toFixed(2)}`).toBe(false);
          }
          here = p;
        }
      }
    }
  });

  it('slides what the dumbwaiters bring down their wooden chutes, faster as it goes, and off the lip into the store', async () => {
    const { g, cellar, plan } = await ring();
    const C = plan.CHUTE, z = plan.LIFTS.fish.z;
    /** The fish lying on the fish line's chute, on its bed (not hopping on or off it), by where it is. */
    const onChute = () => cellar.cellar.children.filter(o => o.userData.kind === 'fish' && Math.abs(o.position.z - z) < 1e-6
      && o.position.x > C.to && o.position.x < C.from && Math.abs(o.position.y - (cellar.CY + plan.chuteY(o.position.x) + 0.045)) < 1e-6);
    let fish = onChute()[0];
    for (let i = 0; i < 600 && !fish; i++) { g.run(1 / 60); fish = onChute()[0]; }
    expect(fish).toBeDefined();
    // down the slope, every step longer than the last, then off the end and gone into the crate
    const xs = [fish.position.x], ys = [fish.position.y];
    while (onChute().includes(fish)) { g.run(1 / 60); xs.push(fish.position.x); ys.push(fish.position.y); }
    expect(xs.length).toBeGreaterThan(20);
    for (let i = 2; i < xs.length - 1; i++) {
      expect(ys[i]).toBeLessThan(ys[i - 1]);
      expect(xs[i - 1] - xs[i]).toBeGreaterThanOrEqual(xs[i - 2] - xs[i - 1] - 1e-9);
    }
    g.run(0.5);
    expect(fish.parent).toBe(null);
  });
});

describe('the kitchen, by hand', () => {
  it('rice and fish from the bins, ready in the rack and the barrel, cooked into bowls, and sold to the fans for chips', async () => {
    const { g, plan, fight, at, F } = await ring();
    const back = g.player.back;
    const cap = fight.MACH.rice[0].cap;
    // the dumbwaiter: only as much rice as the drying rack has room for (not an armful it can't take)
    at(plan.BIN_PADS.rice);
    g.run(0.3);
    expect(back.count('rice')).toBe(2);
    g.run(2);
    expect(back.count('rice')).toBe(cap);
    expect(back.hasRoom()).toBe(true);
    // the drying rack takes them all; they're ready after its time
    at(plan.machinePad('rice', 0));
    g.run(1);
    expect(F().lines.rice.m[0].items).toHaveLength(cap);
    expect(back.count('rice')).toBe(0);
    // with the rack full, the dumbwaiter hands out no more
    at(plan.BIN_PADS.rice);
    g.run(1);
    expect(back.count('rice')).toBe(0);
    at(plan.machinePad('rice', 0));
    g.run(fight.MACH.rice[0].time);
    // ready ones come out into the player's arms
    expect(back.count('rrice')).toBe(cap);
    expect(F().lines.rice.m[0].items).toHaveLength(0);
    // at the pot, the ready rice onto the ledge...
    at(plan.POT_PAD);
    g.run(1);
    expect(F().pantry.rice).toBe(cap);
    expect(back.count('rrice')).toBe(0);
    // ...and with no fish, the pot waits on it
    expect(fight.potWaits()).toBe('fish');
    expect(F().counter).toHaveLength(0);
    at(plan.BIN_PADS.fish);
    g.run(2);
    expect(back.count('fish')).toBe(fight.MACH.fish[0].cap);
    at(plan.machinePad('fish', 0));
    g.run(1 + fight.MACH.fish[0].time);
    expect(back.count('cfish')).toBe(fight.MACH.fish[0].cap);
    // the pot cooks a batch, four of each, while the player stands at it: its bowls go into the pot, which ladles them
    // out onto the counter a bowl at a time
    at(plan.POT_PAD);
    g.runUntil(() => F().pot.length > 0, 5);
    g.run(0.2);
    expect(F().pantry).toMatchObject({ rice: cap - fight.PER_BATCH, fish: cap - fight.PER_BATCH });
    expect(F().pot.length).toBeGreaterThan(0);
    expect(F().pot.length + F().counter.length).toBe(fight.BATCH);
    g.run(3);
    expect(F().pot).toHaveLength(0);
    expect(F().counter).toHaveLength(fight.BATCH);
    expect(fight.potWaits()).toBe('rice'); // (two of each left: not enough for another)
    // bowls from the counter to the soup bar, an armful
    for (const m of back.all()) { back.takeKind(m.userData.kind); g.render.scene.remove(m); }
    at(plan.COUNTER_PAD);
    g.run(2);
    const n = Math.min(back.cap, fight.BATCH);
    expect(back.count('bowl')).toBe(n);
    const money = g.wallet.money;
    at(plan.BAR_PAD);
    g.run(2);
    expect(back.count('bowl')).toBe(0);
    // the fans walk in and eat: each bowl's chips, less Mr. Fugu's 30%, pile up on the hearth room's floor, and walking
    // over them scoops them up into the wallet
    g.runUntil(() => F().stall.length === 0, 200);
    g.run(0.1);
    expect(g.wallet.money).toBe(money);
    expect(F().piles.bar).toBeCloseTo(n * fight.PRICE * fight.CUT, 5);
    at(plan.CHIP_SPOT);
    g.run(1);
    expect(F().piles.bar).toBe(0);
    expect(g.wallet.money - money).toBeCloseTo(n * fight.PRICE * fight.CUT * fight.CHIP, -1);
    // (💪: the fans fed in this bout's preparation, which may not be all of them: the first came in an earlier bout)
    expect(fight.strength()).toBe(F().bout.fed);
    expect(fight.strength()).toBeGreaterThan(0);
    g.ui.hud(0);
    expect($('powerN').textContent).toBe(String(fight.strength()));
  }, 30_000);

  it('at a machine with full arms, swaps ready ones for raw ones, one for one', async () => {
    const { g, plan, fight, at, F } = await ring();
    const back = g.player.back;
    const cap = fight.MACH.rice[0].cap;
    // a rack of ready rice counts as room: the dumbwaiter hands out a rackful
    F().lines.rice.m[0].items = Array(cap).fill(1);
    at(plan.BIN_PADS.rice);
    g.run(3);
    expect(back.count('rice')).toBe(cap);
    // arms full (with bowls besides)
    const { newBowl } = await import('../src/items');
    while (back.hasRoom()) back.put(newBowl(false));
    at(plan.machinePad('rice', 0));
    g.run(1);
    expect(back.count('rrice')).toBe(cap);
    expect(back.count('rice')).toBe(0);
    expect(F().lines.rice.m[0].items).toHaveLength(cap);
    expect(F().lines.rice.m[0].items.every(p => p < 0.2)).toBe(true);
  });

  it('one spot works every rack, moving along to the middle of the row as more are built', async () => {
    const { g, plan, fight, at, F } = await ring();
    const back = g.player.back;
    const cap = fight.MACH.rice[0].cap, first = plan.machineAt('rice', 0);
    // (one rack: the spot's in front of it)
    expect(plan.machinePad('rice', 0, 1)).toMatchObject({ x: first.x });
    for (let i = 1; i < plan.MAX_MACHINES; i++) fight.addMachine('rice');
    const n = F().lines.rice.n, spot = plan.machinePad('rice', 0, n);
    // (six: one spot for all of them, in the middle of the row)
    expect(n).toBe(plan.MAX_MACHINES);
    for (let i = 0; i < n; i++) expect(plan.machinePad('rice', i, n)).toEqual(spot);
    expect(spot.x).toBeCloseTo((first.x + plan.machineAt('rice', n - 1).x) / 2);
    // from it, the racks are filled the nearest first, an armful at a time, right out to the ends of the row
    const trip = () => { at(plan.BIN_PADS.rice); g.run(3); expect(back.count('rice')).toBeGreaterThan(0); at(spot); g.run(2); expect(back.count('rice')).toBe(0); };
    trip();
    const after1 = F().lines.rice.m.map(m => m.items.length);
    expect(after1[2] + after1[3]).toBe(2 * cap);
    expect(after1[0] + after1[5]).toBe(0);
    trip();
    expect(F().lines.rice.m[0].items.length).toBeGreaterThan(0);
    // and once they're ready, they come out from there too, from the far ends as well
    g.run(fight.MACH.rice[0].time + 0.5);
    at(plan.BIN_PADS.rice);
    g.run(0.5);
    at(spot);
    g.run(3);
    expect(back.count('rrice')).toBe(back.cap);
    expect(fight.doneCount('rice', F().lines.rice.m[0]) + fight.doneCount('rice', F().lines.rice.m[2])).toBeLessThan(2 * cap);
  });

  it('the pot, the counter and the soup bar are each their own: a batch fills the pot, ladled out onto the counter', async () => {
    const { g, F, fight } = await ring();
    const { potShows } = await import('../src/ringKitchen');
    F().pot.length = 0; F().counter.length = 0;
    g.run(0.1);
    expect(potShows()).toEqual({ stew: 0, tag: 0, landed: 0 });
    // a batch in the pot: the stew up, the tag saying how many bowls
    for (let i = 0; i < fight.BATCH; i++) F().pot.push(false);
    g.run(1 / 60);
    expect(potShows().stew).toBeCloseTo(fight.BATCH / fight.POT_CAP, 1);
    expect(potShows().tag).toBeGreaterThan(fight.BATCH - 2);
    // out a bowl at a time onto the counter, the stew going down with each, the bowls flying over
    g.run(0.5);
    expect(potShows().stew).toBeGreaterThan(0);
    expect(potShows().stew).toBeLessThan(fight.BATCH / fight.POT_CAP - 0.05);
    expect(F().counter.length).toBeGreaterThan(0);
    expect(F().pot.length + F().counter.length).toBe(fight.BATCH);
    // (going down smoothly, the last bowl's worth too: it sinks to the pot's floor rather than vanishing)
    let last = potShows().stew, drop = 0;
    for (let i = 0; i < 180; i++) { g.run(1 / 60); drop = Math.max(drop, last - potShows().stew); last = potShows().stew; }
    expect(drop).toBeLessThan(0.3 / 60 + 1e-6);
    expect(potShows()).toEqual({ stew: 0, tag: 0, landed: fight.BATCH });
    expect(F().counter).toHaveLength(fight.BATCH);
    // carrying bowls from the counter to the soup bar leaves the pot as it is
    F().counter.splice(0, 3);
    g.run(0.5);
    expect(potShows()).toEqual({ stew: 0, tag: 0, landed: fight.BATCH - 3 });
    // and a full counter stops the ladle: what's left waits in the pot
    while (F().counter.length < fight.COUNTER_CAP) F().counter.push(false);
    F().pot.push(true, true);
    g.run(1);
    expect(F().pot).toHaveLength(2);
    F().counter.splice(0, 5);
    g.run(1);
    expect(F().pot).toHaveLength(0);
  });

  it('says what it wants over the pot and the soup bar, and what each place does at it', async () => {
    const { g, plan, fight, at, F } = await ring();
    const { bubbles } = await import('../src/ringKitchen');
    g.run(5);
    expect(F().queue.length).toBeGreaterThan(0);
    expect(fight.potWaits()).toBe('rice');
    expect(bubbles().pot).toBe('rice'); // 🌾?
    expect(bubbles().bar).toBe(true); // 🍲?: fans waiting, nothing out
    F().pantry.rice = fight.PER_BATCH;
    g.run(0.2);
    expect(bubbles().pot).toBe('fish');
    // the tips
    at(plan.POT_PAD);
    g.run(0.1);
    expect($('tip').textContent).toContain('The pot');
    at(plan.machinePad('rice', 0));
    g.run(0.1);
    expect($('tip').textContent).toContain('Drying rack 1');
    at(plan.BAR_PAD);
    g.run(0.1);
    expect($('tip').textContent).toContain('The soup bar');
    expect($('tip').textContent).toContain(`a bowl pays 🐡 ${+(fight.PRICE * fight.CUT).toFixed(2)}`);
  });

});

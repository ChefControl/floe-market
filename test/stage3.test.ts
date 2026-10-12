// Stage 3, Fight Night: Mr. Fugu's sumo ring in the cellar under the dock. Buying in, the ladder, the rooms (and the
// grow room behind the prep hall's wall), the kitchen worked by hand (the dumbwaiter's bins, the racks and barrels,
// the pot, the counter, the stall) and the fans who pay for bowls, the gong and its forecast, a boss's rush and the
// card after it, the cellar's tiles (machines again and again, hires, tiers) bought with Fugu Chips, the swarm on the
// floor, the watch spot, the buyout, the restaurant upstairs as the front, and saving it all.
import { describe, expect, it } from 'vitest';
import { bought, FLOE_SUSHI, loadGame, MARKET, RING_DONE, type SaveFixture } from './helpers';

const $ = (id: string) => document.getElementById(id)!;
const SUSHI = [...MARKET, 'sushi', ...FLOE_SUSHI];

/** A game in stage 3 (the ring bought), down in the cellar unless `level` says otherwise. */
async function ring(save: SaveFixture = {}) {
  const g = await loadGame({ tiles: bought(...SUSHI, 'dohyo'), fugu: 2, level: 1, reviews: Array(20).fill(5), ...save });
  const [cellar, plan, fight, dohyo, gong, swarm, front, stage, ringSound] = await Promise.all([
    import('../src/cellar'), import('../src/cellarPlan'), import('../src/fight'), import('../src/dohyo'), import('../src/gong'),
    import('../src/swarm'), import('../src/front'), import('../src/stage'), import('../src/ringSound'),
  ]);
  const at = (p: { x: number; z: number }) => g.player.g.position.set(p.x, cellar.CY, p.z);
  /** The cellar now (fight.ts swaps its state object, so always read it fresh). */
  const F = () => fight.F;
  /** Stands on a tile with the money for it until it's bought (or, for a room's upgrade, at the crafting bench, and
   *  taps it in its room's tab). */
  const buy = (id: string) => {
    const t = g.unlocks.tiles.find(x => x.id === id)!;
    if (t.menu) {
      at(plan.ROOM_MENUS[t.menu]);
      g.run(0.1);
      // (the bench's menu opens folded, as its Craft button: tap it open, then the room's tab)
      if (document.getElementById('shop')!.hidden) document.getElementById('craft')!.click();
      document.querySelector<HTMLButtonElement>(`#shopTabs [data-tab="${t.menu}"]`)?.click();
      // (a computer's list: its price button; a touch screen's cards: pick its card, then buy it)
      const price = document.querySelector<HTMLButtonElement>(`#shopRows [data-tile="${id}"] button.cost`);
      if (!price) document.querySelector<HTMLButtonElement>(`#shopRows [data-tile="${id}"]`)?.click();
      const b = price ?? document.querySelector<HTMLButtonElement>('#shopPick .buy');
      if (!b || b.disabled || (!price && !document.querySelector(`#shopRows [data-tile="${id}"][aria-pressed="true"]`))) throw new Error(`${id} isn't on sale in its menu`);
      b.click();
      g.run(0.1);
      return t;
    }
    at(t);
    g.press('e');
    const n = t.line ? F().lines[t.line].n : -1;
    g.runUntil(() => (t.line ? F().lines[t.line].n > n : t.done), 15);
    g.press('e', 'keyup');
    g.run(0.1);
    return t;
  };
  return { g, cellar, plan, fight, dohyo, gong, swarm, front, stage, ringSound, at, F, buy };
}
/** The stage 3 upgrades on offer now: on tiles, and in the rooms' menus. */
const offered = (g: Awaited<ReturnType<typeof loadGame>>) =>
  [...g.unlocks.visibleTiles().filter(t => t.stage === 3), ...g.unlocks.menuOffer()].map(t => t.id);

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
    expect(g.wallet.money).toBe(100_000);
    expect($('banner').textContent).toBe('Stage 2 completeFloe Sushi');
    expect(g.player.frozen).toBe(true);
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
    expect(g.player.frozen).toBe(false);
    expect(g.stage.staging()).toBe(false);
    // a fresh cellar: a rack and a barrel, nothing on the ledge
    expect(fight.F.lines.rice.n).toBe(1);
    expect(fight.F.lines.fish.n).toBe(1);
    expect(fight.F.lines.mush.n).toBe(0);
    expect(fight.F.beaten).toBe(0);
    // the HUD: bosses beaten on the stage chip, 💪 in the season's place, and the wallet in chips
    g.ui.hud(0);
    expect($('stageName').textContent).toBe('The Dohyo Below');
    expect($('stageCount').textContent).toBe('0/5');
    expect($('power').hidden).toBe(false);
    expect($('season').hidden).toBe(true);
    expect($('cash').classList.contains('chips')).toBe(true);
    expect($('cash').textContent).toContain('100');
    expect(offered(g).sort()).toEqual(['barrel', 'rack', 'salter', 'washer']);
  });

  it('the stage chip says when all five bosses are beaten, and the buyout is all that is on offer', async () => {
    const { g } = await ring({ ring: RING_DONE });
    expect($('stageCount').textContent).toBe('Buyout ready');
    expect(offered(g).filter(id => !['rack', 'barrel', 'bed'].includes(id)).sort()).toEqual(['buyout', 'shelves', 'smoke', 'steam']);
  });
});

describe('the ladder', () => {
  it("down in the cellar, the player's under the road: the drivers up top don't stop for them", async () => {
    const { g, cellar } = await ring({ level: 1 });
    const { TAKEOUT } = g.counters, { HOUSE_PATH_Z } = await import('../src/layout');
    for (let i = 0; i < 12; i++) TAKEOUT.stock.put(g.items.newBox(30, false));
    // (right under the road on a takeout driver's way home, where they'd be held up and get out to boop them)
    const under = () => g.player.g.position.set(g.world.ROAD2_X, cellar.CY, HOUSE_PATH_Z + 0.4);
    g.runUntil(() => { under(); return TAKEOUT.queue[0]?.got > 0; }, 40);
    const c = TAKEOUT.queue[0];
    let held = 0;
    g.runUntil(() => { under(); held = Math.max(held, c.held); return c.g.position.z > HOUSE_PATH_Z + 2; }, 30);
    expect(held).toBe(0);
    expect(g.player.booped).toBeNull();
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
    // a season's turn doesn't bring the sky into the cellar, or change anyone's clothes down there
    g.saveMod.save();
    const { setSeason, current } = await import('../src/season');
    const wearing = g.player.g.worn();
    setSeason((['winter', 'spring', 'summer', 'fall'].indexOf(current()) + 2) % 4);
    g.run(7);
    expect(g.render.scene.background).toMatchObject({ r: cellar.CELLAR_SKY.bg.r });
    expect(g.player.g.worn()).toEqual(wearing);
    // ...until they're back up top
    g.player.g.position.set(cellar.LADDER_PAD.x, cellar.CY, cellar.LADDER_PAD.z);
    g.run(1.2);
    expect(level.down).toBe(false);
    expect(g.player.g.worn()).not.toEqual(wearing);
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
    // a wall between the rooms, and a way through each doorway (but the grow room's, not yet found)
    expect(floorAt((L.ARENA.x1 + L.KITCHEN.x0) / 2, 2)).toBe(false);
    expect(floorAt((L.KITCHEN.x1 + L.PREP.x0) / 2, 2)).toBe(false);
    for (const d of L.DOORS) expect(floorAt((d.x0 + d.x1) / 2, (d.z0 + d.z1) / 2)).toBe(d.b !== 'grow');
    expect(floorAt(16, -4)).toBe(false);
    // where everything is
    expect(cellar.roomAt(cellar.RING)).toBe('arena');
    expect(cellar.roomAt(plan.STALL_PAD)).toBe('arena');
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
    // from the bins to the stall: the prep hall, the hearth room, then the arena, without the landing
    const way = cellar.cellarWay(plan.BIN_PADS.rice, plan.STALL_PAD).map(w => cellar.roomAt(w));
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

  it('has a clear way, round all the furniture and six of every machine, on every leg of the work', async () => {
    const { g, cellar, plan } = await ring({ ring: RING_DONE });
    const { cellarRoute } = await import('./bot');
    const six = { rice: 6, fish: 6, mush: 6 };
    const boxes = cellar.cellarBoxes(six);
    const inside = (x: number, z: number) => boxes.some(([cx, cz, hx, hz]) => Math.abs(x - cx) < hx - 0.01 && Math.abs(z - cz) < hz - 0.01);
    const stops = [cellar.LADDER_FOOT, plan.BIN_PADS.rice, plan.machinePad('rice', 5), plan.BIN_PADS.fish, plan.machinePad('fish', 5),
      plan.machinePad('mush', 5), plan.POT_PAD, plan.COUNTER_PAD, plan.STALL_PAD, plan.GONG_PAD, plan.WATCH, plan.BIN_PADS.rice];
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
    // bowls from the counter to the stall, an armful
    for (const m of back.all()) { back.takeKind(m.userData.kind); g.render.scene.remove(m); }
    at(plan.COUNTER_PAD);
    g.run(2);
    const n = Math.min(back.cap, fight.BATCH);
    expect(back.count('bowl')).toBe(n);
    const money = g.wallet.money;
    at(plan.STALL_PAD);
    g.run(2);
    expect(back.count('bowl')).toBe(0);
    // the fans walk in and eat: each bowl's chips, less Mr. Fugu's 30%, go into the wallet
    g.runUntil(() => F().stall.length === 0, 200);
    g.run(0.1);
    expect(g.wallet.money - money).toBeCloseTo(n * fight.PRICE * fight.CUT * fight.CHIP, 0);
    // (💪: the fans fed in this bout's preparation, which may not be all of them: the first came in an earlier bout)
    expect(fight.strength()).toBe(F().bout.fed);
    expect(fight.strength()).toBeGreaterThan(0);
    g.ui.hud(0);
    expect($('powerN').textContent).toBe(String(fight.strength()));
  });

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

  it('the pot, the counter and the stall are each their own: a batch fills the pot, ladled out onto the counter', async () => {
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
    g.run(3);
    expect(potShows()).toEqual({ stew: 0, tag: 0, landed: fight.BATCH });
    expect(F().counter).toHaveLength(fight.BATCH);
    // carrying bowls from the counter to the stall leaves the pot as it is
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

  it('says what it wants over the pot and the stall, and what each place does at it', async () => {
    const { g, plan, fight, at, F } = await ring();
    const { bubbles } = await import('../src/ringKitchen');
    g.run(5);
    expect(F().queue.length).toBeGreaterThan(0);
    expect(fight.potWaits()).toBe('rice');
    expect(bubbles().pot).toBe('rice'); // 🌾?
    expect(bubbles().stall).toBe(true); // 🍲?: fans waiting, nothing out
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
    at(plan.STALL_PAD);
    g.run(0.1);
    expect($('tip').textContent).toContain(`a bowl pays 🐡 ${+(fight.PRICE * fight.CUT).toFixed(2)}`);
  });

});

describe('a bout', () => {
  it('the fans buy soup and sit down round the ring, the hungry go home, and the champion wins the local', async () => {
    const { g, fight, swarm, F } = await ring();
    const crowd = fight.crowdNow(), mine = Math.ceil((crowd + 1) / 2);
    for (let i = 0; i < mine; i++) fight.toStall(false);
    // the preparation: they come in and queue at the stall, and the ones who eat go and sit on the champion's side
    // (a local's the free show, told by the arena alone: no bar)
    g.run(3);
    g.ui.hud(0);
    expect(F().bout.phase).toBe('prep');
    expect($('rush').hidden).toBe(true);
    // (nobody eats from afar: there's soup on the stall, but they've still to walk up to it from their tunnel)
    expect(F().bout.came).toBeGreaterThan(0);
    expect(F().bout.fed).toBe(0);
    expect(F().stall).toHaveLength(mine);
    // (the first is served as soon as they've been in long enough to reach it)
    g.runUntil(() => F().bout.fed > 0, fight.REACH);
    expect(F().bout.fed).toBeGreaterThan(0);
    // (each one served walks up to the stall's front for their bowl, in their own colour, and turns yours there)
    const STALL = (await import('../src/cellarPlan')).STALL;
    for (let i = 0; i < 200 && swarm.swarm().ours < mine; i++) {
      g.run(0.1);
      for (const f of swarm.turnedAt()) expect(Math.abs(f.x - (STALL.x - 0.85))).toBeLessThan(0.05);
    }
    expect(swarm.swarm().ours).toBe(mine);
    expect(F().bout.fed).toBe(mine);
    g.runUntil(() => F().bout.phase !== 'prep', fight.BOUT.prep);
    g.run(0.01);
    expect(F().bout.phase).toBe('sit');
    expect(F().queue).toHaveLength(0);
    expect(F().stall).toHaveLength(0);
    // the ones who didn't eat go home, and nobody's sold anything while the rest sit down
    g.run(fight.BOUT.sit - 0.2);
    fight.toStall(false);
    g.run(1.5);
    expect(F().bout.phase).toBe('fight');
    expect(F().stall).toHaveLength(1);
    // (all who ate in their seats by the charge, round the furniture and up on the benches, never through anything)
    expect(swarm.swarm()).toMatchObject({ n: mine, ours: mine, seated: mine, benched: mine });
    g.run(fight.BOUT.fight);
    expect(F().bout.phase).toBe('pay');
    expect(F().bout.win).toBe(true);
    expect($('rush').hidden).toBe(true);
    // then they go home, and the next bout's fans come in; with nothing on the stall they all go home hungry, and the
    // champion still wins
    F().stall.length = 0;
    g.run(fight.BOUT.pay + 0.1);
    expect(F().bout).toMatchObject({ phase: 'prep', fed: 0 });
    g.run(fight.BOUT.prep + fight.BOUT.sit + 1);
    expect(swarm.swarm().n).toBe(0);
    g.run(fight.BOUT.fight);
    expect(F().bout.win).toBe(true);
  });
});

describe('the crowd', () => {
  it('shouts in speech bubbles: an empty stall gets them asking for their chanko', async () => {
    const { g, swarm, fight, F } = await ring();
    F().stall.length = 0;
    const heard = new Set<string>();
    for (let i = 0; i < 120 && F().bout.phase === 'prep'; i++) { g.run(0.1); swarm.said().forEach(t => heard.add(t)); }
    expect([...heard].some(t => /chanko|soup|starving|chef/i.test(t))).toBe(true);
    expect(swarm.said().length).toBeLessThanOrEqual(4);
    // fed, they're happier about it
    for (let i = 0; i < 30; i++) fight.toStall(false);
    g.runUntil(() => F().bout.phase === 'prep' && F().bout.fed > 5, 60);
    heard.clear();
    for (let i = 0; i < 100 && F().bout.phase === 'prep'; i++) { g.run(0.1); swarm.said().forEach(t => heard.add(t)); }
    expect(heard.size).toBeGreaterThan(0);
  });
});

describe('the gong', () => {
  it('its panel names the next boss and forecasts the rush exactly; ringing it brings his crowd onto the floor', async () => {
    const { g, plan, swarm, fight, at, F } = await ring();
    at(plan.GONG_PAD);
    g.run(0.3);
    expect($('gong').hidden).toBe(false);
    expect($('gongBoss').textContent).toBe('🐙 Hakkaku · boss 1 of 5');
    expect($('gongCrowd').textContent).toContain('Brings 120 fans: turn more than half (61) before the bell');
    expect($('gongCast').textContent).toMatch(/^You'll turn \d+ of his 120: \d+ short of 61\./);
    expect($('gongCast').className).toBe('short');
    // ring it anyway: no fee
    const money = g.wallet.money;
    g.press('e');
    g.run(0.1);
    g.press('e', 'keyup');
    expect(F().rush).toMatchObject({ boss: 0, n: 120, turned: 0 });
    expect(g.wallet.money).toBe(money);
    expect($('rush').hidden).toBe(false);
    g.ui.hud(0);
    expect($('rushName').textContent).toBe("🐙 Hakkaku's crowd is coming in");
    expect($('rushBell').textContent).toBe('🔔 30 s');
    expect($('rushYou').textContent).toBe('0 turned · 61 beats him');
    expect($('gongGo').hidden).toBe(true);
    expect($('toast').textContent).toContain('Hakkaku walks in with 120 fans');
    // his bell waits for them all to walk in to the stall, and nobody buys on the way
    fight.toStall(false);
    g.run(fight.WALK_IN - 0.2);
    g.ui.hud(0);
    expect($('rushBell').textContent).toBe('🔔 30 s');
    expect(F().rush!.turned).toBe(0);
    g.run(0.4);
    g.ui.hud(0);
    expect($('rushName').textContent).toBe("🐙 Hakkaku's crowd is in");
    expect(F().rush!.turned).toBe(1);
    // (all of them at the stall by then, on the floor before it, but the one just turned, off to the stall's front for
    // their bowl, and only yours once they've got it)
    expect(swarm.ways().length).toBe(120);
    expect(swarm.ways().filter(w => w.length === 1).length).toBeGreaterThanOrEqual(119);
    expect(swarm.swarm()).toMatchObject({ n: 120, ours: 0 });
    g.runUntil(() => swarm.swarm().ours > 0, 3);
    expect(swarm.swarm().ours).toBeGreaterThan(0);
  });

  it('the forecast is what the rush does, with the crew working', async () => {
    const { fight } = await ring({ level: 0 });
    const f = fight;
    f.resetFight();
    for (const k of ['rice', 'fish'] as const) for (let i = 0; i < 3; i++) f.addMachine(k);
    for (const r of ['washer', 'salter', 'cook', 'attendant'] as const) f.hire(r);
    for (let t = 0; t < 90; t += 0.05) f.step(0.05);
    const fc = f.forecast()!;
    expect(fc.boss.name).toBe('Hakkaku');
    expect(f.ringGong()).toBe(true);
    for (let n = 0; n < 4000 && !f.F.rush!.done; n++) f.step(0.05);
    expect(f.F.rush!.turned).toBe(fc.turned);
    expect(f.F.rush!.win).toBe(fc.turned >= 61);
  });

  it('turning more than half his crowd beats him, after the fight: the prize, the card, and the grow room found', async () => {
    const { g, plan, fight, swarm, cellar, at, F } = await ring();
    at(plan.GONG_PAD);
    g.run(0.1);
    expect(fight.ringGong()).toBe(true);
    const money = g.wallet.money;
    // just enough: 61 of his 120, by the bell
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 61 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().rush).toMatchObject({ turned: 61, win: true });
    // his crowd sits down and the fight's on, but nothing's settled until it's over
    expect(F().bout.phase).toBe('sit');
    expect(F().beaten).toBe(0);
    expect($('fightCard').hidden).toBe(true);
    g.run(fight.BOUT.sit + 1);
    expect(F().bout.phase).toBe('fight');
    expect(swarm.swarm()).toMatchObject({ n: 120, ours: 61 });
    g.run(fight.BOUT.fight);
    expect(F().bout.phase).toBe('pay');
    expect(F().beaten).toBe(1);
    expect(g.wallet.money - money).toBeGreaterThanOrEqual(fight.BOSSES[0].prize * fight.CHIP);
    expect($('fightCard').hidden).toBe(false);
    expect($('fightCard').textContent).toContain('You won his crowd over');
    expect($('fightCard').textContent).toContain('61 of his 120 fans were yours');
    expect($('fightCard').textContent).toContain('the grow room');
    // the grow room: lit, walkable, with its first bed (its picker's sold on its square)
    expect(g.layout.found.grow).toBe(true);
    expect(cellar.lights[7].intensity).toBeGreaterThan(0);
    expect(cellar.parts.grow.visible).toBe(true);
    const { x0, x1, z0, z1 } = g.layout.DOORS.find(d => d.b === 'grow')!;
    const q = { x: (x0 + x1) / 2, z: (z0 + z1) / 2 };
    g.layout.keepOnFloor(q, g.layout.walkable());
    expect(q).toEqual({ x: (x0 + x1) / 2, z: (z0 + z1) / 2 });
    expect(F().lines.mush.n).toBe(1);
    expect(F().hires.picker).toBeUndefined();
    expect(fight.inPot()).toEqual(['rice', 'fish', 'mush']);
    expect($('stageCount').textContent).toBe('1/5');
    // the next boss on the panel, and the tiles he opened
    g.run(1);
    expect($('gongBoss').textContent).toContain('Yokobashiri');
    expect(offered(g)).toEqual(expect.arrayContaining(['bed', 'picker', 'tier1']));
    // the card goes on a tap
    $('fightCard').click();
    expect($('fightCard').hidden).toBe(true);
  });

  it('a lost rush says how short it was and why, and costs nothing: half his crowd is not enough', async () => {
    const { g, fight, F } = await ring();
    const money = g.wallet.money;
    expect(fight.ringGong()).toBe(true);
    g.run(fight.WALK_IN + fight.BOSSES[0].bell + fight.BOUT.sit + fight.BOUT.fight + 0.5);
    expect(F().rush!.win).toBe(false);
    expect(F().beaten).toBe(0);
    expect(g.wallet.money).toBe(money);
    const card = $('fightCard').textContent!;
    expect(card).toContain('Pushed out by Hakkaku');
    expect(card).toContain('You turned 0 of his 120 fans: 61 short of the 61 that beat him.');
    expect(card).toContain('Your stall stood empty');
    expect(card).toContain('the pot was waiting on rice');
    // his crowd clears, and the gong's ready again; a tie (60 of 120) still loses
    g.runUntil(() => !F().rush, 20);
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 60 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().rush).toMatchObject({ turned: 60, win: false });
  });
});

describe("the cellar's tiles", () => {
  it('another machine again and again, each dearer, up to six, in chips', async () => {
    const { g, fight, buy, F } = await ring({ money: 10_000_000 });
    const t = g.unlocks.tiles.find(x => x.id === 'rack')!;
    expect(t.cost).toBe(fight.MACH_COST.rice * fight.CHIP);
    expect(t.tip.desc).toContain('(1 of 6) · 🐡 10');
    buy('rack');
    expect(F().lines.rice.n).toBe(2);
    expect(t.done).toBe(false);
    expect(g.unlocks.menuOffer()).toContain(t);
    expect(t.cost).toBe(Math.round(fight.MACH_COST.rice * fight.MACH_STEP) * fight.CHIP);
    for (let n = 3; n <= 6; n++) { buy('rack'); expect(F().lines.rice.n).toBe(n); }
    expect(t.done).toBe(true);
    expect(offered(g)).not.toContain('rack');
  });

  it("the crafting bench sells every room's upgrades, under a heading each, with a price button that buys it", async () => {
    const { g, plan, at, F } = await ring({ money: 10_000_000 });
    // no tiles of their own on the rooms' floors
    expect(g.unlocks.visibleTiles().filter(t => t.menu)).toEqual([]);
    at(plan.BENCH_PAD);
    g.run(0.1);
    // (with a mouse and keys, it opens whole: no Craft button, no tabs, nothing to fold, one list)
    expect($('shop').hidden).toBe(false);
    expect($('craft').hidden).toBe(true);
    expect($('shopShut').hidden).toBe(true);
    expect($('shopTabs').hidden).toBe(true);
    expect($('shopTitle').textContent).toBe('Crafting bench');
    // (the ring's, the prep hall's, the grow room's and the hearth room's, each with its number key and how many things in
    // it there are the chips for; the grow room, till it's found, says who opens it)
    const heads = () => [...$('shopRows').querySelectorAll('.sect .nm')].map(h => h.textContent);
    const counts = () => [...$('shopRows').querySelectorAll('.sect .cnt')].map(h => h.textContent);
    expect(heads()).toEqual(['The ring', 'Prep hall', 'Grow room', 'Hearth room']);
    expect([...$('shopRows').querySelectorAll('.sect kbd')].map(k => k.textContent)).toEqual(['1', '2', '3', '4']);
    expect(counts()).toEqual(['3 to buy', '4 to buy', '', '']);
    expect($('shopRows').querySelector('[data-of="grow"]')!.textContent).toBe('🔒 Found after beating Hakkaku 🐙');
    expect($('shopPurse').hidden).toBe(false);
    expect($('shopPurse').textContent).toBe('🐡 10k');
    expect($('shopKeys').hidden).toBe(false);
    expect([...$('shopRows').querySelectorAll('[data-mod]')].map(b => (b as HTMLElement).dataset.mod)).toEqual(['bowls', 'street', 'cellarcrew']);
    expect([...$('shopRows').querySelectorAll<HTMLElement>('[data-tile]')].map(b => b.dataset.tile)).toEqual(['rack', 'washer', 'barrel', 'salter', 'steam', 'smoke', 'cook', 'attendant']);
    const row = (id: string) => $('shopRows').querySelector<HTMLElement>(`[data-tile="${id}"]`)!;
    const price = (id: string) => row(id).querySelector<HTMLButtonElement>('button.cost')!;
    // (a line's machines as dots)
    expect(row('rack').querySelector('b')!.textContent).toBe('Drying rack');
    expect(row('rack').querySelector('.pips')!.getAttribute('aria-label')).toBe('1 of 6');
    expect(row('rack').querySelectorAll('.pips i.on').length).toBe(1);
    expect(row('rack').textContent).toContain('More room on the rice line');
    expect(price('rack').textContent).toBe('🐡 10');
    expect(price('rack').disabled).toBe(false);
    // the steam baskets wait on the second boss, and say so
    expect(row('steam').classList.contains('locked')).toBe(true);
    expect(row('steam').textContent).toContain('After beating Yokobashiri 🦀');
    expect(price('steam').disabled).toBe(true);
    // one click on its price buys it
    price('rack').click();
    g.run(0.1);
    expect(F().lines.rice.n).toBe(2);
    expect(row('rack').querySelector('.pips')!.getAttribute('aria-label')).toBe('2 of 6');
    // what's done stays in its place, ticked
    price('washer').click();
    g.run(0.1);
    expect(row('washer').classList.contains('done')).toBe(true);
    expect(price('washer').textContent).toBe('✓');
    // the grow room's things join in once the grow room's found
    g.layout.found.grow = true;
    g.run(0.1);
    expect(heads()).toEqual(['The ring', 'Prep hall', 'Grow room', 'Hearth room']);
    expect($('shopRows').querySelector('[data-tile="bed"]')).not.toBeNull();
    // a heading folds its room away, and so does its number key
    const box = (t: string) => $('shopRows').querySelector<HTMLElement>(`[data-of="${t}"]`)!;
    $('shopRows').querySelector<HTMLElement>('.sect[data-sect="ring"]')!.click();
    expect(box('ring').hidden).toBe(true);
    expect($('shopRows').querySelector('.sect[data-sect="ring"]')!.getAttribute('aria-expanded')).toBe('false');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1' }));
    expect(box('ring').hidden).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2' }));
    expect(box('prep').hidden).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2' }));
    expect(box('prep').hidden).toBe(false);
    // E buys the line under the mouse
    const barrels = F().lines.fish.n;
    row('barrel').querySelector('.sub')!.dispatchEvent(new Event('pointerover', { bubbles: true }));
    g.press('e'); g.run(0.1); g.press('e', 'keyup');
    expect(F().lines.fish.n).toBe(barrels + 1);
  });

  it('hires the crew, who run their lines and the pot by themselves', async () => {
    const { g, buy, F } = await ring({ money: 10_000_000, ring: { beaten: 3, hires: { picker: true }, lines: { mush: { n: 3 } } } });
    for (const id of ['washer', 'salter', 'cook', 'attendant']) buy(id);
    expect(F().crew.map(w => w.role).sort()).toEqual(['attendant', 'cook', 'picker', 'salter', 'washer']);
    g.placePlayer(0, 0);
    g.player.g.position.y = (await import('../src/cellar')).CY;
    const money = g.wallet.money;
    g.run(120, 1 / 30);
    expect(F().stall.length + F().fed.length).toBeGreaterThan(0);
    expect(F().cooked.length).toBeGreaterThan(0);
    expect(g.wallet.money).toBeGreaterThan(money);
  }, 30_000);

  it('opens with the bosses: the tiers build the venue up and bring more fans', async () => {
    const { g, buy, F, fight, cellar } = await ring({ money: 10_000_000 });
    expect(offered(g)).not.toContain('tier1');
    expect(offered(g)).not.toContain('cook');
    F().beaten = 1;
    g.run(0.1);
    expect(offered(g)).toContain('tier1');
    const before = fight.crowdNow();
    buy('tier1');
    expect(F().tier).toBe(1);
    expect(cellar.parts.bleachers.visible).toBe(true);
    expect(fight.crowdNow()).toBeGreaterThan(before);
    expect(offered(g)).not.toContain('tier2');
  });
});

describe('the swarm and the watch spot', () => {
  it('the waiting fans stand on the floor before the stall', async () => {
    const { g, swarm, F } = await ring();
    g.run(10);
    expect(F().queue.length).toBeGreaterThan(3);
    expect(swarm.swarm().n).toBe(F().queue.length);
    expect(swarm.swarm().shadows).toBe(true);
  });

  it('a boss\'s crowd walks round the ring, the stands and the stall to its seats, never through them', async () => {
    const { g, fight, swarm, cellar, F } = await ring({ ring: { tier: 2 } });
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 61 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    g.run(0.3);
    const A = g.layout.ARENA, boxes = cellar.cellarBoxes().filter(([cx, cz, hx, hz]) => cx + hx > A.x0 && cx - hx < A.x1 && cz + hz > A.z0 && cz - hz < A.z1);
    const inside = (x: number, z: number) => boxes.some(([cx, cz, hx, hz]) => Math.abs(x - cx) < hx - 0.02 && Math.abs(z - cz) < hz - 0.02);
    let legs = 0;
    for (const way of swarm.ways()) {
      for (let i = 1; i < way.length; i++) {
        const a = way[i - 1], b = way[i];
        // (stepping down off a bench, or up onto one, is the only way into a stand's footprint)
        if (inside(a.x, a.z) || inside(b.x, b.z)) continue;
        legs++;
        for (let k = 0; k <= 30; k++) {
          const x = a.x + (b.x - a.x) * k / 30, z = a.z + (b.z - a.z) * k / 30;
          expect(inside(x, z), `${x.toFixed(2)}, ${z.toFixed(2)} on ${JSON.stringify(way.map(w => [+w.x.toFixed(2), +w.z.toFixed(2)]))}`).toBe(false);
          expect(x > A.x0 && x < A.x1 && z > A.z0 && z < A.z1).toBe(true);
        }
      }
    }
    expect(legs).toBeGreaterThan(50);
    // and they all sit down, the benches first
    g.run(fight.BOUT.sit + 2);
    expect(swarm.swarm()).toMatchObject({ n: 120, seated: 120 });
    expect(swarm.swarm().benched).toBeGreaterThan(60);
  });

  it('standing on the watch spot closes the camera in on the bout, with the names over it', async () => {
    const { g, plan, gong, stage, at } = await ring();
    at(plan.WATCH);
    g.run(3);
    expect(gong.watching()).toBe(true);
    expect(stage.view.zoom).toBeLessThan(stage.CELLAR_ZOOM);
    expect($('boutLine').hidden).toBe(false);
    expect($('boutLine').textContent).toContain('Chunkos against');
    at(plan.STALL_PAD);
    g.run(3);
    expect(gong.watching()).toBe(false);
    expect($('boutLine').hidden).toBe(true);
  });

  it('bouts go on between boss nights: the fans buy soup, sit, the fight, and the result', async () => {
    const { g, fight, F } = await ring();
    const seen = new Set<string>();
    g.runUntil(() => { seen.add(F().bout.phase); return F().bout.n >= 1 && F().bout.phase === 'prep'; }, fight.BOUT.prep + fight.BOUT.sit + fight.BOUT.fight + fight.BOUT.pay + 5);
    expect([...seen]).toEqual(['prep', 'sit', 'fight', 'pay']);
  });
});

describe('the buyout, and the front', () => {
  it("buying Mr. Fugu out: he goes, his share ends, the restaurant's till comes back, and stage 4 is hinted at", async () => {
    const { g, cellar, front, fight, buy } = await ring({ money: 12_500_000, ring: RING_DONE });
    buy('buyout');
    expect(front.front.boughtOut).toBe(true);
    expect(fight.F.boughtOut).toBe(true);
    expect(fight.bowlPrice(false)).toBe(fight.listPrice(false));
    expect(cellar.boss.visible).toBe(false);
    expect($('banner').textContent).toBe('Stage 3 completeThe Dohyo Below');
    expect($('stageCount').textContent).toBe('Complete');
    g.run(7);
    expect(g.stage.staging()).toBe(false);
  });

  it("in stage 3 the restaurant's takings are Mr. Fugu's rent (or a trickle, for the playtest), and its reviews don't count", async () => {
    const { front } = await ring();
    expect(front.tillShare()).toBe(0);
    expect(front.toTill([30, 30])).toEqual([]);
    front.front.mode = 'trickle';
    expect(front.toTill([30, 30])).toEqual([6, 6]);
    front.front.boughtOut = true;
    expect(front.toTill([30, 30])).toEqual([30, 30]);
    const { reviews } = await import('../src/rating');
    const n = reviews.length;
    front.frontReview(1);
    expect(reviews).toHaveLength(n);
  });

  it('diners upstairs still eat, but pay nothing into the register while it is rent', async () => {
    const { g } = await ring({ level: 0, plates: 30 });
    g.run(60);
    expect(g.restaurant.sushi.diners.length).toBeGreaterThan(0);
    expect(g.restaurant.register.n).toBe(0);
  });

  it('reads the playtest switch from the address', async () => {
    history.replaceState(null, '', '/?front=trickle');
    const { front } = await ring();
    expect(front.front.mode).toBe('trickle');
    history.replaceState(null, '', '/');
  });
});

describe("Mr. Fugu's office", () => {
  it('he has a word for whoever steps up to his desk: a new one each time, by how the ring is doing', async () => {
    const { g, F, at } = await ring();
    const office = await import('../src/office');
    const lines = office.fuguLines();
    expect(lines[0]).toContain('Thirty percent');
    expect(lines.join(' ')).toContain('Hakkaku');
    expect(office.fuguSays()).toBe('');
    at(office.DESK_PAD);
    g.run(0.2);
    expect(office.fuguSays()).toBe(lines[0]);
    // standing there, he doesn't repeat himself; off and back on, the next line
    g.run(1);
    expect(office.fuguSays()).toBe(lines[0]);
    at({ x: office.DESK_PAD.x, z: office.DESK_PAD.z + 2 });
    g.run(0.2);
    at(office.DESK_PAD);
    g.run(0.2);
    expect(office.fuguSays()).toBe(lines[1]);
    // and the bubble goes after a while
    g.run(10);
    expect(office.fuguSays()).toBe('');
    // a boss beaten: the grow room's his secret
    F().beaten = 1;
    expect(office.fuguLines().join(' ')).toContain('mushrooms');
    F().boughtOut = true;
    expect(office.fuguLines()[0]).toContain('your house');
  });
});

describe("the workshop's crafting bench", () => {
  it('is through the hearth room, and sells bowl price, fans and crew too, priced in chips', async () => {
    const { g, cellar, plan, at } = await ring({ money: 100_000_000 });
    expect(cellar.roomAt(plan.BENCH_PAD)).toBe('craft');
    expect(cellar.cellarWay(cellar.LADDER_FOOT, plan.BENCH_PAD).map(w => cellar.roomAt(w))).toContain('kitchen');
    at(plan.BENCH_PAD);
    g.run(0.1);
    expect($('shop').hidden).toBe(false);
    expect([...$('shopRows').querySelectorAll('[data-mod]')].map(b => (b as HTMLElement).dataset.mod)).toEqual(['bowls', 'street', 'cellarcrew']);
    expect($('shopRows').textContent).toContain('🐡');
    // (and it leaves the camera where it is)
    expect($('shop').dataset.still).toBe('1');
    // the same spot upstairs is just the dock
    g.stage.setLevel(false);
    g.placePlayer(plan.BENCH_PAD.x, plan.BENCH_PAD.z);
    g.run(0.1);
    expect($('shop').hidden).toBe(true);
    expect($('craft').hidden).toBe(true);
  });

  it('on a touch screen it opens folded, a Craft button out of the thumb\'s way, with a ✕ to fold it again', async () => {
    const { g, plan, at } = await ring({ money: 10_000_000 });
    // (a first touch: the game's a touch screen's from then on)
    window.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch' }));
    at(plan.BENCH_PAD);
    g.run(0.1);
    expect($('shop').hidden).toBe(true);
    expect($('craft').hidden).toBe(false);
    expect(Number($('craftN').textContent)).toBeGreaterThan(0);
    $('craft').click();
    expect($('shop').hidden).toBe(false);
    expect($('craft').hidden).toBe(true);
    expect($('shopShut').hidden).toBe(false);
    // (a tab each, opening on one with something to buy, a dot on each with something there are the chips for)
    const tabs = () => [...$('shopTabs').querySelectorAll<HTMLButtonElement>('[data-tab]')];
    expect(tabs().map(b => b.dataset.tab)).toEqual(['ring', 'prep', 'hearth']);
    expect(tabs().find(b => b.getAttribute('aria-selected') === 'true')!.dataset.tab).toBe('prep');
    expect(tabs().map(b => b.classList.contains('can'))).toEqual([true, true, false]);
    // (a card each, in its place: the rice line's along the top, the fish line's under it)
    const card = (id: string) => $('shopRows').querySelector<HTMLButtonElement>(`[data-tile="${id}"]`)!;
    expect([...$('shopRows').querySelectorAll<HTMLButtonElement>('[data-tile]')].map(b => b.dataset.tile)).toEqual(['rack', 'washer', 'steam', 'barrel', 'salter', 'smoke']);
    expect(card('rack').getAttribute('aria-pressed')).toBe('true');
    expect($('shopPick').textContent).toContain('More room on the rice line');
    const buy = () => $('shopPick').querySelector<HTMLButtonElement>('.buy')!;
    card('steam').click();
    expect($('shopPick').textContent).toContain('After beating Yokobashiri 🦀');
    expect(buy().disabled).toBe(true);
    // pick, then buy
    card('rack').click();
    buy().click();
    g.run(0.1);
    expect(card('rack').textContent).toContain('2/6');
    tabs()[2].click();
    expect([...$('shopRows').querySelectorAll<HTMLButtonElement>('[data-tile]')].map(b => b.dataset.tile)).toEqual(['cook', 'attendant']);
    $('shopShut').click();
    expect($('shop').hidden).toBe(true);
    expect($('craft').hidden).toBe(false);
    // walking off puts it away, and back on it's folded again
    at({ x: plan.BENCH_PAD.x + 3, z: plan.BENCH_PAD.z });
    g.run(0.1);
    expect($('craft').hidden).toBe(true);
    at(plan.BENCH_PAD);
    g.run(0.1);
    expect($('shop').hidden).toBe(true);
    expect($('craft').hidden).toBe(false);
  });

  it('has nothing to buy on the landing or in the rooms any more', async () => {
    const { g, at } = await ring({ money: 100_000_000, ring: { beaten: 1 } });
    const { LANDING, PREP, KITCHEN, GROW } = g.layout;
    for (const r of [LANDING, PREP, KITCHEN, GROW]) {
      at({ x: (r.x0 + r.x1) / 2 - 1.0, z: (r.z0 + r.z1) / 2 });
      g.run(0.1);
      expect($('shop').hidden).toBe(true);
      expect($('craft').hidden).toBe(true);
    }
  });
});

describe('saving the cellar', () => {
  it('round-trips the lines, the crew, the ledge, the bowls, what the player carries, and the level', async () => {
    const { g, F, buy, plan, at } = await ring({ money: 10_000_000 });
    buy('rack');
    buy('washer');
    F().pantry.fish = 7;
    F().counter.push(false, false, true);
    F().stall.push(false);
    F().beaten = 2;
    at(plan.BIN_PADS.fish);
    g.run(3);
    at(plan.STALL_PAD);
    g.run(0.1);
    g.render.scene.remove(g.player.back.takeKind('fish')!);
    g.player.back.put(g.items.newBowl(true));
    const carried = g.player.back.count('fish');
    g.saveMod.save();
    const raw = JSON.parse(localStorage.getItem('floe-market-v1')!);
    expect(raw.v).toBe(6);
    const r2 = await ring(raw);
    const f = r2.F();
    expect(r2.g.layout.level.down).toBe(true);
    expect(f.lines.rice.n).toBe(2);
    expect(f.hires.washer).toBe(true);
    expect(f.crew.map(w => w.role)).toContain('washer');
    expect(f.pantry.fish).toBe(7);
    expect(f.counter).toEqual([false, false, true]);
    expect(f.beaten).toBe(2);
    expect(r2.g.player.back.count('fish')).toBe(carried);
    expect(r2.g.player.back.all().filter(m => m.userData.kind === 'bowl' && m.userData.mush)).toHaveLength(1);
    // the tiles follow: the next rack's price, the washer bought, the grow room found
    expect(r2.g.unlocks.tiles.find(t => t.id === 'rack')!.cost).toBe(15_000);
    expect(r2.g.unlocks.tiles.find(t => t.id === 'washer')!.done).toBe(true);
    expect(r2.g.layout.found.grow).toBe(true);
    expect($('stageCount').textContent).toBe('2/5');
  });

  it('a rush cut short by closing the page is called off, no win and no loss', async () => {
    const { g, fight } = await ring();
    fight.ringGong();
    g.run(2);
    g.saveMod.save();
    const r2 = await ring(JSON.parse(localStorage.getItem('floe-market-v1')!));
    expect(r2.F().rush).toBeNull();
    expect(r2.F().beaten).toBe(0);
    expect(r2.fight.ringGong()).toBe(true);
  });

  it('cleans up a bad cellar in a save, and starts an old design\'s ring over', async () => {
    const g = await loadGame();
    const { fightFrom } = await import('../src/fight');
    const f = fightFrom({ beaten: 99, tier: -4, lines: { rice: { n: 40, m: [{ items: [5, 'x', -1] }] } }, pantry: { rice: 1e9 }, counter: 'no', hires: { cook: 1, wizard: true } });
    expect(f.beaten).toBe(5);
    expect(f.tier).toBe(0);
    expect(f.lines.rice.n).toBe(6);
    expect(f.lines.rice.m[0].items).toEqual([1, 0]);
    expect(f.pantry.rice).toBe(40);
    expect(f.counter).toEqual([]);
    expect(Object.keys(f.hires)).toEqual(['cook']);
    expect(fightFrom('junk').beaten).toBe(0);
    // version 5's ring (the stable and the book) starts over
    const s = g.saveMod.migrate({ v: 5, money: 5, ring: { names: ['Big Al'], kg: [150] }, level: 7 });
    expect(s.ring).toBeNull();
    expect(s.level).toBe(1);
    expect(s.v).toBe(6);
  });
});

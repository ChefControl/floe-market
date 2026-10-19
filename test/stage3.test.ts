// Stage 3, Fight Night: Mr. Fugu's sumo ring in the cellar under the dock. Buying in, the ladder, the rooms (and the
// grow room behind the prep hall's wall), the kitchen worked by hand (the dumbwaiter's bins, the racks and barrels,
// the pot, the counter, the soup bar) and the fans who pay for bowls, the gong and its forecast, a boss's rush and the
// card after it, the cellar's tiles (machines again and again, hires, tiers) bought with Fugu Chips, the swarm on the
// floor, the watch spot, the buyout, the restaurant upstairs as the front, and saving it all.
import { BufferGeometry, ExtrudeGeometry, ShapeGeometry, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import indexHtml from '../index.html?raw';
import { bought, FLOE_SUSHI, loadGame, MARKET, RING_DONE, type SaveFixture } from './helpers';
import { makeRing } from '../src/finishRig';

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
    // what stage 2 made stays upstairs in the restaurant's till: the cellar starts from no chips
    expect(g.wallet.money).toBe(0);
    expect((await import('../src/front')).front.till).toBe(100_000);
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
    expect(front.till).toBe(499_000_000);
    g.saveMod.save();
    const g2 = await loadGame(localStorage.getItem('floe-market-v1')!);
    expect(g2.wallet.money).toBe(0);
    expect((await import('../src/front')).front.till).toBe(499_000_000);
  // (a stage 2 and a stage 3 game loaded: about 15 s on CI under coverage)
  }, 30_000);

  it('a stage 3 save from before the till keeps what the cellar can have paid it, and the rest goes in the till', async () => {
    // (two bosses beaten: the practice, Hakkaku and Yokobashiri paid 35 + 350 + 250 chips, and Dobu's 300 is next)
    const { front, F } = await ring({ money: 499_000_000, till: null, ring: { beaten: 2 } });
    expect(F().beaten).toBe(2);
    const keep = (35 + 350 + 250 + 300) * 1000;
    expect(front.front.till).toBe(499_000_000 - keep);
    expect((await import('../src/wallet')).wallet.money).toBe(keep);
  });

  it("a stage 3 save from before the till that's in the cellar's budget keeps its chips", async () => {
    const { front } = await ring({ money: 400_000, till: null, ring: { beaten: 2 } });
    expect(front.front.till).toBe(0);
    expect((await import('../src/wallet')).wallet.money).toBe(400_000);
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
    // the fans walk in and eat: each bowl's chips, less Mr. Fugu's 30%, go into the wallet
    g.runUntil(() => F().stall.length === 0, 200);
    g.run(0.1);
    expect(g.wallet.money - money).toBeCloseTo(n * fight.PRICE * fight.CUT * fight.CHIP, 0);
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

describe('a bout', () => {
  it('the fans buy soup and sit down round the ring, the hungry go home, and the champion wins the local', async () => {
    const { g, fight, swarm, F } = await ring();
    const crowd = fight.crowdNow(), mine = Math.ceil((crowd + 1) / 2);
    for (let i = 0; i < mine; i++) fight.toStall(false);
    // the preparation: they come in and crowd round the soup bar, and the ones who eat go and sit on the champion's
    // side (a local's the free show, told by the arena alone: no tug of war at the top of the screen)
    g.run(3);
    g.ui.hud(0);
    expect(F().bout.phase).toBe('prep');
    expect($('rush').hidden).toBe(true);
    // (nobody eats from afar: there's soup on the bar, but they've still to walk up to it from their tunnel)
    expect(F().bout.came).toBeGreaterThan(0);
    expect(F().bout.fed).toBe(0);
    expect(F().stall).toHaveLength(mine);
    // (the first is served as soon as they've been in long enough to reach it)
    g.runUntil(() => F().bout.fed > 0, fight.REACH);
    expect(F().bout.fed).toBeGreaterThan(0);
    // (each one served steps up to a spot at the bar for their bowl, in their own colour, and turns yours there)
    const { BAR_SPOTS } = await import('../src/cellarPlan');
    for (let i = 0; i < 200 && swarm.swarm().ours < mine; i++) {
      g.run(0.1);
      for (const f of swarm.turnedAt()) expect(Math.min(...BAR_SPOTS.map(s => Math.hypot(f.x - s.x, f.z - s.z)))).toBeLessThan(0.05);
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
    // then they go home, and the next bout's fans come in; with nothing on the bar they all go home hungry, and the
    // champion still wins
    F().stall.length = 0;
    g.run(fight.BOUT.pay + 0.1);
    expect(F().bout).toMatchObject({ phase: 'prep', fed: 0 });
    g.run(fight.BOUT.prep + fight.BOUT.sit + 1);
    expect(swarm.swarm().n).toBe(0);
    g.run(fight.BOUT.fight);
    expect(F().bout.win).toBe(true);
  }, 30_000);

  it('the fans go home at a walk, the hungry ones and the rest after the bout, never in a jump', async () => {
    const { g, fight, swarm, F } = await ring();
    const crowd = fight.crowdNow();
    for (let i = 0; i < Math.ceil(crowd / 2); i++) fight.toStall(false);
    const was = new Map<number, { x: number; z: number }>();
    let fastest = 0, leaving = 0;
    const DT = 0.05, end = F().bout.n + 1;
    for (let i = 0; i < 4000 && F().bout.n <= end; i++) {
      g.run(DT);
      for (const f of swarm.whereabouts()) {
        const p = was.get(f.key);
        if (f.out && p) { fastest = Math.max(fastest, Math.hypot(f.x - p.x, f.z - p.z) / DT); leaving++; }
        was.set(f.key, { x: f.x, z: f.z });
      }
    }
    // (hungry ones went home when the fans sat down, and everyone after the result)
    expect(leaving).toBeGreaterThan(100);
    expect(fastest).toBeLessThan(3.5);
  }, 30_000);
});

describe('the crowd', () => {
  it('shouts in speech bubbles: an empty soup bar gets them asking for their chanko', async () => {
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
  it('its panel names the next boss and your chances; ringing it walks him in, and brings his crowd onto the floor', async () => {
    const { g, plan, swarm, fight, gong, at, F } = await ring();
    at(plan.GONG_PAD);
    g.run(0.3);
    expect($('gong').hidden).toBe(false);
    // Chunkos against him, what he brings (his crowd, his bell, his prize), and your chances in a word
    expect($('gongBoss').textContent).toBe('Hakkaku');
    expect([...$('gongCrowd').children].map(c => c.textContent)).toEqual(['👥 160', '🔔 30 s', '🐡 350']);
    const said = gong.VERDICT[gong.verdict(fight.BOSSES[0], fight.forecast()!)];
    expect($('gongCast').textContent).toBe(`Your chances${said}`);
    expect($('gongCast').querySelector('.seal')!.className).toMatch(/^seal v-/);
    expect($('gongGo').textContent).toBe('Ring the gong');
    // (their faces: here, with no WebGL to render them, their emoji)
    expect($('gongYouP').textContent).toBe('🍙');
    expect($('gongThemP').textContent).toBe('🐙');
    // ring it anyway: no fee
    const money = g.wallet.money;
    g.press('e');
    g.run(0.1);
    g.press('e', 'keyup');
    expect(F().rush).toMatchObject({ boss: 0, n: 160, turned: 0 });
    expect(g.wallet.money).toBe(money);
    // 入場: his name, his crowd, and how many to turn
    expect($('fightBanner').hidden).toBe(false);
    expect($('fightBanner').textContent).toBe('入場Hakkaku 🐙 · 160 fansTURN 81 TO WIN');
    expect($('rush').hidden).toBe(false);
    g.ui.hud(0);
    expect($('rushYou').textContent).toBe('Chunkos 0');
    expect($('rushBell').textContent).toBe('🔔 30');
    expect($('rushThem').textContent).toBe('160 Hakkaku');
    // (his goal marked on the rope: 81 of 160)
    expect($('rushGoal').hidden).toBe(false);
    expect($('rushGoal').style.left).toBe('50.6%');
    expect($('rushKnot').hidden).toBe(true);
    expect($('gongGo').hidden).toBe(true);
    // his bell waits for them all to walk in to the bar, and nobody buys on the way
    fight.toStall(false);
    g.run(fight.WALK_IN - 0.2);
    g.ui.hud(0);
    expect($('rushBell').textContent).toBe('🔔 30');
    expect(F().rush!.turned).toBe(0);
    g.run(0.4);
    g.ui.hud(0);
    expect(F().rush!.turned).toBe(1);
    expect($('rushYou').textContent).toBe('Chunkos 1');
    expect($('rushThem').textContent).toBe('159 Hakkaku');
    // (and the banner's gone by then)
    expect($('fightBanner').hidden).toBe(true);
    // (all of them round the bar by then, on the floor, but the one just turned, off to a spot at the bar for
    // their bowl, and only yours once they've got it; and a few waiting fans stepping along the bar to make room)
    expect(swarm.ways().length).toBe(160);
    expect(swarm.ways().filter(w => w.length === 1).length).toBeGreaterThanOrEqual(156);
    expect(swarm.swarm()).toMatchObject({ n: 160, ours: 0 });
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
    // (a local fight on: he walks in once it's over, and the forecast knew)
    expect(f.F.called).toBe(true);
    while (f.F.called) f.step(0.05);
    for (let n = 0; n < 4000 && !f.F.rush!.done; n++) f.step(0.05);
    expect(f.F.rush!.turned).toBe(fc.turned);
    expect(f.F.rush!.win).toBe(fc.turned >= f.toBeat(fc.boss));
  });

  it("the faces are rendered once from each wrestler's own model, close up, and never touch the luck", async () => {
    await ring({ level: 0 });
    const { renderer } = await import('../src/render'), P = await import('../src/portraits');
    // (a renderer that can draw off the screen and read it back, as a real one can)
    const shots: number[] = [];
    Object.assign(renderer, {
      getRenderTarget: () => null, getClearAlpha: () => 1, setRenderTarget() {}, setClearAlpha() {}, clear() {},
      readRenderTargetPixels: (_t: unknown, _x: number, _y: number, w: number, _h: number, px: Uint8Array) => { shots.push(w); px.fill(200); },
    });
    const ctx = document.createElement('canvas').getContext('2d') as unknown as Record<string, unknown>;
    ctx.createImageData = (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) });
    const url = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,FACE');
    const luck = Math.random;
    let drawn = 0;
    Math.random = () => { drawn++; return luck(); };
    try {
      const who = ['champ', 'local', 'octopus', 'crab', 'catfish', 'shark', 'puffer'] as const;
      expect(who.map(w => P.portrait(w))).toEqual(who.map(() => 'data:image/png;base64,FACE'));
      // once each, sharp (192 pixels across), and kept
      expect(shots).toEqual(who.map(() => 192));
      P.portrait('crab');
      expect(shots).toHaveLength(who.length);
    } finally { Math.random = luck; url.mockRestore(); }
    expect(drawn).toBe(0);
    // on the page: the picture, and no emoji
    const el = document.createElement('i');
    P.showFace(el, 'shark', '🦈');
    expect(el.style.backgroundImage).toBe('url("data:image/png;base64,FACE")');
    expect(el.textContent).toBe('');
  });

  it("your chances are a word, by how many the forecast turns of the more than half that beats him", async () => {
    const { fight, gong } = await ring({ level: 0 });
    const boss = fight.BOSSES[2], at = (turned: number, n?: number) => gong.verdict(boss, { boss, turned, worst: null, at: 0 }, n);
    // a crowd of 220: 111 beat him
    expect([134, 133, 111, 110, 95, 94, 67, 66, 0].map(t => at(t, 220))).toEqual(
      ['win', 'likelywin', 'likelywin', 'maybe', 'maybe', 'likelylose', 'likelylose', 'lose', 'lose']);
    // (with a fix holding, 66 of them kept home: 78 of 154 beat him)
    expect(at(78, 154)).toBe('likelywin');
    expect(Object.values(gong.VERDICT)).toEqual(['Win', 'Likely win', 'Maybe', 'Likely lose', 'Lose']);
  });

  it('turning more than half his crowd beats him, after the fight: the prize, the card, and the grow room found', async () => {
    const { g, plan, fight, swarm, cellar, at, F } = await ring();
    at(plan.GONG_PAD);
    g.run(0.1);
    expect(fight.ringGong()).toBe(true);
    const money = g.wallet.money;
    // just enough: 81 of his 160, by the bell
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 81 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().rush).toMatchObject({ turned: 81, win: true });
    // his crowd sits down and the fight's on, but nothing's settled until it's over
    expect(F().bout.phase).toBe('sit');
    expect(F().beaten).toBe(0);
    expect($('fightCard').hidden).toBe(true);
    g.run(fight.BOUT.sit + 1);
    expect(F().bout.phase).toBe('fight');
    expect(swarm.swarm()).toMatchObject({ n: 160, ours: 81 });
    g.run(fight.BOUT.fight);
    expect(F().bout.phase).toBe('pay');
    expect(F().beaten).toBe(1);
    expect(g.wallet.money - money).toBeGreaterThanOrEqual(fight.BOSSES[0].prize * fight.CHIP);
    // the card waits, unseen, for him to land off the mound (and the strip says nothing till then either)
    expect($('fightCard').hidden).toBe(false);
    expect($('fightCard').className).toBe('win wait');
    // (a tight win, 81 of 160: the strip names the champion's reversal, not who won)
    g.ui.hud(0);
    expect($('rushBell').textContent).toBe('TENTACLE TWIST');
    // (the card waits for his move's landing: finishers.ts)
    const { landsOf } = await import('../src/finishers');
    g.runUntil(() => F().bout.t >= landsOf(F().rush, F().bout.finish), 4);
    expect($('fightCard').className).toBe('win wait');
    g.run(0.5);
    expect($('fightCard').hidden).toBe(false);
    expect($('fightCard').className).toBe('win');
    expect($('fightCard').textContent).toBe('勝YOU WIN🐡 350🔓 New: grow room, the attendant, Back-Alley RingTap to close');
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
    expect(offered(g)).toEqual(expect.arrayContaining(['bed', 'picker', 'tier1', 'attendant']));
    // the card goes on a tap
    $('fightCard').click();
    expect($('fightCard').hidden).toBe(true);
  }, 30_000);

  it('a lost rush says how short it was and why, and costs nothing: half his crowd is not enough', async () => {
    const { g, fight, F } = await ring();
    const money = g.wallet.money;
    expect(fight.ringGong()).toBe(true);
    g.run(fight.WALK_IN + fight.BOSSES[0].bell + fight.BOUT.sit + fight.BOUT.fight + 3.9);
    expect(F().rush!.win).toBe(false);
    expect(F().beaten).toBe(0);
    expect(g.wallet.money).toBe(money);
    const card = $('fightCard').textContent!;
    expect($('fightCard').className).toBe('lose');
    expect(card).toBe('負SHORT BY 81🍚 Pot waited on riceTap to close');
    // his crowd clears, and the gong's ready again; a tie (80 of 160) still loses
    g.runUntil(() => !F().rush, 20);
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 80 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().rush).toMatchObject({ turned: 80, win: false });
  }, 30_000);
});

describe('the slam', () => {
  /** A rush on Hakkaku won with `n` of his 160 turned, up to the fight. */
  async function wonBy(n: number) {
    const r = await ring();
    const { g, fight, F } = r;
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < n && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().rush).toMatchObject({ turned: n, win: true });
    g.runUntil(() => F().bout.phase === 'fight', 10);
    return r;
  }

  it('a grand win offers it in the fight: Space as the rings meet lands it, for a fifth more of his prize', async () => {
    const { g, fight, gong, F } = await wonBy(120);
    expect(gong.slamOffered()).toBe(true);
    // (not till the ring starts closing on the champion's face)
    expect($('slamGo').hidden).toBe(true);
    g.runUntil(() => F().bout.t >= fight.SLAM.at - fight.SLAM.lead + 0.1, 12);
    expect($('slamGo').hidden).toBe(false);
    expect($('slamGo').textContent).toBe('SLAM! Space on gold');
    expect($('slamRing').hidden).toBe(false);
    g.runUntil(() => F().bout.t >= fight.SLAM.at - 0.02, 3);
    const money = g.wallet.money;
    g.press(' ');
    g.run(1 / 30);
    g.press(' ', 'keyup');
    expect(F().rush!.slam).toBe(2);
    expect($('slamGo').textContent).toBe('Perfect slam!');
    expect($('slamRing').hidden).toBe(true);
    // one try
    expect(fight.slam()).toBe(-1);
    g.runUntil(() => F().bout.phase === 'pay', 8);
    expect(g.wallet.money - money).toBe(Math.round(350 * 1.2 * fight.CHIP));
    g.run(fight.LANDS + 0.5);
    expect($('fightCard').textContent).toBe('勝YOU WIN🐡 350💥 Slam +🐡 70🔓 New: grow room, the attendant, Back-Alley RingTap to close');
  }, 30_000);

  it('a good one is a tenth more; too soon is a miss; and a plain win offers none', async () => {
    const { fight, F } = await wonBy(120);
    F().bout.t = fight.SLAM.at - 0.25;
    expect(fight.slam()).toBe(1);
    const r2 = await wonBy(125);
    r2.F().bout.t = r2.fight.SLAM.at - r2.fight.SLAM.lead + 0.2;
    expect(r2.fight.slam()).toBe(0);
    const money = r2.g.wallet.money;
    r2.g.runUntil(() => r2.F().bout.phase === 'pay', 15);
    expect(r2.g.wallet.money - money).toBe(350 * r2.fight.CHIP);
    // 119 of 160 is a win, but not a grand one
    const r3 = await wonBy(119);
    expect(r3.gong.slamOffered()).toBe(false);
    r3.g.runUntil(() => r3.F().bout.t >= r3.fight.SLAM.at, 12);
    expect($('slamGo').hidden).toBe(true);
    expect(r3.fight.slam()).toBe(-1);
  }, 60_000);
});

describe('the finishers', () => {
  it("how a boss's fight ends goes by his vote: a grand win, a heavy loss, a tight one, or a push-out", async () => {
    const { fight } = await ring({ level: 0 });
    const F2 = await import('../src/finishers');
    // Hakkaku: 81 of his 160 to turn; tight is within 8 of that
    const end = (turned: number, boss = 0) => {
      const R = { boss, n: fight.bossOf(boss).crowd, turned, win: turned * 2 > fight.bossOf(boss).crowd, slam: -1 } as import('../src/fight').Rush;
      const f = fight.finishOf(R);
      return [f, F2.moveOf(R, f)?.name ?? null];
    };
    expect(end(120)).toEqual(['grand', 'BELT THROW']);
    expect(end(119)).toEqual(['push', null]);
    expect(end(89)).toEqual(['tight', 'TENTACLE TWIST']);
    expect(end(81)).toEqual(['tight', 'TENTACLE TWIST']);
    expect(end(80)).toEqual(['tight', 'INK ESCAPE']);
    expect(end(73)).toEqual(['tight', 'INK ESCAPE']);
    expect(end(72)).toEqual(['push', null]);
    expect(end(41)).toEqual(['push', null]);
    expect(end(40)).toEqual(['heavy', 'EIGHT-ARM WRAP']);
    // every boss has his own, and the champion his own against each
    for (const k of ['octopus', 'crab', 'catfish', 'shark', 'puffer'] as const) {
      const m = F2.MOVES[k];
      expect(new Set([m.tight.name, m.heavy.name, m.champTight.name, m.champGrand.name]).size).toBe(4);
      for (const mv of Object.values(m)) expect(mv.name.split(' ').length).toBeLessThanOrEqual(3);
    }
    expect(end(0, 4)).toEqual(['heavy', 'PUFF BOUNCE']);
    expect(end(940, 4)).toEqual(['grand', 'BIG SQUEEZE']);
    // (the practice fight: the sparring partner's)
    expect(end(30, -1)).toEqual(['grand', 'BELT THROW']);
  });

  /** Whether he's down: his middle low over the ground under him (lying, or sat). */
  const down = (r: import('../src/rikishi').RikishiModel, c: typeof import('../src/cellar')) => {
    const v = r.hips.getWorldPosition(new Vector3()), rg = makeRing(c.RING_TOP, c.RING_HALF, c.RING_R, c.PIT_STEPS);
    return v.y - c.CY - rg.ground(v.x - c.RING.x, v.z - c.RING.z) < 0.45;
  };
  it('a tight win goes the wrong way first, then the champion turns it at his own straw', async () => {
    const { g, fight, dohyo, cellar, F } = await ring();
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 82 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().bout.finish).toBe('tight');
    g.runUntil(() => F().bout.phase === 'fight' && F().bout.t > fight.BOUT.fight - 0.3, 25);
    // (the champion's the one at the straw: his own, east)
    expect(F().bout.tug).toBeLessThan(-0.6);
    expect(dohyo.ring.champ.position.x - cellar.RING.x).toBeGreaterThan(1);
    g.runUntil(() => F().bout.phase === 'pay' && F().bout.t >= 0.6, 3);
    g.ui.hud(0);
    expect($('rushBell').textContent).toBe('TENTACLE TWIST');
    // (down by the time the card shows: finishRig's own test checks how each move gets him there)
    const { landsOf } = await import('../src/finishers');
    g.runUntil(() => F().bout.t >= landsOf(F().rush, 'tight') + 0.2, 6);
    expect(down(dohyo.ring.rival, cellar)).toBe(true);
    g.run(1.2);
    g.ui.hud(0);
    expect($('rushBell').textContent).toBe('WIN!');
    expect(F().beaten).toBe(1);
  }, 30_000);

  it("the crab's own: under half needed, his heavy finisher; just short, his tight one", async () => {
    const { g, fight, dohyo, cellar, F } = await ring({ ring: { beaten: 1, lines: { mush: { n: 1 } } } });
    const { landsOf } = await import('../src/finishers');
    const lose = async (n: number) => {
      g.runUntil(() => !F().rush, 30);
      expect(fight.ringGong()).toBe(true);
      g.runUntil(() => { while (F().rush!.turned + F().stall.length < n && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
      g.runUntil(() => F().bout.phase === 'pay' && F().bout.t >= 0.6, 25);
    };
    // under half of the 221 needed: Crab shuffle
    await lose(30);
    expect(F().bout.finish).toBe('heavy');
    g.ui.hud(0);
    expect($('rushBell').textContent).toBe('CRAB SHUFFLE');
    g.runUntil(() => F().bout.t >= landsOf(F().rush, 'heavy') + 0.2, 6);
    expect(down(dohyo.ring.champ, cellar)).toBe(true);
    // just short, 210 of 221: Side step
    await lose(210);
    expect(F().bout.finish).toBe('tight');
    g.ui.hud(0);
    expect($('rushBell').textContent).toBe('SIDE STEP');
    g.runUntil(() => F().bout.t >= landsOf(F().rush, 'tight') + 0.2, 6);
    expect(down(dohyo.ring.champ, cellar)).toBe(true);
  }, 60_000);

  it("a heavy loss ends with the boss's own move; a plain win with the push-out west", async () => {
    const { g, fight, dohyo, cellar, F } = await ring();
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 20 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().bout.finish).toBe('heavy');
    g.runUntil(() => F().bout.phase === 'pay' && F().bout.t >= 0.6, 25);
    g.ui.hud(0);
    expect($('rushBell').textContent).toBe('EIGHT-ARM WRAP');
    const { landsOf } = await import('../src/finishers');
    g.runUntil(() => F().bout.t >= landsOf(F().rush, 'heavy') + 0.2, 6);
    expect(down(dohyo.ring.champ, cellar)).toBe(true);
    g.runUntil(() => !F().rush, 15);
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 90 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
    expect(F().bout.finish).toBe('push');
    g.runUntil(() => F().bout.phase === 'pay' && F().bout.t >= fight.LANDS + 0.2, 25);
    expect(dohyo.ring.rival.position.x - cellar.RING.x).toBeLessThan(-cellar.RING_HALF);
  }, 60_000);
});

describe('the gong during a local fight', () => {
  it('waits for it: the champion finishes it there and then, and the boss walks in as its fans go home', async () => {
    const { g, plan, fight, at, F } = await ring();
    g.runUntil(() => F().bout.phase === 'fight' && F().bout.t > 4, 50);
    const n = F().bout.n, t0 = F().t;
    at(plan.GONG_PAD);
    g.press('e');
    g.run(0.05);
    g.press('e', 'keyup');
    // no boss yet: the local's result at once, the champion's, and the gong can't be rung twice
    expect(F().rush).toBeNull();
    expect(F().called).toBe(true);
    expect(F().bout).toMatchObject({ phase: 'pay', win: true, n: n + 1 });
    expect(fight.ringGong()).toBe(false);
    expect(fight.forecast()).toBeNull();
    expect($('gongCast').textContent).toBe('He walks in after this fight');
    expect($('gongGo').hidden).toBe(true);
    expect($('fightBanner').hidden).toBe(true);
    // he lands; the rest of it (the bow, the prize, back to the corners) a little hurried
    g.run(fight.LANDS - 0.2);
    expect(F().rush).toBeNull();
    g.runUntil(() => !!F().rush, 6);
    const took = F().t - t0, want = fight.LANDS + (fight.BOUT.pay - fight.LANDS) / fight.HURRY;
    expect(Math.abs(took - want)).toBeLessThan(0.3);
    expect(took).toBeLessThan(fight.BOUT.pay);
    // then he walks in, banner and all, and his rush starts from the top
    expect(F().called).toBe(false);
    expect(F().rush).toMatchObject({ boss: 0, n: 160, turned: 0, walk: fight.WALK_IN });
    expect(F().bout).toMatchObject({ phase: 'prep', n: n + 1 });
    expect($('fightBanner').hidden).toBe(false);
    expect($('fightBanner').textContent).toBe('入場Hakkaku 🐙 · 160 fansTURN 81 TO WIN');
  });

  it('before the fight, he walks in at once; and a reload while he waits calls him off', async () => {
    const { g, fight, F } = await ring();
    g.runUntil(() => F().bout.phase === 'sit', 30);
    expect(fight.ringGong()).toBe(true);
    expect(F().rush).toMatchObject({ boss: 0, n: 160 });
    g.runUntil(() => !F().rush, 120);
    g.runUntil(() => F().bout.phase === 'fight', 50);
    expect(fight.ringGong()).toBe(true);
    expect(fight.saveFight().called).toBe(false);
    expect(fight.fightFrom(fight.saveFight()).called).toBe(false);
  }, 30_000);

  it('a long name shrinks to fit its box on the gong and the strip, and takes two lines past that', async () => {
    const { gong } = await ring({ level: 0 });
    const el = document.createElement('span');
    document.body.append(el);
    el.textContent = 'Sparring partner';
    let box = 150;
    Object.defineProperty(el, 'clientWidth', { get: () => box });
    Object.defineProperty(el, 'scrollWidth', { get: () => el.textContent!.length * (parseFloat(el.style.fontSize) || 16) * 0.6 });
    gong.fit(el);
    expect(parseFloat(el.style.fontSize)).toBeLessThan(16);
    expect(el.scrollWidth).toBeLessThanOrEqual(150);
    expect(el.classList.contains('two')).toBe(false);
    box = 60;
    gong.fit(el);
    expect(el.classList.contains('two')).toBe(true);
    expect(el.style.fontSize).toBe('');
    box = 400;
    gong.fit(el);
    expect(el.style.fontSize).toBe('');
    expect(el.classList.contains('two')).toBe(false);
  });

  it("the push-out's fall lands when fight.ts says it does", async () => {
    const { fight } = await ring({ level: 0 });
    const { PUSH } = await import('../src/finishers');
    expect(PUSH.lands).toBe(fight.LANDS);
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

  it("the cookware shop sells it all on one board, a column a fight won, with a price that buys it on a click", async () => {
    const { g, plan, at, F } = await ring({ money: 10_000_000 });
    // no tiles of their own on the rooms' floors, or the arena's
    expect(g.unlocks.visibleTiles().filter(t => t.menu)).toEqual([]);
    expect(g.unlocks.tiles.filter(t => t.id.startsWith('tier')).every(t => t.menu === 'venue')).toBe(true);
    at(plan.BENCH_PAD);
    g.run(0.1);
    // (with a mouse and keys, it opens whole, the wide board, with a red ✕ that folds it to the Shop button, as Esc does)
    expect($('shop').hidden).toBe(false);
    expect($('shop').classList.contains('board')).toBe(true);
    expect($('craft').hidden).toBe(true);
    expect($('shopShut').hidden).toBe(false);
    $('shopShut').click();
    expect($('shop').hidden).toBe(true);
    expect($('craft').hidden).toBe(false);
    $('craft').click();
    expect($('shop').hidden).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect($('shop').hidden).toBe(true);
    $('craft').click();
    g.run(0.1);
    expect($('shopTabs').hidden).toBe(true);
    expect($('shopTitle').textContent).toBe('Cookware shop');
    expect($('shopPurse').hidden).toBe(false);
    expect($('shopPurse').textContent).toBe('🐡 10k');
    expect($('shopKeys').hidden).toBe(false);
    // the ring's three levels along the top, then every room's upgrade and the venue's tiers, and the buyout at the end
    expect([...$('shopRows').querySelectorAll('[data-mod]')].map(b => (b as HTMLElement).dataset.mod)).toEqual(['bowls', 'street', 'cellarcrew']);
    expect([...$('shopRows').querySelectorAll<HTMLElement>('[data-tile]')].map(b => b.dataset.tile)).toEqual(
      ['rack', 'washer', 'steam', 'barrel', 'salter', 'smoke', 'bed', 'picker', 'shelves', 'attendant', 'slide', 'cook', 'tier1', 'tier2', 'tier3', 'buyout']);
    // a gate a column: the start, the practice fight (won: the fixture's sparred), then the bosses, Hakkaku next
    const gates = () => [...$('shopRows').querySelectorAll<HTMLElement>('.gate')].map(h => h.className.replace('gate ', ''));
    expect(gates()).toEqual(['start', 'won', 'next', 'later', 'later', 'later', 'later']);
    expect($('shopRows').querySelector('.gate.next')!.textContent).toBe('🐙Next: Hakkaku');
    const node = (id: string) => $('shopRows').querySelector<HTMLElement>(`[data-tile="${id}"]`)!;
    const price = (id: string) => node(id).querySelector<HTMLButtonElement>('button.cost')!;
    // (a line's machines as dots)
    expect(node('rack').querySelector('b')!.textContent).toBe('Drying rack');
    expect(node('rack').querySelector('.pips')!.getAttribute('aria-label')).toBe('1 of 6');
    expect(price('rack').textContent).toBe('🐡 10');
    expect(price('rack').disabled).toBe(false);
    expect(node('rack').classList.contains('can')).toBe(true);
    // the steam baskets wait on the second boss, dark, and the line under the board says so for the one under the mouse
    expect(node('steam').classList.contains('boss')).toBe(true);
    expect(price('steam').textContent).toBe('🔒 🦀');
    expect(price('steam').disabled).toBe(true);
    node('steam').dispatchEvent(new Event('pointerover', { bubbles: true }));
    g.run(0.1);
    expect($('shopPick').textContent).toContain('Beat Yokobashiri 🦀 first');
    // one click on its price buys it, or on the node
    price('rack').click();
    g.run(0.1);
    expect(F().lines.rice.n).toBe(2);
    expect(node('rack').querySelector('.pips')!.getAttribute('aria-label')).toBe('2 of 6');
    node('washer').click();
    g.run(0.1);
    expect(F().hires.washer).toBe(true);
    // what's done stays in its place, gold, ticked, and the line to it gold too
    expect(node('washer').classList.contains('done')).toBe(true);
    expect(price('washer').textContent).toBe('✓');
    expect($('shopRows').querySelectorAll('.edge.gold').length).toBe(1);
    // the venue's tiers are here now: Hakkaku opens the first
    expect(node('tier1').classList.contains('boss')).toBe(true);
    F().beaten = 1;
    g.run(0.1);
    expect(gates()).toEqual(['start', 'won', 'won', 'next', 'later', 'later', 'later']);
    price('tier1').click();
    g.run(0.1);
    expect(F().tier).toBe(1);
    // E buys the one under the mouse
    const barrels = F().lines.fish.n;
    node('barrel').querySelector('b')!.dispatchEvent(new Event('pointerover', { bubbles: true }));
    g.press('e'); g.run(0.1); g.press('e', 'keyup');
    expect(F().lines.fish.n).toBe(barrels + 1);
    // and walking off the bench puts it away, off the screen as well as hidden
    const css = document.head.appendChild(document.createElement('style'));
    css.textContent = [...indexHtml.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
    expect(getComputedStyle($('shop')).display).not.toBe('none');
    at({ x: plan.BENCH_PAD.x + 2, z: plan.BENCH_PAD.z });
    g.run(0.1);
    expect($('shop').hidden).toBe(true);
    expect(getComputedStyle($('shop')).display).toBe('none');
    css.remove();
  });

  it('the tree: the practice fight opens the two hands, and a line\'s big upgrade needs its hand first', async () => {
    // a game that's just come down: the practice fight to come
    const { g, F } = await ring({ money: 10_000_000, ring: { sparred: false, practice: true } });
    g.run(0.1);
    expect(offered(g)).toEqual(expect.arrayContaining(['rack', 'barrel']));
    expect(offered(g)).not.toContain('washer');
    expect(offered(g)).not.toContain('salter');
    // (the tutorial's shop lesson points at the cheapest thing there: the drying rack, still at the start)
    expect([...g.unlocks.menuOffer()].sort((a, b) => a.cost - b.cost)[0].id).toBe('rack');
    F().practice = false; F().sparred = true;
    g.run(0.1);
    expect(offered(g)).toEqual(expect.arrayContaining(['washer', 'salter']));
    // two bosses on: the steam baskets wait for the washer, the cook for the attendant
    F().beaten = 3;
    g.run(0.1);
    expect(offered(g)).not.toContain('steam');
    expect(offered(g)).not.toContain('smoke');
    expect(offered(g)).not.toContain('cook');
    expect(offered(g)).toContain('attendant');
    expect(g.unlocks.buyFromMenu(g.unlocks.tiles.find(t => t.id === 'washer')!)).toBe(true);
    expect(g.unlocks.buyFromMenu(g.unlocks.tiles.find(t => t.id === 'attendant')!)).toBe(true);
    g.run(0.1);
    expect(offered(g)).toEqual(expect.arrayContaining(['steam', 'cook']));
    expect(offered(g)).not.toContain('smoke');
  });

  it("an older game keeps all it bought on the tree, even what it couldn't buy that way now", async () => {
    // from before the practice fight and the tree's lines: steam baskets and a smokehouse with no hands, a cook with
    // no attendant, the second tier, a ring level or two, and more racks
    const { g, plan, at } = await ring({
      money: 1_000_000, mods: { street: 3, bowls: 1 },
      ring: { sparred: false, beaten: 3, tier: 2, hires: { cook: true }, lines: { rice: { n: 4, up: 1 }, fish: { n: 2, up: 1 } } },
    });
    at(plan.BENCH_PAD);
    g.run(0.1);
    const node = (id: string) => $('shopRows').querySelector<HTMLElement>(`[data-tile="${id}"]`)!;
    for (const id of ['steam', 'smoke', 'cook', 'tier1', 'tier2']) expect(node(id).classList.contains('done')).toBe(true);
    expect(node('rack').querySelector('.pips')!.getAttribute('aria-label')).toBe('4 of 6');
    expect(node('barrel').querySelector('.pips')!.getAttribute('aria-label')).toBe('2 of 6');
    // (its levels too)
    expect($('shopRows').querySelector('[data-mod="street"] small')!.textContent).toBe('Level 3');
    expect($('shopRows').querySelector('[data-mod="bowls"] small')!.textContent).toBe('Level 1');
    // what it hasn't bought is where the tree says: the hands on sale (a boss beaten counts the practice won)
    expect(node('washer').classList.contains('can')).toBe(true);
    expect(node('attendant').classList.contains('can')).toBe(true);
    expect(node('tier3').classList.contains('boss')).toBe(true);
  });

  it('hires the crew, who run their lines and the pot by themselves', async () => {
    const { g, buy, F } = await ring({ money: 10_000_000, ring: { beaten: 3, hires: { picker: true }, lines: { mush: { n: 3 } } } });
    for (const id of ['washer', 'salter', 'attendant', 'cook']) buy(id);
    expect(F().crew.map(w => w.role).sort()).toEqual(['attendant', 'cook', 'picker', 'salter', 'washer']);
    g.placePlayer(0, 0);
    g.player.g.position.y = (await import('../src/cellar')).CY;
    const money = g.wallet.money;
    g.run(120, 1 / 30);
    expect(F().stall.length + F().fed.length).toBeGreaterThan(0);
    expect(F().cooked.length).toBeGreaterThan(0);
    expect(g.wallet.money).toBeGreaterThan(money);
  }, 30_000);

  it('serving is taken off the player\'s hands before the pot: the attendant after the first boss, the cook after the third', async () => {
    const { g, F } = await ring({ money: 10_000_000 });
    g.run(0.1);
    expect(offered(g)).not.toContain('attendant');
    F().beaten = 1;
    g.run(0.1);
    expect(offered(g)).toContain('attendant');
    expect(offered(g)).not.toContain('cook');
    F().beaten = 3;
    g.run(0.1);
    // (the cook needs the attendant first, in the shop's tree, and so does the bowl slide: it takes over his carrying)
    expect(offered(g)).not.toContain('cook');
    expect(offered(g)).not.toContain('slide');
    g.unlocks.buyFromMenu(g.unlocks.tiles.find(t => t.id === 'attendant')!);
    g.run(0.1);
    expect(offered(g)).toContain('cook');
    expect(offered(g)).toContain('slide');
  });

  it('a cook cooks full batches out of the pot, and ladles them out twice as fast', async () => {
    const { g, plan, fight, at, F } = await ring({ ring: { beaten: 3 } });
    at(plan.WATCH);
    // the pot ladled out onto the counter, a bowl every LADLE seconds, with nobody else there
    const ladled = () => { F().pot = Array(fight.BATCH).fill(true); F().counter = []; F().pantry = { rice: 0, fish: 0, mush: 0 }; g.run(fight.LADLE * 8 + 0.01); return F().counter.length; };
    const alone = ladled();
    expect(alone).toBeGreaterThan(4);
    // (the cook walks over to the pot, and cooks a batch: as many bowls as the player's)
    fight.hire('cook');
    F().pot = []; F().counter = []; F().cooked = [];
    F().pantry = { rice: 4, fish: 4, mush: 4 };
    g.runUntil(() => F().cooked.length > 0, 20);
    expect(F().pot.length + F().counter.length).toBe(fight.BATCH);
    // and with him at it, the pot's ladled out twice as fast
    expect(ladled()).toBeGreaterThanOrEqual(2 * alone - 1);
  }, 30_000);

  it("once Mama Moray's is open and the bowl line's in, what the pot can't hold, with the ledge stocked, goes there for her cut; never while a boss is in", async () => {
    const { g, fight, F } = await ring({ ring: { beaten: 1 } });
    F().quiet = false; F().resto = 0;
    const stock = () => { F().pot = Array(fight.POT_CAP).fill(true); F().pantry = { rice: fight.LEDGE_CAP, fish: fight.LEDGE_CAP, mush: fight.LEDGE_CAP }; };
    stock();
    // (a ruin out front till Word on the street opens her: nothing goes there; nor, open, till the bowl line's in to
    // take it to her)
    F().slide = true;
    g.economy.mods.street = fight.RESTO_OPENS - 1;
    expect(fight.restoWants()).toBe(false);
    g.economy.mods.street = fight.RESTO_OPENS;
    F().slide = false;
    expect(fight.restoWants()).toBe(false);
    F().slide = true;
    expect(fight.restoWants()).toBe(true);
    const was = F().earned.length;
    fight.playerAtPot(0.6);
    // (a whole batch up the belt, out of the ledge, and her cut of each bowl in the takings)
    expect(F().resto).toBe(fight.BATCH);
    expect(F().pantry.rice).toBe(fight.LEDGE_CAP - fight.PER_BATCH);
    expect(F().earned.length).toBe(was + 1);
    expect(F().earned[F().earned.length - 1][1]).toBeCloseTo(fight.bowlPrice(true) * fight.RESTO_SHARE * fight.BATCH);
    // a boss in: the pot keeps it all for his crowd
    stock();
    expect(fight.ringGong()).toBe(true);
    while (F().called) fight.step(0.05);
    stock();
    expect(fight.restoWants()).toBe(false);
  }, 30_000);

  it("Mama Moray's starts a wreck, is cleared up, and opens at Word on the street's fifth level, with a word from her", async () => {
    const { g, fight, F } = await ring({ ring: { beaten: 1 } });
    const rs = await import('../src/resto');
    for (const n of [0, 1]) {
      g.economy.mods.street = n; g.run(0.2);
      expect(rs.restoShows()).toMatchObject({ stage: 0, mama: false, diners: 0, wreck: true, belt: false });
    }
    for (let n = 2; n < fight.RESTO_OPENS; n++) {
      g.economy.mods.street = n; g.run(0.2);
      expect(rs.restoShows()).toMatchObject({ stage: 1, mama: false, diners: 0, wreck: false, belt: false });
    }
    // (open, with no bowl line in yet to bring her any, she's waiting on it; once it's in, she's open for business, and
    // the line runs on past the stall to her)
    F().slide = false;
    g.economy.mods.street = fight.RESTO_OPENS; g.run(0.2);
    expect(rs.restoShows()).toMatchObject({ stage: 2, mama: true, says: rs.WAITING, belt: false });
    expect(rs.restoShows()!.diners).toBeGreaterThan(0);
    F().slide = true; g.run(0.2);
    expect(rs.restoShows()).toMatchObject({ stage: 2, says: rs.OPENING, belt: true });
    // and a batch for her goes along the line, from the hopper by the pot
    F().quiet = false;
    fight.on.resto(fight.BATCH, 1);
    g.run(1.5);
    expect(rs.restoShows()!.under).toBeGreaterThan(0);
  }, 30_000);

  it('the bowl slide is a bowl line in place of the counter, the pot to the soup square by itself, under the floor', async () => {
    const { g, plan, fight, at, F, cellar } = await ring({ ring: { beaten: 1 } });
    const rk = await import('../src/ringKitchen');
    const table = () => { let up = false; cellar.bowlTable.g!.traverse(o => { if ((o as import('three').Mesh).isMesh && o.visible) up = true; }); return up; };
    at(plan.WATCH);
    F().counter = Array(10).fill(false); F().stall = [];
    g.run(1);
    expect(F().stall.length).toBe(0);
    expect(rk.slideParts.visible).toBe(false);
    expect(table()).toBe(true);
    fight.buySlide();
    g.run(0.5);
    expect(F().stall.length).toBeGreaterThan(3);
    // (the line laid, the counter gone; bowls on their way, from the hopper by the pot to the soup square)
    expect(rk.slideParts.visible).toBe(true);
    expect(table()).toBe(false);
    expect(rk.slideShows()).toBeGreaterThan(0);
    g.run(1);
    expect(F().counter.length).toBe(0);
    expect(F().stall.length).toBe(10);
    // (the attendant, who carried them, goes over to work the line's motor, and carries no more)
    fight.hire('attendant');
    F().counter = Array(10).fill(false); F().stall = [];
    g.run(8);
    const p = rk.crewPerson('attendant')!.position;
    expect(Math.hypot(p.x - plan.MOTOR_AT.x, p.z - plan.MOTOR_AT.z)).toBeLessThan(0.3);
    expect(F().crew.find(w => w.role === 'attendant')!.carry).toBe(null);
  }, 30_000);

  it("with the player at the pot all through the rush, it turns at least what the gong promised", async () => {
    const { fight: f, plan, at } = await ring({ level: 0 });
    f.resetFight();
    for (const k of ['rice', 'fish'] as const) for (let i = 0; i < 3; i++) f.addMachine(k);
    for (const r of ['washer', 'salter', 'cook', 'attendant'] as const) f.hire(r);
    for (let t = 0; t < 90; t += 0.05) f.step(0.05);
    at(plan.POT_PAD);
    const fc = f.forecast()!;
    expect(f.ringGong()).toBe(true);
    const tick = () => { f.step(0.05); f.playerAtPot(0.05); };
    while (f.F.called) tick();
    for (let n = 0; n < 4000 && !f.F.rush!.done; n++) tick();
    expect(f.F.rush!.turned).toBeGreaterThanOrEqual(fc.turned);
  });

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
  it('the waiting fans crowd the floor round the soup square, a step back from its counters and never inside', async () => {
    const { g, swarm, plan, F } = await ring();
    g.run(10);
    expect(F().queue.length).toBeGreaterThan(3);
    expect(swarm.swarm().n).toBe(F().queue.length);
    expect(swarm.swarm().shadows).toBe(true);
    const stood = swarm.ways().filter(w => w.length === 1).map(([p]) => p);
    expect(stood.length).toBeGreaterThan(3);
    for (const p of stood) {
      expect(plan.fromBar(p)).toBeGreaterThan(0.8);
      expect(plan.inSquare(p)).toBe(false);
    }
    // (the ones at the front of the crowd are round it, not off across the floor)
    expect(Math.min(...stood.map(p => plan.fromBar(p)))).toBeLessThan(1.5);
  });

  it('a bowl sold waits on the soup square for the fan who bought it, and hops to them when they get there', async () => {
    const { g, swarm, fight, F } = await ring();
    const { barShows } = await import('../src/ringKitchen');
    for (let i = 0; i < 10; i++) fight.toStall(false);
    // (sold: it stays out on its counter while its fan walks up)
    g.runUntil(() => fight.sold.n > 0 && swarm.heading() > 0, 20);
    g.run(1 / 60);
    expect(barShows().waiting).toBeGreaterThan(0);
    expect(barShows().out).toBe(F().stall.length);
    // (and when they're at the bar, it's theirs: it leaves its place, flying to them)
    g.runUntil(() => swarm.turnedAt().length > 0, 20);
    const was = barShows().waiting;
    g.run(1 / 60);
    expect(barShows().waiting).toBeLessThan(was);
  });

  it('each fan served steps up to a free spot of their own round the soup square, walking round it, never through it', async () => {
    const { g, swarm, plan, fight, F } = await ring();
    for (let i = 0; i < fight.STALL_CAP; i++) fight.toStall(false);
    const { BAR, BAR_SPOTS } = plan, at = new Set<number>();
    const inBar = (x: number, z: number) => x > BAR.x0 + 0.02 && x < BAR.x1 - 0.02 && z > BAR.z0 + 0.02 && z < BAR.z1 - 0.02;
    for (let i = 0; i < 900 && F().bout.phase === 'prep'; i++) {
      g.run(1 / 30, 1 / 30);
      for (const f of swarm.turnedAt()) {
        const k = BAR_SPOTS.findIndex(s => Math.hypot(f.x - s.x, f.z - s.z) < 0.05);
        expect(k).toBeGreaterThanOrEqual(0);
        at.add(k);
      }
      // (round the square to their spot and on to their seat, never across its counters nor into it)
      for (const way of swarm.ways()) {
        for (let j = 1; j < way.length; j++) {
          const a = way[j - 1], b = way[j];
          for (let t = 0; t <= 20; t++) {
            const x = a.x + (b.x - a.x) * t / 20, z = a.z + (b.z - a.z) * t / 20;
            expect(inBar(x, z), `${x.toFixed(2)}, ${z.toFixed(2)}`).toBe(false);
          }
        }
      }
    }
    expect(F().bout.fed).toBeGreaterThan(8);
    // (a good few different spots, on both its open sides, each a step out from its counters)
    expect(at.size).toBeGreaterThanOrEqual(5);
    const sides = new Set([...at].map(k => BAR_SPOTS[k]).map(s => s.z < BAR.z0 ? 'n' : 'w'));
    expect(sides.size).toBeGreaterThanOrEqual(2);
    for (const s of BAR_SPOTS) expect(plan.fromBar(s)).toBeCloseTo(0.35, 5);
  });

  it('the soup square closes in the hearth room\'s doorway: you serve from inside it and leave through the hearth room', async () => {
    const { g, cellar, plan, fight } = await ring();
    const { BAR, BAR_PLACES, BAR_PAD } = plan;
    // a place on the counters' tops for every bowl out, each on a counter, none crowding the next
    expect(BAR_PLACES).toHaveLength(fight.STALL_CAP);
    for (const h of BAR_PLACES) {
      expect(plan.fromBar(h)).toBe(0);
      expect(plan.inSquare(h)).toBe(false);
      for (const o of BAR_PLACES) if (o !== h) expect(Math.hypot(h.x - o.x, h.z - o.z)).toBeGreaterThan(0.25);
    }
    // the pad's inside it; walking out west or north stops at the counters, and south at the arena's wall
    expect(plan.inSquare(BAR_PAD)).toBe(true);
    for (const [dx, dz] of [[-1, 0], [0, -1], [0, 1]]) {
      g.player.g.position.set(BAR_PAD.x, cellar.CY, BAR_PAD.z);
      for (let i = 0; i < 90; i++) { g.player.g.position.x += dx * 0.05; g.player.g.position.z += dz * 0.05; g.run(1 / 60); }
      const p = g.player.g.position;
      expect(p.x).toBeGreaterThan(BAR.x0 + BAR.d);
      expect(p.z).toBeGreaterThan(BAR.z0 + BAR.d);
      expect(p.z).toBeLessThanOrEqual(g.layout.ARENA.z1 + 1e-6);
    }
    // and in from the hearth room through its doorway
    g.player.g.position.set(g.layout.KITCHEN.x0 + 0.6, cellar.CY, 5.5);
    for (let i = 0; i < 120 && !plan.inSquare({ x: g.player.g.position.x, z: g.player.g.position.z }); i++) { g.player.g.position.x -= 0.05; g.run(1 / 60); }
    expect(plan.inSquare({ x: g.player.g.position.x, z: g.player.g.position.z })).toBe(true);
    // the crew's way from it to the ring's gong goes back through the hearth room and round by the landing
    const way = cellar.cellarWay(BAR_PAD, plan.GONG_PAD).map(w => cellar.roomAt(w));
    expect(way).toContain('kitchen');
    expect(way).toContain('landing');
    // and from the hearth room to the arena's floor, never through the square
    const round = cellar.cellarWay(plan.POT_PAD, plan.WATCH);
    expect(round.some(w => plan.inSquare(w))).toBe(false);
  });

  it('the flap at the west counter\'s south end lifts for the player, right up at it, lets them through, and shuts after them', async () => {
    const { g, cellar, plan } = await ring();
    const { BAR, FLAP } = plan, p = g.player.g.position, z = (FLAP.z0 + FLAP.z1) / 2 + 0.1, edge = BAR.x0 - 0.22;
    // nothing's set out on it, and no fan steps up to buy at it
    for (const h of plan.BAR_PLACES) expect(h.x > BAR.x0 + BAR.d || h.z < FLAP.z0).toBe(true);
    for (const s of plan.BAR_SPOTS) expect(s.z).toBeLessThan(FLAP.z0);
    // a couple of steps away from it, it stays shut
    p.set(BAR.x0 - cellar.FLAP_REACH.out - 0.3, cellar.CY, z);
    g.run(1);
    expect(cellar.flapK()).toBe(0);
    // but it opens for a player passing well out from it in the arena, so it's found
    p.set(BAR.x0 - cellar.FLAP_REACH.out + 0.2, cellar.CY, FLAP.z0 - 0.5);
    g.run(0.5);
    expect(cellar.flapOpen()).toBe(true);
    p.set(BAR.x0 - 3, cellar.CY, z);
    g.run(1);
    expect(cellar.flapK()).toBe(0);
    // and not for one serving inside the square, at the soup bar's pad
    p.set(plan.BAR_PAD.x, cellar.CY, plan.BAR_PAD.z + plan.BAR_PAD.r * 0.9);
    g.run(1);
    expect(cellar.flapK()).toBe(0);
    // walked up to from the arena, it's open by the time the player reaches the counter (it holds them there till it
    // is), and lets them into the square
    p.set(BAR.x0 - 3, cellar.CY, z);
    g.run(1);
    let held = 0;
    for (let i = 0; i < 120 && !plan.inSquare(p); i++) {
      p.x += 0.05;
      g.run(1 / 60);
      if (!cellar.flapOpen()) { expect(p.x).toBeLessThanOrEqual(edge + 1e-6); if (p.x >= edge - 1e-6) held++; }
    }
    expect(held).toBe(0);
    expect(plan.inSquare(p)).toBe(true);
    // and back out the same way
    for (let i = 0; i < 90 && p.x > BAR.x0 - 0.5; i++) { p.x -= 0.05; g.run(1 / 60); }
    expect(p.x).toBeLessThanOrEqual(BAR.x0 - 0.5);
    // even open, it's never a way through for the fans or the crew; and it shuts once the player's away
    p.set(BAR.x0 + BAR.d / 2, cellar.CY, z);
    g.run(0.5);
    expect(cellar.flapOpen()).toBe(true);
    expect(cellar.cellarBoxes().some(([cx, cz, hx, hz]) => Math.abs(BAR.x0 + BAR.d / 2 - cx) < hx && Math.abs(z - cz) < hz)).toBe(true);
    p.set(BAR.x0 - 2, cellar.CY, 5);
    g.run(1);
    expect(cellar.flapK()).toBe(0);
  });

  it('a boss\'s crowd walks round the ring, the stands and the soup bar to its seats, never through them', async () => {
    const { g, fight, swarm, cellar, F } = await ring({ ring: { tier: 2 } });
    expect(fight.ringGong()).toBe(true);
    g.runUntil(() => { while (F().rush!.turned + F().stall.length < 81 && fight.toStall(false)); return F().rush!.done; }, 31 + fight.WALK_IN);
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
    expect(swarm.swarm()).toMatchObject({ n: 160, seated: 160 });
    expect(swarm.swarm().benched).toBeGreaterThan(60);
  });

  it('standing on the watch spot closes the camera in on the bout, with the names over it', async () => {
    const { g, plan, gong, stage, cellar, at } = await ring();
    at(plan.WATCH);
    g.run(3);
    expect(gong.watching()).toBe(true);
    expect(stage.view.zoom).toBeLessThan(stage.CELLAR_ZOOM);
    // aimed as ever, 0.4 m up: main.ts aims a little over the player's feet, and at the middle of anything else
    const { k, focus } = stage.view, feet = g.player.g.position.y;
    expect(feet + (focus.y - feet) * k + 0.4 * (1 - k)).toBeCloseTo(cellar.CY + 0.4, 5);
    // (and the strip along the top, the champion against tonight's local)
    expect($('rush').hidden).toBe(false);
    expect($('rushYou').textContent).toMatch(/^Chunkos \d+$/);
    expect($('rushThem').textContent).toMatch(/^\d+ Local$/);
    at(plan.BAR_PAD);
    g.run(3);
    expect(gong.watching()).toBe(false);
    expect($('rush').hidden).toBe(true);
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
    const { g, cellar, front, fight, buy } = await ring({ money: 12_500_000, ring: RING_DONE, till: 300_000_000 });
    buy('buyout');
    expect(front.front.boughtOut).toBe(true);
    // the cash from upstairs comes out of the till
    expect(front.front.till).toBe(0);
    expect(g.wallet.money).toBe(300_500_000);
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
    expect(lines[0]).toContain('30% of every bowl');
    expect(lines.join(' ')).toContain('Hakkaku');
    expect(office.fuguSays()).toBe('');
    at(office.DESK_PAD);
    g.run(0.2);
    expect(office.fuguSays()).toBe(lines[0]);
    // (his mouth going as he says it, and shut once it's said)
    const { boss } = await import('../src/cellar');
    expect(boss.talking).toBe(true);
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
    expect(boss.talking).toBe(false);
    // a boss beaten: the grow room's his secret
    F().beaten = 1;
    expect(office.fuguLines().join(' ')).toContain('Mushroom bowls');
    F().boughtOut = true;
    expect(office.fuguLines()[0]).toContain('Your house');
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

  it("is through a doorway by the bench, at the west end of the hearth room's south wall, that opens onto its square", async () => {
    const { g, cellar, plan, at } = await ring({ money: 10_000_000 });
    const L = g.layout, d = L.DOORS.find(t => t.b === 'craft')!, B = plan.BENCH_PAD, HALF = 0.95;
    // the doorway's in the west half of the wall, with the bench's square straight ahead through it
    expect(d.x1).toBeLessThan((L.CRAFT.x0 + L.CRAFT.x1) / 2);
    expect(B.x + HALF).toBeGreaterThan(d.x0 + 0.3);
    expect(B.x - HALF).toBeLessThan(d.x1 - 0.3);
    // nothing in the doorway, or within a metre of it either side, or on the square
    const boxes = cellar.cellarBoxes({ rice: 6, fish: 6, mush: 6 });
    const hits = (x0: number, x1: number, z0: number, z1: number) => boxes.filter(([cx, cz, hx, hz]) => cx + hx > x0 && cx - hx < x1 && cz + hz > z0 && cz - hz < z1);
    expect(hits(d.x0, d.x1, d.z0 - 1, d.z1 + 1)).toEqual([]);
    expect(hits(B.x - HALF, B.x + HALF, B.z - HALF, B.z + HALF)).toEqual([]);
    // walking straight in from the hearth room: through the doorway and onto the square, which opens the bench's menu
    const x = (d.x0 + d.x1) / 2;
    at({ x, z: d.z0 - 1 });
    for (let i = 0; i < 60; i++) { g.player.g.position.z += 0.05; g.run(1 / 60); }
    expect(g.player.g.position.z).toBeCloseTo(d.z0 + 2, 5);
    expect(g.player.g.position.x).toBeCloseTo(x, 5);
    expect($('shop').hidden).toBe(false);
  });

  it('on a touch screen it opens folded, a Shop button out of the thumb\'s way, then a ladder: tap to pick, then Buy', async () => {
    const { g, plan, at, F } = await ring({ money: 10_000_000 });
    // (a first touch: the game's a touch screen's from then on)
    window.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch' }));
    at(plan.BENCH_PAD);
    g.run(0.1);
    expect($('shop').hidden).toBe(true);
    expect($('craft').hidden).toBe(false);
    expect(Number($('craftN').textContent)).toBeGreaterThan(0);
    $('craft').click();
    g.run(0.1);
    expect($('shop').hidden).toBe(false);
    expect($('shop').classList.contains('ladder')).toBe(true);
    expect($('craft').hidden).toBe(true);
    expect($('shopShut').hidden).toBe(false);
    // a column a room along the top, a bar a gate: the practice fight's won, Hakkaku's next
    expect([...$('shopRows').querySelectorAll('.treeHead .laneName')].map(l => l.textContent)).toEqual(['🍚Rice', '🐟Fish', '🍄Grow', '🍲Hearth', '🏮Venue']);
    expect([...$('shopRows').querySelectorAll<HTMLElement>('.bar')].map(b => b.className.replace('bar ', ''))).toEqual(['won', 'next', 'later', 'later', 'later', 'later']);
    expect($('shopRows').querySelector('.bar.next')!.textContent).toBe('🔒 Beat Hakkaku 🐙');
    const node = (id: string) => $('shopRows').querySelector<HTMLButtonElement>(`[data-tile="${id}"]`)!;
    const buy = () => $('shopPick').querySelector<HTMLButtonElement>('.buy')!;
    // (it starts on the first thing there are the chips for: the bowl price)
    expect($('shopRows').querySelector('[data-mod="bowls"]')!.getAttribute('aria-pressed')).toBe('true');
    node('steam').click();
    g.run(0.1);
    expect(node('steam').getAttribute('aria-pressed')).toBe('true');
    expect($('shopPick').textContent).toContain('Beat Yokobashiri 🦀 first');
    expect(buy().disabled).toBe(true);
    // pick, then buy
    node('rack').click();
    g.run(0.1);
    expect($('shopPick').textContent).toContain('More room on the rice line');
    buy().click();
    g.run(0.1);
    expect(F().lines.rice.n).toBe(2);
    expect(node('rack').textContent).toContain('🐡 15');
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

  it("a close-up looks at what was built even as it pops in from nothing, and never at somewhere nowhere near the player", async () => {
    const { g, cellar } = await ring({ ring: { beaten: 1 } });
    const { BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } = await import('three');
    const sp = await import('../src/spotlight');
    const { view } = g.stage;
    g.run(0.5);
    const near = g.player.g.position.clone();
    // laid out from the world's middle (its foot's 30 m over the cellar), and only just starting to pop in
    const group = new Group(), m = new Mesh(new BoxGeometry(0.5, 0.5, 0.5), new MeshBasicMaterial());
    m.position.set(near.x + 1.5, near.y, near.z); group.add(m); group.scale.setScalar(0.001);
    cellar.cellar.add(group);
    expect(sp.spotlight([group])).toBe(true);
    g.run(sp.SPOT_WAIT + sp.SPOT.over + 0.3);
    group.scale.setScalar(1);
    expect(view.close).toBeLessThan(1);
    expect(view.focus.distanceTo(m.getWorldPosition(new Vector3()))).toBeLessThan(0.3);
    g.run(sp.SPOT.hold + sp.SPOT.back + 0.3);
    // something far off from the player: no close-up at all
    const far = new Mesh(new BoxGeometry(0.5, 0.5, 0.5), new MeshBasicMaterial());
    far.position.set(near.x, near.y + 60, near.z); cellar.cellar.add(far);
    sp.spotlight([far]);
    g.run(sp.SPOT_WAIT + sp.SPOT.over + 0.3);
    expect(view.close).toBe(1);
    expect(sp.spotOn()).toBe(false);
  }, 30_000);

  it('puts what it builds in the spotlight, as upstairs: the new rack, a hire, the racks swapped for steam baskets', async () => {
    const { g, plan, at, buy } = await ring({ money: 10_000_000, ring: { beaten: 2 } });
    const { Box3, Vector3 } = await import('three');
    const kitchen = await import('../src/ringKitchen');
    const { view } = g.stage, focus = view.focus.clone();
    const { SPOT_WAIT: W } = await import('../src/spotlight');
    type O = import('three').Object3D;
    /** How far the camera's spotlight is from the middle of `os`. */
    const off = (os: O[]) => {
      const mid = os.reduce((m, o) => m.add(new Box3().setFromObject(o).getCenter(new Vector3())), new Vector3()).divideScalar(os.length);
      return view.focus.distanceTo(mid);
    };
    at(plan.BENCH_PAD);
    g.run(0.1);
    // a drying rack: the camera goes over to the new one (the second) and in close, then back to the player
    buy('rack');
    g.run(W + 0.8);
    expect(view.close).toBeCloseTo(0.6);
    const rack = kitchen.built({ line: 'rice' });
    expect(rack).toHaveLength(1);
    expect(off(rack)).toBeLessThan(0.1);
    // the menu steps out of the camera's way meanwhile
    expect($('shop').classList.contains('away')).toBe(true);
    g.run(3);
    expect(view.close).toBe(1);
    expect(view.focus.equals(focus)).toBe(true);
    // and comes back once it's over, the player still at the counter
    expect($('shop').classList.contains('away')).toBe(false);
    expect($('shop').hidden).toBe(false);
    // a hire: on him, from where he starts by the racks, followed (a step behind) as he sets off to work
    buy('washer');
    g.run(W + 0.8);
    expect(view.close).toBeCloseTo(0.6);
    expect(off([kitchen.crewPerson('washer')!])).toBeLessThan(1);
    g.run(3);
    // the steam baskets: on both the racks they're swapped for
    buy('steam');
    g.run(W + 0.8);
    // (a little off their boxes' middles: the washer's filling them as it plays)
    expect(off(kitchen.built({ line: 'rice', all: true }))).toBeLessThan(0.25);
    expect(kitchen.built({ line: 'rice', all: true })).toHaveLength(2);
    g.run(3);
    // (and it goes in the middle of the space the bench's menu leaves: ui.test.ts)
    expect($('shop').dataset.still).toBe('1');
  });

  it("leaves the camera on the player while a boss is in, and ends a spotlight up or down the ladder", async () => {
    const { g, plan, at, buy, fight, stage, F } = await ring({ money: 10_000_000 });
    const { view } = g.stage;
    const { SPOT_WAIT: W } = await import('../src/spotlight');
    at(plan.BENCH_PAD);
    g.run(0.1);
    // a boss's crowd coming in: what's bought pops in, but the camera stays on the player
    expect(fight.ringGong()).toBe(true);
    g.run(0.1);
    const kitchen = await import('../src/ringKitchen');
    buy('rack');
    expect(kitchen.built({ line: 'rice' })[0].scale.x).toBeLessThan(1); // popping in
    g.run(W + 0.8);
    expect(view.close).toBe(1);
    expect(view.k).toBe(0);
    g.runUntil(() => !F().rush, 60 + fight.WALK_IN);
    // with him gone, a moment on camera again; and up the ladder, it ends at once, the camera with the player
    at(plan.BENCH_PAD);
    g.run(0.1);
    buy('rack');
    g.run(W + 0.8);
    expect(view.close).toBeCloseTo(0.6);
    stage.setLevel(false);
    g.run(0.05);
    expect(view.close).toBe(1);
    expect(view.k).toBe(0);
  }, 60_000);

  it('waits till the player has stopped buying: three salt barrels in a row get the one close-up, on all three', async () => {
    const { g, plan, at, buy } = await ring({ money: 10_000_000, ring: { beaten: 2 } });
    const { Box3, Vector3 } = await import('three');
    const kitchen = await import('../src/ringKitchen');
    const { SPOT, SPOT_WAIT } = await import('../src/spotlight');
    const { view } = g.stage;
    type O = import('three').Object3D;
    const off = (os: O[]) => {
      const mid = os.reduce((m, o) => m.add(new Box3().setFromObject(o).getCenter(new Vector3())), new Vector3()).divideScalar(os.length);
      return view.focus.distanceTo(mid);
    };
    at(plan.BENCH_PAD);
    g.run(0.1);
    // bought one after another (each a click and a moment apart): the camera stays put, the menu with it, for the next
    const shop = document.getElementById('shop')!;
    for (let i = 0; i < 3; i++) {
      buy('barrel');
      expect(view.close).toBe(1);
      expect(view.k).toBe(0);
      expect(shop.classList.contains('away')).toBe(false);
    }
    // then, once the player's stopped for a moment, one close-up, framing the three new barrels
    g.run(SPOT_WAIT + SPOT.over + 0.2);
    expect(view.close).toBeCloseTo(0.6);
    const barrels = kitchen.built({ line: 'fish', all: true }).slice(1);
    expect(barrels).toHaveLength(3);
    expect(off(barrels)).toBeLessThan(0.1);
    expect(shop.classList.contains('away')).toBe(true);
    // and only the one: it ends, and the camera stays on the player after
    g.run(SPOT.hold + SPOT.back);
    expect(view.close).toBe(1);
    for (let i = 0; i < 20; i++) { g.run(0.2); expect(view.k).toBe(0); }
    // things bought in a row that are far apart (a rack in the prep hall, the attendant by the pot): on the last
    buy('rack');
    buy('attendant');
    g.run(SPOT_WAIT + SPOT.over + 0.2);
    expect(view.close).toBeCloseTo(0.6);
    expect(off([kitchen.crewPerson('attendant')!])).toBeLessThan(1);
    // and up the ladder while it waits: no close-up at all
    g.run(4);
    const stage = await import('../src/stage');
    buy('barrel');
    stage.setLevel(false);
    g.run(SPOT_WAIT + SPOT.over);
    expect(view.close).toBe(1);
    expect(view.k).toBe(0);
  }, 60_000);
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
    at(plan.BAR_PAD);
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
    const { fightFrom, LEDGE_CAP } = await import('../src/fight');
    const f = fightFrom({ beaten: 99, tier: -4, lines: { rice: { n: 40, m: [{ items: [5, 'x', -1] }] } }, pantry: { rice: 1e9 }, counter: 'no', hires: { cook: 1, wizard: true } });
    expect(f.beaten).toBe(5);
    expect(f.tier).toBe(0);
    expect(f.lines.rice.n).toBe(6);
    expect(f.lines.rice.m[0].items).toEqual([1, 0]);
    expect(f.pantry.rice).toBe(LEDGE_CAP);
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

describe('the wrestlers', () => {
  it("grip, slap and push without ever standing inside each other; the belt bends with them; the loser goes down off the ring", async () => {
    const { g, cellar, dohyo, fight, F } = await ring();
    const { champ, rival } = dohyo.ring;
    const apart = () => Math.hypot(champ.position.x - rival.position.x, champ.position.z - rival.position.z);
    g.runUntil(() => F().bout.phase === 'sit', fight.BOUT.prep + 1);
    // crouched behind the lines, the hips (and the belt on them) tip forward with the body
    g.run(fight.BOUT.sit - 0.3);
    expect(champ.hips.rotation.x).toBeGreaterThan(0.2);
    // (today's pair stood 0.9 apart, inside each other: these meet chest to chest and no closer)
    g.runUntil(() => F().bout.phase === 'fight', 2);
    let closest = Infinity;
    for (let t = 0; t < fight.BOUT.fight - 0.1; t += 0.05) { g.run(0.05); closest = Math.min(closest, apart()); }
    expect(closest).toBeGreaterThan(1);
    // the local goes over the hawser on the west and down off the ring by the pallets; the champion stays up on it
    g.runUntil(() => F().bout.phase === 'pay', 1);
    g.run(2.6);
    expect(cellar.RING.x - rival.position.x).toBeGreaterThan(cellar.RING_HALF);
    expect(rival.position.y).toBeLessThan(cellar.CY + 0.1);
    expect(Math.abs(champ.position.x - cellar.RING.x)).toBeLessThan(cellar.RING_R);
    expect(champ.position.y).toBeCloseTo(cellar.CY + cellar.RING_TOP, 2);
  });
  it('the bosses are sea creatures on the same body, built without touching the luck, and a local after is a man again', async () => {
    const { dohyo, fight } = await ring();
    const { LOOKS } = await import('../src/creatures');
    const { pose } = await import('../src/rikishi');
    const { rival } = dohyo.ring;
    const meshes = () => { let n = 0; rival.traverse(o => { if ((o as { isMesh?: boolean }).isMesh) n++; }); return n; };
    rival.dress(0x2C3A6B); rival.setWeight(150);
    const man = meshes();
    const luck = Math.random;
    let rolled = 0;
    Math.random = () => { rolled++; return luck(); };
    try {
      for (const b of fight.BOSSES) {
        rival.dressAs(LOOKS[b.kind!], 180);
        expect(rival.kind).toBe(b.kind);
        // his own head, claws, tentacles, fins: more parts than a man's
        expect(meshes()).toBeGreaterThan(man);
      }
    } finally { Math.random = luck; }
    expect(rolled).toBe(0);
    // Fukure blows up a third bigger when he's angry
    rival.dressAs(LOOKS.puffer, 200);
    rival.puffTo = 1;
    for (let i = 0; i < 30; i++) rival.apply(pose(), 1 / 30);
    expect(rival.chestAt.scale.x).toBeGreaterThan(1.25);
    expect(rival.girth).toBeGreaterThan(rival.f * 1.25);
    // and a local is a plain wrestler again
    rival.dress(0x2C3A6B); rival.setWeight(150);
    expect(rival.kind).toBeUndefined();
    expect(meshes()).toBe(man);
    expect(rival.chestAt.scale.x).toBe(1);
  });
});

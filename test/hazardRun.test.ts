// Cooking Hazard's whole run (hazard.ts on hazardMap.ts's food quarter): the map, crates and the bag, ammo, walls, the
// horde finding its way and turning up off the screen, the safe zone, the van, and what comes home.
import { describe, expect, it } from 'vitest';
import {
  BAG, CRATE_R, DROP_TIME, GUNS, HOLD_TIME, LEVEL_TIME, MAX_MAGS, OPEN_R, RADIO_TIME, SPARE_MAGS, VAN_WAIT, ZONE_R,
  bestIn, crateAt, haul, newRun, reload, step, take, worstInBag, wouldTake,
  type Crate, type Food, type Input, type Run, type Zombie,
} from '../src/hazard';
import { Nav, OPEN, QUARTER, U, pushOut, wallAlong, type Town } from '../src/hazardMap';

const still: Input = { move: { x: 0, y: 0 }, aim: { x: 0, y: 0 }, fire: false };
const LOADOUT = { gun: 'spud', dishes: ['chiliPot', 'syrup'] } as const;
/** A run on the food quarter with the horde held off, the chef at (x, y) metres. */
function quarter(x = 32, y = 20, rng = () => 0.5) {
  const run = newRun({ ...LOADOUT, dishes: [...LOADOUT.dishes] }, rng, { at: { x: x * U, y: y * U } });
  run.spawnT = 1e9; run.specialT = 1e9;
  return run;
}
function zombie(run: Run, x: number, y: number, more: Partial<Zombie> = {}): Zombie {
  const z: Zombie = {
    id: run.nextId++, x, y, r: 16, hp: 100, maxHp: 100, speed: 100,
    coat: null, coatT: 0, meter: 0, burnT: 0, burnSpreads: false, poison: 0, poisonT: 0, poisonFast: 0,
    meltT: 0, freezeT: 0, twitchT: 0, lureT: 0, marinateT: 0, immuneT: 0, hasteT: 0, ticket: null, step: 0, dead: false,
    ...more,
  };
  run.zombies.push(z);
  return z;
}
const food = (taste: Food['taste'], grade: Food['grade'], got = 0): Food => ({ kind: 'food', taste, grade, got });
/** A crate of `items` where the chef stands. */
function crateHere(run: Run, items: Crate['items']): Crate {
  const c: Crate = { id: 99, x: run.player.x + 30, y: run.player.y, kind: 'food', shop: 'any', open: true, items };
  run.crates.push(c);
  return c;
}

describe('the food quarter', () => {
  it('has every spot open, and every one walks to every other', () => {
    const nav = new Nav(QUARTER);
    nav.towards(32 * U, 20 * U);
    const spots = [...QUARTER.crates, ...QUARTER.ammo, ...QUARTER.gold, ...QUARTER.zones, ...QUARTER.drops.map(d => d.chef)];
    for (const s of spots) {
      const i = nav.cell(s.x, s.y);
      expect(nav.open[i], `${s.x / U}, ${s.y / U}`).toBe(1);
      expect(nav.dist[i], `${s.x / U}, ${s.y / U}`).toBeGreaterThanOrEqual(0);
    }
    // the safe zone's ring has room round it, and the van's drop-offs are outside the walls
    for (const z of QUARTER.zones) expect(nav.open[nav.cell(z.x + ZONE_R * 0.6, z.y)]).toBe(1);
    for (const d of QUARTER.drops) expect(d.x < 0 || d.y < 0 || d.x > QUARTER.w || d.y > QUARTER.h).toBe(true);
  });

  it('picks its crates, a gold one, the safe zone, and a drop-off a good way from it', () => {
    for (const seed of [0.1, 0.3, 0.6, 0.9]) {
      let n = seed;
      const run = newRun({ gun: 'spud', dishes: ['chiliPot', 'syrup'] }, () => (n = (n * 9301 + 0.49297) % 1), { intro: true });
      expect(run.crates.filter(c => c.kind === 'gold')).toHaveLength(1);
      expect(run.crates.filter(c => c.kind === 'ammo')).toHaveLength(3);
      expect(new Set(run.crates.map(c => `${c.x},${c.y}`)).size).toBe(run.crates.length);
      expect(Math.hypot(run.drop.x - run.zone.x, run.drop.y - run.zone.y)).toBeGreaterThanOrEqual(25 * U);
      expect(run.player).toMatchObject(run.drop.chef);
      expect(run.dropT).toBe(DROP_TIME);
    }
  });
});

describe('walls', () => {
  it('push the chef and the horde out, and stop shots, though low things are shot over', () => {
    const p = { x: 5 * U, y: 6 * U };
    // (inside the grocery: out by its nearest side)
    pushOut(p, 18, QUARTER.blocks);
    expect(p.x).toBeLessThanOrEqual(3 * U - 18);
    const q = { x: 14 * U + 10, y: 8 * U };
    pushOut(q, 18, QUARTER.blocks);
    expect(q.x).toBeCloseTo(14 * U + 18);
    // through the grocery, no; over a bin, yes
    expect(wallAlong(1 * U, 8 * U, 16 * U, 8 * U, QUARTER.blocks)).toBeCloseTo(2 / 15);
    expect(wallAlong(13 * U, 13.1 * U, 17 * U, 13.1 * U, QUARTER.blocks)).toBeNull();
    expect(wallAlong(30 * U, 20 * U, 31 * U, 20 * U, QUARTER.blocks)).toBeNull();
    // (straight along a wall's side, not into it)
    expect(wallAlong(2 * U, 2 * U, 2 * U, 2.5 * U, QUARTER.blocks)).toBeNull();
  });

  it('keep the chef out of buildings and off closed crates', () => {
    const run = quarter(15.5, 8);
    for (let i = 0; i < 20; i++) step(run, 0.05, { ...still, move: { x: -1, y: 0 } });
    expect(run.player.x).toBeGreaterThanOrEqual(14 * U + 17);
    // walking on to a closed crate in one go: pushed off it (then it opens)
    const c: Crate = { id: 50, x: run.player.x + 1.5 * U, y: run.player.y, kind: 'food', shop: 'any', open: false, items: [] };
    run.crates = [c];
    step(run, 1.5 * U / 230, { ...still, move: { x: 1, y: 0 } });
    expect(Math.hypot(run.player.x - c.x, run.player.y - c.y)).toBeGreaterThanOrEqual(CRATE_R + 17);
    expect(c.open).toBe(true);
  });

  it('stop the chef’s shots, which hit nothing behind them', () => {
    const run = quarter(15.5, 8);
    const z = zombie(run, 8 * U, 8 * U, { speed: 0 });
    for (let i = 0; i < 20; i++) step(run, 0.05, { ...still, aim: { x: z.x, y: z.y }, fire: true });
    expect(z.hp).toBe(100);
    expect(run.shots.every(s => s.x >= 14 * U - 1)).toBe(true);
  });
});

describe('the horde', () => {
  it('finds its way round a building to the chef', () => {
    // the chef in the lane behind the grocery; a zombie in front of it, on Market Street
    const run = quarter(8, 1.8), z = zombie(run, 8 * U, 15 * U);
    for (let i = 0; i < 200 && Math.hypot(z.x - run.player.x, z.y - run.player.y) > 60; i++) {
      step(run, 0.05, still);
      run.player.hp = 100;
    }
    expect(Math.hypot(z.x - run.player.x, z.y - run.player.y)).toBeLessThan(60);
  });

  it('turns up just off the screen around the chef, somewhere open that walks to them', () => {
    let n = 0.37;
    const run = quarter(32, 20, () => (n = (n * 7.13 + 0.311) % 1));
    run.spawnT = 0;
    for (let i = 0; i < 30; i++) { step(run, 0.01, still); run.spawnT = 0; }
    expect(run.zombies.length).toBeGreaterThan(20);
    for (const z of run.zombies) {
      const d = Math.hypot(z.x - run.player.x, z.y - run.player.y);
      expect(d).toBeGreaterThan(12 * U);
      expect(d).toBeLessThan(26 * U);
      expect(run.nav.open[run.nav.cell(z.x, z.y)]).toBe(1);
    }
  });

  it('turns up as far as it can when the chef is hemmed in', () => {
    // a little town with only a room round the chef
    const tiny: Town = { ...OPEN, w: 6 * U, h: 6 * U, blocks: [], zones: [{ x: 3 * U, y: 3 * U, from: { x: 1, y: 0 } }], drops: OPEN.drops };
    const run = newRun({ gun: 'spud', dishes: ['chiliPot', 'syrup'] }, () => 0.5, { town: tiny, at: { x: 1 * U, y: 1 * U } });
    run.spawnT = 0; run.specialT = 1e9;
    step(run, 0.01, still);
    const z = run.zombies[0];
    expect(Math.hypot(z.x - run.player.x, z.y - run.player.y)).toBeGreaterThan(4 * U);
  });

  it('walks straight when nothing is in the way, and gives up a grid step when there’s no way', () => {
    const nav = new Nav(QUARTER);
    nav.towards(8 * U, 1.8 * U);
    expect(nav.clear({ x: 30 * U, y: 20 * U }, { x: 34 * U, y: 20 * U })).toBe(true);
    expect(nav.clear({ x: 8 * U, y: 15 * U }, { x: 8 * U, y: 1.8 * U })).toBe(false);
    expect(nav.next(8 * U, 15 * U)).not.toBeNull();
    // (in the chef's own cell, there's no next step)
    expect(nav.next(8.4 * U, 1.6 * U)).toBeNull();
    // (and the walk's only worked out again once the chef's in another cell)
    nav.towards(8.6 * U, 1.9 * U);
    expect(nav.dist[nav.cell(8 * U, 1.8 * U)]).toBe(0);
  });
});

describe('crates and the bag', () => {
  it('open as the chef walks up, with better grades the later they are', () => {
    const grades = (t: number) => {
      let total = 0;
      for (let k = 0; k < 40; k++) {
        let n = k / 40 + 0.013;
        const run = quarter(32, 20, () => (n = (n * 9.73 + 0.17) % 1));
        run.t = t;
        const c: Crate = { id: 1, x: run.player.x + OPEN_R - 5, y: run.player.y, kind: 'food', shop: 'grocery', open: false, items: [] };
        run.crates = [c];
        step(run, 0.01, still);
        expect(c.open).toBe(true);
        expect(c.items.length).toBeGreaterThanOrEqual(1);
        expect(c.items.length).toBeLessThanOrEqual(3);
        total += c.items.reduce((g, it) => g + (it.kind === 'food' ? it.grade : 0), 0) / c.items.length;
      }
      return total;
    };
    expect(grades(LEVEL_TIME * 3.5)).toBeGreaterThan(grades(0));
  });

  it('hold ammo, or cookware in the gold one', () => {
    const run = quarter();
    const ammo: Crate = { id: 1, x: run.player.x + 40, y: run.player.y, kind: 'ammo', shop: 'any', open: false, items: [] };
    const gold: Crate = { id: 2, x: run.player.x - 40, y: run.player.y, kind: 'gold', shop: 'any', open: false, items: [] };
    run.crates = [ammo, gold];
    step(run, 0.01, still);
    expect(ammo.items).toEqual([{ kind: 'ammo', mags: 2 }]);
    expect(gold.items[0].kind).toBe('cookware');
    // the use key takes the best: the cookware first
    expect(bestIn(gold)).toBe(0);
    expect(take(run, gold, 0)).toBe('took');
    expect(run.cookware).toHaveLength(1);
    // ammo tops up the spare magazines, up to a most
    run.spare = MAX_MAGS - 1;
    take(run, ammo, 0);
    expect(run.spare).toBe(MAX_MAGS);
    expect(bestIn(ammo)).toBe(-1);
  });

  it('fills the bag, then swaps its worst for better, and shows what it would do', () => {
    const run = quarter();
    const c = crateHere(run, [food('sour', 1)]);
    expect(crateAt(run)).toBe(c);
    expect(take(run, c, 0)).toBe('took');
    expect(run.bag).toHaveLength(1);
    // (an empty crate's nothing to be at)
    expect(crateAt(run)).toBeNull();
    for (let i = 1; i < BAG; i++) run.bag.push(food('umami', i < 3 ? 0 : 2, 10 + i));
    // the worst: the lowest grade, picked up first
    expect(worstInBag(run)).toBe(1);
    c.items = [food('spicy', 0), food('sweet', 2)];
    expect(wouldTake(run, c, 0)).toBe('full');
    expect(take(run, c, 0)).toBe('full');
    expect(wouldTake(run, c, 1)).toBe('swap');
    expect(bestIn(c)).toBe(1);
    expect(take(run, c, 1)).toBe('swapped');
    expect(run.bag[1]).toMatchObject({ taste: 'sweet', grade: 2 });
    // what's given up goes back in the crate
    expect(c.items[1]).toMatchObject({ taste: 'umami', grade: 0 });
    // too far from the crate, or nothing there: nothing
    run.player.x += 5 * U;
    expect(take(run, c, 0)).toBeNull();
    expect(take(run, c, 7)).toBeNull();
  });
});

describe('ammo', () => {
  it('runs out once the spare magazines are gone', () => {
    const run = quarter(), gun = GUNS.spud;
    expect(run.spare).toBe(SPARE_MAGS);
    run.spare = 1; run.ammo = 1;
    step(run, 0.01, { ...still, aim: { x: run.player.x + 100, y: run.player.y }, fire: true });
    step(run, gun.reload + 0.1, still);
    expect([run.ammo, run.spare]).toEqual([gun.mag, 0]);
    run.ammo = 0;
    reload(run);
    expect(run.reloadT).toBe(0);
    step(run, 0.5, { ...still, aim: { x: run.player.x + 100, y: run.player.y }, fire: true });
    expect(run.shots).toHaveLength(0);
  });
});

describe('getting out', () => {
  it('waits out the drop-off, then radios the van from the zone and holds it till the van comes', () => {
    const run = newRun({ gun: 'spud', dishes: ['chiliPot', 'syrup'] }, () => 0.5, { intro: true });
    run.spawnT = 1e9; run.specialT = 1e9;
    step(run, 1, still);
    expect(run.t).toBe(0);
    step(run, DROP_TIME, still);
    expect(run.dropT).toBe(0);
    // the use key does nothing out of the zone; in it, held a second, it calls the van
    step(run, RADIO_TIME + 0.1, { ...still, use: true });
    expect(run.stage).toBe('run');
    Object.assign(run.player, { x: run.zone.x, y: run.zone.y + 30 });
    step(run, RADIO_TIME / 2, { ...still, use: true });
    step(run, 0.01, still);
    expect(run.radioT).toBe(0);
    step(run, RADIO_TIME / 2, { ...still, use: true });
    step(run, RADIO_TIME / 2 + 0.01, { ...still, use: true });
    expect(run.stage).toBe('hold');
    // a rush comes at once
    run.spawnT = 0;
    step(run, 0.01, still);
    expect(run.zombies.length).toBeGreaterThan(0);
    run.zombies = []; run.spawnT = 1e9;
    // the hold only counts in the ring
    run.player.y = run.zone.y + ZONE_R + 40;
    const left = run.holdT;
    step(run, 5, still);
    expect(run.holdT).toBe(left);
    // (in the ring, but not yet at the van's doors)
    run.player.y = run.zone.y + 100;
    for (let i = 0; i < HOLD_TIME + 1; i++) { step(run, 1, still); run.player.hp = 100; run.zombies = []; }
    expect(run.stage).toBe('van');
    // missed: the van leaves, and it has to be called again
    run.player.y = run.zone.y + ZONE_R + 200;
    step(run, VAN_WAIT + 0.1, still);
    expect(run.stage).toBe('run');
  });

  it('brings everything carried home in the van; dying loses it all', () => {
    const out = quarter();
    out.bag = [food('sour', 2), food('sweet', 0)];
    out.cookware = [{ kind: 'cookware', name: 'Wok', emoji: '🥘' }];
    out.stage = 'van'; out.vanT = VAN_WAIT;
    Object.assign(out.player, { x: out.zone.x, y: out.zone.y });
    step(out, 0.01, still);
    expect(out.over).toBe(true);
    expect(out.extracted).toBe(true);
    expect(haul(out)).toBe(3 + 1 + 10);
    const dead = quarter();
    dead.bag = [food('sour', 2)];
    dead.player.hp = 0.0001;
    zombie(dead, dead.player.x + 20, dead.player.y, { speed: 50 });
    step(dead, 0.1, still);
    expect(dead.over).toBe(true);
    expect(haul(dead)).toBe(0);
  });
});

// Cooking Hazard's safe house (hazardHouse.ts): cooking a batch with the timing tap, what tickets buy, packing the van
// and leaving, coming home (or not), and keeping it all in Floe Market's save.
import { beforeEach, describe, expect, it } from 'vitest';
import { DISHES, newRun, type Run } from '../src/hazard';
import {
  BAGS, DAMAGE, GOOD, PERFECT, QUALITY, SUITS, buy, canCook, cook, cookScore, counterOpen, depart, freshHouse, have,
  homecoming, house, houseSave, loadHouse, pack, pressCook, price, rollNext, startCooking, starsFor, stepCooking,
} from '../src/hazardHouse';
import { OPEN } from '../src/hazardMap';
import { loadGame } from './helpers';

beforeEach(() => { Object.assign(house, freshHouse()); });

/** A run left with `loadout` (as the van gives it), on the open test street. */
function leave(): Run {
  const { loadout, opts } = depart();
  return newRun(loadout, () => 0.5, { ...opts, town: OPEN, at: { x: OPEN.w / 2, y: OPEN.h / 2 } });
}

describe('a new player', () => {
  it('starts with enough for two batches at the Stove, the Spud Rifle, a few tickets, and only the Stove open', () => {
    expect(have('spicy')).toBe(4);
    expect(have('umami')).toBe(4);
    expect([house.gun, house.guns, house.slots, house.tickets]).toEqual(['spud', ['spud'], 2, 20]);
    expect([counterOpen('stove'), counterOpen('oven'), counterOpen('pantry')]).toEqual([true, false, false]);
    expect([canCook('chiliPot'), canCook('bait'), canCook('syrup'), canCook('lemon')]).toEqual([true, true, false, false]);
  });
});

describe('cooking', () => {
  it('runs the dish code twice past the line: perfect, good, a wrong move and one let go by', () => {
    const c = startCooking('syrup'), code = DISHES.syrup.code;
    expect(c.notes.map(n => n.dir)).toEqual([...code, ...code]);
    // too early does nothing
    expect(pressCook(c, code[0])).toBeNull();
    stepCooking(c, c.notes[0].at);
    expect(pressCook(c, code[0])).toBe('perfect');
    stepCooking(c, c.notes[1].at - c.t + (PERFECT + GOOD) / 2);
    expect(pressCook(c, code[1])).toBe('good');
    stepCooking(c, c.notes[2].at - c.t);
    expect(pressCook(c, code[2] === 'up' ? 'down' : 'up')).toBe('miss');
    // the rest go by unpressed
    let done = false;
    while (!done) done = stepCooking(c, 0.1);
    expect(c.notes.map(n => n.hit)).toEqual(['perfect', 'good', 'miss', 'miss', 'miss', 'miss']);
    expect(cookScore(c)).toBeCloseTo(1.5 / 6);
    expect([starsFor(cookScore(c)), starsFor(0.6), starsFor(1)]).toEqual([1, 2, 3]);
  });

  it('cooks a batch from the best of its taste, its strength from their grades', () => {
    house.pantry = { 'spicy:0': 2, 'spicy:2': 1 };
    const b = cook('chiliPot', 3)!;
    expect(b).toEqual({ dish: 'chiliPot', servings: 3, quality: (QUALITY[2] + QUALITY[0]) / 2 });
    expect(house.pantry).toEqual({ 'spicy:0': 1, 'spicy:2': 0 });
    expect(house.batches).toEqual([b]);
    // not enough left; and the Oven's shut till its cookware comes home
    expect(cook('chiliPot', 3)).toBeNull();
    house.pantry['sweet:1'] = 2;
    expect(cook('syrup', 2)).toBeNull();
    house.cookware['Baking tray'] = 1;
    expect(cook('syrup', 2)!.servings).toBe(2);
  });
});

describe('tickets', () => {
  it('buy the guns, their damage, dish slots, the bag and the armour, a level at a time', () => {
    house.tickets = 1000;
    expect(price({ kind: 'gun', gun: 'spud' })).toBeNull();
    expect(buy({ kind: 'gun', gun: 'salt' })).toBe(true);
    expect([house.guns, house.gun]).toEqual([['spud', 'salt'], 'salt']);
    expect(buy({ kind: 'gun', gun: 'salt' })).toBe(false);
    for (let i = 0; i < 3; i++) expect(buy({ kind: 'damage', gun: 'salt' })).toBe(true);
    expect(buy({ kind: 'damage', gun: 'salt' })).toBe(false);
    for (let i = 0; i < 2; i++) expect(buy({ kind: 'slot' })).toBe(true);
    expect([house.slots, price({ kind: 'slot' })]).toEqual([4, null]);
    for (const k of ['cargo', 'armour'] as const) { buy({ kind: k }); buy({ kind: k }); expect(buy({ kind: k })).toBe(false); }
    expect(house.tickets).toBe(1000 - 40 - 30 - 60 - 90 - 50 - 100 - 2 * (40 + 80));
    // the run gets them
    const run = leave();
    expect([run.bagMax, run.player.hp, run.dmgK]).toEqual([BAGS[2], SUITS[2], DAMAGE[3]]);
  });

  it("aren't spent without enough of them", () => {
    house.tickets = 39;
    expect(buy({ kind: 'cargo' })).toBe(false);
    expect([house.tickets, house.cargo]).toEqual([39, 0]);
  });
});

describe('the van', () => {
  it('takes as many batches as there are dish slots; they leave the shelf, servings and strength and all', () => {
    house.batches = [{ dish: 'chiliPot', servings: 2, quality: 1.25 }, { dish: 'bait', servings: 3, quality: 1 }, { dish: 'chiliPot', servings: 1, quality: 0.8 }];
    pack(0); pack(2); pack(1);
    expect(house.packed).toEqual([0, 2]);
    pack(0);
    pack(1);
    expect(house.packed).toEqual([2, 1]);
    const run = leave();
    expect(run.loadout).toEqual({ gun: 'spud', dishes: ['chiliPot', 'bait'], servings: [1, 3], quality: [0.8, 1] });
    expect(house.batches).toEqual([{ dish: 'chiliPot', servings: 2, quality: 1.25 }]);
    expect(house.packed).toEqual([]);
  });

  it("shows the next run's specials' tickets, and the run brings them", () => {
    rollNext(() => 0);
    expect(house.next).toEqual([['spicy', 'bitter'], ['spicy', 'bitter'], ['spicy', 'bitter']]);
    expect(leave().tickets).toEqual(house.next);
  });
});

describe('coming home', () => {
  it('puts the haul in the pantry, the servings left back on the shelf, and the tickets and techniques in', () => {
    house.batches = [{ dish: 'chiliPot', servings: 3, quality: 1 }];
    pack(0);
    const run = leave();
    Object.assign(run, { extracted: true, over: true, kills: 9, cooked: 2, t: 200, found: ['spicy+sour'] });
    run.servings[0] = 1;
    run.bag = [{ kind: 'food', taste: 'sour', grade: 2, got: 0 }];
    run.cookware = [{ kind: 'cookware', name: 'Baking tray', emoji: '🍱' }];
    const h = homecoming(run, () => 0.5);
    expect(h).toEqual({ tickets: 2 + 2 + 15, haul: 3 + 10, bestHaul: true, bestTime: true, techniques: ['spicy+sour'] });
    expect(house.pantry['sour:2']).toBe(1);
    expect(counterOpen('oven')).toBe(true);
    expect(house.batches).toEqual([{ dish: 'chiliPot', servings: 1, quality: 1 }]);
    expect([house.tickets, house.found, house.best]).toEqual([20 + 19, ['spicy+sour'], { haul: 13, time: 200 }]);
    expect(house.next).toHaveLength(3);
  });

  it('loses what was carried and the servings left on dying, but keeps the tickets and techniques', () => {
    house.batches = [{ dish: 'chiliPot', servings: 3, quality: 1 }];
    pack(0);
    const run = leave();
    Object.assign(run, { over: true, kills: 8, cooked: 1, found: ['spicy+bitter'] });
    run.bag = [{ kind: 'food', taste: 'sour', grade: 2, got: 0 }];
    const h = homecoming(run);
    expect(h.tickets).toBe(3);
    expect([house.batches, house.pantry['sour:2'], house.found]).toEqual([[], undefined, ['spicy+bitter']]);
  });
});

describe('in the save', () => {
  it("is read back whatever's in it, and a save from before it gets what the device kept from step 4's runs", () => {
    loadHouse({ tickets: 7, guns: ['salt', 'nope'], gun: 'chili', slots: 9, batches: [{ dish: 'bait', servings: 2 }, { dish: 'x', servings: 1 }], next: [['sour', 'sweet'], ['nope']] });
    expect([house.tickets, house.guns, house.gun, house.slots, house.batches, house.next])
      .toEqual([7, ['spud', 'salt'], 'spud', 4, [{ dish: 'bait', servings: 2, quality: 1 }], [['sour', 'sweet']]]);
    localStorage.setItem('floe-market-hazard-pantry', JSON.stringify({ food: { 'sour:2': 2 }, cookware: { Stockpot: 1 } }));
    localStorage.setItem('floe-market-hazard-haul', '13');
    localStorage.setItem('floe-market-hazard-best', '95');
    loadHouse(undefined);
    expect([house.pantry['sour:2'], house.pantry['spicy:1'], house.cookware, house.best]).toEqual([2, 4, { Stockpot: 1 }, { haul: 13, time: 95 }]);
    expect(localStorage.getItem('floe-market-hazard-pantry')).toBeNull();
    expect(houseSave()).toEqual({ ...house, packed: [] });
  });

  it("goes in Floe Market's save and comes back with it", async () => {
    const g = await loadGame({ money: 5 });
    const h = (await import('../src/hazardHouse')).house;
    expect(h.tickets).toBe(20);
    h.tickets = 77; h.found = ['salty+sweet'];
    g.saveMod.save();
    const raw = localStorage.getItem('floe-market-v1')!;
    expect(JSON.parse(raw).hazard).toMatchObject({ tickets: 77, found: ['salty+sweet'] });
    await loadGame(raw);
    expect((await import('../src/hazardHouse')).house).toMatchObject({ tickets: 77, found: ['salty+sweet'] });
  });
});

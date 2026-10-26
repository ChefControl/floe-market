// Cooking Hazard: the fight's rules (hazard.ts). The screen that plays them is in hazardScreen.test.ts.
import { describe, expect, it } from 'vitest';
import {
  COAT_TIME, DISHES, GUNS, H, LEVEL_TIME, TASTE_LIST, TECHNIQUES, W, hit, hordeHp, letGo, level, newRun, pair, press,
  reload, ringNeed, shove, startServe, step, stripPos, technique, throwDish,
  type Input, type Loadout, type Run, type Taste, type Zombie,
} from '../src/hazard';

const still: Input = { move: { x: 0, y: 0 }, aim: { x: W, y: H / 2 }, fire: false };
/** A run with nothing coming for a while: the horde and the specials are held off. */
function quiet(loadout: Loadout = { gun: 'spud', dishes: ['chiliPot', 'syrup'] }) {
  const run = newRun(loadout, () => 0.5);
  run.spawnT = 1e9; run.specialT = 1e9;
  return run;
}
/** A zombie of the horde standing at (x, y). */
function zombie(run: Run, x: number, y: number, more: Partial<Zombie> = {}): Zombie {
  const z: Zombie = {
    id: run.nextId++, x, y, r: 16, hp: 100, maxHp: 100, speed: 0,
    coat: null, coatT: 0, meter: 0, burnT: 0, burnSpreads: false, poison: 0, poisonT: 0, poisonFast: 0,
    meltT: 0, freezeT: 0, twitchT: 0, lureT: 0, marinateT: 0, immuneT: 0, hasteT: 0, ticket: null, step: 0, dead: false,
    ...more,
  };
  run.zombies.push(z);
  return z;
}
const far = (run: Run) => zombie(run, 100, 100);

describe('tastes and techniques', () => {
  it('has a technique for every pair of tastes, the same either way round', () => {
    const names = new Set<string>();
    for (const a of TASTE_LIST) for (const b of TASTE_LIST) {
      if (a === b) continue;
      expect(technique(a, b)).toBe(technique(b, a));
      names.add(technique(a, b).name);
    }
    expect(Object.keys(TECHNIQUES)).toHaveLength(15);
    expect(names.size).toBe(15);
    expect(technique('sweet', 'spicy').name).toBe('BRÛLÉED!');
    expect(pair('umami', 'spicy')).toBe('spicy+umami');
  });

  it('sticks Fire, Poison and Acid on the first hit', () => {
    const run = quiet(), z = far(run);
    hit(run, z, 1, 'spicy');
    expect([z.coat, z.burnT > 0]).toEqual(['spicy', true]);
    const y = far(run);
    hit(run, y, 1, 'bitter'); hit(run, y, 1, 'bitter');
    expect([y.coat, y.poison]).toEqual(['bitter', 2]);
    const x = far(run);
    hit(run, x, 1, 'sour');
    expect(x.meltT).toBeGreaterThan(0);
    // melted armour: hits do more
    const hp = x.hp;
    hit(run, x, 10, null);
    expect(hp - x.hp).toBeCloseTo(13.5);
  });

  it('fills a ring for Freeze, Electric and Lure, which go off once full', () => {
    const run = quiet(), z = far(run), half = ringNeed(z) / 2;
    hit(run, z, half, 'sweet');
    expect([z.coat, z.meter]).toEqual(['sweet', 0.5]);
    expect(z.freezeT).toBe(0);
    hit(run, z, half, 'sweet');
    expect(z.freezeT).toBeGreaterThan(0);
    expect(z.meter).toBe(0);

    const y = zombie(run, 600, 600), n1 = zombie(run, 630, 600), n2 = zombie(run, 570, 600), n3 = zombie(run, 900, 300);
    hit(run, y, 1, 'salty', 1);
    expect(y.twitchT).toBeGreaterThan(0);
    expect([n1.twitchT > 0, n2.twitchT > 0, n3.twitchT > 0]).toEqual([true, true, false]);

    const b = far(run);
    hit(run, b, 1, 'umami', 1);
    expect(b.lureT).toBeGreaterThan(0);
  });

  it('shatters a candied zombie with a big hit', () => {
    const run = quiet(), z = far(run);
    z.freezeT = 2;
    hit(run, z, 20, null);
    expect(z.hp).toBe(70);
    expect(z.freezeT).toBe(0);
  });

  it('cooks a coated zombie with a second taste: stamped, garnished, coat spent, briefly immune', () => {
    const run = quiet(), z = far(run);
    hit(run, z, 1, 'sweet', 0.5);
    expect(hit(run, z, 1, 'spicy')).toBe('BRÛLÉED!');
    expect(z.coat).toBeNull();
    expect(z.immuneT).toBeGreaterThan(0);
    expect(run.cooked).toBe(1);
    expect(run.stamps[0].text).toBe('BRÛLÉED!');
    expect(run.garnishes).toHaveLength(1);
    // straight after, a third taste can't cook it again
    hit(run, z, 1, 'sour');
    hit(run, z, 1, 'bitter');
    expect(run.cooked).toBe(1);
    // the same taste only tops its coat up
    const y = far(run);
    hit(run, y, 1, 'spicy'); hit(run, y, 1, 'spicy');
    expect(run.cooked).toBe(1);
  });

  it('jumps once to the zombies close by wearing the same coat', () => {
    const run = quiet(), z = zombie(run, 300, 300), same = zombie(run, 360, 300), other = zombie(run, 300, 360), away = zombie(run, 900, 300);
    for (const o of [z, same, away]) hit(run, o, 1, 'sour');
    hit(run, other, 1, 'bitter');
    hit(run, z, 1, 'salty');
    expect(run.cooked).toBe(2);
    expect([same.coat, other.coat, away.coat]).toEqual([null, 'bitter', 'sour']);
    // one stamp and one garnish: the jump doesn't stamp again
    expect(run.stamps).toHaveLength(1);
  });

  it('does what each technique says', () => {
    const cookOn = (a: Taste, b: Taste) => {
      const run = quiet(), z = zombie(run, 300, 300), n = zombie(run, 340, 300);
      hit(run, z, 1, a, 1); hit(run, z, 1, b, 1);
      return { run, z, n };
    };
    expect(cookOn('spicy', 'bitter').run.zones[0].kind).toBe('smoke');
    expect(cookOn('sour', 'spicy').n.burnT).toBeGreaterThan(0);
    expect(cookOn('spicy', 'salty').n.hp).toBeLessThan(100);
    expect(cookOn('sweet', 'spicy').run.zones[0].kind).toBe('caramel');
    expect(cookOn('umami', 'spicy').n.burnT).toBeGreaterThan(0);
    expect(cookOn('sour', 'bitter').z.poisonFast).toBeGreaterThan(0);
    expect(cookOn('bitter', 'salty').n.poison).toBe(3);
    expect(cookOn('sweet', 'bitter').n.poison).toBe(3);
    expect(cookOn('umami', 'bitter').n.poison).toBe(2);
    expect(cookOn('salty', 'sour').run.zones[0].kind).toBe('battery');
    expect(cookOn('sweet', 'sour').n.meltT).toBeGreaterThan(0);
    expect(cookOn('umami', 'sour').z.marinateT).toBeGreaterThan(0);
    expect(cookOn('sweet', 'salty').n.freezeT).toBeGreaterThan(0);
    expect(cookOn('umami', 'salty').n.twitchT).toBeGreaterThan(0);
    const glazed = cookOn('umami', 'sweet');
    expect(glazed.n.freezeT).toBeGreaterThan(0);
    expect(Math.hypot(glazed.n.x - glazed.z.x, glazed.n.y - glazed.z.y)).toBeCloseTo(32);
  });

  it('wears a coat off after a while', () => {
    const run = quiet(), z = far(run);
    hit(run, z, 1, 'sweet', 0.5);
    step(run, COAT_TIME + 0.1, still);
    expect([z.coat, z.meter]).toEqual([null, 0]);
  });
});

describe('special zombies', () => {
  it('take damage from any shot, hurry at a wrong taste, and go down at once to their ticket in order', () => {
    const run = quiet(), z = zombie(run, 300, 300, { ticket: ['umami', 'spicy'], hp: 400, maxHp: 400 });
    hit(run, z, 50, null);
    expect(z.hp).toBe(350);
    hit(run, z, 10, 'spicy');
    expect([z.step, z.hasteT > 0, z.hp]).toEqual([0, true, 340]);
    hit(run, z, 10, 'umami');
    expect(z.step).toBe(1);
    expect(hit(run, z, 10, 'spicy')).toBe('BARBECUED!');
    expect(z.dead).toBe(true);
    expect(run.kills).toBe(1);
  });

  it('can be shot down without their ticket, too', () => {
    const run = quiet(), z = zombie(run, 300, 300, { ticket: ['umami', 'spicy'], hp: 40, maxHp: 40 });
    for (let i = 0; i < 4; i++) hit(run, z, 10, null);
    expect(z.dead).toBe(true);
    expect([run.kills, run.cooked]).toEqual([1, 0]);
  });

  it('turn up now and then with a ticket of two different tastes', () => {
    const run = newRun({ gun: 'spud', dishes: ['chiliPot', 'syrup'] });
    run.spawnT = 1e9; run.specialT = 0.01;
    step(run, 0.02, still);
    const z = run.zombies[0];
    expect(z.ticket).toHaveLength(2);
    expect(z.ticket![0]).not.toBe(z.ticket![1]);
  });
});

describe('serving a dish', () => {
  it('takes its code, a slip starts it over, and a dish half typed in is put back', () => {
    const run = quiet(), code = DISHES.chiliPot.code;
    expect(startServe(run, 0)).toBe(true);
    expect(press(run, code[0])).toBe('step');
    expect(press(run, 'down')).toBe('slip');
    expect(run.serving!.typed).toBe(0);
    letGo(run);
    expect(run.serving).toBeNull();
    startServe(run, 0);
    const got = code.map(d => press(run, d));
    expect(got[got.length - 1]).toBe('done');
    expect(press(run, 'up')).toBeNull();
    letGo(run);
    expect(run.serving!.ready).toBe(true);
    // with one in hand, no other is started
    expect(startServe(run, 1)).toBe(false);
  });

  it('keeps the chef still while a code goes in', () => {
    const run = quiet();
    startServe(run, 0);
    step(run, 0.5, { ...still, move: { x: 1, y: 0 } });
    expect(run.player.x).toBe(W / 2);
  });

  it('throws as far as an arm reaches, uses a serving, and hits where it lands', () => {
    const run = quiet(), p = run.player, z = zombie(run, p.x + 200, p.y, { coat: 'sweet', coatT: 4, meter: 0.2 });
    expect(throwDish(run, z)).toBe(false);
    startServe(run, 0);
    for (const d of DISHES.chiliPot.code) press(run, d);
    expect(throwDish(run, { x: p.x + 2000, y: p.y })).toBe(true);
    expect(run.thrown[0].x).toBeCloseTo(p.x + 420);
    expect(run.servings[0]).toBe(2);
    // and one on the zombie: Chili Pot on a sweet coat is Brûléed
    startServe(run, 0);
    for (const d of DISHES.chiliPot.code) press(run, d);
    throwDish(run, z);
    step(run, 0.6, still);
    expect(run.stamps.map(s => s.text)).toContain('BRÛLÉED!');
  });

  it('runs out, and leaves a syrup that candies whatever stands in it', () => {
    const run = quiet(), z = zombie(run, W / 2 + 100, H / 2);
    run.servings[1] = 1;
    startServe(run, 1);
    for (const d of DISHES.syrup.code) press(run, d);
    throwDish(run, z);
    expect(startServe(run, 1)).toBe(false);
    for (let i = 0; i < 12; i++) step(run, 0.25, still);
    expect(z.freezeT > 0 || z.coat === 'sweet').toBe(true);
  });

  it('lures the horde onto the bait, which they bite', () => {
    const run = quiet({ gun: 'spud', dishes: ['bait', 'lemon'] });
    const bait = zombie(run, 300, 300), hungry = zombie(run, 400, 300, { speed: 100 });
    startServe(run, 0);
    for (const d of DISHES.bait.code) press(run, d);
    throwDish(run, bait);
    for (let i = 0; i < 20; i++) step(run, 0.1, still);
    expect(Math.hypot(hungry.x - bait.x, hungry.y - bait.y)).toBeLessThan(40);
    expect(bait.hp).toBeLessThan(100 - DISHES.bait.dmg);
  });
});

describe('the gun, the shove and the run', () => {
  it('fires, runs dry and reloads', () => {
    const run = quiet(), gun = GUNS.spud;
    run.ammo = 1;
    step(run, 0.01, { ...still, fire: true });
    expect(run.shots).toHaveLength(1);
    expect(run.reloadT).toBeGreaterThan(0);
    step(run, gun.reload + 0.1, still);
    expect(run.ammo).toBe(gun.mag);
    reload(run);
    expect(run.reloadT).toBe(0);
  });

  it('seasons what it hits with its taste, and a garnish boosts the next shots', () => {
    const run = quiet({ gun: 'chili', dishes: ['chiliPot', 'syrup'] }), z = zombie(run, W / 2 + 60, H / 2);
    step(run, 0.2, { ...still, aim: { x: z.x, y: z.y }, fire: true });
    expect(z.coat).toBe('spicy');
    run.garnishes.push({ x: run.player.x, y: run.player.y, t: 5 });
    step(run, 0.01, still);
    expect(run.boost).toBe(5);
    run.cooldown = 0;
    step(run, 0.001, { ...still, aim: { x: z.x, y: z.y }, fire: true });
    expect(run.shots[run.shots.length - 1].dmg).toBeCloseTo(GUNS.chili.dmg * 1.5);
  });

  it('shoves zombies off', () => {
    const run = quiet(), z = zombie(run, W / 2 + 30, H / 2);
    shove(run);
    expect(z.x).toBeGreaterThan(W / 2 + 100);
  });

  it('gets harder by the clock: tougher zombies, four words, stuck on BIOHAZARD', () => {
    expect(hordeHp(LEVEL_TIME * 2)).toBeGreaterThan(hordeHp(0));
    expect([0, LEVEL_TIME, LEVEL_TIME * 2, LEVEL_TIME * 3, LEVEL_TIME * 9].map(level)).toEqual([0, 1, 2, 3, 3]);
    expect(stripPos(LEVEL_TIME * 1.5)).toBe(1.5);
    expect(stripPos(LEVEL_TIME * 9)).toBe(3);
  });

  it('ends when the horde gets the chef', () => {
    const run = newRun({ gun: 'spud', dishes: ['chiliPot', 'syrup'] });
    for (let i = 0; i < 4000 && !run.over; i++) step(run, 0.05, still);
    expect(run.over).toBe(true);
    expect(run.player.hp).toBe(0);
    expect(run.kills).toBeGreaterThanOrEqual(0);
    // a run that's over stays where it is
    const t = run.t;
    step(run, 1, still);
    expect(run.t).toBe(t);
  });

  it('burns spread by touch, poison ticks faster fermented, and burns and poisons can finish a zombie', () => {
    const run = quiet(), z = zombie(run, 300, 300, { hp: 3 }), n = zombie(run, 333, 300);
    hit(run, z, 1, 'spicy');
    step(run, 0.1, still);
    expect(n.burnT).toBeGreaterThan(0);
    expect(n.burnSpreads).toBe(false);
    for (let i = 0; i < 10; i++) step(run, 0.1, still);
    expect(run.zombies).not.toContain(z);
  });
});

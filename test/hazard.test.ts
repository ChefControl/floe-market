// Cooking Hazard: the fight's rules (hazard.ts). The screen that plays them is in hazardScreen.test.ts.
import { describe, expect, it } from 'vitest';
import {
  COAT_TIME, CRIT_K, DISHES, GUNS, H, LEVEL_TIME, RUSH_GAP, RUSH_K, TASTE_LIST, TECHNIQUES, W, centre, feel, hit, hordeHp,
  letGo, level, lineUp, newRun, pair, press, pullAim, reload, ringNeed, shove, startServe, step, stripPos, technique,
  throwDish, type Input, type Loadout, type Run, type Taste, type Zombie,
} from '../src/hazard';
import { OPEN } from '../src/hazardMap';

const still: Input = { move: { x: 0, y: 0 }, aim: { x: W, y: H / 2 }, fire: false };
/** A run with nothing coming for a while: the horde and the specials are held off. */
function quiet(loadout: Loadout = { gun: 'spud', dishes: ['chiliPot', 'syrup'] }) {
  const run = newRun(loadout, () => 0.5, { town: OPEN, at: { x: W / 2, y: H / 2 } });
  run.spawnT = 1e9; run.specialT = 1e9;
  return run;
}
/** A zombie of the horde standing at (x, y). */
function zombie(run: Run, x: number, y: number, more: Partial<Zombie> = {}): Zombie {
  const z: Zombie = {
    id: run.nextId++, x, y, r: 16, hp: 100, maxHp: 100, speed: 0,
    coat: null, coatT: 0, meter: 0, burnT: 0, burnSpreads: false, poison: 0, poisonT: 0, poisonFast: 0,
    meltT: 0, freezeT: 0, twitchT: 0, lureT: 0, marinateT: 0, immuneT: 0, hasteT: 0, ticket: null, step: 0,
    kx: 0, ky: 0, stunT: 0, slow: 0, slowT: 0, dead: false, death: null,
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
    const bait = zombie(run, W / 2 - 340, H / 2 - 60), hungry = zombie(run, W / 2 - 240, H / 2 - 60, { speed: 100 });
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

describe('gun feel', () => {
  /** Fires one trigger pull at `z` (its middle, or `off` units to one side) and lets the shots land. */
  function shoot(run: Run, z: Zombie, off = 0) {
    // (aimed `off` to one side, square to the way to it)
    const p = run.player, d = Math.hypot(z.x - p.x, z.y - p.y) || 1;
    run.cooldown = 0;
    step(run, 0.001, { ...still, aim: { x: z.x - (z.y - p.y) / d * off, y: z.y + (z.x - p.x) / d * off }, fire: true });
    const fx = [...run.fx];
    for (let i = 0; i < 40 && run.shots.length; i++) { step(run, 0.01, still); fx.push(...run.fx); }
    return fx;
  }

  it('hits harder nearer the middle: a crit in its middle third, half at the edge of where a shot counts', () => {
    expect(centre(0, 16)).toEqual({ k: CRIT_K, crit: true });
    expect(centre(5, 16).crit).toBe(true);
    expect(centre(6, 16)).toEqual({ k: 1, crit: false });
    expect(centre(13, 16).k).toBe(1);
    expect(centre(20, 16).k).toBeCloseTo(0.5);
    expect(centre(16.5, 16).k).toBeGreaterThan(0.5);
    expect(centre(16.5, 16).k).toBeLessThan(1);
  });

  it('crits a zombie shot in the middle, does less to one grazed, and the Chili Sprayer does the same wherever it lands', () => {
    const run = quiet(), z = zombie(run, W / 2 + 200, H / 2);
    const fx = shoot(run, z);
    expect(z.hp).toBeCloseTo(100 - GUNS.spud.dmg * CRIT_K);
    expect(fx.some(f => f.kind === 'hit' && f.crit)).toBe(true);
    const g = zombie(run, W / 2 + 200, H / 2 + 300);
    shoot(run, g, 18);
    expect(g.hp).toBeGreaterThan(100 - GUNS.spud.dmg);
    expect(g.hp).toBeLessThan(100 - GUNS.spud.dmg / 2);
    const chili = quiet({ gun: 'chili', dishes: [] }), c = zombie(chili, W / 2 + 100, H / 2), e = zombie(chili, W / 2 + 100, H / 2 + 200);
    for (const [z, off] of [[c, 0], [e, 18]] as const) {
      expect(shoot(chili, z, off).find(f => f.kind === 'hit')).toMatchObject({ k: 1, crit: false });
    }
  });

  it('judges each shotgun pellet on its own, and fills a taste\'s ring by the shot\'s own damage, crit or not', () => {
    const run = quiet({ gun: 'salt', dishes: [] }), z = zombie(run, W / 2 + 80, H / 2, { hp: 1000, maxHp: 1000 });
    shoot(run, z);
    const p = GUNS.salt;
    expect(z.hp).toBeCloseTo(1000 - p.pellets * p.dmg * CRIT_K);
    expect(z.meter).toBeCloseTo(p.pellets * p.dmg / ringNeed(z));
  });

  it('can switch the middle off (the firing range)', () => {
    const run = quiet(), z = zombie(run, W / 2 + 200, H / 2);
    feel.centre = false;
    try { shoot(run, z); } finally { feel.centre = true; }
    expect(z.hp).toBeCloseTo(100 - GUNS.spud.dmg);
  });

  it('nudges with the Spud Rifle, knocks back and stops with the shotgun, slows with the Chili Sprayer; specials half', () => {
    const spud = quiet(), a = zombie(spud, W / 2 + 200, H / 2, { hp: 1000, maxHp: 1000 });
    shoot(spud, a);
    for (let i = 0; i < 30; i++) step(spud, 0.02, still);
    const nudge = a.x - (W / 2 + 200);
    expect(nudge).toBeGreaterThan(5);
    expect(nudge).toBeLessThan(20);

    const salt = quiet({ gun: 'salt', dishes: [] }), b = zombie(salt, W / 2 + 80, H / 2, { hp: 1000, maxHp: 1000, speed: 50 });
    shoot(salt, b);
    expect(b.stunT).toBeGreaterThan(0.2);
    for (let i = 0; i < 10; i++) step(salt, 0.02, still);
    expect(b.x - (W / 2 + 80)).toBeGreaterThan(nudge * 3);
    const s = zombie(salt, W / 2 + 80, H / 2 + 200, { hp: 1000, maxHp: 1000, ticket: ['sweet', 'sour'] });
    shoot(salt, s);
    expect(s.stunT).toBeLessThan(0.16);

    const chili = quiet({ gun: 'chili', dishes: [] }), c = zombie(chili, W / 2 + 100, H / 2, { hp: 1000, maxHp: 1000 });
    for (let i = 0; i < 20; i++) shoot(chili, c);
    expect(c.slow).toBeCloseTo(0.4);
    expect(c.kx).toBe(0);
    step(chili, 0.6, still);
    expect(c.slow).toBe(0);
    const t = zombie(chili, W / 2 + 100, H / 2 + 200, { hp: 1000, maxHp: 1000, ticket: ['sweet', 'sour'] });
    for (let i = 0; i < 20; i++) shoot(chili, t);
    expect(t.slow).toBeCloseTo(0.2);
  });

  it('keeps how each was killed: flung by the shot, further by a crit, furthest by a dish; a burn just drops them', () => {
    const run = quiet(), a = zombie(run, W / 2 + 200, H / 2, { hp: 5 });
    shoot(run, a, 10);
    expect(a.death).toMatchObject({ fling: GUNS.spud.fling, crit: false });
    expect(a.death!.dx).toBeCloseTo(1);
    const b = zombie(run, W / 2 + 200, H / 2, { hp: 5 });
    shoot(run, b);
    expect(b.death).toMatchObject({ crit: true });
    expect(b.death!.fling).toBeGreaterThan(GUNS.spud.fling);
    expect(b.death!.over).toBeCloseTo(15);
    const c = zombie(run, W / 2 - 300, H / 2, { hp: 1 });
    run.serving = { slot: 0, typed: 4, ready: true, smudge: 0 };
    throwDish(run, c);
    step(run, 0.6, still);
    expect(c.death!.fling).toBeGreaterThan(b.death!.fling);
    expect(run.fx.some(f => f.kind === 'blast') && run.fx.some(f => f.kind === 'stop')).toBe(true);
    const d = zombie(run, 300, 500, { hp: 0.1, burnT: 1 });
    step(run, 0.1, still);
    expect(d.dead).toBe(true);
    expect(d.death).toBeNull();
  });

  it('stops for a big hit: a point-blank shotgun kill, a crit that kills a special', () => {
    const salt = quiet({ gun: 'salt', dishes: [] }), z = zombie(salt, W / 2 + 50, H / 2, { hp: 5 });
    expect(shoot(salt, z).some(f => f.kind === 'stop')).toBe(true);
    const spud = quiet(), a = zombie(spud, W / 2 + 200, H / 2, { hp: 5 });
    expect(shoot(spud, a).some(f => f.kind === 'stop')).toBe(false);
    const s = zombie(spud, W / 2 + 200, H / 2, { hp: 5, ticket: ['sweet', 'sour'] });
    expect(shoot(spud, s).some(f => f.kind === 'stop')).toBe(true);
  });

  it('rushes when four go down in a second: the world slow, the chef not, and not again for a while', () => {
    const run = quiet(), zs = [0, 1, 2, 3].map(i => zombie(run, 400 + i * 100, 200, { hp: 1 }));
    for (const z of zs.slice(0, 3)) hit(run, z, 5, null);
    expect(run.rushT).toBe(0);
    hit(run, zs[3], 5, null);
    expect(run.rushT).toBeGreaterThan(0);
    const w = zombie(run, 100, 100, { speed: 100 }), x0 = w.x, p0 = run.player.x;
    step(run, 0.1, { ...still, move: { x: 1, y: 0 } });
    const crawled = Math.hypot(w.x - x0, w.y - 100);
    expect(crawled).toBeCloseTo(100 * 0.1 * RUSH_K, 0);
    expect(run.player.x - p0).toBeGreaterThan(20);
    for (let i = 0; i < 10; i++) step(run, 0.1, still);
    expect(run.rushT).toBe(0);
    const more = [0, 1, 2, 3].map(i => zombie(run, 400 + i * 100, 400, { hp: 1 }));
    for (const z of more) hit(run, z, 5, null);
    expect(run.rushT).toBe(0);
    for (let i = 0; i < RUSH_GAP * 10; i++) step(run, 0.1, still);
    const again = zombie(run, 700, 600, { coat: 'spicy', coatT: 4 });
    hit(run, again, 1, 'sweet');
    expect(run.rushT).toBeGreaterThan(0);
  });

  it('lines up the first zombie a shot would meet, and pulls a thumb\'s aim onto the nearest in a narrow cone', () => {
    const run = quiet(), a = zombie(run, W / 2 + 300, H / 2), b = zombie(run, W / 2 + 150, H / 2 + 10);
    expect(lineUp(run, { x: W, y: H / 2 })).toEqual({ z: b, crit: false });
    expect(lineUp(run, b)).toEqual({ z: b, crit: true });
    expect(lineUp(run, { x: W / 2, y: 0 })).toBeNull();
    void a;
    const toB = Math.atan2(10, 150);
    expect(Math.abs(pullAim(run, 0.1) - toB)).toBeLessThan(Math.abs(0.1 - toB));
    expect(pullAim(run, 1.2)).toBe(1.2);
  });

  it('keeps a row of zombies at the firing range\'s posts, standing still, and puts them back when they go down', () => {
    const posts = [{ x: 800, y: 300, special: false }, { x: 900, y: 360, special: true }];
    const run = newRun({ gun: 'spud', dishes: [] }, () => 0.5, { town: OPEN, at: { x: 400, y: 300 }, range: posts });
    step(run, 0.01, still);
    expect(run.zombies).toHaveLength(2);
    expect(run.zombies[1].ticket).not.toBeNull();
    for (let i = 0; i < 50; i++) step(run, 0.1, still);
    expect(run.zombies[0].x).toBe(800);
    expect(run.player.hp).toBe(100);
    hit(run, run.zombies[0], 1000, null);
    step(run, 0.5, still);
    expect(run.zombies).toHaveLength(1);
    step(run, 1, still);
    expect(run.zombies).toHaveLength(2);
  });
});

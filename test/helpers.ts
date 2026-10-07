import { vi } from 'vitest';
import { resetDom } from './dom';

/** A saved game (current format); anything left out starts empty, including the rice pot. */
export interface SaveFixture {
  money?: number;
  tiles?: { id: string; paid: number; done: boolean }[];
  reviews?: unknown[];
  pile?: number;
  back?: number;
  backRice?: number;
  c1?: number;
  c1c?: number;
  c2?: number;
  c2c?: number;
  fish?: number;
  rice?: number;
  plates?: number;
  cash?: number;
  boxes?: number;
  tcash?: number;
  field?: number;
  mods?: Record<string, number>;
}

/** Tiles entries for already-bought upgrades. */
export const bought = (...ids: string[]) => ids.map(id => ({ id, paid: 999, done: true }));
/** Stage 1's seven market upgrades. */
export const MARKET = ['pack', 'turret', 'roulette', 'runner', 'boots', 'sled', 'net'];

/**
 * Loads a fresh copy of the whole game (new module instances, fresh DOM), optionally from a save.
 * With `main`, boots through src/main.ts and captures its animation-frame callback instead.
 */
export async function loadGame(save?: SaveFixture | string, opts: { main?: boolean } = {}) {
  vi.resetModules();
  resetDom();
  localStorage.clear();
  if (typeof save === 'string') localStorage.setItem('floe-market-v1', save);
  else if (save) {
    const empty = {
      v: 4, money: 0, tiles: [], reviews: [], pile: 0, back: 0, backRice: 0, c1: 0, c1c: 0, c2: 0, c2c: 0, fish: 0, rice: 0,
      plates: 0, cash: 0, boxes: 0, tcash: 0, field: 0,
    };
    localStorage.setItem('floe-market-v1', JSON.stringify({ ...empty, ...save }));
  }
  let frame: FrameRequestCallback | undefined;
  if (opts.main) {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frame = cb; return 1; });
    await import('../src/main');
  }
  const [game, saveMod, playerMod, stations, counters, fishing, runner, unlocks, walletMod, ui, input, render, items, util,
    rating, rice, restaurant, world, layout, stage, hall, farm, korki, casino, shop, economy, looks] =
    await Promise.all([
      import('../src/game'), import('../src/save'), import('../src/player'), import('../src/stations'),
      import('../src/counters'), import('../src/fishing'), import('../src/runner'), import('../src/unlocks'),
      import('../src/wallet'), import('../src/ui'), import('../src/input'), import('../src/render'),
      import('../src/items'), import('../src/util'),
      import('../src/rating'), import('../src/rice'), import('../src/restaurant'), import('../src/world'),
      import('../src/layout'), import('../src/stage'), import('../src/hall'), import('../src/farm'),
      import('../src/korki'), import('../src/casino'), import('../src/shop'), import('../src/economy'),
      import('../src/looks'),
    ]);
  if (!opts.main) saveMod.load();

  const { player } = playerMod;
  const { wallet } = walletMod;

  /** Advances the simulation by `seconds` at 60 fps. */
  const run = (seconds: number, dt = 1 / 60) => {
    for (let t = 0; t < seconds; t += dt) game.tick(dt);
  };
  /** Advances until `cond` holds; fails the test if it doesn't within `maxSeconds`. */
  const runUntil = (cond: () => boolean, maxSeconds = 30, dt = 1 / 60) => {
    for (let t = 0; t < maxSeconds; t += dt) {
      if (cond()) return t;
      game.tick(dt);
    }
    throw new Error(`condition not met within ${maxSeconds}s`);
  };
  const placePlayer = (x: number, z: number) => player.g.position.set(x, util.FY, z);
  const cashAt = (C: { cash: { items: import('three').Object3D[] } }) =>
    C.cash.items.reduce((s, b) => s + items.billValue(b), 0);
  const press = (key: string, type: 'keydown' | 'keyup' = 'keydown') => {
    const e = new KeyboardEvent(type, { key, cancelable: true });
    window.dispatchEvent(e);
    return e;
  };

  /** Sets the rating by filling the review window with `stars`. */
  const rate = (stars: number) => { for (let i = 0; i < rating.WINDOW; i++) rating.addReview(stars); };

  return {
    game, saveMod, stations, counters, fishing, runner, unlocks, ui, input, render, items, util,
    rating, rice, restaurant, world, layout, stage, hall, farm, korki, casino, shop, economy, looks,
    player, wallet, frame: () => frame,
    run, runUntil, placePlayer, cashAt, press, rate,
  };
}

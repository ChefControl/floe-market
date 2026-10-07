import { vi } from 'vitest';
import { resetDom } from './dom';

/** A saved game; anything left out starts empty. */
export interface SaveFixture {
  money?: number;
  tiles?: { id: string; paid: number; done: boolean }[];
  pile?: number;
  back?: number;
  c1?: number;
  c1c?: number;
  c2?: number;
  c2c?: number;
  reviews?: unknown[];
  lever?: string;
  k?: number;
  kp?: number;
  rc?: number;
}

/** Tiles entries for already-bought upgrades. */
export const bought = (...ids: string[]) => ids.map(id => ({ id, paid: 999, done: true }));

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
    // Written in the original (v1) format, so every test also exercises the migration.
    const empty = { money: 0, tiles: [], pile: 0, back: 0, c1: 0, c1c: 0, c2: 0, c2c: 0 };
    localStorage.setItem('floe-market-v1', JSON.stringify({ ...empty, ...save }));
  }
  let frame: FrameRequestCallback | undefined;
  if (opts.main) {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frame = cb; return 1; });
    await import('../src/main');
  }
  const [game, saveMod, playerMod, stations, counters, fishing, runner, unlocks, walletMod, ui, input, render, items, util,
    rating, conveyor, restaurant, world] =
    await Promise.all([
      import('../src/game'), import('../src/save'), import('../src/player'), import('../src/stations'),
      import('../src/counters'), import('../src/fishing'), import('../src/runner'), import('../src/unlocks'),
      import('../src/wallet'), import('../src/ui'), import('../src/input'), import('../src/render'),
      import('../src/items'), import('../src/util'),
      import('../src/rating'), import('../src/conveyor'), import('../src/restaurant'), import('../src/world'),
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
    rating, conveyor, restaurant, world,
    player, wallet, frame: () => frame,
    run, runUntil, placePlayer, cashAt, press, rate,
  };
}

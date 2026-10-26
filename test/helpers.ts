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
  season?: number;
  seasonT?: number;
  fugu?: number;
  /** Stage 3: down in the cellar, what the player's carrying down there, and the cellar (fight.ts's Fight, in part). */
  level?: number;
  hands?: Record<string, number>;
  ring?: Record<string, unknown>;
  presents?: number;
  presentPaid?: number;
  learnt?: string[];
  /** Stage 3: the cash from upstairs waiting in the till (null: a save from before it). */
  till?: number | null;
}
/** Floe Sushi's upgrades (stage 2), in order. */
export const FLOE_SUSHI = ['paddy', 'farmer', 'seats', 'chef', 'tables', 'plot2', 'runner3', 'chef3', 'tables2', 'plot3', 'kiosk', 'porter', 'premium'];
/** A cellar (stage 3) with all five bosses beaten and the venue built up: its last stretch, before the buyout. */
export const RING_DONE = { beaten: 5, tier: 3, slide: true, fast: true, hires: { washer: true, salter: true, picker: true, cook: true, attendant: true } };

/** Tiles entries for already-bought upgrades. */
export const bought = (...ids: string[]) => ids.map(id => ({ id, paid: 999, done: true }));
/** Puts the camera high over the cellar's hall, all of it in view (the game moves it each frame, which tests don't run):
 *  only fans you can see say anything. */
export async function overHall() {
  const { camera } = await import('../src/render'), { RING } = await import('../src/cellar');
  camera.position.set(RING.x, RING.y + 70, RING.z + 45);
  camera.lookAt(RING);
  camera.updateMatrixWorld();
}
/** Stage 1's eight market upgrades, in order. */
export const MARKET = ['pack', 'turret', 'roulette', 'runner', 'boots', 'sled', 'runner2', 'net'];

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
      v: 7, money: 0, tiles: [], reviews: [], pile: 0, back: 0, backRice: 0, c1: 0, c1c: 0, c2: 0, c2c: 0, fish: 0, rice: 0,
      plates: 0, cash: 0, boxes: 0, tcash: 0, field: 0, till: 0,
    };
    // (a test's cellar has had its practice fight, so its gong calls the first boss, and the Family have introduced
    // themselves, so their tables open at once, unless the test says otherwise)
    const ring: Record<string, unknown> = { sparred: true, ...save?.ring };
    ring.den = { met: { eddie: true, harry: true, tommy: true }, ...(ring.den as object | undefined) };
    localStorage.setItem('floe-market-v1', JSON.stringify({ ...empty, ...save, ring }));
  }
  let frame: FrameRequestCallback | undefined;
  if (opts.main) {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frame = cb; return 1; });
    await import('../src/main');
  }
  // One at a time, in this order: some modules draw from the luck (Math.random) as they load, so loading them side by
  // side would let timing decide who draws first, and give a different scene and luck from one run to the next.
  const game = await import('../src/game');
  const saveMod = await import('../src/save');
  const playerMod = await import('../src/player');
  const stations = await import('../src/stations');
  const counters = await import('../src/counters');
  const fishing = await import('../src/fishing');
  const runner = await import('../src/runner');
  const unlocks = await import('../src/unlocks');
  const walletMod = await import('../src/wallet');
  const ui = await import('../src/ui');
  const input = await import('../src/input');
  const render = await import('../src/render');
  const items = await import('../src/items');
  const util = await import('../src/util');
  const rating = await import('../src/rating');
  const rice = await import('../src/rice');
  const restaurant = await import('../src/restaurant');
  const world = await import('../src/world');
  const layout = await import('../src/layout');
  const stage = await import('../src/stage');
  const hall = await import('../src/hall');
  const farm = await import('../src/farm');
  const korki = await import('../src/korki');
  const casino = await import('../src/casino');
  const shop = await import('../src/shop');
  const economy = await import('../src/economy');
  const looks = await import('../src/looks');
  const shed = await import('../src/shed');
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
    rating, rice, restaurant, world, layout, stage, hall, farm, korki, casino, shop, economy, looks, shed,
    player, wallet, frame: () => frame,
    run, runUntil, placePlayer, cashAt, press, rate,
  };
}

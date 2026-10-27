// Runs before every test file: gives the game the DOM and browser APIs it expects at import time.
import { afterEach, beforeEach, vi } from 'vitest';
import { resetDom } from './dom';

resetDom();

// Vitest's jsdom environment swaps the typed arrays (and ArrayBuffer) for jsdom's own, from jsdom's realm, and V8 copies
// an array of numbers into another realm's typed array the slow way, item by item: some 25 times as long. three.js does
// that for every shape it builds, so it was most of the time it took to load the game. Node's own are put back
// (structuredClone makes its copy in Node's realm), all of them together so they still go with each other.
for (const T of [ArrayBuffer, Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array,
  Float32Array, Float64Array]) {
  Object.defineProperty(globalThis, T.name, { value: structuredClone(new T(0)).constructor, writable: true, configurable: true });
}

// jsdom has no WebGL, so the renderer is a stub. Everything else in three.js is real.
vi.mock('three', async importOriginal => {
  const three = await importOriginal<typeof import('three')>();
  class WebGLRenderer {
    domElement: HTMLCanvasElement;
    shadowMap = { enabled: false, type: 0 };
    outputColorSpace = '';
    constructor(params: { canvas?: HTMLCanvasElement } = {}) {
      this.domElement = params.canvas ?? document.createElement('canvas');
    }
    setPixelRatio() {}
    setSize() {}
    render() {}
  }
  return { ...three, WebGLRenderer };
});

// jsdom has no 2D canvas either. The game only draws into canvases, so a context that accepts anything will do.
const noop = () => {};
const gradient = () => ({ addColorStop: noop });
const metrics = () => ({ width: 0, actualBoundingBoxLeft: 0, actualBoundingBoxRight: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 });
const ctx2d = new Proxy({ createLinearGradient: gradient, createRadialGradient: gradient, measureText: metrics } as Record<PropertyKey, unknown>, {
  get: (t, k) => (k in t ? t[k] : noop),
  set: (t, k, v) => { t[k] = v; return true; },
});
HTMLCanvasElement.prototype.getContext = function (type: string) {
  return type === '2d' ? ctx2d : null;
} as typeof HTMLCanvasElement.prototype.getContext;

/** Small seeded PRNG so fish, customers and orders are the same on every run. */
export function seeded(seed: number) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Each test loads the game afresh (helpers.ts), but the timers an earlier test's game started (the autosave, the
// cloud's syncs) would carry on behind its back, and could save or sync in the middle of a later test. So whatever
// a test starts is stopped when it ends.
const timers = new Set<unknown>();
for (const k of ['setTimeout', 'setInterval'] as const) {
  const real = globalThis[k] as (...a: unknown[]) => unknown;
  (globalThis as Record<string, unknown>)[k] = (...a: unknown[]) => { const id = real(...a); timers.add(id); return id; };
}

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(seeded(1));
  localStorage.clear();
  // Every test runs on an ordinary day (the clock moving on from it as ever), so what comes by the calendar (flags.ts:
  // election day's voting boat and beach) turns up only in the tests that say which day it is.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 0, 15, 12), shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  for (const id of timers) clearTimeout(id as number);
  timers.clear();
});

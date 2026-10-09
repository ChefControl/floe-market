// Runs before every test file: gives the game the DOM and browser APIs it expects at import time.
import { afterEach, beforeEach, vi } from 'vitest';
import { resetDom } from './dom';

resetDom();

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

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(seeded(1));
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

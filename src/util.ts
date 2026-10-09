import { Vector3 } from 'three';

/** Anything with a ground-plane position. */
export interface XZ {
  x: number;
  z: number;
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randi = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
export const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
export const UP = V(0, 1, 0);
/** Deck surface height. */
export const FY = 0.15;
/** Unit forward vector for a heading (radians, 0 = +z). */
export const fwd = (h: number) => V(Math.sin(h), 0, Math.cos(h));
const UNITS = [[1e3, 'k'], [1e6, 'M'], [1e9, 'B']] as const;
/**
 * An amount of money, short once it's big: 9,999 in full, then 12.3k, 450k, 1.5M, 2.3B. Money you have rounds down,
 * so it never shows more than there is (19,990 is 19.9k, not 20k); a price rounds `up`, so it never looks
 * affordable when it isn't (12,350 is 12.4k, beside 12.3k in hand).
 */
export function amount(v: number, up = false) {
  if (v < 10_000) return v.toLocaleString('en-US');
  for (let i = 0; i < UNITS.length; i++) {
    const [unit, sym] = UNITS[i], step = v < 100 * unit ? unit / 10 : unit;
    const x = (up ? Math.ceil(v / step) : Math.floor(v / step)) * step / unit;
    // rounding up can carry into the next unit: 999,950 is $1M, not $1,000k
    if (x >= 1000 && i < UNITS.length - 1) continue;
    return (x < 100 ? x.toFixed(1).replace(/\.0$/, '') : x.toLocaleString('en-US')) + sym;
  }
  return '';
}
/** A dollar amount you have, short once it's big: $9,999, $12.3k, $1.5M (rounded down). */
export const money = (v: number) => '$' + amount(v);
/** A price, short once it's big, rounded up: $12,350 is $12.4k. */
export const price = (v: number) => '$' + amount(v, true);
/** Squared distance on the ground plane. */
export const d2xz = (a: XZ, b: XZ) => {
  const dx = a.x - b.x, dz = a.z - b.z;
  return dx * dx + dz * dz;
};

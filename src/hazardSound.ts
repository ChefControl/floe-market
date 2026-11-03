// Cooking Hazard's guns, heard (hazardPlay.ts plays them as the rules say what happened).
import { between, noise, tone } from './audio';
import type { GunId, Taste } from './hazard';

export function gunSound(gun: GunId) {
  if (gun === 'chili') noise({ f: 2200, q: 0.9, a: 0.01, d: 0.06, v: 0.05 });
  else tone({ f: between(150, 170), f2: 80, type: 'triangle', a: 0.008, d: 0.08, v: 0.15 });
}
export function shellSound() { tone({ t: 0.35, f: 900, f2: 700, a: 0.008, d: 0.05, v: 0.04 }); }
export function hitSound(_taste: Taste | null, _gun: GunId) { noise({ f: 600, kind: 'lowpass', a: 0.008, d: 0.05, v: 0.06 }); }
export function critSound() { noise({ f: 1400, q: 1.2, a: 0.008, d: 0.05, v: 0.08 }); }
export function blastSound() { noise({ f: 500, kind: 'lowpass', a: 0.01, d: 0.3, v: 0.2 }); }
export function rushSound() { noise({ f: 300, f2: 1200, q: 1.5, a: 0.1, d: 0.5, v: 0.08 }); }

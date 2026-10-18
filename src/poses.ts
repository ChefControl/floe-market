// The wrestlers' poses (stage 3): how they stand, stamp, crouch, grip, drive, fall and lie, for the bouts (dohyo.ts)
// and their finishers (finishRig.ts, finishers/). Each is a Pose (rikishi.ts), mixed one into another as they move.
import { mixPose, type Pose, pose } from './rikishi';

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const STAND = pose();
export const walk = (ph: number, amp = 0.42) => {
  const s = Math.sin(ph);
  return pose({ l0x: s * amp, l0k: Math.max(0, s) * 0.55, l1x: -s * amp, l1k: Math.max(0, -s) * 0.55, a0x: -s * 0.3, a1x: s * 0.3, a0z: 0.08, a1z: 0.08, up: Math.abs(Math.cos(ph)) * 0.025, bend: 0.1, side: s * 0.06 });
};
export const SQUAT = pose({ l0x: 1.25, l0z: 0.75, l0k: 2.0, l1x: 1.25, l1z: 0.75, l1k: 2.0, bend: 0.12, head: -0.05, a0x: 0.55, a0z: 0.3, a0e: 0.55, a1x: 0.55, a1z: 0.3, a1e: 0.55 });
/** Getting up off the clay: his feet under him, leaning over them, his hands down to push off. */
export const GETUP = { ...SQUAT, bend: 0.6, head: -0.2, a0x: 0.9, a1x: 0.9, a0z: 0.35, a1z: 0.35, a0e: 0.2, a1e: 0.2 };
export const SHIKO_LOW = pose({ l0x: 0.95, l0z: 0.72, l0k: 1.2, l1x: 0.95, l1z: 0.72, l1k: 1.2, bend: 0.45, head: -0.4, a0x: 0.55, a0z: 0.42, a0e: 0.55, a1x: 0.55, a1z: 0.42, a1e: 0.55 });
/** One leg up high to the side for the stamp, leaning over the other. */
export const shikoUp = (leg: number) => leg
  ? pose({ bend: 0.3, head: -0.25, side: -0.38, a0x: 0.45, a1x: 0.45, a0z: 0.45, a1z: 0.45, a0e: 0.6, a1e: 0.6, l1x: 0.55, l1z: 1.3, l1k: 0.65, l0x: 0.12, l0z: 0.28, l0k: 0.2 })
  : pose({ bend: 0.3, head: -0.25, side: 0.38, a0x: 0.45, a1x: 0.45, a0z: 0.45, a1z: 0.45, a0e: 0.6, a1e: 0.6, l0x: 0.55, l0z: 1.3, l0k: 0.65, l1x: 0.12, l1z: 0.28, l1k: 0.2 });
export const RISE = mixPose(SHIKO_LOW, STAND, 0.55);
export const CROUCH = pose({ l0x: 1.15, l0z: 0.55, l0k: 1.65, l1x: 1.15, l1z: 0.55, l1k: 1.65, bend: 1.0, head: -0.8, a0x: 1.15, a0z: 0.06, a0e: 0.1, a1x: 1.15, a1z: 0.06, a1e: 0.1 });
export const CROUCH1 = { ...CROUCH, a1x: 0.5, a1z: 0.35, a1e: 0.6 };
export const CHARGE = pose({ l0x: 0.75, l0z: 0.35, l0k: 0.9, l1x: -0.35, l1z: 0.3, l1k: 0.2, bend: 0.85, head: -0.6, a0x: 1.4, a0z: -0.05, a0e: 0.3, a1x: 1.4, a1z: -0.05, a1e: 0.3 });
export const GRIP = pose({ l0x: 0.55, l0z: 0.48, l0k: 0.85, l1x: 0.55, l1z: 0.48, l1k: 0.85, bend: 0.58, head: -0.35, side: 0.16, twist: 0.22, a0x: 1.1, a0z: -0.3, a0e: 0.85, a1x: 1.0, a1z: -0.2, a1e: 1.0 });
export const DRIVE = pose({ l0x: 0.8, l0z: 0.35, l0k: 1.0, l1x: -0.3, l1z: 0.3, l1k: 0.25, bend: 0.78, head: -0.55, side: 0.1, twist: 0.15, a0x: 1.3, a0z: -0.3, a0e: 0.6, a1x: 1.25, a1z: -0.2, a1e: 0.7 });
export const BRACE = pose({ l0x: 0.4, l0z: 0.58, l0k: 0.7, l1x: 0.4, l1z: 0.58, l1k: 0.7, bend: 0.3, head: -0.05, side: 0.16, twist: 0.22, a0x: 1.0, a0z: -0.25, a0e: 0.95, a1x: 0.95, a1z: -0.2, a1e: 1.0, pitch: -0.1 });
export const STANDOFF = pose({ l0x: 0.5, l0z: 0.5, l0k: 0.8, l1x: 0.5, l1z: 0.5, l1k: 0.8, bend: 0.35, head: -0.25 });
export const BOW = pose({ bend: 0.6, head: 0.15, a0x: 0.3, a1x: 0.3 });
/** Sat on the clay: one leg out in front, the other's knee up, his foot by his backside (both feet on the ground). */
export const SIT = pose({ l0x: 1.45, l0z: 0.35, l0k: 0.25, l1x: 1.9, l1z: 0.45, l1k: 2.27, bend: -0.12, head: 0.15, a0x: -0.55, a0z: 0.35, a0e: 0.1, a1x: -0.55, a1z: 0.35, a1e: 0.1, seat: 1 });
export const LIE = { ...SIT, pitch: -1.25, a0x: 2.2, a1x: 1.8, a0z: 0.9, a1z: 0.9, head: 0.3, l0x: 0.9, l0k: 0.35, l1x: 1.3, l1k: 0.6 };
export const FIST = pose({ l0z: 0.25, l1z: 0.25, a0x: 2.95, a0z: 0.12, a0e: 0.15, bend: -0.06, head: 0.2 });
export const SHOVE = pose({ l0x: 0.9, l0z: 0.35, l0k: 1.05, l1x: -0.45, l1z: 0.3, l1k: 0.1, bend: 0.8, head: -0.5, a0x: 1.6, a0z: -0.05, a0e: 0, a1x: 1.6, a1z: -0.05, a1e: 0 });
export const LIFT = { ...GRIP, bend: 0.3, side: 0, twist: 0.1, a0x: 1.15, a1x: 1.15, a0z: -0.3, a1z: -0.3, a0e: 1.3, a1e: 1.3, l0z: 0.6, l1z: 0.6, l0x: 0.45, l1x: 0.45, l0k: 0.6, l1k: 0.6 };
export const TIPPED = { ...BRACE, pitch: -0.28, bend: 0.2, l0x: 0.35, l1x: 0.15, l0k: 0.5, l1k: 0.3 };
export const teeter = (a: number) => pose({ bend: 0.5 + 0.12 * Math.sin(a * 9), head: -0.2, a0x: 2.3 + Math.sin(a * 16) * 0.6, a0z: 1.0, a0e: 0.2, a1x: 2.3 + Math.cos(a * 16) * 0.6, a1z: 1.0, a1e: 0.2, l0x: 0.35, l0k: 0.45, l1x: -0.2, l1z: 0.3, l1k: 0.15 });
/** A slap: arm `i` shooting out `k` of the way, the other cocked. */
export function slap(i: number, k: number, base: Pose): Pose {
  const o = { ...base, twist: (i ? 1 : -1) * 0.25 * k, side: 0, bend: 0.42, head: -0.3 };
  if (i) { o.a1x = lerp(0.9, 1.6, k); o.a1z = lerp(0.2, -0.12, k); o.a1e = lerp(1.5, 0, k); o.a0x = 0.85; o.a0z = 0.15; o.a0e = 1.6; }
  else { o.a0x = lerp(0.9, 1.6, k); o.a0z = lerp(0.2, -0.12, k); o.a0e = lerp(1.5, 0, k); o.a1x = 0.85; o.a1z = 0.15; o.a1e = 1.6; }
  return o;
}
/** Steps on the spot: each foot lifting in turn, `amp` high. */
/** The crab's walk: sideways, his feet stepping apart and together, his claws up. */
export const sideways = (ph: number) => {
  const s = Math.sin(ph);
  return pose({ l0z: 0.2 + 0.38 * Math.max(0, s), l1z: 0.2 + 0.38 * Math.max(0, -s), l0k: 0.25 * Math.max(0, s), l1k: 0.25 * Math.max(0, -s), l0x: 0.12, l1x: 0.12, bend: 0.2, a0x: 0.7, a1x: 0.7, a0z: 0.45, a1z: 0.45, a0e: 1.3, a1e: 1.3, up: Math.abs(s) * 0.03, side: s * 0.05 });
};
export const steps = (p: Pose, ph: number, amp: number) => {
  const s = Math.sin(ph);
  return { ...p, l0x: p.l0x + Math.max(0, s) * amp, l0k: p.l0k + Math.max(0, s) * amp * 1.3, l1x: p.l1x + Math.max(0, -s) * amp, l1k: p.l1k + Math.max(0, -s) * amp * 1.3 };
};


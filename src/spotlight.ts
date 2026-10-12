// The spotlight: an upgrade that's just been bought gets a moment on camera. The camera eases over to what it built,
// comes in close for a couple of seconds, then goes back out to the player. Something that walks off (a runner) is
// followed while it's in the spotlight.
import { Box3, type Object3D, type Vector3 } from 'three';
import { view } from './stage';
import { V } from './util';

/** Seconds easing over and in, holding on it, and easing back out to the player. */
export const SPOT = { over: 0.6, hold: 1.6, back: 0.7 };
/** How close the camera comes in: its distance, as a share of the usual (the casino boat, being big, comes in less). */
export const SPOT_CLOSE = 0.6;
const ease = (k: number) => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

interface Cue { at: number; run: () => void }
/** Something in the spotlight, and how far its middle is from its own position (measured once, as it's put there). */
interface Lit { o: Object3D; up: Vector3 }
interface Shot { t: number; on: Lit[]; close: number; was: Vector3; cue: Cue | null; snap: boolean }
let shot: Shot | null = null;
const mid = V(0, 0, 0), tmp = V(0, 0, 0), box = new Box3();

/**
 * How far the middle of `o` is from its position, so a tall billboard is in the middle of the picture rather than its
 * foot: as it will be once it's popped in, as popping in (pop.ts) grows it from its foot.
 */
function lit(o: Object3D): Lit {
  const foot = o.getWorldPosition(V(0, 0, 0)), k = o.scale.x;
  if (box.setFromObject(o).isEmpty() || k <= 0) return { o, up: V(0, 0, 0) };
  return { o, up: box.getCenter(V(0, 0, 0)).sub(foot).divideScalar(k) };
}

/**
 * Puts what an upgrade built in the spotlight: the camera looks at the middle of `on`, coming in to `close`. `cue` runs
 * once, `at` seconds in (the casino boat comes in as the camera gets there). Nothing plays for players who'd rather
 * less motion: returns whether it does.
 */
export function spotlight(on: Object3D[], { close = SPOT_CLOSE, cue }: { close?: number; cue?: Cue } = {}) {
  if (!on.length || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  // a second upgrade while one's still showing: the camera stays in close and goes straight on over to the new one
  shot?.cue?.run();
  shot = shot
    ? { t: Math.min(shot.t, SPOT.over), on: on.map(lit), close, was: shot.was, cue: cue ?? null, snap: false }
    : { t: 0, on: on.map(lit), close, was: view.focus.clone(), cue: cue ?? null, snap: true };
  return true;
}

/** Moves the spotlight on by `dt`. */
export function updSpotlight(dt: number) {
  const s = shot;
  if (!s) return;
  s.t += dt;
  if (s.cue && s.t >= s.cue.at) { s.cue.run(); s.cue = null; }
  mid.set(0, 0, 0);
  for (const { o, up } of s.on) mid.add(o.getWorldPosition(tmp)).add(up);
  mid.divideScalar(s.on.length);
  if (s.snap) { view.focus.copy(mid); s.snap = false; } else view.focus.lerp(mid, Math.min(1, dt * 6));
  const { over, hold, back } = SPOT;
  const k = s.t < over + hold ? ease(Math.min(1, s.t / over)) : 1 - ease(Math.min(1, (s.t - over - hold) / back));
  view.k = k;
  view.close = 1 - (1 - s.close) * k;
  if (s.t >= over + hold + back) { view.k = 0; view.close = 1; view.focus.copy(s.was); shot = null; }
}

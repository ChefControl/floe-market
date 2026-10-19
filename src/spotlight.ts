// The spotlight: an upgrade that's just been bought gets a moment on camera. The camera eases over to what it built,
// comes in close for a couple of seconds, then goes back out to the player. Something that walks off (a runner) is
// followed while it's in the spotlight. Going up or down the cellar's ladder ends it at once: the camera goes with the
// player. It waits a moment after a purchase first: several bought in a row (the salt barrel three times over) get one
// close-up once the player's done, on all of them if they're close together, or else on the last.
import { Box3, type Object3D, type Vector3 } from 'three';
import { level } from './layout';
import { player } from './player';
import { view } from './stage';
import { V } from './util';

/** Seconds easing over and in, holding on it, and easing back out to the player. */
export const SPOT = { over: 0.6, hold: 1.6, back: 0.7 };
/** Seconds after a purchase before its close-up starts (and the shop's menu steps aside for it), in case the player
 *  buys another (each one waits again). */
export const SPOT_WAIT = 2.0;
/** How far from the player a close-up can look (further, and it's not what was built: no close-up). */
const STRAY = 30;
/** How far apart (across the floor) what a run of purchases built can be and still all be in the one close-up. */
const TOGETHER = 4.5;
/** How close the camera comes in: its distance, as a share of the usual (the casino boat, being big, comes in less). */
export const SPOT_CLOSE = 0.6;
const ease = (k: number) => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

interface Cue { at: number; run: () => void }
/** Something in the spotlight, and how far its middle is from its own position (measured once, as it's put there). */
interface Lit { o: Object3D; up: Vector3 }
interface Shot { t: number; on: Lit[]; close: number; was: Vector3; cue: Cue | null; snap: boolean; down: boolean }
let shot: Shot | null = null;
/** A run of purchases waiting for its close-up: what each one built, oldest first; seconds since the last, and how
 *  long to wait; and
 *  what has to hold still for it to play then (up or down the ladder since, it's off). */
interface Due { on: Object3D[][]; t: number; wait: number; close: number; cue: Cue | null; when: (() => boolean) | null; down: boolean }
let due: Due | null = null;
const mid = V(0, 0, 0), tmp = V(0, 0, 0), box = new Box3();

/**
 * How far the middle of `o` is from its position, so a tall billboard is in the middle of the picture rather than its
 * foot: as it will be once it's popped in, as popping in (pop.ts) grows it from its foot.
 */
function lit(o: Object3D): Lit {
  // (measured at its full size: one still popping in, or only just started, is too small to measure, or nothing at
  // all, and then the camera would look at its foot, which for a group laid out from the world's middle is nowhere)
  // (popping in, pop.ts, is the same scale every way, up to 1)
  const k = o.scale.x, popping = k < 1 && o.scale.y === k && o.scale.z === k;
  if (popping) { o.scale.setScalar(1); o.updateMatrixWorld(true); }
  const foot = o.getWorldPosition(V(0, 0, 0)), empty = box.setFromObject(o).isEmpty(), up = empty ? V(0, 0, 0) : box.getCenter(V(0, 0, 0)).sub(foot);
  if (popping) { o.scale.setScalar(k); o.updateMatrixWorld(true); }
  return { o, up };
}

/**
 * Puts what an upgrade built in the spotlight, once the player's stopped buying for a moment (SPOT_WAIT): the camera
 * looks at the middle of `on`, coming in to `close`. `cue` runs once, `at` seconds into the close-up (the casino boat
 * comes in as the camera gets there: it doesn't wait, `wait` 0). `when`, if given, is asked again as it starts (not with
 * a boss in, say): if it's no then, there's no close-up. Nothing plays for players who'd rather less motion: returns
 * whether it does.
 */
export function spotlight(on: Object3D[], { close = SPOT_CLOSE, cue, when, wait = SPOT_WAIT }: { close?: number; cue?: Cue; when?: () => boolean; wait?: number } = {}) {
  if (!on.length || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  // (one bought before it that had a cue of its own: that's done at once, as its close-up's now this one's)
  due?.cue?.run();
  due = { on: [...(due && due.down === level.down ? due.on : []), on], t: 0, wait, close, cue: cue ?? null, when: when ?? null, down: level.down };
  if (wait <= 0) start(due);
  return true;
}

/** What a run of purchases' close-up looks at: everything they built, if it's all close together, or the last. */
function together(runs: Object3D[][]) {
  const all = [...new Set(runs.flat())], at = all.map(o => box.setFromObject(o).isEmpty() ? o.getWorldPosition(V(0, 0, 0)) : box.getCenter(V(0, 0, 0)));
  const far = at.some(a => at.some(b => Math.hypot(a.x - b.x, a.z - b.z) > TOGETHER));
  return far ? runs[runs.length - 1] : all;
}

/** Starts the close-up a run of purchases has been waiting for. */
function start(d: Due) {
  due = null;
  if (d.down !== level.down || (d.when && !d.when())) { d.cue?.run(); return; }
  const on = together(d.on);
  // (nowhere near the player: not what was built, whatever it is, so no close-up)
  const lits = on.map(lit);
  mid.set(0, 0, 0);
  for (const { o, up } of lits) mid.add(o.getWorldPosition(tmp)).add(up);
  mid.divideScalar(lits.length);
  if (mid.distanceTo(player.g.position) > STRAY) { d.cue?.run(); return; }
  // a second upgrade while one's still showing: the camera stays in close and goes straight on over to the new one
  shot?.cue?.run();
  shot = shot
    ? { t: Math.min(shot.t, SPOT.over), on: lits, close: d.close, was: shot.was, cue: d.cue, snap: false, down: level.down }
    : { t: 0, on: lits, close: d.close, was: view.focus.clone(), cue: d.cue, snap: true, down: level.down };
}

/** Whether a close-up's on, or waiting to start (resto.ts lets the arena's go first). */
export const spotBusy = () => !!shot || !!due;
/** Whether something's in the spotlight now (the shop's menu steps out of the way meanwhile: shop.ts); not while it
 *  waits for the player to stop buying, so the menu's there for the next. */
export const spotOn = () => !!shot;

/** Moves the spotlight on by `dt`. */
export function updSpotlight(dt: number) {
  if (due && (due.t += dt) >= due.wait) start(due);
  const s = shot;
  if (!s) return;
  if (s.down !== level.down) { s.cue?.run(); view.k = 0; view.close = 1; view.focus.copy(s.was); shot = null; return; }
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

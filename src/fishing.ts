// Fish swimming in the water, hooking them, and chopping them into slices.
import { type Group, type Mesh, Plane, Vector3 } from 'three';
import { boost } from './economy';
import { bodyMat, newFish } from './fishModel';
import { newSteak } from './items';
import { chipsFx, splashFx } from './fx';
import { G, mesh, scene } from './render';
import { cast, chop, flop, splash } from './sfx';
import { BLADE_HOME, BLADE_Y, blade, CHOP, chopTop, pile } from './stations';
import { d2xz, rand, UP, V } from './util';

export interface Fish {
  g: Group;
  body: Mesh;
  tail: Group;
  h: number;
  sp: number;
  state: 'swim' | 'hooked' | 'gone';
  /** Respawn countdown while gone. */
  re: number;
}

const FISH_BOX = { x0: -15, x1: 6, z0: -16, z1: -7.6 };
const fish: Fish[] = [];

function placeFish(f: Fish, far = false) {
  f.g.position.set(rand(FISH_BOX.x0, FISH_BOX.x1), 0.04, far ? rand(-16, -12) : rand(FISH_BOX.z0, FISH_BOX.z1));
  f.h = rand(0, Math.PI * 2); f.state = 'swim'; f.g.visible = true; f.g.scale.setScalar(1); f.g.rotation.set(0, 0, 0);
  // whole again, after being chopped
  f.body.material = bodyMat;
  f.g.children.forEach(c => { c.visible = true; });
}

for (let i = 0; i < 16; i++) {
  const f: Fish = { ...newFish(), h: 0, sp: rand(.7, 1.3), state: 'swim', re: 0 };
  scene.add(f.g); placeFish(f); fish.push(f);
}

export function updFish(dt: number, time: number) {
  for (const f of fish) {
    if (f.state === 'swim') {
      f.h += Math.sin(time * 0.7 + f.sp * 10) * dt * 0.9;
      const p = f.g.position, b = FISH_BOX;
      if (p.x < b.x0 || p.x > b.x1 || p.z < b.z0 || p.z > b.z1) {
        const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
        const want = Math.atan2(cz - p.z, cx - p.x);
        f.h += Math.sin(want - f.h) * dt * 3;
      }
      p.x += Math.cos(f.h) * f.sp * dt; p.z += Math.sin(f.h) * f.sp * dt;
      p.y = 0.04 + Math.sin(time * 3 + f.sp * 7) * 0.03;
      f.g.rotation.y = -f.h;
      f.tail.rotation.y = Math.sin(time * 12 + f.sp * 5) * 0.45;
    } else if (f.state === 'gone') {
      f.re -= dt;
      if (f.re <= 0) placeFish(f, true);
    }
  }
}

// ---------- catching ----------
export type CatchSource = 'player' | 'turret' | 'net';
interface Hook {
  f: Fish;
  rope: Mesh | null;
  origin: () => Vector3;
  src: CatchSource;
  t: number;
  start: Vector3 | null;
}

/** Fish hooked but not yet chopped; each will become 3 slices. */
let incomingFish = 0;
const hooks: Hook[] = [];

/** Steaks still on their way: fish being reeled in or chopped. */
export function steaksInProgress() { return incomingFish * 3; }

/**
 * Hooks the nearest free fish in range and reels it to the chopping block.
 * `origin` is re-read every frame so the rope follows a moving fisher.
 */
export function tryCatch(origin: () => Vector3, src: CatchSource): Fish | null {
  if (pile.n + steaksInProgress() + 3 > pile.cap) return null;
  const from = origin();
  let best: Fish | null = null, bd = 1e9;
  for (const f of fish) {
    if (f.state !== 'swim') continue;
    const d = d2xz(f.g.position, from);
    if (d < bd) { bd = d; best = f; }
  }
  if (!best || bd > 11 * 11) return null;
  best.state = 'hooked'; incomingFish++;
  const rope = src === 'net' ? null : mesh(G.rope, 0xF2C14E);
  if (rope) scene.add(rope);
  hooks.push({ f: best, rope, origin, src, t: 0, start: null });
  cast(from, src);
  return best;
}

function setRope(r: Mesh, a: Vector3, b: Vector3) {
  const d = b.clone().sub(a);
  const L = Math.max(0.01, d.length());
  r.position.copy(a).addScaledVector(d, 0.5);
  r.scale.set(1, L, 1);
  r.quaternion.setFromUnitVectors(UP, d.normalize());
}

export function updHooks(dt: number) {
  for (let i = hooks.length - 1; i >= 0; i--) {
    const k = hooks[i]; k.t += dt;
    const from = k.origin();
    const fp = k.f.g.position;
    const reach = k.src === 'net' ? 0 : 0.22;
    if (k.t < reach) {
      if (k.rope) setRope(k.rope, from, from.clone().lerp(fp, k.t / reach));
      continue;
    }
    if (!k.start) { k.start = fp.clone(); splash(fp); splashFx(fp); }
    const q = Math.min(1, (k.t - reach) / 0.6);
    fp.lerpVectors(k.start, chopTop, q); fp.y += 2.4 * 4 * q * (1 - q);
    k.f.g.rotation.z += dt * 12;
    if (k.rope) { if (q < 0.7) setRope(k.rope, from, fp); else k.rope.visible = false; }
    if (q >= 1) {
      if (k.rope) scene.remove(k.rope);
      k.f.g.rotation.set(0, 0, 0); // lands across the block, waiting its turn
      flop(chopTop);
      chopper.queue.push(k.f); hooks.splice(i, 1);
    }
  }
}

// ---------- chopping ----------
// The fish lies across the block, nose towards +x, and the cleaver comes down three times from the tail towards the
// head. Each cut takes a slice off (the fish's body is clipped at the cut, and its fins and tail behind it go) and
// sends it to the pile; what's left of the head goes in the bin.
const chopper = { queue: [] as Fish[], cur: null as Fish | null, t: 0, cuts: 0 };
/** Where the three cuts fall, from the middle of the fish. */
const CUTS = [-0.32, 0.02, 0.36];
/** The fish on the block gets its own body material, clipped by this plane: everything behind the last cut is gone. */
const cut = new Plane(new Vector3(1, 0, 0), Infinity);
const choppedMat = bodyMat.clone();
choppedMat.clippingPlanes = [cut];

export function updChopper(dt: number) {
  if (!chopper.cur && chopper.queue.length) {
    const f = chopper.cur = chopper.queue.shift()!;
    chopper.t = 0; chopper.cuts = 0;
    f.g.position.copy(chopTop); f.g.rotation.set(0, 0, 0);
    cut.constant = Infinity;
    f.body.material = choppedMat;
  }
  const c = chopper.cur;
  if (!c) { blade.position.set(BLADE_HOME.x, BLADE_Y, BLADE_HOME.z); return; }
  chopper.t += dt;
  const each = 0.42 / boost('training') / CUTS.length, i = Math.min(CUTS.length - 1, Math.floor(chopper.t / each));
  const x = chopTop.x + CUTS[i], k = Math.min(1, (chopper.t - i * each) / each);
  // the cleaver moves over the next cut and comes down through it
  blade.position.set(x, BLADE_Y - Math.sin(k * Math.PI) * 0.36, CHOP.z);
  c.g.position.copy(chopTop);
  if (chopper.cuts <= i && k >= 0.5) {
    chopper.cuts++;
    chop(CHOP, i);
    chipsFx(V(x, chopTop.y + 0.05, CHOP.z));
    cut.constant = -x;
    c.g.children.forEach(m => { if (m !== c.body) m.visible = m.position.x > CUTS[i]; });
    const m = newSteak(); m.position.set(x - 0.15, chopTop.y, CHOP.z);
    pile.receive(m, 0.32, 1.1);
  }
  if (chopper.cuts === CUTS.length && chopper.t >= each * CUTS.length) {
    incomingFish--; c.state = 'gone'; c.re = rand(1, 3); c.g.visible = false; chopper.cur = null;
  }
}
